/*
 * Parte del contrato de captura para PREGUNTAS sobre los datos del usuario
 * ("¿en qué categoría gasté más este mes?", "¿cuánta leche me queda?").
 *
 * La IA no ve movimientos, saldos ni inventario: solo traduce la pregunta a
 * una consulta (tema + periodo + filtros). La app la resuelve en el navegador
 * con los datos de Firestore (responderConsulta.js), así que las cifras son
 * exactas y a OpenAI no viaja nada nuevo.
 *
 * El Worker también empaqueta este archivo: sin React, imágenes ni Firebase.
 */

import { IDS_REPORTE, REPORTES } from "./reportes/catalogo.js";

export const TEMAS_CONSULTA = {
  GASTOS_POR_CATEGORIA: "gastos_por_categoria",
  GASTOS_TOTAL: "gastos_total",
  GASTOS_POR_MES: "gastos_por_mes",
  GASTOS_POR_CUENTA: "gastos_por_cuenta",
  MOVIMIENTOS: "movimientos",
  INGRESOS: "ingresos",
  SALDOS: "saldos",
  TARJETAS: "tarjetas",
  AHORROS: "ahorros",
  PRESTAMOS: "prestamos",
  DESPENSA_FALTANTES: "despensa_faltantes",
  DESPENSA_PRODUCTO: "despensa_producto",
  DESPENSA_GASTO: "despensa_gasto",
  GASTOS_RECURRENTES: "gastos_recurrentes",
  COMPRAS_PLANEADAS: "compras_planeadas",
  REPORTE: "reporte",
  ABIERTA: "abierta",
};

/* Qué resuelve cada tema; va tal cual en las instrucciones de la IA. */
export const DESCRIPCION_TEMAS_CONSULTA = {
  gastos_por_categoria: "en qué categorías gastó más/menos (ranking)",
  gastos_total: "cuánto gastó en total en un periodo (opcional: en una categoría o con una cuenta)",
  gastos_por_mes: "gasto mes por mes y su promedio mensual (\"promedio\", \"cada mes\", \"separado por mes\", tendencia)",
  gastos_por_cuenta: "con qué cuentas/tarjetas gastó más",
  movimientos: "listar sus últimos movimientos o buscar uno por concepto (\"texto\")",
  ingresos: "cuánto ganó / recibió y de qué fuentes",
  saldos: "saldo de sus cuentas o de una cuenta (\"cuentaId\")",
  tarjetas: "deuda, límite y uso de sus tarjetas de crédito",
  ahorros: "capital ahorrado, su composición y la meta anual",
  prestamos: "cuánto le deben por préstamos y quién",
  despensa_faltantes: "qué productos le faltan o se están acabando (lista del súper)",
  despensa_producto: "cuánto le queda de un producto (\"texto\" = producto)",
  despensa_gasto: "cuánto ha gastado en despensa por mes",
  gastos_recurrentes: "sus gastos fijos/suscripciones y cuáles faltan por pagar este mes",
  compras_planeadas: "compras que tiene planeadas y su presupuesto",
  abierta: "una pregunta sobre sus datos que NINGÚN otro tema responde (cruza módulos, pide una opinión o un \"¿me alcanza…?\"); la app primero avisa y, si insiste, revisa todos sus datos",
  reporte: "un reporte con diseño fijo para ver o descargar en PDF (\"reporte\", \"resumen en PDF\", \"análisis de…\"); di cuál en \"reporte\"",
};

/* Reportes con diseño fijo (reportes/catalogo.js); "" si el tema no es "reporte". */
export const REPORTES_CONSULTA = ["", ...IDS_REPORTE];
export const DESCRIPCION_REPORTES = Object.fromEntries(
  IDS_REPORTE.map((id) => [id, REPORTES[id].descripcion]),
);

/* Secciones de la app a las que el asistente puede llevar al usuario. */
export const RUTAS_ASISTENTE = {
  "/home": "Inicio",
  "/movimientos": "Movimientos",
  "/ingresos": "Ingresos",
  "/cuentas": "Cuentas",
  "/ahorros": "Ahorros",
  "/ahorros/anual": "Ahorros anual",
  "/prestamos": "Préstamos",
  "/cobranza": "Cobranza",
  "/despensa": "Despensa",
  "/perfil": "Perfil",
};

/*
 * Marcas que el usuario pone a mano en un gasto (casillas del formulario).
 * No son categorías: "mis gastos personales" filtra por la marca, aunque el
 * gasto sea de comida o transporte. Sin marca, la app usa lo que la persona
 * eligió para "mis gastos" (alcanceGastosAsistente); "todos" incluye todo.
 */
export const MARCAS_CONSULTA = ["", "personal", "no_personal", "extraordinario", "sin_extraordinarios", "todos"];

export const LIMITE_RESPUESTA_IA = 400;
export const LIMITE_MENSAJE_ANTERIOR = 300;
export const LIMITE_TEXTO_CONSULTA = 60;

/* strict de Structured Outputs: objeto o null, todo en `required`. */
export const ESQUEMA_CONSULTA = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      description: "Solo si el usuario pregunta por sus datos en vez de registrar algo.",
      properties: {
        tema: { type: "string", enum: Object.values(TEMAS_CONSULTA) },
        desde: { type: ["string", "null"], description: "YYYY-MM-DD inicio del periodo; null si no aplica." },
        hasta: { type: ["string", "null"], description: "YYYY-MM-DD fin del periodo; null si no aplica." },
        categoria: { type: "string", description: "value de una categoría válida, o vacío." },
        cuentaId: { type: ["string", "null"], description: "id de una cuenta si la pregunta es sobre ella." },
        texto: { type: "string", description: "Producto o concepto a buscar; vacío si no aplica." },
        pregunta: {
          type: "string",
          description: "Solo en un reporte: una pregunta concreta que la persona quiere que el reporte conteste (\"¿me alcanza para un viaje de 10 mil?\"). Vacío si no hay.",
        },
        marca: {
          type: "string",
          enum: MARCAS_CONSULTA,
          description: "Filtra gastos por la marca que puso el usuario: \"personal\" = los que marcó como personales (no es la categoría); \"todos\" = pide explícitamente todos sus gastos, incluido lo no personal. Vacío si no aplica (la app usa lo que la persona eligió para \"mis gastos\").",
        },
        orden: { type: "string", enum: ["mayor", "menor"], description: "\"menor\" solo si pregunta por lo mínimo." },
        reporte: {
          type: "string",
          enum: REPORTES_CONSULTA,
          description: "Solo con tema \"reporte\": cuál de los reportes. Vacío en cualquier otro tema.",
        },
      },
      required: ["tema", "desde", "hasta", "categoria", "cuentaId", "texto", "pregunta", "marca", "orden", "reporte"],
      additionalProperties: false,
    },
  ],
};

const PATRON_FECHA_CONSULTA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_ID_CONSULTA = /^[A-Za-z0-9_-]{1,64}$/;
const PATRON_CATEGORIA = /^[A-Za-z]{0,40}$/;

/*
 * Turno anterior de la conversación: la pregunta que hizo el usuario y la
 * consulta en que se tradujo. Con eso la IA entiende correcciones como
 * "no, en general los personales" sin perder el periodo. Solo viajan los
 * filtros de la consulta, nunca la respuesta con cifras.
 *
 * Lo usan la app (al mandarlo) y el Worker (al validarlo): devuelve null si
 * algo no cuadra, para que un turno raro no tumbe la solicitud.
 */
export const limpiarTurnoAnterior = (anterior) => {
  if (!anterior || typeof anterior !== "object") return null;
  const mensaje = String(anterior.mensaje ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITE_MENSAJE_ANTERIOR);
  const consulta = anterior.consulta;
  if (!mensaje || !consulta || typeof consulta !== "object") return null;
  if (!Object.values(TEMAS_CONSULTA).includes(consulta.tema)) return null;

  const fecha = (valor) => (PATRON_FECHA_CONSULTA.test(String(valor || "")) ? valor : null);
  return {
    mensaje,
    consulta: {
      tema: consulta.tema,
      desde: fecha(consulta.desde),
      hasta: fecha(consulta.hasta),
      categoria: PATRON_CATEGORIA.test(String(consulta.categoria || "")) ? String(consulta.categoria || "") : "",
      cuentaId: PATRON_ID_CONSULTA.test(String(consulta.cuentaId || "")) ? consulta.cuentaId : null,
      texto: String(consulta.texto || "").replace(/\s+/g, " ").trim().slice(0, LIMITE_TEXTO_CONSULTA),
      marca: MARCAS_CONSULTA.includes(consulta.marca) ? consulta.marca : "",
      orden: consulta.orden === "menor" ? "menor" : "mayor",
      reporte: consulta.tema === TEMAS_CONSULTA.REPORTE && REPORTES_CONSULTA.includes(consulta.reporte) ? consulta.reporte : "",
      // La pregunta de un reporte ya se contestó; el turno anterior solo aporta filtros.
      pregunta: "",
    },
  };
};

export const ESQUEMA_IR_A = {
  type: ["string", "null"],
  enum: [...Object.keys(RUTAS_ASISTENTE), null],
  description: "Ruta si el usuario pide abrir una sección; si no, null.",
};
