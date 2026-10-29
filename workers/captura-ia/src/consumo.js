import { importPKCS8, SignJWT } from "jose";

/*
 * Consumo de tokens por persona. Cada llamada a OpenAI suma su `usage` en
 * Firestore, en consumoIA/{uid}_{AAAA-MM}:
 *
 *   { uid, mes, llamadas: { captura, analisis, reporte, respuesta },
 *     tokensEntrada, tokensCache, tokensSalida, tokensRazonamiento,
 *     costoUSD, actualizado }
 *
 * Lo escribe el Worker con una cuenta de servicio (secreto
 * FIREBASE_SERVICE_ACCOUNT), que se salta las reglas: desde la app nadie puede
 * escribirlo, así que nadie se baja el contador. Los incrementos son atómicos
 * y se mandan con waitUntil, sin hacer esperar a la persona.
 *
 * Sin la cuenta de servicio el consumo solo queda en los logs del Worker.
 */

const URL_TOKEN = "https://oauth2.googleapis.com/token";
const ALCANCE_FIRESTORE = "https://www.googleapis.com/auth/datastore";
const TIEMPO_LIMITE_MS = 8000;
const ZONA_HORARIA = "America/Mexico_City";

/* Lo que OpenAI cobra: entrada (con la parte en caché aparte) y salida, que ya incluye el razonamiento. */
export const leerUso = (respuestaOpenAI) => {
  const uso = respuestaOpenAI?.usage;
  if (!uso) return null;
  const entero = (valor) => Math.max(0, Math.round(Number(valor) || 0));
  return {
    tokensEntrada: entero(uso.prompt_tokens),
    tokensCache: entero(uso.prompt_tokens_details?.cached_tokens),
    tokensSalida: entero(uso.completion_tokens),
    tokensRazonamiento: entero(uso.completion_tokens_details?.reasoning_tokens),
  };
};

/*
 * Costo en USD con las tarifas de wrangler.toml (USD por millón de tokens).
 * Sin tarifas configuradas devuelve 0: los tokens se cuentan igual.
 */
export const costoUSD = (uso, env = {}) => {
  const tarifa = (nombre) => Number(env[nombre]) || 0;
  const entradaNormal = Math.max(0, uso.tokensEntrada - uso.tokensCache);
  const costo = (entradaNormal * tarifa("PRECIO_ENTRADA_USD_MTOK")
    + uso.tokensCache * (tarifa("PRECIO_CACHE_USD_MTOK") || tarifa("PRECIO_ENTRADA_USD_MTOK"))
    + uso.tokensSalida * tarifa("PRECIO_SALIDA_USD_MTOK")) / 1e6;
  return Math.round(costo * 1e6) / 1e6;
};

export const mesActual = (fecha = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
}).format(fecha);

/* Escritura de Firestore (REST) que crea el documento del mes o suma sobre él. */
export const construirEscrituraConsumo = ({ projectId, uid, ruta, uso, costo, mes }) => {
  const entero = (valor) => ({ integerValue: String(valor) });
  return {
    update: {
      name: `projects/${projectId}/databases/(default)/documents/consumoIA/${uid}_${mes}`,
      fields: { uid: { stringValue: uid }, mes: { stringValue: mes } },
    },
    updateMask: { fieldPaths: ["uid", "mes"] },
    updateTransforms: [
      { fieldPath: `llamadas.${ruta}`, increment: entero(1) },
      { fieldPath: "tokensEntrada", increment: entero(uso.tokensEntrada) },
      { fieldPath: "tokensCache", increment: entero(uso.tokensCache) },
      { fieldPath: "tokensSalida", increment: entero(uso.tokensSalida) },
      { fieldPath: "tokensRazonamiento", increment: entero(uso.tokensRazonamiento) },
      { fieldPath: "costoUSD", increment: { doubleValue: costo } },
      { fieldPath: "actualizado", setToServerValue: "REQUEST_TIME" },
    ],
  };
};

/* Token de acceso de la cuenta de servicio; dura una hora y se reutiliza en el isolate. */
let tokenEnCache = null;

const obtenerTokenGoogle = async (cuentaServicio) => {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenEnCache && tokenEnCache.vence - 60 > ahora) return tokenEnCache.token;

  const llave = await importPKCS8(cuentaServicio.private_key, "RS256");
  const afirmacion = await new SignJWT({ scope: ALCANCE_FIRESTORE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cuentaServicio.client_email)
    .setAudience(URL_TOKEN)
    .setIssuedAt(ahora)
    .setExpirationTime(ahora + 3600)
    .sign(llave);

  const respuesta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: afirmacion }),
    signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
  });
  if (!respuesta.ok) throw new Error(`Token de Google respondió ${respuesta.status}`);
  const { access_token: token, expires_in: duracion } = await respuesta.json();
  tokenEnCache = { token, vence: ahora + (Number(duracion) || 3600) };
  return token;
};

/**
 * Suma el consumo de una llamada. Nunca lanza: si Firestore falla, el
 * consumo queda al menos en el log y la respuesta a la persona no cambia.
 */
export const registrarConsumo = async ({ env, uid, ruta, uso }) => {
  if (!uso || !uid) return;
  const costo = costoUSD(uso, env);
  console.log(JSON.stringify({ evento: "consumo", uid, ruta, ...uso, costoUSD: costo }));
  if (!env.FIREBASE_SERVICE_ACCOUNT) return;

  try {
    const cuentaServicio = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    const token = await obtenerTokenGoogle(cuentaServicio);
    const projectId = env.FIREBASE_PROJECT_ID;
    const respuesta = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [construirEscrituraConsumo({ projectId, uid, ruta, uso, costo, mes: mesActual() })],
        }),
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      },
    );
    if (!respuesta.ok) throw new Error(`Firestore respondió ${respuesta.status}`);
  } catch (error) {
    console.error(JSON.stringify({ evento: "consumo_error", uid, ruta, motivo: error?.message }));
  }
};
