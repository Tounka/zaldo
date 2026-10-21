import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuadroEnTiempo, validarAnimacion } from '../src/assets/componentes/topo/tiempoAnimacion.mjs';

const ficha = { cuadros: 14, fps: 12, tam: 256, bucle: false };
test('12 fps y límite exacto de cada cuadro', () => {
  assert.equal(cuadroEnTiempo(0, ficha).cuadro, 0);
  assert.equal(cuadroEnTiempo(83, ficha).cuadro, 0);
  assert.equal(cuadroEnTiempo(84, ficha).cuadro, 1);
});
test('mantiene el último cuadro todo su intervalo antes de terminar', () => {
  assert.deepEqual(cuadroEnTiempo(1100, ficha), { cuadro: 13, terminado: false });
  assert.deepEqual(cuadroEnTiempo(1167, ficha), { cuadro: 13, terminado: true });
  assert.equal(cuadroEnTiempo(9000, ficha).cuadro, 13);
});
test('un bucle vuelve al primero sin alcanzar la columna siguiente de la tira', () => {
  assert.deepEqual(cuadroEnTiempo(1167, ficha, { bucle: true }), { cuadro: 0, terminado: false });
});
test('la reproducción inversa empieza al final y acaba en el primer cuadro', () => {
  assert.equal(cuadroEnTiempo(0, ficha, { reversa: true }).cuadro, 13);
  assert.deepEqual(cuadroEnTiempo(1167, ficha, { reversa: true }), { cuadro: 0, terminado: true });
});
test('el intervalo inicial puede quedar fuera del bucle, como en el saludo', () => {
  const saludo = { cuadros: 8, fps: 12, tam: 256, bucle: true, inicioBucle: 2 };
  assert.equal(cuadroEnTiempo(667, saludo).cuadro, 2);
  assert.equal(cuadroEnTiempo(1167, saludo).cuadro, 2);
});
test('el tiempo negativo se limita al principio', () => {
  assert.equal(cuadroEnTiempo(-100, ficha).cuadro, 0);
});
test('rechaza catálogos incompletos o velocidades inválidas', () => {
  assert.equal(validarAnimacion(ficha), true);
  for (const valor of [null, {}, { ...ficha, cuadros: 0 }, { ...ficha, fps: -1 }, { ...ficha, fps: 120 }, { ...ficha, tam: 0 }]) {
    assert.equal(validarAnimacion(valor), false);
  }
});
