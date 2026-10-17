#!/usr/bin/env node
/*
 * Aplica al historial de Ahorros la clasificación de incrementos revisada
 * (cashback, intereses, aumento a capital, préstamos) que viene en un archivo
 * de propuesta JSON.
 *
 * Solo cambia `historial[].incrementos` de las fechas listadas. No toca
 * capitalTotal, cuentas, kpis ni notas del día.
 *
 * La propuesta se puede editar a mano antes de aplicarla: quitar una fecha de
 * `cambios` la deja como está; cambiar `despues` cambia lo que se escribe.
 * Cada `despues` debe sumar el cambio de capital de su día (la misma regla que
 * `ajustarIncrementosAlCambio` en src/assets/funciones/firebase/ahorros.js).
 *
 * SIN --aplicar NO ESCRIBE NADA. Con --aplicar exige un respaldo reciente y
 * escribe en UNA transacción que aborta si algún año cambió desde el respaldo.
 *
 * Uso:
 *   node scripts/clasificarIncrementosAhorros.mjs --propuesta respaldos/planes/incrementos-propuesta.json \
 *        --sin-conexion respaldos/zaldo-respaldo-....json          (valida contra un respaldo, sin iniciar sesión)
 *   node scripts/clasificarIncrementosAhorros.mjs --propuesta ... --correo tu@correo.com
 *   node scripts/clasificarIncrementosAhorros.mjs --propuesta ... --correo tu@correo.com --aplicar \
 *        --respaldo respaldos/zaldo-respaldo-....json
 *
 * Para revertir: node scripts/migrarHistoricoAhorros.mjs --correo ... --restaurar <respaldo> --anios 2026,2027
 *
 * La contraseña se pide por consola o se toma de ZALDO_PASSWORD.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA_PLANES = resolve(raizProyecto, "respaldos", "planes");
const TOLERANCIA = 0.02;
const CATEGORIAS_VALIDAS = ["interesesGenerales", "prestamos", "aumentoCapital", "cashback", "rendimientos"];

const leerEnv = () => {
    const rutaEnv = resolve(raizProyecto, ".env");
    if (!existsSync(rutaEnv)) throw new Error(`No se encontró ${rutaEnv}.`);
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
        propuesta: valor("propuesta"),
        sinConexion: valor("sin-conexion"),
        correo: valor("correo") || process.env.ZALDO_CORREO,
        password: valor("password") || process.env.ZALDO_PASSWORD,
        aplicar: args.includes("--aplicar"),
        respaldo: valor("respaldo"),
    };
};

const leerJson = (ruta) => JSON.parse(readFileSync(resolve(raizProyecto, ruta), "utf8"));

const aniosDeRespaldo = (respaldo) => {
    const clave = Object.keys(respaldo.contenido).find((k) => k.startsWith("ahorros/"));
    return Object.fromEntries((respaldo.contenido[clave] || []).map((d) => [d.id, d.datos]));
};

// Firestore no garantiza el orden de las llaves de un mapa entre lecturas.
const canonico = (valor) => JSON.stringify(valor, (_clave, v) => (
    v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v
));

const mismaMarca = (actual, respaldada) => {
    const a = actual?.fechaModificacion;
    const r = respaldada?.fechaModificacion;
    if (!a && !r) return true;
    return Boolean(a && r) && a.seconds === r.seconds && (a.nanoseconds ?? 0) === (r.nanoseconds ?? 0);
};

const normalizarPartes = (partes = []) => partes.map((p) => ({
    categoria: p.categoria,
    monto: Number(p.monto),
    nota: p.nota || "",
}));

/* ─────────── Plan (puro, no escribe) ─────────── */

const construirPlan = (docs, cambios) => {
    const errores = [];
    const porAnio = {};

    cambios.forEach((cambio) => {
        const data = docs[cambio.anio];
        if (!data) {
            errores.push(`${cambio.fechaKey}: no existe el año ${cambio.anio}`);
            return;
        }
        const historial = [...(data.historial || [])]
            .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)));
        const indice = historial.findIndex((h) => h.fechaKey === cambio.fechaKey);
        if (indice < 0) {
            errores.push(`${cambio.fechaKey}: no está en el historial de ${cambio.anio}`);
            return;
        }
        const registro = historial[indice];
        const previo = indice > 0 ? historial[indice - 1].capitalTotal : data.kpis?.capitalInicial;
        const delta = Number(registro.capitalTotal) - Number(previo);
        const despues = normalizarPartes(cambio.despues);
        const suma = despues.reduce((s, p) => s + p.monto, 0);

        // El registro debe seguir como estaba cuando se armó la propuesta.
        if (canonico(normalizarPartes(registro.incrementos || [])) !== canonico(normalizarPartes(cambio.antes))) {
            errores.push(`${cambio.fechaKey}: sus incrementos cambiaron desde la propuesta`);
        }
        if (despues.some((p) => !CATEGORIAS_VALIDAS.includes(p.categoria) || !Number.isFinite(p.monto))) {
            errores.push(`${cambio.fechaKey}: categoría o monto inválido`);
        }
        if (despues.length && Math.abs(suma - delta) > TOLERANCIA) {
            errores.push(`${cambio.fechaKey}: las partes suman ${suma.toFixed(2)} y el cambio del día es ${delta.toFixed(2)}`);
        }
        if (!despues.length && Math.abs(delta) > TOLERANCIA) {
            errores.push(`${cambio.fechaKey}: sin partes, pero el capital cambió ${delta.toFixed(2)}`);
        }

        (porAnio[cambio.anio] ||= new Map()).set(cambio.fechaKey, despues);
    });

    const actualizaciones = Object.entries(porAnio).map(([anio, mapa]) => ({
        anio,
        fechas: [...mapa.keys()],
        historial: (docs[anio].historial || []).map((h) => (
            mapa.has(h.fechaKey) ? { ...h, incrementos: mapa.get(h.fechaKey) } : h
        )),
    }));

    return { errores, actualizaciones };
};

const resumir = (cambios) => {
    const totales = {};
    cambios.forEach((c) => (c.despues || []).forEach((p) => {
        if (Number(p.monto) <= 0) return;
        const clave = `${c.anio} · ${p.categoria}`;
        totales[clave] = Math.round(((totales[clave] || 0) + Number(p.monto)) * 100) / 100;
    }));
    return totales;
};

/* ─────────── Principal ─────────── */

const main = async () => {
    const opciones = leerArgumentos();
    if (!opciones.propuesta) throw new Error("Falta --propuesta <archivo.json>.");
    const { cambios } = leerJson(opciones.propuesta);
    console.log(`Propuesta: ${cambios.length} fechas a reclasificar.`);
    console.log(JSON.stringify(resumir(cambios), null, 2));

    // ── Validación sin conexión contra un respaldo ──
    if (opciones.sinConexion) {
        const docs = aniosDeRespaldo(leerJson(opciones.sinConexion));
        const { errores, actualizaciones } = construirPlan(docs, cambios);
        actualizaciones.forEach((a) => console.log(`  ${a.anio}: ${a.fechas.length} registros cambiarían`));
        if (errores.length) {
            console.error("✗ Errores:\n  " + errores.join("\n  "));
            process.exit(1);
        }
        console.log("✓ La propuesta es válida contra el respaldo. No se escribió nada.");
        process.exit(0);
    }

    // Firebase se carga aquí para que la validación sin conexión no lo necesite.
    const { initializeApp } = await import("firebase/app");
    const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
    const {
        collection,
        doc,
        getDocs,
        getFirestore,
        runTransaction,
        Timestamp,
    } = await import("firebase/firestore");

    if (!opciones.correo) throw new Error("Falta --correo.");
    let { password } = opciones;
    if (!password) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        password = await rl.question(`Contraseña de ${opciones.correo}: `);
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
    const db = getFirestore(app);
    const { user } = await signInWithEmailAndPassword(getAuth(app), opciones.correo.trim(), password);
    const uid = user.uid;
    console.log(`Proyecto ${env.VITE_FIREBASE_PROJECT_ID} · UID ${uid}`);

    const refAnio = (anio) => doc(db, "ahorros", uid, "años", String(anio));
    const leerAnios = async () => {
        const snap = await getDocs(collection(db, "ahorros", uid, "años"));
        return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    };

    const docs = await leerAnios();
    const { errores, actualizaciones } = construirPlan(docs, cambios);

    mkdirSync(CARPETA_PLANES, { recursive: true });
    const sello = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(
        resolve(CARPETA_PLANES, `incrementos-plan-${sello}.json`),
        JSON.stringify({
            aplicado: opciones.aplicar,
            errores,
            totales: resumir(cambios),
            anios: actualizaciones.map((a) => ({ anio: a.anio, fechas: a.fechas })),
        }, null, 2),
        "utf8",
    );

    if (errores.length) {
        console.error("✗ La propuesta no coincide con la base de datos; no se aplica nada:\n  " + errores.join("\n  "));
        process.exit(1);
    }
    actualizaciones.forEach((a) => console.log(`  ${a.anio}: ${a.fechas.length} registros cambiarían`));
    if (!opciones.aplicar) {
        console.log("\nSimulación: no se escribió nada. Repite con --aplicar --respaldo <archivo> para ejecutar.");
        process.exit(0);
    }

    // ── Aplicar ──
    if (!opciones.respaldo) throw new Error("--aplicar exige --respaldo <archivo.json>.");
    const respaldo = leerJson(opciones.respaldo);
    if (respaldo.metadatos?.uid !== uid) throw new Error(`El respaldo es del UID ${respaldo.metadatos?.uid}, no de ${uid}.`);
    const respaldados = aniosDeRespaldo(respaldo);
    actualizaciones.forEach(({ anio }) => {
        if (!respaldados[anio]) throw new Error(`El año ${anio} no está en el respaldo.`);
        if (!mismaMarca(docs[anio], respaldados[anio])) {
            throw new Error(`El año ${anio} cambió después del respaldo. Genera uno nuevo (npm run respaldo).`);
        }
    });

    await runTransaction(db, async (tx) => {
        for (const { anio } of actualizaciones) {
            const snap = await tx.get(refAnio(anio));
            if (!snap.exists() || !mismaMarca(snap.data(), docs[anio])) {
                throw new Error(`El año ${anio} cambió mientras se preparaba la escritura. No se escribió nada.`);
            }
        }
        actualizaciones.forEach(({ anio, historial }) => {
            tx.update(refAnio(anio), { historial, fechaModificacion: Timestamp.now() });
        });
    });

    console.log("\nTransacción confirmada. Verificando...");
    const despues = await leerAnios();
    const fallas = [];
    actualizaciones.forEach(({ anio, historial }) => {
        const nuevo = despues[anio]?.historial || [];
        if (nuevo.length !== historial.length) fallas.push(`${anio}: cambió el número de registros`);
        if (canonico(despues[anio]?.cuentas) !== canonico(docs[anio]?.cuentas)) fallas.push(`${anio}: las cuentas cambiaron`);
        nuevo.forEach((h, i) => {
            if (Number(h.capitalTotal) !== Number(docs[anio].historial[i]?.capitalTotal)) fallas.push(`${anio} ${h.fechaKey}: cambió capitalTotal`);
        });
    });
    if (fallas.length) {
        console.error("✗ Verificación con errores:\n  " + fallas.join("\n  "));
        console.error(`Para revertir: node scripts/migrarHistoricoAhorros.mjs --correo ${opciones.correo} --restaurar ${opciones.respaldo} --anios ${actualizaciones.map((a) => a.anio).join(",")}`);
        process.exit(1);
    }
    console.log("✓ Verificación correcta: solo cambiaron los incrementos.");
    process.exit(0);
};

main().catch((error) => {
    console.error(`\nError: ${error.code || ""} ${error.message}`);
    process.exit(1);
});
