const convertirABooleano = (valor, valorPredeterminado = false) => {
    if (typeof valor === "boolean") return valor;
    if (typeof valor === "string") return valor === "true" || valor === "si";
    return valorPredeterminado;
};

export const obtenerEsLiquida = (cuenta = {}) => {
    if (cuenta.esLiquida !== undefined) return convertirABooleano(cuenta.esLiquida);
    if (cuenta.liquido !== undefined) return convertirABooleano(cuenta.liquido);

    if (cuenta.tipoDeCuenta === "debito") return cuenta.tipoDeDebito === "liquido";
    if (cuenta.tipoDeCuenta === "efectivo") return cuenta.tipoDeEfectivo === "liquido";

    return false;
};

export const obtenerSaldoTotalCuenta = (cuenta = {}) => (
    Number(cuenta.saldoALaFecha || 0) + Number(cuenta.saldoALaFechaMSI || 0)
);

export const obtenerValorSelectorLiquidez = (cuenta = {}) => (
    obtenerEsLiquida(cuenta) ? "true" : "false"
);

export const convertirValorLiquidez = (valor, valorPredeterminado = false) => (
    convertirABooleano(valor, valorPredeterminado)
);
