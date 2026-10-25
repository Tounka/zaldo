import { auth } from "../firebase/dbFirebase";
import { URL_CAPTURA_IA } from "./solicitarCaptura";

/*
 * ¿Esta cuenta puede usar la IA? Lo decide el Worker (POST /acceso), porque
 * la lista de acceso permanente es un secreto suyo. La respuesta se recuerda
 * unos minutos para no preguntar cada vez que se abre el asistente.
 */

const URL_ACCESO_IA = (() => {
  if (!URL_CAPTURA_IA) return "";
  try {
    return new URL("acceso", URL_CAPTURA_IA).toString();
  } catch {
    return "";
  }
})();

const VIGENCIA_MS = 10 * 60 * 1000;
const TIEMPO_LIMITE_MS = 8000;
let cache = null;

/** true si el Worker acepta al usuario. Cualquier fallo cuenta como "no". */
export const tieneAccesoIA = async () => {
  const usuario = auth.currentUser;
  if (!URL_ACCESO_IA || !usuario) return false;
  if (cache?.uid === usuario.uid && Date.now() - cache.leidoEn < VIGENCIA_MS) return cache.permitido;

  let permitido = false;
  try {
    const respuesta = await fetch(URL_ACCESO_IA, {
      method: "POST",
      headers: { Authorization: `Bearer ${await usuario.getIdToken()}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    // Solo un sí o un no claros se recuerdan; un 429 o un Worker viejo sin la ruta se reintenta luego.
    if (respuesta.status !== 200 && respuesta.status !== 403) return false;
    permitido = respuesta.ok;
  } catch {
    return false;
  }

  cache = { uid: usuario.uid, permitido, leidoEn: Date.now() };
  return permitido;
};
