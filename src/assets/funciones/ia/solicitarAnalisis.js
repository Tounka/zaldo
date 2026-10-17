import { auth } from "../firebase/dbFirebase";
import { ALCANCE_ANALISIS, construirRespaldo } from "../firebase/respaldo";
import { validarPresentacion } from "./analisis/esquema.js";
import {
  CALCULADORES,
  anonimizarMetricas,
  hayDatosParaAnalisis,
  normalizarRespaldo,
} from "./analisis/metricas.js";
import { URL_CAPTURA_IA } from "./solicitarCaptura";

/*
 * Cliente del análisis con IA (POST /analisis del mismo Worker que la captura).
 *
 *   Firestore ─► construirRespaldo (solo lo necesario) ─► métricas (aquí, exactas)
 *             ─► Worker + OpenAI (redacta) ─► presentación validada ─► render
 *
 * A OpenAI solo viajan las métricas agregadas, nunca los movimientos uno por
 * uno. La URL sale de VITE_CAPTURA_IA_URL cambiando /captura por /analisis:
 * si la captura está configurada, el análisis también.
 */

const URL_ANALISIS_IA = (() => {
  if (!URL_CAPTURA_IA) return "";
  try {
    return new URL("analisis", URL_CAPTURA_IA).toString();
  } catch {
    return "";
  }
})();

export const analisisIADisponible = () => Boolean(URL_ANALISIS_IA);

// Mismo tope que valida el Worker (workers/captura-ia/src/solicitudAnalisis.js).
export const LIMITE_CONTEXTO_ANALISIS = 1500;
// El Worker corta a los 240 s; el esfuerzo alto suele tardar entre 1 y 3 minutos.
const TIEMPO_LIMITE_MS = 250000;

const MENSAJES_POR_ESTADO = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "Tu cuenta no tiene acceso al análisis con IA.",
  429: "Ya pediste dos análisis este minuto. Espera un momento.",
  502: "La IA no pudo generar el análisis. Intenta de nuevo.",
  503: "El análisis con IA no está configurado en el servidor.",
};

export class ErrorAnalisisIA extends Error {}

/**
 * Lee Firestore y calcula las métricas del tema. No llama a la IA: sirve
 * también para mostrar si hay datos antes de gastar una solicitud.
 */
export const calcularMetricasAnalisis = async (tema) => {
  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorAnalisisIA("Inicia sesión para usar el análisis con IA.");
  if (!CALCULADORES[tema]) throw new ErrorAnalisisIA("Tema de análisis no válido.");

  let respaldo;
  try {
    respaldo = await construirRespaldo(usuario.uid, usuario, ALCANCE_ANALISIS);
  } catch {
    throw new ErrorAnalisisIA("No se pudieron leer tus datos. Revisa tu conexión.");
  }

  const metricas = CALCULADORES[tema](normalizarRespaldo(respaldo));
  if (!hayDatosParaAnalisis(tema, metricas)) {
    throw new ErrorAnalisisIA("Todavía no hay registros suficientes para analizar este tema.");
  }
  return metricas;
};

/**
 * @returns la presentación ya validada ({ titulo, diapositivas, ... }).
 * @throws ErrorAnalisisIA con un mensaje listo para mostrar.
 */
export const solicitarAnalisisIA = async ({ tema, metricas, contexto = "", anonimizar = true }) => {
  if (!URL_ANALISIS_IA) throw new ErrorAnalisisIA("El análisis con IA no está configurado.");

  const textoContexto = String(contexto || "").trim();
  if (textoContexto.length > LIMITE_CONTEXTO_ANALISIS) {
    throw new ErrorAnalisisIA(`El contexto no puede pasar de ${LIMITE_CONTEXTO_ANALISIS} caracteres.`);
  }

  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorAnalisisIA("Inicia sesión para usar el análisis con IA.");

  let respuesta;
  try {
    const token = await usuario.getIdToken();
    respuesta = await fetch(URL_ANALISIS_IA, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tema,
        metricas: anonimizar ? anonimizarMetricas(metricas) : metricas,
        contexto: textoContexto,
      }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new ErrorAnalisisIA(error?.name === "TimeoutError"
      ? "El análisis tardó demasiado. Intenta de nuevo en un momento."
      : "No se pudo contactar al servicio de IA. Revisa tu conexión.");
  }

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    throw new ErrorAnalisisIA(MENSAJES_POR_ESTADO[respuesta.status]
      || (respuesta.status === 400 && cuerpo?.error)
      || "Ocurrió un error inesperado con el análisis con IA.");
  }

  // El Worker ya validó, pero lo que llega por red se vuelve a revisar antes de pintarlo.
  const presentacion = cuerpo?.presentacion;
  if (validarPresentacion(presentacion).length) {
    throw new ErrorAnalisisIA("La IA devolvió un análisis incompleto. Intenta de nuevo.");
  }
  return presentacion;
};
