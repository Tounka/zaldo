import { TEMAS_ANALISIS } from "../../../src/assets/funciones/ia/analisis/metricas.js";
import { leerCuerpoJSON } from "./solicitud.js";

/*
 * Valida el cuerpo de POST /analisis. La app calcula las métricas en el
 * navegador (el Worker no tiene acceso a Firestore) y manda solo agregados:
 * unos 3 KB por tema. Las instrucciones las arma el Worker; el cliente solo
 * elige el tema y puede agregar contexto.
 */

export const LIMITE_BYTES_ANALISIS = 32 * 1024;
export const LIMITE_CONTEXTO_ANALISIS = 1500;

// Conserva los saltos de línea del contexto, quita el resto de controles.
const limpiarContexto = (texto) => String(texto ?? "")
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
  .trim();

const esObjetoPlano = (valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);

/**
 * @returns {{ datos } | { error }} datos = { tema, metricas, contexto }
 */
export const leerSolicitudAnalisis = async (request) => {
  const { cuerpo, error } = await leerCuerpoJSON(request, LIMITE_BYTES_ANALISIS);
  if (error) return { error };

  const tema = String(cuerpo?.tema || "");
  if (!TEMAS_ANALISIS.includes(tema)) return { error: "Tema de análisis no válido." };

  const metricas = cuerpo?.metricas;
  if (!esObjetoPlano(metricas) || Object.keys(metricas).length === 0) {
    return { error: "Faltan las métricas." };
  }

  const contexto = limpiarContexto(cuerpo?.contexto);
  if (contexto.length > LIMITE_CONTEXTO_ANALISIS) {
    return { error: `El contexto supera ${LIMITE_CONTEXTO_ANALISIS} caracteres.` };
  }

  return { datos: { tema, metricas, contexto } };
};
