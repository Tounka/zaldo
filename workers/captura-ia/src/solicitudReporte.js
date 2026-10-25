import { IDS_REPORTE } from "../../../src/assets/funciones/ia/reportes/catalogo.js";
import { LIMITE_BYTES_METRICAS_REPORTE } from "../../../src/assets/funciones/ia/reportes/redaccion.js";
import { MAXIMO_PREGUNTAS_IA, LIMITE_PREGUNTA_IA, limpiarPreguntas } from "../../../src/assets/funciones/ia/metodoAnalisis.js";
import { leerCuerpoJSON } from "./solicitud.js";

/*
 * Valida el cuerpo de POST /reporte. La app calcula las cifras en el
 * navegador y manda solo agregados sin nombres de personas (metricasParaIA de
 * cada plantilla). El Worker arma las instrucciones y el esquema según el
 * reporte: el cliente no puede mandar texto libre para la IA.
 */

// Las métricas más el id del reporte y las preguntas de la persona (con acentos, ~2 bytes por letra).
const LIMITE_BYTES_REPORTE = LIMITE_BYTES_METRICAS_REPORTE + 512 + MAXIMO_PREGUNTAS_IA * LIMITE_PREGUNTA_IA * 2;

const esObjetoPlano = (valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);

/**
 * @returns {{ datos } | { error }} datos = { reporte, metricas, preguntas }
 */
export const leerSolicitudReporte = async (request) => {
  const { cuerpo, error } = await leerCuerpoJSON(request, LIMITE_BYTES_REPORTE);
  if (error) return { error };

  const reporte = String(cuerpo?.reporte || "");
  if (!IDS_REPORTE.includes(reporte)) return { error: "Reporte no válido." };

  const metricas = cuerpo?.metricas;
  if (!esObjetoPlano(metricas) || Object.keys(metricas).length === 0) {
    return { error: "Faltan las métricas." };
  }

  return { datos: { reporte, metricas, preguntas: limpiarPreguntas(cuerpo?.preguntas) } };
};
