import {
  CATEGORIAS_DESPENSA_IA,
  LIMITE_NOMBRE_PRODUCTO,
  LIMITE_PRODUCTOS_DESPENSA,
  MOTIVOS_SALIDA_DESPENSA,
  UNIDADES_DESPENSA_IA,
} from "./contratoDespensa.js";
import { resolverCompraEnCatalogo, resolverSalidaEnCatalogo } from "./resolverDespensa.js";

/*
 * Valida la compra de despensa que propone la IA. Como en interpretarCaptura,
 * todo llega como dato no confiable: lo que no cuadra se descarta con aviso.
 *
 * El resultado tiene la forma que espera registrarEntradaLoteIADespensa
 * ({ tienda, fecha, totalTicket, items }) más la cuenta resuelta y avisos.
 */

const CANTIDAD_MAXIMA = 999;
const MONTO_MAXIMO = 1_000_000;
const LIMITE_TIENDA = 60;

const limpiar = (valor, limite) => String(valor ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, limite);

const leerNumero = (valor, { minimo = 0, maximo }) => {
  const numero = Number(valor);
  if (valor === null || valor === undefined || !Number.isFinite(numero)) return null;
  if (numero <= minimo || numero > maximo) return null;
  return Math.round(numero * 100) / 100;
};

/**
 * @param despensa   `respuesta.despensa` de la IA (objeto o null).
 * @param cuentas    Cuentas activas, para resolver con qué se pagó.
 * @param resolverFecha (texto, advertencias) → YYYY-MM-DD, compartido con capturas.
 * @param catalogo   Catálogo de despensa; con él cada renglón se ubica en lo que ya existe.
 * @returns null si no hay compra, o { tienda, fecha, totalTicket, cuenta, items, advertencias }.
 */
export const interpretarDespensa = (despensa, { cuentas = [], resolverFecha, catalogo = null }) => {
  if (!despensa || typeof despensa !== "object" || !Array.isArray(despensa.items)) return null;

  const advertencias = [];
  const items = [];

  despensa.items.slice(0, LIMITE_PRODUCTOS_DESPENSA).forEach((item) => {
    const producto = limpiar(item?.producto, LIMITE_NOMBRE_PRODUCTO);
    if (!producto) return;

    const cantidad = leerNumero(item.cantidad, { maximo: CANTIDAD_MAXIMA });
    if (cantidad === null) {
      advertencias.push(`No quedó clara la cantidad de "${producto}"; no lo incluí.`);
      return;
    }

    const categoria = CATEGORIAS_DESPENSA_IA.includes(item.categoria) ? item.categoria : "";
    items.push({
      producto,
      presentacion: limpiar(item.presentacion, LIMITE_NOMBRE_PRODUCTO),
      cantidad,
      unidad: UNIDADES_DESPENSA_IA.includes(item.unidad) ? item.unidad : "pz",
      costoTotal: leerNumero(item.costoTotal, { minimo: -0.01, maximo: MONTO_MAXIMO }) || 0,
      // Vacía → registrarEntradaLoteIADespensa la deduce del nombre.
      ...(categoria ? { categoria } : {}),
    });
  });

  if (despensa.items.length > LIMITE_PRODUCTOS_DESPENSA) {
    advertencias.push(`Solo tomé los primeros ${LIMITE_PRODUCTOS_DESPENSA} productos.`);
  }

  if (items.length === 0) return null;

  // Primero lo que ya existe: solo se crea lo que de verdad no está en el catálogo.
  const enCatalogo = resolverCompraEnCatalogo(items, catalogo);
  if (enCatalogo.aproximados.length) advertencias.push(`Usé tus productos: ${enCatalogo.aproximados.join(", ")}.`);
  if (enCatalogo.presentacionesNuevas.length) advertencias.push(`Presentación nueva: ${enCatalogo.presentacionesNuevas.join(", ")}.`);
  if (enCatalogo.nuevos.length) advertencias.push(`Productos nuevos en tu despensa: ${enCatalogo.nuevos.join(", ")}.`);

  const cuenta = despensa.cuentaId
    ? cuentas.find((actual) => actual.id === despensa.cuentaId) || null
    : null;

  const sumaRenglones = items.reduce((suma, item) => suma + item.costoTotal, 0);
  const totalTicket = leerNumero(despensa.totalTicket, { maximo: MONTO_MAXIMO })
    || Math.round(sumaRenglones * 100) / 100;

  return {
    tienda: limpiar(despensa.tienda, LIMITE_TIENDA),
    fecha: resolverFecha(despensa.fecha, advertencias),
    totalTicket,
    cuenta,
    items: enCatalogo.items,
    advertencias,
  };
};

/**
 * Salida de despensa ("se acabó la leche"). Sin catálogo no se puede
 * descontar nada, así que devuelve null.
 * @returns null o { motivo, items: [{ productoId, presentacionId, producto, presentacion, cantidad, stockAntes }], advertencias }
 */
export const interpretarSalidaDespensa = (salida, { catalogo = null } = {}) => {
  if (!salida || typeof salida !== "object" || !Array.isArray(salida.items) || !catalogo) return null;

  const pedidos = salida.items.slice(0, LIMITE_PRODUCTOS_DESPENSA)
    .map((item) => ({
      producto: limpiar(item?.producto, LIMITE_NOMBRE_PRODUCTO),
      presentacion: limpiar(item?.presentacion, LIMITE_NOMBRE_PRODUCTO),
      cantidad: leerNumero(item?.cantidad, { maximo: CANTIDAD_MAXIMA }),
      unidad: UNIDADES_DESPENSA_IA.includes(item?.unidad) ? item.unidad : "pz",
      todo: item?.todo === true,
    }))
    .filter((pedido) => pedido.producto);

  if (!pedidos.length) return null;

  const { items, avisos } = resolverSalidaEnCatalogo(pedidos, catalogo);
  return {
    motivo: MOTIVOS_SALIDA_DESPENSA[salida.motivo] || MOTIVOS_SALIDA_DESPENSA.consumo,
    items,
    advertencias: avisos,
  };
};
