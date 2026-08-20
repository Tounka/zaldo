#!/usr/bin/env node
/*
 * Respaldo headless de Firestore para una cuenta de Zaldo.
 *
 * Solo lee: nunca escribe ni borra nada en Firebase.
 *
 * Uso:
 *   node scripts/respaldoFirestore.mjs --correo tucorreo@dominio.com --password "tuPassword"
 *   node scripts/respaldoFirestore.mjs --correo tucorreo@dominio.com          (pide la contraseña por consola)
 *
 * Requiere que el proveedor "Correo/contraseña" esté habilitado en
 * Firebase Console → Authentication → Sign-in method, y que la cuenta tenga
 * ese método vinculado (se vincula desde la app en Mi perfil).
 *
 * El mapa de rutas se mantiene en paralelo con
 * src/assets/funciones/firebase/respaldo.js: si agregas un módulo nuevo a
 * Firestore, actualiza los dos.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
        throw new Error(`No se encontró ${rutaEnv}. Se necesita para leer la configuración de Firebase.`);
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
        correo: valor("correo") || process.env.ZALDO_CORREO,
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

const main = async () => {
    const { correo, password: passwordArg, salida } = leerArgumentos();

    if (!correo) {
        console.error("Falta --correo. Ejemplo:\n  node scripts/respaldoFirestore.mjs --correo tu@correo.com");
        process.exit(1);
    }

    let password = passwordArg;
    if (!password) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        password = await rl.question(`Contraseña de ${correo}: `);
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

    console.log(`Proyecto: ${env.VITE_FIREBASE_PROJECT_ID}`);
    console.log(`Iniciando sesión como ${correo}...`);

    const credencial = await signInWithEmailAndPassword(auth, correo.trim(), password);
    const uid = credencial.user.uid;
    console.log(`Sesión iniciada. UID: ${uid}`);

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

    console.log("Leyendo Firestore (solo lectura)...");

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
            proyecto: env.VITE_FIREBASE_PROJECT_ID,
            uid,
            correo: credencial.user.email || correo,
            proveedores: credencial.user.providerData.map((proveedor) => proveedor.providerId),
            versionFormato: 1,
            totalDocumentos,
        },
        errores,
        contenido,
    };

    mkdirSync(salida, { recursive: true });
    const nombre = `zaldo-respaldo-${correo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${respaldo.metadatos.generadoEn.slice(0, 10)}.json`;
    const destino = resolve(salida, nombre);
    writeFileSync(destino, JSON.stringify(respaldo, null, 2), "utf8");

    console.log(`\nRespaldo guardado: ${destino}`);
    console.log(`Documentos: ${totalDocumentos}${errores.length ? ` — rutas con error: ${errores.length}` : ""}`);
    process.exit(0);
};

main().catch((error) => {
    console.error(`\nError: ${error.code || ""} ${error.message}`);
    if (error.code === "auth/operation-not-allowed") {
        console.error("Habilita Correo/contraseña en Firebase Console → Authentication → Sign-in method.");
    }
    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
        console.error("Esa cuenta aún no tiene contraseña. Entra a la app con Google y vincúlala desde Mi perfil.");
    }
    process.exit(1);
});
