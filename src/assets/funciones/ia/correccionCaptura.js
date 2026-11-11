/*
 * Correcciones en el chat: con un registro esperando confirmación, "no, fueron
 * 250", "ponlo ayer con efectivo" o "quita el detergente" se le manda a la IA
 * junto con el registro pendiente, y lo que devuelve reemplaza la propuesta.
 * Lo que la corrección no toca se conserva de la propuesta anterior.
 */

export const PREFIJO_PENDIENTE = "Registro pendiente de confirmar:";
export const PREFIJO_CORRECCION = "Corrección del usuario:";
const LIMITE_CORRECCION = 300;
// El del Worker (LIMITE_MENSAJE): una compra muy larga no cabe y no se corrige por chat.
const LIMITE_MENSAJE = 1200;

const siNo = (valor) => (valor ? "sí" : "no");
const unir = (partes) => partes.filter(Boolean).join("; ");

const describirDespensa = (propuesta) => unir([
  "compra de despensa",
  propuesta.tienda ? `tienda: ${propuesta.tienda}` : "",
  propuesta.totalTicket ? `total del ticket: ${propuesta.totalTicket}` : "total del ticket: no dicho",
  `cuenta: ${propuesta.cuenta?.nombre || "no dicha"}`,
  `fecha: ${propuesta.fecha}`,
  `productos: ${propuesta.items.map((item) => [
    `${item.cantidad} ${item.unidad} ${item.producto}`,
    item.presentacion ? `(${item.presentacion})` : "",
    item.costoTotal ? `$${item.costoTotal}` : "",
  ].filter(Boolean).join(" ")).join(" | ")}`,
]);

const describirPagoEmpleo = (propuesta) => unir([
  `pago del empleo ${propuesta.empresa.nombre}`,
  propuesta.soloPercepciones ? "solo percepciones, sin sueldo" : `sueldo: ${propuesta.monto}`,
  propuesta.horas ? `horas: ${propuesta.horas}` : "",
  `cuenta: ${propuesta.cuenta?.nombre || "ninguna"}`,
  `fecha: ${propuesta.fecha}`,
  propuesta.percepciones.length
    ? `percepciones: ${propuesta.percepciones.map((fila) => `${fila.percepcion.nombre} ${fila.monto}`).join(" | ")}`
    : "percepciones: ninguna",
  propuesta.nota ? `nota: ${propuesta.nota}` : "",
]);

const describirPendiente = (propuesta) => {
  if (propuesta.accion === "despensa") return describirDespensa(propuesta);
  if (propuesta.accion === "pagoEmpleo") return describirPagoEmpleo(propuesta);

  if (propuesta.accion === "transferencia") {
    return unir([
      `transferencia de ${propuesta.monto}`,
      `de: ${propuesta.cuentaOrigen?.nombre || "sin elegir"}`,
      `a: ${propuesta.cuentaDestino?.nombre || "sin elegir"}`,
      propuesta.nota ? `nota: ${propuesta.nota}` : "",
    ]);
  }

  const { valores } = propuesta;
  const esGasto = valores.tipoDeMovimiento === "gasto";
  return unir([
    `${valores.tipoDeMovimiento} de ${valores.monto}`,
    `cuenta: ${propuesta.cuenta?.nombre || "sin elegir"}`,
    `categoría: ${valores.categoria || "sin elegir"}`,
    `fecha: ${valores.fechaMovimiento}`,
    valores.nota ? `nota: ${valores.nota}` : "",
    esGasto ? `personal: ${siNo(valores.esPersonal)}` : "",
    esGasto ? `extraordinario: ${siNo(valores.esExtraordinario)}` : "",
    valores.pagoAMeses ? `pago a meses: ${valores.pagoAMeses}` : "",
  ]);
};

export const admiteCorreccion = (propuesta) => ["movimiento", "transferencia", "despensa"].includes(propuesta?.accion)
  || (propuesta?.accion === "pagoEmpleo" && Boolean(propuesta.empresa));

/** @returns {string | null} null si el registro no cabe en un mensaje. */
export const construirMensajeCorreccion = (propuesta, correccion) => {
  const mensaje = [
    `${PREFIJO_PENDIENTE} ${describirPendiente(propuesta)}`,
    `${PREFIJO_CORRECCION} ${String(correccion || "").replace(/\s+/g, " ").trim().slice(0, LIMITE_CORRECCION)}`,
  ].join("\n");
  return mensaje.length <= LIMITE_MENSAJE ? mensaje : null;
};

const fusionarTransferencia = (anterior, nueva) => {
  const cuentaOrigen = nueva.cuentaOrigen || anterior.cuentaOrigen;
  const cuentaDestino = nueva.cuentaDestino || anterior.cuentaDestino;
  const iguales = cuentaOrigen && cuentaDestino && cuentaOrigen.id === cuentaDestino.id;
  return {
    ...anterior,
    ...nueva,
    cuentaOrigen: iguales ? nueva.cuentaOrigen : cuentaOrigen,
    cuentaDestino: iguales ? nueva.cuentaDestino : cuentaDestino,
    nota: nueva.nota || anterior.nota,
    advertencias: (nueva.advertencias || [])
      .filter((texto) => iguales || !/origen|destino|cuenta/i.test(texto) || !cuentaOrigen || !cuentaDestino),
  };
};

const fusionarMovimiento = (anterior, nueva) => {
  // El gasto de una compra de despensa no puede volverse otra cosa.
  if (anterior.esGastoDeDespensa && nueva.accion !== "movimiento") return null;
  if (nueva.accion !== anterior.accion) return nueva;
  if (nueva.accion === "transferencia") return fusionarTransferencia(anterior, nueva);

  const cuenta = nueva.cuenta || anterior.cuenta;
  const categoria = nueva.valores.categoria || anterior.valores.categoria;
  const mismoTipo = nueva.valores.tipoDeMovimiento === anterior.valores.tipoDeMovimiento;
  return {
    ...anterior,
    ...nueva,
    cuenta,
    valores: {
      ...nueva.valores,
      categoria,
      nota: nueva.valores.nota || anterior.valores.nota,
      pagoAMeses: nueva.valores.pagoAMeses ?? anterior.valores.pagoAMeses,
      esPersonal: nueva.personalIndicado || !mismoTipo ? nueva.valores.esPersonal : anterior.valores.esPersonal,
    },
    personalIndicado: nueva.personalIndicado || anterior.personalIndicado,
    advertencias: (nueva.advertencias || [])
      .filter((texto) => !(cuenta && /cuenta/i.test(texto)) && !(categoria && /categor/i.test(texto))),
  };
};

const fusionarDespensa = (anterior, nueva) => ({
  ...anterior,
  ...nueva,
  cuenta: nueva.cuenta || anterior.cuenta,
  tienda: nueva.tienda || anterior.tienda,
});

const SIN_MONTO = /no dijiste el monto/i;

const fusionarPagoEmpleo = (anterior, nueva) => {
  // Otro empleo es otro pago: mejor empezar de nuevo que mezclar percepciones.
  if (nueva.empresa && nueva.empresa.id !== anterior.empresa.id) return null;
  const montoInventado = (nueva.advertencias || []).some((texto) => SIN_MONTO.test(texto));
  return {
    ...anterior,
    ...nueva,
    empresa: anterior.empresa,
    monto: montoInventado ? anterior.monto : nueva.monto,
    horas: nueva.horas ?? anterior.horas,
    // La cuenta que ya se había elegido solo cambia si la corrección nombra otra.
    cuenta: nueva.cuentaExplicita ? nueva.cuenta : anterior.cuenta,
    cuentaExplicita: nueva.cuentaExplicita || anterior.cuentaExplicita,
    cuentaRespondida: anterior.cuentaRespondida,
    // Las que la app agrega por su cuenta ya venían en el registro pendiente: quedan solo las que la IA conservó.
    percepciones: nueva.percepciones.filter((fila) => !fila.sugerida),
    nota: nueva.nota || anterior.nota,
    advertencias: (nueva.advertencias || []).filter((texto) => !SIN_MONTO.test(texto)),
  };
};

/**
 * @param anterior      Propuesta que estaba por confirmarse.
 * @param interpretado  Resultado de interpretarCaptura con la corrección.
 * @returns la propuesta corregida, o null si lo devuelto no corrige ese registro.
 */
export const fusionarCorreccion = (anterior, { propuestas = [], despensa = null, pagosEmpleo = [] } = {}) => {
  if (!admiteCorreccion(anterior)) return null;
  if (anterior.accion === "despensa") return despensa ? fusionarDespensa(anterior, despensa) : null;
  if (anterior.accion === "pagoEmpleo") return pagosEmpleo.length === 1 ? fusionarPagoEmpleo(anterior, pagosEmpleo[0]) : null;

  const [nueva] = propuestas;
  if (despensa || pagosEmpleo.length || propuestas.length !== 1) return null;
  if (!["movimiento", "transferencia"].includes(nueva.accion)) return null;
  return fusionarMovimiento(anterior, nueva);
};
