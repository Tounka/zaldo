import { auth } from "../../firebase/dbFirebase";
import { URL_CAPTURA_IA } from "../solicitarCaptura";
import { LIMITE_BYTES_METRICAS_REPORTE } from "./redaccion.js";

/*
 * Cliente de POST /reporte (mismo Worker que la captura). La URL sale de
 * VITE_CAPTURA_IA_URL cambiando /captura por /reporte.
 *
 * Es opcional: si falla por cualquier motivo, quien llama arma el reporte con
 * los textos por defecto. Por eso aquí no hay mensajes para el usuario, solo
 * un error con el motivo para la consola.
 */

const URL_REPORTE_IA = (() => {
  if (!URL_CAPTURA_IA) return "";
  try {
    return new URL("reporte", URL_CAPTURA_IA).toString();
  } catch {
    return "";
  }
})();

// El Worker corta a los 45 s; con esfuerzo medio suele tardar menos de 20.
const TIEMPO_LIMITE_MS = 50000;

export class ErrorRedaccionReporte extends Error {}

/**
 * @param metricas   Solo agregados (metricasParaIA de la plantilla).
 * @param preguntas  Lo que la persona quiere que se conteste (perfil + mensaje).
 * @returns {Promise<{ titulos, puntos, recomendaciones, respuestas }>} sin validar: pásalo por validarTextosReporte.
 */
export const solicitarRedaccionReporte = async ({ reporte, metricas, preguntas = [] }) => {
  if (!URL_REPORTE_IA) throw new ErrorRedaccionReporte("sin URL del Worker");
  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorRedaccionReporte("sin sesión");

  const cuerpo = JSON.stringify({ reporte, metricas, preguntas });
  if (new TextEncoder().encode(JSON.stringify(metricas)).length > LIMITE_BYTES_METRICAS_REPORTE) {
    throw new ErrorRedaccionReporte("métricas demasiado grandes");
  }

  let respuesta;
  try {
    respuesta = await fetch(URL_REPORTE_IA, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await usuario.getIdToken()}`,
        "Content-Type": "application/json",
      },
      body: cuerpo,
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new ErrorRedaccionReporte(error?.name === "TimeoutError" ? "tiempo agotado" : "sin conexión");
  }

  if (!respuesta.ok) throw new ErrorRedaccionReporte(`el Worker respondió ${respuesta.status}`);

  try {
    return (await respuesta.json())?.textos;
  } catch {
    throw new ErrorRedaccionReporte("respuesta sin JSON");
  }
};
