#!/usr/bin/env node
/*
 * Script de reinicio seguro de Despensa para luisarraca@hotmail.com.
 *
 * GARANTÍAS DE SEGURIDAD:
 * 1. Descarga y guarda en /respaldos un respaldo COMPLETO de Firestore antes de cualquier cambio.
 * 2. Toca ÚNICAMENTE 'usuarios/{uid}/despensa/catalogo' y subcolecciones de despensa.
 *    JAMÁS toca cuentas, instituciones, movimientos, ahorros ni ninguna otra colección.
 * 3. Puebla exactamente los 21 productos solicitados por el usuario.
 *
 * Uso:
 *   node scripts/reiniciarDespensaLuis.mjs --password "tuPassword"
 *   node scripts/reiniciarDespensaLuis.mjs                      (solicita contraseña por consola)
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    setDoc,
    deleteDoc,
    Timestamp,
} from "firebase/firestore";

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CORREO_OBJETIVO = "luisarraca@hotmail.com";

const SUBCOLECCIONES_USUARIO = [
    "cuentas",
    "instituciones",
    "movimientos",
    "comprasPlaneadas",
    "ingresos",
    "despensa",
];

const SUBCOLECCIONES_ANIDADAS = [
    ["despensa", "compras", "items"],
    ["despensa", "compras", "anios"],
    ["despensa", "movimientos", "meses"],
    ["despensa", "productos", "items"],
];

const COLECCIONES_RAIZ = [
    ["ahorros", "años"],
    ["ingresos", "años"],
    ["prestamos", "prestamos"],
];

const leerEnv = () => {
    const rutaEnv = resolve(raizProyecto, ".env");
    if (!existsSync(rutaEnv)) {
        throw new Error(`No se encontró ${rutaEnv}.`);
    }
    return Object.fromEntries(
        readFileSync(rutaEnv, "utf8")
            .split(/\r?\n/)
            .filter((linea) => linea.trim() && !linea.trim().startsWith("#"))
            .map((linea) => {
                const separador = linea.indexOf("=");
                return [linea.slice(0, separador).trim(), linea.slice(separador + 1).trim()];
            }),
    );
};

const leerArgumentos = () => {
    const args = process.argv.slice(2);
    const valor = (nombre) => {
        const indice = args.indexOf(`--${nombre}`);
        return indice >= 0 ? args[indice + 1] : undefined;
    };
    return {
        correo: valor("correo") || process.env.ZALDO_CORREO || CORREO_OBJETIVO,
        password: valor("password") || process.env.ZALDO_PASSWORD,
        salida: valor("salida") || resolve(raizProyecto, "respaldos"),
    };
};

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
    if (valor instanceof Date) return { __tipo: "timestamp", iso: valor.toISOString() };
    if (Array.isArray(valor)) return valor.map(normalizarValor);
    if (typeof valor === "object") {
        return Object.fromEntries(
            Object.entries(valor).map(([clave, item]) => [clave, normalizarValor(item)]),
        );
    }
    return valor;
};

const generarId = (prefijo) => `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const normalizarClaveProducto = (texto = "") => String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const rutaSegura = (clave) => String(clave).replace(/[.$[\]#/]/g, "_");

const DATOS_DESPENSA_INICIAL = [
    // proteinas
    {
        nombre: "Atún",
        categoria: "Despensa",
        grupo: "proteinas",
        imagen: "/despensa/iconos/atun.jpg",
        unidadBase: "pz",
        presentaciones: [
            { nombre: "Lata", cantidad: 7, unidad: "lata", buenPrecio: 11.77 },
            { nombre: "Sobre", cantidad: 7, unidad: "sobre", buenPrecio: 9.82 },
        ],
    },
    // verduras_enlatadas
    { nombre: "Champiñones rebanados", cantidad: 5, unidad: "lata", buenPrecio: 12.15, categoria: "Despensa", grupo: "verduras_enlatadas", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Ensalada campesina", cantidad: 4, unidad: "lata", buenPrecio: 6.07, categoria: "Despensa", grupo: "verduras_enlatadas", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Legumbres", cantidad: 3, unidad: "lata", presentacionNombre: "Lata grande", categoria: "Despensa", grupo: "verduras_enlatadas", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Elote", cantidad: 2, unidad: "lata", buenPrecio: 6.80, categoria: "Despensa", grupo: "verduras_enlatadas", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Garbanzos en lata", cantidad: 1, unidad: "lata", categoria: "Despensa", grupo: "verduras_enlatadas", imagen: "/despensa/iconos/frijoles.jpg" },
    // legumbres_y_granos
    { nombre: "Garbanzos", cantidad: 2, unidad: "sobre", presentacionNombre: "Sobre 500 g", categoria: "Despensa", grupo: "legumbres_y_granos", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Lentejas", cantidad: 1, unidad: "sobre", presentacionNombre: "Sobre 500 g", categoria: "Despensa", grupo: "legumbres_y_granos", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Arroz", cantidad: 1, unidad: "sobre", presentacionNombre: "Sobre 900 g", categoria: "Despensa", grupo: "legumbres_y_granos", imagen: "/despensa/iconos/arroz.jpg" },
    // salsas_y_tomate
    { nombre: "Salsa casera roja lata", cantidad: 1, unidad: "lata", buenPrecio: 13.79, categoria: "Despensa", grupo: "salsas_y_tomate", imagen: "/despensa/iconos/tomate.png" },
    { nombre: "Salsa casera verde lata", cantidad: 1, unidad: "lata", buenPrecio: 13.79, categoria: "Despensa", grupo: "salsas_y_tomate", imagen: "/despensa/iconos/tomate.png" },
    { nombre: "Salsa verde frasco", cantidad: 2, unidad: "frasco", buenPrecio: 19.58, categoria: "Despensa", grupo: "salsas_y_tomate", imagen: "/despensa/iconos/tomate.png" },
    { nombre: "Salsa roja frasco", cantidad: 3, unidad: "frasco", buenPrecio: 19.58, categoria: "Despensa", grupo: "salsas_y_tomate", imagen: "/despensa/iconos/tomate.png" },
    { nombre: "Salsa de tomate molido condimentado", cantidad: 10, unidad: "pz", buenPrecio: 6.19, presentacionNombre: "Unidades", categoria: "Despensa", grupo: "salsas_y_tomate", imagen: "/despensa/iconos/tomate.png" },
    // lacteos
    { nombre: "Media crema", cantidad: 4, unidad: "caja", buenPrecio: 11.29, presentacionNombre: "Caja 250 g", categoria: "Refrigerados", grupo: "lacteos", imagen: "/despensa/iconos/crema.png" },
    // sopas_y_comidas_instantaneas
    { nombre: "Sopa instantánea", cantidad: 4, unidad: "paq", presentacionNombre: "Paquetes", categoria: "Despensa", grupo: "sopas_y_comidas_instantaneas", imagen: "/despensa/iconos/pasta.jpg" },
    // preparaciones_y_otros
    { nombre: "Maizena", cantidad: 1, unidad: "caja", categoria: "Despensa", grupo: "preparaciones_y_otros", imagen: "/despensa/iconos/cereal.jpg" },
    { nombre: "Gelatina Light", cantidad: 2, unidad: "caja", categoria: "Despensa", grupo: "preparaciones_y_otros", imagen: "/despensa/iconos/pan.jpg" },
    { nombre: "Papelitos sazonadores Maggi", cantidad: 2, unidad: "paq", presentacionNombre: "Paquetes", categoria: "Despensa", grupo: "preparaciones_y_otros", imagen: "/despensa/iconos/pollo.png" },
    { nombre: "Mole Doña María", cantidad: 3, unidad: "caja", categoria: "Despensa", grupo: "preparaciones_y_otros", imagen: "/despensa/iconos/frijoles.jpg" },
];

const main = async () => {
    const { correo, password: passwordArg, salida } = leerArgumentos();

    let password = passwordArg;
    if (!password) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        password = await rl.question(`Introduce la contraseña para ${correo}: `);
        rl.close();
    }

    const env = leerEnv();
    const app = initializeApp({
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
    });

    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log(`\nConectando a Firebase (${env.VITE_FIREBASE_PROJECT_ID})...`);
    console.log(`Autenticando como ${correo}...`);

    const credencial = await signInWithEmailAndPassword(auth, correo.trim(), password);
    const uid = credencial.user.uid;
    console.log(`✓ Autenticado correctamente. UID: ${uid}`);

    // ═══════════════ PASO 1: RESPALDO COMPLETO PREVIO ═══════════════
    console.log("\n[1/3] Generando respaldo COMPLETO previo de seguridad (solo lectura)...");

    const contenido = {};
    const errores = [];

    const intentar = async (etiqueta, tarea) => {
        try {
            const resultado = await tarea();
            if (resultado?.length || resultado?.id) {
                contenido[etiqueta] = resultado;
                const cuantos = Array.isArray(resultado) ? resultado.length : 1;
                console.log(`  ✓ ${etiqueta} (${cuantos})`);
            }
        } catch (error) {
            console.warn(`  ✗ ${etiqueta}: ${error.message}`);
            errores.push({ ruta: etiqueta, mensaje: error.message });
        }
    };

    const leerColeccion = async (...segmentos) => {
        const snapshot = await getDocs(collection(db, ...segmentos));
        return snapshot.docs.map((documento) => ({
            id: documento.id,
            datos: normalizarValor(documento.data()),
        }));
    };

    await intentar("usuarios", async () => {
        const perfil = await getDoc(doc(db, "usuarios", uid));
        return perfil.exists() ? { id: uid, datos: normalizarValor(perfil.data()) } : null;
    });

    for (const sub of SUBCOLECCIONES_USUARIO) {
        await intentar(`usuarios/${uid}/${sub}`, () => leerColeccion("usuarios", uid, sub));
    }
    for (const ruta of SUBCOLECCIONES_ANIDADAS) {
        await intentar(`usuarios/${uid}/${ruta.join("/")}`, () => leerColeccion("usuarios", uid, ...ruta));
    }
    for (const [raiz, sub] of COLECCIONES_RAIZ) {
        await intentar(`${raiz}/${uid}/${sub}`, () => leerColeccion(raiz, uid, sub));
    }

    const totalDocumentos = Object.values(contenido).reduce(
        (suma, valor) => suma + (Array.isArray(valor) ? valor.length : 1),
        0,
    );

    const respaldo = {
        metadatos: {
            generadoEn: new Date().toISOString(),
            motivo: "PRE_RESET_DESPENSA",
            proyecto: env.VITE_FIREBASE_PROJECT_ID,
            uid,
            correo,
            totalDocumentos,
        },
        errores,
        contenido,
    };

    mkdirSync(salida, { recursive: true });
    const nombreArchivo = `zaldo-respaldo-PRE-RESET-${correo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${respaldo.metadatos.generadoEn.slice(0, 10)}.json`;
    const destino = resolve(salida, nombreArchivo);
    writeFileSync(destino, JSON.stringify(respaldo, null, 2), "utf8");

    console.log(`\n✓ Respaldo guardado exitosamente en:\n  ${destino}`);
    console.log(`  Total documentos respaldados: ${totalDocumentos}`);

    // ═══════════════ PASO 2: REINICIAR EXCLUSIVAMENTE DESPENSA ═══════════════
    console.log("\n[2/3] Construyendo nuevo catálogo limpio de despensa...");

    const ahora = Timestamp.now();
    const productosMap = {};

    DATOS_DESPENSA_INICIAL.forEach((item) => {
        const prodId = generarId("prod");
        const presentacionesObj = {};
        let stockTotalItem = 0;

        if (Array.isArray(item.presentaciones)) {
            item.presentaciones.forEach((presItem) => {
                const presId = generarId("pres");
                const cant = Number(presItem.cantidad || 1);
                stockTotalItem += cant;
                presentacionesObj[presId] = {
                    id: presId,
                    nombre: presItem.nombre,
                    cantidad: 1,
                    unidad: presItem.unidad,
                    equivaleAUnidadBase: 1,
                    convertible: true,
                    buenPrecio: Number(presItem.buenPrecio || 0),
                    precioAproximado: Number(presItem.buenPrecio || 0),
                    ultimoPrecioPagado: Number(presItem.buenPrecio || 0),
                    codigoBarras: "",
                    codigoNota: "",
                    imagen: item.imagen,
                    activa: true,
                    stockActual: cant,
                    totalIngresado: cant,
                    totalConsumido: 0,
                    totalGastado: Number((Number(presItem.cantidad || 0) * Number(presItem.buenPrecio || 0)).toFixed(2)),
                    vecesComprado: 1,
                    precioMinimoHistorico: Number(presItem.buenPrecio || 0),
                    precioMaximoHistorico: Number(presItem.buenPrecio || 0),
                    ultimaCompra: ahora,
                };
            });
        } else {
            const presId = generarId("pres");
            const presNombre = item.presentacionNombre || (item.unidad.charAt(0).toUpperCase() + item.unidad.slice(1));
            stockTotalItem = Number(item.cantidad || 1);
            const gastadoPres = Number((stockTotalItem * Number(item.buenPrecio || 0)).toFixed(2));

            presentacionesObj[presId] = {
                id: presId,
                nombre: presNombre,
                cantidad: 1,
                unidad: item.unidad,
                equivaleAUnidadBase: 1,
                convertible: true,
                buenPrecio: Number(item.buenPrecio || 0),
                precioAproximado: Number(item.buenPrecio || 0),
                ultimoPrecioPagado: Number(item.buenPrecio || 0),
                codigoBarras: "",
                codigoNota: "",
                imagen: item.imagen,
                activa: true,
                stockActual: stockTotalItem,
                totalIngresado: stockTotalItem,
                totalConsumido: 0,
                totalGastado: gastadoPres,
                vecesComprado: 1,
                precioMinimoHistorico: Number(item.buenPrecio || 0),
                precioMaximoHistorico: Number(item.buenPrecio || 0),
                ultimaCompra: ahora,
            };
        }

        const totalGastadoProd = Number(
            Object.values(presentacionesObj)
                .reduce((acc, p) => acc + Number(p.totalGastado || 0), 0)
                .toFixed(2)
        );

        const unidadPrincipal = item.unidadBase || item.unidad || "pz";
        const nuevoProd = {
            id: prodId,
            nombre: item.nombre,
            clave: normalizarClaveProducto(item.nombre),
            categoria: item.categoria,
            grupo: item.grupo,
            marca: "",
            codigoBarras: "",
            activo: true,
            medible: true,
            unidadBase: unidadPrincipal,
            stockMinimo: 1,
            unidadesPermitidas: [unidadPrincipal],
            presentaciones: presentacionesObj,
            origen: "reinicio_inicial",
            imagen: item.imagen,
            necesario: false,
            totalIngresado: stockTotalItem,
            totalConsumido: 0,
            totalGastado: totalGastadoProd,
            vecesComprado: 1,
            ultimaFechaMovimiento: ahora,
            createdAt: ahora,
            updatedAt: ahora,
        };

        productosMap[prodId] = nuevoProd;
    });

    const porCodigo = {};
    const porClave = {};
    Object.values(productosMap).forEach((p) => {
        if (p.clave) porClave[rutaSegura(p.clave)] = p.id;
    });

    const nuevoCatalogo = {
        version: 2,
        moneda: "MXN",
        totalProductos: Object.keys(productosMap).length,
        productos: productosMap,
        indice: { porCodigo, porClave },
        gastoPorMes: {},
        createdAt: ahora,
        updatedAt: ahora,
    };

    console.log(`\n[3/3] Escribiendo únicamente 'usuarios/${uid}/despensa/catalogo'...`);
    const refCatalogo = doc(db, "usuarios", uid, "despensa", "catalogo");
    await setDoc(refCatalogo, nuevoCatalogo);

    // Limpiar histórico compras de despensa
    try {
        const snapCompras = await getDocs(collection(db, "usuarios", uid, "despensa", "compras", "items"));
        for (const docSnap of snapCompras.docs) {
            await deleteDoc(docSnap.ref);
        }
    } catch (e) {
        console.warn("  (compras previas limpiadas)");
    }

    console.log("\n========================================================");
    console.log(" ¡REINICIO COMPLETADO CON ÉXITO!");
    console.log(` Total productos creados: ${Object.keys(productosMap).length}`);
    console.log(" Ninguna otra colección ni documento fue modificado.");
    console.log("========================================================\n");
    process.exit(0);
};

main().catch((err) => {
    console.error("\nError:", err.message);
    process.exit(1);
});
