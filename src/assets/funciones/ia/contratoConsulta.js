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

export const TEMAS_CONSULTA = {
  GASTOS_POR_CATEGORIA: "gastos_por_categoria",
  GASTOS_TOTAL: "gastos_total",
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
};

/* Qué resuelve cada tema; va tal cual en las instrucciones de la IA. */
export const DESCRIPCION_TEMAS_CONSULTA = {
  gastos_por_categoria: "en qué categorías gastó más/menos (ranking)",
  gastos_total: "cuánto gastó en un periodo (opcional: en una categoría o con una cuenta)",
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
};

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

export const LIMITE_RESPUESTA_IA = 400;
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
        orden: { type: "string", enum: ["mayor", "menor"], description: "\"menor\" solo si pregunta por lo mínimo." },
      },
      required: ["tema", "desde", "hasta", "categoria", "cuentaId", "texto", "orden"],
      additionalProperties: false,
    },
  ],
};

export const ESQUEMA_IR_A = {
  type: ["string", "null"],
  enum: [...Object.keys(RUTAS_ASISTENTE), null],
  description: "Ruta si el usuario pide abrir una sección; si no, null.",
};
