import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirParaDeshacer, interpretarDeshacer, leerDeshacer, pideDeshacer } from '../src/assets/funciones/ia/deshacerCaptura.js';
import { historialParaIA, limpiarHistorial, LIMITE_TURNOS_HISTORIAL, notaDeApp } from '../src/assets/funciones/ia/memoriaConversacion.js';
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

test('lee deshacer varios o todo sin IA', () => {
  assert.deepEqual(leerDeshacer('deshaz'), { todo: false, cuantos: 1, texto: '' });
  assert.deepEqual(leerDeshacer('regrésalo'), { todo: false, cuantos: 1, texto: '' });
  assert.deepEqual(leerDeshacer('borra los dos últimos'), { todo: false, cuantos: 2, texto: '' });
  assert.deepEqual(leerDeshacer('elimina los 3 últimos gastos'), { todo: false, cuantos: 3, texto: '' });
  assert.deepEqual(leerDeshacer('Deshaz todo'), { todo: true, cuantos: null, texto: '' });
  assert.deepEqual(leerDeshacer('borra todo lo que guardaste'), { todo: true, cuantos: null, texto: '' });
  for (const texto of ['borra la cuenta de BBVA', 'gasté todo en uber', 'quita el detergente', 'borra']) {
    assert.equal(leerDeshacer(texto), null, texto);
  }
});

test('valida el deshacer que devuelve la IA', () => {
  assert.equal(interpretarDeshacer(null), null);
  assert.deepEqual(interpretarDeshacer({ todo: false, cuantos: 2, texto: '' }), { todo: false, cuantos: 2, texto: '' });
  assert.deepEqual(interpretarDeshacer({ todo: false, cuantos: null, texto: ' uber ' }), { todo: false, cuantos: null, texto: 'uber' });
  assert.deepEqual(interpretarDeshacer({ todo: true, cuantos: 4, texto: 'x' }), { todo: true, cuantos: null, texto: '' });
  assert.equal(interpretarDeshacer({ todo: false, cuantos: 999, texto: '' }).cuantos, 10);
});

const PILA = [
  { id: 'a', grupo: 'g1', reversible: true, busqueda: 'gasto de 230; nota: Uber' },
  { id: 'b', grupo: 'g2', reversible: true, busqueda: 'gasto de 90; nota: Tacos' },
  { id: 'c', grupo: 'g2', reversible: true, busqueda: 'transferencia de 500' },
  { id: 'd', grupo: 'g3', reversible: false, busqueda: 'cuenta nueva: Nómina' },
];
const ids = (entradas) => entradas.map((entrada) => entrada.id);

test('elige qué deshacer de la pila', () => {
  // Lo último no es reversible: no se brinca al anterior.
  const ultimo = elegirParaDeshacer(PILA, { cuantos: 1 });
  assert.deepEqual([ids(ultimo.entradas), ids(ultimo.bloqueadas)], [[], ['d']]);

  // Lo guardado de un jalón cuenta como uno solo.
  const dos = elegirParaDeshacer(PILA.slice(0, 3), { cuantos: 2 });
  assert.deepEqual(ids(dos.entradas), ['a', 'b', 'c']);
  assert.deepEqual(ids(elegirParaDeshacer(PILA.slice(0, 3), { cuantos: 1 }).entradas), ['b', 'c']);

  assert.deepEqual(ids(elegirParaDeshacer(PILA, { texto: 'úber' }).entradas), ['a']);
  assert.deepEqual(ids(elegirParaDeshacer(PILA, { todo: true }).entradas), ['a', 'b', 'c']);
  assert.deepEqual(ids(elegirParaDeshacer(PILA, { ids: ['c', 'zzz'] }).entradas), ['c']);
  assert.deepEqual(ids(elegirParaDeshacer([], { cuantos: 1 }).entradas), []);
});

test('la memoria que viaja a la IA se limpia y no repite la pregunta anterior', () => {
  const memoria = [
    { rol: 'usuario', texto: 'gasté 230\nen uber' },
    { rol: 'asistente', texto: notaDeApp('Guardado: gasto de 230') },
    { rol: 'otro', texto: 'x' },
    { rol: 'usuario', texto: '¿cuánto llevo?' },
    { rol: 'asistente', texto: notaDeApp('Respondí su pregunta') },
  ];
  assert.deepEqual(historialParaIA(memoria, { mensaje: '¿cuánto llevo?' }), [
    { rol: 'usuario', texto: 'gasté 230 en uber' },
    { rol: 'asistente', texto: '[Zaldo] Guardado: gasto de 230' },
  ]);
  assert.equal(historialParaIA(memoria, null).length, 4);
  assert.deepEqual(limpiarHistorial('nada'), []);
  const largo = Array.from({ length: 20 }, (_, i) => ({ rol: 'usuario', texto: `m${i} ${'x'.repeat(500)}` }));
  assert.equal(limpiarHistorial(largo).length, LIMITE_TURNOS_HISTORIAL);
  assert.ok(limpiarHistorial(largo).every((turno) => turno.texto.length <= 280));
});
