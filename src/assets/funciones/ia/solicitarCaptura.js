import { auth } from "../firebase/dbFirebase";
import { fechaLocalISO } from "../utils/fechas";
import { construirCatalogoParaIA } from "./contratoDespensa.js";

/*
 * Cliente del Worker de captura con IA (workers/captura-ia).
 *
 * La URL completa del endpoint va en VITE_CAPTURA_IA_URL, por ejemplo
 * https://zaldo-captura-ia.<tu-subdominio>.workers.dev/captura. Si no está
 * definida, la captura con IA no aparece en la app.
 *
 * Solo manda lo que el Worker valida (mensaje, fecha local, cuentas sin saldos
 * y nombres del catálogo de despensa, sin stock ni precios). Lo que devuelve
 * se trata como dato no confiable: quien llama lo pasa por interpretarCaptura
 * y el usuario confirma antes de registrar.
 */

export const URL_CAPTURA_IA = String(import.meta.env.VITE_CAPTURA_IA_URL || "").trim();

export const capturaIADisponible = () => Boolean(URL_CAPTURA_IA);
export const capturaIAConfigurada = capturaIADisponible;

// Igual que LIMITE_MENSAJE del Worker: una lista del súper dictada es larga.
export const LIMITE_MENSAJE_CAPTURA = 1200;
export const LIMITE_MENSAJE_IA = LIMITE_MENSAJE_CAPTURA;
// Un poco más que el tope del Worker (45 s), para recibir su error en vez de cortar antes.
const TIEMPO_LIMITE_MS = 50000;
// Mismos límites que valida el Worker (workers/captura-ia/src/solicitud.js).
const LIMITE_CUENTAS = 50;
const TIPOS_CUENTA = ["debito", "credito", "inversion", "efectivo"];
const PATRON_ID = /^[A-Za-z0-9_-]{1,64}$/;

const MENSAJES_POR_ESTADO = {
  400: "No pude leer ese mensaje. Intenta escribirlo de otra forma.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "Tu usuario no tiene acceso a la captura con IA.",
  429: "Voy muy rápido. Espera un minuto y vuelve a intentarlo.",
  502: "No logré interpretar el mensaje. Intenta escribirlo de otra forma.",
  503: "La captura con IA no está disponible en este momento.",
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
 * @returns la respuesta cruda del Worker ({ capturas: [...], despensa }).
 * @throws ErrorCapturaIA con un mensaje listo para mostrar.
 */
export const solicitarCaptura = async ({ mensaje, cuentas, catalogoDespensa = null }) => {
  if (!URL_CAPTURA_IA) {
    throw new ErrorCapturaIA("Falta configurar VITE_CAPTURA_IA_URL en el .env.");
  }

  const texto = String(mensaje || "").trim();
  if (!texto) throw new ErrorCapturaIA("Escribe qué quieres registrar.");

  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorCapturaIA(MENSAJES_POR_ESTADO[401]);

  let respuesta;
  try {
    respuesta = await fetch(URL_CAPTURA_IA, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await usuario.getIdToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mensaje: texto.slice(0, LIMITE_MENSAJE_CAPTURA),
        hoy: fechaLocalISO(),
        cuentas: prepararCuentas(cuentas),
        productos: construirCatalogoParaIA(catalogoDespensa),
      }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch {
    throw new ErrorCapturaIA("No hay conexión con el servicio de IA. Revisa tu internet.");
  }

  if (!respuesta.ok) {
    throw new ErrorCapturaIA(MENSAJES_POR_ESTADO[respuesta.status] || "Algo falló. Intenta de nuevo.");
  }

  try {
    return await respuesta.json();
  } catch {
    throw new ErrorCapturaIA(MENSAJES_POR_ESTADO[502]);
  }
};

// Nombre que usa el modal de captura (Modales/capturaIA.jsx).
export const solicitarCapturaIA = solicitarCaptura;
