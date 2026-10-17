import { auth } from "../firebase/dbFirebase";
import { fechaLocalISO } from "../utils/fechas";

/*
 * Cliente del Worker de captura con IA (workers/captura-ia).
 *
 * La URL completa del endpoint va en VITE_CAPTURA_IA_URL, por ejemplo
 * https://zaldo-captura-ia.<tu-subdominio>.workers.dev/captura. Si no está
 * definida, la captura con IA simplemente no aparece en la app.
 *
 * Lo que devuelve el Worker se trata como dato no confiable: el resultado se
 * pasa a interpretarCaptura() y el usuario confirma en el modal de siempre.
 */

export const URL_CAPTURA_IA = String(import.meta.env.VITE_CAPTURA_IA_URL || "").trim();

export const capturaIADisponible = () => Boolean(URL_CAPTURA_IA);

// Mismos límites que valida el Worker (workers/captura-ia/src/solicitud.js).
export const LIMITE_MENSAJE_IA = 500;
const LIMITE_CUENTAS = 50;
const TIPOS_CUENTA = ["debito", "credito", "inversion", "efectivo"];
const PATRON_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TIEMPO_LIMITE_MS = 30000;

const MENSAJES_POR_ESTADO = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "Tu cuenta no tiene acceso a la captura con IA.",
  429: "Hiciste muchas capturas seguidas. Espera un minuto.",
  502: "La IA no pudo interpretar el mensaje. Intenta escribirlo de otra forma.",
  503: "La captura con IA no está configurada en el servidor.",
};

export class ErrorCapturaIA extends Error {}

const prepararCuentas = (cuentas = []) => cuentas
  .filter((cuenta) => cuenta?.id && cuenta.activo !== false && PATRON_ID.test(String(cuenta.id)))
  .slice(0, LIMITE_CUENTAS)
  .map((cuenta) => ({
    id: cuenta.id,
    nombre: String(cuenta.nombre || "").slice(0, 60),
    tipoDeCuenta: TIPOS_CUENTA.includes(cuenta.tipoDeCuenta) ? cuenta.tipoDeCuenta : "",
  }));

/**
 * @returns la respuesta cruda del Worker ({ capturas: [...] }).
 * @throws ErrorCapturaIA con un mensaje listo para mostrar.
 */
export const solicitarCapturaIA = async ({ mensaje, cuentas }) => {
  if (!URL_CAPTURA_IA) throw new ErrorCapturaIA("La captura con IA no está configurada.");

  const texto = String(mensaje || "").trim();
  if (!texto) throw new ErrorCapturaIA("Escribe qué quieres registrar.");
  if (texto.length > LIMITE_MENSAJE_IA) {
    throw new ErrorCapturaIA(`El mensaje no puede pasar de ${LIMITE_MENSAJE_IA} caracteres.`);
  }

  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorCapturaIA("Inicia sesión para usar la captura con IA.");

  let respuesta;
  try {
    const token = await usuario.getIdToken();
    respuesta = await fetch(URL_CAPTURA_IA, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mensaje: texto, hoy: fechaLocalISO(), cuentas: prepararCuentas(cuentas) }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch {
    throw new ErrorCapturaIA("No se pudo contactar al servicio de IA. Revisa tu conexión.");
  }

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    const mensajeError = MENSAJES_POR_ESTADO[respuesta.status]
      || (respuesta.status === 400 && cuerpo?.error)
      || "Ocurrió un error inesperado con la captura con IA.";
    throw new ErrorCapturaIA(mensajeError);
  }

  return cuerpo;
};
