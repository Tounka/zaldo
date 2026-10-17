import { createRemoteJWKSet, jwtVerify } from "jose";

/*
 * Verifica el ID token de Firebase Auth sin firebase-admin (no corre en
 * Workers). Las llaves públicas de Google se descargan una vez y `jose` las
 * guarda en memoria del isolate, así que no se piden en cada petición.
 *
 * Referencia de las validaciones: "Verify ID tokens using a third-party JWT
 * library" en la documentación de Firebase Auth.
 */
const LLAVES_GOOGLE = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
));

export const leerTokenBearer = (request) => {
  const cabecera = request.headers.get("Authorization") || "";
  const [esquema, token] = cabecera.split(" ");
  return esquema === "Bearer" && token ? token : null;
};

/**
 * @returns el uid si el token es válido; null en cualquier otro caso.
 */
export const verificarTokenFirebase = async (token, projectId) => {
  if (!token || !projectId) return null;

  try {
    const { payload } = await jwtVerify(token, LLAVES_GOOGLE, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const ahora = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.auth_time !== "number" || payload.auth_time > ahora) return null;

    return payload.sub;
  } catch {
    return null;
  }
};

/*
 * Falla cerrado: si la lista no está configurada, nadie pasa. Así un deploy sin
 * el secreto no deja el endpoint abierto a cualquier cuenta de Firebase.
 */
export const uidEstaPermitido = (uid, listaPermitidos) => {
  const permitidos = String(listaPermitidos || "")
    .split(",")
    .map((valor) => valor.trim())
    .filter(Boolean);

  return Boolean(uid) && permitidos.includes(uid);
};
