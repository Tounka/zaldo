const fechaConDiaDelMes = (fechaBase, dia) => {
  const anio = fechaBase.getFullYear();
  const mes = fechaBase.getMonth();
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(Math.max(Number(dia) || 1, 1), ultimoDia), 23, 59, 59, 999);
};

export const obtenerPeriodoActual = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

/*
 * El pago se guarda con su periodo (YYYY-MM), en vez de un booleano permanente.
 * Así, el checkbox se reinicia solo al cambiar de mes sin necesitar un cron.
 */
export const obtenerEstadoPagoTarjeta = (cuenta, fecha = new Date()) => {
  const periodo = obtenerPeriodoActual(fecha);
  const saldoTotal = Number(cuenta?.saldoALaFecha || 0) + Number(cuenta?.saldoALaFechaMSI || 0);
  // En las cuentas de crédito los consumos se guardan como saldo negativo;
  // un saldo positivo representa un crédito a favor y no una deuda vencida.
  const saldo = Math.max(0, -saldoTotal);
  const diaLimite = Number(cuenta?.fechaLimiteDePago);
  const tieneFechaLimite = diaLimite >= 1 && diaLimite <= 31;
  const fechaLimite = fechaConDiaDelMes(fecha, tieneFechaLimite ? diaLimite : 1);
  const pagada = cuenta?.periodoPagoMarcado === periodo;

  if (!saldo) {
    return { periodo, pagada, tono: "liquidada", etiqueta: "Sin saldo pendiente", color: "#059669" };
  }

  if (pagada) {
    return { periodo, pagada, tono: "pagada", etiqueta: "Pago marcado", color: "#059669" };
  }

  if (!tieneFechaLimite) {
    return { periodo, pagada, tono: "sin-configurar", etiqueta: "Configura la fecha de pago", color: "#64748b" };
  }

  const msPorDia = 1000 * 60 * 60 * 24;
  const inicioHoy = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const inicioFechaLimite = new Date(
    fechaLimite.getFullYear(),
    fechaLimite.getMonth(),
    fechaLimite.getDate()
  );
  const diasRestantes = Math.round((inicioFechaLimite.getTime() - inicioHoy.getTime()) / msPorDia);

  if (diasRestantes < 0) {
    return { periodo, pagada, tono: "vencida", etiqueta: "Pago vencido", color: "#dc2626" };
  }

  if (diasRestantes <= 5) {
    return {
      periodo,
      pagada,
      tono: "por-vencer",
      etiqueta: diasRestantes === 0 ? "Vence hoy" : `Vence en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
      color: "#d97706",
    };
  }

  return { periodo, pagada, tono: "al-corriente", etiqueta: `Vence el día ${fechaLimite.getDate()}`, color: "#2563eb" };
};
