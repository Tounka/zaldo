/**
 * Utilidades para el cálculo de fechas de pago, órdenes de cobro, atrasos y rendimientos de préstamos.
 */

export const formatDateToYYYYMMDD = (d) => {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(d.seconds ? d.seconds * 1000 : d);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const formatFechaLegible = (timestampOrDate) => {
    if (!timestampOrDate) return "—";
    const d = timestampOrDate.seconds
        ? new Date(timestampOrDate.seconds * 1000)
        : timestampOrDate instanceof Date
            ? timestampOrDate
            : new Date(timestampOrDate);
    if (isNaN(d.getTime())) return String(timestampOrDate);

    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const formatFechaHora = (timestampOrDate) => {
    if (!timestampOrDate) return "—";
    const d = timestampOrDate.seconds
        ? new Date(timestampOrDate.seconds * 1000)
        : timestampOrDate instanceof Date
            ? timestampOrDate
            : new Date(timestampOrDate);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const parseYYYYMMDD = (str) => {
    if (!str) return new Date();
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
};

export const fnFormatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

/**
 * Calcula los días de atraso comparando la fecha de orden programada con la fecha real del pago o la fecha actual.
 */
export const calcularDiasAtraso = (fechaOrdenYYYYMMDD, fechaPagoOActual = new Date()) => {
    if (!fechaOrdenYYYYMMDD) return 0;
    const fechaProgramada = parseYYYYMMDD(fechaOrdenYYYYMMDD);
    const fechaComparar = fechaPagoOActual.seconds
        ? new Date(fechaPagoOActual.seconds * 1000)
        : fechaPagoOActual instanceof Date
            ? fechaPagoOActual
            : new Date(fechaPagoOActual);

    // Normalizar a medianoche para contar días completos
    const d1 = new Date(fechaProgramada.getFullYear(), fechaProgramada.getMonth(), fechaProgramada.getDate()).getTime();
    const d2 = new Date(fechaComparar.getFullYear(), fechaComparar.getMonth(), fechaComparar.getDate()).getTime();

    const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

/**
 * Calcula el monto total pagado en un préstamo
 */
export const calcularTotalPagado = (pagos = []) => {
    return pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
};

/**
 * Calcula el monto total cobrado pero aún no transferido al admin
 */
export const calcularMontoSinTransferir = (pagos = []) => {
    return pagos
        .filter((p) => p.transferidoAlAdmin === false)
        .reduce((acc, p) => acc + Number(p.monto || 0), 0);
};

/**
 * Calcula el número de pago siguiente para un préstamo
 */
export const obtenerNumeroSiguientePago = (pagos = []) => {
    if (!Array.isArray(pagos) || pagos.length === 0) return 1;
    const numeros = pagos.map((p, index) => Number(p.numeroPago || index + 1));
    return Math.max(...numeros, pagos.length) + 1;
};

/**
 * Calcula el monto teórico de una cuota si no fue ingresado manualmente
 */
export const calcularAbonoTeoricoSugerido = (prestamo) => {
    if (prestamo.abonoTeorico && Number(prestamo.abonoTeorico) > 0) {
        return Number(prestamo.abonoTeorico);
    }
    const monto = Number(prestamo.montoPrestado || 0);
    const interes = Number(prestamo.interesEstimado || 0);
    const dias = Number(prestamo.diasDePago || 15);
    const numPagos = Number(prestamo.numPagos || 0);

    if (numPagos > 0) {
        const totalConInteres = monto + (monto * (interes / 100));
        return Number((totalConInteres / numPagos).toFixed(2));
    }

    if (monto > 0 && dias > 0) {
        const interesPeriodo = monto * (interes / 100 / 365) * dias;
        const capitalPeriodo = monto / Math.max(1, Math.ceil(365 / dias));
        return Number((interesPeriodo + capitalPeriodo).toFixed(2));
    }

    return 0;
};

/**
 * Determina si para un préstamo dado hoy/la fecha seleccionada corresponde a una fecha de pago.
 */
export const esFechaDePago = (prestamo, fechaYYYYMMDD) => {
    if (prestamo.activo === false) return false;
    const targetDate = parseYYYYMMDD(fechaYYYYMMDD);
    const diaDelMes = targetDate.getDate();

    // 1. Días del mes (ej. 15 y 30)
    if (prestamo.tipoPeriodicidad === "dias_mes" && Array.isArray(prestamo.diasMes)) {
        const ultimoDiaMes = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
        return prestamo.diasMes.some((d) => {
            const diaNum = Number(d);
            if (diaNum === diaDelMes) return true;
            if (diaNum >= 30 && diaDelMes === ultimoDiaMes) return true;
            return false;
        });
    }

    // 2. Fechas específicas configuradas
    if (prestamo.tipoPeriodicidad === "fechas_especificas" && Array.isArray(prestamo.fechasEspecificas)) {
        return prestamo.fechasEspecificas.includes(fechaYYYYMMDD);
    }

    // 3. Frecuencia cada N días
    if (prestamo.tipoPeriodicidad === "frecuencia_dias" || (!prestamo.tipoPeriodicidad && prestamo.diasDePago)) {
        const intervalo = Number(prestamo.diasDePago || 15);
        if (intervalo <= 0) return false;

        if (intervalo === 15) {
            return diaDelMes === 15 || diaDelMes === new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
        }
        if (intervalo === 30 || intervalo === 31) {
            return diaDelMes === new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate() || diaDelMes === 30;
        }

        const fechaInicio = prestamo.fechaInicio?.seconds
            ? new Date(prestamo.fechaInicio.seconds * 1000)
            : prestamo.fechaCreacion?.seconds
                ? new Date(prestamo.fechaCreacion.seconds * 1000)
                : new Date();

        const diffTime = targetDate.getTime() - new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate()).getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays % intervalo === 0) {
            return true;
        }
    }

    return false;
};

/**
 * Genera la lista de órdenes de cobro para una fecha determinada a partir de la lista de préstamos.
 */
export const generarOrdenesDeCobro = (prestamos = [], fechaYYYYMMDD) => {
    const ordenes = [];
    const hoyStr = formatDateToYYYYMMDD(new Date());

    prestamos.forEach((prestamo) => {
        if (prestamo.activo === false) return;

        const totalPagado = calcularTotalPagado(prestamo.pagos);
        const deudaPendiente = Math.max(0, Number(prestamo.montoPrestado || 0) - totalPagado);
        const abonoSugerido = calcularAbonoTeoricoSugerido(prestamo);
        const correspondeHoy = esFechaDePago(prestamo, fechaYYYYMMDD);

        // Buscar si ya hay un pago registrado para esta fecha específica
        const pagoRegistradoHoy = (prestamo.pagos || []).find((p) => {
            const pFechaStr = p.ordenFecha || formatDateToYYYYMMDD(p.fecha);
            return pFechaStr === fechaYYYYMMDD;
        });

        // Ver si tiene pagos pendientes de transferir
        const pagosSinTransferir = (prestamo.pagos || []).filter((p) => p.transferidoAlAdmin === false);

        if (correspondeHoy || pagoRegistradoHoy) {
            const yaPago = !!pagoRegistradoHoy;
            const transferido = pagoRegistradoHoy ? pagoRegistradoHoy.transferidoAlAdmin !== false : false;

            let estadoOrden = "pendiente";
            if (yaPago && !transferido) {
                estadoOrden = "cobrado_sin_transferir";
            } else if (yaPago && transferido) {
                estadoOrden = "transferido";
            }

            // Días de atraso si la orden venció y no ha pagado
            let diasAtraso = 0;
            if (pagoRegistradoHoy) {
                diasAtraso = pagoRegistradoHoy.diasAtraso || 0;
            } else if (fechaYYYYMMDD < hoyStr) {
                diasAtraso = calcularDiasAtraso(fechaYYYYMMDD, new Date());
            }

            // Número de pago actual
            const numeroPago = pagoRegistradoHoy
                ? (pagoRegistradoHoy.numeroPago || (prestamo.pagos || []).indexOf(pagoRegistradoHoy) + 1)
                : obtenerNumeroSiguientePago(prestamo.pagos);

            ordenes.push({
                prestamoId: prestamo.id,
                prestamo,
                nombreDeudor: prestamo.nombre,
                montoPrestado: Number(prestamo.montoPrestado || 0),
                totalPagado,
                deudaPendiente,
                montoSugerido: abonoSugerido,
                montoCobrado: pagoRegistradoHoy ? Number(pagoRegistradoHoy.monto || 0) : abonoSugerido,
                pagoId: pagoRegistradoHoy?.id || null,
                pagoRegistrado: pagoRegistradoHoy || null,
                pagosSinTransferir,
                fechaOrden: fechaYYYYMMDD,
                numeroPago,
                totalPagosEstimados: prestamo.numPagos || null,
                diasAtraso,
                atrasado: diasAtraso > 0,
                yaPago,
                transferidoAlAdmin: transferido,
                estadoOrden,
            });
        }
    });

    return ordenes;
};
