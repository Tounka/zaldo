import {
  LIMITE_BYTES_PANORAMA,
  LIMITE_PREGUNTA_ABIERTA,
} from "../../../src/assets/funciones/ia/respuestaAbierta.js";
import { leerCuerpoJSON } from "./solicitud.js";

/*
 * Valida el cuerpo de POST /respuesta: la pregunta (con el intento anterior)
 * y el panorama de agregados que calcula la app. Las instrucciones y el
 * esquema los pone el Worker.
 */

// Panorama + pregunta (con acentos, ~2 bytes por letra) + llaves del JSON.
const LIMITE_BYTES_RESPUESTA = LIMITE_BYTES_PANORAMA + LIMITE_PREGUNTA_ABIERTA * 2 + 256;

const esObjetoPlano = (valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);

/**
 * @returns {{ datos } | { error }} datos = { pregunta, panorama }
 */
export const leerSolicitudRespuesta = async (request) => {
  const { cuerpo, error } = await leerCuerpoJSON(request, LIMITE_BYTES_RESPUESTA);
  if (error) return { error };

  const pregunta = String(cuerpo?.pregunta ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .trim();
  if (!pregunta) return { error: "Falta la pregunta." };
  if (pregunta.length > LIMITE_PREGUNTA_ABIERTA) return { error: "La pregunta es demasiado larga." };

  const panorama = cuerpo?.panorama;
  if (!esObjetoPlano(panorama) || Object.keys(panorama).length === 0) return { error: "Falta el panorama." };

  return { datos: { pregunta, panorama } };
};
