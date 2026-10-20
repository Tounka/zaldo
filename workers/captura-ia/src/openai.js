import { ESQUEMA_CAPTURA } from "../../../src/assets/funciones/ia/contratoCaptura.js";
import { ESQUEMA_PRESENTACION } from "../../../src/assets/funciones/ia/analisis/esquema.js";

const URL_OPENAI = "https://api.openai.com/v1/chat/completions";

export class ErrorOpenAI extends Error {}

/*
 * Llamada común a OpenAI con Structured Outputs. Devuelve el JSON ya
 * parseado; cada ruta valida después que tenga sentido.
 */
/* Con imagen, el mensaje del usuario va en partes: texto + foto. */
const contenidoUsuario = (mensaje, imagen) => (imagen
  ? [
    { type: "text", text: mensaje },
    { type: "image_url", image_url: { url: imagen, detail: "high" } },
  ]
  : mensaje);

const pedirJSONAOpenAI = async ({
  env,
  instrucciones,
  mensaje,
  imagen = null,
  nombreEsquema,
  esquema,
  estricto,
  esfuerzo,
  maxTokens,
  tiempoLimiteMs,
}) => {
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
          { role: "user", content: contenidoUsuario(mensaje, imagen) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: nombreEsquema, strict: estricto, schema: esquema },
        },
        reasoning_effort: esfuerzo,
        // Incluye los tokens de razonamiento, no solo el JSON de salida.
        max_completion_tokens: maxTokens,
        // No guardar la conversación en OpenAI (contiene datos financieros).
        store: false,
      }),
      signal: AbortSignal.timeout(tiempoLimiteMs),
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

  try {
    return JSON.parse(contenido?.content || "");
  } catch {
    throw new ErrorOpenAI("Respuesta sin JSON válido");
  }
};

/*
 * Captura: Structured Outputs en modo strict, la API garantiza que la
 * respuesta cumple ESQUEMA_CAPTURA (o devuelve un `refusal`). Aun así la app
 * la vuelve a validar con interpretarCaptura, porque cumplir el esquema no
 * significa que los ids o montos tengan sentido.
 */
export const pedirCapturaAOpenAI = async ({ env, instrucciones, mensaje, imagen = null }) => {
  const resultado = await pedirJSONAOpenAI({
    env,
    instrucciones,
    mensaje,
    imagen,
    nombreEsquema: "captura_zaldo",
    esquema: ESQUEMA_CAPTURA,
    estricto: true,
    esfuerzo: env.OPENAI_ESFUERZO || "medium",
    // Un ticket largo trae hasta 40 renglones: más salida y más tiempo de lectura.
    maxTokens: imagen ? 16000 : 8000,
    // El razonamiento tarda más que una respuesta directa.
    tiempoLimiteMs: imagen ? 90000 : 45000,
  });

  if (!Array.isArray(resultado?.capturas)) throw new ErrorOpenAI("Respuesta sin capturas");
  return {
    capturas: resultado.capturas,
    despensa: resultado.despensa ?? null,
    consulta: resultado.consulta ?? null,
    respuesta: typeof resultado.respuesta === "string" ? resultado.respuesta : "",
    irA: resultado.irA ?? null,
  };
};

/*
 * Análisis: una presentación completa con esfuerzo alto, así que tarda y
 * gasta más. ESQUEMA_PRESENTACION no cumple las reglas del modo strict
 * (campos opcionales), por eso va sin strict y el Worker la valida después
 * con validarPresentacion.
 */
export const pedirAnalisisAOpenAI = ({ env, instrucciones, mensaje }) => pedirJSONAOpenAI({
  env,
  instrucciones,
  mensaje,
  nombreEsquema: "presentacion_zaldo",
  esquema: ESQUEMA_PRESENTACION,
  estricto: false,
  esfuerzo: env.OPENAI_ESFUERZO_ANALISIS || "high",
  maxTokens: 40000,
  tiempoLimiteMs: 240000,
});
