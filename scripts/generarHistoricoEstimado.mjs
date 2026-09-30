#!/usr/bin/env node
/*
 * Reconstruye hacia atrás un histórico ESTIMADO de ahorros para los años sin
 * registros reales: parte de un capital conocido en una fecha de cierre y resta
 * un aporte fijo por mes hasta que el siguiente paso quedaría en negativo.
 *
 * Cada registro lleva `estimado: true` y una nota, para poder distinguirlo de
 * los reales o reemplazarlo si aparecen los datos verdaderos.
 *
 * Solo CREA años que no existen; si alguno ya existe, aborta sin escribir.
 * SIN --aplicar NO ESCRIBE NADA.
 *
 * Uso:
 *   node scripts/generarHistoricoEstimado.mjs --correo tu@correo.com \
 *        --capital 96496.18 --hasta 2025-07-31 --aporte 2500 [--aplicar --respaldo <archivo.json>]
 *   node scripts/generarHistoricoEstimado.mjs --correo tu@correo.com --deshacer
 *        (borra los años cuyos registros son TODOS estimados)
 *
 * La contraseña se pide por consola o se toma de ZALDO_PASSWORD.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, runTransaction, Timestamp } from "firebase/firestore";

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Mismas reglas que src/assets/funciones/firebase/ahorros.js
const MES_CORTE = 8;
const getAnioAhorro = (fecha) => fecha.getFullYear() + (fecha.getMonth() + 1 >= MES_CORTE ? 1 : 0);
const fechaAperturaAnio = (year) => new Date(year - 1, MES_CORTE - 1, 0);
const toFechaKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const redondear = (n) => Math.round(n * 100) / 100;

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
        correo: valor("correo") || process.env.ZALDO_CORREO,
        password: valor("password") || process.env.ZALDO_PASSWORD,
        capital: Number(valor("capital")),
        hasta: valor("hasta"),
        aporte: Number(valor("aporte") || 2500),
        nota: valor("nota") || "Estimado (aporte ~2,500 Mc)",
        aplicar: args.includes("--aplicar"),
        respaldo: valor("respaldo"),
        deshacer: args.includes("--deshacer"),
    };
};

/* ─────────── Generación (pura) ─────────── */

/**
 * Cierres de mes hacia atrás desde `hasta`, del más antiguo al más reciente.
 * Se detiene cuando restar otro aporte dejaría el capital en negativo.
 */
const generarRegistros = ({ capital, hasta, aporte, nota }) => {
    const [anio, mes] = hasta.split("-").map(Number);
    const registros = [];
    for (let k = 0; capital - aporte * k >= 0; k += 1) {
        const fecha = new Date(anio, mes - k, 0); // último día del mes (mes - k)
        registros.unshift({
            fechaKey: toFechaKey(fecha),
            fecha: Timestamp.fromDate(fecha),
            nota,
            estimado: true,
            capitalTotal: redondear(capital - aporte * k),
            liquido: redondear(capital - aporte * k),
            inversiones: 0,
            inversionesLargo: 0,
            responsabilidades: 0,
        });
    }
    return registros;
};

/**
 * Agrupa por año de ahorro y arma cada documento con la misma forma que
 * `inicializarAnio`. La base de cada año es el cierre del anterior; la del
 * primero, su registro más antiguo (misma regla que `asegurarLineaBase`).
 * Las cuentas guardan el cierre del año en una sola cuenta: si quedaran vacías,
 * editar ese año estamparía un snapshot en 0 sobre su cierre.
 */
const construirDocumentos = (registros, aporte) => {
    const porAnio = new Map();
    registros.forEach((r) => {
        const anio = getAnioAhorro(r.fecha.toDate());
        if (!porAnio.has(anio)) porAnio.set(anio, []);
        porAnio.get(anio).push(r);
    });

    const ahora = Timestamp.now();
    let cierreAnterior = null;

    return [...porAnio.entries()].map(([anio, historial]) => {
        const base = cierreAnterior ?? historial[0].capitalTotal;
        const fechaInicio = cierreAnterior === null
            ? historial[0].fecha
            : Timestamp.fromDate(fechaAperturaAnio(anio));

        let previo = base;
        const conIncrementos = historial.map((r) => {
            const diferencia = redondear(r.capitalTotal - previo);
            previo = r.capitalTotal;
            return {
                ...r,
                incrementos: diferencia > 0
                    ? [{ categoria: "aumentoCapital", monto: diferencia, nota: `Aporte mensual estimado de ${aporte}` }]
                    : [],
            };
        });

        const cierre = historial.at(-1).capitalTotal;
        cierreAnterior = cierre;

        return {
            anio,
            data: {
                year: anio,
                estimado: true,
                cuentas: {
                    liquido: [{ id: randomUUID(), nombre: "Ahorro estimado (Mc)", monto: cierre }],
                    inversiones: [],
                    inversionesLargo: [],
                    responsabilidades: [],
                },
                historial: conIncrementos,
                kpis: { metaAnual: 0, fechaInicio, capitalInicial: base },
                fechaCreacion: ahora,
                fechaModificacion: ahora,
            },
        };
    });
};

/* ─────────── Principal ─────────── */

const main = async () => {
    const opciones = leerArgumentos();
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
    const refAnio = (anio) => doc(db, "ahorros", uid, "años", String(anio));
    const leerAnios = async () => {
        const snap = await getDocs(collection(db, "ahorros", uid, "años"));
        return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    };
    console.log(`Proyecto ${env.VITE_FIREBASE_PROJECT_ID} · UID ${uid}`);

    const existentes = await leerAnios();

    // ── Deshacer: solo años donde TODO es estimado ──
    if (opciones.deshacer) {
        const borrar = Object.entries(existentes)
            .filter(([, data]) => (data.historial || []).length > 0
                && data.historial.every((h) => h.estimado === true))
            .map(([anio]) => anio);
        console.log(`Años 100% estimados: ${borrar.join(", ") || "ninguno"}`);
        if (!opciones.aplicar || !borrar.length) {
            console.log(borrar.length ? "Simulación: repite con --aplicar para borrarlos." : "");
            process.exit(0);
        }
        await runTransaction(db, async (tx) => {
            for (const anio of borrar) {
                const snap = await tx.get(refAnio(anio));
                if (!snap.data()?.historial?.every((h) => h.estimado === true)) {
                    throw new Error(`El año ${anio} tiene registros reales; no se borra nada.`);
                }
            }
            borrar.forEach((anio) => tx.delete(refAnio(anio)));
        });
        console.log(`✓ Borrados: ${borrar.join(", ")}`);
        process.exit(0);
    }

    if (!Number.isFinite(opciones.capital) || !/^\d{4}-\d{2}-\d{2}$/.test(opciones.hasta || "")) {
        throw new Error("Indica --capital <monto> y --hasta AAAA-MM-DD.");
    }

    const registros = generarRegistros(opciones);
    const documentos = construirDocumentos(registros, opciones.aporte);

    console.log(`\n${registros.length} registros · ${registros[0].fechaKey} (${registros[0].capitalTotal}) → ${registros.at(-1).fechaKey} (${registros.at(-1).capitalTotal})`);
    documentos.forEach(({ anio, data }) => {
        const h = data.historial;
        console.log(`  Año ${anio}: ${h.length} registros · ${h[0].fechaKey} → ${h.at(-1).fechaKey} · base ${data.kpis.capitalInicial} · cierre ${h.at(-1).capitalTotal}`);
    });

    const choques = documentos.filter(({ anio }) => existentes[String(anio)]);
    if (choques.length) {
        console.error(`\nYa existen: ${choques.map((c) => c.anio).join(", ")}. No se escribe nada.`);
        process.exit(1);
    }

    // El cierre estimado debe empatar con la base del primer año real.
    const siguiente = existentes[String(documentos.at(-1).anio + 1)];
    const baseSiguiente = siguiente?.kpis?.capitalInicial;
    if (siguiente && Math.abs(Number(baseSiguiente) - registros.at(-1).capitalTotal) > 0.005) {
        console.warn(`\n⚠ El cierre estimado (${registros.at(-1).capitalTotal}) no coincide con la base de ${documentos.at(-1).anio + 1} (${baseSiguiente}).`);
    }

    if (!opciones.aplicar) {
        console.log("\nSimulación: no se escribió nada. Repite con --aplicar --respaldo <archivo> para crear los años.");
        process.exit(0);
    }
    if (!opciones.respaldo || !existsSync(resolve(raizProyecto, opciones.respaldo))) {
        throw new Error("--aplicar exige --respaldo <archivo.json> existente.");
    }

    await runTransaction(db, async (tx) => {
        for (const { anio } of documentos) {
            if ((await tx.get(refAnio(anio))).exists()) {
                throw new Error(`El año ${anio} se creó mientras tanto. No se escribió nada.`);
            }
        }
        documentos.forEach(({ anio, data }) => tx.set(refAnio(anio), data));
    });

    // Verificación
    const despues = await leerAnios();
    const errores = [];
    documentos.forEach(({ anio, data }) => {
        const d = despues[String(anio)];
        if (!d) return errores.push(`${anio}: no se creó`);
        if (d.historial.length !== data.historial.length) errores.push(`${anio}: registros no coinciden`);
        if (d.kpis.capitalInicial !== data.kpis.capitalInicial) errores.push(`${anio}: base no coincide`);
        return null;
    });
    Object.keys(existentes).forEach((anio) => {
        if (despues[anio]?.fechaModificacion?.seconds !== existentes[anio]?.fechaModificacion?.seconds) {
            errores.push(`${anio}: un año existente cambió`);
        }
    });
    if (errores.length) {
        console.error("✗ Verificación:\n  " + errores.join("\n  ") + "\nPara revertir: --deshacer --aplicar");
        process.exit(1);
    }
    console.log("\n✓ Años creados y verificados. Los años existentes no se tocaron.");
    process.exit(0);
};

main().catch((error) => {
    console.error(`\nError: ${error.code || ""} ${error.message}`);
    process.exit(1);
});
