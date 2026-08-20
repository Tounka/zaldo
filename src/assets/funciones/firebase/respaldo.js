import { collection, doc, getDoc, getDocs } from "firebase/firestore";
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
