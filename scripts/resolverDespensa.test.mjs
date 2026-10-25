import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aEmpaques,
  buscarPresentacion,
  buscarProducto,
  resolverCompraEnCatalogo,
  resolverSalidaEnCatalogo,
} from '../src/assets/funciones/ia/resolverDespensa.js';

const presentacion = (id, nombre, extra = {}) => ({ id, nombre, activa: true, stockActual: 0, vecesComprado: 0, ...extra });
const catalogo = {
  productos: {
    leche: {
      id: 'leche', nombre: 'Leche Entera', unidadBase: 'L', activo: true,
      presentaciones: {
        l1: presentacion('l1', '1 L', { equivaleAUnidadBase: 1, stockActual: 3, vecesComprado: 8 }),
        l2: presentacion('l2', '2 L', { equivaleAUnidadBase: 2, stockActual: 1 }),
      },
    },
    tortilla: {
      id: 'tortilla', nombre: 'Tortilla de maíz', unidadBase: 'kg', activo: true,
      presentaciones: { b: presentacion('b', 'Bolsa 500 g', { equivaleAUnidadBase: 0.5, stockActual: 2 }) },
    },
    huevo: {
      id: 'huevo', nombre: 'Huevo', unidadBase: 'pz', activo: true,
      presentaciones: { c: presentacion('c', 'Caja 30 pz', { stockActual: 0.5 }) },
    },
    viejo: { id: 'viejo', nombre: 'Leche de almendra', activo: false, presentaciones: {} },
  },
};

test('encuentra el producto exacto, sin acentos, o el parecido más cercano', () => {
  assert.equal(buscarProducto(catalogo, 'tortilla de maiz').producto.id, 'tortilla');
  assert.deepEqual(
    [buscarProducto(catalogo, 'leche').producto.id, buscarProducto(catalogo, 'leche').aproximado],
    ['leche', true],
  );
  assert.equal(buscarProducto(catalogo, 'pan'), null);
});

test('reutiliza presentaciones: por nombre, por tamaño o la habitual', () => {
  const leche = catalogo.productos.leche;
  assert.equal(buscarPresentacion(leche, '2 L').id, 'l2');
  assert.equal(buscarPresentacion(leche, '2000 ml').id, 'l2');
  assert.equal(buscarPresentacion(leche, '').id, 'l1');
  assert.equal(buscarPresentacion(leche, '1 pz').id, 'l1', '"1 pz" genérico no duplica');
  assert.equal(buscarPresentacion(leche, '3 L'), null, 'un tamaño que no existe sí es nuevo');
  assert.equal(buscarPresentacion(catalogo.productos.tortilla, '1 kg', 'kg').id, 'b', 'granel no crea "1 kg"');
});

test('convierte a empaques de la presentación', () => {
  const { tortilla } = catalogo.productos;
  assert.equal(aEmpaques({ cantidad: 1.5, unidad: 'kg' }, tortilla, tortilla.presentaciones.b), 3);
  assert.equal(aEmpaques({ cantidad: 2, unidad: 'pz' }, tortilla, tortilla.presentaciones.b), 2);
});

test('una compra entra a lo que ya existe y avisa lo nuevo', () => {
  const { items, nuevos, presentacionesNuevas, aproximados } = resolverCompraEnCatalogo([
    { producto: 'leche', presentacion: '', cantidad: 2, unidad: 'pz' },
    { producto: 'Leche Entera', presentacion: '3 L', cantidad: 1, unidad: 'pz' },
    { producto: 'Pan blanco', presentacion: 'Bolsa', cantidad: 1, unidad: 'pz' },
  ], catalogo);

  assert.deepEqual(
    items.map(({ productoId, presentacionId, producto, estado }) => [productoId, presentacionId, producto, estado]),
    [
      ['leche', 'l1', 'Leche Entera', 'existente'],
      ['leche', undefined, 'Leche Entera', 'presentacion_nueva'],
      [undefined, undefined, 'Pan blanco', 'nuevo'],
    ],
  );
  assert.deepEqual(nuevos, ['Pan blanco']);
  assert.deepEqual(presentacionesNuevas, ['Leche Entera (3 L)']);
  assert.equal(aproximados.length, 1);
});

test('una salida descuenta lo que hay, vacía con "se acabó" y no inventa productos', () => {
  const { items, avisos } = resolverSalidaEnCatalogo([
    { producto: 'leche', presentacion: '', cantidad: null, unidad: 'pz', todo: true },
    { producto: 'tortilla', presentacion: '', cantidad: 500, unidad: 'g', todo: false },
    { producto: 'huevo', presentacion: '', cantidad: 4, unidad: 'pz', todo: false },
    { producto: 'pan', presentacion: '', cantidad: 1, unidad: 'pz', todo: false },
  ], catalogo);

  assert.deepEqual(
    items.map(({ presentacionId, cantidad }) => [presentacionId, cantidad]),
    [['l1', 3], ['l2', 1], ['b', 1], ['c', 0.5]],
  );
  assert.equal(avisos.length, 2, 'huevo limitado al stock y pan inexistente');
});
