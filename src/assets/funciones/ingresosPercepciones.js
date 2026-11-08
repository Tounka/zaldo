import { CLASIFICACIONES_COBRO, empresaLiquidaCortesMensualmente } from "./ingresosCalculos";

/*
 * Percepciones recurrentes de un empleo: bonos, vales de despensa, fondo de
 * ahorro, etc. Se configuran en la empresa y, al registrar un pago, las que
 * tocan se proponen solas.
 *
 * Cada percepción se guarda como SU PROPIO registro de ingreso (ligado al pago
 * con `pagoGrupoId`). Así la matriz mensual, las tablas, el CSV, los reportes
 * y el asistente las cuentan sin reglas nuevas, y cada una puede caer en su
 * cuenta: los vales en la tarjeta de vales, el bono en la de nómina.
 */

export const TIPOS_PERCEPCION = [
    { value: "bono", label: "Bono", tipoRegistro: "Bono" },
    { value: "vales", label: "Vales de despensa", tipoRegistro: "Vales de despensa" },
    { value: "otro", label: "Otra percepción", tipoRegistro: "Ajuste / Extra" },
];

export const FRECUENCIAS_PERCEPCION = [
    { value: "cadaPago", label: "Con cada pago" },
    { value: "mensual", label: "Una vez al mes" },
    { value: "anual", label: "Una vez al año" },
];

const tipoPercepcion = (valor) => TIPOS_PERCEPCION.find((tipo) => tipo.value === valor) || TIPOS_PERCEPCION[2];

export const etiquetaFrecuencia = (percepcion) => {
    const base = FRECUENCIAS_PERCEPCION.find((f) => f.value === percepcion?.frecuencia)?.label || "Con cada pago";
    if (percepcion?.frecuencia !== "anual" || !percepcion.mes) return base;
    const mes = new Date(2000, Number(percepcion.mes) - 1, 1).toLocaleDateString("es-MX", { month: "long" });
    return `${base} (${mes})`;
};

export const nuevaPercepcion = () => ({
    id: `perc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: "",
    tipo: "bono",
    monto: 0,
    frecuencia: "cadaPago",
    mes: null,
    cuentaId: "",
    activo: true,
});

export const limpiarPercepcion = (percepcion) => ({
    id: percepcion.id || nuevaPercepcion().id,
    nombre: String(percepcion.nombre || tipoPercepcion(percepcion.tipo).label).trim().slice(0, 60),
    tipo: tipoPercepcion(percepcion.tipo).value,
    monto: Math.max(0, Math.round(Number(percepcion.monto || 0) * 100) / 100),
    frecuencia: FRECUENCIAS_PERCEPCION.some((f) => f.value === percepcion.frecuencia) ? percepcion.frecuencia : "cadaPago",
    mes: percepcion.frecuencia === "anual" && Number(percepcion.mes) >= 1 && Number(percepcion.mes) <= 12 ? Number(percepcion.mes) : null,
    cuentaId: percepcion.cuentaId || "",
    activo: percepcion.activo !== false,
});

export const percepcionesDeEmpresa = (empresa) => (Array.isArray(empresa?.percepciones) ? empresa.percepciones : [])
    .filter((percepcion) => percepcion?.id && percepcion.activo !== false);

/**
 * Percepciones que tocan en un pago con esa fecha. Las mensuales y anuales no
 * se repiten si ya hay un registro suyo en el mes (o año).
 */
export const percepcionesQueAplican = (empresa, fecha, registros = []) => {
    const [anio, mes] = String(fecha || "").split("-").map(Number);
    const yaRegistradas = (percepcion, mismoMes) => registros.some((registro) => (
        registro.empresaId === empresa?.id
        && registro.percepcionId === percepcion.id
        && String(registro.fecha || "").startsWith(mismoMes ? `${anio}-${String(mes).padStart(2, "0")}` : `${anio}-`)
    ));

    return percepcionesDeEmpresa(empresa).filter((percepcion) => {
        if (percepcion.frecuencia === "mensual") return !yaRegistradas(percepcion, true);
        if (percepcion.frecuencia === "anual") {
            if (percepcion.mes && Number(percepcion.mes) !== mes) return false;
            return !yaRegistradas(percepcion, false);
        }
        return true;
    });
};

/** Cuenta donde cae una percepción: la suya, o la del empleo. */
export const cuentaDePercepcion = (percepcion, empresa) => percepcion?.cuentaId || empresa?.cuentaPorDefectoId || "";

export const construirRegistroPercepcion = (percepcion, { empresa, fecha, numeroPeriodo = null, pagoGrupoId, monto, cuentaDestinoId, estado = "Pagado" }) => ({
    id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    empresaId: empresa.id,
    empresaNombre: empresa.nombre || "Empresa",
    fecha,
    numeroPeriodo,
    diasTrabajados: null,
    horasReportadas: null,
    precioHora: null,
    precioUnitario: 0,
    montoTeorico: Number(percepcion.monto || 0),
    montoExtra: 0,
    montoReal: Number(monto ?? percepcion.monto ?? 0),
    tipo: tipoPercepcion(percepcion.tipo).tipoRegistro,
    clasificacionCobro: CLASIFICACIONES_COBRO.PAGO,
    estado,
    notas: percepcion.nombre || tipoPercepcion(percepcion.tipo).label,
    cuentaDestinoId: cuentaDestinoId ?? cuentaDePercepcion(percepcion, empresa),
    percepcionId: percepcion.id,
    percepcionTipo: tipoPercepcion(percepcion.tipo).value,
    pagoGrupoId: pagoGrupoId || null,
});

/**
 * Lo que normalmente se cobra en un periodo según el esquema del empleo (sin
 * las percepciones). Es lo mismo que pre-llena el modal de pago.
 */
export const pagoEsperadoEmpresa = (empresa = {}) => {
    const tipo = empresa.tipoEsquema || "diario_sexto_dia";
    if (tipo === "por_horas") {
        const horas = Number(empresa.horasSemanales || 0);
        const precio = Number(empresa.precioHora || 0);
        const bono = Number(empresa.bonoInternet || 0);
        return { horas, precio, extra: bono, subtotal: horas * precio, total: horas * precio + bono, tipoPago: "Semana (Horas)", dias: 3 };
    }
    if (tipo === "quincenal") {
        const base = Number(empresa.quincenaBase || 0);
        return { horas: 0, precio: base, extra: 0, subtotal: base, total: base, tipoPago: "Quincena", dias: 15 };
    }
    if (tipo === "diario_sexto_dia") {
        const salario = Number(empresa.salarioDiario || 0);
        const dias = Number(empresa.diasTrabajadosDefault || 5);
        const sexto = empresa.incluirSextoDia !== false ? salario : 0;
        return { horas: 0, precio: salario, extra: sexto, subtotal: dias * salario, total: dias * salario + sexto, tipoPago: "Corte Semanal", dias };
    }
    return { horas: 0, precio: 0, extra: 0, subtotal: 0, total: 0, tipoPago: "Honorarios / Libre", dias: 1 };
};

/**
 * Registro del pago principal de un empleo con los valores de su esquema. Lo
 * usa el asistente; el modal arma el suyo con lo que se edita en pantalla.
 */
export const construirRegistroPagoEmpresa = (empresa, { fecha, monto = null, horas = null, notas = "", cuentaDestinoId, numeroPeriodo = null, pagoGrupoId = null, recibido = false }) => {
    const esperado = pagoEsperadoEmpresa(empresa);
    const porHoras = empresa.tipoEsquema === "por_horas";
    const horasUsadas = porHoras && horas ? Number(horas) : esperado.horas;
    const subtotal = porHoras ? horasUsadas * esperado.precio : esperado.subtotal;
    const teorico = subtotal + esperado.extra;
    // Si la persona dice que ya le pagaron, es dinero recibido aunque su empleo trabaje por cortes.
    const esCorte = !recibido && porHoras && empresaLiquidaCortesMensualmente(empresa);

    return {
        id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        empresaId: empresa.id,
        empresaNombre: empresa.nombre || "Empresa",
        fecha,
        numeroPeriodo,
        diasTrabajados: porHoras ? null : esperado.dias,
        horasReportadas: porHoras ? horasUsadas : null,
        precioUnitario: esperado.precio,
        precioHora: porHoras ? esperado.precio : null,
        montoTeorico: subtotal,
        montoExtra: esperado.extra,
        tipo: esperado.tipoPago,
        clasificacionCobro: esCorte ? CLASIFICACIONES_COBRO.CORTE : CLASIFICACIONES_COBRO.PAGO,
        estado: esCorte ? "Pendiente" : "Pagado",
        montoReal: monto !== null && monto !== undefined ? Number(monto) : teorico,
        notas,
        cuentaDestinoId: cuentaDestinoId ?? (empresa.cuentaPorDefectoId || ""),
        pagoGrupoId,
    };
};

export const siguientePeriodo = (empresa, registros = []) => registros
    .filter((registro) => registro.empresaId === empresa?.id && !registro.percepcionId).length + 1;
