#!/usr/bin/env node
/*
 * Mueve al año de ahorro correcto los registros del historial que quedaron en
 * otro documento y fija la línea base (`kpis.capitalInicial`) de cada año que
 * recibe registros.
 *
 * Caso que resuelve: registros de ago–nov/2025 importados en el doc 2025 cuando
 * por fecha pertenecen al 2026 (el año corre de agosto a julio). El doc 2025 no
 * los muestra —ninguno cae en su periodo— y el 2026 arrancaba con base 0.
 *
 * SIN --aplicar NO ESCRIBE NADA: imprime el plan y lo guarda en
 * docs/migracion-historico/. Con --aplicar exige un respaldo reciente y escribe
 * todo en UNA transacción que aborta si algún documento cambió desde el
 * respaldo.
 *
 * Uso:
 *   node scripts/migrarHistoricoAhorros.mjs --correo tu@correo.com
 *   node scripts/migrarHistoricoAhorros.mjs --correo tu@correo.com --aplicar \
 *        --respaldo docs/respaldos/zaldo-respaldo-....json [--eliminar-vacios] [--eliminar-anio 2028]
 *   node scripts/migrarHistoricoAhorros.mjs --correo tu@correo.com \
 *        --restaurar docs/respaldos/zaldo-respaldo-....json --anios 2025,2026,2028
 *
 *   --eliminar-vacios   borra los años que queden sin registros ni cuentas con saldo
 *   --eliminar-anio N   borra un año futuro que solo tenga su apertura (se puede repetir)
 *
 * La contraseña se pide por consola o se toma de ZALDO_PASSWORD.
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
    getDocs,
    getFirestore,
    runTransaction,
    setDoc,
    Timestamp,
} from "firebase/firestore";

const raizProyecto = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA_PLANES = resolve(raizProyecto, "docs", "migracion-historico");

// Mismas reglas que src/assets/funciones/firebase/ahorros.js
const MES_CORTE = 8;
const NOTA_APERTURA = "Apertura (corte anual)";
const anioAhorroDeFechaKey = (fechaKey) => {
    const [anio, mes] = String(fechaKey).split("-").map(Number);
    return anio + (mes >= MES_CORTE ? 1 : 0);
};
const sumaCuentas = (cuentas = {}) => Object.values(cuentas)
    .flat()
    .reduce((suma, cuenta) => suma + Math.abs(Number(cuenta?.monto || 0)), 0);

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
    const valores = (nombre) => args
        .map((arg, i) => (arg === `--${nombre}` ? Number(args[i + 1]) : null))
        .filter(Number.isFinite);

    return {
        correo: valor("correo") || process.env.ZALDO_CORREO,
        password: valor("password") || process.env.ZALDO_PASSWORD,
        aplicar: args.includes("--aplicar"),
        respaldo: valor("respaldo"),
        restaurar: valor("restaurar"),
        anios: (valor("anios") || "").split(",").map(Number).filter(Number.isFinite),
        eliminarVacios: args.includes("--eliminar-vacios"),
        eliminarAnios: valores("eliminar-anio"),
    };
};

/* ─────────── Respaldo: lectura y reconstrucción de tipos ─────────── */

const leerRespaldo = (ruta, uid) => {
    const respaldo = JSON.parse(readFileSync(resolve(raizProyecto, ruta), "utf8"));
    if (respaldo.metadatos?.uid !== uid) {
        throw new Error(`El respaldo es del UID ${respaldo.metadatos?.uid}, no de ${uid}.`);
    }
    const clave = Object.keys(respaldo.contenido).find((k) => k.startsWith(`ahorros/${uid}/`));
    return {
        respaldo,
        anios: Object.fromEntries((respaldo.contenido[clave] || []).map((d) => [d.id, d.datos])),
    };
};

// Inverso de `normalizarValor` en respaldoFirestore.mjs
const revivir = (valor) => {
    if (Array.isArray(valor)) return valor.map(revivir);
    if (valor && typeof valor === "object") {
        if (valor.__tipo === "timestamp") {
            return typeof valor.seconds === "number"
                ? new Timestamp(valor.seconds, valor.nanoseconds ?? 0)
                : Timestamp.fromDate(new Date(valor.iso));
        }
        return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, revivir(v)]));
    }
    return valor;
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

/* ─────────── Plan (puro, no escribe) ─────────── */

const construirPlan = (docs, { eliminarVacios, eliminarAnios }) => {
    const destinos = {};   // anio -> { agregar: [], conflictos: [] }
    const origenes = {};   // anio -> registros que salen

    Object.entries(docs).forEach(([anioTexto, data]) => {
        const anio = Number(anioTexto);
        (data.historial || []).forEach((registro) => {
            const correcto = anioAhorroDeFechaKey(registro.fechaKey);
            // La apertura va fechada el 31/jul del año anterior a propósito.
            if (correcto === anio || registro.nota === NOTA_APERTURA) return;

            (origenes[anio] ||= []).push(registro.fechaKey);
            const destino = docs[correcto];
            const bucket = (destinos[correcto] ||= { agregar: [], yaPresentes: [], conflictos: [] });

            if (!destino) {
                bucket.conflictos.push({ fechaKey: registro.fechaKey, motivo: `no existe el doc ${correcto}` });
                return;
            }
            const existente = (destino.historial || []).find((h) => h.fechaKey === registro.fechaKey);
            if (!existente) bucket.agregar.push(registro);
            else if (Math.abs(Number(existente.capitalTotal) - Number(registro.capitalTotal)) < 0.005) {
                bucket.yaPresentes.push(registro.fechaKey);
            } else {
                bucket.conflictos.push({
                    fechaKey: registro.fechaKey,
                    motivo: `monto distinto: ${existente.capitalTotal} (doc ${correcto}) vs ${registro.capitalTotal} (doc ${anio})`,
                });
            }
        });
    });

    const actualizaciones = Object.entries(destinos).map(([anioTexto, bucket]) => {
        const data = docs[anioTexto];
        const historial = [...(data.historial || []), ...bucket.agregar]
            .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)));
        const primero = historial.find((h) => h.nota !== NOTA_APERTURA) || historial[0];
        const base = data.kpis?.capitalInicial;

        /*
         * Solo se corrige una base ausente o en 0 cuando el historial arranca por
         * arriba de 0. Una base heredada del cierre del año anterior se respeta.
         */
        const baseInvalida = (base === null || base === undefined || Number(base) === 0)
            && Number(primero?.capitalTotal) > 0;
        const kpis = baseInvalida
            ? { ...(data.kpis || {}), capitalInicial: Number(primero.capitalTotal) }
            : (data.kpis || {});

        return {
            anio: Number(anioTexto),
            agregar: bucket.agregar.map((h) => h.fechaKey),
            yaPresentes: bucket.yaPresentes,
            conflictos: bucket.conflictos,
            registrosAntes: (data.historial || []).length,
            registrosDespues: historial.length,
            capitalInicialAntes: base ?? null,
            capitalInicialDespues: kpis.capitalInicial ?? null,
            historial,
            kpis,
        };
    });

    const eliminar = [];
    Object.entries(docs).forEach(([anioTexto, data]) => {
        const anio = Number(anioTexto);
        const salen = new Set(origenes[anio] || []);
        const quedan = (data.historial || []).filter((h) => !salen.has(h.fechaKey));
        const sinSaldo = sumaCuentas(data.cuentas) === 0;

        if (eliminarVacios && salen.size > 0 && quedan.length === 0 && sinSaldo) {
            eliminar.push({ anio, motivo: "queda sin registros y sin cuentas con saldo" });
        }
        if (eliminarAnios.includes(anio)) {
            const soloApertura = (data.historial || []).every((h) => h.nota === NOTA_APERTURA);
            if (!soloApertura) throw new Error(`El año ${anio} tiene registros reales; no se borra.`);
            eliminar.push({ anio, motivo: "año futuro que solo tiene su apertura" });
        }
    });

    return { actualizaciones, eliminar };
};

const resumenPlan = ({ actualizaciones, eliminar }) => ({
    actualizaciones: actualizaciones.map(({ historial: _h, kpis: _k, ...resto }) => ({
        ...resto,
        agregar: resto.agregar.length > 6
            ? [...resto.agregar.slice(0, 3), `… (${resto.agregar.length} en total)`, ...resto.agregar.slice(-2)]
            : resto.agregar,
    })),
    eliminar,
});

/* ─────────── Verificación posterior ─────────── */

const verificar = (docsDespues, plan, docsAntes) => {
    const errores = [];
    plan.actualizaciones.forEach((act) => {
        const data = docsDespues[act.anio];
        const historial = data?.historial || [];
        const claves = historial.map((h) => h.fechaKey);
        if (historial.length !== act.registrosDespues) errores.push(`${act.anio}: ${historial.length} registros, se esperaban ${act.registrosDespues}`);
        if (new Set(claves).size !== claves.length) errores.push(`${act.anio}: hay fechaKey duplicados`);
        if (claves.some((k, i) => i > 0 && k < claves[i - 1])) errores.push(`${act.anio}: historial desordenado`);
        const fuera = historial.filter((h) => h.nota !== NOTA_APERTURA && anioAhorroDeFechaKey(h.fechaKey) !== act.anio);
        if (fuera.length) errores.push(`${act.anio}: ${fuera.length} registros fuera de su año`);
        if (Number(data?.kpis?.capitalInicial) !== Number(act.capitalInicialDespues)) errores.push(`${act.anio}: capitalInicial no coincide`);
        if (canonico(data?.cuentas) !== canonico(docsAntes[act.anio]?.cuentas)) errores.push(`${act.anio}: las cuentas cambiaron`);
    });
    plan.eliminar.forEach(({ anio }) => {
        if (docsDespues[anio]) errores.push(`${anio}: el documento sigue existiendo`);
    });
    return errores;
};

/* ─────────── Principal ─────────── */

const main = async () => {
    const opciones = leerArgumentos();
    if (!opciones.correo) {
        console.error("Falta --correo.");
        process.exit(1);
    }

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

    // ── Restauración desde respaldo ──
    if (opciones.restaurar) {
        if (!opciones.anios.length) throw new Error("Indica --anios 2025,2026,...");
        const { anios } = leerRespaldo(opciones.restaurar, uid);
        for (const anio of opciones.anios) {
            const datos = anios[String(anio)];
            if (!datos) {
                console.warn(`  ${anio}: no está en el respaldo, se omite.`);
                continue;
            }
            await setDoc(refAnio(anio), revivir(datos));
            console.log(`  ✓ ${anio} restaurado (${(datos.historial || []).length} registros)`);
        }
        process.exit(0);
    }

    const docs = await leerAnios();
    const plan = construirPlan(docs, opciones);
    const resumen = resumenPlan(plan);

    console.log("\nPlan:");
    console.log(JSON.stringify(resumen, null, 2));

    mkdirSync(CARPETA_PLANES, { recursive: true });
    const sello = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(
        resolve(CARPETA_PLANES, `plan-${sello}.json`),
        JSON.stringify({ aplicado: opciones.aplicar, ...resumen }, null, 2),
        "utf8",
    );

    const conflictos = plan.actualizaciones.flatMap((a) => a.conflictos);
    if (conflictos.length) {
        console.error("\nHay conflictos; no se aplica nada. Revísalos a mano.");
        process.exit(1);
    }
    if (!plan.actualizaciones.some((a) => a.agregar.length || a.capitalInicialAntes !== a.capitalInicialDespues)
        && !plan.eliminar.length) {
        console.log("\nNada que migrar: los datos ya están en su año.");
        process.exit(0);
    }
    if (!opciones.aplicar) {
        console.log("\nSimulación: no se escribió nada. Repite con --aplicar --respaldo <archivo> para ejecutar.");
        process.exit(0);
    }

    // ── Aplicar ──
    if (!opciones.respaldo) throw new Error("--aplicar exige --respaldo <archivo.json>.");
    const { anios: respaldados } = leerRespaldo(opciones.respaldo, uid);
    const tocados = [...plan.actualizaciones.map((a) => a.anio), ...plan.eliminar.map((e) => e.anio)];

    tocados.forEach((anio) => {
        if (!respaldados[String(anio)]) throw new Error(`El año ${anio} no está en el respaldo.`);
        if (!mismaMarca(docs[anio], respaldados[String(anio)])) {
            throw new Error(`El año ${anio} cambió después del respaldo. Genera uno nuevo.`);
        }
    });

    await runTransaction(db, async (tx) => {
        // Lecturas primero (regla de las transacciones) y control de concurrencia.
        const actuales = {};
        for (const anio of tocados) {
            const snap = await tx.get(refAnio(anio));
            if (!snap.exists() || !mismaMarca(snap.data(), docs[anio])) {
                throw new Error(`El año ${anio} cambió mientras se preparaba la migración. No se escribió nada.`);
            }
            actuales[anio] = snap.data();
        }

        plan.actualizaciones.forEach((act) => {
            tx.update(refAnio(act.anio), {
                historial: act.historial,
                kpis: act.kpis,
                fechaModificacion: Timestamp.now(),
            });
        });
        plan.eliminar.forEach(({ anio }) => tx.delete(refAnio(anio)));
    });

    console.log("\nTransacción confirmada. Verificando...");
    const despues = await leerAnios();
    const errores = verificar(despues, plan, docs);
    if (errores.length) {
        console.error("✗ Verificación con errores:\n  " + errores.join("\n  "));
        console.error(`Para revertir: --restaurar ${opciones.respaldo} --anios ${tocados.join(",")}`);
        process.exit(1);
    }
    console.log("✓ Verificación correcta.");
    Object.entries(despues).forEach(([anio, data]) => {
        const h = data.historial || [];
        console.log(`  ${anio}: ${h.length} registros · ${h[0]?.fechaKey} → ${h.at(-1)?.fechaKey} · base ${data.kpis?.capitalInicial}`);
    });
    process.exit(0);
};

main().catch((error) => {
    console.error(`\nError: ${error.code || ""} ${error.message}`);
    process.exit(1);
});
