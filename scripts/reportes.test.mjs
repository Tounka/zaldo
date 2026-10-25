import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALCULOS_REPORTE, periodoDelReporte } from '../src/assets/funciones/ia/reportes/calculos.js';
import { IDS_REPORTE, REPORTES } from '../src/assets/funciones/ia/reportes/catalogo.js';
import { PLANTILLAS_REPORTE, armarPresentacion, combinarTextos } from '../src/assets/funciones/ia/reportes/plantillas.js';
import { construirEsquemaTextos, numerosPermitidos, textoSinCifrasNuevas, validarTextosReporte } from '../src/assets/funciones/ia/reportes/redaccion.js';
import { validarPresentacion } from '../src/assets/funciones/ia/analisis/esquema.js';
import { renderizarPresentacion } from '../src/assets/funciones/ia/analisis/render.js';
import { limpiarTurnoAnterior } from '../src/assets/funciones/ia/contratoConsulta.js';

/*
 * Cálculos puros de los reportes con datos inventados (montos redondos,
 * cuentas genéricas). Firestore no entra: cada cálculo recibe los datos ya
 * leídos, igual que en la app.
 */

const HOY = '2026-10-24';
const gasto = (fechaISO, monto, extra = {}) => ({ fechaISO, monto: -monto, categoria: 'comida', ...extra });
const ingreso = (fechaISO, monto, extra = {}) => ({ fechaISO, monto, categoria: 'ingreso', ...extra });

const MOVIMIENTOS = [
  // Julio a septiembre completos y octubre en curso.
  gasto('2026-07-05', 1000), gasto('2026-07-10', 500, { esPersonal: true, categoria: 'entretenimiento' }),
  gasto('2026-08-05', 1200), gasto('2026-08-12', 300, { esPersonal: true, categoria: 'entretenimiento' }),
  gasto('2026-09-03', 2000, { categoria: 'hogar' }), gasto('2026-09-15', 700, { esPersonal: true, categoria: 'entretenimiento' }),
  gasto('2026-09-20', 400, { categoria: 'transporte', esExtraordinario: true }),
  gasto('2026-10-02', 800), gasto('2026-10-10', 200, { esPersonal: true, categoria: 'salud' }),
  ingreso('2026-09-01', 10000),
  // Lo interno no cuenta como gasto ni ingreso.
  { fechaISO: '2026-09-05', monto: -5000, categoria: 'pagoTarjeta' },
  { fechaISO: '2026-09-06', monto: -900, categoria: 'comida', esTransferencia: true },
];

const DATOS_EJEMPLO = {
  cierre_mes: { movimientos: MOVIMIENTOS, ingresosModulo: [] },
  gasto_personal: { movimientos: MOVIMIENTOS },
  categorias: { movimientos: MOVIMIENTOS },
  tarjetas: {
    cuentas: [
      { id: 'a', nombre: 'Banco A', tipoDeCuenta: 'credito', saldoALaFecha: -4000, saldoALaFechaMSI: -2000, limiteDeCredito: 10000 },
      { id: 'b', nombre: 'Banco B', tipoDeCuenta: 'credito', saldoALaFecha: -500, saldoALaFechaMSI: 0, limiteDeCredito: 20000 },
      { id: 'c', nombre: 'Débito', tipoDeCuenta: 'debito', saldoALaFecha: 9000 },
    ],
  },
  ingresos: {
    ingresosModulo: [
      { fecha: '2026-07-15', monto: 8000, fuente: 'Empresa A', estado: 'cobrado' },
      { fecha: '2026-08-15', monto: 8000, fuente: 'Empresa A', estado: 'cobrado' },
      { fecha: '2026-09-15', monto: 8000, fuente: 'Empresa A', estado: 'cobrado' },
      { fecha: '2026-09-20', monto: 2000, fuente: 'Proyecto B', estado: 'cobrado' },
      { fecha: '2026-09-25', monto: 1500, fuente: 'Proyecto B', estado: 'pendiente' },
      { fecha: '2026-09-26', monto: 3000, fuente: 'Empresa A', estado: 'omitido' },
    ],
    movimientos: [],
  },
  ahorro: {
    anio: 2027,
    data: {
      kpis: { capitalInicial: 50000, metaAnual: 20000 },
      cuentas: {
        liquido: [{ id: 'l1', nombre: 'Cuenta A', monto: 30000 }],
        inversiones: [{ id: 'i1', nombre: 'Inversión B', monto: 25000, rendimientoEstimado: 10 }],
        inversionesLargo: [],
        responsabilidades: [{ id: 'r1', nombre: 'Pendiente', monto: 1000 }],
      },
      historial: [
        { fechaKey: '2026-08-01', capitalTotal: 50000, saldos: { l1: 30000, i1: 20000 }, incrementos: [] },
        { fechaKey: '2026-09-01', capitalTotal: 52000, saldos: { l1: 30000, i1: 22000 }, incrementos: [{ cuentaId: 'i1', categoria: 'rendimientos', monto: 2000 }] },
        { fechaKey: '2026-10-20', capitalTotal: 54000, saldos: { l1: 30000, i1: 25000, r1: -1000 }, incrementos: [{ cuentaId: 'i1', categoria: 'aumentoCapital', monto: 3000 }, { cuentaId: 'r1', categoria: 'otros', monto: -1000 }] },
      ],
    },
  },
  prestamos: {
    prestamos: [
      { nombre: 'Persona A', montoPrestado: 10000, interes: 1000, pagado: 3000, fechaInicio: '2025-06-01' },
      { nombre: 'Persona B', montoPrestado: 2000, interes: 0, pagado: 0, fechaInicio: '2026-09-01' },
      { nombre: 'Persona C', montoPrestado: 1000, interes: 0, pagado: 1000, fechaInicio: '2026-01-01' },
    ],
  },
  despensa: {
    gastoPorMes: { 202607: 2000, 202608: 2500, 202609: 3000, 202610: 1000 },
    inventario: {
      totalProductos: 3,
      productosAgotados: 1,
      productosBajoMinimo: 1,
      valorTotalInventario: 450,
      faltantes: [{ nombre: 'Leche', resumenStock: '0 L' }],
      productos: {
        p1: { nombre: 'Leche', stockPorPresentacion: { a: { totalGastado: 900, vecesComprado: 30 } } },
        p2: { nombre: 'Café', stockPorPresentacion: { a: { totalGastado: 1200, vecesComprado: 6 } } },
      },
    },
  },
};

const calcular = (reporte, consulta = {}) => {
  const advertencias = [];
  const periodo = periodoDelReporte(reporte, consulta, HOY, advertencias);
  return CALCULOS_REPORTE[reporte]({ ...DATOS_EJEMPLO[reporte], consulta, periodo, hoyISO: HOY });
};

test('periodos por defecto: cierre = mes pasado; varios meses = los 3 completos anteriores', () => {
  assert.deepEqual(periodoDelReporte('cierre_mes', {}, HOY, []), { desde: '2026-09-01', hasta: '2026-09-30' });
  assert.deepEqual(periodoDelReporte('gasto_personal', {}, HOY, []), { desde: '2026-07-01', hasta: '2026-09-30' });
  assert.equal(periodoDelReporte('tarjetas', {}, HOY, []), null);
  // El mes en curso se corta en hoy.
  assert.deepEqual(periodoDelReporte('cierre_mes', { desde: '2026-10-01', hasta: '2026-10-24' }, HOY, []), { desde: '2026-10-01', hasta: '2026-10-24' });
});

test('cierre de mes: gastos sin internos, ingresos, balance y promedio de los meses previos', () => {
  const m = calcular('cierre_mes');
  assert.equal(m.gastos, 3100);
  assert.equal(m.ingresos, 10000);
  assert.equal(m.balance, 6900);
  assert.equal(m.categorias[0].nombre, 'Hogar');
  assert.equal(m.mayor.monto, 2000);
  // Julio (1500) y agosto (1500): no hay gastos antes de julio, así que solo cuentan esos dos.
  assert.equal(m.promedioAnterior, 1500);
  assert.equal(m.mes.completo, true);
});

test('cierre de mes con filtro de marca usa solo esos gastos', () => {
  const m = calcular('cierre_mes', { marca: 'personal' });
  assert.equal(m.gastos, 700);
  assert.equal(m.filtro, 'personales');
});

test('gasto personal: promedio solo con meses completos y categorías personales', () => {
  const m = calcular('gasto_personal');
  assert.deepEqual(m.meses.map((mes) => mes.personal), [500, 300, 700]);
  assert.equal(m.promedioPersonal, 500);
  assert.equal(m.promedioTotal, 2033.33);
  assert.equal(m.categorias[0].nombre, 'Entretenimiento');
});

test('un mes incompleto no entra al promedio y se avisa', () => {
  const m = calcular('gasto_personal', { desde: '2026-09-01', hasta: HOY });
  assert.deepEqual(m.meses.map((mes) => mes.completo), [true, false]);
  assert.equal(m.promedioPersonal, 700);
});

test('periodo de un solo mes en curso: promedio parcial con advertencia', () => {
  const m = calcular('categorias', { desde: '2026-10-01', hasta: HOY });
  assert.equal(m.total, 1000);
  assert.ok(m.advertencias.some((texto) => texto.includes('parcial')));
});

test('periodo sin datos marca el reporte como vacío', () => {
  const m = calcular('categorias', { desde: '2025-01-01', hasta: '2025-03-31' });
  assert.equal(m.vacio, true);
});

test('categorías: ranking, la que más subió y la que más bajó', () => {
  const m = calcular('categorias');
  assert.equal(m.ranking[0].nombre, 'Comida');
  assert.equal(m.subio.nombre, 'Hogar');
  assert.equal(m.bajo.nombre, 'Comida');
});

test('tarjetas: deuda, MSI, revolvente y alerta arriba de 30 %', () => {
  const m = calcular('tarjetas');
  assert.equal(m.deuda, 6500);
  assert.equal(m.msi, 2000);
  assert.equal(m.revolvente, 4500);
  assert.equal(m.enAlerta, 1);
  assert.equal(Math.round(m.usoTotal * 1000) / 1000, 0.217);
  assert.equal(calcular('tarjetas').tarjetas.length, 2);
  assert.equal(CALCULOS_REPORTE.tarjetas({ cuentas: [] }).vacio, true);
});

test('ingresos: cortes fuera, pendiente aparte y concentración', () => {
  const m = calcular('ingresos');
  assert.equal(m.total, 26000);
  assert.equal(m.pendiente, 1500);
  assert.equal(m.fuentes[0].nombre, 'Empresa A');
  assert.equal(m.nivelConcentracion, 'alta');
  assert.equal(m.promedioMensual, Math.round((26000 / 3) * 100) / 100);
});

test('ahorro: capital, crecimiento contra la meta y rendimiento por cuenta', () => {
  const m = calcular('ahorro');
  assert.equal(m.capital, 54000);
  assert.equal(m.crecimiento, 4000);
  assert.equal(m.avanceMeta, 0.2);
  assert.equal(m.rendimiento, 2000);
  assert.equal(m.cuentas.find((cuenta) => cuenta.nombre === 'Inversión B').rendimiento, 2000);
});

test('préstamos: solo con saldo, antigüedad y avance de cobro', () => {
  const m = calcular('prestamos');
  assert.equal(m.cantidad, 2);
  assert.equal(m.porCobrar, 10000);
  assert.equal(m.masAntiguo.meses, 16);
  assert.deepEqual(m.antiguedad.map((rango) => rango.nombre), ['Menos de 3 meses', 'Más de 12 meses']);
});

test('despensa: promedio de meses completos, faltantes y productos con más gasto', () => {
  const m = calcular('despensa');
  assert.equal(m.promedioMensual, 2500);
  assert.equal(m.faltantes.length, 1);
  assert.equal(m.productos[0].nombre, 'Café');
});

test('cada plantilla arma una presentación válida y se pinta como HTML', () => {
  const plantilla = { css: '', deck: '', graficas: '' };
  IDS_REPORTE.forEach((reporte) => {
    const m = calcular(reporte);
    const textos = combinarTextos(PLANTILLAS_REPORTE[reporte].textosPorDefecto(m), null);
    const spec = armarPresentacion(reporte, m, textos, { fecha: '24 oct 2026' });
    assert.deepEqual(validarPresentacion(spec), [], reporte);
    assert.ok(textos.recomendaciones.length >= 2, reporte);
    // Cada diapositiva con título de la IA tiene un texto por defecto.
    Object.keys(REPORTES[reporte].diapositivas).forEach((id) => assert.ok(textos.titulos[id], `${reporte}.${id}`));
    assert.match(renderizarPresentacion(spec, plantilla), /<section class="slide cover">/);
  });
});

test('a la IA no viajan nombres de personas, fuentes ni cuentas', () => {
  const prestamos = JSON.stringify(PLANTILLAS_REPORTE.prestamos.metricasParaIA(calcular('prestamos')));
  assert.ok(!/Persona/.test(prestamos));
  const ingresos = JSON.stringify(PLANTILLAS_REPORTE.ingresos.metricasParaIA(calcular('ingresos')));
  assert.ok(!/Empresa A|Proyecto B/.test(ingresos));
  const tarjetas = JSON.stringify(PLANTILLAS_REPORTE.tarjetas.metricasParaIA(calcular('tarjetas')));
  assert.ok(!/Banco A|Banco B/.test(tarjetas));
  const cierre = JSON.stringify(PLANTILLAS_REPORTE.cierre_mes.metricasParaIA(calcular('cierre_mes')));
  assert.ok(!/fechaISO|nota/.test(cierre));
});

test('los textos de la IA con cifras nuevas se descartan', () => {
  const metricas = { gastos: 3100.4, porcentajePct: 23.4, mes: 'sep-26' };
  const permitidos = numerosPermitidos(metricas);
  assert.equal(textoSinCifrasNuevas('Gastaste $3,100 en sep-26', permitidos), true);
  assert.equal(textoSinCifrasNuevas('El 23% del gasto', permitidos), true);
  assert.equal(textoSinCifrasNuevas('Los últimos 3 meses', permitidos), true);
  assert.equal(textoSinCifrasNuevas('Gastaste $4,000', permitidos), false);

  const textos = validarTextosReporte({
    titulos: { resumen: 'Cerraste con $3,100 de gasto', categorias: 'Inventé $9,999', extra: 'no va' },
    puntos: ['Uno', 'Dos **con negritas**', 'Tres', 'Cuatro', 'Cinco'],
    recomendaciones: ['Ahorra $50,000'],
  }, { reporte: 'cierre_mes', metricas });
  assert.deepEqual(Object.keys(textos.titulos), ['resumen']);
  assert.equal(textos.puntos.length, 4);
  assert.equal(textos.puntos[1], 'Dos con negritas');
  assert.deepEqual(textos.recomendaciones, []);
  assert.equal(textos.descartados, 2);
});

test('el esquema de textos cumple el modo strict', () => {
  IDS_REPORTE.forEach((reporte) => {
    const esquema = construirEsquemaTextos(reporte);
    assert.equal(esquema.additionalProperties, false);
    assert.deepEqual(esquema.required, Object.keys(esquema.properties));
    assert.deepEqual(esquema.properties.titulos.required, Object.keys(esquema.properties.titulos.properties));
    assert.equal(esquema.properties.titulos.additionalProperties, false);
  });
});

test('el turno anterior conserva el reporte solo con el tema "reporte"', () => {
  const base = { mensaje: 'hazme un reporte', consulta: { tema: 'reporte', reporte: 'tarjetas', desde: null, hasta: null } };
  assert.equal(limpiarTurnoAnterior(base).consulta.reporte, 'tarjetas');
  assert.equal(limpiarTurnoAnterior({ ...base, consulta: { ...base.consulta, tema: 'saldos' } }).consulta.reporte, '');
  assert.equal(limpiarTurnoAnterior({ ...base, consulta: { ...base.consulta, reporte: 'otro' } }).consulta.reporte, '');
});
