import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularPromedioMensual } from './ingresosPromedioMensual.js';

const hoy = new Date(2026, 9, 21);
const mes = (mesNum, totalMes, numPagos = 1) => ({
    mesNum, mesCorto: `Mes ${mesNum}`, totalMes, numPagos,
});

test('promedia totales mensuales sin ponderarlos por la cantidad de pagos', () => {
    const resultado = calcularPromedioMensual([mes(8, 10000, 2), mes(9, 20000, 5), mes(10, 4000)], 2026, hoy);
    assert.equal(resultado.promedio, 15000);
    assert.equal(resultado.mesesIncluidos, 2);
    assert.equal(resultado.incluyeMesActual, false);
    assert.deepEqual(resultado.datosGrafica.map((dato) => dato.monto), [10000, 20000]);
});

test('incluye el mes actual dentro de los límites del 10%, pero no fuera', () => {
    for (const monto of [9000, 10000, 11000]) {
        const resultado = calcularPromedioMensual([mes(9, 10000), mes(10, monto)], 2026, hoy);
        assert.equal(resultado.incluyeMesActual, true);
        assert.equal(resultado.promedio, (10000 + monto) / 2);
        assert.equal(resultado.mesesIncluidos, 2);
    }
    for (const monto of [8999, 11001]) {
        assert.equal(calcularPromedioMensual([mes(9, 10000), mes(10, monto)], 2026, hoy).incluyeMesActual, false);
    }
});

test('excluye meses sin pagos y meses futuros aunque tengan datos', () => {
    const resultado = calcularPromedioMensual([mes(8, 0, 0), mes(9, 10000), mes(11, 50000)], '2026', hoy);
    assert.equal(resultado.promedio, 10000);
    assert.equal(resultado.mesesIncluidos, 1);
});

test('sin historial no usa el mes en curso como referencia', () => {
    for (const meses of [[], [mes(10, 10000)], [mes(11, 10000)]]) {
        const resultado = calcularPromedioMensual(meses, 2026, hoy);
        assert.equal(resultado.promedio, 0);
        assert.equal(resultado.mesesIncluidos, 0);
        assert.deepEqual(resultado.datosGrafica, []);
    }
});

test('en años pasados incluye todos los meses con pagos; en futuros no incluye ninguno', () => {
    const meses = [mes(1, 10000), mes(12, 20000)];
    assert.equal(calcularPromedioMensual(meses, 2025, hoy).promedio, 15000);
    assert.equal(calcularPromedioMensual(meses, 2027, hoy).mesesIncluidos, 0);
    assert.equal(calcularPromedioMensual([mes(1, 10000)], 2026, new Date(2026, 0, 21)).mesesIncluidos, 0);
});
