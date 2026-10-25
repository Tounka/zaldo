import { auth } from "../../firebase/dbFirebase";
import { URL_CAPTURA_IA } from "../solicitarCaptura";
import { LIMITE_PREGUNTA_ABIERTA, validarRespuestaAbierta } from "../respuestaAbierta.js";

/*
 * Cliente de POST /respuesta (mismo Worker que la captura). A diferencia de
 * los reportes, aquí la respuesta de la IA ES el resultado, así que los
 * errores llevan un mensaje listo para el chat.
 */

const URL_RESPUESTA_IA = (() => {
  if (!URL_CAPTURA_IA) return "";
  try {
    return new URL("respuesta", URL_CAPTURA_IA).toString();
  } catch {
    return "";
  }
})();

// El Worker corta a los 60 s.
const TIEMPO_LIMITE_MS = 65000;

export class ErrorRespuestaAbierta extends Error {}

const MENSAJES = {
  403: "Tu cuenta no tiene acceso a la IA para revisar todos tus datos.",
  429: "Ya revisé varias veces seguidas. Espera un minuto y vuelve a preguntar.",
};

/**
 * @returns {Promise<ReturnType<typeof validarRespuestaAbierta>>} ya validada contra el panorama.
 * @throws ErrorRespuestaAbierta con un mensaje para el chat.
 */
export const solicitarRespuestaAbierta = async ({ pregunta, panorama }) => {
  if (!URL_RESPUESTA_IA) throw new ErrorRespuestaAbierta("La IA no está configurada en esta app.");
  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorRespuestaAbierta("Tu sesión expiró. Vuelve a iniciar sesión.");

  let respuesta;
  try {
    respuesta = await fetch(URL_RESPUESTA_IA, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await usuario.getIdToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pregunta: String(pregunta).slice(0, LIMITE_PREGUNTA_ABIERTA), panorama }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new ErrorRespuestaAbierta(error?.name === "TimeoutError"
      ? "Revisar todos tus datos tardó demasiado. Intenta de nuevo."
      : "No hay conexión con la IA. Revisa tu internet.");
  }

  if (!respuesta.ok) throw new ErrorRespuestaAbierta(MENSAJES[respuesta.status] || "No pude contestar eso ni revisando todos tus datos.");

  try {
    // El Worker ya validó; se vuelve a validar aquí porque es dato externo.
    return validarRespuestaAbierta(await respuesta.json(), { panorama });
  } catch {
    throw new ErrorRespuestaAbierta("La IA respondió algo que no pude leer. Intenta de nuevo.");
  }
};
