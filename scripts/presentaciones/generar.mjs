#!/usr/bin/env node
/*
 * Genera una presentación 16:9 (HTML autocontenido) a partir de un respaldo.
 *
 *   respaldo ──► lib/datos.mjs ──► métricas ──► proveedor ──► especificación
 *            (cálculo exacto)                (local o IA)     (lib/esquema.mjs)
 *                                                                   │
 *                                       presentaciones/*.html ◄┘ lib/render.mjs
 *
 * Uso:
 *   node scripts/presentaciones/generar.mjs --tema ahorros --respaldo respaldos/<archivo>.json
 *   node scripts/presentaciones/generar.mjs --tema gastos --proveedor openai --respaldo ... [--contexto "…"]
 *   node scripts/presentaciones/generar.mjs --tema ingresos --proveedor openai --simular   (guarda la solicitud, no llama a la API)
 *
 * Opciones:
 *   --tema        ingresos | ahorros | gastos
 *   --proveedor   local (por defecto) | openai
 *   --respaldo    ruta del respaldo; por defecto, el más reciente de respaldos/
 *   --salida      carpeta de salida (por defecto presentaciones, ignorada por git)
 *   --contexto    texto libre que se agrega al prompt (solo openai)
 *   --sin-anonimizar  envía los nombres de cuentas familiares tal cual (solo openai)
 *   --simular     con openai: escribe la solicitud en la salida y no llama a la API
 *   --spec        guarda también la especificación JSON junto al HTML
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerRespaldo, CALCULADORES } from "./lib/datos.mjs";
import { validarPresentacion } from "./lib/esquema.mjs";
import { renderizarPresentacion } from "./lib/render.mjs";
import { generarConPlantilla } from "./proveedores/local.mjs";
import { generarConOpenAI } from "./proveedores/openai.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROVEEDORES = { local: generarConPlantilla, openai: generarConOpenAI };

const leerArgumentos = () => {
    const args = process.argv.slice(2);
    const valor = (n) => {
        const i = args.indexOf(`--${n}`);
        return i >= 0 ? args[i + 1] : undefined;
    };
    return {
        tema: valor("tema"),
        proveedor: valor("proveedor") || "local",
        respaldo: valor("respaldo"),
        salida: resolve(raiz, valor("salida") || "presentaciones"),
        contexto: valor("contexto"),
        anonimizar: !args.includes("--sin-anonimizar"),
        simular: args.includes("--simular"),
        guardarSpec: args.includes("--spec"),
    };
};

const respaldoMasReciente = () => {
    const carpeta = resolve(raiz, "respaldos");
    if (!existsSync(carpeta)) return null;
    const archivos = readdirSync(carpeta)
        .filter((f) => /^zaldo-respaldo-.*\.json$/.test(f))
        .map((f) => join(carpeta, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    return archivos[0] || null;
};

const main = async () => {
    const o = leerArgumentos();
    if (!CALCULADORES[o.tema]) throw new Error(`--tema debe ser uno de: ${Object.keys(CALCULADORES).join(", ")}`);
    if (!PROVEEDORES[o.proveedor]) throw new Error(`--proveedor debe ser uno de: ${Object.keys(PROVEEDORES).join(", ")}`);

    const rutaRespaldo = o.respaldo ? resolve(raiz, o.respaldo) : respaldoMasReciente();
    if (!rutaRespaldo) throw new Error("No encontré un respaldo. Usa --respaldo o corre npm run respaldo.");
    const datos = leerRespaldo(rutaRespaldo);
    const metricas = CALCULADORES[o.tema](datos);
    console.log(`Respaldo: ${rutaRespaldo}\nTema: ${o.tema} · proveedor: ${o.proveedor}`);

    mkdirSync(o.salida, { recursive: true });
    const fecha = String(datos.metadatos.generadoEn).slice(0, 10);
    const base = join(o.salida, `${o.tema}-${o.proveedor}-${fecha}`);

    const spec = await PROVEEDORES[o.proveedor]({
        tema: o.tema,
        metricas,
        datos,
        contexto: o.contexto,
        anonimizar: o.anonimizar,
        simular: o.simular ? `${base}.solicitud.json` : undefined,
    });
    if (!spec) {
        console.log(`Simulación: solicitud guardada en ${base}.solicitud.json (no se llamó a la API).`);
        return;
    }

    const errores = validarPresentacion(spec);
    if (errores.length) {
        writeFileSync(`${base}.spec.json`, JSON.stringify(spec, null, 2), "utf8");
        throw new Error(`La especificación no es válida (guardada en ${base}.spec.json):\n  ${errores.join("\n  ")}`);
    }
    if (o.guardarSpec) writeFileSync(`${base}.spec.json`, JSON.stringify(spec, null, 2), "utf8");
    writeFileSync(`${base}.html`, renderizarPresentacion(spec), "utf8");
    console.log(`✓ ${spec.diapositivas.length} diapositivas → ${base}.html`);
};

main().catch((error) => {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
});
