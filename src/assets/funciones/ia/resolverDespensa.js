/*
 * Ubica lo que la IA propone (compras y salidas de despensa) dentro del
 * catálogo que el usuario ya tiene, ANTES de guardar. Así "2 leches" entra a
 * "Leche Lala · 1 L" en vez de crear "Leche" con una presentación "1 pz".
 *
 * Es puro (sin Firebase) para poder probarlo en Node. Repite a propósito la
 * normalización de firebase/despensa.js (normalizarClaveProducto): importar
 * ese módulo arrastraría Firestore.
 */

const UNIDADES_MASA = { kg: 1, g: 0.001 };
const UNIDADES_VOLUMEN = { L: 1, ml: 0.001 };
const UNIDADES_EMPAQUE = ["pz", "paq"];
const LARGO_MINIMO_PARCIAL = 4;

export const claveProducto = (texto = "") => String(texto)
  .toLowerCase()
  .normalize("NFD")
  .replace(/\p{Mn}/gu, "")
  .replace(/[^a-z0-9]/g, "");

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;
  return Math.round((Number(valor) || 0) * factor) / factor;
};

const SINONIMOS_UNIDAD = {
  ml: "ml", l: "L", lt: "L", lts: "L", litro: "L", litros: "L",
  g: "g", gr: "g", grs: "g", gramo: "g", gramos: "g",
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg",
};

/* "Bolsa 900 g" → { cantidad: 900, unidad: "g" }; sin medida → null. */
export const detectarMedida = (texto = "") => {
  const match = String(texto).match(/(\d+(?:[.,]\d+)?)\s*(ml|lts|lt|litros?|l|kgs|kg|kilos?|grs|gr|gramos?|g)\b/i);
  if (!match) return null;
  return { cantidad: Number(match[1].replace(",", ".")), unidad: SINONIMOS_UNIDAD[match[2].toLowerCase()] };
};

/* Lleva una medida a kg o L. null si es de piezas o no se puede convertir. */
const aBase = (cantidad, unidad) => {
  if (UNIDADES_MASA[unidad]) return { valor: cantidad * UNIDADES_MASA[unidad], dimension: "masa" };
  if (UNIDADES_VOLUMEN[unidad]) return { valor: cantidad * UNIDADES_VOLUMEN[unidad], dimension: "volumen" };
  return null;
};

const dimensionDeBase = (unidadBase) => ({ kg: "masa", g: "masa", L: "volumen", ml: "volumen" })[unidadBase] || null;

/* Tamaño de una presentación en kg/L, por su equivalencia o por su nombre. */
const tamanoPresentacion = (producto, presentacion) => {
  const dimension = dimensionDeBase(producto.unidadBase);
  const equivale = Number(presentacion.equivaleAUnidadBase || 0);
  if (dimension && equivale > 0) return { valor: equivale, dimension };
  const medida = detectarMedida(presentacion.nombre);
  return medida ? aBase(medida.cantidad, medida.unidad) : null;
};

const mismoTamano = (a, b) => Boolean(a && b && a.dimension === b.dimension && Math.abs(a.valor - b.valor) < 0.0001);

const productosActivos = (catalogo) => Object.values(catalogo?.productos || {})
  .filter((producto) => producto?.activo !== false && producto?.nombre);

const presentacionesActivas = (producto) => Object.values(producto?.presentaciones || {})
  .filter((presentacion) => presentacion?.activa !== false);

/*
 * Producto por nombre: exacto (normalizado) y, si no, el que contenga al otro
 * con el largo más parecido ("leche" → "Leche Lala"). Devuelve también si fue
 * aproximado, para avisarle al usuario.
 */
export const buscarProducto = (catalogo, nombre) => {
  const clave = claveProducto(nombre);
  if (!clave) return null;

  const productos = productosActivos(catalogo);
  const exacto = productos.find((producto) => claveProducto(producto.nombre) === clave);
  if (exacto) return { producto: exacto, aproximado: false };

  if (clave.length < LARGO_MINIMO_PARCIAL) return null;
  const candidatos = productos
    .map((producto) => ({ producto, claveCatalogo: claveProducto(producto.nombre) }))
    .filter(({ claveCatalogo }) => claveCatalogo.length >= LARGO_MINIMO_PARCIAL
      && (claveCatalogo.includes(clave) || clave.includes(claveCatalogo)))
    .sort((a, b) => Math.abs(a.claveCatalogo.length - clave.length) - Math.abs(b.claveCatalogo.length - clave.length));

  return candidatos.length ? { producto: candidatos[0].producto, aproximado: true } : null;
};

/* La que más se usa: con más stock y, a igualdad, la más comprada. */
const presentacionHabitual = (presentaciones) => [...presentaciones].sort((a, b) => (
  Number(b.stockActual || 0) - Number(a.stockActual || 0)
  || Number(b.vecesComprado || 0) - Number(a.vecesComprado || 0)
))[0] || null;

/*
 * Presentación dentro de un producto existente. Solo devuelve null (crear una
 * nueva) cuando el usuario dio un tamaño que ninguna presentación tiene, por
 * ejemplo "2 L" si solo existe "1 L". Sin tamaño se usa la habitual: "1 pz"
 * genérico nunca justifica duplicar, y tampoco "1 kg" cuando solo describe
 * una compra a granel ("kilo y medio de tortilla": unidad kg, no piezas).
 */
export const buscarPresentacion = (producto, nombrePresentacion = "", unidadCompra = "pz") => {
  const presentaciones = presentacionesActivas(producto);
  if (!presentaciones.length) return null;

  const clave = claveProducto(nombrePresentacion);
  if (clave) {
    const porNombre = presentaciones.find((presentacion) => claveProducto(presentacion.nombre) === clave);
    if (porNombre) return porNombre;
  }

  const medida = detectarMedida(nombrePresentacion);
  const tamanoBuscado = medida ? aBase(medida.cantidad, medida.unidad) : null;
  if (tamanoBuscado) {
    const porTamano = presentaciones.find((presentacion) => mismoTamano(tamanoPresentacion(producto, presentacion), tamanoBuscado));
    if (porTamano) return porTamano;
    const esGranel = !UNIDADES_EMPAQUE.includes(unidadCompra) && /^\s*1\s*[a-z]+\s*$/i.test(nombrePresentacion);
    if (!esGranel) return null;
  }

  return presentacionHabitual(presentaciones);
};

/*
 * Cantidad en empaques de la presentación. "1.5 kg" de tortilla en bolsas de
 * 500 g son 3 bolsas; "2" piezas son 2. Sin forma de convertir, se deja igual.
 */
export const aEmpaques = ({ cantidad, unidad }, producto, presentacion) => {
  const numero = Number(cantidad);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  if (UNIDADES_EMPAQUE.includes(unidad)) return redondear(numero);

  const pedido = aBase(numero, unidad);
  const tamano = tamanoPresentacion(producto, presentacion);
  if (!pedido || !tamano || pedido.dimension !== tamano.dimension || tamano.valor <= 0) return redondear(numero);
  return redondear(pedido.valor / tamano.valor);
};

/**
 * Compra: completa cada renglón con productoId/presentacionId cuando existen,
 * usando los nombres del catálogo. registrarEntradaLoteIADespensa ya respeta
 * esos ids, así que no duplica.
 * @returns {{ items, nuevos: string[], presentacionesNuevas: string[], aproximados: string[] }}
 */
export const resolverCompraEnCatalogo = (items = [], catalogo) => {
  const nuevos = [];
  const presentacionesNuevas = [];
  const aproximados = [];

  const resueltos = items.map((item) => {
    const encontrado = buscarProducto(catalogo, item.producto);
    if (!encontrado) {
      nuevos.push(item.producto);
      return { ...item, estado: "nuevo" };
    }

    const { producto, aproximado } = encontrado;
    if (aproximado) aproximados.push(`“${item.producto}” → ${producto.nombre}`);

    const presentacion = buscarPresentacion(producto, item.presentacion, item.unidad);
    if (!presentacion) {
      presentacionesNuevas.push(`${producto.nombre} (${item.presentacion})`);
      return { ...item, producto: producto.nombre, productoId: producto.id, estado: "presentacion_nueva" };
    }

    return {
      ...item,
      producto: producto.nombre,
      productoId: producto.id,
      presentacion: presentacion.nombre,
      presentacionId: presentacion.id,
      cantidad: aEmpaques(item, producto, presentacion) ?? item.cantidad,
      estado: "existente",
    };
  });

  return { items: resueltos, nuevos, presentacionesNuevas, aproximados };
};

/**
 * Salida: solo productos que existen y con stock. "Se acabó" descuenta todo lo
 * que quede; una cantidad mayor al stock se limita a lo que hay.
 * @returns {{ items: object[], avisos: string[] }} items = { productoId, presentacionId, producto, presentacion, cantidad, stockAntes }
 */
export const resolverSalidaEnCatalogo = (pedidos = [], catalogo) => {
  const items = [];
  const avisos = [];

  pedidos.forEach((pedido) => {
    const encontrado = buscarProducto(catalogo, pedido.producto);
    if (!encontrado) {
      avisos.push(`No encontré “${pedido.producto}” en tu despensa; no lo desconté.`);
      return;
    }

    const { producto } = encontrado;
    const conStock = presentacionesActivas(producto).filter((presentacion) => Number(presentacion.stockActual || 0) > 0);
    if (!conStock.length) {
      avisos.push(`${producto.nombre} ya está en 0.`);
      return;
    }

    // Con presentación explícita se respeta; si no, "se acabó" vacía todas y lo demás sale de la habitual.
    const indicada = pedido.presentacion ? buscarPresentacion(producto, pedido.presentacion, pedido.unidad) : null;
    const elegidas = indicada
      ? conStock.filter((presentacion) => presentacion.id === indicada.id)
      : pedido.todo ? conStock : [presentacionHabitual(conStock)];

    if (!elegidas.length) {
      avisos.push(`${producto.nombre} (${indicada.nombre}) ya está en 0.`);
      return;
    }

    elegidas.forEach((presentacion) => {
      const stock = redondear(presentacion.stockActual);
      const pedida = pedido.todo ? stock : aEmpaques({ cantidad: pedido.cantidad ?? 1, unidad: pedido.unidad || "pz" }, producto, presentacion);
      if (pedida > stock) avisos.push(`Solo quedaban ${stock} de ${producto.nombre}; desconté eso.`);

      items.push({
        productoId: producto.id,
        presentacionId: presentacion.id,
        producto: producto.nombre,
        presentacion: presentacion.nombre,
        cantidad: Math.min(pedida, stock),
        stockAntes: stock,
      });
    });
  });

  return { items, avisos };
};
