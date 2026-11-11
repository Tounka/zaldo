import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pideDeshacer } from '../src/assets/funciones/ia/deshacerCaptura.js';
import { seguimientosDeConsulta } from '../src/assets/funciones/ia/seguimientosConsulta.js';
import { TEMAS_CONSULTA } from '../src/assets/funciones/ia/contratoConsulta.js';

test('reconoce pedir deshacer el último registro', () => {
  for (const texto of ['Deshaz', 'bórralo', 'borra el último', 'Me equivoqué, bórralo', 'elimina el último gasto', 'quita eso por favor', 'borra el último ingreso que registré']) {
    assert.ok(pideDeshacer(texto), texto);
  }
});

test('no confunde otras peticiones con deshacer', () => {
  for (const texto of ['borra la cuenta de BBVA', 'quita el detergente', 'gasté 200 en uber', 'borra', '', 'deshaz '.repeat(20)]) {
    assert.ok(!pideDeshacer(texto), texto);
  }
});

const BASE = { desde: null, hasta: null, categoria: '', cuenta: null, texto: '', marca: '', orden: 'mayor', reporte: '', pregunta: '' };

test('después de los gastos del mes ofrece el mes pasado y desgloses', () => {
  const seguimientos = seguimientosDeConsulta({ ...BASE, tema: TEMAS_CONSULTA.GASTOS_TOTAL }, '2026-11-11');
  assert.deepEqual(seguimientos.map((s) => s.etiqueta), ['¿Y el mes pasado?', 'Por categoría', 'Comparar con el mes pasado']);
  const mesPasado = seguimientos[0].consulta;
  assert.equal(mesPasado.tema, TEMAS_CONSULTA.GASTOS_TOTAL);
  assert.equal(mesPasado.desde, '2026-10-01');
  assert.equal(mesPasado.hasta, '2026-10-31');
});

test('sin el mes en curso ni categoría vacía no repite lo ya filtrado', () => {
  const consulta = { ...BASE, tema: TEMAS_CONSULTA.GASTOS_TOTAL, categoria: 'comida', desde: '2026-09-01', hasta: '2026-09-30' };
  assert.deepEqual(seguimientosDeConsulta(consulta, '2026-11-11'), []);
});

test('temas sin seguimientos o consulta vacía no ofrecen botones', () => {
  assert.deepEqual(seguimientosDeConsulta(null, '2026-11-11'), []);
  assert.deepEqual(seguimientosDeConsulta({ ...BASE, tema: 'otro' }, '2026-11-11'), []);
});
