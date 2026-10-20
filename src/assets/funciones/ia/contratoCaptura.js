import { categoriasEsqueleto } from "../utils/esqueletos";
import { ESQUEMA_DESPENSA } from "./contratoDespensa.js";
import { ESQUEMA_CONSULTA, ESQUEMA_IR_A } from "./contratoConsulta.js";

/*
 * Contrato entre Zaldo y cualquier IA que convierta un mensaje libre
 * ("gasté 230 en uber con la BBVA") en capturas de la app.
 *
 * La IA NUNCA escribe en Firestore: solo devuelve un JSON con esta forma. Ese
 * JSON pasa por `interpretarCaptura.js`, que lo valida contra las cuentas y
 * categorías reales, y el resultado abre el modal de captura de siempre para
 * que el usuario confirme. Así los saldos se siguen moviendo por un solo camino
 * (agregarMovimiento + modificarMontoDesdeMovimiento).
 *
 * El esquema cumple el modo `strict` de Structured Outputs de OpenAI: todas las
 * propiedades van en `required`, los opcionales se expresan como `null` y cada
 * objeto lleva `additionalProperties: false`. Si agregas un campo, respeta eso
 * o la API rechazará el esquema.
 *
 * Este archivo también lo empaqueta el Worker (workers/captura-ia): mantenlo
 * sin imports de React, imágenes ni Firebase.
 */

/* Versión del contrato: súbela si cambia la forma del JSON. */
export const VERSION_CONTRATO_CAPTURA = 3;

/*
 * Tipos que la app ya sabe registrar. Ingresos por empresa, compras de despensa
 * y abonos de préstamos tienen su propio modelo de datos; se agregarán como
 * tipos nuevos cuando se conecten, no forzándolos dentro de "ingreso".
 */
export const TIPOS_CAPTURA = {
  GASTO: "gasto",
  INGRESO: "ingreso",
  TRANSFERENCIA: "transferencia",
  DESCONOCIDO: "desconocido",
};

/*
 * Categorías que representan dinero moviéndose entre cuentas propias. No son
 * gasto ni ingreso real, así que la IA no puede asignarlas a un gasto/ingreso:
 * para eso existe el tipo "transferencia".
 */
export const CATEGORIAS_INTERNAS = ["transferencia", "pagoTarjeta"];

export const CATEGORIAS_CAPTURA = categoriasEsqueleto
  .filter((categoria) => !CATEGORIAS_INTERNAS.includes(categoria.value));

export const LIMITE_NOTA_CAPTURA = 200;
export const LIMITE_CAPTURAS_POR_MENSAJE = 10;

export const ESQUEMA_CAPTURA = {
  type: "object",
  properties: {
    capturas: {
      type: "array",
      description: "Una entrada por cada operación mencionada en el mensaje.",
      items: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: Object.values(TIPOS_CAPTURA),
            description: "Usa 'desconocido' si el mensaje no describe una operación clara.",
          },
          monto: {
            type: "number",
            description: "Importe positivo en la moneda del usuario, sin signo.",
          },
          cuentaId: {
            type: ["string", "null"],
            description: "id de la cuenta (origen en transferencias). null si no se menciona o hay duda.",
          },
          cuentaDestinoId: {
            type: ["string", "null"],
            description: "Solo transferencias: id de la cuenta que recibe.",
          },
          categoria: {
            type: "string",
            enum: ["", ...CATEGORIAS_CAPTURA.map((categoria) => categoria.value)],
            description: "Vacío si no es obvia.",
          },
          fecha: {
            type: ["string", "null"],
            description: "YYYY-MM-DD. null si el mensaje no indica fecha (se asume hoy).",
          },
          nota: {
            type: "string",
            description: "Descripción corta: comercio o concepto.",
          },
          pagoAMeses: {
            type: ["string", "null"],
            enum: ["msi", "revolvente", null],
            description: "Solo gastos con tarjeta de crédito.",
          },
          esPersonal: {
            type: "boolean",
            description: "Solo gastos: true si el usuario dice que es personal.",
          },
          esExtraordinario: {
            type: "boolean",
            description: "Solo gastos: true si es un gasto fuera de lo habitual.",
          },
          dudas: {
            type: "array",
            items: { type: "string" },
            description: "Lo que no quedó claro y el usuario debe revisar. Vacío si nada.",
          },
        },
        required: [
          "tipo",
          "monto",
          "cuentaId",
          "cuentaDestinoId",
          "categoria",
          "fecha",
          "nota",
          "pagoAMeses",
          "esPersonal",
          "esExtraordinario",
          "dudas",
        ],
        additionalProperties: false,
      },
    },
    despensa: ESQUEMA_DESPENSA,
    consulta: ESQUEMA_CONSULTA,
    respuesta: {
      type: "string",
      description: "Texto breve para el usuario solo si no hay capturas, despensa ni consulta; si no, vacío.",
    },
    irA: ESQUEMA_IR_A,
  },
  required: ["capturas", "despensa", "consulta", "respuesta", "irA"],
  additionalProperties: false,
};
