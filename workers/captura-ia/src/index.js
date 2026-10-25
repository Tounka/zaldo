import {
  construirContextoCaptura,
  construirInstruccionesCaptura,
} from "../../../src/assets/funciones/ia/contextoCaptura.js";
import { validarPresentacion } from "../../../src/assets/funciones/ia/analisis/esquema.js";
import {
  construirInstruccionesAnalisis,
  construirMensajeAnalisis,
} from "../../../src/assets/funciones/ia/analisis/prompts.js";
import {
  construirInstruccionesReporte,
  construirMensajeReporte,
  validarTextosReporte,
} from "../../../src/assets/funciones/ia/reportes/redaccion.js";
import {
  construirInstruccionesRespuesta,
  construirMensajeRespuesta,
  validarRespuestaAbierta,
} from "../../../src/assets/funciones/ia/respuestaAbierta.js";
import { leerTokenBearer, verificarTokenFirebase } from "./autenticacion.js";
import { verificarAccesoIA } from "./accesos.js";
import {
  ErrorOpenAI,
  pedirAnalisisAOpenAI,
  pedirCapturaAOpenAI,
  pedirRedaccionReporteAOpenAI,
  pedirRespuestaAbiertaAOpenAI,
} from "./openai.js";
import { leerSolicitud } from "./solicitud.js";
import { leerSolicitudAnalisis } from "./solicitudAnalisis.js";
import { leerSolicitudReporte } from "./solicitudReporte.js";
import { leerSolicitudRespuesta } from "./solicitudRespuesta.js";

/*
 * Worker de IA para Zaldo.
 *
 *   POST /captura   Authorization: Bearer <ID token de Firebase>
 *   { "mensaje": "gasté 230 en uber con la bbva", "hoy": "2026-10-16",
 *     "cuentas": [{ "id": "...", "nombre": "BBVA", "tipoDeCuenta": "credito" }],
 *     "productos": [{ "nombre": "Leche", "presentaciones": ["1 L"] }],   (opcional)
 *     "imagen": "data:image/jpeg;base64,...",                          (opcional)
 *     "anterior": { "mensaje": "...", "consulta": { ... } } }          (opcional)
 *   → 200 { "capturas": [...], "despensa": {...} | null, "salidaDespensa": {...} | null,
 *           "consulta": {...} | null,
 *           "respuesta": "", "irA": null }   (forma de ESQUEMA_CAPTURA)
 *
 *   POST /analisis  Authorization: Bearer <ID token de Firebase>
 *   { "tema": "gastos", "metricas": { ... }, "contexto": "opcional" }
 *   → 200 { "presentacion": { titulo, diapositivas: [...] } }   (ESQUEMA_PRESENTACION)
 *
 *   POST /reporte   Authorization: Bearer <ID token de Firebase>
 *   { "reporte": "cierre_mes", "metricas": { ...solo agregados... } }
 *   → 200 { "textos": { titulos: { [diapositiva]: "..." }, puntos: [...], recomendaciones: [...] } }
 *   La IA solo redacta: el diseño y las cifras del reporte los pone la app.
 *
 *   POST /respuesta Authorization: Bearer <ID token de Firebase>
 *   { "pregunta": "...", "panorama": { ...agregados de todos los módulos... } }
 *   → 200 { "respuesta": "...", "hallazgos": [...], "faltantes": [...], "confianza": "media", "cifrasCalculadas": false }
 *   Solo cuando el asistente no supo contestar con sus temas fijos y la persona insiste.
 *
 * El Worker solo traduce a JSON. No tiene credenciales de Firestore: lo peor
 * que puede pasar si alguien lo abusa es gastar cuota de OpenAI, y eso queda
 * acotado por quién tiene acceso (accesos.js), el límite por minuto de cada ruta y el tope
 * de gasto del proyecto en OpenAI.
 */

const leerOrigenesPermitidos = (env) => String(env.ORIGENES_PERMITIDOS || "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const cabecerasCors = (origen) => ({
  "Access-Control-Allow-Origin": origen,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const responder = (cuerpo, estado, cors = {}) => new Response(JSON.stringify(cuerpo), {
  status: estado,
  headers: {
    ...cors,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  },
});

const configuracionBase = (env) => Boolean(
  env.OPENAI_API_KEY
  && env.OPENAI_MODELO
  && env.FIREBASE_PROJECT_ID
  && env.UIDS_PERMITIDOS
);

const atenderCaptura = async ({ request, env, uid, cors }) => {
  const { datos, error } = await leerSolicitud(request);
  if (error) return responder({ error }, 400, cors);

  const contexto = construirContextoCaptura({
    cuentas: datos.cuentas,
    hoy: datos.hoy,
    productos: datos.productos,
    instituciones: datos.instituciones,
  });
  const inicio = Date.now();

  try {
    const resultado = await pedirCapturaAOpenAI({
      env,
      instrucciones: construirInstruccionesCaptura(contexto),
      mensaje: datos.mensaje,
      imagen: datos.imagen,
      anterior: datos.anterior,
    });

    // Nunca se registra el mensaje ni la respuesta: contienen datos financieros.
    console.log(JSON.stringify({
      evento: "captura_ok",
      uid,
      capturas: resultado.capturas.length,
      consulta: resultado.consulta?.tema || null,
      conImagen: Boolean(datos.imagen),
      conAnterior: Boolean(datos.anterior),
      ms: Date.now() - inicio,
    }));

    return responder(resultado, 200, cors);
  } catch (errorOpenAI) {
    const motivo = errorOpenAI instanceof ErrorOpenAI ? errorOpenAI.message : "error inesperado";
    console.error(JSON.stringify({ evento: "captura_error", uid, motivo, ms: Date.now() - inicio }));
    return responder({ error: "No se pudo interpretar el mensaje. Intenta de nuevo." }, 502, cors);
  }
};

const atenderAnalisis = async ({ request, env, uid, cors }) => {
  const { datos, error } = await leerSolicitudAnalisis(request);
  if (error) return responder({ error }, 400, cors);

  const inicio = Date.now();

  try {
    const presentacion = await pedirAnalisisAOpenAI({
      env,
      instrucciones: construirInstruccionesAnalisis(datos.tema),
      mensaje: construirMensajeAnalisis(datos),
    });

    // Sin strict, el modelo puede salirse del esquema: se valida antes de entregar.
    const errores = validarPresentacion(presentacion);
    if (errores.length) throw new ErrorOpenAI(`Presentación inválida: ${errores.slice(0, 3).join(" | ")}`);

    console.log(JSON.stringify({
      evento: "analisis_ok",
      uid,
      tema: datos.tema,
      diapositivas: presentacion.diapositivas.length,
      ms: Date.now() - inicio,
    }));

    return responder({ presentacion }, 200, cors);
  } catch (errorOpenAI) {
    const motivo = errorOpenAI instanceof ErrorOpenAI ? errorOpenAI.message : "error inesperado";
    console.error(JSON.stringify({ evento: "analisis_error", uid, tema: datos.tema, motivo, ms: Date.now() - inicio }));
    return responder({ error: "No se pudo generar el análisis. Intenta de nuevo." }, 502, cors);
  }
};

const atenderReporte = async ({ request, env, uid, cors }) => {
  const { datos, error } = await leerSolicitudReporte(request);
  if (error) return responder({ error }, 400, cors);

  const inicio = Date.now();

  try {
    const respuesta = await pedirRedaccionReporteAOpenAI({
      env,
      reporte: datos.reporte,
      instrucciones: construirInstruccionesReporte(datos.reporte),
      mensaje: construirMensajeReporte(datos),
    });

    // Se entregan solo los textos válidos (largo y sin cifras que no estén en las métricas).
    const { descartados, ...textos } = validarTextosReporte(respuesta, datos);

    console.log(JSON.stringify({
      evento: "reporte_ok",
      uid,
      reporte: datos.reporte,
      titulos: Object.keys(textos.titulos).length,
      preguntas: datos.preguntas.length,
      respuestas: textos.respuestas.length,
      descartados,
      ms: Date.now() - inicio,
    }));

    return responder({ textos }, 200, cors);
  } catch (errorOpenAI) {
    const motivo = errorOpenAI instanceof ErrorOpenAI ? errorOpenAI.message : "error inesperado";
    console.error(JSON.stringify({ evento: "reporte_error", uid, reporte: datos.reporte, motivo, ms: Date.now() - inicio }));
    return responder({ error: "No se pudo redactar el reporte." }, 502, cors);
  }
};

const atenderRespuesta = async ({ request, env, uid, cors }) => {
  const { datos, error } = await leerSolicitudRespuesta(request);
  if (error) return responder({ error }, 400, cors);

  const inicio = Date.now();

  try {
    const respuesta = await pedirRespuestaAbiertaAOpenAI({
      env,
      instrucciones: construirInstruccionesRespuesta(),
      mensaje: construirMensajeRespuesta(datos),
    });
    const validada = validarRespuestaAbierta(respuesta, datos);
    if (!validada.respuesta) throw new ErrorOpenAI("Respuesta vacía");

    console.log(JSON.stringify({
      evento: "respuesta_ok",
      uid,
      hallazgos: validada.hallazgos.length,
      confianza: validada.confianza,
      cifrasCalculadas: validada.cifrasCalculadas,
      ms: Date.now() - inicio,
    }));

    return responder(validada, 200, cors);
  } catch (errorOpenAI) {
    const motivo = errorOpenAI instanceof ErrorOpenAI ? errorOpenAI.message : "error inesperado";
    console.error(JSON.stringify({ evento: "respuesta_error", uid, motivo, ms: Date.now() - inicio }));
    return responder({ error: "No se pudo contestar la pregunta." }, 502, cors);
  }
};

// Cada ruta con su límite: el análisis es mucho más caro que una captura.
const RUTAS = {
  "/captura": { limite: "LIMITE_CAPTURA", atender: atenderCaptura },
  "/analisis": { limite: "LIMITE_ANALISIS", atender: atenderAnalisis },
  "/reporte": { limite: "LIMITE_REPORTE", atender: atenderReporte },
  "/respuesta": { limite: "LIMITE_RESPUESTA", atender: atenderRespuesta },
};

export default {
  async fetch(request, env) {
    const origen = request.headers.get("Origin") || "";
    const origenValido = leerOrigenesPermitidos(env).includes(origen);

    // Sin origen permitido no se responde nada útil (ni siquiera el preflight).
    if (!origenValido) return responder({ error: "Origen no permitido." }, 403);
    const cors = cabecerasCors(origen);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const ruta = RUTAS[new URL(request.url).pathname];
    if (!ruta) return responder({ error: "No encontrado." }, 404, cors);
    if (request.method !== "POST") return responder({ error: "Método no permitido." }, 405, cors);

    if (!configuracionBase(env) || !env[ruta.limite]) {
      console.error("Configuración incompleta: revisa secretos, vars y el binding de rate limit.");
      return responder({ error: "Servicio no disponible." }, 503, cors);
    }

    const token = leerTokenBearer(request);
    const sesion = await verificarTokenFirebase(token, env.FIREBASE_PROJECT_ID);
    if (!sesion) return responder({ error: "Sesión inválida." }, 401, cors);
    const { uid } = sesion;

    // Acceso permanente, super admin o prueba vigente (accesos.js).
    const acceso = await verificarAccesoIA({ sesion, token, env });
    if (!acceso.permitido) {
      const hasta = acceso.hasta ? new Date(acceso.hasta).toISOString() : null;
      return responder({ error: "Usuario no autorizado.", motivo: acceso.motivo, hasta }, 403, cors);
    }

    const { success } = await env[ruta.limite].limit({ key: uid });
    if (!success) return responder({ error: "Demasiadas solicitudes, espera un momento." }, 429, cors);

    return ruta.atender({ request, env, uid, cors });
  },
};
