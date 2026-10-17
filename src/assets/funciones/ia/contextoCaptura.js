import { fechaLocalISO } from "../utils/fechas";
import {
  CATEGORIAS_CAPTURA,
  LIMITE_CAPTURAS_POR_MENSAJE,
  TIPOS_CAPTURA,
} from "./contratoCaptura";

/*
 * Arma lo mínimo que la IA necesita para resolver el mensaje: qué cuentas
 * existen y qué categorías son válidas. A propósito NO viajan saldos, límites
 * ni movimientos: para interpretar "gasté 200 en la BBVA" no hacen falta, y
 * todo lo que se manda a un proveedor externo sale del control de la app.
 */
export const construirContextoCaptura = ({ cuentas = [], hoy = new Date() } = {}) => ({
  hoy: fechaLocalISO(hoy),
  cuentas: cuentas
    .filter((cuenta) => cuenta?.id && cuenta.activo !== false)
    .map((cuenta) => ({
      id: cuenta.id,
      nombre: cuenta.nombre || "",
      tipoDeCuenta: cuenta.tipoDeCuenta || "",
    })),
  categorias: CATEGORIAS_CAPTURA.map(({ value, label }) => ({ value, label })),
});

/*
 * Instrucciones de sistema. El mensaje del usuario va aparte (como mensaje de
 * usuario), nunca concatenado aquí, para que lo que escriba no se confunda con
 * las reglas.
 */
export const construirInstruccionesCaptura = (contexto) => `Eres el asistente de captura de Zaldo, una app de finanzas personales en México.
Convierte el mensaje del usuario en capturas con el formato indicado. Solo extraes datos: no das consejos ni conversas.

Hoy es ${contexto.hoy}. Interpreta "ayer", "el lunes", etc. respecto a esa fecha.

Reglas:
1. Una captura por operación; máximo ${LIMITE_CAPTURAS_POR_MENSAJE}.
2. "${TIPOS_CAPTURA.GASTO}" = sale dinero, "${TIPOS_CAPTURA.INGRESO}" = entra dinero, "${TIPOS_CAPTURA.TRANSFERENCIA}" = dinero entre dos cuentas del usuario (incluye pagar una tarjeta de crédito desde otra cuenta).
3. "monto" siempre positivo. Si no hay monto claro, usa tipo "${TIPOS_CAPTURA.DESCONOCIDO}".
4. "cuentaId" solo puede ser un id de la lista de cuentas. Si el usuario no la menciona o hay más de una posible, usa null y explícalo en "dudas". Nunca inventes ids.
5. "categoria" solo de la lista; si no es evidente, deja "".
6. "pagoAMeses" solo si la cuenta es de crédito y el usuario lo dice; si no, null.
7. Si algo es ambiguo, no adivines: déjalo vacío/null y anótalo en "dudas".

Cuentas del usuario (JSON):
${JSON.stringify(contexto.cuentas)}

Categorías válidas (JSON):
${JSON.stringify(contexto.categorias)}`;
