import {
  construirContextoCaptura,
  construirInstruccionesCaptura,
} from "../../../src/assets/funciones/ia/contextoCaptura.js";
import { leerTokenBearer, uidEstaPermitido, verificarTokenFirebase } from "./autenticacion.js";
import { ErrorOpenAI, pedirCapturaAOpenAI } from "./openai.js";
import { leerSolicitud } from "./solicitud.js";

/*
 * Worker de captura con IA para Zaldo.
 *
 *   POST /captura   Authorization: Bearer <ID token de Firebase>
 *   { "mensaje": "gasté 230 en uber con la bbva", "hoy": "2026-10-16",
 *     "cuentas": [{ "id": "...", "nombre": "BBVA", "tipoDeCuenta": "credito" }] }
 *   → 200 { "capturas": [...] }   (forma de ESQUEMA_CAPTURA)
 *
 * El Worker solo traduce texto a JSON. No tiene credenciales de Firestore: lo
 * peor que puede pasar si alguien lo abusa es gastar cuota de OpenAI, y eso
 * queda acotado por la lista de uids, el límite por minuto y el tope de gasto
 * del proyecto en OpenAI.
 */

const RUTA = "/captura";

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

const configuracionCompleta = (env) => Boolean(
  env.OPENAI_API_KEY
  && env.OPENAI_MODELO
  && env.FIREBASE_PROJECT_ID
  && env.UIDS_PERMITIDOS
  && env.LIMITE_CAPTURA
);

export default {
  async fetch(request, env) {
    const origen = request.headers.get("Origin") || "";
    const origenValido = leerOrigenesPermitidos(env).includes(origen);

    // Sin origen permitido no se responde nada útil (ni siquiera el preflight).
    if (!origenValido) return responder({ error: "Origen no permitido." }, 403);
    const cors = cabecerasCors(origen);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    if (pathname !== RUTA) return responder({ error: "No encontrado." }, 404, cors);
    if (request.method !== "POST") return responder({ error: "Método no permitido." }, 405, cors);

    if (!configuracionCompleta(env)) {
      console.error("Configuración incompleta: revisa secretos, vars y el binding de rate limit.");
      return responder({ error: "Servicio no disponible." }, 503, cors);
    }

    const uid = await verificarTokenFirebase(leerTokenBearer(request), env.FIREBASE_PROJECT_ID);
    if (!uid) return responder({ error: "Sesión inválida." }, 401, cors);
    if (!uidEstaPermitido(uid, env.UIDS_PERMITIDOS)) {
      return responder({ error: "Usuario no autorizado." }, 403, cors);
    }

    const { success } = await env.LIMITE_CAPTURA.limit({ key: uid });
    if (!success) return responder({ error: "Demasiadas solicitudes, espera un momento." }, 429, cors);

    const { datos, error } = await leerSolicitud(request);
    if (error) return responder({ error }, 400, cors);

    const contexto = construirContextoCaptura({ cuentas: datos.cuentas, hoy: datos.hoy });
    const inicio = Date.now();

    try {
      const resultado = await pedirCapturaAOpenAI({
        env,
        instrucciones: construirInstruccionesCaptura(contexto),
        mensaje: datos.mensaje,
      });

      // Nunca se registra el mensaje ni la respuesta: contienen datos financieros.
      console.log(JSON.stringify({
        evento: "captura_ok",
        uid,
        capturas: resultado.capturas.length,
        ms: Date.now() - inicio,
      }));

      return responder(resultado, 200, cors);
    } catch (errorOpenAI) {
      const motivo = errorOpenAI instanceof ErrorOpenAI ? errorOpenAI.message : "error inesperado";
      console.error(JSON.stringify({ evento: "captura_error", uid, motivo, ms: Date.now() - inicio }));
      return responder({ error: "No se pudo interpretar el mensaje. Intenta de nuevo." }, 502, cors);
    }
  },
};
