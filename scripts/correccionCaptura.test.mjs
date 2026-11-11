import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  admiteCorreccion,
  construirMensajeCorreccion,
  fusionarCorreccion,
  PREFIJO_CORRECCION,
  PREFIJO_PENDIENTE,
} from '../src/assets/funciones/ia/correccionCaptura.js';

const bbva = { id: 'c1', nombre: 'BBVA Oro', tipoDeCuenta: 'credito' };
const efectivo = { id: 'c2', nombre: 'Efectivo', tipoDeCuenta: 'efectivo' };
const acme = { id: 'e1', nombre: 'Acme' };
const bono = { id: 'p1', nombre: 'Bono', tipo: 'percepcion' };
const vales = { id: 'p2', nombre: 'Vales', tipo: 'percepcion' };

const gasto = (cambios = {}, valores = {}) => ({
  accion: 'movimiento',
  cuenta: bbva,
  valores: {
    tipoDeMovimiento: 'gasto',
    monto: '230',
    categoria: 'transporte',
    nota: 'Uber',
    fechaMovimiento: '2026-11-10',
    esPersonal: true,
    esExtraordinario: false,
    ...valores,
  },
  personalIndicado: false,
  advertencias: [],
  ...cambios,
});

test('el mensaje lleva el registro pendiente y la corrección', () => {
  const mensaje = construirMensajeCorreccion(gasto(), '  no,\nfueron 250 ');
  const [pendiente, correccion] = mensaje.split('\n');
  assert.ok(pendiente.startsWith(PREFIJO_PENDIENTE));
  assert.match(pendiente, /gasto de 230; cuenta: BBVA Oro; categoría: transporte; fecha: 2026-11-10; nota: Uber; personal: sí/);
  assert.equal(correccion, `${PREFIJO_CORRECCION} no, fueron 250`);
  assert.ok(construirMensajeCorreccion(gasto(), 'x'.repeat(2000)).length < 1200);
});

test('una transferencia se describe con origen y destino', () => {
  const mensaje = construirMensajeCorreccion({ accion: 'transferencia', monto: 500, cuentaOrigen: efectivo, cuentaDestino: null, nota: '' }, 'a la BBVA');
  assert.match(mensaje, /transferencia de 500; de: Efectivo; a: sin elegir/);
});

test('admiten corrección movimientos, transferencias, despensa y pagos de empleo', () => {
  assert.ok(admiteCorreccion(gasto()));
  assert.ok(admiteCorreccion({ accion: 'transferencia' }));
  assert.ok(admiteCorreccion({ accion: 'despensa' }));
  assert.ok(admiteCorreccion({ accion: 'pagoEmpleo', empresa: acme }));
  assert.ok(!admiteCorreccion({ accion: 'pagoEmpleo', empresa: null }));
  assert.ok(!admiteCorreccion({ accion: 'cuenta' }));
  assert.ok(!admiteCorreccion(null));
});

test('conserva lo que la corrección no devolvió', () => {
  const nueva = gasto(
    { cuenta: null, advertencias: ['No quedó clara la cuenta; elígela antes de guardar.'] },
    { monto: '250', categoria: '', nota: '', esPersonal: false },
  );
  const corregida = fusionarCorreccion(gasto({ categoriaRespondida: true, cuentaPreguntada: true }), { propuestas: [nueva] });
  assert.equal(corregida.valores.monto, '250');
  assert.equal(corregida.cuenta, bbva);
  assert.equal(corregida.valores.categoria, 'transporte');
  assert.equal(corregida.valores.nota, 'Uber');
  assert.equal(corregida.valores.esPersonal, true);
  assert.equal(corregida.categoriaRespondida, true);
  assert.deepEqual(corregida.advertencias, []);
});

test('lo que la corrección sí cambia manda', () => {
  const nueva = gasto({ cuenta: efectivo, personalIndicado: true }, { categoria: 'comida', fechaMovimiento: '2026-11-09', esPersonal: false });
  const corregida = fusionarCorreccion(gasto(), { propuestas: [nueva] });
  assert.equal(corregida.cuenta, efectivo);
  assert.equal(corregida.valores.categoria, 'comida');
  assert.equal(corregida.valores.fechaMovimiento, '2026-11-09');
  assert.equal(corregida.valores.esPersonal, false);
});

test('puede volverse transferencia, salvo el gasto de una compra de despensa', () => {
  const transferencia = { accion: 'transferencia', monto: 230, cuentaOrigen: efectivo, cuentaDestino: bbva, nota: '', advertencias: [] };
  assert.equal(fusionarCorreccion(gasto(), { propuestas: [transferencia] }), transferencia);
  assert.equal(fusionarCorreccion(gasto({ esGastoDeDespensa: true }), { propuestas: [transferencia] }), null);
  assert.equal(fusionarCorreccion(gasto(), { propuestas: [{ accion: 'cuenta' }] }), null);
  assert.equal(fusionarCorreccion(gasto(), { propuestas: [gasto(), gasto()] }), null);
  assert.equal(fusionarCorreccion(gasto(), {}), null);
});

test('una transferencia conserva la cuenta que no se corrigió', () => {
  const anterior = { accion: 'transferencia', monto: 500, cuentaOrigen: efectivo, cuentaDestino: bbva, nota: 'ahorro', advertencias: [] };
  const nueva = { accion: 'transferencia', monto: 800, cuentaOrigen: null, cuentaDestino: bbva, nota: '', advertencias: ['No quedó clara la cuenta de origen.'] };
  const corregida = fusionarCorreccion(anterior, { propuestas: [nueva] });
  assert.equal(corregida.monto, 800);
  assert.equal(corregida.cuentaOrigen, efectivo);
  assert.equal(corregida.nota, 'ahorro');
  assert.deepEqual(corregida.advertencias, []);
});

const compra = (cambios = {}) => ({
  accion: 'despensa',
  tienda: 'Soriana',
  totalTicket: 450,
  cuenta: bbva,
  fecha: '2026-11-10',
  items: [
    { producto: 'Leche', cantidad: 2, unidad: 'pz', presentacion: '1 L', costoTotal: 60 },
    { producto: 'Detergente', cantidad: 1, unidad: 'pz', presentacion: '', costoTotal: 90 },
  ],
  advertencias: [],
  ...cambios,
});

test('una compra de despensa se describe y se corrige completa', () => {
  const mensaje = construirMensajeCorreccion(compra(), 'quita el detergente');
  assert.match(mensaje, /compra de despensa; tienda: Soriana; total del ticket: 450; cuenta: BBVA Oro/);
  assert.match(mensaje, /2 pz Leche \(1 L\) \$60 \| 1 pz Detergente \$90/);

  const nueva = compra({ tienda: '', cuenta: null, items: [compra().items[0]] });
  const corregida = fusionarCorreccion(compra(), { despensa: nueva });
  assert.equal(corregida.items.length, 1);
  assert.equal(corregida.tienda, 'Soriana');
  assert.equal(corregida.cuenta, bbva);
  assert.equal(fusionarCorreccion(compra(), { propuestas: [gasto()] }), null);
});

const pago = (cambios = {}) => ({
  accion: 'pagoEmpleo',
  empresa: acme,
  monto: 15000,
  horas: null,
  cuenta: bbva,
  cuentaExplicita: false,
  cuentaRespondida: true,
  fecha: '2026-11-10',
  soloPercepciones: false,
  percepciones: [{ percepcion: bono, monto: 1000 }],
  nota: 'quincena',
  advertencias: [],
  ...cambios,
});

test('un pago de empleo conserva empresa, cuenta elegida y monto no dicho', () => {
  assert.match(construirMensajeCorreccion(pago(), 'sin el bono'), /pago del empleo Acme; sueldo: 15000; cuenta: BBVA Oro; fecha: 2026-11-10; percepciones: Bono 1000; nota: quincena/);

  const nueva = pago({
    monto: 0,
    cuenta: efectivo,
    nota: '',
    cuentaRespondida: false,
    percepciones: [{ percepcion: vales, monto: 500, sugerida: true }],
    advertencias: ['No dijiste el monto del sueldo.'],
  });
  const corregida = fusionarCorreccion(pago(), { pagosEmpleo: [nueva] });
  assert.equal(corregida.monto, 15000);
  assert.equal(corregida.cuenta, bbva);
  assert.equal(corregida.cuentaRespondida, true);
  assert.equal(corregida.nota, 'quincena');
  assert.deepEqual(corregida.percepciones, []);
  assert.deepEqual(corregida.advertencias, []);

  const conCuenta = fusionarCorreccion(pago(), { pagosEmpleo: [pago({ cuenta: efectivo, cuentaExplicita: true, monto: 16000 })] });
  assert.equal(conCuenta.cuenta, efectivo);
  assert.equal(conCuenta.monto, 16000);

  assert.equal(fusionarCorreccion(pago(), { pagosEmpleo: [pago({ empresa: { id: 'e2', nombre: 'Otra' } })] }), null);
  assert.equal(fusionarCorreccion(pago(), { pagosEmpleo: [] }), null);
});
