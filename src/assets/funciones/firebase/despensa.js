import {
    arrayUnion,
    collection,
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

export const CATEGORIAS_DESPENSA = [
    "Abarrotes",
    "Bebidas",
    "Lácteos",
    "Limpieza",
    "Higiene",
    "Enlatados",
    "Botanas",
    "Congelados",
    "Otros",
];

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

    // 2 escrituras en total: el catálogo y el ticket histórico.
    await Promise.all([
        actualizarCatalogo(uid, payload),
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

export const puedeConvertirUnidadDespensa = unidadesCompatibles;
