import { categoriasEsqueleto } from "../utils/esqueletos.js";
import { fechaCortaLegible, fechaLocalISO } from "../utils/fechas.js";

/*
 * Reglas que comparten las consultas del asistente (responderConsulta.js) y
 * los reportes (reportes/): qué cuenta como gasto, qué es personal, cómo se
 * resuelve un periodo y qué meses están completos.
 *
 * Sin React, Firebase ni el store: también lo importan las pruebas de Node,
 * por eso los imports llevan extensión.
 */

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MAXIMO_MESES = 24;

export const redondear = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

export const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .trim()
  .toLowerCase();

export const etiquetaCategoria = (valor) => categoriasEsqueleto
  .find((categoria) => categoria.value === valor)?.label || "Sin categoría";

/* ─────────── Periodos ─────────── */

export const primeroDelMes = (hoyISO) => `${hoyISO.slice(0, 8)}01`;
export const finDeMes = (anio, mes) => new Date(anio, mes, 0).getDate();

export const haceMeses = (hoyISO, meses) => {
  const fecha = new Date(`${hoyISO}T12:00:00`);
  fecha.setMonth(fecha.getMonth() - meses, 1);
  return fechaLocalISO(fecha);
};

/* Último día del mes anterior al de `hoyISO`. */
export const finDelMesPasado = (hoyISO) => {
  const fecha = new Date(`${primeroDelMes(hoyISO)}T12:00:00`);
  fecha.setDate(0);
  return fechaLocalISO(fecha);
};

/*
 * Periodo efectivo: lo que dijo la IA o el mes en curso. Se limita a
 * MAXIMO_MESES para no leer años de documentos por una pregunta.
 */
export const resolverPeriodo = (consulta, hoyISO, advertencias) => {
  const hasta = consulta.hasta || hoyISO;
  let desde = consulta.desde || primeroDelMes(hasta <= hoyISO ? hasta : hoyISO);

  const limite = new Date(`${hasta}T12:00:00`);
  limite.setMonth(limite.getMonth() - MAXIMO_MESES + 1, 1);
  const limiteISO = fechaLocalISO(limite);
  if (desde < limiteISO) {
    desde = limiteISO;
    advertencias.push(`Solo revisé los últimos ${MAXIMO_MESES} meses.`);
  }

  return { desde, hasta };
};

export const describirPeriodo = ({ desde, hasta }, hoyISO = fechaLocalISO()) => {
  const [anioD, mesD, diaD] = desde.split("-").map(Number);
  const [anioH, mesH, diaH] = hasta.split("-").map(Number);

  if (anioD === anioH && mesD === mesH && diaD === 1) {
    if (hasta === hoyISO) return "este mes";
    if (diaH === finDeMes(anioH, mesH)) return `${MESES[mesD - 1]} de ${anioD}`;
  }
  if (anioD === anioH && mesD === 1 && diaD === 1) {
    if (hasta === hoyISO) return "este año";
    if (mesH === 12 && diaH === 31) return `${anioD}`;
  }
  if (desde === hasta) return desde === hoyISO ? "hoy" : `el ${fechaCortaLegible(desde)}`;
  return `del ${fechaCortaLegible(desde)} al ${fechaCortaLegible(hasta)}`;
};

/* Claves YYYYMM (las de los documentos de movimientos) que toca el periodo. */
export const mesesDelPeriodo = ({ desde, hasta }) => {
  const claves = [];
  const cursor = new Date(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)) - 1, 1);
  const fin = new Date(Number(hasta.slice(0, 4)), Number(hasta.slice(5, 7)) - 1, 1);
  while (cursor <= fin) {
    claves.push(`${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return claves;
};

export const claveMesDeFecha = (fechaISO) => String(fechaISO || "").slice(0, 7).replace("-", "");
export const nombreMes = (clave) => `${MESES[Number(clave.slice(4, 6)) - 1]} ${clave.slice(0, 4)}`;
export const etiquetaMesCorta = (clave) => `${MESES_CORTOS[Number(clave.slice(4, 6)) - 1]}-${clave.slice(2, 4)}`;

export const limitesDelMes = (clave) => {
  const inicio = `${clave.slice(0, 4)}-${clave.slice(4, 6)}-01`;
  const fin = `${inicio.slice(0, 8)}${finDeMes(Number(clave.slice(0, 4)), Number(clave.slice(4, 6)))}`;
  return { inicio, fin };
};

/* Un mes cuenta en un promedio solo si el periodo lo cubre entero y ya terminó. */
export const mesCompleto = (clave, periodo, hoyISO) => {
  const { inicio, fin } = limitesDelMes(clave);
  return periodo.desde <= inicio && periodo.hasta >= fin && fin < hoyISO;
};

/* ─────────── Movimientos ─────────── */

export const fechaISODeMovimiento = (valor) => {
  if (!valor) return "";
  if (typeof valor.toDate === "function") return fechaLocalISO(valor.toDate());
  if (typeof valor.seconds === "number") return fechaLocalISO(new Date(valor.seconds * 1000));
  if (typeof valor.iso === "string") return valor.iso.slice(0, 10);
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : fechaLocalISO(fecha);
};

// Mismas reglas que la página de movimientos: lo interno no es gasto ni ingreso.
const CATEGORIAS_NO_CONTABLES = ["transferencia", "pagoTarjeta", "ajusteDeSaldo", "ajusteDeSaldoMSI"];
export const esInterno = (movimiento) => Boolean(
  movimiento.esTransferencia
  || movimiento.cuentaDestino
  || movimiento.cuentaDestinoNombre
  || movimiento.tipoOperacion === "transferencia"
  || movimiento.tipoOperacion === "pago_tarjeta"
  || movimiento.esAjusteSaldo === true
  || movimiento.ignorarEnResumen
  || CATEGORIAS_NO_CONTABLES.includes(movimiento.categoria)
);
export const esGasto = (movimiento) => Number(movimiento.monto) < 0 && !esInterno(movimiento);
export const esIngreso = (movimiento) => Number(movimiento.monto) > 0 && !esInterno(movimiento);
// Igual que movimientoEsPersonal de la página: los gastos viejos con categoría "personal" cuentan.
export const esPersonal = (movimiento) => Boolean(movimiento.esPersonal || movimiento.categoria === "personal");
export const sumaGastos = (gastos) => redondear(gastos.reduce((suma, movimiento) => suma - Number(movimiento.monto), 0));

/* Marcas que el usuario pone a mano (contratoConsulta → MARCAS_CONSULTA). */
export const MARCAS = {
  personal: { cumple: esPersonal, nombre: "personales", frase: "en gastos personales" },
  no_personal: { cumple: (movimiento) => !esPersonal(movimiento), nombre: "no personales", frase: "sin contar lo personal" },
  extraordinario: { cumple: (movimiento) => Boolean(movimiento.esExtraordinario), nombre: "extraordinarios", frase: "en gastos extraordinarios" },
  sin_extraordinarios: { cumple: (movimiento) => !movimiento.esExtraordinario, nombre: "sin extraordinarios", frase: "sin contar extraordinarios" },
};

export const filtrarPorConsulta = (movimientos, consulta) => movimientos.filter((movimiento) => (
  (!consulta.categoria || movimiento.categoria === consulta.categoria)
  && (!consulta.cuenta || movimiento.cuentaAsociada === consulta.cuenta.id
    || normalizar(movimiento.nombreCuenta) === normalizar(consulta.cuenta.nombre))
  && (!consulta.texto || normalizar(movimiento.nota).includes(normalizar(consulta.texto)))
  && (!MARCAS[consulta.marca] || MARCAS[consulta.marca].cumple(movimiento))
));
