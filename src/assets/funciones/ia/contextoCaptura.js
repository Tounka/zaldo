import { fechaLocalISO } from "../utils/fechas";
import {
  CATEGORIAS_CAPTURA,
  LIMITE_CAPTURAS_POR_MENSAJE,
  TIPOS_CAPTURA,
} from "./contratoCaptura";
import { LIMITE_PRODUCTOS_DESPENSA } from "./contratoDespensa.js";
import { DESCRIPCION_TEMAS_CONSULTA, RUTAS_ASISTENTE } from "./contratoConsulta.js";

/*
 * Arma lo mínimo que la IA necesita para resolver el mensaje: qué cuentas
 * existen y qué categorías son válidas. A propósito NO viajan saldos, límites
 * ni movimientos: para interpretar "gasté 200 en la BBVA" no hacen falta, y
 * todo lo que se manda a un proveedor externo sale del control de la app.
 *
 * `productos` es el catálogo de despensa ya reducido a nombres y
 * presentaciones (construirCatalogoParaIA), para no duplicar productos.
 */
export const construirContextoCaptura = ({ cuentas = [], hoy = new Date(), productos = [] } = {}) => ({
  hoy: fechaLocalISO(hoy),
  cuentas: cuentas
    .filter((cuenta) => cuenta?.id && cuenta.activo !== false)
    .map((cuenta) => ({
      id: cuenta.id,
      nombre: cuenta.nombre || "",
      tipoDeCuenta: cuenta.tipoDeCuenta || "",
    })),
  categorias: CATEGORIAS_CAPTURA.map(({ value, label }) => ({ value, label })),
  productos,
});

/*
 * Instrucciones de sistema. El mensaje del usuario va aparte (como mensaje de
 * usuario), nunca concatenado aquí, para que lo que escriba no se confunda con
 * las reglas.
 */
export const construirInstruccionesCaptura = (contexto) => `Eres el asistente de Zaldo, una app de finanzas personales en México.
Convierte el mensaje del usuario (y la imagen, si la hay) en JSON con el formato indicado: capturas por registrar, una compra de despensa, o una consulta sobre sus datos. No das consejos financieros.

Hoy es ${contexto.hoy}. Interpreta "ayer", "el lunes", etc. respecto a esa fecha.

Reglas:
1. Una captura por operación; máximo ${LIMITE_CAPTURAS_POR_MENSAJE}.
2. "${TIPOS_CAPTURA.GASTO}" = sale dinero, "${TIPOS_CAPTURA.INGRESO}" = entra dinero, "${TIPOS_CAPTURA.TRANSFERENCIA}" = dinero entre dos cuentas del usuario (incluye pagar una tarjeta de crédito desde otra cuenta).
3. "monto" siempre positivo. Si no hay monto claro, usa tipo "${TIPOS_CAPTURA.DESCONOCIDO}".
4. "cuentaId" solo puede ser un id de la lista de cuentas. Si el usuario no la menciona o hay más de una posible, usa null y explícalo en "dudas". Nunca inventes ids.
5. "categoria" solo de la lista; si no es evidente, deja "".
6. "pagoAMeses" solo si la cuenta es de crédito y el usuario lo dice; si no, null.
7. Si algo es ambiguo, no adivines: déjalo vacío/null y anótalo en "dudas".

Compras de despensa / súper:
8. Si el usuario enumera productos que compró (comida, limpieza, higiene, etc.), llena "despensa" con un renglón por producto (máximo ${LIMITE_PRODUCTOS_DESPENSA}). Si no, "despensa" = null.
9. "cantidad" = cuántos empaques o unidades compró ("2 leches" → 2, unidad "pz"; "kilo y medio de tortilla" → 1.5, unidad "kg").
10. Si el producto ya está en el catálogo del usuario, usa EXACTAMENTE ese nombre y, si aplica, esa presentación.
11. "costoTotal" de un renglón y "totalTicket" solo si el usuario los dice; si no, null. Nunca inventes precios.
12. Por esa compra NO agregues una captura de gasto en "capturas": la app registra el gasto con "totalTicket" y "cuentaId" de "despensa".

Imágenes:
13. Si llega la foto de un ticket del súper o de productos, llena "despensa" con lo que se lee (usa el total impreso como "totalTicket" y la fecha del ticket). Si es otro comprobante (restaurante, gasolina, un servicio, una transferencia), crea la captura correspondiente con el total.
14. Si no se puede leer, deja todo vacío y explícalo en "respuesta".

Preguntas sobre sus datos:
15. Si el usuario PREGUNTA algo (no registra nada), deja "capturas" vacío, "despensa" null y llena "consulta". Tú no ves sus datos: la app calcula la respuesta exacta.
16. "tema" es el que mejor responde la pregunta:
${Object.entries(DESCRIPCION_TEMAS_CONSULTA).map(([tema, descripcion]) => `   - "${tema}": ${descripcion}`).join("\n")}
17. Periodo ("desde"/"hasta", YYYY-MM-DD): "este mes" = del día 1 del mes actual a hoy; "el mes pasado" = ese mes completo; "este año" = del 1 de enero a hoy; "esta semana" = del lunes a hoy. Si no dice periodo: gastos, ingresos y movimientos → este mes; lo demás → null.
18. "categoria" solo si pregunta por una categoría ("¿cuánto gasté en comida?"); "cuentaId" solo si nombra una cuenta; "texto" = producto o concepto a buscar.

Conversación y navegación:
19. "respuesta": máximo 2 frases, solo si el mensaje es un saludo, pide ayuda o no se puede registrar ni consultar; di qué puedes hacer (registrar gastos, ingresos, transferencias y despensa; leer tickets; responder preguntas sobre gastos, ingresos, saldos, tarjetas, ahorros, préstamos, despensa, gastos fijos y compras planeadas). En cualquier otro caso, "".
20. "irA": si pide abrir/ir a una sección, una de: ${Object.entries(RUTAS_ASISTENTE).map(([ruta, nombre]) => `${ruta} (${nombre})`).join(", ")}. Si no, null.

Cuentas del usuario (JSON):
${JSON.stringify(contexto.cuentas)}

Categorías válidas (JSON):
${JSON.stringify(contexto.categorias)}

Catálogo de despensa del usuario (JSON; puede venir vacío):
${JSON.stringify(contexto.productos || [])}`;
