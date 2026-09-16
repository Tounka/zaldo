import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaArrowDown,
    FaArrowUp,
    FaBarcode,
    FaBell,
    FaBolt,
    FaBox,
    FaCalendarAlt,
    FaChartLine,
    FaCheckCircle,
    FaChevronDown,
    FaChevronUp,
    FaClipboard,
    FaEdit,
    FaExclamationTriangle,
    FaHistory,
    FaList,
    FaMoneyBillWave,
    FaPlus,
    FaShoppingCart,
    FaSlidersH,
    FaStore,
    FaSyncAlt,
    FaTag,
    FaTimes,
    FaTrash,
    FaWarehouse,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import { ModalGenerico, ModalEncabezado } from "../../componentes/modales/ModalGenerico";
import {
    AccionesInline,
    Anillo,
    Badge,
    BarraAcciones,
    BotonFull,
    BotonPeligro,
    BotonPrimario,
    BotonSecundario,
    BotonTexto,
    BuscadorSelectInput,
    BuscadorSelectMenu,
    BuscadorSelectOpcion,
    BuscadorSelectVacio,
    BuscadorSelectWrap,
    Campo,
    CampoCompleto,
    CapturaAyuda,
    CapturaChip,
    CapturaFila,
    CapturaLayout,
    CapturaLista,
    CapturaNombre,
    CapturaResumen,
    CapturaTextArea,
    Cifra,
    CifraLabel,
    CifraValor,
    Chip,
    ChipGrupo,
    Encabezado,
    EncabezadoTexto,
    EncabezadoTitulo,
    EmptyState,
    Fab,
    Fila,
    FilaDerecha,
    FilaMeta,
    FilaNombre,
    FilaTexto,
    FilaValor,
    FiltroFila,
    FormGrid,
    Grupo,
    GrupoLista,
    GrupoTitulo,
    HistorialDetalle,
    HistorialHeader,
    HistorialTitulo,
    InputBase,
    Layout,
    Mensaje,
    ModalBody,
    ModalCard,
    ModalDescripcion,
    ModalSubTab,
    ModalSubTabs,
    Pagina,
    Panel,
    PanelCompleto,
    PanelHeader,
    ProductoMeta,
    ResumenCifras,
    SelectBase,
    Segmentado,
    SegmentoBtn,
    Tabla,
    TablaWrap,
    Tabs,
    TabButton,
    TarjetaHistorial,
    TextArea,
    TituloConIcono,
    colorCategoria,
    T,
} from "./estilos";
import {
    CATEGORIAS_DESPENSA,
    UNIDADES_DESPENSA,
    actualizarPresentacionDespensa,
    actualizarProductoDespensa,
    agregarPresentacionDespensa,
    ajustarStockFisicoDespensa,
    calcularCostoPorUnidadBase,
    calcularCostoPromedio,
    crearProductoDespensa,
    desactivarPresentacionDespensa,
    desactivarProductoDespensa,
    marcarNecesarioDespensa,
    obtenerDespensa,
    obtenerHistorialComprasDespensa,
    obtenerHistorialMovimientosDespensa,
    obtenerMesKey,
    registrarMovimientoDespensa,
    registrarTicketDespensa,
} from "../../funciones/firebase/despensa";
import { parsearTicket, resumirRenglones } from "../../funciones/utils/parserTicket";
import { confirmarEliminacion, avisarError, avisarExito } from "../../funciones/utils/avisos";

const todayString = () => new Date().toISOString().slice(0, 10);

const productoInicial = {
    codigoBarras: "",
    nombre: "",
    categoria: "Abarrotes",
    grupo: "",
    marca: "",
    unidadBase: "kg",
    stockMinimo: "",
    medible: "true",
    unidadesPermitidas: "kg,g,paq",
    presentacionNombre: "",
    presentacionCantidad: "1",
    presentacionUnidad: "kg",
    equivalenciaBase: "",
    precioAproximado: "",
    buenPrecio: "",
    codigoNota: "",
};

const compraInicial = {
    totalTicket: "",
    tienda: "",
    fecha: todayString(),
    nota: "",
    metodoCaptura: "detallada",
};

const compraItemInicial = {
    codigoBarras: "",
    productoId: "",
    presentacionId: "",
    cantidadComprada: "1",
    precioTotalItem: "",
    nota: "",
};

const movimientoInicial = {
    productoId: "",
    presentacionId: "",
    tipo: "salida",
    cantidad: "1",
    fecha: todayString(),
    motivo: "",
};

const presentacionInicial = {
    productoId: "",
    codigoBarras: "",
    presentacionNombre: "",
    presentacionCantidad: "1",
    presentacionUnidad: "kg",
    equivalenciaBase: "",
    precioAproximado: "",
    buenPrecio: "",
    codigoNota: "",
};

const edicionProductoInicial = {
    id: "",
    codigoBarras: "",
    nombre: "",
    categoria: "Abarrotes",
    grupo: "",
    marca: "",
    unidadBase: "kg",
    stockMinimo: "",
    medible: true,
    unidadesPermitidas: "kg,g,paq",
};

const edicionPresentacionInicial = {
    productoId: "",
    presentacionId: "",
    codigoBarras: "",
    presentacionNombre: "",
    presentacionCantidad: "1",
    presentacionUnidad: "kg",
    equivalenciaBase: "",
    precioAproximado: "",
    buenPrecio: "",
    codigoNota: "",
};

const formatoMoneda = (valor) => Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
});

const obtenerPresentaciones = (producto) => (producto?.presentaciones || []).filter((presentacion) => presentacion.activa !== false);

const normalizarCodigoBarras = (codigo) => String(codigo || "").replace(/\D/g, "");

const inferirCategoriaDespensa = (texto = "") => {
    const normalizado = texto.toLowerCase();
    if (/leche|yogur|queso|crema/.test(normalizado)) return "Lácteos";
    if (/jab[oó]n|detergente|limpiador|cloro/.test(normalizado)) return "Limpieza";
    if (/shampoo|papel|pasta dental|higiene/.test(normalizado)) return "Higiene";
    if (/at[uú]n|sardina|lata|enlat/.test(normalizado)) return "Enlatados";
    if (/agua|jugo|refresco|bebida/.test(normalizado)) return "Bebidas";
    if (/helado|congel/.test(normalizado)) return "Congelados";
    if (/papas|botana|galleta/.test(normalizado)) return "Botanas";
    return "Abarrotes";
};

const inferirGrupoProducto = (texto = "") => {
    const normalizado = texto.toLowerCase();
    if (/at[uú]n/.test(normalizado)) return "Atún";
    if (/frijol/.test(normalizado)) return "Frijoles";
    if (/cereal|avena|granola/.test(normalizado)) return "Cereal";
    if (/arroz/.test(normalizado)) return "Arroz";
    if (/pasta|spaghetti|espagueti/.test(normalizado)) return "Pasta";
    if (/leche/.test(normalizado)) return "Leche";
    if (/aceite/.test(normalizado)) return "Aceite";
    return texto.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
};

const parsearCantidadPresentacion = (productoApi = {}) => {
    const unidadApi = String(productoApi.product_quantity_unit || "").toLowerCase();
    const cantidadApi = Number(productoApi.product_quantity || 0);
    const quantity = String(productoApi.quantity || "");
    const match = quantity.match(/([\d.,]+)\s*(ml|l|g|kg|pz|pieza|piezas|lata|botella|bolsa|caja|paq)/i);
    const cantidadTexto = match ? Number(match[1].replace(",", ".")) : 0;
    const unidadTexto = match?.[2]?.toLowerCase() || "";
    const unidad = unidadApi || unidadTexto;

    if (unidad === "ml") return { cantidad: cantidadApi || cantidadTexto || 1, unidad: "ml", unidadBase: "L" };
    if (unidad === "l") return { cantidad: cantidadApi || cantidadTexto || 1, unidad: "L", unidadBase: "L" };
    if (unidad === "g") return { cantidad: cantidadApi || cantidadTexto || 1, unidad: "g", unidadBase: "kg" };
    if (unidad === "kg") return { cantidad: cantidadApi || cantidadTexto || 1, unidad: "kg", unidadBase: "kg" };
    return { cantidad: cantidadApi || cantidadTexto || 1, unidad: "pz", unidadBase: "pz" };
};

const buscarPorCodigoBarras = (productos, codigo) => {
    const codigoNormalizado = normalizarCodigoBarras(codigo);
    if (!codigoNormalizado) return null;

    for (const producto of productos) {
        const presentacion = obtenerPresentaciones(producto).find((item) => normalizarCodigoBarras(item.codigoBarras) === codigoNormalizado);
        if (presentacion) return { producto, presentacion };
        if (normalizarCodigoBarras(producto.codigoBarras) === codigoNormalizado) {
            return { producto, presentacion: obtenerPresentaciones(producto)[0] || null };
        }
    }

    return null;
};

/*
 * Costos a nivel producto. Se toma como referencia la presentación con más stock;
 * si no hay stock, la primera con historial de compra. El costo por unidad base es
 * lo que permite comparar presentaciones y marcas entre sí.
 */
const costosDelProducto = (resumen) => {
    const presentaciones = Object.values(resumen?.stockPorPresentacion || {});
    if (presentaciones.length === 0) return { promedio: 0, porBase: null };

    const conStock = presentaciones.filter((presentacion) => Number(presentacion.stockActual || 0) > 0);
    const candidatas = conStock.length > 0 ? conStock : presentaciones;
    const referencia = candidatas.reduce(
        (mejor, actual) => Number(actual.stockActual || 0) > Number(mejor.stockActual || 0) ? actual : mejor,
        candidatas[0]
    );

    return {
        promedio: Number(referencia.costoPromedio || 0),
        porBase: referencia.costoPorUnidadBase ?? null,
    };
};

// El costo por gramo suele ser < $1, así que necesita más decimales que el resto.
const formatoCostoBase = (valor) => Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: valor < 1 ? 4 : 2,
    maximumFractionDigits: 4,
});

/*
 * Nivel de existencias para el anillo de la lista. Se lee como un medidor de
 * gasolina: lleno y verde = tranquilo. Cuando el producto tiene mínimo definido
 * se compara contra él; si no, basta con saber si hay o no hay.
 */
const nivelExistencias = (producto) => {
    const stock = Number(producto.stockBase || 0);
    const minimo = Number(producto.stockMinimo || 0);

    if (producto.necesario) {
        return { fill: 0.12, color: T.peligro, etiqueta: "Marcado" };
    }
    if (stock <= 0) {
        return { fill: 0, color: T.peligro, etiqueta: "Agotado" };
    }
    if (minimo > 0) {
        const razon = stock / minimo;
        if (razon < 1) return { fill: Math.max(0.15, razon / 2), color: T.peligro, etiqueta: "Bajo mínimo" };
        if (razon < 1.5) return { fill: 0.6, color: T.alerta, etiqueta: "Justo" };
        return { fill: 1, color: T.ok, etiqueta: "Suficiente" };
    }
    return { fill: 1, color: T.ok, etiqueta: "En existencia" };
};

const estadoValuacion = (estado) => {
    if (estado === "valuacionCompleta") return { texto: "Valuado", tipo: "ok" };
    if (estado === "valuacionParcial") return { texto: "Parcial", tipo: "parcial" };
    if (estado === "sin_stock") return { texto: "Sin stock", tipo: "alerta" };
    return { texto: "Sin valuación", tipo: "alerta" };
};

const etiquetaProducto = (producto) => {
    if (!producto) return "";
    return [producto.nombre, producto.marca, producto.grupo, producto.categoria, producto.codigoBarras].filter(Boolean).join(" · ");
};

const ProductoBuscadorSelect = ({ productos, value, onChange, placeholder = "Buscar producto" }) => {
    const [busquedaProducto, setBusquedaProducto] = useState("");
    const [abierto, setAbierto] = useState(false);
    const productoSeleccionado = useMemo(
        () => productos.find((producto) => producto.id === value),
        [productos, value]
    );

    useEffect(() => {
        setBusquedaProducto(etiquetaProducto(productoSeleccionado));
    }, [productoSeleccionado]);

    const resultados = useMemo(() => {
        const texto = busquedaProducto.trim().toLowerCase();
        return productos
            .filter((producto) => etiquetaProducto(producto).toLowerCase().includes(texto))
            .slice(0, 8);
    }, [busquedaProducto, productos]);

    return (
        <BuscadorSelectWrap>
            <BuscadorSelectInput
                value={busquedaProducto}
                onFocus={() => setAbierto(true)}
                onBlur={() => window.setTimeout(() => setAbierto(false), 120)}
                onChange={(event) => {
                    setBusquedaProducto(event.target.value);
                    setAbierto(true);
                    if (value) onChange("");
                }}
                placeholder={placeholder}
                autoComplete="off"
            />
            {abierto && (
                <BuscadorSelectMenu role="listbox">
                    {resultados.length === 0 ? (
                        <BuscadorSelectVacio>No hay productos que coincidan.</BuscadorSelectVacio>
                    ) : resultados.map((producto) => (
                        <BuscadorSelectOpcion
                            key={producto.id}
                            type="button"
                            role="option"
                            aria-selected={producto.id === value}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                onChange(producto.id);
                                setBusquedaProducto(etiquetaProducto(producto));
                                setAbierto(false);
                            }}
                        >
                            <strong>{producto.nombre}</strong>
                            <ProductoMeta>{producto.marca || "Sin marca"} · {producto.categoria || "Sin categoría"}</ProductoMeta>
                        </BuscadorSelectOpcion>
                    ))}
                </BuscadorSelectMenu>
            )}
        </BuscadorSelectWrap>
    );
};

export const PaginaDespensaUx = () => {
    const { usuario, setDespensaUsuario } = useAppStore();
    const [inventario, setInventario] = useState(null);
    const [productos, setProductos] = useState([]);
    const [catalogo, setCatalogo] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [tab, setTab] = useState("dashboard");
    const [busqueda, setBusqueda] = useState("");
    const [productoForm, setProductoForm] = useState(productoInicial);
    const [compraForm, setCompraForm] = useState(compraInicial);
    const [compraItems, setCompraItems] = useState([compraItemInicial]);
    const [movimientoForm, setMovimientoForm] = useState(movimientoInicial);
    const [presentacionForm, setPresentacionForm] = useState(presentacionInicial);
    const [edicionProducto, setEdicionProducto] = useState(edicionProductoInicial);
    const [edicionPresentacion, setEdicionPresentacion] = useState(edicionPresentacionInicial);
    const [modalActivo, setModalActivo] = useState(null);
    const [mensaje, setMensaje] = useState(null);
    const [consultandoCodigo, setConsultandoCodigo] = useState(false);
    const [textoCaptura, setTextoCaptura] = useState("");
    const [renglonesCaptura, setRenglonesCaptura] = useState([]);

    const [historialCompras, setHistorialCompras] = useState([]);
    const [cargandoCompras, setCargandoCompras] = useState(false);
    const [anioCompras, setAnioCompras] = useState(new Date().getFullYear());
    const [compraExpandida, setCompraExpandida] = useState(null);

    const [historialMovimientos, setHistorialMovimientos] = useState([]);
    const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
    const [mesMovimientos, setMesMovimientos] = useState(obtenerMesKey(new Date()));

    const [tabEdicion, setTabEdicion] = useState("producto");

    const [ajusteForm, setAjusteForm] = useState({
        productoId: "",
        presentacionId: "",
        nuevoStock: "",
        motivo: "Conteo físico en casa",
    });

    const cargarHistorialCompras = useCallback(async (anio = anioCompras) => {
        if (!usuario?.uid) return;
        setCargandoCompras(true);
        const data = await obtenerHistorialComprasDespensa(usuario.uid, anio);
        setHistorialCompras(data);
        setCargandoCompras(false);
    }, [anioCompras, usuario?.uid]);

    const cargarHistorialMovimientos = useCallback(async (mesKey = mesMovimientos) => {
        if (!usuario?.uid) return;
        setCargandoMovimientos(true);
        const data = await obtenerHistorialMovimientosDespensa(usuario.uid, mesKey);
        setHistorialMovimientos(data);
        setCargandoMovimientos(false);
    }, [mesMovimientos, usuario?.uid]);

    const cargarDatos = useCallback(async (forzarFirebase = false) => {
        if (!usuario?.uid) return;
        const dataCache = useAppStore.getState().despensaPorUsuario[usuario.uid];
        if (dataCache && !forzarFirebase) {
            setInventario(dataCache.inventario);
            setProductos(dataCache.productos || []);
            setCatalogo(dataCache.catalogo || null);
            setCargando(false);
            return;
        }

        setCargando(true);
        const data = await obtenerDespensa(usuario.uid);
        setInventario(data.inventario);
        setProductos(data.productos);
        setCatalogo(data.catalogo);
        setDespensaUsuario(usuario.uid, data);
        const primerProducto = data.productos[0];
        const primeraPresentacion = obtenerPresentaciones(primerProducto)[0];
        setCompraItems((prev) => prev.map((item, index) => index === 0 ? {
            ...item,
            codigoBarras: item.codigoBarras || primeraPresentacion?.codigoBarras || primerProducto?.codigoBarras || "",
            productoId: item.productoId || primerProducto?.id || "",
            presentacionId: item.presentacionId || primeraPresentacion?.id || "",
        } : item));
        setMovimientoForm((prev) => ({
            ...prev,
            productoId: prev.productoId || primerProducto?.id || "",
            presentacionId: prev.presentacionId || primeraPresentacion?.id || "",
        }));
        setPresentacionForm((prev) => ({ ...prev, productoId: prev.productoId || primerProducto?.id || "" }));
        setCargando(false);
    }, [setDespensaUsuario, usuario?.uid]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    useEffect(() => {
        if (tab === "compras") {
            cargarHistorialCompras(anioCompras);
        } else if (tab === "movimientos") {
            cargarHistorialMovimientos(mesMovimientos);
        }
    }, [tab, anioCompras, mesMovimientos, cargarHistorialCompras, cargarHistorialMovimientos]);

    const resumenes = useMemo(() => {
        const lista = Object.values(inventario?.productos || {});
        return lista
            .filter((producto) => {
                const textoExtendido = `${producto.nombre} ${producto.categoria} ${producto.grupo || ""} ${producto.marca} ${producto.codigoBarras || ""}`.toLowerCase();
                return textoExtendido.includes(busqueda.toLowerCase());
            })
            .sort((a, b) => Number(b.faltante) - Number(a.faltante) || a.nombre.localeCompare(b.nombre));
    }, [inventario, busqueda]);

    /*
     * Aplana producto -> presentaciones para poder compararlas por costo por unidad
     * base, y marca la más barata de cada grupo (el grupo junta marcas distintas
     * del mismo bien: "Atún" agrupa Herdez, Dolores, etc.).
     */
    const presentacionesComparadas = useMemo(() => {
        const filas = [];
        productos.forEach((producto) => {
            obtenerPresentaciones(producto).forEach((presentacion) => {
                const costoPromedio = calcularCostoPromedio(presentacion);
                if (!costoPromedio) return;
                filas.push({
                    productoId: producto.id,
                    presentacionId: presentacion.id,
                    productoNombre: producto.nombre,
                    marca: producto.marca,
                    grupo: producto.grupo,
                    unidadBase: producto.unidadBase,
                    nombre: presentacion.nombre,
                    stockActual: Number(presentacion.stockActual || 0),
                    totalIngresado: Number(presentacion.totalIngresado || 0),
                    costoPromedio,
                    costoPorUnidadBase: calcularCostoPorUnidadBase(presentacion),
                    precioMinimoHistorico: Number(presentacion.precioMinimoHistorico || 0),
                    precioMaximoHistorico: Number(presentacion.precioMaximoHistorico || 0),
                });
            });
        });

        // El "más barato" solo tiene sentido entre presentaciones de la misma
        // unidad base dentro del mismo grupo, y si hay con qué comparar.
        const mejorPorGrupo = new Map();
        filas.forEach((fila) => {
            if (fila.costoPorUnidadBase === null) return;
            const llave = `${fila.grupo || "sin_grupo"}_${fila.unidadBase}`;
            const actual = mejorPorGrupo.get(llave);
            if (!actual || fila.costoPorUnidadBase < actual.costoPorUnidadBase) {
                mejorPorGrupo.set(llave, fila);
            }
        });
        const conteoPorGrupo = filas.reduce((acumulado, fila) => {
            if (fila.costoPorUnidadBase === null) return acumulado;
            const llave = `${fila.grupo || "sin_grupo"}_${fila.unidadBase}`;
            acumulado[llave] = (acumulado[llave] || 0) + 1;
            return acumulado;
        }, {});

        filas.forEach((fila) => {
            const llave = `${fila.grupo || "sin_grupo"}_${fila.unidadBase}`;
            fila.esMejorDelGrupo = conteoPorGrupo[llave] > 1 && mejorPorGrupo.get(llave) === fila;
        });

        return filas.sort((a, b) => String(a.grupo || "").localeCompare(String(b.grupo || ""))
            || String(a.productoNombre).localeCompare(String(b.productoNombre)));
    }, [productos]);

    /*
     * Agrupa el inventario por categoría siguiendo el orden de CATEGORIAS_DESPENSA,
     * para que la lista tenga siempre la misma secuencia y sea predecible.
     */
    const resumenesPorCategoria = useMemo(() => {
        const porCategoria = new Map();
        resumenes.forEach((producto) => {
            const categoria = producto.categoria || "Otros";
            if (!porCategoria.has(categoria)) porCategoria.set(categoria, []);
            porCategoria.get(categoria).push(producto);
        });

        const orden = [...CATEGORIAS_DESPENSA];
        return [...porCategoria.entries()]
            .map(([categoria, productosCategoria]) => ({ categoria, productos: productosCategoria }))
            .sort((a, b) => {
                const posA = orden.indexOf(a.categoria);
                const posB = orden.indexOf(b.categoria);
                return (posA === -1 ? orden.length : posA) - (posB === -1 ? orden.length : posB);
            });
    }, [resumenes]);

    const gruposProductos = useMemo(
        () => [...new Set(productos.map((producto) => producto.grupo).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [productos]
    );

    const productoMovimiento = useMemo(
        () => productos.find((producto) => producto.id === movimientoForm.productoId),
        [productos, movimientoForm.productoId]
    );
    const presentacionesMovimiento = obtenerPresentaciones(productoMovimiento);

    /*
     * Toda mutación devuelve ya el catálogo, el inventario y los productos nuevos.
     * Se aplican directo al estado: cero lecturas extra a Firestore.
     */
    const aplicarResultado = useCallback((result) => {
        if (!result) return;
        if (result.catalogo) setCatalogo(result.catalogo);
        if (result.inventario) setInventario(result.inventario);
        if (result.productos) setProductos(result.productos);
        if (usuario?.uid && result.catalogo) {
            setDespensaUsuario(usuario.uid, {
                catalogo: result.catalogo,
                inventario: result.inventario,
                productos: result.productos,
            });
        }
    }, [setDespensaUsuario, usuario?.uid]);

    const mostrarMensaje = (tipo, texto) => {
        setMensaje({ tipo, texto });
        window.setTimeout(() => setMensaje(null), 4200);
    };

    const handleProductoChange = (field, value) => {
        setProductoForm((prev) => {
            const next = { ...prev, [field]: value };
            if (field === "unidadBase") {
                next.presentacionUnidad = value;
                next.unidadesPermitidas = value;
            }
            return next;
        });
    };

    const handleBuscarCodigoProducto = async () => {
        const codigo = normalizarCodigoBarras(productoForm.codigoBarras);
        if (codigo.length < 6) {
            mostrarMensaje("error", "Captura un código de barras válido.");
            return;
        }

        const existente = buscarPorCodigoBarras(productos, codigo);
        if (existente) {
            cargarProductoParaEditar(existente.producto.id);
            mostrarMensaje("ok", "Ese código ya existe en tu despensa. Abrí el producto para editarlo.");
            return;
        }

        try {
            setConsultandoCodigo(true);
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,brands,categories,quantity,product_quantity,product_quantity_unit,image_front_url`);
            if (!response.ok) throw new Error("No se pudo consultar el código");
            const data = await response.json();
            if (data.status !== 1 || !data.product) {
                mostrarMensaje("error", "No encontré información externa para ese código. Puedes darlo de alta manualmente.");
                return;
            }

            const productoApi = data.product;
            const nombre = productoApi.product_name || "";
            const marca = String(productoApi.brands || "").split(",")[0].trim();
            const textoCategoria = `${productoApi.categories || ""} ${nombre}`;
            const presentacion = parsearCantidadPresentacion(productoApi);
            setProductoForm((prev) => ({
                ...prev,
                codigoBarras: codigo,
                nombre: nombre || prev.nombre,
                marca: marca || prev.marca,
                categoria: inferirCategoriaDespensa(textoCategoria),
                grupo: prev.grupo || inferirGrupoProducto(nombre),
                unidadBase: presentacion.unidadBase,
                unidadesPermitidas: presentacion.unidadBase === "kg" ? "kg,g" : presentacion.unidadBase === "L" ? "L,ml" : presentacion.unidadBase,
                presentacionNombre: productoApi.quantity || `${presentacion.cantidad} ${presentacion.unidad}`,
                presentacionCantidad: String(presentacion.cantidad),
                presentacionUnidad: presentacion.unidad,
                imagen: productoApi.image_front_url || prev.imagen,
            }));
            mostrarMensaje("ok", "Datos encontrados. Revisa y guarda el producto.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo consultar Open Food Facts. Puedes guardar el código manualmente.");
        } finally {
            setConsultandoCodigo(false);
        }
    };

    const handleCrearProducto = async (event) => {
        event.preventDefault();
        if (!productoForm.nombre.trim()) {
            mostrarMensaje("error", "El producto necesita nombre.");
            return;
        }
        if (Number(productoForm.buenPrecio || 0) > Number(productoForm.precioAproximado || 0) && Number(productoForm.precioAproximado || 0) > 0) {
            mostrarMensaje("error", "El buen precio debe ser menor o igual al precio aproximado.");
            return;
        }

        try {
            setGuardando(true);
            aplicarResultado(await crearProductoDespensa(usuario.uid, { ...productoForm, catalogo }));
            setProductoForm(productoInicial);
            setModalActivo(null);
            mostrarMensaje("ok", "Producto agregado a despensa.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo crear el producto.");
        } finally {
            setGuardando(false);
        }
    };

    const handleAgregarPresentacion = async (event) => {
        event.preventDefault();
        if (!presentacionForm.productoId || !presentacionForm.presentacionNombre.trim()) {
            mostrarMensaje("error", "Selecciona producto y nombre de presentación.");
            return;
        }

        try {
            setGuardando(true);
            aplicarResultado(await agregarPresentacionDespensa(
                usuario.uid,
                presentacionForm.productoId,
                { ...presentacionForm, catalogo }
            ));
            setPresentacionForm((prev) => ({ ...presentacionInicial, productoId: prev.productoId }));
            setModalActivo(null);
            mostrarMensaje("ok", "Presentación agregada.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo agregar la presentación.");
        } finally {
            setGuardando(false);
        }
    };

    const cargarProductoParaEditar = (productoId) => {
        const producto = productos.find((item) => item.id === productoId);
        if (!producto) return;
        const presentacion = obtenerPresentaciones(producto)[0];
        setEdicionProducto({
            id: producto.id,
            codigoBarras: producto.codigoBarras || "",
            nombre: producto.nombre || "",
            categoria: producto.categoria || "Otros",
            grupo: producto.grupo || "",
            marca: producto.marca || "",
            unidadBase: producto.unidadBase || "pz",
            stockMinimo: producto.stockMinimo ?? "",
            medible: producto.medible ?? true,
            unidadesPermitidas: (producto.unidadesPermitidas || []).join(","),
        });
        if (presentacion) {
            setEdicionPresentacion({
                productoId: producto.id,
                presentacionId: presentacion.id,
                codigoBarras: presentacion.codigoBarras || producto.codigoBarras || "",
                presentacionNombre: presentacion.nombre || "",
                presentacionCantidad: presentacion.cantidad || "",
                presentacionUnidad: presentacion.unidad || producto.unidadBase || "pz",
                equivalenciaBase: presentacion.equivaleAUnidadBase ?? "",
                precioAproximado: presentacion.precioAproximado ?? "",
                buenPrecio: presentacion.buenPrecio ?? "",
                codigoNota: presentacion.codigoNota || "",
            });
        }
        setModalActivo("editar");
    };

    const handleSeleccionProductoEditar = (productoId) => {
        if (!productoId) {
            setEdicionProducto(edicionProductoInicial);
            setEdicionPresentacion(edicionPresentacionInicial);
            return;
        }
        cargarProductoParaEditar(productoId);
    };

    const handleActualizarProducto = async (event) => {
        event.preventDefault();
        if (!edicionProducto.id) {
            mostrarMensaje("error", "Selecciona un producto para editar.");
            return;
        }

        try {
            setGuardando(true);
            aplicarResultado(await actualizarProductoDespensa(
                usuario.uid,
                edicionProducto.id,
                { ...edicionProducto, catalogo }
            ));
            setModalActivo(null);
            mostrarMensaje("ok", "Producto actualizado.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo actualizar el producto.");
        } finally {
            setGuardando(false);
        }
    };

    const handleActualizarPresentacion = async (event) => {
        event.preventDefault();
        if (!edicionPresentacion.productoId || !edicionPresentacion.presentacionId) {
            mostrarMensaje("error", "Selecciona una presentación para editar.");
            return;
        }

        try {
            setGuardando(true);
            aplicarResultado(await actualizarPresentacionDespensa(
                usuario.uid,
                edicionPresentacion.productoId,
                edicionPresentacion.presentacionId,
                { ...edicionPresentacion, catalogo }
            ));
            setModalActivo(null);
            mostrarMensaje("ok", "Presentación actualizada. El precio de referencia es independiente del costo promedio real.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo actualizar la presentación.");
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminarProducto = async () => {
        if (!edicionProducto.id) return;
        const confirmado = await confirmarEliminacion({
            titulo: `¿Archivar "${edicionProducto.nombre}"?`,
            texto: "El producto se retirará de tu inventario activo y ya no aparecerá en la despensa.",
            textoConfirmar: "Sí, archivar",
        });
        if (!confirmado) return;

        try {
            setGuardando(true);
            const res = await desactivarProductoDespensa(usuario.uid, edicionProducto.id, catalogo);
            aplicarResultado(res);
            setModalActivo(null);
            mostrarMensaje("ok", "Producto archivado del catálogo.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo archivar el producto.");
        } finally {
            setGuardando(false);
        }
    };

    const handleDesactivarPresentacion = async () => {
        if (!edicionPresentacion.productoId || !edicionPresentacion.presentacionId) return;
        const confirmado = await confirmarEliminacion({
            titulo: `¿Desactivar "${edicionPresentacion.presentacionNombre}"?`,
            texto: "Esta presentación ya no estará disponible para compras ni consumos.",
            textoConfirmar: "Sí, desactivar",
        });
        if (!confirmado) return;

        try {
            setGuardando(true);
            const res = await desactivarPresentacionDespensa(
                usuario.uid,
                edicionPresentacion.productoId,
                edicionPresentacion.presentacionId,
                catalogo
            );
            aplicarResultado(res);
            setModalActivo(null);
            mostrarMensaje("ok", "Presentación desactivada.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo desactivar la presentación.");
        } finally {
            setGuardando(false);
        }
    };

    const handleAbrirAjusteFisico = (productoId, presentacionId) => {
        const prodId = productoId || productos[0]?.id || "";
        const producto = productos.find((item) => item.id === prodId);
        const pres = presentacionId
            ? obtenerPresentaciones(producto).find((p) => p.id === presentacionId)
            : obtenerPresentaciones(producto)[0];
        setAjusteForm({
            productoId: prodId,
            presentacionId: pres?.id || "",
            nuevoStock: pres ? String(pres.stockActual || 0) : "0",
            motivo: "Conteo físico en casa",
        });
        setModalActivo("ajuste");
    };

    const handleGuardarAjusteFisico = async (event) => {
        event.preventDefault();
        if (!ajusteForm.productoId || !ajusteForm.presentacionId) {
            mostrarMensaje("error", "Selecciona producto y presentación.");
            return;
        }

        try {
            setGuardando(true);
            const res = await ajustarStockFisicoDespensa(usuario.uid, {
                productoId: ajusteForm.productoId,
                presentacionId: ajusteForm.presentacionId,
                nuevoStock: ajusteForm.nuevoStock,
                motivo: ajusteForm.motivo,
                catalogo,
            });
            aplicarResultado(res);
            setModalActivo(null);
            mostrarMensaje("ok", "Stock actualizado según el conteo físico.");
            if (tab === "movimientos") {
                cargarHistorialMovimientos(mesMovimientos);
            }
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", error.message || "No se pudo ajustar el stock.");
        } finally {
            setGuardando(false);
        }
    };

    const handleProductoMovimiento = (productoId) => {
        const producto = productos.find((item) => item.id === productoId);
        const presentacion = obtenerPresentaciones(producto)[0];
        setMovimientoForm((prev) => ({ ...prev, productoId, presentacionId: presentacion?.id || "" }));
    };

    const handleCompraItemChange = (index, field, value) => {
        setCompraItems((prev) => prev.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            if (field === "productoId") {
                const producto = productos.find((productoItem) => productoItem.id === value);
                const presentacion = obtenerPresentaciones(producto)[0];
                return { ...item, productoId: value, presentacionId: presentacion?.id || "", codigoBarras: presentacion?.codigoBarras || producto?.codigoBarras || item.codigoBarras };
            }
            if (field === "presentacionId") {
                const producto = productos.find((productoItem) => productoItem.id === item.productoId);
                const presentacion = obtenerPresentaciones(producto).find((pres) => pres.id === value);
                return { ...item, presentacionId: value, codigoBarras: presentacion?.codigoBarras || producto?.codigoBarras || item.codigoBarras };
            }
            return { ...item, [field]: value };
        }));
    };

    const handleCodigoBarrasCompra = (index, codigo) => {
        const codigoNormalizado = normalizarCodigoBarras(codigo);
        const encontrado = buscarPorCodigoBarras(productos, codigoNormalizado);
        setCompraItems((prev) => prev.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            if (!encontrado?.presentacion) return { ...item, codigoBarras: codigoNormalizado };
            return {
                ...item,
                codigoBarras: codigoNormalizado,
                productoId: encontrado.producto.id,
                presentacionId: encontrado.presentacion.id,
            };
        }));
        if (codigoNormalizado.length >= 6 && !encontrado) {
            mostrarMensaje("error", "No encontré ese código en tu despensa. Dalo de alta como producto o presentación.");
        }
    };

    const handleAgregarRenglonCompra = () => {
        const producto = productos[0];
        const presentacion = obtenerPresentaciones(producto)[0];
        setCompraItems((prev) => [
            ...prev,
            {
                ...compraItemInicial,
                codigoBarras: presentacion?.codigoBarras || producto?.codigoBarras || "",
                productoId: producto?.id || "",
                presentacionId: presentacion?.id || "",
            },
        ]);
    };

    const handleEliminarRenglonCompra = (index) => {
        setCompraItems((prev) => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const subtotalCompra = compraItems.reduce((total, item) => total + Number(item.precioTotalItem || 0), 0);

    const handleRegistrarCompra = async (event) => {
        event.preventDefault();
        const itemsValidos = compraItems.filter((item) => item.productoId && item.presentacionId && Number(item.cantidadComprada || 0) > 0);
        if (itemsValidos.length === 0) {
            mostrarMensaje("error", "Agrega al menos un renglón válido al ticket.");
            return;
        }

        try {
            setGuardando(true);
            const result = await registrarTicketDespensa(usuario.uid, { ...compraForm, items: itemsValidos, catalogo });
            aplicarResultado(result);
            setCompraForm(compraInicial);
            setCompraItems([compraItemInicial]);
            setModalActivo(null);
            mostrarMensaje("ok", "Compra registrada y stock actualizado.");
            cargarHistorialCompras(anioCompras);
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", error.message || "No se pudo registrar la compra.");
        } finally {
            setGuardando(false);
        }
    };

    const handleRegistrarMovimiento = async (event) => {
        event.preventDefault();
        if (!movimientoForm.productoId || !movimientoForm.presentacionId) {
            mostrarMensaje("error", "Selecciona producto y presentación.");
            return;
        }

        try {
            setGuardando(true);
            aplicarResultado(await registrarMovimientoDespensa(usuario.uid, { ...movimientoForm, catalogo }));
            setMovimientoForm((prev) => ({ ...movimientoInicial, productoId: prev.productoId, presentacionId: prev.presentacionId }));
            setModalActivo(null);
            mostrarMensaje("ok", "Movimiento registrado.");
            cargarHistorialMovimientos(mesMovimientos);
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", error.message || "No se pudo registrar el movimiento.");
        } finally {
            setGuardando(false);
        }
    };

    const handleNecesario = async (productoId, necesario) => {
        try {
            aplicarResultado(await marcarNecesarioDespensa(usuario.uid, productoId, necesario, catalogo));
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo actualizar el faltante manual.");
        }
    };

    /* ── Captura rápida: pegas el ticket y se resuelve contra el catálogo ── */

    const abrirCaptura = () => {
        setTextoCaptura("");
        setRenglonesCaptura([]);
        setModalActivo("captura");
    };

    const handlePegarPortapapeles = async () => {
        try {
            const texto = await navigator.clipboard.readText();
            setTextoCaptura(texto);
            setRenglonesCaptura(parsearTicket(texto, catalogo));
        } catch {
            mostrarMensaje("error", "No pude leer el portapapeles. Pega con Ctrl+V.");
        }
    };

    const handleTextoCapturaChange = (texto) => {
        setTextoCaptura(texto);
        setRenglonesCaptura(parsearTicket(texto, catalogo));
    };

    const handleRenglonCapturaChange = (indice, campo, valor) => {
        setRenglonesCaptura((prev) => prev.map((renglon, i) => i === indice ? { ...renglon, [campo]: valor } : renglon));
    };

    const handleEliminarRenglonCaptura = (indice) => {
        setRenglonesCaptura((prev) => prev.filter((_, i) => i !== indice));
    };

    const resumenCaptura = resumirRenglones(renglonesCaptura);

    const handleConfirmarCaptura = async (event) => {
        event.preventDefault();
        if (renglonesCaptura.length === 0) {
            mostrarMensaje("error", "No hay renglones que registrar.");
            return;
        }

        try {
            setGuardando(true);
            const result = await registrarTicketDespensa(usuario.uid, {
                ...compraForm,
                metodoCaptura: "rapida",
                items: renglonesCaptura,
                catalogo,
            });
            aplicarResultado(result);
            setTextoCaptura("");
            setRenglonesCaptura([]);
            setCompraForm(compraInicial);
            setModalActivo(null);
            cargarHistorialCompras(anioCompras);
            const nuevos = result.productosNuevos
                ? ` ${result.productosNuevos} producto${result.productosNuevos > 1 ? "s" : ""} nuevo${result.productosNuevos > 1 ? "s" : ""} dado${result.productosNuevos > 1 ? "s" : ""} de alta.`
                : "";
            mostrarMensaje("ok", `Ticket registrado con ${result.compra.items.length} renglones.${nuevos}`);
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", error.message || "No se pudo registrar el ticket.");
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <Pagina>
                <EmptyState>
                    <FaWarehouse />
                    <strong>Cargando despensa...</strong>
                </EmptyState>
            </Pagina>
        );
    }

    const faltantes = inventario?.faltantes || [];

    return (
        <Pagina>
            <Encabezado>
                <EncabezadoTitulo>Despensa</EncabezadoTitulo>
                <EncabezadoTexto>
                    Lo que tienes en casa, cuánto te costó y qué se está acabando.
                </EncabezadoTexto>
            </Encabezado>

            <ResumenCifras>
                <Cifra>
                    <CifraValor>{formatoMoneda(inventario?.valorTotalInventario)}</CifraValor>
                    <CifraLabel>Valor en casa</CifraLabel>
                </Cifra>
                <Cifra>
                    <CifraValor $tono={faltantes.length > 0 ? "alerta" : undefined}>{faltantes.length}</CifraValor>
                    <CifraLabel>Por reponer</CifraLabel>
                </Cifra>
                <Cifra>
                    <CifraValor>{formatoMoneda(inventario?.gastoMesActual)}</CifraValor>
                    <CifraLabel>Gasto del mes</CifraLabel>
                </Cifra>
            </ResumenCifras>

            <BarraAcciones>
                <BotonPrimario type="button" onClick={abrirCaptura}><FaBolt /> Captura rápida</BotonPrimario>
                <BotonSecundario type="button" onClick={() => setModalActivo("movimiento")}><FaArrowDown /> Consumo</BotonSecundario>
                <BotonSecundario type="button" onClick={() => handleAbrirAjusteFisico()}><FaSlidersH /> Conteo físico</BotonSecundario>
                <BotonSecundario type="button" onClick={() => setModalActivo("producto")}><FaPlus /> Producto</BotonSecundario>
                <BotonSecundario type="button" onClick={() => setModalActivo("presentacion")}><FaBox /> Presentación</BotonSecundario>
                <BotonTexto type="button" onClick={() => cargarDatos(true)} title="Volver a leer desde Firestore">
                    <FaSyncAlt /> Actualizar
                </BotonTexto>
            </BarraAcciones>

            <Tabs>
                <TabButton $activo={tab === "dashboard"} onClick={() => setTab("dashboard")}><FaWarehouse /> Inventario</TabButton>
                <TabButton $activo={tab === "productos"} onClick={() => setTab("productos")}><FaTag /> Costos</TabButton>
                <TabButton $activo={tab === "compras"} onClick={() => setTab("compras")}><FaShoppingCart /> Compras</TabButton>
                <TabButton $activo={tab === "movimientos"} onClick={() => setTab("movimientos")}><FaEdit /> Consumo</TabButton>
            </Tabs>

            {mensaje && <Mensaje $tipo={mensaje.tipo}>{mensaje.texto}</Mensaje>}
            <datalist id="grupos-despensa">
                {gruposProductos.map((grupo) => <option key={grupo} value={grupo} />)}
            </datalist>

            {tab === "dashboard" && (
                <Layout>
                    <InputBase
                        value={busqueda}
                        onChange={(event) => setBusqueda(event.target.value)}
                        placeholder="Buscar producto, marca o código"
                    />

                    {resumenes.length === 0 ? (
                        <Panel>
                            <EmptyState>
                                <FaBox />
                                <strong>Tu despensa está vacía</strong>
                                <span>Usa la captura rápida para dar de alta lo que compraste hoy.</span>
                            </EmptyState>
                        </Panel>
                    ) : (
                        resumenesPorCategoria.map(({ categoria, productos: productosCategoria }) => (
                            <Grupo key={categoria}>
                                <GrupoTitulo $color={colorCategoria(categoria)}>
                                    {categoria}
                                    <span>{productosCategoria.length}</span>
                                </GrupoTitulo>
                                <GrupoLista $color={colorCategoria(categoria)}>
                                    {productosCategoria.map((producto) => {
                                        const nivel = nivelExistencias(producto);
                                        return (
                                            <Fila
                                                key={producto.productoId}
                                                type="button"
                                                onClick={() => cargarProductoParaEditar(producto.productoId)}
                                            >
                                                <FilaTexto>
                                                    <FilaNombre>{producto.nombre}</FilaNombre>
                                                    <FilaMeta>
                                                        {[producto.marca, producto.grupo].filter(Boolean).join(" · ") || "Sin marca"}
                                                    </FilaMeta>
                                                </FilaTexto>
                                                <FilaDerecha>
                                                    <FilaValor>
                                                        {producto.resumenStock}
                                                        <span>{nivel.etiqueta}</span>
                                                    </FilaValor>
                                                    <Anillo $fill={nivel.fill} $color={nivel.color} title={nivel.etiqueta} />
                                                </FilaDerecha>
                                            </Fila>
                                        );
                                    })}
                                </GrupoLista>
                            </Grupo>
                        ))
                    )}

                    {faltantes.length > 0 && (
                        <Panel>
                            <PanelHeader>
                                <TituloConIcono><FaBell /> Por reponer</TituloConIcono>
                            </PanelHeader>
                            {faltantes.map((producto) => (
                                <Fila
                                    key={producto.productoId}
                                    type="button"
                                    onClick={() => handleNecesario(producto.productoId, false)}
                                >
                                    <FilaTexto>
                                        <FilaNombre>{producto.nombre}</FilaNombre>
                                        <FilaMeta>Quedan {producto.resumenStock}</FilaMeta>
                                    </FilaTexto>
                                    <Badge $estado="alerta">Reponer</Badge>
                                </Fila>
                            ))}
                        </Panel>
                    )}
                </Layout>
            )}


            {tab === "dashboard" && (
                <Fab type="button" onClick={abrirCaptura} aria-label="Captura rápida de ticket">
                    <FaPlus />
                </Fab>
            )}

            {tab === "productos" && (
                <Layout>
                    <PanelCompleto>
                        <PanelHeader>
                            <TituloConIcono>
                                <FaBox />
                                <H2 size="20px" color="var(--colorMorado)">Productos activos</H2>
                            </TituloConIcono>
                        </PanelHeader>
                        <TablaWrap>
                            <Tabla>
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Grupo</th>
                                        <th>Categoría</th>
                                        <th>Código</th>
                                        <th>Stock resumido</th>
                                        <th>Ingresado</th>
                                        <th>Costo prom.</th>
                                        <th>$ / unidad base</th>
                                        <th>Valor actual</th>
                                        <th>Estado</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resumenes.map((producto) => {
                                        const valuacion = estadoValuacion(producto.valuacionEstado);
                                        const costos = costosDelProducto(producto);
                                        return (
                                            <tr key={producto.productoId}>
                                                <td>
                                                    <strong>{producto.nombre}</strong>
                                                    <ProductoMeta>{producto.marca || "Sin marca"}</ProductoMeta>
                                                </td>
                                                <td>{producto.grupo || "Sin grupo"}</td>
                                                <td>{producto.categoria}</td>
                                                <td>{producto.codigoBarras || "-"}</td>
                                                <td>{producto.resumenStock}</td>
                                                <td>
                                                    <strong>{producto.totalIngresado || 0}</strong>
                                                    <ProductoMeta>{producto.vecesComprado || 0} compras · consumido {producto.totalConsumido || 0}</ProductoMeta>
                                                </td>
                                                <td>{costos.promedio ? formatoMoneda(costos.promedio) : "-"}</td>
                                                <td>
                                                    {costos.porBase !== null ? (
                                                        <>
                                                            <strong>{formatoCostoBase(costos.porBase)}</strong>
                                                            <ProductoMeta>por {producto.unidadBase}</ProductoMeta>
                                                        </>
                                                    ) : "-"}
                                                </td>
                                                <td>{formatoMoneda(producto.valorInventarioActual)}</td>
                                                <td>
                                                    <AccionesInline>
                                                        <Badge $estado={producto.faltante ? "alerta" : "ok"}>{producto.faltante ? "Faltante" : "OK"}</Badge>
                                                        <Badge $estado={valuacion.tipo}>{valuacion.texto}</Badge>
                                                    </AccionesInline>
                                                </td>
                                                <td>
                                                    <BotonSecundario type="button" onClick={() => cargarProductoParaEditar(producto.productoId)}>
                                                        <FaEdit /> Editar
                                                    </BotonSecundario>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Tabla>
                        </TablaWrap>
                    </PanelCompleto>
                    <PanelCompleto style={{ marginTop: "14px" }}>
                        <PanelHeader>
                            <TituloConIcono>
                                <FaTag />
                                <H2 size="20px" color="var(--colorMorado)">Comparador de presentaciones</H2>
                            </TituloConIcono>
                            <ModalDescripcion>
                                El costo por unidad base es lo que hace comparables presentaciones y marcas
                                distintas. El más barato de cada grupo va marcado.
                            </ModalDescripcion>
                        </PanelHeader>
                        {presentacionesComparadas.length === 0 ? (
                            <EmptyState>
                                <FaTag />
                                <strong>Todavía no hay compras registradas</strong>
                                <span>En cuanto captures un ticket se calcula el costo por gramo de cada presentación.</span>
                            </EmptyState>
                        ) : (
                            <TablaWrap>
                                <Tabla>
                                    <thead>
                                        <tr>
                                            <th>Grupo</th>
                                            <th>Producto</th>
                                            <th>Presentación</th>
                                            <th>Stock</th>
                                            <th>Ingresado</th>
                                            <th>Costo prom.</th>
                                            <th>$ / unidad base</th>
                                            <th>Rango pagado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {presentacionesComparadas.map((fila) => (
                                            <tr key={`${fila.productoId}_${fila.presentacionId}`}>
                                                <td>{fila.grupo || "Sin grupo"}</td>
                                                <td>
                                                    <strong>{fila.productoNombre}</strong>
                                                    <ProductoMeta>{fila.marca || "Sin marca"}</ProductoMeta>
                                                </td>
                                                <td>{fila.nombre}</td>
                                                <td>{fila.stockActual}</td>
                                                <td>{fila.totalIngresado}</td>
                                                <td>{fila.costoPromedio ? formatoMoneda(fila.costoPromedio) : "-"}</td>
                                                <td>
                                                    <AccionesInline>
                                                        {fila.costoPorUnidadBase !== null
                                                            ? <strong>{formatoCostoBase(fila.costoPorUnidadBase)}</strong>
                                                            : "-"}
                                                        {fila.esMejorDelGrupo && <Badge $estado="ok">Más barato</Badge>}
                                                    </AccionesInline>
                                                    <ProductoMeta>por {fila.unidadBase}</ProductoMeta>
                                                </td>
                                                <td>
                                                    {fila.precioMinimoHistorico
                                                        ? `${formatoMoneda(fila.precioMinimoHistorico)} – ${formatoMoneda(fila.precioMaximoHistorico)}`
                                                        : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Tabla>
                            </TablaWrap>
                        )}
                    </PanelCompleto>
                </Layout>
            )}

            {tab === "compras" && (
                <Layout>
                    <FiltroFila>
                        <AccionesInline>
                            <TituloConIcono>
                                <FaHistory />
                                <H2 size="18px" color="var(--colorMorado)">Historial de tickets</H2>
                            </TituloConIcono>
                            <select
                                value={anioCompras}
                                onChange={(e) => {
                                    const nuevoAnio = Number(e.target.value);
                                    setAnioCompras(nuevoAnio);
                                    cargarHistorialCompras(nuevoAnio);
                                }}
                                style={{
                                    height: "40px",
                                    padding: "0 12px",
                                    borderRadius: "10px",
                                    border: `1px solid ${T.borde}`,
                                    fontWeight: 700,
                                    color: T.texto,
                                    background: "#ffffff",
                                }}
                            >
                                {[2026, 2025, 2024, 2023].map((anio) => (
                                    <option key={anio} value={anio}>{anio}</option>
                                ))}
                            </select>
                        </AccionesInline>
                        <AccionesInline>
                            <BotonSecundario type="button" onClick={() => setModalActivo("compra")}>
                                <FaPlus /> Ticket manual
                            </BotonSecundario>
                            <BotonPrimario type="button" onClick={abrirCaptura}>
                                <FaBolt /> Captura rápida
                            </BotonPrimario>
                        </AccionesInline>
                    </FiltroFila>

                    {cargandoCompras ? (
                        <Panel>
                            <EmptyState>
                                <FaSyncAlt />
                                <strong>Cargando historial de compras...</strong>
                            </EmptyState>
                        </Panel>
                    ) : historialCompras.length === 0 ? (
                        <Panel>
                            <EmptyState>
                                <FaShoppingCart />
                                <strong>No hay compras registradas en {anioCompras}</strong>
                                <span>Registra tus tickets con la captura rápida o manual para comenzar a armar tu histórico.</span>
                            </EmptyState>
                        </Panel>
                    ) : (
                        historialCompras.map((compra) => {
                            const fechaObj = compra.fecha?.toDate?.() || new Date(compra.fecha || 0);
                            const fechaFmt = fechaObj.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
                            const expandido = compraExpandida === compra.id;
                            const total = compra.totalTicket || compra.subtotalDetallado || 0;
                            return (
                                <TarjetaHistorial key={compra.id}>
                                    <HistorialHeader onClick={() => setCompraExpandida(expandido ? null : compra.id)}>
                                        <HistorialTitulo>
                                            <FaStore style={{ color: T.marca, fontSize: "18px" }} />
                                            <div>
                                                <strong>{compra.tienda || "Ticket de compra"}</strong>
                                                <span>{fechaFmt} · {compra.items?.length || 0} producto(s)</span>
                                            </div>
                                        </HistorialTitulo>
                                        <AccionesInline>
                                            <strong style={{ fontSize: "16px", color: "var(--colorMorado)" }}>
                                                {formatoMoneda(total)}
                                            </strong>
                                            <Badge $estado={compra.metodoCaptura === "rapida" ? "ok" : "parcial"}>
                                                {compra.metodoCaptura === "rapida" ? "Captura rápida" : "Detallada"}
                                            </Badge>
                                            {expandido ? <FaChevronUp /> : <FaChevronDown />}
                                        </AccionesInline>
                                    </HistorialHeader>
                                    {expandido && (
                                        <HistorialDetalle>
                                            <TablaWrap>
                                                <Tabla>
                                                    <thead>
                                                        <tr>
                                                            <th>Producto</th>
                                                            <th>Presentación</th>
                                                            <th>Cantidad</th>
                                                            <th>Precio Unit.</th>
                                                            <th>Total renglón</th>
                                                            <th>Nota</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(compra.items || []).map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td><strong>{item.nombreSnapshot || "Producto"}</strong></td>
                                                                <td>{item.presentacionSnapshot || item.unidadCompra || "-"}</td>
                                                                <td>{item.cantidadComprada}</td>
                                                                <td>{formatoMoneda(item.precioUnitario)}</td>
                                                                <td><strong>{formatoMoneda(item.costoEntradaTotal || item.precioTotalItem)}</strong></td>
                                                                <td><ProductoMeta>{item.nota || "-"}</ProductoMeta></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Tabla>
                                            </TablaWrap>
                                        </HistorialDetalle>
                                    )}
                                </TarjetaHistorial>
                            );
                        })
                    )}
                </Layout>
            )}

            {tab === "movimientos" && (
                <Layout>
                    <FiltroFila>
                        <AccionesInline>
                            <TituloConIcono>
                                <FaHistory />
                                <H2 size="18px" color="var(--colorMorado)">Bitácora de movimientos</H2>
                            </TituloConIcono>
                            <input
                                type="month"
                                value={`${mesMovimientos.slice(0, 4)}-${mesMovimientos.slice(4, 6)}`}
                                onChange={(e) => {
                                    const val = e.target.value.replace("-", "");
                                    setMesMovimientos(val);
                                    cargarHistorialMovimientos(val);
                                }}
                                style={{
                                    height: "40px",
                                    padding: "0 12px",
                                    borderRadius: "10px",
                                    border: `1px solid ${T.borde}`,
                                    fontWeight: 700,
                                    color: T.texto,
                                    background: "#ffffff",
                                }}
                            />
                        </AccionesInline>
                        <AccionesInline>
                            <BotonSecundario type="button" onClick={() => handleAbrirAjusteFisico()}>
                                <FaSlidersH /> Conteo físico
                            </BotonSecundario>
                            <BotonPrimario type="button" onClick={() => setModalActivo("movimiento")}>
                                <FaArrowDown /> Registrar consumo
                            </BotonPrimario>
                        </AccionesInline>
                    </FiltroFila>

                    {cargandoMovimientos ? (
                        <Panel>
                            <EmptyState>
                                <FaSyncAlt />
                                <strong>Cargando movimientos del mes...</strong>
                            </EmptyState>
                        </Panel>
                    ) : historialMovimientos.length === 0 ? (
                        <Panel>
                            <EmptyState>
                                <FaBox />
                                <strong>No hay movimientos en este mes</strong>
                                <span>Los consumos, entradas y mermas quedarán registrados en esta bitácora.</span>
                            </EmptyState>
                        </Panel>
                    ) : (
                        <PanelCompleto>
                            <TablaWrap>
                                <Tabla>
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Producto</th>
                                            <th>Presentación</th>
                                            <th>Cantidad</th>
                                            <th>Costo estimado</th>
                                            <th>Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historialMovimientos.map((mov) => {
                                            const fechaObj = mov.fecha?.toDate?.() || new Date(mov.fecha || 0);
                                            const fechaFmt = fechaObj.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                                            const esSalida = mov.tipo === "salida" || mov.tipo === "ajuste_negativo";
                                            const estadoBadge = mov.tipo === "salida" ? "ok" : mov.tipo === "ajuste_positivo" ? "parcial" : "alerta";
                                            const etiquetaTipo = mov.tipo === "salida" ? "Consumo" : mov.tipo === "ajuste_positivo" ? "Entrada" : "Merma";
                                            return (
                                                <tr key={mov.id}>
                                                    <td><ProductoMeta>{fechaFmt}</ProductoMeta></td>
                                                    <td><Badge $estado={estadoBadge}>{etiquetaTipo}</Badge></td>
                                                    <td><strong>{mov.nombreSnapshot}</strong></td>
                                                    <td>{mov.presentacionSnapshot}</td>
                                                    <td>
                                                        <strong style={{ color: esSalida ? T.peligro : T.ok }}>
                                                            {esSalida ? `-${mov.cantidad}` : `+${mov.cantidad}`}
                                                        </strong>
                                                    </td>
                                                    <td>{mov.costoMovimiento ? formatoMoneda(mov.costoMovimiento) : "-"}</td>
                                                    <td><ProductoMeta>{mov.motivo || "Sin nota"}</ProductoMeta></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Tabla>
                            </TablaWrap>
                        </PanelCompleto>
                    )}

                    {faltantes.length > 0 && (
                        <Panel>
                            <PanelHeader>
                                <TituloConIcono><FaBell /> Faltantes y por reponer</TituloConIcono>
                            </PanelHeader>
                            <TablaWrap>
                                <Tabla>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Stock actual</th>
                                            <th>Mínimo</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {faltantes.map((producto) => (
                                            <tr key={producto.productoId}>
                                                <td><strong>{producto.nombre}</strong></td>
                                                <td>{producto.resumenStock}</td>
                                                <td>{producto.stockMinimo}</td>
                                                <td><Badge $estado="alerta">Reponer</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Tabla>
                            </TablaWrap>
                        </Panel>
                    )}
                </Layout>
            )}

            {modalActivo === "producto" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaBox />}
                            bleed={0}
                            title="Nuevo producto"
                            description="Escanea un código para prellenar datos o crea el producto manualmente con su grupo y primera presentación."
                        />
                        <ModalBody>
                            <FormGrid onSubmit={handleCrearProducto}>
                                <CampoCompleto>Código de barras
                                    <AccionesInline>
                                        <InputBase style={{ flex: "1 1 220px" }} inputMode="numeric" value={productoForm.codigoBarras} onChange={(event) => handleProductoChange("codigoBarras", normalizarCodigoBarras(event.target.value))} placeholder="Escanea o pega el código" />
                                        <BotonSecundario type="button" disabled={consultandoCodigo} onClick={handleBuscarCodigoProducto}><FaBarcode /> {consultandoCodigo ? "Buscando..." : "Buscar datos"}</BotonSecundario>
                                    </AccionesInline>
                                </CampoCompleto>
                                <CampoCompleto>Nombre<InputBase value={productoForm.nombre} onChange={(event) => handleProductoChange("nombre", event.target.value)} placeholder="Arroz, leche, atún" /></CampoCompleto>
                                <CampoCompleto as="div">Categoría
                                    <ChipGrupo>
                                        {CATEGORIAS_DESPENSA.map((item) => (
                                            <Chip key={item} type="button" $activo={productoForm.categoria === item} onClick={() => handleProductoChange("categoria", item)}>{item}</Chip>
                                        ))}
                                    </ChipGrupo>
                                </CampoCompleto>
                                <Campo>Grupo<InputBase list="grupos-despensa" value={productoForm.grupo} onChange={(event) => handleProductoChange("grupo", event.target.value)} placeholder="Atún, frijoles, cereal" /></Campo>
                                <Campo>Marca opcional<InputBase value={productoForm.marca} onChange={(event) => handleProductoChange("marca", event.target.value)} placeholder="Marca" /></Campo>
                                <CampoCompleto as="div">Unidad base
                                    <ChipGrupo>
                                        {UNIDADES_DESPENSA.map((unidad) => (
                                            <Chip key={unidad} type="button" $activo={productoForm.unidadBase === unidad} onClick={() => handleProductoChange("unidadBase", unidad)}>{unidad}</Chip>
                                        ))}
                                    </ChipGrupo>
                                </CampoCompleto>
                                <Campo>Stock mínimo<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={productoForm.stockMinimo} onChange={(event) => handleProductoChange("stockMinimo", event.target.value)} placeholder="Ej. 2" /></Campo>
                                <Campo>Medible<SelectBase value={productoForm.medible} onChange={(event) => handleProductoChange("medible", event.target.value)}><option value="true">Sí</option><option value="false">No</option></SelectBase></Campo>
                                <Campo>Unidades permitidas<InputBase value={productoForm.unidadesPermitidas} onChange={(event) => handleProductoChange("unidadesPermitidas", event.target.value)} placeholder="kg,g,paq" /></Campo>
                                <CampoCompleto>Presentación inicial<InputBase value={productoForm.presentacionNombre} onChange={(event) => handleProductoChange("presentacionNombre", event.target.value)} placeholder="Bolsa 900 g, botella 1 L" /></CampoCompleto>
                                <Campo>Cantidad<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={productoForm.presentacionCantidad} onChange={(event) => handleProductoChange("presentacionCantidad", event.target.value)} /></Campo>
                                <Campo>Unidad<SelectBase value={productoForm.presentacionUnidad} onChange={(event) => handleProductoChange("presentacionUnidad", event.target.value)}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Equivalencia base<InputBase type="number" inputMode="decimal" min="0" step="0.0001" value={productoForm.equivalenciaBase} onChange={(event) => handleProductoChange("equivalenciaBase", event.target.value)} placeholder="Opcional" /></Campo>
                                <Campo>Precio aproximado<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={productoForm.precioAproximado} onChange={(event) => handleProductoChange("precioAproximado", event.target.value)} /></Campo>
                                <Campo>Buen precio<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={productoForm.buenPrecio} onChange={(event) => handleProductoChange("buenPrecio", event.target.value)} /></Campo>
                                <Campo>Nota interna<InputBase value={productoForm.codigoNota} onChange={(event) => handleProductoChange("codigoNota", event.target.value)} /></Campo>
                                <BotonFull><BotonPrimario disabled={guardando} type="submit"><FaPlus /> Crear producto</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}

            {modalActivo === "presentacion" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaTag />}
                            bleed={0}
                            title="Nueva presentación"
                            description="Agrega otra forma de comprar o almacenar un producto existente."
                        />
                        <ModalBody>
                            <FormGrid onSubmit={handleAgregarPresentacion}>
                                <CampoCompleto>Producto<ProductoBuscadorSelect productos={productos} value={presentacionForm.productoId} onChange={(productoId) => setPresentacionForm((prev) => ({ ...prev, productoId }))} placeholder="Buscar por nombre, marca o categoría" /></CampoCompleto>
                                <CampoCompleto>Código de barras<InputBase inputMode="numeric" value={presentacionForm.codigoBarras} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, codigoBarras: normalizarCodigoBarras(event.target.value) }))} placeholder="Escanea o pega el código de esta presentación" /></CampoCompleto>
                                <CampoCompleto>Descripción<InputBase value={presentacionForm.presentacionNombre} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, presentacionNombre: event.target.value }))} placeholder="Caja 12 piezas, lata 140 g" /></CampoCompleto>
                                <Campo>Cantidad<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={presentacionForm.presentacionCantidad} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, presentacionCantidad: event.target.value }))} /></Campo>
                                <Campo>Unidad<SelectBase value={presentacionForm.presentacionUnidad} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, presentacionUnidad: event.target.value }))}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Equivalencia base<InputBase type="number" inputMode="decimal" min="0" step="0.0001" value={presentacionForm.equivalenciaBase} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, equivalenciaBase: event.target.value }))} /></Campo>
                                <Campo>Precio aproximado<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={presentacionForm.precioAproximado} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, precioAproximado: event.target.value }))} /></Campo>
                                <Campo>Buen precio<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={presentacionForm.buenPrecio} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, buenPrecio: event.target.value }))} /></Campo>
                                <Campo>Nota interna<InputBase value={presentacionForm.codigoNota} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, codigoNota: event.target.value }))} /></Campo>
                                <BotonFull><BotonPrimario disabled={guardando || productos.length === 0} type="submit"><FaPlus /> Agregar presentación</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}

            {modalActivo === "editar" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaEdit />}
                            bleed={0}
                            title="Editar catálogo"
                            description="Actualiza datos de productos, presentaciones y referencias. El costo promedio ponderado real se mantiene intacto."
                        />
                        <ModalSubTabs>
                            <ModalSubTab
                                type="button"
                                $activo={tabEdicion === "producto"}
                                onClick={() => setTabEdicion("producto")}
                            >
                                <FaBox /> Datos del producto
                            </ModalSubTab>
                            <ModalSubTab
                                type="button"
                                $activo={tabEdicion === "presentaciones"}
                                onClick={() => setTabEdicion("presentaciones")}
                            >
                                <FaTag /> Presentaciones
                            </ModalSubTab>
                        </ModalSubTabs>
                        <ModalBody>
                            {tabEdicion === "producto" ? (
                                <FormGrid onSubmit={handleActualizarProducto}>
                                    <CampoCompleto>Producto<ProductoBuscadorSelect productos={productos} value={edicionProducto.id} onChange={handleSeleccionProductoEditar} placeholder="Buscar producto para editar" /></CampoCompleto>
                                    <CampoCompleto>Código de barras<InputBase inputMode="numeric" value={edicionProducto.codigoBarras} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, codigoBarras: normalizarCodigoBarras(event.target.value) }))} /></CampoCompleto>
                                    <CampoCompleto>Nombre<InputBase value={edicionProducto.nombre} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, nombre: event.target.value }))} /></CampoCompleto>
                                    <CampoCompleto as="div">Categoría
                                        <ChipGrupo>
                                            {CATEGORIAS_DESPENSA.map((item) => (
                                                <Chip key={item} type="button" $activo={edicionProducto.categoria === item} onClick={() => setEdicionProducto((prev) => ({ ...prev, categoria: item }))}>{item}</Chip>
                                            ))}
                                        </ChipGrupo>
                                    </CampoCompleto>
                                    <Campo>Grupo<InputBase list="grupos-despensa" value={edicionProducto.grupo} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, grupo: event.target.value }))} placeholder="Atún, frijoles, cereal" /></Campo>
                                    <Campo>Marca<InputBase value={edicionProducto.marca} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, marca: event.target.value }))} /></Campo>
                                    <Campo>Unidad base<SelectBase value={edicionProducto.unidadBase} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, unidadBase: event.target.value }))}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                    <Campo>Stock mínimo<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={edicionProducto.stockMinimo} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, stockMinimo: event.target.value }))} /></Campo>
                                    <CampoCompleto>Unidades permitidas<InputBase value={edicionProducto.unidadesPermitidas} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, unidadesPermitidas: event.target.value }))} /></CampoCompleto>
                                    <AccionesInline style={{ gridColumn: "1 / -1", justifyContent: "space-between", marginTop: "12px" }}>
                                        <BotonPeligro type="button" disabled={guardando || !edicionProducto.id} onClick={handleEliminarProducto}>
                                            <FaTrash /> Archivar producto
                                        </BotonPeligro>
                                        <BotonPrimario disabled={guardando || !edicionProducto.id} type="submit">
                                            <FaEdit /> Guardar cambios
                                        </BotonPrimario>
                                    </AccionesInline>
                                </FormGrid>
                            ) : (
                                <FormGrid onSubmit={handleActualizarPresentacion}>
                                    <CampoCompleto>Producto<ProductoBuscadorSelect productos={productos} value={edicionProducto.id} onChange={handleSeleccionProductoEditar} placeholder="Buscar producto para editar" /></CampoCompleto>
                                    <CampoCompleto>Presentación a editar<SelectBase value={edicionPresentacion.presentacionId} onChange={(event) => {
                                        const producto = productos.find((item) => item.id === edicionProducto.id);
                                        const presentacion = obtenerPresentaciones(producto).find((item) => item.id === event.target.value);
                                        if (!presentacion) return;
                                        setEdicionPresentacion({ productoId: producto.id, presentacionId: presentacion.id, codigoBarras: presentacion.codigoBarras || producto.codigoBarras || "", presentacionNombre: presentacion.nombre || "", presentacionCantidad: presentacion.cantidad || "", presentacionUnidad: presentacion.unidad || producto.unidadBase || "pz", equivalenciaBase: presentacion.equivaleAUnidadBase ?? "", precioAproximado: presentacion.precioAproximado ?? "", buenPrecio: presentacion.buenPrecio ?? "", codigoNota: presentacion.codigoNota || "" });
                                    }}><option value="">Selecciona presentación</option>{obtenerPresentaciones(productos.find((item) => item.id === edicionProducto.id)).map((presentacion) => <option key={presentacion.id} value={presentacion.id}>{presentacion.nombre}</option>)}</SelectBase></CampoCompleto>
                                    <CampoCompleto>Código de barras<InputBase inputMode="numeric" value={edicionPresentacion.codigoBarras} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, codigoBarras: normalizarCodigoBarras(event.target.value) }))} /></CampoCompleto>
                                    <CampoCompleto>Nombre presentación<InputBase value={edicionPresentacion.presentacionNombre} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, presentacionNombre: event.target.value }))} /></CampoCompleto>
                                    <Campo>Cantidad<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={edicionPresentacion.presentacionCantidad} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, presentacionCantidad: event.target.value }))} /></Campo>
                                    <Campo>Unidad<SelectBase value={edicionPresentacion.presentacionUnidad} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, presentacionUnidad: event.target.value }))}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                    <Campo>Equivalencia base<InputBase type="number" inputMode="decimal" min="0" step="0.0001" value={edicionPresentacion.equivalenciaBase} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, equivalenciaBase: event.target.value }))} /></Campo>
                                    <Campo>Precio aproximado<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={edicionPresentacion.precioAproximado} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, precioAproximado: event.target.value }))} /></Campo>
                                    <Campo>Buen precio<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={edicionPresentacion.buenPrecio} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, buenPrecio: event.target.value }))} /></Campo>
                                    <Campo>Nota interna<InputBase value={edicionPresentacion.codigoNota} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, codigoNota: event.target.value }))} /></Campo>
                                    <AccionesInline style={{ gridColumn: "1 / -1", justifyContent: "space-between", marginTop: "12px" }}>
                                        <BotonPeligro type="button" disabled={guardando || !edicionPresentacion.presentacionId} onClick={handleDesactivarPresentacion}>
                                            <FaTrash /> Desactivar presentación
                                        </BotonPeligro>
                                        <BotonPrimario disabled={guardando || !edicionPresentacion.presentacionId} type="submit">
                                            <FaTag /> Guardar presentación
                                        </BotonPrimario>
                                    </AccionesInline>
                                </FormGrid>
                            )}
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}

            {modalActivo === "compra" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaShoppingCart />}
                            bleed={0}
                            title="Capturar ticket"
                            description="Escanea códigos o agrega productos manualmente. Cada renglón alimenta el costo promedio."
                        />
                        <ModalBody>
                            <FormGrid onSubmit={handleRegistrarCompra}>
                                <Campo>Total ticket<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={compraForm.totalTicket} onChange={(event) => setCompraForm((prev) => ({ ...prev, totalTicket: event.target.value }))} placeholder="Opcional" /></Campo>
                                <Campo>Tienda<InputBase value={compraForm.tienda} onChange={(event) => setCompraForm((prev) => ({ ...prev, tienda: event.target.value }))} placeholder="Supermercado" /></Campo>
                                <Campo>Fecha<InputBase type="date" value={compraForm.fecha} onChange={(event) => setCompraForm((prev) => ({ ...prev, fecha: event.target.value }))} /></Campo>
                                <Campo>Método<SelectBase value={compraForm.metodoCaptura} onChange={(event) => setCompraForm((prev) => ({ ...prev, metodoCaptura: event.target.value }))}><option value="rapida">Rápida</option><option value="detallada">Detallada</option><option value="mixta">Mixta</option></SelectBase></Campo>
                                <CampoCompleto>Nota<TextArea value={compraForm.nota} onChange={(event) => setCompraForm((prev) => ({ ...prev, nota: event.target.value }))} placeholder="Ticket parcial, promoción, observación" /></CampoCompleto>
                                <CampoCompleto>
                                    <PanelHeader>
                                        <TituloConIcono><FaList /><H2 size="18px" color="var(--colorMorado)">Renglones del ticket</H2></TituloConIcono>
                                        <AccionesInline>
                                            <Badge>Subtotal: {formatoMoneda(subtotalCompra)}</Badge>
                                            <BotonSecundario type="button" onClick={handleAgregarRenglonCompra}><FaPlus /> Agregar renglón</BotonSecundario>
                                        </AccionesInline>
                                    </PanelHeader>
                                    <TablaWrap>
                                        <Tabla>
                                            <thead>
                                                <tr>
                                                    <th>Código</th>
                                                    <th>Producto</th>
                                                    <th>Presentación</th>
                                                    <th>Cantidad</th>
                                                    <th>Precio renglón</th>
                                                    <th>Nota</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {compraItems.map((item, index) => {
                                                    const producto = productos.find((productoItem) => productoItem.id === item.productoId);
                                                    const presentaciones = obtenerPresentaciones(producto);
                                                    return (
                                                        <tr key={index}>
                                                            <td><InputBase inputMode="numeric" value={item.codigoBarras} onChange={(event) => handleCompraItemChange(index, "codigoBarras", normalizarCodigoBarras(event.target.value))} onBlur={(event) => handleCodigoBarrasCompra(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleCodigoBarrasCompra(index, event.currentTarget.value); } }} placeholder="Escanea" /></td>
                                                            <td><SelectBase value={item.productoId} onChange={(event) => handleCompraItemChange(index, "productoId", event.target.value)}><option value="">Producto</option>{productos.map((productoItem) => <option key={productoItem.id} value={productoItem.id}>{productoItem.nombre}</option>)}</SelectBase></td>
                                                            <td><SelectBase value={item.presentacionId} onChange={(event) => handleCompraItemChange(index, "presentacionId", event.target.value)}><option value="">Presentación</option>{presentaciones.map((presentacion) => <option key={presentacion.id} value={presentacion.id}>{presentacion.nombre}</option>)}</SelectBase></td>
                                                            <td><InputBase type="number" inputMode="decimal" min="0" step="0.01" value={item.cantidadComprada} onChange={(event) => handleCompraItemChange(index, "cantidadComprada", event.target.value)} /></td>
                                                            <td><InputBase type="number" inputMode="decimal" min="0" step="0.01" value={item.precioTotalItem} onChange={(event) => handleCompraItemChange(index, "precioTotalItem", event.target.value)} placeholder="Opcional" /></td>
                                                            <td><InputBase value={item.nota} onChange={(event) => handleCompraItemChange(index, "nota", event.target.value)} placeholder="Opcional" /></td>
                                                            <td><BotonTexto type="button" onClick={() => handleEliminarRenglonCompra(index)}>Quitar</BotonTexto></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Tabla>
                                    </TablaWrap>
                                </CampoCompleto>
                                <BotonFull><BotonPrimario disabled={guardando || productos.length === 0} type="submit"><FaArrowUp /> Confirmar ticket</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}

            {modalActivo === "movimiento" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaArrowDown />}
                            bleed={0}
                            title="Consumo o ajuste"
                            description="Registra salidas o corrige diferencias de inventario."
                        />
                        <ModalBody>
                            <FormGrid onSubmit={handleRegistrarMovimiento}>
                                <CampoCompleto>Producto<SelectBase value={movimientoForm.productoId} onChange={(event) => handleProductoMovimiento(event.target.value)}><option value="">Selecciona producto</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</SelectBase></CampoCompleto>
                                <CampoCompleto>Presentación<SelectBase value={movimientoForm.presentacionId} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, presentacionId: event.target.value }))}><option value="">Selecciona presentación</option>{presentacionesMovimiento.map((presentacion) => <option key={presentacion.id} value={presentacion.id}>{presentacion.nombre}</option>)}</SelectBase></CampoCompleto>
                                <CampoCompleto as="div">Tipo de movimiento
                                    <Segmentado>
                                        {[
                                            { valor: "salida", texto: "Consumo" },
                                            { valor: "ajuste_positivo", texto: "Entrada" },
                                            { valor: "ajuste_negativo", texto: "Merma" },
                                        ].map((opcion) => (
                                            <SegmentoBtn
                                                key={opcion.valor}
                                                type="button"
                                                $activo={movimientoForm.tipo === opcion.valor}
                                                onClick={() => setMovimientoForm((prev) => ({ ...prev, tipo: opcion.valor }))}
                                            >{opcion.texto}</SegmentoBtn>
                                        ))}
                                    </Segmentado>
                                </CampoCompleto>
                                <Campo>Cantidad<InputBase type="number" inputMode="decimal" min="0" step="0.01" value={movimientoForm.cantidad} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, cantidad: event.target.value }))} /></Campo>
                                <Campo>Fecha<InputBase type="date" value={movimientoForm.fecha} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, fecha: event.target.value }))} /></Campo>
                                <CampoCompleto>Motivo<TextArea value={movimientoForm.motivo} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Consumido, merma, corrección de conteo" /></CampoCompleto>
                                <BotonFull><BotonPrimario disabled={guardando || productos.length === 0} type="submit"><FaArrowDown /> Registrar movimiento</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}

            {modalActivo === "captura" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaBolt />}
                            bleed={0}
                            title="Captura rápida de ticket"
                            description="Escribe o pega los productos, uno por línea. Se detecta cuáles ya tienes y cuáles hay que dar de alta."
                        />
                        <ModalBody>
                            <FormGrid onSubmit={handleConfirmarCaptura}>
                                <CampoCompleto>
                                    <CapturaLayout>
                                        <div>
                                            <Campo as="div">Tienda
                                                <InputBase
                                                    value={compraForm.tienda}
                                                    onChange={(event) => setCompraForm((prev) => ({ ...prev, tienda: event.target.value }))}
                                                    placeholder="Soriana, Bodega, Walmart"
                                                />
                                            </Campo>
                                            <Campo as="div">Fecha
                                                <InputBase
                                                    type="date"
                                                    value={compraForm.fecha}
                                                    onChange={(event) => setCompraForm((prev) => ({ ...prev, fecha: event.target.value }))}
                                                />
                                            </Campo>
                                            <Campo as="div">Total del ticket (opcional)
                                                <InputBase
                                                    type="number" inputMode="decimal"
                                                    min="0"
                                                    step="0.01"
                                                    value={compraForm.totalTicket}
                                                    onChange={(event) => setCompraForm((prev) => ({ ...prev, totalTicket: event.target.value }))}
                                                    placeholder="Para cuadrar contra la suma"
                                                />
                                            </Campo>
                                            <CapturaAyuda>
                                                Un producto por línea. Entiende varios formatos:
                                                <code>{"Atún Herdez 140g   3   57.00\nLeche Lala 1L x2 $50\n7501055310401 2 38.50"}</code>
                                            </CapturaAyuda>
                                        </div>

                                        <div>
                                            <BotonSecundario type="button" onClick={handlePegarPortapapeles}>
                                                <FaClipboard /> Pegar desde portapapeles
                                            </BotonSecundario>
                                            <CapturaTextArea
                                                value={textoCaptura}
                                                onChange={(event) => handleTextoCapturaChange(event.target.value)}
                                                placeholder={"Atún Herdez 140g\t3\t57.00\nLeche Lala 1L\t2\t50.00\nArroz 1kg\t1\t22.50"}
                                            />

                                            {renglonesCaptura.length > 0 && (
                                                <>
                                                    <CapturaResumen>
                                                        <CapturaChip $tipo="existente">{resumenCaptura.existentes} ya existen</CapturaChip>
                                                        {resumenCaptura.probables > 0 && (
                                                            <CapturaChip $tipo="probable">{resumenCaptura.probables} por confirmar</CapturaChip>
                                                        )}
                                                        <CapturaChip $tipo="nuevo">{resumenCaptura.nuevos} nuevos</CapturaChip>
                                                        <CapturaChip $tipo="existente">{formatoMoneda(resumenCaptura.importe)}</CapturaChip>
                                                    </CapturaResumen>

                                                    <CapturaLista>
                                                        {renglonesCaptura.map((renglon, indice) => (
                                                            <CapturaFila key={renglon.clave} $estado={renglon.estado}>
                                                                <CapturaNombre>
                                                                    <strong>{renglon.nombre || renglon.codigoBarras}</strong>
                                                                    <span>
                                                                        {renglon.estado === "nuevo" && `Nuevo · ${renglon.categoria}`}
                                                                        {renglon.estado === "probable" && `¿${renglon.presentacionNombre}? · confirma`}
                                                                        {renglon.estado === "existente" && renglon.presentacionNombre}
                                                                    </span>
                                                                </CapturaNombre>
                                                                <InputBase
                                                                    type="number" inputMode="decimal"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={renglon.cantidadComprada}
                                                                    onChange={(event) => handleRenglonCapturaChange(indice, "cantidadComprada", event.target.value)}
                                                                />
                                                                <InputBase
                                                                    type="number" inputMode="decimal"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={renglon.precioTotalItem}
                                                                    onChange={(event) => handleRenglonCapturaChange(indice, "precioTotalItem", event.target.value)}
                                                                    placeholder="$"
                                                                />
                                                                <BotonTexto type="button" onClick={() => handleEliminarRenglonCaptura(indice)}>
                                                                    <FaTimes />
                                                                </BotonTexto>
                                                            </CapturaFila>
                                                        ))}
                                                    </CapturaLista>
                                                </>
                                            )}
                                        </div>
                                    </CapturaLayout>
                                </CampoCompleto>

                                <BotonFull>
                                    <BotonPrimario disabled={guardando || renglonesCaptura.length === 0} type="submit">
                                        <FaBolt /> Registrar {renglonesCaptura.length || ""} renglones
                                    </BotonPrimario>
                                </BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}

            {modalActivo === "ajuste" && (
                <ModalGenerico isOpen onClose={() => setModalActivo(null)} wide>
                    <ModalCard>
                        <ModalEncabezado
                            icon={<FaSlidersH />}
                            bleed={0}
                            title="Conteo físico de existencias"
                            description="Ajusta rápidamente el stock real de un producto sin alterar sus costos históricos."
                        />
                        <ModalBody>
                            <FormGrid onSubmit={handleGuardarAjusteFisico}>
                                <CampoCompleto>
                                    Producto
                                    <ProductoBuscadorSelect
                                        productos={productos}
                                        value={ajusteForm.productoId}
                                        onChange={(id) => {
                                            const prod = productos.find((p) => p.id === id);
                                            const pres = obtenerPresentaciones(prod)[0];
                                            setAjusteForm((prev) => ({
                                                ...prev,
                                                productoId: id,
                                                presentacionId: pres?.id || "",
                                                nuevoStock: pres ? String(pres.stockActual || 0) : "0",
                                            }));
                                        }}
                                        placeholder="Buscar producto para ajustar stock"
                                    />
                                </CampoCompleto>
                                <CampoCompleto>
                                    Presentación
                                    <SelectBase
                                        value={ajusteForm.presentacionId}
                                        onChange={(e) => {
                                            const prod = productos.find((p) => p.id === ajusteForm.productoId);
                                            const pres = obtenerPresentaciones(prod).find((p) => p.id === e.target.value);
                                            setAjusteForm((prev) => ({
                                                ...prev,
                                                presentacionId: e.target.value,
                                                nuevoStock: pres ? String(pres.stockActual || 0) : "0",
                                            }));
                                        }}
                                    >
                                        <option value="">Selecciona presentación</option>
                                        {obtenerPresentaciones(productos.find((p) => p.id === ajusteForm.productoId)).map((pres) => (
                                            <option key={pres.id} value={pres.id}>
                                                {pres.nombre} (Stock actual: {pres.stockActual ?? 0} {pres.unidad})
                                            </option>
                                        ))}
                                    </SelectBase>
                                </CampoCompleto>
                                <Campo>
                                    Nuevo conteo físico (unidades de presentación)
                                    <InputBase
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={ajusteForm.nuevoStock}
                                        onChange={(e) => setAjusteForm((prev) => ({ ...prev, nuevoStock: e.target.value }))}
                                        placeholder="0"
                                        required
                                    />
                                </Campo>
                                <Campo>
                                    Motivo del ajuste
                                    <InputBase
                                        value={ajusteForm.motivo}
                                        onChange={(e) => setAjusteForm((prev) => ({ ...prev, motivo: e.target.value }))}
                                        placeholder="Conteo físico en casa, merma, rotura"
                                    />
                                </Campo>
                                {(() => {
                                    const prod = productos.find((p) => p.id === ajusteForm.productoId);
                                    const pres = obtenerPresentaciones(prod).find((p) => p.id === ajusteForm.presentacionId);
                                    if (!pres) return null;
                                    const actual = Number(pres.stockActual || 0);
                                    const nuevo = Number(ajusteForm.nuevoStock || 0);
                                    const diff = Math.round((nuevo - actual) * 100) / 100;
                                    return (
                                        <CampoCompleto as="div">
                                            <AccionesInline style={{ gap: "10px", flexWrap: "wrap" }}>
                                                <Badge>Stock en sistema: {actual} {pres.unidad}</Badge>
                                                <Badge>Nuevo conteo: {nuevo} {pres.unidad}</Badge>
                                                <Badge style={{ background: diff >= 0 ? "#e6f8ee" : "#fdf2f0", color: diff >= 0 ? "#1b7340" : "#d93829" }}>
                                                    Diferencia: {diff > 0 ? `+${diff}` : diff} {pres.unidad}
                                                </Badge>
                                            </AccionesInline>
                                        </CampoCompleto>
                                    );
                                })()}
                                <BotonFull>
                                    <BotonPrimario disabled={guardando || !ajusteForm.productoId || !ajusteForm.presentacionId} type="submit">
                                        <FaCheckCircle /> Guardar conteo físico
                                    </BotonPrimario>
                                </BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalGenerico>
            )}
        </Pagina>
    );
};
