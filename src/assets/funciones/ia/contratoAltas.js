/*
 * Parte del contrato de captura para crear cuentas e instituciones desde el
 * chat ("abre una cuenta de débito Nómina en BBVA", "agrega el banco Nu").
 *
 * Igual que el resto del contrato: la IA solo propone. La app valida cada alta
 * (interpretarAltas.js), el usuario confirma en el chat y el guardado pasa por
 * altaDeInstitucion / altaDeCuenta, las mismas funciones de los modales.
 *
 * El Worker también empaqueta este archivo: sin React, imágenes ni Firebase.
 */

export const TIPOS_CUENTA_ALTA = ["debito", "credito", "inversion", "efectivo"];
export const LIMITE_ALTAS_POR_MENSAJE = 5;
export const LIMITE_NOMBRE_ALTA = 60;
export const LIMITE_INSTITUCIONES_CONTEXTO = 50;

/* strict de Structured Outputs: todo en `required`, opcionales como null. */
export const ESQUEMA_ALTAS = {
  type: "object",
  description: "Cuentas o instituciones NUEVAS que el usuario pide crear explícitamente. Arreglos vacíos si no pide crear nada.",
  properties: {
    instituciones: {
      type: "array",
      description: "Instituciones (bancos, billeteras) nuevas. No repitas las que ya existen.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre corto, p. ej. \"BBVA\", \"Nu\", \"Mercado Pago\"." },
        },
        required: ["nombre"],
        additionalProperties: false,
      },
    },
    cuentas: {
      type: "array",
      description: "Cuentas o tarjetas nuevas.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la cuenta, p. ej. \"BBVA Oro\" o \"Nómina\"." },
          tipoDeCuenta: { type: "string", enum: TIPOS_CUENTA_ALTA },
          institucion: {
            type: "string",
            description: "Nombre de su institución (existente o nueva). Vacío si el usuario no la dice.",
          },
          esLiquida: {
            type: ["boolean", "null"],
            description: "Solo si el usuario dice si puede disponer del dinero al momento; si no, null.",
          },
          fechaDeCorte: { type: ["integer", "null"], description: "Solo crédito: día de corte 1-31; si no, null." },
          fechaLimiteDePago: { type: ["integer", "null"], description: "Solo crédito: día límite de pago 1-31; si no, null." },
          limiteDeCredito: { type: ["number", "null"], description: "Solo crédito: límite si lo dice; si no, null." },
        },
        required: [
          "nombre",
          "tipoDeCuenta",
          "institucion",
          "esLiquida",
          "fechaDeCorte",
          "fechaLimiteDePago",
          "limiteDeCredito",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["instituciones", "cuentas"],
  additionalProperties: false,
};
