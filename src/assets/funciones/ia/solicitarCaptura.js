import { auth } from "../firebase/dbFirebase";
import { fechaLocalISO } from "../utils/fechas";
import { construirCatalogoParaIA } from "./contratoDespensa.js";
import { construirContextoCaptura } from "./contextoCaptura";
import { limpiarTurnoAnterior } from "./contratoConsulta.js";

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

// Igual que LIMITE_MENSAJE del Worker: una lista del súper dictada es larga.
export const LIMITE_MENSAJE_CAPTURA = 1200;
// Un poco más que el tope del Worker (45 s; 90 s con imagen), para recibir su error en vez de cortar antes.
const TIEMPO_LIMITE_MS = 50000;
const TIEMPO_LIMITE_IMAGEN_MS = 95000;
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

/* El Worker dice si la cuenta nunca tuvo acceso o si se le venció la prueba (accesos.js). */
const mensajeSinAcceso = (cuerpo) => {
  if (cuerpo?.motivo === "vencido" && cuerpo.hasta) {
    const fecha = new Date(cuerpo.hasta).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    return `Tu acceso de prueba a la IA terminó el ${fecha}. Pide que te lo extiendan.`;
  }
  if (cuerpo?.motivo === "error") return "No pude revisar tu acceso a la IA. Intenta de nuevo en un momento.";
  return "Tu cuenta todavía no tiene acceso a la IA.";
};

const prepararCuentas = (cuentas = []) => cuentas
  .filter((cuenta) => cuenta?.id && cuenta.activo !== false && PATRON_ID.test(String(cuenta.id)))
  .slice(0, LIMITE_CUENTAS)
  .map((cuenta) => ({
    id: cuenta.id,
    nombre: String(cuenta.nombre || "").slice(0, 60),
    tipoDeCuenta: TIPOS_CUENTA.includes(cuenta.tipoDeCuenta) ? cuenta.tipoDeCuenta : "",
  }));

/**
 * @param imagen    data URL ya reducida (prepararImagenParaIA) o null.
 * @param anterior  { mensaje, consulta } de la pregunta previa, para entender correcciones; o null.
 * @returns la respuesta cruda del Worker ({ capturas, despensa, consulta, respuesta, irA }).
 * @throws ErrorCapturaIA con un mensaje listo para mostrar.
 */
export const solicitarCaptura = async ({ mensaje, cuentas, instituciones = [], catalogoDespensa = null, imagen = null, anterior = null }) => {
  if (!URL_CAPTURA_IA) {
    throw new ErrorCapturaIA("Falta configurar VITE_CAPTURA_IA_URL en el .env.");
  }

  const texto = String(mensaje || "").trim();
  if (!texto && !imagen) throw new ErrorCapturaIA("Escribe qué quieres registrar.");

  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorCapturaIA(MENSAJES_POR_ESTADO[401]);

  const turnoAnterior = limpiarTurnoAnterior(anterior);
  // Solo nombres: le sirven a la IA para no duplicar instituciones al crear cuentas.
  const { instituciones: nombresInstituciones } = construirContextoCaptura({ instituciones });

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
        instituciones: nombresInstituciones,
        productos: construirCatalogoParaIA(catalogoDespensa),
        ...(imagen ? { imagen } : {}),
        ...(turnoAnterior ? { anterior: turnoAnterior } : {}),
      }),
      signal: AbortSignal.timeout(imagen ? TIEMPO_LIMITE_IMAGEN_MS : TIEMPO_LIMITE_MS),
    });
  } catch (error) {
    throw new ErrorCapturaIA(error?.name === "TimeoutError"
      ? "La IA tardó demasiado en responder. Intenta de nuevo."
      : "No hay conexión con el servicio de IA. Revisa tu internet.");
  }

  if (respuesta.status === 403) {
    throw new ErrorCapturaIA(mensajeSinAcceso(await respuesta.json().catch(() => null)));
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
