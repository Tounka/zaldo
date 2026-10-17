import { ESQUEMA_CAPTURA } from "../../../src/assets/funciones/ia/contratoCaptura.js";

const URL_OPENAI = "https://api.openai.com/v1/chat/completions";
// El razonamiento tarda más que una respuesta directa.
const TIEMPO_LIMITE_MS = 45000;

export class ErrorOpenAI extends Error {}

/*
 * Pide a OpenAI la captura con Structured Outputs en modo strict: la API
 * garantiza que la respuesta cumple ESQUEMA_CAPTURA (o devuelve un `refusal`).
 * Aun así la app la vuelve a validar con interpretarCaptura, porque cumplir el
 * esquema no significa que los ids o montos tengan sentido.
 */
export const pedirCapturaAOpenAI = async ({ env, instrucciones, mensaje }) => {
  let respuesta;
  try {
    respuesta = await fetch(URL_OPENAI, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODELO,
        messages: [
          { role: "system", content: instrucciones },
          { role: "user", content: mensaje },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "captura_zaldo", strict: true, schema: ESQUEMA_CAPTURA },
        },
        reasoning_effort: env.OPENAI_ESFUERZO || "medium",
        // Incluye los tokens de razonamiento, no solo el JSON de salida.
        max_completion_tokens: 8000,
        // No guardar la conversación en OpenAI (contiene datos financieros).
        store: false,
      }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new ErrorOpenAI(`Sin respuesta de OpenAI: ${error?.name || "error de red"}`);
  }

  if (!respuesta.ok) {
    // El cuerpo del error puede incluir el prompt; solo se registra el estado.
    throw new ErrorOpenAI(`OpenAI respondió ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  const eleccion = datos?.choices?.[0];
  const contenido = eleccion?.message;

  if (contenido?.refusal) throw new ErrorOpenAI("OpenAI rechazó el mensaje");
  if (eleccion?.finish_reason === "length") throw new ErrorOpenAI("Respuesta incompleta");

  let resultado;
  try {
    resultado = JSON.parse(contenido?.content || "");
  } catch {
    throw new ErrorOpenAI("Respuesta sin JSON válido");
  }

  if (!Array.isArray(resultado?.capturas)) throw new ErrorOpenAI("Respuesta sin capturas");

  return { capturas: resultado.capturas };
};
