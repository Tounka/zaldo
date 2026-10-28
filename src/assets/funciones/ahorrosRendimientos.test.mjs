import assert from 'node:assert/strict';
import test from 'node:test';
import {
    cargarSobrante,
    desglosePorCuenta,
    rendimientoTotalAnio,
    resumenRendimientoPorCuenta,
    serieRendimientoDiario,
    tasaRendimientoAnio,
} from './ahorrosRendimientos.js';

const fechaKey = (dia) => {
    const fecha = new Date(2026, 0, 1 + dia);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

// 10,000 inicial, +10 diarios en la cuenta A durante 100 días y, el día 101, un retiro de 6,000.
const historialConRetiro = () => {
    const historial = [];
    let saldo = 10000;
    for (let dia = 1; dia <= 100; dia++) {
        saldo += 10;
        historial.push({
            fechaKey: fechaKey(dia),
            capitalTotal: saldo,
            saldos: { A: saldo },
            incrementos: [{ categoria: 'rendimientos', monto: 10, cuentaId: 'A' }],
        });
    }
    const partes = desglosePorCuenta({ saldosInicio: { A: saldo }, saldosFin: { A: saldo - 6000 }, neto: -6000 });
    saldo -= 6000;
    historial.push({ fechaKey: fechaKey(101), capitalTotal: saldo, saldos: { A: saldo }, incrementos: partes });
    return historial;
};

test('un retiro nace como retiro y no resta rendimiento', () => {
    const historial = historialConRetiro();
    assert.equal(historial.at(-1).incrementos[0].categoria, 'retiro');
    assert.equal(rendimientoTotalAnio(historial, 10000), 1000);
});

test('el porcentaje diario es el rendimiento sobre el capital del día anterior', () => {
    const serie = serieRendimientoDiario(historialConRetiro(), 10000);
    assert.equal(serie[0].base, 10000);
    assert.equal(serie[0].porcentaje, 0.1);
    assert.equal(serie[1].base, 10010);
    assert.equal(serie.at(-1).porcentaje, 0);
});

test('la tasa anual no se distorsiona con el retiro', () => {
    const { acumulado, anual } = tasaRendimientoAnio(historialConRetiro(), 10000, 101);
    // +10 diarios sobre 10,000 se encadenan a 11,000/10,000: +10% en 101 días.
    assert.equal(acumulado, 10);
    assert.equal(anual, 36.1);
});

test('por cuenta separa retiros y compone sobre el saldo previo', () => {
    const resumen = resumenRendimientoPorCuenta(historialConRetiro()).A;
    assert.equal(resumen.rendimiento, 1000);
    assert.equal(resumen.retiros, -6000);
    assert.ok(resumen.tasaAnual > 30, `tasa ${resumen.tasaAnual}`);
});

test('un aporte marcado como aumento a capital no cuenta como rendimiento', () => {
    const historial = [
        { fechaKey: fechaKey(1), capitalTotal: 10010, incrementos: [{ categoria: 'rendimientos', monto: 10 }] },
        { fechaKey: fechaKey(2), capitalTotal: 15020, incrementos: [{ categoria: 'aumentoCapital', monto: 5000 }, { categoria: 'rendimientos', monto: 10 }] },
    ];
    assert.equal(rendimientoTotalAnio(historial, 10000), 20);
    assert.equal(serieRendimientoDiario(historial, 10000)[1].base, 10010);
});

test('un movimiento entre cuentas no genera rendimiento', () => {
    assert.deepEqual(desglosePorCuenta({ saldosInicio: { A: 2000, B: 0 }, saldosFin: { A: 1000, B: 1000 }, neto: 0 }), []);
});

test('retiro y rendimiento el mismo día se separan', () => {
    const historial = [{
        fechaKey: fechaKey(1),
        capitalTotal: 4010,
        incrementos: [{ categoria: 'retiro', monto: -6000 }, { categoria: 'rendimientos', monto: 10 }],
    }];
    assert.equal(rendimientoTotalAnio(historial, 10000), 10);
});

test('un día viejo sin desglose con baja no cuenta como rendimiento negativo', () => {
    const historial = [
        { fechaKey: fechaKey(1), capitalTotal: 10010 },
        { fechaKey: fechaKey(2), capitalTotal: 9000 },
    ];
    assert.equal(rendimientoTotalAnio(historial, 10000), 10);
});

test('cargar un sobrante negativo a un rendimiento no lo vuelve negativo', () => {
    assert.deepEqual(
        cargarSobrante([{ categoria: 'rendimientos', monto: 5, nota: '' }], -6005).map((p) => [p.categoria, p.monto]),
        [['retiro', -6000]],
    );
    assert.deepEqual(
        cargarSobrante([{ categoria: 'rendimientos', monto: 2000, nota: '' }], -1500).map((p) => [p.categoria, p.monto]),
        [['rendimientos', 500]],
    );
});
