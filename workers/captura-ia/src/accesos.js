import { uidEstaPermitido } from "./autenticacion.js";

/*
 * Quién puede usar la IA:
 *   1. Los uids de UIDS_PERMITIDOS (acceso permanente, secreto del Worker).
 *   2. Un super admin (claim `superadmin` del ID token).
 *   3. Quien tenga un acceso vigente en Firestore: accesosIA/{uid}.hasta > ahora.
 *      Lo otorga un super admin desde /superadmin.
 *
 * El Worker no tiene credenciales de Firestore: lee el documento por REST con
 * el ID token del propio usuario, y las reglas solo le dejan leer el suyo.
 * Escribirlo solo puede un super admin, así que nadie se extiende la prueba.
 */

// Una revocación o una prueba nueva tarda como máximo esto en notarse.
const VIGENCIA_CACHE_MS = 60 * 1000;
const TIEMPO_LIMITE_FIRESTORE_MS = 5000;
const cache = new Map();

const leerAccesoFirestore = async ({ uid, token, projectId }) => {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/accesosIA/${encodeURIComponent(uid)}`;
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIEMPO_LIMITE_FIRESTORE_MS),
  });

  if (respuesta.status === 404) return { hasta: null };
  // Sin permiso o con Firestore caído: se falla cerrado, sin guardar en caché.
  if (!respuesta.ok) throw new Error(`Firestore respondió ${respuesta.status}`);

  const documento = await respuesta.json();
  const hasta = Date.parse(documento?.fields?.hasta?.timestampValue || "");
  return { hasta: Number.isFinite(hasta) ? hasta : null };
};

/**
 * @returns {{ permitido: boolean, hasta?: number|null, motivo?: "sin_acceso"|"vencido"|"error" }}
 */
export const verificarAccesoIA = async ({ sesion, token, env, ahora = Date.now() }) => {
  if (uidEstaPermitido(sesion.uid, env.UIDS_PERMITIDOS) || sesion.superadmin) return { permitido: true };

  const enCache = cache.get(sesion.uid);
  let hasta;
  if (enCache && ahora - enCache.leidoEn < VIGENCIA_CACHE_MS) {
    hasta = enCache.hasta;
  } else {
    try {
      ({ hasta } = await leerAccesoFirestore({ uid: sesion.uid, token, projectId: env.FIREBASE_PROJECT_ID }));
      cache.set(sesion.uid, { hasta, leidoEn: ahora });
    } catch (error) {
      console.error(JSON.stringify({ evento: "acceso_error", uid: sesion.uid, motivo: error?.message }));
      return { permitido: false, motivo: "error" };
    }
  }

  if (!hasta) return { permitido: false, motivo: "sin_acceso" };
  if (hasta <= ahora) return { permitido: false, hasta, motivo: "vencido" };
  return { permitido: true, hasta };
};
