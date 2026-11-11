import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avanceDeCategoria, sugerirPorHabito } from '../src/assets/funciones/ia/habitosCaptura.js';

const gasto = (nota, categoria, cuentaAsociada, monto = -100, fechaISO = '2026-11-05') => ({ nota, categoria, cuentaAsociada, monto, fechaISO });

test('usa la categoría y la cuenta habituales del mismo concepto', () => {
  const movimientos = [
    gasto('Uber', 'transporte', 'bbva'),
    gasto('uber', 'transporte', 'bbva'),
    gasto('UBER ', 'transporte', 'bbva'),
    gasto('Tacos', 'comida', 'efectivo'),
  ];
  assert.deepEqual(sugerirPorHabito({ nota: 'Uber', tipo: 'gasto', movimientos }), { categoria: 'transporte', cuentaId: 'bbva' });
});

test('sin mayoría clara o con pocos registros no sugiere', () => {
  const mezclados = [gasto('Oxxo', 'comida', 'a'), gasto('Oxxo', 'servicios', 'b'), gasto('Oxxo', 'personal', 'c')];
  assert.deepEqual(sugerirPorHabito({ nota: 'Oxxo', tipo: 'gasto', movimientos: mezclados }), { categoria: null, cuentaId: null });

  const uno = [gasto('Cine', 'entretenimiento', 'a')];
  assert.deepEqual(sugerirPorHabito({ nota: 'Cine', tipo: 'gasto', movimientos: uno }), { categoria: null, cuentaId: null });
  assert.deepEqual(sugerirPorHabito({ nota: '', tipo: 'gasto', movimientos: uno }), { categoria: null, cuentaId: null });
});

test('la cuenta pide más repeticiones que la categoría', () => {
  const movimientos = [gasto('Gasolina', 'transporte', 'bbva'), gasto('Gasolina', 'transporte', 'bbva')];
  assert.deepEqual(sugerirPorHabito({ nota: 'gasolina', tipo: 'gasto', movimientos }), { categoria: 'transporte', cuentaId: null });
});

test('con suficientes iguales no mezcla conceptos parecidos', () => {
  const movimientos = [
    gasto('Uber', 'transporte', 'a'),
    gasto('Uber', 'transporte', 'a'),
    gasto('Uber Eats', 'comida', 'a'),
    gasto('Uber Eats', 'comida', 'a'),
    gasto('Uber Eats', 'comida', 'a'),
  ];
  assert.equal(sugerirPorHabito({ nota: 'uber', tipo: 'gasto', movimientos }).categoria, 'transporte');
  assert.equal(sugerirPorHabito({ nota: 'Uber Eats', tipo: 'gasto', movimientos }).categoria, 'comida');
});

test('un concepto más largo encuentra el corto, y no cuenta transferencias ni ingresos', () => {
  const movimientos = [
    gasto('Netflix', 'entretenimiento', 'a'),
    gasto('Netflix', 'entretenimiento', 'a'),
    gasto('Netflix', 'transferencia', 'a'),
    { ...gasto('Netflix', 'ingreso', 'a'), monto: 100 },
  ];
  assert.equal(sugerirPorHabito({ nota: 'Netflix mensual', tipo: 'gasto', movimientos }).categoria, 'entretenimiento');
});

test('avance de la categoría: este mes contra el mismo tramo del mes pasado', () => {
  const movimientos = [
    gasto('a', 'comida', 'x', -200, '2026-11-02'),
    gasto('b', 'comida', 'x', -150, '2026-11-10'),
    gasto('c', 'transporte', 'x', -90, '2026-11-03'),
    gasto('d', 'comida', 'x', -300, '2026-10-05'),
    gasto('e', 'comida', 'x', -999, '2026-10-25'),
  ];
  assert.deepEqual(
    avanceDeCategoria({ categoria: 'comida', fechaISO: '2026-11-10', hoyISO: '2026-11-11', movimientos }),
    { total: 350, mesPasado: 300 },
  );
  assert.equal(avanceDeCategoria({ categoria: 'comida', fechaISO: '2026-10-30', hoyISO: '2026-11-11', movimientos }), null);
  assert.equal(avanceDeCategoria({ categoria: '', fechaISO: '2026-11-10', hoyISO: '2026-11-11', movimientos }), null);
});

test('avance en enero compara contra diciembre del año anterior', () => {
  const movimientos = [gasto('a', 'comida', 'x', -50, '2027-01-03'), gasto('b', 'comida', 'x', -70, '2026-12-02')];
  assert.deepEqual(
    avanceDeCategoria({ categoria: 'comida', fechaISO: '2027-01-03', hoyISO: '2027-01-04', movimientos }),
    { total: 50, mesPasado: 70 },
  );
});
