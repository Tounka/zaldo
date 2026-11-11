import { esGasto, esPersonal } from "./ia/reglasConsulta";

export const MESES_PARA_PROMEDIO = 12;

/** Claves AAAAMM de los últimos 12 meses completos, del más antiguo al más reciente. */
export const clavesUltimosMeses = (hoy = new Date(), cantidad = MESES_PARA_PROMEDIO) => (
    Array.from({ length: cantidad }, (_, indice) => {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - indice), 1);
        return `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    })
);

const diasDelMes = (clave) => new Date(Number(clave.slice(0, 4)), Number(clave.slice(4, 6)), 0).getDate();

/**
 * Gasto personal por mes y promedio del periodo. Un mes sin movimientos no
 * cuenta (no se sabe si fue un mes sin gastos o sin captura).
 * `movimientosPorMes` es { AAAAMM: [movimientos] }.
 */
export const calcularGastoPersonalPromedio = (movimientosPorMes = {}, claves = []) => {
    const meses = claves.map((clave) => {
        const lista = Array.isArray(movimientosPorMes[clave]) ? movimientosPorMes[clave] : [];
        let habitual = 0;
        let extraordinario = 0;

        lista.forEach((movimiento) => {
            if (!esGasto(movimiento) || !esPersonal(movimiento)) return;
            const monto = Math.abs(Number(movimiento.monto || 0));
            if (movimiento.esExtraordinario) extraordinario += monto;
            else habitual += monto;
        });

        return {
            clave,
            habitual,
            extraordinario,
            total: habitual + extraordinario,
            dias: diasDelMes(clave),
            conDatos: lista.length > 0,
        };
    });

    const conDatos = meses.filter((mes) => mes.conDatos);
    const suma = (campo) => conDatos.reduce((acumulado, mes) => acumulado + mes[campo], 0);
    const dias = suma("dias");
    const promedio = (campo) => (conDatos.length ? suma(campo) / conDatos.length : 0);

    return {
        meses,
        mesesConDatos: conDatos.length,
        mensualBase: promedio("habitual"),
        mensualTotal: promedio("total"),
        mensualExtraordinario: promedio("extraordinario"),
        diarioBase: dias ? suma("habitual") / dias : 0,
        diarioTotal: dias ? suma("total") / dias : 0,
    };
};
