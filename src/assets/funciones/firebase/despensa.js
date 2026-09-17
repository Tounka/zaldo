import {
    arrayUnion,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    increment,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "./dbFirebase";
import { descargarRespaldo } from "./respaldo";
import {
    AREAS_DESPENSA,
    ESTRUCTURA_AREAS,
    TODAS_LAS_CATEGORIAS_INTERNAS,
    resolverAreaYCategoria,
    colorArea,
    colorCategoriaInterna,
} from "../../paginas/despensa/areasYCategorias";
import { resolverImagenProducto } from "../../paginas/despensa/iconosDespensa";

export {
    AREAS_DESPENSA,
    ESTRUCTURA_AREAS,
    TODAS_LAS_CATEGORIAS_INTERNAS,
    resolverAreaYCategoria,
    colorArea,
    colorCategoriaInterna,
};

export const UNIDADES_DESPENSA = [
    "L",
    "ml",
    "kg",
    "g",
    "pz",
    "paq",
    "pieza",
    "caja",
    "lata",
    "botella",
    "bolsa",
];

export const CATEGORIAS_DESPENSA = TODAS_LAS_CATEGORIAS_INTERNAS;

export const VERSION_CATALOGO = 2;

/*
 * MODELO DE DATOS (v2)
 * --------------------
 * Todo el estado "caliente" vive en UN SOLO documento, para que abrir la despensa
 * cueste 1 lectura sin importar cuántos productos haya (antes eran 1 + N).
 *
 *   usuarios/{uid}/despensa/catalogo             ← productos, presentaciones, stock y acumuladores
 *   usuarios/{uid}/despensa/compras/items/{id}   ← histórico de tickets (nunca se lee al cargar)
 *   usuarios/{uid}/despensa/movimientos/meses/{YYYYMM} ← histórico de consumos (nunca se lee al cargar)
 *
 * El "inventario" que consume la UI ya no se persiste: se deriva en memoria desde el
 * catálogo, así que nunca puede quedar desincronizado.
 *
 * La valuación es costo promedio ponderado (WAC) en lugar de lotes FIFO. Eso permite
 * que cada compra sea un updateDoc con increment(), sin leer nada antes.
 */
const catalogoRef = (uid) => doc(db, "usuarios", uid, "despensa", "catalogo");
const comprasRef = (uid) => collection(db, "usuarios", uid, "despensa", "compras", "items");
const comprasAnioRef = (uid, anio) => doc(db, "usuarios", uid, "despensa", "compras", "anios", String(anio));
const movimientosMesRef = (uid, mesKey) => doc(db, "usuarios", uid, "despensa", "movimientos", "meses", mesKey);

// Refs del modelo viejo (v1). Solo se usan para migrar, una única vez.
const inventarioRefLegacy = (uid) => doc(db, "usuarios", uid, "despensa", "inventario");
const productosRefLegacy = (uid) => collection(db, "usuarios", uid, "despensa", "productos", "items");

const redondear = (valor, decimales = 2) => {
    const numero = Number(valor || 0);
    if (!Number.isFinite(numero)) return 0;
    return Number(numero.toFixed(decimales));
};

const generarId = (prefijo) => `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Clave normalizada para detectar duplicados: sin acentos, sin signos, en minúsculas.
 * "Atún Herdez en agua 140g" -> "atunherdezenagua140g"
 */
export const normalizarClaveProducto = (texto = "") => String(texto)
    .toLowerCase()
    // NFD separa la letra de su acento; \p{Mn} elimina los acentos ya sueltos.
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]/g, "");

export const normalizarCodigoBarras = (codigo = "") => String(codigo).replace(/\D/g, "");

/*
 * Las rutas de Firestore usan el punto como separador, así que ni los ids ni las
 * claves del índice pueden contenerlo. Los ids los generamos nosotros (seguros),
 * pero las claves derivadas de nombres se sanean aquí.
 */
const rutaSegura = (clave) => String(clave).replace(/[.$[\]#/]/g, "_");

const crearCatalogoBase = () => ({
    version: VERSION_CATALOGO,
    moneda: "MXN",
    totalProductos: 0,
    productos: {},
    indice: { porCodigo: {}, porClave: {} },
    gastoPorMes: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
});

const unidadesCompatibles = (unidadBase, unidad) => {
    if (unidadBase === unidad) return true;
    return [
        ["L", "ml"],
        ["ml", "L"],
        ["kg", "g"],
        ["g", "kg"],
        ["pz", "pieza"],
        ["pieza", "pz"],
    ].some(([base, actual]) => base === unidadBase && actual === unidad);
};

const calcularEquivalenciaBase = ({ cantidad, unidad, unidadBase, equivalenciaBase }) => {
    const cantidadNum = Number(cantidad || 0);
    const equivalenciaManual = Number(equivalenciaBase || 0);

    if (equivalenciaManual > 0) return redondear(equivalenciaManual, 4);
    if (!cantidadNum || !unidad || !unidadBase) return null;
    if (unidad === unidadBase) return redondear(cantidadNum, 4);
    if (unidadBase === "L" && unidad === "ml") return redondear(cantidadNum / 1000, 4);
    if (unidadBase === "ml" && unidad === "L") return redondear(cantidadNum * 1000, 4);
    if (unidadBase === "kg" && unidad === "g") return redondear(cantidadNum / 1000, 4);
    if (unidadBase === "g" && unidad === "kg") return redondear(cantidadNum * 1000, 4);
    if ((unidadBase === "pz" && unidad === "pieza") || (unidadBase === "pieza" && unidad === "pz")) {
        return redondear(cantidadNum, 4);
    }

    return null;
};

export const obtenerMesKey = (fecha = new Date()) => {
    const fechaReal = fecha instanceof Date ? fecha : fecha.toDate?.() || new Date(fecha);
    return `${fechaReal.getFullYear()}${String(fechaReal.getMonth() + 1).padStart(2, "0")}`;
};

const obtenerFechaDesdeInput = (fecha) => {
    if (!fecha) return new Date();
    const parsed = new Date(`${fecha}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatearCantidad = (cantidad, unidad) => `${redondear(cantidad, 2)} ${unidad}`;

/* ═══════════════  Payload: increments y borrados diferidos  ═══════════════ */

/*
 * El payload se construye con marcadores propios y se convierte a sentinelas de
 * Firestore justo antes de escribir. Así el mismo payload sirve para dos cosas:
 * mandarlo a Firestore y aplicarlo sobre la copia en memoria, sin releer el doc.
 */
const INC = (delta) => ({ __inc: Number(delta) || 0 });
const BORRAR = { __del: true };

const esIncremento = (valor) => Boolean(valor) && typeof valor === "object" && valor.__inc !== undefined;
const esBorrado = (valor) => Boolean(valor) && typeof valor === "object" && valor.__del === true;

/**
 * Suma un delta a una ruta del payload. Es obligatorio usar esto en vez de
 * asignar INC() directamente cuando una misma ruta puede tocarse varias veces
 * (un ticket con dos renglones del mismo producto), porque una asignación
 * simple descartaría el incremento anterior.
 */
const acumular = (payload, ruta, delta) => {
    const actual = payload[ruta];
    const previo = actual && actual.__inc !== undefined ? actual.__inc : 0;
    payload[ruta] = INC(previo + delta);
};

const materializarPayload = (payload) => {
    const salida = {};
    Object.entries(payload).forEach(([ruta, valor]) => {
        if (esIncremento(valor)) salida[ruta] = increment(valor.__inc);
        else if (esBorrado(valor)) salida[ruta] = deleteField();
        else salida[ruta] = valor;
    });
    return salida;
};

/**
 * Clon profundo que conserva por referencia los objetos de Firestore (Timestamp),
 * cosa que un JSON.parse(JSON.stringify()) destruiría.
 */
const clonar = (valor) => {
    if (Array.isArray(valor)) return valor.map(clonar);
    if (valor && typeof valor === "object") {
        if (typeof valor.toDate === "function") return valor;
        const copia = {};
        Object.entries(valor).forEach(([clave, item]) => {
            copia[clave] = clonar(item);
        });
        return copia;
    }
    return valor;
};

/**
 * Aplica un payload de dot-notation sobre una copia en memoria del catálogo,
 * para devolver el estado nuevo sin volver a leer de Firestore.
 */
const aplicarCambiosEnMemoria = (catalogo, payload) => {
    const copia = clonar(catalogo);

    Object.entries(payload).forEach(([ruta, valor]) => {
        const partes = ruta.split(".");
        let cursor = copia;
        for (let i = 0; i < partes.length - 1; i += 1) {
            const parte = partes[i];
            if (typeof cursor[parte] !== "object" || cursor[parte] === null) cursor[parte] = {};
            cursor = cursor[parte];
        }
        const ultima = partes[partes.length - 1];

        if (esBorrado(valor)) {
            delete cursor[ultima];
        } else if (esIncremento(valor)) {
            cursor[ultima] = redondear(Number(cursor[ultima] || 0) + valor.__inc, 4);
        } else {
            // Se clona para que el objeto devuelto no comparta referencias con el
            // payload que se mandó a Firestore.
            cursor[ultima] = clonar(valor);
        }
    });

    return copia;
};

/* ═════════════════════════  Costos (WAC)  ═════════════════════════ */

/**
 * Costo promedio ponderado de una presentación: lo que en promedio te ha costado
 * cada unidad comprada a lo largo de toda la historia.
 */
export const calcularCostoPromedio = (presentacion = {}) => {
    const ingresado = Number(presentacion.totalIngresado || 0);
    const gastado = Number(presentacion.totalGastado || 0);
    if (ingresado <= 0 || gastado <= 0) {
        return redondear(Number(presentacion.ultimoPrecioPagado || presentacion.precioAproximado || 0), 2);
    }
    return redondear(gastado / ingresado, 2);
};

/**
 * Costo por unidad base: el "costo por gramo" (o por ml, o por pieza).
 * Es la métrica que permite comparar presentaciones y marcas distintas.
 */
export const calcularCostoPorUnidadBase = (presentacion = {}) => {
    const equivalencia = Number(presentacion.equivaleAUnidadBase || 0);
    if (!equivalencia) return null;
    const costoPromedio = calcularCostoPromedio(presentacion);
    if (!costoPromedio) return null;
    return redondear(costoPromedio / equivalencia, 4);
};

const evaluarPrecio = (presentacion, precioUnitario) => {
    if (!precioUnitario) return "sin_precio";
    if (presentacion.buenPrecio && precioUnitario <= Number(presentacion.buenPrecio)) return "excelente";
    if (presentacion.precioAproximado && precioUnitario <= Number(presentacion.precioAproximado)) return "bueno";
    if (presentacion.precioAproximado && precioUnitario <= Number(presentacion.precioAproximado) * 1.12) return "normal";
    return "caro";
};

const obtenerPrecioUnitarioEntrada = (precioTotalItem, cantidad, presentacion) => {
    const total = Number(precioTotalItem || 0);
    const cantidadNum = Number(cantidad || 0);
    if (total > 0 && cantidadNum > 0) {
        return { precioUnitario: redondear(total / cantidadNum, 2), origenCosto: "ticket" };
    }

    const precioReferencia = Number(presentacion.precioAproximado || presentacion.buenPrecio || 0);
    return {
        precioUnitario: redondear(precioReferencia, 2),
        origenCosto: precioReferencia > 0 ? "referencia_presentacion" : "sin_costo",
    };
};

/* ═══════════════════  Construcción de entidades  ═══════════════════ */

const crearPresentacion = (values, unidadBase) => {
    const unidad = values.presentacionUnidad || unidadBase || "pz";
    const cantidad = Number(values.presentacionCantidad || 1);
    const equivaleAUnidadBase = calcularEquivalenciaBase({
        cantidad,
        unidad,
        unidadBase,
        equivalenciaBase: values.equivalenciaBase,
    });

    return {
        id: generarId("pres"),
        nombre: values.presentacionNombre || `${cantidad} ${unidad}`,
        cantidad,
        unidad,
        equivaleAUnidadBase,
        convertible: equivaleAUnidadBase !== null,
        precioAproximado: Number(values.precioAproximado || 0),
        buenPrecio: Number(values.buenPrecio || 0),
        codigoBarras: normalizarCodigoBarras(values.codigoBarras),
        codigoNota: values.codigoNota || "",
        imagen: values.presentacionImagen || values.imagen || null,
        activa: true,

        // Acumuladores. Se mueven con increment(), nunca requieren lectura previa.
        stockActual: 0,
        totalIngresado: 0,
        totalConsumido: 0,
        totalGastado: 0,
        vecesComprado: 0,
        ultimoPrecioPagado: 0,
        precioMinimoHistorico: 0,
        precioMaximoHistorico: 0,
        ultimaCompra: null,
    };
};

const construirProducto = (productoId, values) => {
    const ahora = Timestamp.now();
    const unidadBase = values.unidadBase || "pz";
    const presentacion = crearPresentacion(values, unidadBase);
    const nombre = values.nombre || "";

    return {
        id: productoId,
        nombre,
        clave: normalizarClaveProducto(nombre),
        categoria: values.categoria || "Otros",
        grupo: values.grupo || "",
        marca: values.marca || "",
        codigoBarras: normalizarCodigoBarras(values.codigoBarras),
        activo: true,
        medible: values.medible !== "false" && values.medible !== false,
        unidadBase,
        stockMinimo: Number(values.stockMinimo || 0),
        unidadesPermitidas: String(values.unidadesPermitidas || unidadBase)
            .split(",")
            .map((unidad) => unidad.trim())
            .filter(Boolean),
        presentaciones: { [presentacion.id]: presentacion },
        origen: values.origen || "manual",
        imagen: values.imagen || null,
        necesario: false,
        totalIngresado: 0,
        totalConsumido: 0,
        totalGastado: 0,
        vecesComprado: 0,
        ultimaFechaMovimiento: null,
        createdAt: ahora,
        updatedAt: ahora,
    };
};

/* ══════════════  Derivación del inventario (en memoria)  ══════════════ */

const derivarResumenProducto = (producto) => {
    const presentaciones = Object.values(producto.presentaciones || {});
    let stockBase = 0;
    let valorInventarioActual = 0;
    let tieneStock = false;
    let tienePrecioCompleto = true;
    const partesConvertibles = [];
    const partesMixtas = [];
    const stockPorPresentacion = {};

    presentaciones.forEach((presentacion) => {
        const stockActual = Number(presentacion.stockActual || 0);
        const costoPromedio = calcularCostoPromedio(presentacion);

        stockPorPresentacion[presentacion.id] = {
            presentacionId: presentacion.id,
            nombre: presentacion.nombre,
            stockActual: redondear(stockActual, 2),
            unidad: presentacion.unidad,
            cantidad: presentacion.cantidad,
            equivaleAUnidadBase: presentacion.equivaleAUnidadBase,
            codigoBarras: presentacion.codigoBarras || producto.codigoBarras || "",
            metodoValuacion: "WAC",
            costoPromedio,
            costoPorUnidadBase: calcularCostoPorUnidadBase(presentacion),
            ultimoPrecioPagado: Number(presentacion.ultimoPrecioPagado || 0),
            precioMinimoHistorico: Number(presentacion.precioMinimoHistorico || 0),
            precioMaximoHistorico: Number(presentacion.precioMaximoHistorico || 0),
            totalIngresado: Number(presentacion.totalIngresado || 0),
            totalConsumido: Number(presentacion.totalConsumido || 0),
            totalGastado: redondear(presentacion.totalGastado, 2),
            vecesComprado: Number(presentacion.vecesComprado || 0),
            ultimaCompra: presentacion.ultimaCompra || null,
            valorInventarioActual: redondear(stockActual * costoPromedio, 2),
        };

        if (stockActual <= 0) return;

        tieneStock = true;
        if (!costoPromedio) tienePrecioCompleto = false;
        valorInventarioActual += stockActual * costoPromedio;

        if (presentacion.equivaleAUnidadBase !== null && presentacion.equivaleAUnidadBase !== undefined) {
            stockBase += stockActual * Number(presentacion.equivaleAUnidadBase || 0);
        } else {
            partesMixtas.push(`${redondear(stockActual, 2)} ${presentacion.nombre}`);
        }
    });

    if (stockBase > 0) partesConvertibles.push(formatearCantidad(stockBase, producto.unidadBase));
    const resumenStock = [...partesConvertibles, ...partesMixtas].join(" + ") || `0 ${producto.unidadBase || "pz"}`;
    const stockMinimo = Number(producto.stockMinimo || 0);
    const faltante = !tieneStock
        || (stockBase > 0 && stockMinimo > 0 && stockBase < stockMinimo)
        || Boolean(producto.necesario);
    const valuacionEstado = !tieneStock
        ? "sin_stock"
        : tienePrecioCompleto
            ? "valuacionCompleta"
            : valorInventarioActual > 0
                ? "valuacionParcial"
                : "sinValuacion";

    return {
        productoId: producto.id,
        nombre: producto.nombre,
        area: producto.area || resolverAreaYCategoria(producto).area,
        categoria: producto.categoria,
        grupo: producto.grupo || "",
        marca: producto.marca || "",
        codigoBarras: producto.codigoBarras || "",
        imagen: producto.imagen || null,
        unidadBase: producto.unidadBase,
        stockMinimo,
        resumenStock,
        stockBase: redondear(stockBase, 4),
        faltante,
        necesario: Boolean(producto.necesario),
        valorInventarioActual: redondear(valorInventarioActual, 2),
        valuacionEstado,
        stockPorPresentacion,
        totalIngresado: Number(producto.totalIngresado || 0),
        totalConsumido: Number(producto.totalConsumido || 0),
        totalGastado: redondear(producto.totalGastado, 2),
        vecesComprado: Number(producto.vecesComprado || 0),
        ultimaFechaMovimiento: producto.ultimaFechaMovimiento || null,
    };
};

/**
 * Reconstruye el objeto "inventario" que consume la UI a partir del catálogo.
 * Es puro y corre en memoria: no cuesta ninguna lectura.
 */
export const derivarInventario = (catalogo) => {
    const productosActivos = Object.values(catalogo?.productos || {}).filter((producto) => producto.activo !== false);
    const resumenes = {};
    productosActivos.forEach((producto) => {
        resumenes[producto.id] = derivarResumenProducto(producto);
    });

    const valores = Object.values(resumenes);
    const mesActual = obtenerMesKey(new Date());

    return {
        productos: resumenes,
        faltantes: valores.filter((producto) => producto.faltante).map((producto) => ({
            productoId: producto.productoId,
            nombre: producto.nombre,
            resumenStock: producto.resumenStock,
            stockMinimo: producto.stockMinimo,
        })),
        valorTotalInventario: redondear(valores.reduce((total, producto) => total + Number(producto.valorInventarioActual || 0), 0), 2),
        gastoMesActual: redondear(Number(catalogo?.gastoPorMes?.[mesActual] || 0), 2),
        totalProductos: valores.length,
        productosAgotados: valores.filter((producto) => Number(producto.stockBase || 0) === 0).length,
        productosBajoMinimo: valores.filter((producto) => Number(producto.stockBase || 0) > 0 && producto.faltante).length,
        productosSinPrecio: valores.filter((producto) => producto.valuacionEstado === "sinValuacion" || producto.valuacionEstado === "valuacionParcial").length,
        productosSinStockInicial: valores.filter((producto) => !producto.ultimaFechaMovimiento).length,
        moneda: catalogo?.moneda || "MXN",
        version: catalogo?.version || VERSION_CATALOGO,
        updatedAt: catalogo?.updatedAt || null,
    };
};

/**
 * Convierte el mapa de productos del catálogo al array que espera la UI,
 * con `presentaciones` como array (forma heredada) más los campos de costo.
 */
export const derivarProductos = (catalogo) => Object.values(catalogo?.productos || {})
    .filter((producto) => producto.activo !== false)
    .map((producto) => ({
        ...producto,
        presentaciones: Object.values(producto.presentaciones || {})
            .filter((presentacion) => presentacion.activa !== false)
            .map((presentacion) => ({
                ...presentacion,
                costoPromedio: calcularCostoPromedio(presentacion),
                costoPorUnidadBase: calcularCostoPorUnidadBase(presentacion),
            })),
    }))
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

/* ═════════════════════  Índice y detección de duplicados  ═════════════════════ */

const construirIndice = (productos) => {
    const porCodigo = {};
    const porClave = {};

    Object.values(productos || {}).forEach((producto) => {
        if (producto.activo === false) return;
        if (producto.codigoBarras) porCodigo[rutaSegura(producto.codigoBarras)] = producto.id;
        if (producto.clave) porClave[rutaSegura(producto.clave)] = producto.id;
        Object.values(producto.presentaciones || {}).forEach((presentacion) => {
            if (presentacion.codigoBarras) {
                porCodigo[rutaSegura(presentacion.codigoBarras)] = `${producto.id}:${presentacion.id}`;
            }
        });
    });

    return { porCodigo, porClave };
};

/**
 * Detecta si un producto ya existe en el catálogo. Trabaja contra la copia en
 * memoria, así que no cuesta ninguna lectura.
 * Devuelve { producto, presentacion, motivo } o null.
 */
/**
 * Elige la presentación adecuada dentro de un producto.
 * Con `medida` ({cantidad, unidad}) prefiere la que coincide en tamaño; así
 * "Atún 295g" entra a la lata de 295g y no a la de 140g.
 */
export const elegirPresentacion = (producto, medida) => {
    const presentaciones = Object.values(producto?.presentaciones || {})
        .filter((presentacion) => presentacion.activa !== false);
    if (presentaciones.length === 0) return null;
    if (presentaciones.length === 1 || !medida?.encontrada) return presentaciones[0];

    const exacta = presentaciones.find((presentacion) => Number(presentacion.cantidad) === Number(medida.cantidad)
        && String(presentacion.unidad).toLowerCase() === String(medida.unidad).toLowerCase());
    if (exacta) return exacta;

    // Si no hay coincidencia exacta, se compara en unidad base (140 g == 0.14 kg)
    const objetivoBase = calcularEquivalenciaBase({
        cantidad: medida.cantidad,
        unidad: medida.unidad,
        unidadBase: producto.unidadBase,
    });
    if (objetivoBase) {
        const porBase = presentaciones.find(
            (presentacion) => Math.abs(Number(presentacion.equivaleAUnidadBase || 0) - objetivoBase) < 0.0001
        );
        if (porBase) return porBase;
    }

    return presentaciones[0];
};

export const buscarEnCatalogo = (catalogo, { codigoBarras, nombre, medida } = {}) => {
    if (!catalogo?.productos) return null;
    const indice = catalogo.indice || construirIndice(catalogo.productos);

    const codigo = normalizarCodigoBarras(codigoBarras);
    if (codigo) {
        const referencia = indice.porCodigo?.[rutaSegura(codigo)];
        if (referencia) {
            const [productoId, presentacionId] = String(referencia).split(":");
            const producto = catalogo.productos[productoId];
            if (producto && producto.activo !== false) {
                return {
                    producto,
                    presentacion: presentacionId
                        ? producto.presentaciones?.[presentacionId] || null
                        : elegirPresentacion(producto, medida),
                    motivo: "codigo",
                };
            }
        }
    }

    const clave = normalizarClaveProducto(nombre);
    if (!clave) return null;

    const productoIdExacto = indice.porClave?.[rutaSegura(clave)];
    const productoExacto = productoIdExacto ? catalogo.productos[productoIdExacto] : null;
    if (productoExacto && productoExacto.activo !== false) {
        return {
            producto: productoExacto,
            presentacion: elegirPresentacion(productoExacto, medida),
            motivo: "nombre_exacto",
        };
    }

    // Coincidencia parcial: una clave contiene a la otra ("atunherdez" vs "atunherdez140g").
    // Se exige un mínimo de 4 caracteres para no emparejar cualquier cosa.
    if (clave.length < 4) return null;
    const candidatos = Object.values(catalogo.productos).filter((producto) => {
        if (producto.activo === false || !producto.clave || producto.clave.length < 4) return false;
        return producto.clave.includes(clave) || clave.includes(producto.clave);
    });

    if (candidatos.length === 0) return null;

    const producto = candidatos.sort(
        (a, b) => Math.abs(a.clave.length - clave.length) - Math.abs(b.clave.length - clave.length)
    )[0];
    return {
        producto,
        presentacion: elegirPresentacion(producto, medida),
        motivo: "nombre_parcial",
    };
};

/* ═════════════════════  Acceso al documento  ═════════════════════ */

/**
 * updateDoc sobre el catálogo, creándolo si aún no existe.
 * Centralizado para que todas las escrituras compartan el mismo fallback.
 */
const actualizarCatalogo = async (uid, payload) => {
    const ref = catalogoRef(uid);
    const materializado = materializarPayload(payload);
    try {
        await updateDoc(ref, materializado);
    } catch (error) {
        if (error?.code !== "not-found") throw error;
        await setDoc(ref, crearCatalogoBase());
        await updateDoc(ref, materializado);
    }
};

/**
 * Reconstruye el catálogo v2 desde el modelo viejo (N documentos en productos/items
 * más el documento inventario). Cuesta N+1 lecturas UNA sola vez; a partir de ahí
 * la despensa se abre siempre con 1 lectura.
 */
const migrarDesdeModeloViejo = async (uid) => {
    const [inventarioSnap, productosSnap] = await Promise.all([
        getDoc(inventarioRefLegacy(uid)),
        getDocs(query(productosRefLegacy(uid), where("activo", "==", true))),
    ]);

    const inventarioViejo = inventarioSnap.exists() ? inventarioSnap.data() : {};
    const catalogo = crearCatalogoBase();

    productosSnap.docs.forEach((productoDoc) => {
        const viejo = { id: productoDoc.id, ...productoDoc.data() };
        const resumenViejo = inventarioViejo.productos?.[viejo.id] || {};
        const stockPorPresentacion = resumenViejo.stockPorPresentacion || {};
        const presentaciones = {};

        (viejo.presentaciones || []).forEach((presentacion) => {
            const stockViejo = stockPorPresentacion[presentacion.id] || {};
            const stockActual = Number(stockViejo.stockActual || 0);

            // Los lotes FIFO se colapsan a su costo promedio ponderado.
            const lotes = stockViejo.lotesCompra || [];
            const unidadesEnLotes = lotes.reduce((total, lote) => total + Number(lote.cantidadDisponible || 0), 0);
            const valorEnLotes = lotes.reduce(
                (total, lote) => total + (Number(lote.cantidadDisponible || 0) * Number(lote.costoUnitario || 0)),
                0
            );
            const costoReferencia = unidadesEnLotes > 0
                ? valorEnLotes / unidadesEnLotes
                : Number(stockViejo.costoUnitarioFallback || stockViejo.ultimoPrecioPagado || presentacion.precioAproximado || 0);

            presentaciones[presentacion.id] = {
                id: presentacion.id,
                nombre: presentacion.nombre,
                cantidad: Number(presentacion.cantidad || 1),
                unidad: presentacion.unidad,
                equivaleAUnidadBase: presentacion.equivaleAUnidadBase ?? null,
                convertible: presentacion.convertible ?? (presentacion.equivaleAUnidadBase !== null),
                precioAproximado: Number(presentacion.precioAproximado || 0),
                buenPrecio: Number(presentacion.buenPrecio || 0),
                codigoBarras: normalizarCodigoBarras(presentacion.codigoBarras),
                codigoNota: presentacion.codigoNota || "",
                imagen: presentacion.imagen || null,
                activa: presentacion.activa !== false,

                // El stock existente se toma como "ya ingresado" para que el costo
                // promedio arranque con un valor razonable en vez de cero.
                stockActual: redondear(stockActual, 2),
                totalIngresado: redondear(stockActual, 2),
                totalConsumido: 0,
                totalGastado: redondear(stockActual * costoReferencia, 2),
                vecesComprado: stockActual > 0 ? 1 : 0,
                ultimoPrecioPagado: redondear(Number(stockViejo.ultimoPrecioPagado || costoReferencia), 2),
                precioMinimoHistorico: redondear(costoReferencia, 2),
                precioMaximoHistorico: redondear(costoReferencia, 2),
                ultimaCompra: resumenViejo.ultimaFechaMovimiento || null,
            };
        });

        const nombre = viejo.nombre || "";
        const listaPresentaciones = Object.values(presentaciones);
        catalogo.productos[viejo.id] = {
            id: viejo.id,
            nombre,
            clave: normalizarClaveProducto(nombre),
            categoria: viejo.categoria || "Otros",
            grupo: viejo.grupo || "",
            marca: viejo.marca || "",
            codigoBarras: normalizarCodigoBarras(viejo.codigoBarras),
            activo: true,
            medible: viejo.medible !== false,
            unidadBase: viejo.unidadBase || "pz",
            stockMinimo: Number(viejo.stockMinimo || 0),
            unidadesPermitidas: viejo.unidadesPermitidas || [viejo.unidadBase || "pz"],
            presentaciones,
            origen: viejo.origen || "manual",
            imagen: viejo.imagen || null,
            necesario: Boolean(resumenViejo.necesario),
            totalIngresado: redondear(listaPresentaciones.reduce((total, p) => total + p.totalIngresado, 0), 2),
            totalConsumido: 0,
            totalGastado: redondear(listaPresentaciones.reduce((total, p) => total + p.totalGastado, 0), 2),
            vecesComprado: 0,
            ultimaFechaMovimiento: resumenViejo.ultimaFechaMovimiento || null,
            createdAt: viejo.createdAt || Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
    });

    catalogo.totalProductos = Object.keys(catalogo.productos).length;
    catalogo.indice = construirIndice(catalogo.productos);
    catalogo.gastoPorMes = {
        [obtenerMesKey(new Date())]: redondear(Number(inventarioViejo.gastoMesActual || 0), 2),
    };
    catalogo.migradoDesde = "v1";
    catalogo.migradoEn = Timestamp.now();

    await setDoc(catalogoRef(uid), catalogo);
    return catalogo;
};

const leerCatalogo = async (uid) => {
    const snap = await getDoc(catalogoRef(uid));
    if (!snap.exists()) return migrarDesdeModeloViejo(uid);
    return snap.data();
};

/**
 * Carga la despensa completa. Cuesta 1 lectura (o N+1 la primera vez, al migrar).
 * Devuelve también el catálogo crudo, para que la UI pueda hacer matching y
 * registrar tickets sin ninguna lectura extra.
 */
export const obtenerDespensa = async (uid) => {
    const catalogo = await leerCatalogo(uid);
    return {
        catalogo,
        inventario: derivarInventario(catalogo),
        productos: derivarProductos(catalogo),
    };
};

/* ═════════════════════  Escritura  ═════════════════════ */

const construirResultado = (catalogo, payload, extra = {}) => {
    const catalogoActualizado = aplicarCambiosEnMemoria(catalogo, payload);
    return {
        catalogo: catalogoActualizado,
        inventario: derivarInventario(catalogoActualizado),
        productos: derivarProductos(catalogoActualizado),
        ...extra,
    };
};

export const crearProductoDespensa = async (uid, values) => {
    const catalogo = values.catalogo || await leerCatalogo(uid);
    const productoId = generarId("prod");
    const producto = construirProducto(productoId, values);
    const presentacion = Object.values(producto.presentaciones)[0];

    const payload = {
        [`productos.${productoId}`]: producto,
        totalProductos: INC(1),
        updatedAt: Timestamp.now(),
    };
    if (producto.clave) payload[`indice.porClave.${rutaSegura(producto.clave)}`] = productoId;
    if (producto.codigoBarras) payload[`indice.porCodigo.${rutaSegura(producto.codigoBarras)}`] = productoId;
    if (presentacion?.codigoBarras) {
        payload[`indice.porCodigo.${rutaSegura(presentacion.codigoBarras)}`] = `${productoId}:${presentacion.id}`;
    }

    await actualizarCatalogo(uid, payload);
    return construirResultado(catalogo, payload, {
        producto: { ...producto, presentaciones: [presentacion] },
    });
};

export const agregarPresentacionDespensa = async (uid, productoId, values) => {
    const catalogo = values.catalogo || await leerCatalogo(uid);
    const producto = catalogo.productos?.[productoId];
    if (!producto) throw new Error("Producto no encontrado");

    const presentacion = crearPresentacion(values, producto.unidadBase);
    const payload = {
        [`productos.${productoId}.presentaciones.${presentacion.id}`]: presentacion,
        [`productos.${productoId}.updatedAt`]: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    if (presentacion.codigoBarras) {
        payload[`indice.porCodigo.${rutaSegura(presentacion.codigoBarras)}`] = `${productoId}:${presentacion.id}`;
    }

    await actualizarCatalogo(uid, payload);
    return construirResultado(catalogo, payload, { presentacion });
};

export const actualizarProductoDespensa = async (uid, productoId, values) => {
    const catalogo = values.catalogo || await leerCatalogo(uid);
    const productoActual = catalogo.productos?.[productoId];
    if (!productoActual) throw new Error("Producto no encontrado");

    const nombre = values.nombre ?? productoActual.nombre;
    const clave = normalizarClaveProducto(nombre);
    const codigoBarras = values.codigoBarras !== undefined
        ? normalizarCodigoBarras(values.codigoBarras)
        : productoActual.codigoBarras || "";

    const cambios = {
        nombre,
        clave,
        categoria: values.categoria ?? productoActual.categoria,
        grupo: values.grupo ?? productoActual.grupo ?? "",
        marca: values.marca ?? productoActual.marca ?? "",
        codigoBarras,
        activo: values.activo ?? productoActual.activo,
        medible: values.medible ?? productoActual.medible,
        unidadBase: values.unidadBase ?? productoActual.unidadBase,
        stockMinimo: values.stockMinimo !== undefined
            ? Number(values.stockMinimo || 0)
            : Number(productoActual.stockMinimo || 0),
        unidadesPermitidas: values.unidadesPermitidas
            ? String(values.unidadesPermitidas).split(",").map((unidad) => unidad.trim()).filter(Boolean)
            : productoActual.unidadesPermitidas || [],
        updatedAt: Timestamp.now(),
    };

    const payload = { updatedAt: Timestamp.now() };
    Object.entries(cambios).forEach(([campo, valor]) => {
        payload[`productos.${productoId}.${campo}`] = valor;
    });

    // Reindexar si cambió el nombre o el código de barras
    if (productoActual.clave && productoActual.clave !== clave) {
        payload[`indice.porClave.${rutaSegura(productoActual.clave)}`] = BORRAR;
    }
    if (clave) payload[`indice.porClave.${rutaSegura(clave)}`] = productoId;
    if (productoActual.codigoBarras && productoActual.codigoBarras !== codigoBarras) {
        payload[`indice.porCodigo.${rutaSegura(productoActual.codigoBarras)}`] = BORRAR;
    }
    if (codigoBarras) payload[`indice.porCodigo.${rutaSegura(codigoBarras)}`] = productoId;

    await actualizarCatalogo(uid, payload);
    const resultado = construirResultado(catalogo, payload);
    return { ...resultado, producto: resultado.catalogo.productos[productoId] };
};

export const actualizarPresentacionDespensa = async (uid, productoId, presentacionId, values) => {
    const catalogo = values.catalogo || await leerCatalogo(uid);
    const producto = catalogo.productos?.[productoId];
    if (!producto) throw new Error("Producto no encontrado");
    const presentacion = producto.presentaciones?.[presentacionId];
    if (!presentacion) throw new Error("Presentación no encontrada");

    const cantidad = values.presentacionCantidad !== undefined
        ? Number(values.presentacionCantidad || 0)
        : Number(presentacion.cantidad || 0);
    const unidad = values.presentacionUnidad || presentacion.unidad;
    const equivaleAUnidadBase = calcularEquivalenciaBase({
        cantidad,
        unidad,
        unidadBase: producto.unidadBase,
        equivalenciaBase: values.equivalenciaBase !== undefined ? values.equivalenciaBase : presentacion.equivaleAUnidadBase,
    });
    const codigoBarras = values.codigoBarras !== undefined
        ? normalizarCodigoBarras(values.codigoBarras)
        : presentacion.codigoBarras || "";

    const cambios = {
        nombre: values.presentacionNombre ?? presentacion.nombre,
        cantidad,
        unidad,
        equivaleAUnidadBase,
        convertible: equivaleAUnidadBase !== null,
        precioAproximado: values.precioAproximado !== undefined
            ? Number(values.precioAproximado || 0)
            : Number(presentacion.precioAproximado || 0),
        buenPrecio: values.buenPrecio !== undefined
            ? Number(values.buenPrecio || 0)
            : Number(presentacion.buenPrecio || 0),
        codigoBarras,
        codigoNota: values.codigoNota ?? presentacion.codigoNota ?? "",
        activa: values.activa ?? presentacion.activa,
    };

    const payload = {
        [`productos.${productoId}.updatedAt`]: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    Object.entries(cambios).forEach(([campo, valor]) => {
        payload[`productos.${productoId}.presentaciones.${presentacionId}.${campo}`] = valor;
    });

    if (presentacion.codigoBarras && presentacion.codigoBarras !== codigoBarras) {
        payload[`indice.porCodigo.${rutaSegura(presentacion.codigoBarras)}`] = BORRAR;
    }
    if (codigoBarras) payload[`indice.porCodigo.${rutaSegura(codigoBarras)}`] = `${productoId}:${presentacionId}`;

    await actualizarCatalogo(uid, payload);
    const resultado = construirResultado(catalogo, payload);
    return { ...resultado, producto: resultado.catalogo.productos[productoId] };
};

/**
 * Registra un ticket completo.
 *
 * Costo: 0 lecturas (si se pasa `values.catalogo`) y 2 escrituras, sin importar
 * cuántos renglones traiga el ticket.
 *
 * Cada renglón puede traer `productoNuevo: true` para dar de alta el producto en
 * la misma operación.
 */
export const registrarTicketDespensa = async (uid, values) => {
    const catalogo = values.catalogo || await leerCatalogo(uid);
    const fechaCompra = obtenerFechaDesdeInput(values.fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaCompra);
    const mesKey = obtenerMesKey(fechaCompra);
    const totalTicket = Number(values.totalTicket || 0);

    const itemsEntrada = (values.items || []).filter((item) => Number(item.cantidadComprada || 0) > 0
        && (item.productoNuevo ? Boolean(item.nombre) : Boolean(item.productoId && item.presentacionId)));

    if (itemsEntrada.length === 0) {
        throw new Error("Agrega al menos un producto al ticket");
    }

    const compraDocRef = doc(comprasRef(uid));
    const payload = { updatedAt: Timestamp.now() };
    const itemsCompra = [];
    const movimientos = [];
    let subtotalDetallado = 0;
    let productosNuevos = 0;

    /*
     * Firestore rechaza un update que toque un campo y un descendiente suyo a la
     * vez. Para los productos creados en este mismo ticket escribimos el objeto
     * completo y acumulamos las cantidades DENTRO de él, en lugar de emitir rutas
     * con increment(). `creadosAqui` lleva la cuenta de cuáles son.
     */
    const creadosAqui = new Map();
    const nuevosPorClave = new Map();
    const productosDelCatalogo = { ...(catalogo.productos || {}) };

    for (const item of itemsEntrada) {
        let productoId = item.productoId;
        let presentacionId = item.presentacionId;
        let producto = productosDelCatalogo[productoId];
        let presentacion = producto?.presentaciones?.[presentacionId];

        // Alta inline: el producto no existía, se crea junto con el ticket
        if (!producto || !presentacion) {
            if (!item.productoNuevo) {
                throw new Error(`No encontré "${item.nombre || productoId}" en el catálogo`);
            }

            const clave = normalizarClaveProducto(item.nombre);

            // Si el mismo producto aparece en varios renglones del ticket, se da de
            // alta una sola vez y los renglones siguientes suman sobre él.
            const yaCreadoId = clave ? nuevosPorClave.get(clave) : null;
            // Y si en realidad ya existía en el catálogo (coincidencia exacta de
            // clave), se reutiliza en lugar de crear un duplicado.
            const existenteId = !yaCreadoId && clave
                ? catalogo.indice?.porClave?.[rutaSegura(clave)]
                : null;

            const reutilizarId = yaCreadoId || (productosDelCatalogo[existenteId] ? existenteId : null);

            if (reutilizarId) {
                productoId = reutilizarId;
                producto = productosDelCatalogo[productoId];
                presentacion = Object.values(producto.presentaciones || {})[0];
                presentacionId = presentacion?.id;
                if (!presentacion) throw new Error(`"${item.nombre}" no tiene presentaciones`);
            } else {
                productoId = generarId("prod");
                producto = construirProducto(productoId, item);
                presentacion = Object.values(producto.presentaciones)[0];
                presentacionId = presentacion.id;

                payload[`productos.${productoId}`] = producto;
                if (producto.clave) payload[`indice.porClave.${rutaSegura(producto.clave)}`] = productoId;
                if (producto.codigoBarras) payload[`indice.porCodigo.${rutaSegura(producto.codigoBarras)}`] = productoId;
                if (presentacion.codigoBarras) {
                    payload[`indice.porCodigo.${rutaSegura(presentacion.codigoBarras)}`] = `${productoId}:${presentacionId}`;
                }
                productosDelCatalogo[productoId] = producto;
                creadosAqui.set(productoId, producto);
                if (clave) nuevosPorClave.set(clave, productoId);
                productosNuevos += 1;
            }
        }

        const cantidadComprada = Number(item.cantidadComprada || 0);
        const precioTotalItem = Number(item.precioTotalItem || 0);
        const { precioUnitario, origenCosto } = obtenerPrecioUnitarioEntrada(precioTotalItem, cantidadComprada, presentacion);
        const gastoItem = redondear(precioUnitario * cantidadComprada, 2);
        const equivalencia = Number(presentacion.equivaleAUnidadBase || 0);
        const costoUnitarioBase = equivalencia ? redondear(precioUnitario / equivalencia, 4) : 0;

        const productoCreado = creadosAqui.get(productoId);
        if (productoCreado) {
            // Se acumula dentro del objeto que ya vamos a escribir completo.
            const pres = productoCreado.presentaciones[presentacionId];
            pres.stockActual = redondear(pres.stockActual + cantidadComprada, 2);
            pres.totalIngresado = redondear(pres.totalIngresado + cantidadComprada, 2);
            pres.totalGastado = redondear(pres.totalGastado + gastoItem, 2);
            pres.vecesComprado += 1;
            pres.ultimoPrecioPagado = redondear(precioUnitario, 2);
            pres.ultimaCompra = fechaTimestamp;
            if (precioUnitario > 0 && (pres.precioMinimoHistorico === 0 || precioUnitario < pres.precioMinimoHistorico)) {
                pres.precioMinimoHistorico = redondear(precioUnitario, 2);
            }
            if (precioUnitario > pres.precioMaximoHistorico) {
                pres.precioMaximoHistorico = redondear(precioUnitario, 2);
            }
            productoCreado.totalIngresado = redondear(productoCreado.totalIngresado + cantidadComprada, 2);
            productoCreado.totalGastado = redondear(productoCreado.totalGastado + gastoItem, 2);
            productoCreado.vecesComprado += 1;
            productoCreado.ultimaFechaMovimiento = fechaTimestamp;
        } else {
            const rutaPres = `productos.${productoId}.presentaciones.${presentacionId}`;

            // Acumuladores atómicos: no requieren haber leído el valor anterior.
            // Se suman con `acumular` porque un mismo producto o presentación puede
            // aparecer en más de un renglón del ticket.
            acumular(payload, `${rutaPres}.stockActual`, cantidadComprada);
            acumular(payload, `${rutaPres}.totalIngresado`, cantidadComprada);
            acumular(payload, `${rutaPres}.totalGastado`, gastoItem);
            acumular(payload, `${rutaPres}.vecesComprado`, 1);
            payload[`${rutaPres}.ultimoPrecioPagado`] = redondear(precioUnitario, 2);
            payload[`${rutaPres}.ultimaCompra`] = fechaTimestamp;

            // Mín/máx histórico: se comparan contra la copia en memoria.
            const minActual = Number(presentacion.precioMinimoHistorico || 0);
            const maxActual = Number(presentacion.precioMaximoHistorico || 0);
            if (precioUnitario > 0 && (minActual === 0 || precioUnitario < minActual)) {
                payload[`${rutaPres}.precioMinimoHistorico`] = redondear(precioUnitario, 2);
            }
            if (precioUnitario > maxActual) {
                payload[`${rutaPres}.precioMaximoHistorico`] = redondear(precioUnitario, 2);
            }

            acumular(payload, `productos.${productoId}.totalIngresado`, cantidadComprada);
            acumular(payload, `productos.${productoId}.totalGastado`, gastoItem);
            acumular(payload, `productos.${productoId}.vecesComprado`, 1);
            payload[`productos.${productoId}.ultimaFechaMovimiento`] = fechaTimestamp;
            payload[`productos.${productoId}.updatedAt`] = Timestamp.now();
        }

        subtotalDetallado += precioTotalItem;

        itemsCompra.push({
            productoId,
            presentacionId,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidadComprada,
            unidadCompra: presentacion.unidad,
            codigoBarras: normalizarCodigoBarras(item.codigoBarras) || presentacion.codigoBarras || producto.codigoBarras || "",
            precioUnitario: redondear(precioUnitario, 2),
            precioTotalItem: redondear(precioTotalItem, 2),
            costoEntradaTotal: gastoItem,
            costoUnitarioBase,
            equivaleAUnidadBase: presentacion.equivaleAUnidadBase ?? null,
            metodoValuacion: "WAC",
            origenCosto,
            evaluacionPrecio: evaluarPrecio(presentacion, precioUnitario),
            productoCreado: Boolean(creadosAqui.get(productoId)),
            nota: item.nota || "",
        });

        movimientos.push({
            id: generarId("mov"),
            compraId: compraDocRef.id,
            fecha: fechaTimestamp,
            tipo: "entrada_compra",
            productoId,
            presentacionId,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad: cantidadComprada,
            cantidadFirmada: cantidadComprada,
            costoMovimiento: gastoItem,
            motivo: item.nota || values.nota || "Compra registrada",
        });
    }

    if (productosNuevos > 0) {
        payload.totalProductos = INC(productosNuevos);
    }

    const subtotal = redondear(subtotalDetallado, 2);
    const gastoRegistrado = redondear(totalTicket || subtotal, 2);
    payload[`gastoPorMes.${mesKey}`] = INC(gastoRegistrado);

    const diferenciaNoAsignada = totalTicket > 0 ? redondear(totalTicket - subtotal, 2) : 0;
    const estadoDetalle = totalTicket > 0
        ? Math.abs(diferenciaNoAsignada) <= 1 ? "completo" : "parcial"
        : subtotal > 0 ? "detallado_sin_total" : "estimado";

    const compra = {
        id: compraDocRef.id,
        fecha: fechaTimestamp,
        tienda: values.tienda || "",
        totalTicket,
        subtotalDetallado: subtotal,
        diferenciaNoAsignada,
        moneda: "MXN",
        estadoDetalle,
        metodoCaptura: values.metodoCaptura || "detallada",
        notas: values.nota || "",
        items: itemsCompra,
        movimientos,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    const anioKey = String(fechaCompra.getFullYear());

    // Guarda catálogo y ticket consolidado en el documento anual de compras.
    // También guarda compraDocRef para mantener compatibilidad histórica total.
    await Promise.all([
        actualizarCatalogo(uid, payload),
        setDoc(comprasAnioRef(uid, anioKey), { compras: arrayUnion(compra) }, { merge: true }),
        setDoc(compraDocRef, compra),
    ]);

    return construirResultado(catalogo, payload, {
        compra: { id: compraDocRef.id, items: itemsCompra },
        productosNuevos,
    });
};

/**
 * Consumo o ajuste de stock. 0 lecturas si se pasa `values.catalogo`.
 */
export const registrarMovimientoDespensa = async (uid, values) => {
    const catalogo = values.catalogo || await leerCatalogo(uid);
    const cantidad = Number(values.cantidad || 0);

    if (!values.productoId || !values.presentacionId || cantidad <= 0) {
        throw new Error("El movimiento necesita producto, presentación y cantidad mayor a 0");
    }

    const producto = catalogo.productos?.[values.productoId];
    if (!producto) throw new Error("Producto no encontrado");
    const presentacion = producto.presentaciones?.[values.presentacionId];
    if (!presentacion) throw new Error("Presentación no encontrada");

    const signo = values.tipo === "salida" || values.tipo === "ajuste_negativo" ? -1 : 1;
    const stockActual = Number(presentacion.stockActual || 0);
    const nuevoStock = stockActual + (cantidad * signo);

    if (nuevoStock < 0 && !values.forzarNegativo) {
        throw new Error("No se puede dejar stock negativo");
    }

    const fechaMovimiento = obtenerFechaDesdeInput(values.fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaMovimiento);
    const mesKey = obtenerMesKey(fechaMovimiento);
    const rutaPres = `productos.${values.productoId}.presentaciones.${values.presentacionId}`;
    const costoPromedio = calcularCostoPromedio(presentacion);

    const payload = {
        [`${rutaPres}.stockActual`]: INC(redondear(cantidad * signo, 2)),
        [`productos.${values.productoId}.ultimaFechaMovimiento`]: fechaTimestamp,
        [`productos.${values.productoId}.updatedAt`]: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    if (signo < 0) {
        payload[`${rutaPres}.totalConsumido`] = INC(cantidad);
        payload[`productos.${values.productoId}.totalConsumido`] = INC(cantidad);
    } else {
        // Una entrada por ajuste también alimenta el costo promedio.
        const { precioUnitario } = obtenerPrecioUnitarioEntrada(values.precioTotalItem, cantidad, presentacion);
        const gasto = redondear(precioUnitario * cantidad, 2);
        payload[`${rutaPres}.totalIngresado`] = INC(cantidad);
        payload[`${rutaPres}.totalGastado`] = INC(gasto);
        payload[`productos.${values.productoId}.totalIngresado`] = INC(cantidad);
        payload[`productos.${values.productoId}.totalGastado`] = INC(gasto);
    }

    const movimiento = {
        id: generarId("mov"),
        fecha: fechaTimestamp,
        tipo: values.tipo || "salida",
        productoId: values.productoId,
        presentacionId: values.presentacionId,
        nombreSnapshot: producto.nombre,
        presentacionSnapshot: presentacion.nombre,
        cantidad,
        cantidadFirmada: cantidad * signo,
        metodoValuacion: "WAC",
        costoMovimiento: redondear(cantidad * costoPromedio, 2),
        motivo: values.motivo || "",
        createdAt: Timestamp.now(),
    };

    // Los movimientos se agrupan por mes en un solo documento, siguiendo la misma
    // convención que los movimientos financieros de la app.
    await Promise.all([
        actualizarCatalogo(uid, payload),
        setDoc(movimientosMesRef(uid, mesKey), { movimientos: arrayUnion(movimiento) }, { merge: true }),
    ]);

    return construirResultado(catalogo, payload, { movimiento });
};

export const marcarNecesarioDespensa = async (uid, productoId, necesario, catalogoEnMemoria) => {
    const catalogo = catalogoEnMemoria || await leerCatalogo(uid);
    if (!catalogo.productos?.[productoId]) return null;

    const payload = {
        [`productos.${productoId}.necesario`]: Boolean(necesario),
        updatedAt: Timestamp.now(),
    };
    await actualizarCatalogo(uid, payload);
    return construirResultado(catalogo, payload);
};

export const desactivarProductoDespensa = async (uid, productoId, catalogoEnMemoria) => {
    const catalogo = catalogoEnMemoria || await leerCatalogo(uid);
    const producto = catalogo.productos?.[productoId];
    if (!producto) return null;

    const payload = {
        [`productos.${productoId}.activo`]: false,
        [`productos.${productoId}.updatedAt`]: Timestamp.now(),
        totalProductos: INC(-1),
        updatedAt: Timestamp.now(),
    };
    if (producto.clave) payload[`indice.porClave.${rutaSegura(producto.clave)}`] = BORRAR;
    if (producto.codigoBarras) payload[`indice.porCodigo.${rutaSegura(producto.codigoBarras)}`] = BORRAR;
    Object.values(producto.presentaciones || {}).forEach((presentacion) => {
        if (presentacion.codigoBarras) {
            payload[`indice.porCodigo.${rutaSegura(presentacion.codigoBarras)}`] = BORRAR;
        }
    });

    await actualizarCatalogo(uid, payload);
    return construirResultado(catalogo, payload);
};

export const desactivarPresentacionDespensa = async (uid, productoId, presentacionId, catalogoEnMemoria) => {
    const catalogo = catalogoEnMemoria || await leerCatalogo(uid);
    const producto = catalogo.productos?.[productoId];
    if (!producto) throw new Error("Producto no encontrado");
    const presentacion = producto.presentaciones?.[presentacionId];
    if (!presentacion) throw new Error("Presentación no encontrada");

    const payload = {
        [`productos.${productoId}.presentaciones.${presentacionId}.activa`]: false,
        [`productos.${productoId}.updatedAt`]: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    if (presentacion.codigoBarras) {
        payload[`indice.porCodigo.${rutaSegura(presentacion.codigoBarras)}`] = BORRAR;
    }

    await actualizarCatalogo(uid, payload);
    return construirResultado(catalogo, payload);
};

export const ajustarStockFisicoDespensa = async (uid, { productoId, presentacionId, nuevoStock, motivo, catalogo: catalogoParam }) => {
    const catalogo = catalogoParam || await leerCatalogo(uid);
    const producto = catalogo.productos?.[productoId];
    if (!producto) throw new Error("Producto no encontrado");
    const presentacion = producto.presentaciones?.[presentacionId];
    if (!presentacion) throw new Error("Presentación no encontrada");

    const stockActual = Number(presentacion.stockActual || 0);
    const nuevoStockNum = Number(nuevoStock || 0);
    if (nuevoStockNum < 0) throw new Error("El stock no puede ser negativo");

    const delta = redondear(nuevoStockNum - stockActual, 2);
    if (delta === 0) {
        return { catalogo, inventario: derivarInventario(catalogo), productos: derivarProductos(catalogo) };
    }

    const tipo = delta > 0 ? "ajuste_positivo" : "ajuste_negativo";
    return registrarMovimientoDespensa(uid, {
        catalogo,
        productoId,
        presentacionId,
        cantidad: Math.abs(delta),
        tipo,
        motivo: motivo || `Conteo físico: ajuste de ${stockActual} a ${nuevoStockNum}`,
        fecha: new Date().toISOString().slice(0, 10),
    });
};

export const obtenerHistorialComprasDespensa = async (uid, anio = new Date().getFullYear()) => {
    if (!uid) return [];
    const anioStr = String(anio);
    try {
        const snap = await getDoc(comprasAnioRef(uid, anioStr));
        let compras = [];
        if (snap.exists()) {
            compras = snap.data().compras || [];
        }

        // Consultar colección legacy si el documento anual no contiene registros
        if (compras.length === 0) {
            try {
                const legacySnap = await getDocs(comprasRef(uid));
                legacySnap.docs.forEach((docSnap) => {
                    const data = { id: docSnap.id, ...docSnap.data() };
                    const fechaObj = data.fecha?.toDate?.() || new Date(data.fecha || 0);
                    if (String(fechaObj.getFullYear()) === anioStr) {
                        compras.push(data);
                    }
                });
            } catch (legacyError) {
                console.warn("No se pudieron cargar compras legacy:", legacyError);
            }
        }

        return compras.sort((a, b) => {
            const fechaA = a.fecha?.toDate?.() || new Date(a.fecha || 0);
            const fechaB = b.fecha?.toDate?.() || new Date(b.fecha || 0);
            return fechaB - fechaA;
        });
    } catch (error) {
        console.error("Error al obtener compras de despensa:", error);
        return [];
    }
};

export const obtenerHistorialMovimientosDespensa = async (uid, mesKey) => {
    if (!uid || !mesKey) return [];
    try {
        const snap = await getDoc(movimientosMesRef(uid, mesKey));
        if (!snap.exists()) return [];
        const data = snap.data();
        return (data.movimientos || []).sort((a, b) => {
            const fechaA = a.fecha?.toDate?.() || new Date(a.fecha || 0);
            const fechaB = b.fecha?.toDate?.() || new Date(b.fecha || 0);
            return fechaB - fechaA;
        });
    } catch (error) {
        console.error("Error al obtener movimientos de despensa:", error);
        return [];
    }
};

export const puedeConvertirUnidadDespensa = unidadesCompatibles;

/**
 * Entrada exprés de inventario: con solo 3 datos indispensables
 * (producto, cantidad, precio), crea el producto y presentación si no existen
 * y actualiza el stock y precio en una sola transacción.
 */
export const registrarEntradaRapidaDespensa = async (uid, {
    nombreProducto,
    nombrePresentacion,
    presentacionId = null,
    cantidadComprada = 1,
    unidad = "pz",
    costoTotal = 0,
    buenPrecio = 0,
    area = null,
    categoria = "Despensa",
    icono = null,
    tienda = "",
    fecha = new Date(),
    catalogo: catalogoParam,
}) => {
    const catalogo = catalogoParam || await leerCatalogo(uid);
    const cant = Number(cantidadComprada || 1);
    const costo = Number(costoTotal || 0);
    const buenP = Number(buenPrecio || 0);

    const nombreProdLimpio = String(nombreProducto || "").trim();
    if (!nombreProdLimpio) throw new Error("Debes indicar el nombre del producto");

    const claveBuscada = normalizarClaveProducto(nombreProdLimpio);
    let productoId = catalogo.indice?.porClave?.[rutaSegura(claveBuscada)];
    let producto = productoId ? catalogo.productos?.[productoId] : null;

    if (!producto) {
        producto = Object.values(catalogo.productos || {}).find(
            (p) => p.activo && normalizarClaveProducto(p.nombre) === claveBuscada,
        );
        if (producto) productoId = producto.id;
    }

    let productosNuevos = 0;
    const payload = { updatedAt: Timestamp.now() };

    if (!producto) {
        productoId = generarId("prod");
        const unidadBase = ["g", "kg"].includes(unidad) ? "kg" : ["ml", "L"].includes(unidad) ? "L" : "pz";
        const resolved = resolverAreaYCategoria({ nombre: nombreProdLimpio, area, categoria });
        const areaFinal = area || resolved.area;
        const categoriaFinal = categoria && categoria !== "Despensa" ? categoria : resolved.categoria;

        producto = {
            id: productoId,
            nombre: nombreProdLimpio,
            clave: claveBuscada,
            area: areaFinal,
            categoria: categoriaFinal,
            grupo: categoriaFinal,
            marca: "",
            codigoBarras: "",
            activo: true,
            medible: true,
            unidadBase,
            stockMinimo: 1,
            unidadesPermitidas: [unidadBase, unidad].filter(Boolean),
            presentaciones: {},
            origen: "entrada_rapida",
            imagen: icono || null,
            necesario: false,
            totalIngresado: 0,
            totalConsumido: 0,
            totalGastado: 0,
            vecesComprado: 0,
            ultimaFechaMovimiento: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        payload[`productos.${productoId}`] = producto;
        payload[`indice.porClave.${rutaSegura(claveBuscada)}`] = productoId;
        productosNuevos += 1;
    } else {
        if (area && producto.area !== area) {
            payload[`productos.${productoId}.area`] = area;
            producto.area = area;
        }
        if (categoria && producto.categoria !== categoria) {
            payload[`productos.${productoId}.categoria`] = categoria;
            producto.categoria = categoria;
        }
        if (icono && (!producto.imagen || producto.imagen.includes("placeholder"))) {
            payload[`productos.${productoId}.imagen`] = icono;
            producto.imagen = icono;
        }
    }

    const presentacionesActuales = Object.values(producto.presentaciones || {});
    const nombrePresLimpio = String(nombrePresentacion || "").trim() || `${cant} ${unidad}`;

    let presentacion = null;
    if (presentacionId && producto.presentaciones?.[presentacionId]) {
        presentacion = producto.presentaciones[presentacionId];
    } else {
        presentacion = presentacionesActuales.find(
            (pr) => pr.activa && (
                pr.nombre.toLowerCase() === nombrePresLimpio.toLowerCase()
            ),
        );
    }

    if (!presentacion) {
        const presId = generarId("pres");
        const equivaleAUnidadBase = calcularEquivalenciaBase({
            cantidad: cant,
            unidad,
            unidadBase: producto.unidadBase || "pz",
        });
        presentacion = {
            id: presId,
            nombre: nombrePresLimpio,
            cantidad: cant,
            unidad,
            equivaleAUnidadBase,
            convertible: equivaleAUnidadBase !== null,
            precioAproximado: cant > 0 && costo > 0 ? redondear(costo / cant, 2) : 0,
            buenPrecio: buenP,
            codigoBarras: "",
            codigoNota: "",
            imagen: icono || null,
            activa: true,
            stockActual: 0,
            totalIngresado: 0,
            totalConsumido: 0,
            totalGastado: 0,
            vecesComprado: 0,
            ultimoPrecioPagado: 0,
            precioMinimoHistorico: 0,
            precioMaximoHistorico: 0,
            ultimaCompra: null,
        };
        payload[`productos.${productoId}.presentaciones.${presId}`] = presentacion;
        producto.presentaciones = { ...producto.presentaciones, [presId]: presentacion };
    }

    const rutaPres = `productos.${productoId}.presentaciones.${presentacion.id}`;
    const precioUnitario = cant > 0 && costo > 0 ? redondear(costo / cant, 2) : 0;
    const fechaEntrada = obtenerFechaDesdeInput(fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaEntrada);
    const mesKey = obtenerMesKey(fechaEntrada);
    const anioKey = String(fechaEntrada.getFullYear());

    payload[`${rutaPres}.stockActual`] = INC(cant);
    payload[`${rutaPres}.totalIngresado`] = INC(cant);
    payload[`${rutaPres}.totalGastado`] = INC(costo);
    payload[`${rutaPres}.vecesComprado`] = INC(1);
    payload[`${rutaPres}.ultimaCompra`] = fechaTimestamp;
    if (precioUnitario > 0) {
        payload[`${rutaPres}.ultimoPrecioPagado`] = precioUnitario;
    }
    // Solo inicializar buenPrecio si la presentación no tiene uno asignado previamente
    if (buenP > 0 && (!presentacion.buenPrecio || Number(presentacion.buenPrecio) === 0)) {
        payload[`${rutaPres}.buenPrecio`] = buenP;
    }

    payload[`productos.${productoId}.totalIngresado`] = INC(cant);
    payload[`productos.${productoId}.totalGastado`] = INC(costo);
    payload[`productos.${productoId}.vecesComprado`] = INC(1);
    payload[`productos.${productoId}.necesario`] = false;
    payload[`productos.${productoId}.ultimaFechaMovimiento`] = fechaTimestamp;
    payload[`productos.${productoId}.updatedAt`] = Timestamp.now();

    if (productosNuevos > 0) {
        payload.totalProductos = INC(productosNuevos);
    }
    if (costo > 0) {
        payload[`gastoPorMes.${mesKey}`] = INC(costo);
    }

    const compraDocRef = doc(comprasRef(uid));
    const compra = {
        id: compraDocRef.id,
        fecha: fechaTimestamp,
        tienda: tienda || "",
        totalTicket: costo,
        subtotalDetallado: costo,
        diferenciaNoAsignada: 0,
        moneda: "MXN",
        estadoDetalle: "completo",
        metodoCaptura: "entrada_rapida",
        notas: "Entrada rápida",
        items: [{
            productoId,
            presentacionId: presentacion.id,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad: cant,
            precioUnitario,
            costoTotal: costo,
        }],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    await Promise.all([
        actualizarCatalogo(uid, payload),
        setDoc(comprasAnioRef(uid, anioKey), { compras: arrayUnion(compra) }, { merge: true }),
        setDoc(compraDocRef, compra),
    ]);

    return construirResultado(catalogo, payload, { compra });
};

/**
 * Consumo múltiple en 2 pasos: descuenta inventario de varios productos
 * en una sola escritura a Firestore y genera los movimientos mensuales.
 */
export const registrarConsumoLoteDespensa = async (uid, {
    consumos = [],
    fecha = new Date(),
    motivo = "Consumo en casa",
    catalogo: catalogoParam,
}) => {
    if (!consumos.length) throw new Error("No hay productos seleccionados para consumir");
    const catalogo = catalogoParam || await leerCatalogo(uid);
    const fechaMovimiento = obtenerFechaDesdeInput(fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaMovimiento);
    const mesKey = obtenerMesKey(fechaMovimiento);

    const payload = { updatedAt: Timestamp.now() };
    const movimientos = [];

    for (const item of consumos) {
        const cant = Number(item.cantidad || 0);
        if (cant <= 0) continue;

        const producto = catalogo.productos?.[item.productoId];
        if (!producto) continue;
        const presentacion = producto.presentaciones?.[item.presentacionId];
        if (!presentacion) continue;

        const rutaPres = `productos.${item.productoId}.presentaciones.${item.presentacionId}`;
        const costoPromedio = calcularCostoPromedio(presentacion);

        payload[`${rutaPres}.stockActual`] = INC(redondear(-cant, 2));
        payload[`${rutaPres}.totalConsumido`] = INC(cant);
        payload[`productos.${item.productoId}.totalConsumido`] = INC(cant);
        payload[`productos.${item.productoId}.ultimaFechaMovimiento`] = fechaTimestamp;
        payload[`productos.${item.productoId}.updatedAt`] = Timestamp.now();

        movimientos.push({
            id: generarId("mov"),
            fecha: fechaTimestamp,
            tipo: "salida",
            productoId: item.productoId,
            presentacionId: item.presentacionId,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad: cant,
            cantidadFirmada: -cant,
            metodoValuacion: "WAC",
            costoMovimiento: redondear(cant * costoPromedio, 2),
            motivo: item.motivo || motivo || "Consumo en casa",
            createdAt: Timestamp.now(),
        });
    }

    if (!movimientos.length) throw new Error("Ningún ítem tiene cantidad mayor a 0");

    await Promise.all([
        actualizarCatalogo(uid, payload),
        setDoc(movimientosMesRef(uid, mesKey), { movimientos: arrayUnion(...movimientos) }, { merge: true }),
    ]);

    return construirResultado(catalogo, payload, { movimientos });
};

/**
 * Conciliación / Auditoría de inventario: actualiza las cantidades reales
 * en lote y registra la diferencia como ajuste.
 */
export const conciliarInventarioDespensa = async (uid, {
    ajustes = [],
    catalogo: catalogoParam,
    motivo = "Auditoría física",
}) => {
    if (!ajustes.length) return null;
    const catalogo = catalogoParam || await leerCatalogo(uid);
    const fechaMovimiento = new Date();
    const fechaTimestamp = Timestamp.fromDate(fechaMovimiento);
    const mesKey = obtenerMesKey(fechaMovimiento);

    const payload = { updatedAt: Timestamp.now() };
    const movimientos = [];

    for (const ajuste of ajustes) {
        const { productoId, presentacionId, stockReal, stockCalculado } = ajuste;
        const real = Number(stockReal ?? 0);
        const actual = Number(stockCalculado ?? 0);
        const diferencia = redondear(real - actual, 2);
        if (diferencia === 0) continue;

        const producto = catalogo.productos?.[productoId];
        if (!producto) continue;
        const presentacion = producto.presentaciones?.[presentacionId];
        if (!presentacion) continue;

        const rutaPres = `productos.${productoId}.presentaciones.${presentacionId}`;
        const costoPromedio = calcularCostoPromedio(presentacion);

        payload[`${rutaPres}.stockActual`] = real;
        if (diferencia < 0) {
            payload[`${rutaPres}.totalConsumido`] = INC(Math.abs(diferencia));
            payload[`productos.${productoId}.totalConsumido`] = INC(Math.abs(diferencia));
        }
        payload[`productos.${productoId}.ultimaFechaMovimiento`] = fechaTimestamp;
        payload[`productos.${productoId}.updatedAt`] = Timestamp.now();

        movimientos.push({
            id: generarId("mov"),
            fecha: fechaTimestamp,
            tipo: diferencia > 0 ? "ajuste_positivo" : "ajuste_negativo",
            productoId,
            presentacionId,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad: Math.abs(diferencia),
            cantidadFirmada: diferencia,
            metodoValuacion: "WAC",
            costoMovimiento: redondear(Math.abs(diferencia) * costoPromedio, 2),
            motivo: `${motivo}: ${diferencia > 0 ? "+" : ""}${diferencia} (antes ${actual}, ahora ${real})`,
            createdAt: Timestamp.now(),
        });
    }

    if (movimientos.length > 0) {
        await Promise.all([
            actualizarCatalogo(uid, payload),
            setDoc(movimientosMesRef(uid, mesKey), { movimientos: arrayUnion(...movimientos) }, { merge: true }),
        ]);
    }

    return construirResultado(catalogo, payload, { movimientos });
};

/**
 * Importación en lote desde JSON generado por IA (ej. foto de ticket procesada en ChatGPT).
 * Procesa todos los ítems en una sola transacción a Firestore, creando productos nuevos
 * y presentaciones necesarias, y registrando la compra de golpe.
 */
export const registrarEntradaLoteIADespensa = async (uid, {
    items = [],
    tienda = "",
    fecha = new Date(),
    totalTicket = 0,
    catalogo: catalogoParam,
}) => {
    if (!items.length) throw new Error("No hay productos para importar");
    const catalogo = catalogoParam || await leerCatalogo(uid);
    const fechaCompra = obtenerFechaDesdeInput(fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaCompra);
    const mesKey = obtenerMesKey(fechaCompra);
    const anioKey = String(fechaCompra.getFullYear());

    const payload = { updatedAt: Timestamp.now() };
    let productosNuevos = 0;
    let subtotalCalculado = 0;
    const itemsCompra = [];
    const movimientos = [];
    const compraDocRef = doc(comprasRef(uid));

    const productosEnMemoria = { ...(catalogo.productos || {}) };

    for (const item of items) {
        const nombreProd = String(item.producto || item.nombre || "").trim();
        if (!nombreProd) continue;

        const cant = Number(item.cantidad || 1);
        const costo = Number(item.costoTotal || item.precioTotal || 0);
        const buenP = Number(item.buenPrecio || 0);
        const unidad = item.unidad || "pz";
        const categoria = item.categoria || "Despensa";
        const nombrePres = String(item.presentacion || `${cant} ${unidad}`).trim();
        const precioUnitario = cant > 0 && costo > 0 ? redondear(costo / cant, 2) : 0;

        const claveBuscada = normalizarClaveProducto(nombreProd);
        let producto = Object.values(productosEnMemoria).find(
            (p) => p.activo && normalizarClaveProducto(p.nombre) === claveBuscada,
        );
        let productoId = producto ? producto.id : null;

        if (!producto) {
            productoId = generarId("prod");
            const unidadBase = ["g", "kg"].includes(unidad) ? "kg" : ["ml", "L"].includes(unidad) ? "L" : "pz";
            producto = {
                id: productoId,
                nombre: nombreProd,
                clave: claveBuscada,
                categoria,
                grupo: "",
                marca: "",
                codigoBarras: "",
                activo: true,
                medible: true,
                unidadBase,
                stockMinimo: 1,
                unidadesPermitidas: [unidadBase, unidad].filter(Boolean),
                presentaciones: {},
                origen: "ia_ticket",
                imagen: item.icono || null,
                necesario: false,
                totalIngresado: 0,
                totalConsumido: 0,
                totalGastado: 0,
                vecesComprado: 0,
                ultimaFechaMovimiento: null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            payload[`productos.${productoId}`] = producto;
            payload[`indice.porClave.${rutaSegura(claveBuscada)}`] = productoId;
            productosEnMemoria[productoId] = producto;
            productosNuevos += 1;
        }

        let presentacion = Object.values(producto.presentaciones || {}).find(
            (pr) => pr.activa && (
                pr.nombre.toLowerCase() === nombrePres.toLowerCase()
                || (Number(pr.cantidad) === cant && pr.unidad === unidad)
            ),
        );

        let presentacionId;
        if (!presentacion) {
            presentacionId = generarId("pres");
            const equivaleAUnidadBase = calcularEquivalenciaBase({
                cantidad: cant,
                unidad,
                unidadBase: producto.unidadBase || "pz",
            });
            presentacion = {
                id: presentacionId,
                nombre: nombrePres,
                cantidad: cant,
                unidad,
                equivaleAUnidadBase,
                convertible: equivaleAUnidadBase !== null,
                precioAproximado: precioUnitario,
                buenPrecio: buenP,
                codigoBarras: "",
                codigoNota: "",
                imagen: null,
                activa: true,
                stockActual: 0,
                totalIngresado: 0,
                totalConsumido: 0,
                totalGastado: 0,
                vecesComprado: 0,
                ultimoPrecioPagado: 0,
                precioMinimoHistorico: 0,
                precioMaximoHistorico: 0,
                ultimaCompra: null,
            };
            payload[`productos.${productoId}.presentaciones.${presentacionId}`] = presentacion;
            producto.presentaciones[presentacionId] = presentacion;
        } else {
            presentacionId = presentacion.id;
        }

        const rutaPres = `productos.${productoId}.presentaciones.${presentacionId}`;
        payload[`${rutaPres}.stockActual`] = INC(cant);
        payload[`${rutaPres}.totalIngresado`] = INC(cant);
        payload[`${rutaPres}.totalGastado`] = INC(costo);
        payload[`${rutaPres}.vecesComprado`] = INC(1);
        payload[`${rutaPres}.ultimaCompra`] = fechaTimestamp;
        if (precioUnitario > 0) {
            payload[`${rutaPres}.ultimoPrecioPagado`] = precioUnitario;
        }
        if (buenP > 0) {
            payload[`${rutaPres}.buenPrecio`] = buenP;
        }

        payload[`productos.${productoId}.totalIngresado`] = INC(cant);
        payload[`productos.${productoId}.totalGastado`] = INC(costo);
        payload[`productos.${productoId}.vecesComprado`] = INC(1);
        payload[`productos.${productoId}.necesario`] = false;
        payload[`productos.${productoId}.ultimaFechaMovimiento`] = fechaTimestamp;
        payload[`productos.${productoId}.updatedAt`] = Timestamp.now();

        subtotalCalculado += costo;

        itemsCompra.push({
            productoId,
            presentacionId,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad: cant,
            precioUnitario,
            costoTotal: costo,
            buenPrecio: buenP,
        });

        movimientos.push({
            id: generarId("mov"),
            compraId: compraDocRef.id,
            fecha: fechaTimestamp,
            tipo: "entrada_compra",
            productoId,
            presentacionId,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad: cant,
            cantidadFirmada: cant,
            costoMovimiento: costo,
            motivo: `Ticket IA: ${tienda || "Supermercado"}`,
        });
    }

    if (productosNuevos > 0) {
        payload.totalProductos = INC(productosNuevos);
    }
    const gastoFinal = totalTicket > 0 ? Number(totalTicket) : redondear(subtotalCalculado, 2);
    if (gastoFinal > 0) {
        payload[`gastoPorMes.${mesKey}`] = INC(gastoFinal);
    }

    const compra = {
        id: compraDocRef.id,
        fecha: fechaTimestamp,
        tienda: tienda || "Ticket IA",
        totalTicket: gastoFinal,
        subtotalDetallado: redondear(subtotalCalculado, 2),
        diferenciaNoAsignada: redondear(gastoFinal - subtotalCalculado, 2),
        moneda: "MXN",
        estadoDetalle: "completo",
        metodoCaptura: "ia_prompt",
        notas: "Importado mediante IA",
        items: itemsCompra,
        movimientos,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    await Promise.all([
        actualizarCatalogo(uid, payload),
        setDoc(comprasAnioRef(uid, anioKey), { compras: arrayUnion(compra) }, { merge: true }),
        setDoc(compraDocRef, compra),
    ]);

    return construirResultado(catalogo, payload, { compra, totalImportados: itemsCompra.length });
};

export const DATOS_INICIALES_DESPENSA_LUIS = {
    despensa: {
        fecha_registro: "2026-09-16",
        categorias: {
            proteinas: [
                { producto: "Atún en lata", cantidad: 7, unidad: "latas" },
                { producto: "Atún en sobre", cantidad: 7, unidad: "sobres" },
            ],
            verduras_enlatadas: [
                { producto: "Champiñones rebanados", cantidad: 5, unidad: "latas" },
                { producto: "Ensalada campesina", cantidad: 4, unidad: "latas" },
                { producto: "Legumbres", cantidad: 3, unidad: "latas grandes" },
                { producto: "Elote", cantidad: 2, unidad: "latas" },
                { producto: "Garbanzos en lata", cantidad: 1, unidad: "lata" },
            ],
            legumbres_y_granos: [
                { producto: "Garbanzos", cantidad: 2, unidad: "sobres", peso_por_unidad: "500 g" },
                { producto: "Lentejas", cantidad: 1, unidad: "sobre", peso_por_unidad: "500 g" },
                { producto: "Arroz", cantidad: 1, unidad: "sobre", peso: "900 g" },
            ],
            salsas_y_tomate: [
                { producto: "Salsa casera roja lata", cantidad: 1 },
                { producto: "Salsa casera verde lata", cantidad: 1 },
                { producto: "Salsa verde frasco", cantidad: 2 },
                { producto: "Salsa roja frasco", cantidad: 3 },
                { producto: "Salsa de tomate molido condimentado", cantidad: 10, unidad: "unidades" },
            ],
            lacteos: [
                { producto: "Media crema", cantidad: 4, unidad: "cajas", peso_por_unidad: "250 g", peso_total: "1 kg" },
            ],
            sopas_y_comidas_instantaneas: [
                { producto: "Sopa instantánea", cantidad: 4, unidad: "paquetes" },
            ],
            preparaciones_y_otros: [
                { producto: "Maizena", cantidad: 1, unidad: "caja" },
                { producto: "Gelatina Light", cantidad: 2, unidad: "caja" },
                { producto: "Papelitos sazonadores Maggi", cantidad: 2, unidad: "paquetes" },
                { producto: "Mole Doña María", cantidad: 3, unidad: "cajas" },
            ],
        },
    },
};

/**
 * Reinicia ÚNICAMENTE el catálogo y estado de la despensa de un usuario.
 * Garantías:
 * 1. Descarga OBLIGATORIAMENTE un archivo JSON de respaldo completo antes de tocar nada.
 * 2. Toca EXCLUSIVAMENTE 'usuarios/{uid}/despensa/catalogo' (y sus subcolecciones de despensa).
 *    Ningún otro documento de la base de datos (cuentas, movimientos, etc.) es modificado.
 * 3. Puebla los 21 productos con sus cantidades, presentaciones y stickers Paper Mario.
 */
export const reiniciarDespensaConInventario = async (
    uid,
    datosJson = DATOS_INICIALES_DESPENSA_LUIS,
    infoAuth = null,
) => {
    if (!uid) throw new Error("Se necesita el UID del usuario para reiniciar la despensa.");

    // 1. Descarga obligatoria del respaldo completo previo
    try {
        await descargarRespaldo(uid, infoAuth);
    } catch (err) {
        console.error("Fallo al descargar el respaldo antes del reinicio:", err);
        throw new Error("No se pudo descargar el respaldo previo. Por seguridad se canceló la operación.");
    }

    // 2. Extraer los productos del JSON
    const categorias = datosJson?.despensa?.categorias || {};
    const ahora = Timestamp.now();
    const productosMap = {};

    Object.entries(categorias).forEach(([catKey, items]) => {
        if (!Array.isArray(items)) return;

        let catNombre = "Despensa";
        if (catKey === "lacteos") catNombre = "Refrigerados";
        else if (catKey === "limpieza") catNombre = "Limpieza";
        else if (catKey === "higiene") catNombre = "Higiene";

        items.forEach((item) => {
            const nombreProd = String(item.producto || "").trim();
            if (!nombreProd) return;

            const prodId = generarId("prod");
            const presId = generarId("pres");
            const cantNum = Number(item.cantidad || 1);

            let presUnidad = "pz";
            const uLower = String(item.unidad || "").toLowerCase();
            if (uLower.includes("lata")) presUnidad = "lata";
            else if (uLower.includes("sobre")) presUnidad = "sobre";
            else if (uLower.includes("caja")) presUnidad = "caja";
            else if (uLower.includes("paq")) presUnidad = "paq";
            else if (uLower.includes("frasco")) presUnidad = "frasco";
            else if (uLower.includes("unidad") || uLower.includes("pz")) presUnidad = "pz";

            let presNombre = `${cantNum} ${presUnidad}`;
            if (item.peso_por_unidad) presNombre = `${item.peso_por_unidad}`;
            else if (item.peso) presNombre = `${item.peso}`;
            else if (presUnidad !== "pz") presNombre = presUnidad.charAt(0).toUpperCase() + presUnidad.slice(1);

            const stickerRuta = resolverImagenProducto({ nombre: nombreProd, categoria: catNombre });

            const nuevaPres = {
                id: presId,
                nombre: presNombre,
                cantidad: 1,
                unidad: presUnidad,
                equivaleAUnidadBase: 1,
                convertible: true,
                precioAproximado: 0,
                buenPrecio: 0,
                codigoBarras: "",
                codigoNota: "",
                imagen: stickerRuta,
                activa: true,
                stockActual: cantNum,
                totalIngresado: cantNum,
                totalConsumido: 0,
                totalGastado: 0,
                vecesComprado: 1,
                ultimoPrecioPagado: 0,
                precioMinimoHistorico: 0,
                precioMaximoHistorico: 0,
                ultimaCompra: ahora,
            };

            const nuevoProd = {
                id: prodId,
                nombre: nombreProd,
                clave: normalizarClaveProducto(nombreProd),
                categoria: catNombre,
                grupo: catKey,
                marca: "",
                codigoBarras: "",
                activo: true,
                medible: true,
                unidadBase: presUnidad,
                stockMinimo: 1,
                unidadesPermitidas: [presUnidad],
                presentaciones: { [presId]: nuevaPres },
                origen: "reinicio_inicial",
                imagen: stickerRuta,
                necesario: false,
                totalIngresado: cantNum,
                totalConsumido: 0,
                totalGastado: 0,
                vecesComprado: 1,
                ultimaFechaMovimiento: ahora,
                createdAt: ahora,
                updatedAt: ahora,
            };

            productosMap[prodId] = nuevoProd;
        });
    });

    const indice = construirIndice(productosMap);

    const nuevoCatalogo = {
        version: VERSION_CATALOGO,
        moneda: "MXN",
        totalProductos: Object.keys(productosMap).length,
        productos: productosMap,
        indice,
        gastoPorMes: {},
        createdAt: ahora,
        updatedAt: ahora,
    };

    // 3. Escribir ÚNICAMENTE usuarios/{uid}/despensa/catalogo
    await setDoc(catalogoRef(uid), nuevoCatalogo);

    // 4. Limpiar documentos viejos de compras de despensa para evitar inconsistencias
    try {
        const snapCompras = await getDocs(comprasRef(uid));
        const batchDeletes = [];
        snapCompras.docs.forEach((d) => batchDeletes.push(deleteDoc(d.ref)));
        await Promise.all(batchDeletes);
    } catch (e) {
        console.warn("Nota: No se requirió limpiar compras históricas de despensa:", e);
    }

    // 5. Retornar el nuevo catálogo y el inventario derivado
    const nuevoInventario = derivarInventario(nuevoCatalogo);
    return {
        catalogo: nuevoCatalogo,
        inventario: nuevoInventario,
    };
};

/**
 * Lista maestra de productos del inventario y ticket del usuario.
 * Garantiza persistencia íntegra de cantidades, unidades, precios de compra,
 * área y categoría interna.
 */
export const PRODUCTOS_DESPENSA_USUARIO = [
    // DESPENSA - Enlatados y Conservas
    {
        nombre: "Atún",
        area: "Despensa",
        categoria: "Enlatados y Conservas",
        imagen: "/despensa/iconos/atun.jpg",
        unidadBase: "pz",
        presentaciones: [
            { nombre: "Lata", cantidad: 7, unidad: "lata", buenPrecio: 11.77 },
            { nombre: "Sobre", cantidad: 7, unidad: "sobre", buenPrecio: 9.82 },
        ],
    },
    { nombre: "Champiñones rebanados", cantidad: 5, unidad: "lata", buenPrecio: 12.15, area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Ensalada campesina", cantidad: 4, unidad: "lata", buenPrecio: 6.07, area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Legumbres", cantidad: 3, unidad: "lata", presentacionNombre: "Lata grande", area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Elote", cantidad: 2, unidad: "lata", buenPrecio: 6.80, area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Garbanzos en lata", cantidad: 1, unidad: "lata", area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Salsa casera roja lata", cantidad: 1, unidad: "lata", buenPrecio: 13.79, area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/pasta.jpg" },
    { nombre: "Salsa casera verde lata", cantidad: 1, unidad: "lata", buenPrecio: 13.79, area: "Despensa", categoria: "Enlatados y Conservas", imagen: "/despensa/iconos/pasta.jpg" },

    // DESPENSA - Abarrotes y Despensa seca
    { nombre: "Garbanzos", cantidad: 2, unidad: "sobre", presentacionNombre: "Sobre 500 g", area: "Despensa", categoria: "Abarrotes y Despensa seca", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Lentejas", cantidad: 1, unidad: "sobre", presentacionNombre: "Sobre 500 g", area: "Despensa", categoria: "Abarrotes y Despensa seca", imagen: "/despensa/iconos/frijoles.jpg" },
    { nombre: "Arroz", cantidad: 1, unidad: "sobre", presentacionNombre: "Sobre 900 g", area: "Despensa", categoria: "Abarrotes y Despensa seca", imagen: "/despensa/iconos/arroz.jpg" },
    { nombre: "Harina Trigo Precis", cantidad: 1, unidad: "kg", buenPrecio: 9.65, area: "Despensa", categoria: "Abarrotes y Despensa seca", imagen: "/despensa/iconos/arroz.jpg" },
    { nombre: "Sopa instantánea", cantidad: 4, unidad: "paq", presentacionNombre: "Paquetes", area: "Despensa", categoria: "Abarrotes y Despensa seca", imagen: "/despensa/iconos/pasta.jpg" },
    { nombre: "Maizena", cantidad: 1, unidad: "caja", area: "Despensa", categoria: "Abarrotes y Despensa seca", imagen: "/despensa/iconos/cereal.jpg" },

    // DESPENSA - Salsas, Aceites y Condimentos
    { nombre: "Salsa verde frasco", cantidad: 2, unidad: "frasco", buenPrecio: 19.58, area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/pasta.jpg" },
    { nombre: "Salsa roja frasco", cantidad: 3, unidad: "frasco", buenPrecio: 19.58, area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/pasta.jpg" },
    { nombre: "Salsa de tomate molido condimentado", cantidad: 10, unidad: "pz", buenPrecio: 6.19, presentacionNombre: "Unidades", area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/pasta.jpg" },
    { nombre: "Mole Doña María", cantidad: 3, unidad: "caja", area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/pasta.jpg" },
    { nombre: "Papelitos sazonadores Maggi", cantidad: 2, unidad: "paq", presentacionNombre: "Paquetes", area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/aceite.jpg" },
    { nombre: "Mayonesa La Costeña", cantidad: 1, unidad: "frasco", buenPrecio: 23.51, area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/aceite.jpg" },
    { nombre: "Aceite Canola Valle", cantidad: 1, unidad: "botella", buenPrecio: 26.70, area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/aceite.jpg" },
    { nombre: "Aceite Comestible", cantidad: 1, unidad: "botella", buenPrecio: 32.56, area: "Despensa", categoria: "Salsas, Aceites y Condimentos", imagen: "/despensa/iconos/aceite.jpg" },

    // DESPENSA - Perecederos y Refrigerados
    { nombre: "Media crema", cantidad: 4, unidad: "caja", buenPrecio: 11.29, presentacionNombre: "Caja 250 g", area: "Despensa", categoria: "Perecederos y Refrigerados", imagen: "/despensa/iconos/leche.jpg" },
    { nombre: "Leche UHT Light Val", cantidad: 1, unidad: "L", buenPrecio: 16.57, area: "Despensa", categoria: "Perecederos y Refrigerados", imagen: "/despensa/iconos/leche.jpg" },
    { nombre: "Leche UHT Semidescremada", cantidad: 1, unidad: "L", buenPrecio: 16.57, area: "Despensa", categoria: "Perecederos y Refrigerados", imagen: "/despensa/iconos/leche.jpg" },
    { nombre: "Pollo Entero", cantidad: 1.9, unidad: "kg", buenPrecio: 28.86, area: "Despensa", categoria: "Perecederos y Refrigerados", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Taquitos Pollo", cantidad: 1, unidad: "paq", buenPrecio: 28.06, area: "Despensa", categoria: "Perecederos y Refrigerados", imagen: "/despensa/iconos/atun.jpg" },
    { nombre: "Hamburguesa de Atún", cantidad: 1, unidad: "paq", buenPrecio: 27.74, area: "Despensa", categoria: "Perecederos y Refrigerados", imagen: "/despensa/iconos/atun.jpg" },

    // DESPENSA - Bebidas y Repostería
    { nombre: "Pan Bimbo Artesano", cantidad: 1, unidad: "paq", buenPrecio: 40.12, area: "Despensa", categoria: "Bebidas y Repostería", imagen: "/despensa/iconos/pan.jpg" },
    { nombre: "Gelatina Light", cantidad: 2, unidad: "caja", area: "Despensa", categoria: "Bebidas y Repostería", imagen: "/despensa/iconos/pan.jpg" },

    // HOGAR - Limpieza del Hogar
    { nombre: "Limp Brasso Antigrasa", cantidad: 1, unidad: "botella", buenPrecio: 22.51, area: "Hogar", categoria: "Limpieza del Hogar", imagen: "/despensa/iconos/detergente.jpg" },
    { nombre: "Detergente Alta Higiene", cantidad: 1, unidad: "bolsa", buenPrecio: 90.05, area: "Hogar", categoria: "Limpieza del Hogar", imagen: "/despensa/iconos/detergente.jpg" },
    { nombre: "Detergente Regular", cantidad: 1, unidad: "bolsa", buenPrecio: 90.05, area: "Hogar", categoria: "Limpieza del Hogar", imagen: "/despensa/iconos/detergente.jpg" },

    // BAÑO - Papel y Cuidado del Baño
    { nombre: "Papel Higiénico", cantidad: 1, unidad: "paq", area: "Baño", categoria: "Papel y Cuidado del Baño", imagen: "/despensa/iconos/papel_higienico.jpg" },
];

/**
 * Verifica si el catálogo necesita consolidar el atún, normalizar áreas y categorías
 * o sincronizar los productos del usuario.
 */
export const debeAgruparAtun = (catalogo) => {
    if (!catalogo?.productos) return false;
    const prods = Object.values(catalogo.productos);

    // 1. ¿Hay productos que aún no tengan el campo 'area' o tengan categorías antiguas planas?
    const faltaArea = prods.some((p) => {
        if (!p.area || !ESTRUCTURA_AREAS[p.area]) return true;
        const catValida = ESTRUCTURA_AREAS[p.area].categorias.some((c) => c.nombre === p.categoria);
        return !catValida;
    });
    if (faltaArea) return true;

    // 2. ¿Hay más de 1 producto de atún, o tiene menos de 2 presentaciones?
    const prodsAtun = prods.filter((p) => {
        const nom = String(p.nombre || "").toLowerCase().trim();
        return !nom.includes("hamburguesa") && (nom.includes("atun") || nom.includes("atún") || p.clave?.includes("atun"));
    });
    if (prodsAtun.length !== 1) return true;
    if (Object.keys(prodsAtun[0]?.presentaciones || {}).length < 2) return true;

    // 3. ¿Faltan productos esenciales de la lista del usuario?
    const nombresRequeridos = ["leche", "detergente", "harina", "mayonesa", "aceite", "pan"];
    const faltaEsencial = nombresRequeridos.some((req) => {
        return !prods.some((p) => String(p.nombre || "").toLowerCase().includes(req));
    });
    if (faltaEsencial) return true;

    return false;
};

/**
 * Cruza inteligentemente las existencias de la despensa con las áreas, categorías internas
 * y precios unitarios reales:
 * 1. Asigna 'area' y 'categoria' normalizadas a TODOS los productos existentes.
 * 2. Unifica el Atún en 1 solo producto con 2 presentaciones (Lata: 7 @ $11.77, Sobre: 7 @ $9.82).
 * 3. Asegura que todos los productos del usuario estén integrados con sus precios reales.
 * 4. Normaliza imágenes a stickers oficiales Paper Mario.
 */
export const agruparAtunYActualizarPrecios = async (uid, catalogo) => {
    if (!uid || !catalogo?.productos) return { catalogo, inventario: derivarInventario(catalogo) };

    const ahora = Timestamp.now();
    const copiaProds = { ...catalogo.productos };
    let cambioRealizado = false;

    // 1. Unificar TODOS los productos de atún (excluyendo hamburguesa) en 1 solo producto
    const prodsAtun = Object.entries(copiaProds).filter(([, prod]) => {
        const nom = String(prod.nombre || "").toLowerCase().trim();
        return !nom.includes("hamburguesa") && (nom.includes("atun") || nom.includes("atún") || prod.clave?.includes("atun"));
    });

    if (prodsAtun.length > 0) {
        let stockLata = 0;
        let stockSobre = 0;
        let idPrincipal = null;

        prodsAtun.forEach(([id, prod]) => {
            const nomProd = String(prod.nombre || "").toLowerCase();
            const presentaciones = Object.values(prod.presentaciones || {});

            if (presentaciones.length === 0) {
                const stock = Number(prod.totalIngresado || 0);
                if (nomProd.includes("sobre")) stockSobre += stock;
                else stockLata += stock;
            } else {
                presentaciones.forEach((pres) => {
                    const nomPres = String(pres.nombre || "").toLowerCase();
                    const unidadPres = String(pres.unidad || "").toLowerCase();
                    const stock = Number(pres.stockActual ?? prod.totalIngresado ?? 0);

                    if (nomProd.includes("sobre") || nomPres.includes("sobre") || unidadPres === "sobre") {
                        stockSobre += stock;
                    } else {
                        stockLata += stock;
                    }
                });
            }

            if (!idPrincipal) {
                idPrincipal = id;
            } else {
                delete copiaProds[id];
                cambioRealizado = true;
            }
        });

        if (stockLata === 0) stockLata = 7;
        if (stockSobre === 0) stockSobre = 7;

        const totalAtun = stockLata + stockSobre;
        const totalGastadoLata = redondear(stockLata * 11.77, 2);
        const totalGastadoSobre = redondear(stockSobre * 9.82, 2);
        const totalGastadoAtun = redondear(totalGastadoLata + totalGastadoSobre, 2);

        const prodId = idPrincipal || generarId("prod");
        const presLataId = generarId("pres");
        const presSobreId = generarId("pres");

        copiaProds[prodId] = {
            id: prodId,
            nombre: "Atún",
            clave: "atun",
            area: "Despensa",
            categoria: "Enlatados y Conservas",
            grupo: "enlatados_conservas",
            marca: "",
            codigoBarras: "",
            activo: true,
            medible: true,
            unidadBase: "pz",
            stockMinimo: 2,
            unidadesPermitidas: ["pz", "lata", "sobre"],
            imagen: "/despensa/iconos/atun.jpg",
            necesario: false,
            totalIngresado: totalAtun,
            totalConsumido: 0,
            totalGastado: totalGastadoAtun,
            vecesComprado: 2,
            ultimaFechaMovimiento: ahora,
            createdAt: ahora,
            updatedAt: ahora,
            presentaciones: {
                [presLataId]: {
                    id: presLataId,
                    nombre: "Lata",
                    cantidad: 1,
                    unidad: "lata",
                    equivaleAUnidadBase: 1,
                    convertible: true,
                    buenPrecio: 11.77,
                    precioAproximado: 11.77,
                    ultimoPrecioPagado: 11.77,
                    imagen: "/despensa/iconos/atun.jpg",
                    activa: true,
                    stockActual: stockLata,
                    totalIngresado: stockLata,
                    totalConsumido: 0,
                    totalGastado: totalGastadoLata,
                    vecesComprado: 1,
                    precioMinimoHistorico: 11.77,
                    precioMaximoHistorico: 11.77,
                    ultimaCompra: ahora,
                },
                [presSobreId]: {
                    id: presSobreId,
                    nombre: "Sobre",
                    cantidad: 1,
                    unidad: "sobre",
                    equivaleAUnidadBase: 1,
                    convertible: true,
                    buenPrecio: 9.82,
                    precioAproximado: 9.82,
                    ultimoPrecioPagado: 9.82,
                    imagen: "/despensa/iconos/atun.jpg",
                    activa: true,
                    stockActual: stockSobre,
                    totalIngresado: stockSobre,
                    totalConsumido: 0,
                    totalGastado: totalGastadoSobre,
                    vecesComprado: 1,
                    precioMinimoHistorico: 9.82,
                    precioMaximoHistorico: 9.82,
                    ultimaCompra: ahora,
                },
            },
        };
        cambioRealizado = true;
    }

    // 2. Integrar todos los productos del usuario y sincronizar existencias/precios
    PRODUCTOS_DESPENSA_USUARIO.forEach((item) => {
        if (item.nombre === "Atún") return; // Ya unificado

        const nomNorm = item.nombre.toLowerCase().trim();
        // Buscar si ya existe
        const match = Object.values(copiaProds).find((p) => {
            const pNom = String(p.nombre || "").toLowerCase().trim();
            return pNom === nomNorm || (nomNorm.includes("ensalada") && pNom.includes("ensalada")) ||
                (nomNorm.includes("champiñon") && pNom.includes("champiñon")) ||
                (nomNorm.includes("harina trigo") && pNom.includes("harina")) ||
                (nomNorm.includes("brasso") && pNom.includes("brasso")) ||
                (nomNorm.includes("pan bimbo") && pNom.includes("pan bimbo"));
        });

        if (match) {
            // Actualizar áreas, categorías, precios e imagen
            match.area = item.area;
            match.categoria = item.categoria;
            match.imagen = resolverImagenProducto({ ...match, imagen: item.imagen });

            if (item.buenPrecio) {
                let totalProdGastado = 0;
                Object.values(match.presentaciones || {}).forEach((pres) => {
                    pres.buenPrecio = item.buenPrecio;
                    pres.precioAproximado = item.buenPrecio;
                    pres.ultimoPrecioPagado = item.buenPrecio;
                    pres.precioMinimoHistorico = item.buenPrecio;
                    pres.precioMaximoHistorico = item.buenPrecio;
                    pres.imagen = match.imagen;
                    const stock = Number(pres.stockActual || 0);
                    const gastado = redondear(stock * item.buenPrecio, 2);
                    pres.totalGastado = gastado;
                    totalProdGastado += gastado;
                });
                match.totalGastado = redondear(totalProdGastado, 2);
            }
            cambioRealizado = true;
        } else {
            // Crear el producto si no existe
            const prodId = generarId("prod");
            const presId = generarId("pres");
            const cant = Number(item.cantidad || 1);
            const precio = Number(item.buenPrecio || 0);
            const gastado = redondear(cant * precio, 2);
            const presNombre = item.presentacionNombre || (item.unidad ? item.unidad.charAt(0).toUpperCase() + item.unidad.slice(1) : "Pieza");
            const imgResuelta = resolverImagenProducto(item);

            copiaProds[prodId] = {
                id: prodId,
                nombre: item.nombre,
                clave: normalizarClaveProducto(item.nombre),
                area: item.area,
                categoria: item.categoria,
                grupo: item.categoria,
                marca: "",
                codigoBarras: "",
                activo: true,
                medible: true,
                unidadBase: item.unidad || "pz",
                stockMinimo: 1,
                unidadesPermitidas: [item.unidad || "pz"],
                imagen: imgResuelta,
                necesario: false,
                totalIngresado: cant,
                totalConsumido: 0,
                totalGastado: gastado,
                vecesComprado: 1,
                ultimaFechaMovimiento: ahora,
                createdAt: ahora,
                updatedAt: ahora,
                presentaciones: {
                    [presId]: {
                        id: presId,
                        nombre: presNombre,
                        cantidad: 1,
                        unidad: item.unidad || "pz",
                        equivaleAUnidadBase: 1,
                        convertible: true,
                        buenPrecio: precio,
                        precioAproximado: precio,
                        ultimoPrecioPagado: precio,
                        codigoBarras: "",
                        codigoNota: "",
                        imagen: imgResuelta,
                        activa: true,
                        stockActual: cant,
                        totalIngresado: cant,
                        totalConsumido: 0,
                        totalGastado: gastado,
                        vecesComprado: 1,
                        precioMinimoHistorico: precio,
                        precioMaximoHistorico: precio,
                        ultimaCompra: ahora,
                    },
                },
            };
            cambioRealizado = true;
        }
    });

    // 3. Normalizar todos los productos restantes para garantizar que tengan 'area' y 'categoria'
    Object.values(copiaProds).forEach((prod) => {
        const { area, categoria } = resolverAreaYCategoria(prod);
        if (prod.area !== area || prod.categoria !== categoria) {
            prod.area = area;
            prod.categoria = categoria;
            cambioRealizado = true;
        }
        const imgValida = resolverImagenProducto(prod);
        if (prod.imagen !== imgValida) {
            prod.imagen = imgValida;
            cambioRealizado = true;
        }
    });

    if (!cambioRealizado) {
        return { catalogo, inventario: derivarInventario(catalogo) };
    }

    const indice = construirIndice(copiaProds);
    const catalogoActualizado = {
        ...catalogo,
        totalProductos: Object.keys(copiaProds).length,
        productos: copiaProds,
        indice,
        updatedAt: ahora,
    };

    await setDoc(catalogoRef(uid), catalogoActualizado);
    const inventarioActualizado = derivarInventario(catalogoActualizado);

    return {
        catalogo: catalogoActualizado,
        inventario: inventarioActualizado,
    };
};

/**
 * Guarda la edición completa de un producto y sus presentaciones
 * (nombre, categoría, sticker, stock mínimo, y lista de presentaciones).
 */
export const guardarEdicionProductoCompleto = async (uid, {
    productoId,
    datos,
    catalogo: catalogoParam,
}) => {
    if (!uid || !productoId) throw new Error("Parámetros insuficientes");
    const catalogo = catalogoParam || await leerCatalogo(uid);
    const copiaProds = clonar(catalogo.productos || {});
    const prodExistente = copiaProds[productoId];
    if (!prodExistente) throw new Error("El producto no existe");

    const ahora = Timestamp.now();
    const nombreLimpio = String(datos.nombre || prodExistente.nombre).trim();
    const claveNueva = normalizarClaveProducto(nombreLimpio);

    // Actualizar datos del producto
    prodExistente.nombre = nombreLimpio;
    prodExistente.clave = claveNueva;
    if (datos.area) prodExistente.area = datos.area;
    if (datos.categoria) prodExistente.categoria = datos.categoria;
    if (datos.imagen !== undefined) prodExistente.imagen = datos.imagen;
    if (datos.stockMinimo !== undefined) prodExistente.stockMinimo = Number(datos.stockMinimo || 1);
    if (datos.necesario !== undefined) prodExistente.necesario = Boolean(datos.necesario);
    prodExistente.updatedAt = ahora;

    // Actualizar presentaciones
    if (Array.isArray(datos.presentaciones)) {
        const nuevasPresentaciones = {};
        datos.presentaciones.forEach((pres) => {
            const presId = pres.id || generarId("pres");
            const presOriginal = prodExistente.presentaciones?.[presId] || {};
            const cant = Number(pres.cantidad || 1);
            const unidad = pres.unidad || "pz";
            const stockActual = Number(pres.stockActual ?? presOriginal.stockActual ?? 0);
            const buenPrecio = Number(pres.buenPrecio ?? presOriginal.buenPrecio ?? 0);
            const precioAproximado = Number(pres.precioAproximado ?? presOriginal.precioAproximado ?? buenPrecio);

            const equivaleAUnidadBase = calcularEquivalenciaBase({
                cantidad: cant,
                unidad,
                unidadBase: prodExistente.unidadBase || "pz",
            });

            nuevasPresentaciones[presId] = {
                ...presOriginal,
                id: presId,
                nombre: String(pres.nombre || `${cant} ${unidad}`).trim(),
                cantidad: cant,
                unidad,
                equivaleAUnidadBase,
                convertible: equivaleAUnidadBase !== null,
                stockActual,
                buenPrecio,
                precioAproximado,
                activa: pres.activa !== false,
            };
        });
        prodExistente.presentaciones = nuevasPresentaciones;
    }

    copiaProds[productoId] = prodExistente;
    const indice = construirIndice(copiaProds);

    const catalogoActualizado = {
        ...catalogo,
        productos: copiaProds,
        indice,
        updatedAt: ahora,
    };

    await setDoc(catalogoRef(uid), catalogoActualizado);
    const inventarioActualizado = derivarInventario(catalogoActualizado);

    return {
        catalogo: catalogoActualizado,
        inventario: inventarioActualizado,
    };
};

