import assert from 'node:assert/strict';
import test from 'node:test';
import {
    cargarSobrante,
    desglosePorCuenta,
    recalcularDesgloseDelDia,
    rendimientoTipicoPorCuenta,
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

const resumir = (partes) => partes.map((p) => [p.cuentaId || '', p.categoria, p.monto]);

test('un gasto con tarjeta no le quita su rendimiento a las demás cuentas', () => {
    const partes = desglosePorCuenta({
        saldosInicio: { tarjeta: -1000, nu: 25000, mifel: 56000 },
        saldosFin: { tarjeta: -2757, nu: 25009, mifel: 56014 },
        neto: -1734,
    });
    assert.deepEqual(resumir(partes), [
        ['tarjeta', 'retiro', -1757],
        ['nu', 'rendimientos', 9],
        ['mifel', 'rendimientos', 14],
    ]);
});

test('un traspaso parecido se cancela aunque haya otras cuentas', () => {
    const partes = desglosePorCuenta({
        saldosInicio: { a: 5000, b: 1000, c: 300 },
        saldosFin: { a: 4000, b: 2003, c: 300.5 },
        neto: 3.5,
    });
    assert.deepEqual(resumir(partes), [['b', 'rendimientos', 3], ['c', 'rendimientos', 0.5]]);
});

const historialMifel = () => [1, 2, 3, 4].map((dia) => ({
    fechaKey: fechaKey(dia),
    incrementos: [{ categoria: 'rendimientos', monto: 14, cuentaId: 'mifel' }],
}));

test('meter dinero a una cuenta se separa como aumento a capital', () => {
    const tipicos = rendimientoTipicoPorCuenta(historialMifel(), fechaKey(5));
    assert.deepEqual(tipicos, { mifel: 14 });
    const partes = desglosePorCuenta({
        saldosInicio: { mifel: 56000, nu: 25000 },
        saldosFin: { mifel: 56434, nu: 25009 },
        neto: 443,
        tipicos,
    });
    assert.deepEqual(resumir(partes), [
        ['mifel', 'aumentoCapital', 420],
        ['mifel', 'rendimientos', 14],
        ['nu', 'rendimientos', 9],
    ]);
});

test('un aporte después de capturar el rendimiento del día entra aparte', () => {
    const partes = desglosePorCuenta({
        existentes: [{ categoria: 'rendimientos', monto: 14, cuentaId: 'mifel' }, { categoria: 'rendimientos', monto: 0, nota: '' }],
        saldosInicio: { mifel: 56000 },
        saldosFin: { mifel: 56434 },
        neto: 434,
        tipicos: { mifel: 14 },
    });
    assert.deepEqual(resumir(partes), [['mifel', 'aumentoCapital', 420], ['mifel', 'rendimientos', 14]]);
});

test('recalcular un día ignora el desglose guardado', () => {
    const historial = [
        ...historialMifel().map((dia, i) => ({ ...dia, capitalTotal: 56000 + i, saldos: { mifel: 56000 + i } })),
        { fechaKey: fechaKey(5), capitalTotal: 56437, saldos: { mifel: 56437 }, incrementos: [{ categoria: 'rendimientos', monto: 434, cuentaId: 'mifel' }] },
    ];
    assert.deepEqual(resumir(recalcularDesgloseDelDia({ historial, fechaKey: fechaKey(5) })), [
        ['mifel', 'aumentoCapital', 420],
        ['mifel', 'rendimientos', 14],
    ]);
});

test('un traspaso repartido en dos cuentas sigue sin ser ganancia', () => {
    const partes = desglosePorCuenta({
        saldosInicio: { a: 5000, b: 0, c: 100 },
        saldosFin: { a: 4000, b: 600, c: 502 },
        neto: 2,
    });
    assert.equal(partes.reduce((s, p) => s + p.monto, 0), 2);
    assert.ok(partes.every((p) => p.monto > 0 && p.monto <= 2), JSON.stringify(partes));
});

test('traspaso de una cuenta borrada más un aporte, sin historial (28 oct)', () => {
    const partes = desglosePorCuenta({
        saldosInicio: { mifel: 53840, nu: 25024, didi: 10020, borrada: 2000, uala: 30062, mp: 14831 },
        saldosFin: { mifel: 56274, nu: 25034, didi: 10025, borrada: 0, uala: 30074, mp: 14837 },
        neto: 467,
    });
    const mifel = partes.filter((p) => p.cuentaId === 'mifel');
    assert.deepEqual(mifel.map((p) => p.categoria), ['aumentoCapital', 'rendimientos']);
    assert.ok(mifel[0].monto > 400 && mifel[1].monto < 30, JSON.stringify(mifel));
    assert.ok(!partes.some((p) => p.cuentaId === 'borrada'), 'el traspaso no aparece');
    assert.deepEqual(partes.filter((p) => p.cuentaId !== 'mifel').map((p) => p.monto), [10, 5, 12, 6]);
    assert.equal(Math.round(partes.reduce((s, p) => s + p.monto, 0) * 100) / 100, 467);
});
