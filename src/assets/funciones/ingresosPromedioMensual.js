// El mes en curso solo participa cuando su total difiere como máximo un 10% del histórico.
const TOLERANCIA_MES_ACTUAL = 0.1;

export const calcularPromedioMensual = (meses = [], year, hoy = new Date()) => {
    const anio = Number(year);
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    const anteriores = meses.filter((mes) => (
        mes.numPagos > 0
        && (anio < anioActual || (anio === anioActual && mes.mesNum < mesActual))
    ));
    const totalAnterior = anteriores.reduce((suma, mes) => suma + mes.totalMes, 0);
    const promedioAnterior = anteriores.length ? totalAnterior / anteriores.length : 0;
    const actual = anio === anioActual ? meses.find((mes) => mes.mesNum === mesActual) : null;
    const incluyeMesActual = Boolean(
        anteriores.length
        && actual?.numPagos > 0
        && Math.abs(actual.totalMes - promedioAnterior) <= Math.abs(promedioAnterior) * TOLERANCIA_MES_ACTUAL
    );
    const incluidos = incluyeMesActual ? [...anteriores, actual] : anteriores;

    return {
        promedio: incluidos.length
            ? (totalAnterior + (incluyeMesActual ? actual.totalMes : 0)) / incluidos.length
            : 0,
        mesesIncluidos: incluidos.length,
        incluyeMesActual,
        datosGrafica: incluidos.map((mes) => ({ mes: mes.mesCorto, monto: mes.totalMes })),
    };
};
