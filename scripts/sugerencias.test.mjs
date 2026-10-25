import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  construirEmpresa,
  elegirSugerencia,
  leerHoras,
  leerMonto,
  siguienteDatoTrabajo,
  SUGERENCIAS,
  sumarDiasISO,
} from '../src/assets/funciones/ia/sugerencias/elegirSugerencia.js';

const hoy = '2026-10-25';
const cuenta = { id: 'c1', nombre: 'BBVA' };
const otra = { id: 'c2', nombre: 'Efectivo' };
const empresa = { id: 'e1', nombre: 'Acme' };

test('sin cuentas, lo primero es crear una', () => {
  assert.equal(elegirSugerencia({ hoy }).clave, SUGERENCIAS.CUENTAS);
});

test('con cuentas y sin trabajo, se sugiere el trabajo antes que otra cuenta', () => {
  assert.equal(elegirSugerencia({ hoy, cuentas: [cuenta], ultimoMovimiento: hoy }).clave, SUGERENCIAS.TRABAJO);
  assert.equal(
    elegirSugerencia({ hoy, cuentas: [cuenta], empresas: [empresa], ultimoMovimiento: hoy }).clave,
    SUGERENCIAS.CUENTAS,
  );
});

test('con todo completo solo se pregunta si lleva días sin registrar', () => {
  const base = { hoy, cuentas: [cuenta, otra], empresas: [empresa] };
  assert.equal(elegirSugerencia({ ...base, ultimoMovimiento: '2026-10-23' }), null);
  const sugerencia = elegirSugerencia({ ...base, ultimoMovimiento: '2026-10-21' });
  assert.equal(sugerencia.clave, SUGERENCIAS.REGISTRO);
  assert.match(sugerencia.texto, /4 días/);
  assert.match(elegirSugerencia({ ...base, ultimoMovimiento: null }).texto, /Todavía no veo movimientos/);
});

test('una al día, y respeta lo pospuesto y lo descartado', () => {
  const base = { hoy, cuentas: [cuenta], ultimoMovimiento: '2026-10-01' };
  assert.equal(elegirSugerencia({ ...base, estado: { ultimaOfrecida: hoy } }), null);

  const pospuesta = elegirSugerencia({ ...base, estado: { trabajo: { pospuestaHasta: '2026-10-27' } } });
  assert.equal(pospuesta.clave, SUGERENCIAS.CUENTAS, 'salta el trabajo pospuesto');
  assert.equal(elegirSugerencia({ ...base, estado: { trabajo: { pospuestaHasta: hoy } } }).clave, SUGERENCIAS.TRABAJO);

  const estado = { trabajo: { descartada: true }, cuentas: { descartada: true }, registro: { descartada: true } };
  assert.equal(elegirSugerencia({ ...base, estado }), null);
});

test('sumar días cruza meses', () => {
  assert.equal(sumarDiasISO('2026-10-30', 3), '2026-11-02');
});

test('montos y horas escritos a mano', () => {
  assert.equal(leerMonto('$4,500.50'), 4500.5);
  assert.equal(leerMonto('4500 pesos'), 4500);
  assert.equal(leerMonto('cuatro mil'), null);
  assert.equal(leerMonto('0'), null);
  assert.equal(leerHoras('40 horas'), 40);
  assert.equal(leerHoras('200'), null);
});

test('el trabajo pregunta solo lo que su forma de pago necesita', () => {
  assert.equal(siguienteDatoTrabajo({}), 'nombre');
  assert.equal(siguienteDatoTrabajo({ nombre: 'Acme' }), 'esquema');
  assert.equal(siguienteDatoTrabajo({ nombre: 'Acme', tipoEsquema: 'mensual' }), 'cuenta');
  assert.equal(siguienteDatoTrabajo({ nombre: 'Acme', tipoEsquema: 'por_horas' }), 'monto');
  assert.equal(siguienteDatoTrabajo({ nombre: 'Acme', tipoEsquema: 'por_horas', precioHora: 52 }), 'horas');
  assert.equal(
    siguienteDatoTrabajo({ nombre: 'Acme', tipoEsquema: 'quincenal', quincenaBase: 4500, cuentaRespondida: true }),
    'confirmar',
  );

  const porHoras = construirEmpresa({ nombre: ' Acme ', tipoEsquema: 'por_horas', precioHora: 52, horasSemanales: 40, cuentaId: 'c1' });
  assert.equal(porHoras.nombre, 'Acme');
  assert.equal(porHoras.recordatorioRecurrenteActivo, true);
  assert.equal(porHoras.cuentaPorDefectoId, 'c1');
  assert.equal(construirEmpresa({ nombre: 'Acme', tipoEsquema: 'quincenal', quincenaBase: 4500 }).recordatorioRecurrenteActivo, false);
});
