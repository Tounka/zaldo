import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarRespuestaAbierta } from '../src/assets/funciones/ia/respuestaAbierta.js';
import { limpiarPreguntas, MAXIMO_PREGUNTAS_IA } from '../src/assets/funciones/ia/metodoAnalisis.js';
import { validarTextosReporte } from '../src/assets/funciones/ia/reportes/redaccion.js';

const panorama = { gastos: { promedioTotal: 15900, promedioPersonal: 11500 }, ingresos: { promedio: 18100 } };

test('la respuesta amplia conserva el texto pero quita hallazgos con cifras inventadas', () => {
  const resultado = validarRespuestaAbierta({
    respuesta: 'Sí te alcanza: ganas $18,100 y gastas $15,900, te quedan aprox. $2,200 al mes.',
    hallazgos: ['Tu gasto personal es $11,500 al mes.', 'Gastas $99,999 en café.'],
    faltantes: ['Registra tus gastos de efectivo en Movimientos.'],
    confianza: 'rara',
  }, { panorama });

  assert.deepEqual(resultado.hallazgos, ['Tu gasto personal es $11,500 al mes.']);
  assert.equal(resultado.cifrasCalculadas, true, '2,200 es una resta de la IA: se avisa');
  assert.equal(resultado.confianza, 'media');
  assert.equal(resultado.faltantes.length, 1);
});

test('las preguntas guardadas se limpian, sin duplicados y con tope', () => {
  const muchas = Array.from({ length: 10 }, (_, i) => `¿Pregunta ${i}?`);
  assert.equal(limpiarPreguntas(muchas).length, MAXIMO_PREGUNTAS_IA);
  assert.deepEqual(limpiarPreguntas(['  ¿Voy bien?\n', '¿voy bien?', '', null]), ['¿Voy bien?']);
});

test('el reporte solo conserva respuestas que se pudieron contestar con sus cifras', () => {
  const textos = validarTextosReporte({
    titulos: {},
    puntos: [],
    recomendaciones: [],
    respuestas: [
      { pregunta: 'otra cosa', sePuede: true, respuesta: 'Sí: tu promedio es $15,900 al mes.' },
      { pregunta: '', sePuede: false, respuesta: '' },
      { pregunta: '', sePuede: true, respuesta: 'Gastas $123,456 en ropa.' },
    ],
  }, {
    reporte: 'gasto_personal',
    metricas: panorama,
    preguntas: ['¿Cuánto gasto al mes?', '¿Me alcanza para un viaje?', '¿Cuánto en ropa?'],
  });

  assert.deepEqual(textos.respuestas, [
    { pregunta: '¿Cuánto gasto al mes?', respuesta: 'Sí: tu promedio es $15,900 al mes.' },
  ]);
});
