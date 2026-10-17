/*
 * Proveedor de IA con la API de OpenAI (Responses API + salida estructurada).
 *
 * Variables de entorno:
 *   OPENAI_API_KEY   (obligatoria para llamar a la API)
 *   OPENAI_MODEL     modelo a usar; no se fija uno en el código para no
 *                    quedar atado a una versión.
 *   OPENAI_BASE_URL  opcional (proxy o endpoint compatible)
 *
 * Qué se envía: SOLO las métricas agregadas de lib/datos.mjs, nunca el
 * respaldo ni los movimientos uno por uno. Con `anonimizar` además se
 * reemplazan nombres de personas y cuentas familiares por etiquetas.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESQUEMA_PRESENTACION } from "../lib/esquema.mjs";

const PROMPTS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const leerPrompt = (nombre) => readFileSync(resolve(PROMPTS, `${nombre}.md`), "utf8");

// Contexto personal opcional por tema (prompts/<tema>.local.md, ignorado por git).
const leerContextoLocal = (tema) => {
    const ruta = resolve(PROMPTS, `${tema}.local.md`);
    return existsSync(ruta) ? readFileSync(ruta, "utf8") : "";
};

// Reemplaza nombres de cuentas familiares (D-…) por etiquetas estables.
export const anonimizarMetricas = (metricas) => {
    const mapa = new Map();
    const etiqueta = (nombre) => {
        if (!mapa.has(nombre)) mapa.set(nombre, `Cuenta familiar ${mapa.size + 1}`);
        return mapa.get(nombre);
    };
    const copia = JSON.parse(JSON.stringify(metricas));
    (copia.porCobrarFamilia || []).forEach((c) => { c.cuenta = etiqueta(c.cuenta); });
    return copia;
};

export const armarSolicitud = ({ tema, metricas, contexto, modelo }) => ({
    model: modelo,
    instructions: [leerPrompt("sistema"), leerPrompt(tema), leerContextoLocal(tema)].filter(Boolean).join("\n\n"),
    input: [
        {
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: [
                        `Tema: ${tema}`,
                        contexto ? `Contexto adicional del usuario:\n${contexto}` : "",
                        "Métricas calculadas (usa estos números tal cual; no inventes otros):",
                        JSON.stringify(metricas),
                    ].filter(Boolean).join("\n\n"),
                },
            ],
        },
    ],
    text: {
        format: { type: "json_schema", name: "presentacion", schema: ESQUEMA_PRESENTACION, strict: false },
    },
});

// La respuesta REST trae el texto en output[].content[] con type "output_text".
const extraerTexto = (respuesta) => respuesta.output_text
    ?? (respuesta.output || [])
        .flatMap((o) => o.content || [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text)
        .join("");

export const generarConOpenAI = async ({ tema, metricas, contexto, anonimizar = true, simular }) => {
    const modelo = process.env.OPENAI_MODEL;
    const datosEnviados = anonimizar ? anonimizarMetricas(metricas) : metricas;
    const solicitud = armarSolicitud({ tema, metricas: datosEnviados, contexto, modelo: modelo || "<OPENAI_MODEL>" });

    // Modo simulación: guarda exactamente lo que se enviaría y no llama a la API.
    if (simular) {
        writeFileSync(simular, JSON.stringify(solicitud, null, 2), "utf8");
        return null;
    }

    if (!process.env.OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY.");
    if (!modelo) throw new Error("Falta OPENAI_MODEL (por ejemplo, el modelo que uses en tu cuenta de OpenAI).");

    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const res = await fetch(`${base}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify(solicitud),
    });
    if (!res.ok) throw new Error(`OpenAI respondió ${res.status}: ${(await res.text()).slice(0, 500)}`);

    const texto = extraerTexto(await res.json());
    try {
        return JSON.parse(texto);
    } catch {
        throw new Error(`La respuesta no es JSON válido: ${texto.slice(0, 300)}`);
    }
};
