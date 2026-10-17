/*
 * Puente de la CLI con los módulos que comparte con la app y el Worker
 * (src/assets/funciones/ia/analisis/). Aquí solo queda lo que necesita Node:
 * leer el respaldo y la plantilla del disco.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizarRespaldo } from "../../../src/assets/funciones/ia/analisis/metricas.js";

export { CALCULADORES, anonimizarMetricas, etiquetaMes } from "../../../src/assets/funciones/ia/analisis/metricas.js";
export { ESQUEMA_PRESENTACION, validarPresentacion } from "../../../src/assets/funciones/ia/analisis/esquema.js";
export { construirInstruccionesAnalisis, construirMensajeAnalisis } from "../../../src/assets/funciones/ia/analisis/prompts.js";
export { renderizarPresentacion } from "../../../src/assets/funciones/ia/analisis/render.js";

const ANALISIS = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src/assets/funciones/ia/analisis");

export const leerRespaldo = (ruta) => normalizarRespaldo(JSON.parse(readFileSync(ruta, "utf8")));

export const leerPlantilla = () => {
    const leer = (archivo) => readFileSync(resolve(ANALISIS, "plantilla", archivo), "utf8");
    return { css: leer("deck.css"), deck: leer("deck.js"), graficas: leer("graficas.js") };
};
