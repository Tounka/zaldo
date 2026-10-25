import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responderCharla } from '../src/assets/funciones/ia/charlaGeneral.js';

const primera = { azar: () => 0 };

test('los saludos solos se contestan del catálogo', () => {
  ['hola', 'Hola!!', 'holaaa 👋', 'buenas', 'hey zaldo', '¿Qué tal?', 'que onda'].forEach((mensaje) => {
    assert.ok(responderCharla(mensaje, primera), mensaje);
  });
});

test('el saludo con hora se devuelve igual', () => {
  assert.match(responderCharla('Buenos días', primera), /^¡Buenos días!/);
  assert.match(responderCharla('hola, buenas noches', primera), /^¡Buenas noches!/);
  assert.match(responderCharla('buenas tardes, ¿cómo estás?', primera), /^¡Buenas tardes! ¡Muy bien/);
});

test('gracias, despedidas y ayuda tienen su propia respuesta', () => {
  assert.match(responderCharla('muchas gracias', primera), /Con gusto/);
  assert.match(responderCharla('gracias, hasta luego', primera), /Con gusto/);
  assert.match(responderCharla('adiós', primera), /Hasta luego/);
  assert.match(responderCharla('hola, ¿qué puedes hacer?', primera), /^¡Hola! Puedo registrar/);
  assert.match(responderCharla('¿quién eres?', primera), /asistente de Zaldo/);
});

test('si el mensaje trae algo más, sigue a la IA', () => {
  [
    'hola, gasté 200 en uber',
    'buenos días, ¿cuánto llevo gastado?',
    'que hay en mi despensa',
    'gracias, ahora registra 50 de café',
    'bien',
    '',
    `hola ${'muy '.repeat(20)}`,
  ].forEach((mensaje) => assert.equal(responderCharla(mensaje, primera), null, mensaje));
});
