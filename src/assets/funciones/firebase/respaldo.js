import { collection, doc, getDoc, getDocs, writeBatch, Timestamp, GeoPoint } from "firebase/firestore";
import { db } from "./dbFirebase";

/*
 * Respaldo completo de la información de un usuario.
 *
 * El SDK web no puede listar subcolecciones, así que el mapa de rutas se
 * declara aquí a mano. Si se agrega un módulo nuevo a Firestore hay que
 * sumarlo a `RUTAS_USUARIO` o quedará fuera del respaldo.
 */

// Colecciones colgadas de usuarios/{uid}
const SUBCOLECCIONES_USUARIO = [
    "cuentas",
    "instituciones",
    "movimientos",
    "comprasPlaneadas",
    "ingresos",
    "despensa",
];

// Colecciones anidadas bajo un documento intermedio: [ruta relativa a usuarios/{uid}]
const SUBCOLECCIONES_ANIDADAS = [
    ["despensa", "compras", "items"],
    ["despensa", "compras", "anios"],
    ["despensa", "movimientos", "meses"],
    ["despensa", "productos", "items"], // legacy
];

// Colecciones de primer nivel indexadas por uid: coleccion/{uid}/subcoleccion
const COLECCIONES_RAIZ = [
    ["ahorros", "años"],
    ["ingresos", "años"],
    ["prestamos", "prestamos"],
];

/**
 * Los Timestamp, GeoPoint y DocumentReference de Firestore no sobreviven a
 * JSON.stringify de forma reversible. Se marcan con `__tipo` para que un
 * eventual restaurador pueda reconstruirlos sin ambigüedad.
 */
const normalizarValor = (valor) => {
    if (valor === null || valor === undefined) return valor;

    if (typeof valor?.toDate === "function" && typeof valor.seconds === "number") {
        return {
            __tipo: "timestamp",
            seconds: valor.seconds,
            nanoseconds: valor.nanoseconds ?? 0,
            iso: valor.toDate().toISOString(),
        };
    }

    if (typeof valor?.latitude === "number" && typeof valor?.longitude === "number") {
        return { __tipo: "geopoint", latitude: valor.latitude, longitude: valor.longitude };
    }

    if (typeof valor?.path === "string" && typeof valor?.id === "string" && valor?.firestore) {
        return { __tipo: "referencia", path: valor.path };
    }

    if (valor instanceof Date) {
        return { __tipo: "timestamp", iso: valor.toISOString() };
    }

    if (Array.isArray(valor)) return valor.map(normalizarValor);

    if (typeof valor === "object") {
        return Object.fromEntries(
            Object.entries(valor).map(([clave, item]) => [clave, normalizarValor(item)]),
        );
    }

    return valor;
};

const leerColeccion = async (...segmentos) => {
    const snapshot = await getDocs(collection(db, ...segmentos));
    return snapshot.docs.map((documento) => ({
        id: documento.id,
        datos: normalizarValor(documento.data()),
    }));
};

/**
 * Recorre Firestore y devuelve todo lo que le pertenece al uid indicado.
 * Cada ruta se lee de forma independiente: si una falla (permisos, red) se
 * registra el error pero el resto del respaldo continúa, para no perder
 * información que sí se pudo recuperar.
 */
export const construirRespaldo = async (uid, infoAuth = null) => {
    if (!uid) throw new Error("Se necesita un uid para generar el respaldo.");

    const contenido = {};
    const errores = [];

    const intentar = async (etiqueta, tarea) => {
        try {
            const resultado = await tarea();
            if (resultado?.length || resultado?.id) contenido[etiqueta] = resultado;
        } catch (error) {
            console.error(`No se pudo respaldar "${etiqueta}":`, error);
            errores.push({ ruta: etiqueta, mensaje: error?.message || String(error) });
        }
    };

    await intentar("usuarios", async () => {
        const perfil = await getDoc(doc(db, "usuarios", uid));
        return perfil.exists() ? { id: uid, datos: normalizarValor(perfil.data()) } : null;
    });

    for (const sub of SUBCOLECCIONES_USUARIO) {
        await intentar(`usuarios/${uid}/${sub}`, () => leerColeccion("usuarios", uid, sub));
    }

    for (const ruta of SUBCOLECCIONES_ANIDADAS) {
        await intentar(
            `usuarios/${uid}/${ruta.join("/")}`,
            () => leerColeccion("usuarios", uid, ...ruta),
        );
    }

    for (const [raiz, sub] of COLECCIONES_RAIZ) {
        await intentar(`${raiz}/${uid}/${sub}`, () => leerColeccion(raiz, uid, sub));
    }

    const totalDocumentos = Object.values(contenido).reduce(
        (suma, valor) => suma + (Array.isArray(valor) ? valor.length : 1),
        0,
    );

    return {
        metadatos: {
            generadoEn: new Date().toISOString(),
            proyecto: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "zaldo-desarrollo",
            uid,
            correo: infoAuth?.email || "",
            proveedores: infoAuth?.providerData?.map((p) => p.providerId) || [],
            versionFormato: 1,
            totalDocumentos,
            rutasVacias: [],
        },
        errores,
        contenido,
    };
};

const nombreArchivo = (respaldo) => {
    const correo = (respaldo.metadatos.correo || respaldo.metadatos.uid)
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase();
    const fecha = respaldo.metadatos.generadoEn.slice(0, 10);
    return `zaldo-respaldo-${correo}-${fecha}.json`;
};

/**
 * Genera el respaldo y lo entrega como descarga. No modifica ni borra nada en
 * Firestore: es una operación de solo lectura.
 */
export const descargarRespaldo = async (uid, infoAuth = null) => {
    const respaldo = await construirRespaldo(uid, infoAuth);
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], {
        type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo(respaldo);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    return respaldo;
};

/**
 * Reconstruye tipos nativos de Firestore (Timestamp, GeoPoint, referencias)
 * que fueron serializados con `__tipo` por normalizarValor.
 */
export const desnormalizarValor = (valor) => {
    if (valor === null || valor === undefined) return valor;

    if (typeof valor === "object" && !Array.isArray(valor)) {
        if (valor.__tipo === "timestamp") {
            if (typeof valor.seconds === "number") {
                return new Timestamp(valor.seconds, valor.nanoseconds ?? 0);
            }
            if (valor.iso) {
                return Timestamp.fromDate(new Date(valor.iso));
            }
        }
        if (valor.__tipo === "geopoint") {
            return new GeoPoint(valor.latitude, valor.longitude);
        }
        if (valor.__tipo === "referencia" && valor.path) {
            return doc(db, valor.path);
        }
        return Object.fromEntries(
            Object.entries(valor).map(([clave, item]) => [clave, desnormalizarValor(item)])
        );
    }

    if (Array.isArray(valor)) {
        return valor.map(desnormalizarValor);
    }

    return valor;
};

/**
 * Restaura documentos en Firestore a partir de un objeto o texto JSON de respaldo.
 * Mapea automáticamente cualquier uid de origen al uid del usuario en sesión,
 * escribe en lotes (writeBatch) con `{ merge: true }` y respeta la estructura de Zaldo.
 */
export const restaurarRespaldo = async (datosRespaldo, uid) => {
    if (!uid) throw new Error("Se necesita un uid para restaurar el respaldo.");

    let datos = datosRespaldo;
    if (typeof datos === "string") {
        try {
            datos = JSON.parse(datos);
        } catch {
            throw new Error("El contenido no es un JSON válido.");
        }
    }

    if (!datos || typeof datos !== "object") {
        throw new Error("El respaldo no tiene un formato reconocible.");
    }

    const contenido = datos.contenido || datos;
    const operaciones = [];
    const errores = [];

    const coleccionesConUid = new Set(["usuarios", "ahorros", "ingresos", "prestamos"]);

    for (const [rutaOriginal, valorColeccion] of Object.entries(contenido)) {
        if (rutaOriginal === "metadatos" || rutaOriginal === "errores") continue;
        if (!valorColeccion) continue;

        try {
            if (rutaOriginal === "usuarios") {
                if (Array.isArray(valorColeccion)) {
                    for (const item of valorColeccion) {
                        operaciones.push({
                            ref: doc(db, "usuarios", uid),
                            datos: desnormalizarValor(item.datos || item),
                        });
                    }
                } else {
                    const datosDoc = valorColeccion.datos || valorColeccion;
                    operaciones.push({
                        ref: doc(db, "usuarios", uid),
                        datos: desnormalizarValor(datosDoc),
                    });
                }
                continue;
            }

            let segmentos = [];
            if (rutaOriginal.includes("/")) {
                const partes = rutaOriginal.split("/").filter(Boolean);
                if (coleccionesConUid.has(partes[0]) && partes.length >= 2) {
                    partes[1] = uid;
                }
                segmentos = partes;
            } else {
                if (rutaOriginal === "ahorros") {
                    segmentos = ["ahorros", uid, "años"];
                } else if (rutaOriginal === "prestamos") {
                    segmentos = ["prestamos", uid, "prestamos"];
                } else if (rutaOriginal === "ingresos") {
                    segmentos = ["ingresos", uid, "años"];
                } else {
                    segmentos = ["usuarios", uid, rutaOriginal];
                }
            }

            if (Array.isArray(valorColeccion)) {
                for (const item of valorColeccion) {
                    if (!item) continue;
                    const docId = item.id;
                    let datosDoc;
                    if (item.datos !== undefined) {
                        datosDoc = item.datos;
                    } else {
                        const { id: _, ...resto } = item;
                        datosDoc = resto;
                    }
                    const ref = docId
                        ? doc(db, ...segmentos, String(docId))
                        : doc(collection(db, ...segmentos));
                    operaciones.push({ ref, datos: desnormalizarValor(datosDoc) });
                }
            } else if (typeof valorColeccion === "object") {
                if (valorColeccion.id && valorColeccion.datos !== undefined) {
                    const ref = doc(db, ...segmentos, String(valorColeccion.id));
                    operaciones.push({ ref, datos: desnormalizarValor(valorColeccion.datos) });
                } else {
                    for (const [id, item] of Object.entries(valorColeccion)) {
                        if (!item) continue;
                        const datosDoc = item.datos !== undefined ? item.datos : item;
                        const ref = doc(db, ...segmentos, id);
                        operaciones.push({ ref, datos: desnormalizarValor(datosDoc) });
                    }
                }
            }
        } catch (err) {
            console.error(`Error procesando ruta "${rutaOriginal}":`, err);
            errores.push({ ruta: rutaOriginal, error: err?.message || String(err) });
        }
    }

    if (operaciones.length === 0) {
        throw new Error("No se encontraron documentos válidos para restaurar en el archivo.");
    }

    const BATCH_LIMIT = 400;
    let batch = writeBatch(db);
    let contador = 0;
    let totalRestaurados = 0;

    for (const operacion of operaciones) {
        batch.set(operacion.ref, operacion.datos, { merge: true });
        contador++;
        totalRestaurados++;

        if (contador >= BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(db);
            contador = 0;
        }
    }

    if (contador > 0) {
        await batch.commit();
    }

    return {
        totalDocumentos: totalRestaurados,
        errores,
    };
};
