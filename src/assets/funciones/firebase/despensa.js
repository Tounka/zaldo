import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
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

const inventarioRef = (uid) => doc(db, "usuarios", uid, "despensa", "inventario");
const productosRef = (uid) => collection(db, "usuarios", uid, "despensa", "productos", "items");
const productoRef = (uid, productoId) => doc(db, "usuarios", uid, "despensa", "productos", "items", productoId);
const comprasRef = (uid) => collection(db, "usuarios", uid, "despensa", "compras", "items");
const movimientosRef = (uid) => collection(db, "usuarios", uid, "despensa", "movimientos", "items");

const redondear = (valor, decimales = 2) => {
    const numero = Number(valor || 0);
    return Number(numero.toFixed(decimales));
};

const crearInventarioBase = () => ({
    productos: {},
    faltantes: [],
    valorTotalInventario: 0,
    gastoMesActual: 0,
    totalProductos: 0,
    productosAgotados: 0,
    productosBajoMinimo: 0,
    productosSinPrecio: 0,
    productosSinStockInicial: 0,
    moneda: "MXN",
    version: 1,
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

const obtenerMesKey = (fecha = new Date()) => {
    const fechaReal = fecha instanceof Date ? fecha : fecha.toDate?.() || new Date(fecha);
    return `${fechaReal.getFullYear()}${String(fechaReal.getMonth() + 1).padStart(2, "0")}`;
};

const obtenerFechaDesdeInput = (fecha) => {
    if (!fecha) return new Date();
    const parsed = new Date(`${fecha}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

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
        id: `pres_${Date.now()}`,
        nombre: values.presentacionNombre || `${cantidad} ${unidad}`,
        cantidad,
        unidad,
        equivaleAUnidadBase,
        convertible: equivaleAUnidadBase !== null,
        precioAproximado: Number(values.precioAproximado || 0),
        buenPrecio: Number(values.buenPrecio || 0),
        codigoBarras: String(values.codigoBarras || "").trim(),
        ultimoPrecioPagado: 0,
        costoPromedioActual: 0,
        costoPromedioBase: 0,
        codigoNota: values.codigoNota || "",
        imagen: values.presentacionImagen || values.imagen || null,
        activa: true,
    };
};

const formatearCantidad = (cantidad, unidad) => `${redondear(cantidad, 2)} ${unidad}`;

const obtenerPrecioUnitarioEntrada = (precioTotalItem, cantidad, presentacion) => {
    const total = Number(precioTotalItem || 0);
    const cantidadNum = Number(cantidad || 0);
    if (total > 0 && cantidadNum > 0) {
        return {
            precioUnitario: total / cantidadNum,
            origenCosto: "ticket",
        };
    }

    const precioReferencia = Number(presentacion.precioAproximado || presentacion.buenPrecio || 0);
    return {
        precioUnitario: precioReferencia,
        origenCosto: precioReferencia > 0 ? "referencia_presentacion" : "sin_costo",
    };
};

const crearLoteFIFO = ({ cantidad, costoUnitario, origenCosto, fecha, compraId, movimientoId }) => ({
    id: `lote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cantidadInicial: redondear(cantidad, 2),
    cantidadDisponible: redondear(cantidad, 2),
    costoUnitario: redondear(costoUnitario, 2),
    origenCosto,
    fecha,
    compraId: compraId || null,
    movimientoId: movimientoId || null,
});

const calcularValorLotesFIFO = (lotes = []) => redondear(
    lotes.reduce((total, lote) => total + (Number(lote.cantidadDisponible || 0) * Number(lote.costoUnitario || 0)), 0),
    2
);

const consumirLotesFIFO = (lotes = [], cantidad) => {
    let restante = Number(cantidad || 0);
    const lotesActualizados = [];
    let costoConsumido = 0;

    lotes.forEach((lote) => {
        if (restante <= 0) {
            lotesActualizados.push(lote);
            return;
        }

        const disponible = Number(lote.cantidadDisponible || 0);
        const consumo = Math.min(disponible, restante);
        const nuevoDisponible = redondear(disponible - consumo, 2);
        costoConsumido += consumo * Number(lote.costoUnitario || 0);
        restante = redondear(restante - consumo, 2);

        if (nuevoDisponible > 0) {
            lotesActualizados.push({ ...lote, cantidadDisponible: nuevoDisponible });
        }
    });

    return {
        lotes: lotesActualizados,
        restante,
        costoConsumido: redondear(costoConsumido, 2),
    };
};

const recalcularResumenProducto = (producto, resumenActual = {}) => {
    const stockPorPresentacion = resumenActual.stockPorPresentacion || {};
    const presentaciones = producto.presentaciones || [];
    let stockBase = 0;
    let valorInventarioActual = 0;
    let tieneStock = false;
    let tienePrecioCompleto = true;
    const partesConvertibles = [];
    const partesMixtas = [];

    presentaciones.forEach((presentacion) => {
        const stockPresentacion = stockPorPresentacion[presentacion.id] || {};
        const stockActual = Number(stockPresentacion.stockActual || 0);
        if (stockActual <= 0) return;

        tieneStock = true;
        const lotesCompra = stockPresentacion.lotesCompra || [];
        const valorFIFO = calcularValorLotesFIFO(lotesCompra);
        const costoFallback = Number(stockPresentacion.costoUnitarioFallback || stockPresentacion.ultimoPrecioPagado || 0);
        if (!valorFIFO && !costoFallback) tienePrecioCompleto = false;
        valorInventarioActual += valorFIFO || (stockActual * costoFallback);

        if (presentacion.equivaleAUnidadBase !== null && presentacion.equivaleAUnidadBase !== undefined) {
            stockBase += stockActual * Number(presentacion.equivaleAUnidadBase || 0);
        } else {
            partesMixtas.push(`${redondear(stockActual, 2)} ${presentacion.nombre}`);
        }
    });

    if (stockBase > 0) partesConvertibles.push(formatearCantidad(stockBase, producto.unidadBase));
    const resumenStock = [...partesConvertibles, ...partesMixtas].join(" + ") || `0 ${producto.unidadBase || "pz"}`;
    const stockMinimo = Number(producto.stockMinimo || 0);
    const faltante = !tieneStock || (stockBase > 0 && stockMinimo > 0 && stockBase < stockMinimo) || Boolean(resumenActual.necesario);
    const valuacionEstado = !tieneStock
        ? "sin_stock"
        : tienePrecioCompleto
            ? "valuacionCompleta"
            : valorInventarioActual > 0
                ? "valuacionParcial"
                : "sinValuacion";

    return {
        ...resumenActual,
        productoId: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        grupo: producto.grupo || "",
        marca: producto.marca || "",
        codigoBarras: producto.codigoBarras || presentaciones.find((presentacion) => presentacion.codigoBarras)?.codigoBarras || "",
        imagen: producto.imagen || null,
        unidadBase: producto.unidadBase,
        stockMinimo,
        resumenStock,
        stockBase: redondear(stockBase, 4),
        faltante,
        valorInventarioActual: redondear(valorInventarioActual, 2),
        valuacionEstado,
        stockPorPresentacion,
        ultimaFechaMovimiento: resumenActual.ultimaFechaMovimiento || null,
    };
};

const recalcularInventario = (inventario) => {
    const productos = inventario.productos || {};
    const valores = Object.values(productos);
    const faltantes = valores.filter((producto) => producto.faltante).map((producto) => ({
        productoId: producto.productoId,
        nombre: producto.nombre,
        resumenStock: producto.resumenStock,
        stockMinimo: producto.stockMinimo,
    }));

    return {
        ...inventario,
        faltantes,
        valorTotalInventario: redondear(valores.reduce((total, producto) => total + Number(producto.valorInventarioActual || 0), 0), 2),
        totalProductos: valores.length,
        productosAgotados: valores.filter((producto) => Number(producto.stockBase || 0) === 0).length,
        productosBajoMinimo: valores.filter((producto) => Number(producto.stockBase || 0) > 0 && producto.faltante).length,
        productosSinPrecio: valores.filter((producto) => producto.valuacionEstado === "sinValuacion" || producto.valuacionEstado === "valuacionParcial").length,
        productosSinStockInicial: valores.filter((producto) => !producto.ultimaFechaMovimiento).length,
        updatedAt: Timestamp.now(),
    };
};

const obtenerInventarioTransaccion = async (transaction, uid) => {
    const ref = inventarioRef(uid);
    const snap = await transaction.get(ref);
    if (snap.exists()) return { ref, data: snap.data() };
    const base = crearInventarioBase();
    transaction.set(ref, base);
    return { ref, data: base };
};

export const obtenerDespensa = async (uid) => {
    const invRef = inventarioRef(uid);
    const snap = await getDoc(invRef);
    let inventario = snap.exists() ? snap.data() : crearInventarioBase();

    if (!snap.exists()) {
        await setDoc(invRef, inventario);
    }

    const q = query(productosRef(uid), where("activo", "==", true));
    const productosSnap = await getDocs(q);
    const productos = productosSnap.docs.map((productoDoc) => ({ id: productoDoc.id, ...productoDoc.data() }));

    return { inventario, productos };
};

const construirProductoDespensa = (productoDocRef, values) => {
    const ahora = Timestamp.now();
    const unidadBase = values.unidadBase || "pz";
    const presentacion = crearPresentacion(values, unidadBase);

    return {
        id: productoDocRef.id,
        nombre: values.nombre,
        categoria: values.categoria || "Otros",
        grupo: values.grupo || "",
        marca: values.marca || "",
        codigoBarras: String(values.codigoBarras || "").trim(),
        activo: true,
        medible: values.medible !== "false",
        unidadBase,
        stockMinimo: Number(values.stockMinimo || 0),
        unidadesPermitidas: String(values.unidadesPermitidas || unidadBase)
            .split(",")
            .map((unidad) => unidad.trim())
            .filter(Boolean),
        presentaciones: [presentacion],
        origen: "manual",
        imagen: values.imagen || null,
        createdAt: ahora,
        updatedAt: ahora,
    };
};

export const crearProductoDespensa = async (uid, values) => {
    const productoDocRef = doc(productosRef(uid));
    const producto = construirProductoDespensa(productoDocRef, values);

    await runTransaction(db, async (transaction) => {
        const { ref, data } = await obtenerInventarioTransaccion(transaction, uid);
        const resumen = recalcularResumenProducto(producto, { stockPorPresentacion: {} });
        const inventarioActualizado = recalcularInventario({
            ...data,
            productos: {
                ...(data.productos || {}),
                [producto.id]: resumen,
            },
        });

        transaction.set(productoDocRef, producto);
        transaction.set(ref, inventarioActualizado);
    });

    return producto;
};

export const agregarPresentacionDespensa = async (uid, productoId, values) => {
    const ref = productoRef(uid, productoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Producto no encontrado");

    const producto = { id: snap.id, ...snap.data() };
    const presentacion = crearPresentacion(values, producto.unidadBase);
    await updateDoc(ref, {
        presentaciones: [...(producto.presentaciones || []), presentacion],
        updatedAt: Timestamp.now(),
    });

    return presentacion;
};

export const actualizarProductoDespensa = async (uid, productoId, values) => {
    const productoDocRef = productoRef(uid, productoId);

    return runTransaction(db, async (transaction) => {
        const productoSnap = await transaction.get(productoDocRef);
        if (!productoSnap.exists()) throw new Error("Producto no encontrado");

        const productoActual = { id: productoSnap.id, ...productoSnap.data() };
        const productoActualizado = {
            ...productoActual,
            nombre: values.nombre ?? productoActual.nombre,
            categoria: values.categoria ?? productoActual.categoria,
            grupo: values.grupo ?? productoActual.grupo ?? "",
            marca: values.marca ?? productoActual.marca ?? "",
            codigoBarras: values.codigoBarras !== undefined ? String(values.codigoBarras || "").trim() : productoActual.codigoBarras || "",
            activo: values.activo ?? productoActual.activo,
            medible: values.medible ?? productoActual.medible,
            unidadBase: values.unidadBase ?? productoActual.unidadBase,
            stockMinimo: values.stockMinimo !== undefined ? Number(values.stockMinimo || 0) : Number(productoActual.stockMinimo || 0),
            unidadesPermitidas: values.unidadesPermitidas
                ? String(values.unidadesPermitidas).split(",").map((unidad) => unidad.trim()).filter(Boolean)
                : productoActual.unidadesPermitidas || [],
            updatedAt: Timestamp.now(),
        };

        const { ref: invRef, data: inventario } = await obtenerInventarioTransaccion(transaction, uid);
        const resumenActual = inventario.productos?.[productoId] || {};
        const resumen = recalcularResumenProducto(productoActualizado, resumenActual);
        const inventarioActualizado = recalcularInventario({
            ...inventario,
            productos: {
                ...(inventario.productos || {}),
                [productoId]: resumen,
            },
        });

        transaction.update(productoDocRef, productoActualizado);
        transaction.set(invRef, inventarioActualizado);
        return { producto: productoActualizado, inventario: inventarioActualizado };
    });
};

export const actualizarPresentacionDespensa = async (uid, productoId, presentacionId, values) => {
    const productoDocRef = productoRef(uid, productoId);

    return runTransaction(db, async (transaction) => {
        const productoSnap = await transaction.get(productoDocRef);
        if (!productoSnap.exists()) throw new Error("Producto no encontrado");

        const producto = { id: productoSnap.id, ...productoSnap.data() };
        const presentaciones = producto.presentaciones || [];
        const presentacionesActualizadas = presentaciones.map((presentacion) => {
            if (presentacion.id !== presentacionId) return presentacion;
            const cantidad = values.presentacionCantidad !== undefined ? Number(values.presentacionCantidad || 0) : Number(presentacion.cantidad || 0);
            const unidad = values.presentacionUnidad || presentacion.unidad;
            const equivaleAUnidadBase = calcularEquivalenciaBase({
                cantidad,
                unidad,
                unidadBase: producto.unidadBase,
                equivalenciaBase: values.equivalenciaBase !== undefined ? values.equivalenciaBase : presentacion.equivaleAUnidadBase,
            });

            return {
                ...presentacion,
                nombre: values.presentacionNombre ?? presentacion.nombre,
                cantidad,
                unidad,
                equivaleAUnidadBase,
                convertible: equivaleAUnidadBase !== null,
                precioAproximado: values.precioAproximado !== undefined ? Number(values.precioAproximado || 0) : Number(presentacion.precioAproximado || 0),
                buenPrecio: values.buenPrecio !== undefined ? Number(values.buenPrecio || 0) : Number(presentacion.buenPrecio || 0),
                codigoBarras: values.codigoBarras !== undefined ? String(values.codigoBarras || "").trim() : presentacion.codigoBarras || "",
                codigoNota: values.codigoNota ?? presentacion.codigoNota ?? "",
                activa: values.activa ?? presentacion.activa,
            };
        });
        const productoActualizado = { ...producto, presentaciones: presentacionesActualizadas, updatedAt: Timestamp.now() };

        const { ref: invRef, data: inventario } = await obtenerInventarioTransaccion(transaction, uid);
        const resumenActual = inventario.productos?.[productoId] || {};
        const stockPorPresentacion = { ...(resumenActual.stockPorPresentacion || {}) };
        const presentacionActualizada = presentacionesActualizadas.find((presentacion) => presentacion.id === presentacionId);
        if (stockPorPresentacion[presentacionId] && presentacionActualizada) {
            stockPorPresentacion[presentacionId] = {
                ...stockPorPresentacion[presentacionId],
                nombre: presentacionActualizada.nombre,
                unidad: presentacionActualizada.unidad,
                cantidad: presentacionActualizada.cantidad,
                equivaleAUnidadBase: presentacionActualizada.equivaleAUnidadBase,
                codigoBarras: presentacionActualizada.codigoBarras || "",
            };
        }
        const resumen = recalcularResumenProducto(productoActualizado, { ...resumenActual, stockPorPresentacion });
        const inventarioActualizado = recalcularInventario({
            ...inventario,
            productos: {
                ...(inventario.productos || {}),
                [productoId]: resumen,
            },
        });

        transaction.update(productoDocRef, { presentaciones: presentacionesActualizadas, updatedAt: Timestamp.now() });
        transaction.set(invRef, inventarioActualizado);
        return { producto: productoActualizado, inventario: inventarioActualizado };
    });
};

const evaluarPrecio = (presentacion, precioUnitario) => {
    if (!precioUnitario) return "sin_precio";
    if (presentacion.buenPrecio && precioUnitario <= Number(presentacion.buenPrecio)) return "excelente";
    if (presentacion.precioAproximado && precioUnitario <= Number(presentacion.precioAproximado)) return "bueno";
    if (presentacion.precioAproximado && precioUnitario <= Number(presentacion.precioAproximado) * 1.12) return "normal";
    return "caro";
};

export const registrarTicketDespensa = async (uid, values) => {
    const fechaCompra = obtenerFechaDesdeInput(values.fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaCompra);
    const totalTicket = Number(values.totalTicket || 0);
    const compraDocRef = doc(comprasRef(uid));
    const itemsEntrada = (values.items || []).filter((item) => item.productoId && item.presentacionId && Number(item.cantidadComprada || 0) > 0);

    if (itemsEntrada.length === 0) {
        throw new Error("Agrega al menos un producto al ticket");
    }

    return runTransaction(db, async (transaction) => {
        const productosPorId = {};
        const productoRefs = {};

        for (const item of itemsEntrada) {
            if (productosPorId[item.productoId]) continue;
            const ref = productoRef(uid, item.productoId);
            const snap = await transaction.get(ref);
            if (!snap.exists()) throw new Error("Producto no encontrado");
            productosPorId[item.productoId] = { id: snap.id, ...snap.data() };
            productoRefs[item.productoId] = ref;
        }

        const { ref: invRef, data: inventario } = await obtenerInventarioTransaccion(transaction, uid);
        const productosActualizados = {};
        const resumenesActualizados = {};
        const itemsCompra = [];
        const movimientos = [];
        let subtotalDetallado = 0;

        for (const item of itemsEntrada) {
            const productoBase = productosActualizados[item.productoId] || productosPorId[item.productoId];
            const presentaciones = productoBase.presentaciones || [];
            const presentacion = presentaciones.find((pres) => pres.id === item.presentacionId);
            if (!presentacion) throw new Error("Presentación no encontrada");

            const cantidadComprada = Number(item.cantidadComprada || 0);
            const precioTotalItem = Number(item.precioTotalItem || 0);
            const { precioUnitario, origenCosto } = obtenerPrecioUnitarioEntrada(precioTotalItem, cantidadComprada, presentacion);
            const costoUnitarioBase = presentacion.equivaleAUnidadBase && precioUnitario
                ? precioUnitario / Number(presentacion.equivaleAUnidadBase)
                : 0;
            const resumenActual = resumenesActualizados[item.productoId] || inventario.productos?.[item.productoId] || {};
            const stockPorPresentacion = { ...(resumenActual.stockPorPresentacion || {}) };
            const stockPrevio = Number(stockPorPresentacion[presentacion.id]?.stockActual || 0);
            const nuevoStock = stockPrevio + cantidadComprada;
            const lotesActuales = stockPorPresentacion[presentacion.id]?.lotesCompra || [];
            const movimientoDocRef = doc(movimientosRef(uid));
            const loteEntrada = crearLoteFIFO({
                cantidad: cantidadComprada,
                costoUnitario: precioUnitario,
                origenCosto,
                fecha: fechaTimestamp,
                compraId: compraDocRef.id,
                movimientoId: movimientoDocRef.id,
            });
            const lotesCompra = [...lotesActuales, loteEntrada];

            stockPorPresentacion[presentacion.id] = {
                presentacionId: presentacion.id,
                nombre: presentacion.nombre,
                stockActual: redondear(nuevoStock, 2),
                unidad: presentacion.unidad,
                cantidad: presentacion.cantidad,
                equivaleAUnidadBase: presentacion.equivaleAUnidadBase,
                codigoBarras: presentacion.codigoBarras || productoActualizado.codigoBarras || "",
                metodoValuacion: "FIFO",
                lotesCompra,
                valorInventarioActual: calcularValorLotesFIFO(lotesCompra),
                costoUnitarioFallback: redondear(precioUnitario, 2),
                ultimoPrecioPagado: redondear(precioUnitario, 2),
                ultimoOrigenCosto: origenCosto,
            };

            const presentacionesActualizadas = presentaciones.map((pres) => pres.id === presentacion.id ? {
                ...pres,
                ultimoPrecioPagado: redondear(precioUnitario || pres.ultimoPrecioPagado || 0, 2),
                ultimoOrigenCosto: origenCosto,
            } : pres);
            const productoActualizado = { ...productoBase, presentaciones: presentacionesActualizadas, updatedAt: Timestamp.now() };
            const resumen = recalcularResumenProducto(productoActualizado, {
                ...resumenActual,
                stockPorPresentacion,
                ultimaFechaMovimiento: fechaTimestamp,
            });

            productosActualizados[item.productoId] = productoActualizado;
            resumenesActualizados[item.productoId] = resumen;
            subtotalDetallado += precioTotalItem;

            itemsCompra.push({
                productoId: productoActualizado.id,
                presentacionId: presentacion.id,
                nombreSnapshot: productoActualizado.nombre,
                presentacionSnapshot: presentacion.nombre,
                cantidadComprada,
                unidadCompra: presentacion.unidad,
                codigoBarras: item.codigoBarras || presentacion.codigoBarras || productoActualizado.codigoBarras || "",
                precioUnitario: redondear(precioUnitario, 2),
                precioTotalItem: redondear(precioTotalItem, 2),
                costoEntradaTotal: redondear(precioUnitario * cantidadComprada, 2),
                costoUnitarioBase: redondear(costoUnitarioBase, 4),
                equivaleAUnidadBase: presentacion.equivaleAUnidadBase,
                metodoValuacion: "FIFO",
                loteId: loteEntrada.id,
                origenCosto,
                evaluacionPrecio: evaluarPrecio(presentacion, precioUnitario),
                nota: item.nota || "",
            });
            movimientos.push({
                ref: movimientoDocRef,
                data: {
                    id: movimientoDocRef.id,
                    compraId: compraDocRef.id,
                    fecha: fechaTimestamp,
                    tipo: "entrada_compra",
                    productoId: productoActualizado.id,
                    presentacionId: presentacion.id,
                    nombreSnapshot: productoActualizado.nombre,
                    presentacionSnapshot: presentacion.nombre,
                    cantidad: cantidadComprada,
                    motivo: item.nota || values.nota || "Compra registrada",
                    createdAt: Timestamp.now(),
                },
            });
        }

        const subtotal = redondear(subtotalDetallado, 2);
        const diferenciaNoAsignada = totalTicket > 0 ? redondear(totalTicket - subtotal, 2) : 0;
        const estadoDetalle = totalTicket > 0
            ? Math.abs(diferenciaNoAsignada) <= 1 ? "completo" : "parcial"
            : subtotal > 0 ? "detallado_sin_total" : "estimado";
        const mesKey = obtenerMesKey(fechaCompra);
        const gastoRegistrado = totalTicket || subtotal;
        const inventarioActualizado = recalcularInventario({
            ...inventario,
            gastoMesActual: mesKey === obtenerMesKey(new Date())
                ? redondear(Number(inventario.gastoMesActual || 0) + gastoRegistrado, 2)
                : Number(inventario.gastoMesActual || 0),
            productos: {
                ...(inventario.productos || {}),
                ...resumenesActualizados,
            },
        });

        Object.values(productosActualizados).forEach((producto) => {
            transaction.update(productoRefs[producto.id], {
                presentaciones: producto.presentaciones,
                updatedAt: Timestamp.now(),
            });
        });
        transaction.set(compraDocRef, {
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
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        movimientos.forEach((movimiento) => transaction.set(movimiento.ref, movimiento.data));
        transaction.set(invRef, inventarioActualizado);

        return { compra: { id: compraDocRef.id, items: itemsCompra }, inventario: inventarioActualizado };
    });
};

export const registrarMovimientoDespensa = async (uid, values) => {
    const fechaMovimiento = obtenerFechaDesdeInput(values.fecha);
    const fechaTimestamp = Timestamp.fromDate(fechaMovimiento);
    const cantidad = Number(values.cantidad || 0);
    const movimientoDocRef = doc(movimientosRef(uid));

    if (!values.productoId || !values.presentacionId || cantidad <= 0) {
        throw new Error("El movimiento necesita producto, presentación y cantidad mayor a 0");
    }

    return runTransaction(db, async (transaction) => {
        const productoDocRef = productoRef(uid, values.productoId);
        const productoSnap = await transaction.get(productoDocRef);
        if (!productoSnap.exists()) throw new Error("Producto no encontrado");

        const producto = { id: productoSnap.id, ...productoSnap.data() };
        const presentacion = (producto.presentaciones || []).find((item) => item.id === values.presentacionId);
        if (!presentacion) throw new Error("Presentación no encontrada");

        const { ref: invRef, data: inventario } = await obtenerInventarioTransaccion(transaction, uid);
        const resumenActual = inventario.productos?.[producto.id] || {};
        const stockPorPresentacion = { ...(resumenActual.stockPorPresentacion || {}) };
        const stockActual = Number(stockPorPresentacion[presentacion.id]?.stockActual || 0);
        const signo = values.tipo === "salida" || values.tipo === "ajuste_negativo" ? -1 : 1;
        const nuevoStock = stockActual + (cantidad * signo);

        if (nuevoStock < 0 && !values.forzarNegativo) {
            throw new Error("No se puede dejar stock negativo");
        }

        const stockPrevioPresentacion = stockPorPresentacion[presentacion.id] || {};
        let lotesCompra = stockPrevioPresentacion.lotesCompra || [];
        let costoMovimiento = 0;
        let loteMovimientoId = null;

        if (lotesCompra.length === 0 && stockActual > 0) {
            lotesCompra = [crearLoteFIFO({
                cantidad: stockActual,
                costoUnitario: Number(stockPrevioPresentacion.costoUnitarioFallback || stockPrevioPresentacion.ultimoPrecioPagado || presentacion.precioAproximado || 0),
                origenCosto: "migrado_o_referencia",
                fecha: stockPrevioPresentacion.ultimaFechaMovimiento || fechaTimestamp,
                movimientoId: "stock_previo",
            })];
        }

        if (signo < 0) {
            const consumo = consumirLotesFIFO(lotesCompra, cantidad);
            if (consumo.restante > 0 && !values.forzarNegativo) {
                throw new Error("No hay lotes suficientes para consumir con FIFO");
            }
            lotesCompra = consumo.lotes;
            costoMovimiento = consumo.costoConsumido;
        } else {
            const { precioUnitario, origenCosto } = obtenerPrecioUnitarioEntrada(values.precioTotalItem, cantidad, presentacion);
            const lote = crearLoteFIFO({
                cantidad,
                costoUnitario: precioUnitario,
                origenCosto: values.tipo === "ajuste_positivo" ? `ajuste_${origenCosto}` : origenCosto,
                fecha: fechaTimestamp,
                movimientoId: movimientoDocRef.id,
            });
            loteMovimientoId = lote.id;
            lotesCompra = [...lotesCompra, lote];
            costoMovimiento = redondear(cantidad * Number(precioUnitario || 0), 2);
        }

        stockPorPresentacion[presentacion.id] = {
            ...stockPrevioPresentacion,
            presentacionId: presentacion.id,
            nombre: presentacion.nombre,
            stockActual: redondear(nuevoStock, 2),
            unidad: presentacion.unidad,
            cantidad: presentacion.cantidad,
            equivaleAUnidadBase: presentacion.equivaleAUnidadBase,
            codigoBarras: presentacion.codigoBarras || producto.codigoBarras || "",
            metodoValuacion: "FIFO",
            lotesCompra,
            valorInventarioActual: calcularValorLotesFIFO(lotesCompra),
            costoUnitarioFallback: Number(stockPrevioPresentacion.costoUnitarioFallback || stockPrevioPresentacion.ultimoPrecioPagado || presentacion.precioAproximado || 0),
            ultimoPrecioPagado: Number(stockPrevioPresentacion.ultimoPrecioPagado || presentacion.ultimoPrecioPagado || 0),
        };

        const resumen = recalcularResumenProducto(producto, {
            ...resumenActual,
            stockPorPresentacion,
            ultimaFechaMovimiento: fechaTimestamp,
        });
        const inventarioActualizado = recalcularInventario({
            ...inventario,
            productos: {
                ...(inventario.productos || {}),
                [producto.id]: resumen,
            },
        });
        const movimiento = {
            id: movimientoDocRef.id,
            fecha: fechaTimestamp,
            tipo: values.tipo || "salida",
            productoId: producto.id,
            presentacionId: presentacion.id,
            nombreSnapshot: producto.nombre,
            presentacionSnapshot: presentacion.nombre,
            cantidad,
            cantidadFirmada: cantidad * signo,
            metodoValuacion: "FIFO",
            costoMovimiento,
            loteId: loteMovimientoId,
            motivo: values.motivo || "",
            createdAt: Timestamp.now(),
        };

        transaction.set(movimientoDocRef, movimiento);
        transaction.set(invRef, inventarioActualizado);

        return { movimiento, inventario: inventarioActualizado };
    });
};

export const marcarNecesarioDespensa = async (uid, productoId, necesario) => {
    const invRef = inventarioRef(uid);
    const snap = await getDoc(invRef);
    if (!snap.exists()) return null;

    const inventario = snap.data();
    const resumen = inventario.productos?.[productoId];
    if (!resumen) return null;

    const actualizado = recalcularInventario({
        ...inventario,
        productos: {
            ...(inventario.productos || {}),
            [productoId]: {
                ...resumen,
                necesario,
                faltante: Boolean(necesario) || Number(resumen.stockBase || 0) === 0 || (Number(resumen.stockMinimo || 0) > 0 && Number(resumen.stockBase || 0) < Number(resumen.stockMinimo || 0)),
            },
        },
    });

    await setDoc(invRef, actualizado);
    return actualizado;
};

export const desactivarProductoDespensa = async (uid, productoId) => {
    await updateDoc(productoRef(uid, productoId), {
        activo: false,
        updatedAt: Timestamp.now(),
    });
    return true;
};

export const puedeConvertirUnidadDespensa = unidadesCompatibles;
