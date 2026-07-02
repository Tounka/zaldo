import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
    FaArrowDown,
    FaArrowUp,
    FaBarcode,
    FaBell,
    FaBox,
    FaChartLine,
    FaCheckCircle,
    FaTimes,
    FaEdit,
    FaExclamationTriangle,
    FaList,
    FaMoneyBillWave,
    FaPlus,
    FaShoppingCart,
    FaTag,
    FaWarehouse,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import {
    CATEGORIAS_DESPENSA,
    UNIDADES_DESPENSA,
    agregarPresentacionDespensa,
    actualizarPresentacionDespensa,
    actualizarProductoDespensa,
    crearProductoDespensa,
    marcarNecesarioDespensa,
    obtenerDespensa,
    registrarTicketDespensa,
    registrarMovimientoDespensa,
} from "../../funciones/firebase/despensa";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Pagina = styled.div`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: ${fadeUp} 0.35s ease;
`;

const Hero = styled.section`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(250, 248, 255, 0.92)),
    radial-gradient(circle at top right, rgba(180, 148, 241, 0.16), transparent 36%);
  color: #211b38;
  box-shadow: 0 8px 22px rgba(83, 59, 143, 0.08);

  &::after {
    content: "";
    position: absolute;
    inset: auto -80px -130px auto;
    width: 260px;
    height: 260px;
    border: 34px solid rgba(83, 59, 143, 0.05);
    border-radius: 999px;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const HeroTexto = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1;
`;

const HeroEyebrow = styled.span`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 999px;
  background: rgba(83, 59, 143, 0.06);
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const HeroStats = styled.div`
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const MiniStat = styled.div`
  padding: 14px;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 16px;
  background: rgba(83, 59, 143, 0.035);
`;

const StatNumero = styled.div`
  font-size: 24px;
  font-weight: 900;
  color: var(--colorMorado);
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: rgba(33, 27, 56, 0.64);
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
`;

const TabButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
  padding: 10px 14px;
  border: 1px solid rgba(83, 59, 143, ${({ $activo }) => ($activo ? "0.34" : "0.14")});
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.1)" : "white")};
  color: var(--colorMorado);
  font-weight: 800;
  cursor: pointer;
  box-shadow: ${({ $activo }) => ($activo ? "inset 0 0 0 1px rgba(83, 59, 143, 0.12)" : "none")};
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(300px, 390px) minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const BarraAcciones = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(83, 59, 143, 0.05);
`;

const Panel = styled.section`
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 18px;
  padding: 18px;
  background: ${({ $accent }) => ($accent ? "rgba(83, 59, 143, 0.035)" : "white")};
  color: #211b38;
  box-shadow: 0 6px 18px rgba(83, 59, 143, 0.06);
`;

const PanelCompleto = styled(Panel)`
  grid-column: 1 / -1;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const TituloConIcono = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: var(--colorMorado);
  }
`;

const FormGrid = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  font-weight: 900;
  color: rgba(33, 27, 56, 0.68);
  letter-spacing: 0.01em;
`;

const CampoCompleto = styled(Campo)`
  grid-column: 1 / -1;
`;

const InputBase = styled.input`
  min-height: 46px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 14px;
  padding: 0 14px;
  background: linear-gradient(180deg, #ffffff, #fbfaff);
  color: #211b38;
  outline: none;
  font-size: 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;

  &::placeholder {
    color: rgba(33, 27, 56, 0.38);
  }

  &:hover {
    border-color: rgba(83, 59, 143, 0.32);
    background: #ffffff;
  }

  &:focus {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 4px rgba(83, 59, 143, 0.1);
  }
`;

const SelectBase = styled.select`
  min-height: 46px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 14px;
  padding: 0 14px;
  background: linear-gradient(180deg, #ffffff, #fbfaff);
  color: #211b38;
  outline: none;
  font-size: 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    border-color: rgba(83, 59, 143, 0.32);
  }

  &:focus {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 4px rgba(83, 59, 143, 0.1);
  }
`;

const BuscadorSelectWrap = styled.div`
  position: relative;
`;

const BuscadorSelectInput = styled(InputBase)`
  width: 100%;
`;

const BuscadorSelectMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 8;
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(33, 27, 56, 0.14);
`;

const BuscadorSelectOpcion = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: none;
  border-radius: 12px;
  padding: 10px;
  background: transparent;
  color: #211b38;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus {
    outline: none;
    background: rgba(83, 59, 143, 0.08);
  }
`;

const BuscadorSelectVacio = styled.div`
  padding: 12px;
  color: rgba(33, 27, 56, 0.56);
  font-size: 13px;
  font-weight: 800;
`;

const TextArea = styled.textarea`
  min-height: 92px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 14px;
  padding: 12px 14px;
  background: linear-gradient(180deg, #ffffff, #fbfaff);
  color: #211b38;
  outline: none;
  resize: vertical;
  font-size: 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;

  &:focus {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 4px rgba(83, 59, 143, 0.1);
  }
`;

const BotonPrimario = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 999px;
  padding: 0 16px;
  background: var(--colorMorado);
  color: var(--colorBlanco);
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.12s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
    transform: none;
  }
`;

const BotonSecundario = styled(BotonPrimario)`
  background: white;
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
`;

const BotonTexto = styled.button`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--colorMorado);
  font-weight: 900;
  cursor: pointer;
`;

const BotonFull = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

const Mensaje = styled.div`
  grid-column: 1 / -1;
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ $tipo }) => ($tipo === "error" ? "rgba(219, 43, 57, 0.12)" : "rgba(0, 108, 103, 0.12)")};
  color: ${({ $tipo }) => ($tipo === "error" ? "#8f1822" : "#00524e")};
  font-size: 13px;
  font-weight: 800;
`;

const GridMetricas = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const CardMetrica = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  color: #211b38;
  box-shadow: 0 5px 16px rgba(83, 59, 143, 0.05);

  svg {
    color: var(--colorMorado);
  }
`;

const MetricaValor = styled.div`
  font-size: 26px;
  font-weight: 950;
  line-height: 1;
  color: var(--colorMorado);
`;

const MetricaLabel = styled.div`
  font-size: 12px;
  color: rgba(33, 27, 56, 0.64);
  font-weight: 800;
`;

const TablaWrap = styled.div`
  overflow-x: auto;
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
  color: #211b38;

  th,
  td {
    padding: 12px 10px;
    border-bottom: 1px solid rgba(83, 59, 143, 0.12);
    text-align: left;
    vertical-align: top;
  }

  th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(83, 59, 143, 0.74);
    background: rgba(83, 59, 143, 0.035);
  }

  td {
    font-size: 13px;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${({ $estado }) => {
        if ($estado === "alerta") return "rgba(219, 43, 57, 0.12)";
        if ($estado === "ok") return "rgba(83, 59, 143, 0.1)";
        if ($estado === "parcial") return "rgba(204, 164, 59, 0.18)";
        return "rgba(33, 27, 56, 0.07)";
    }};
  color: ${({ $estado }) => {
        if ($estado === "alerta") return "#8f1822";
        if ($estado === "ok") return "var(--colorMorado)";
        if ($estado === "parcial") return "#72560d";
        return "rgba(33, 27, 56, 0.72)";
    }};
  font-size: 11px;
  font-weight: 900;
`;

const ProductoNombre = styled.div`
  font-weight: 950;
  font-size: 15px;
`;

const ProductoMeta = styled.div`
  font-size: 12px;
  color: rgba(33, 27, 56, 0.62);
  margin-top: 3px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 210px;
  padding: 26px;
  text-align: center;
  color: rgba(33, 27, 56, 0.56);

  svg {
    font-size: 42px;
    color: rgba(83, 59, 143, 0.48);
  }
`;

const AccionesInline = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(7, 7, 7, 0.48);
  backdrop-filter: blur(6px);
`;

const ModalCard = styled.div`
  width: min(860px, 96vw);
  max-height: 88dvh;
  overflow: auto;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 26px;
  background: #ffffff;
  box-shadow: 0 30px 90px rgba(33, 27, 56, 0.28);
`;

const ModalHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.12);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalDescripcion = styled.p`
  margin: 4px 0 0;
  color: rgba(33, 27, 56, 0.62);
  font-size: 13px;
  font-weight: 700;
`;

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

const fechaLabel = (fecha) => {
    if (!fecha) return "Sin movimientos";
    const date = fecha.toDate?.() || new Date(fecha);
    return Number.isNaN(date.getTime()) ? "Sin movimientos" : date.toLocaleDateString("es-MX");
};

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
    const { usuario, setDespensaUsuario, actualizarInventarioDespensa } = useAppStore();
    const [inventario, setInventario] = useState(null);
    const [productos, setProductos] = useState([]);
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

    const cargarDatos = useCallback(async (forzarFirebase = false) => {
        if (!usuario?.uid) return;
        const dataCache = useAppStore.getState().despensaPorUsuario[usuario.uid];
        if (dataCache && !forzarFirebase) {
            setInventario(dataCache.inventario);
            setProductos(dataCache.productos || []);
            setCargando(false);
            return;
        }

        setCargando(true);
        const data = await obtenerDespensa(usuario.uid);
        setInventario(data.inventario);
        setProductos(data.productos);
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

    const resumenes = useMemo(() => {
        const lista = Object.values(inventario?.productos || {});
        return lista
            .filter((producto) => {
                const textoExtendido = `${producto.nombre} ${producto.categoria} ${producto.grupo || ""} ${producto.marca} ${producto.codigoBarras || ""}`.toLowerCase();
                return textoExtendido.includes(busqueda.toLowerCase());
            })
            .sort((a, b) => Number(b.faltante) - Number(a.faltante) || a.nombre.localeCompare(b.nombre));
    }, [inventario, busqueda]);

    const gruposProductos = useMemo(
        () => [...new Set(productos.map((producto) => producto.grupo).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [productos]
    );

    const productoMovimiento = useMemo(
        () => productos.find((producto) => producto.id === movimientoForm.productoId),
        [productos, movimientoForm.productoId]
    );
    const presentacionesMovimiento = obtenerPresentaciones(productoMovimiento);

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
            await crearProductoDespensa(usuario.uid, productoForm);
            setProductoForm(productoInicial);
            await cargarDatos(true);
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
            await agregarPresentacionDespensa(usuario.uid, presentacionForm.productoId, presentacionForm);
            setPresentacionForm((prev) => ({ ...presentacionInicial, productoId: prev.productoId }));
            await cargarDatos(true);
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
            const result = await actualizarProductoDespensa(usuario.uid, edicionProducto.id, edicionProducto);
            setInventario(result.inventario);
            actualizarInventarioDespensa(usuario.uid, result.inventario);
            await cargarDatos(true);
            setModalActivo(null);
            mostrarMensaje("ok", "Producto actualizado. Los costos FIFO existentes no se recalcularon.");
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
            const result = await actualizarPresentacionDespensa(
                usuario.uid,
                edicionPresentacion.productoId,
                edicionPresentacion.presentacionId,
                edicionPresentacion
            );
            setInventario(result.inventario);
            actualizarInventarioDespensa(usuario.uid, result.inventario);
            await cargarDatos(true);
            setModalActivo(null);
            mostrarMensaje("ok", "Presentación actualizada. El precio recomendado queda separado del costo FIFO histórico.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo actualizar la presentación.");
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
            const result = await registrarTicketDespensa(usuario.uid, { ...compraForm, items: itemsValidos });
            setInventario(result.inventario);
            actualizarInventarioDespensa(usuario.uid, result.inventario);
            await cargarDatos(true);
            setCompraForm(compraInicial);
            setCompraItems([compraItemInicial]);
            setModalActivo(null);
            mostrarMensaje("ok", "Compra registrada y stock actualizado.");
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
            const result = await registrarMovimientoDespensa(usuario.uid, movimientoForm);
            setInventario(result.inventario);
            actualizarInventarioDespensa(usuario.uid, result.inventario);
            setMovimientoForm((prev) => ({ ...movimientoInicial, productoId: prev.productoId, presentacionId: prev.presentacionId }));
            setModalActivo(null);
            mostrarMensaje("ok", "Movimiento registrado.");
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", error.message || "No se pudo registrar el movimiento.");
        } finally {
            setGuardando(false);
        }
    };

    const handleNecesario = async (productoId, necesario) => {
        try {
            const actualizado = await marcarNecesarioDespensa(usuario.uid, productoId, necesario);
            if (actualizado) {
                setInventario(actualizado);
                actualizarInventarioDespensa(usuario.uid, actualizado);
            }
        } catch (error) {
            console.error(error);
            mostrarMensaje("error", "No se pudo actualizar el faltante manual.");
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
            <Hero>
                <HeroTexto>
                    <HeroEyebrow><FaWarehouse /> Despensa multiusuario</HeroEyebrow>
                    <H2 size="32px" sizeSmall="24px" color="var(--colorMorado)">Control doméstico sin perder historial</H2>
                    <TxtGenerico color="rgba(33, 27, 56, 0.72)" weight="600" line="1.5">
                        Productos, presentaciones, compras, consumo, faltantes y valuación se guardan en un mundo independiente de tus cuentas y movimientos financieros.
                    </TxtGenerico>
                </HeroTexto>
                <HeroStats>
                    <MiniStat>
                        <StatNumero>{formatoMoneda(inventario?.valorTotalInventario)}</StatNumero>
                        <StatLabel>Valor actual estimado</StatLabel>
                    </MiniStat>
                    <MiniStat>
                        <StatNumero>{inventario?.totalProductos || 0}</StatNumero>
                        <StatLabel>Productos activos</StatLabel>
                    </MiniStat>
                    <MiniStat>
                        <StatNumero>{faltantes.length}</StatNumero>
                        <StatLabel>Faltantes o mínimos</StatLabel>
                    </MiniStat>
                    <MiniStat>
                        <StatNumero>{formatoMoneda(inventario?.gastoMesActual)}</StatNumero>
                        <StatLabel>Gasto del mes</StatLabel>
                    </MiniStat>
                </HeroStats>
            </Hero>

            <BarraAcciones>
                <BotonPrimario type="button" onClick={() => setModalActivo("compra")}><FaShoppingCart /> Registrar compra</BotonPrimario>
                <BotonSecundario type="button" onClick={() => setModalActivo("producto")}><FaBarcode /> Alta por código</BotonSecundario>
                <BotonSecundario type="button" onClick={() => setModalActivo("producto")}><FaPlus /> Nuevo producto</BotonSecundario>
                <BotonSecundario type="button" onClick={() => setModalActivo("presentacion")}><FaBox /> Nueva presentación</BotonSecundario>
                <BotonSecundario type="button" onClick={() => setModalActivo("movimiento")}><FaArrowDown /> Consumo/Ajuste</BotonSecundario>
            </BarraAcciones>

            <Tabs>
                <TabButton $activo={tab === "dashboard"} onClick={() => setTab("dashboard")}><FaChartLine /> Inventario</TabButton>
                <TabButton $activo={tab === "productos"} onClick={() => setTab("productos")}><FaBox /> Productos</TabButton>
                <TabButton $activo={tab === "compras"} onClick={() => setTab("compras")}><FaShoppingCart /> Compra/Ticket</TabButton>
                <TabButton $activo={tab === "movimientos"} onClick={() => setTab("movimientos")}><FaEdit /> Consumo/Ajuste</TabButton>
            </Tabs>

            {mensaje && <Mensaje $tipo={mensaje.tipo}>{mensaje.texto}</Mensaje>}
            <datalist id="grupos-despensa">
                {gruposProductos.map((grupo) => <option key={grupo} value={grupo} />)}
            </datalist>

            {tab === "dashboard" && (
                <>
                    <GridMetricas>
                        <CardMetrica>
                            <FaMoneyBillWave />
                            <MetricaValor>{formatoMoneda(inventario?.valorTotalInventario)}</MetricaValor>
                            <MetricaLabel>Valuación global por lotes FIFO</MetricaLabel>
                        </CardMetrica>
                        <CardMetrica>
                            <FaExclamationTriangle />
                            <MetricaValor>{faltantes.length}</MetricaValor>
                            <MetricaLabel>Productos faltantes o bajo mínimo</MetricaLabel>
                        </CardMetrica>
                        <CardMetrica>
                            <FaTag />
                            <MetricaValor>{inventario?.productosSinPrecio || 0}</MetricaValor>
                            <MetricaLabel>Productos con valuación parcial o sin precio</MetricaLabel>
                        </CardMetrica>
                        <CardMetrica>
                            <FaList />
                            <MetricaValor>{inventario?.productosSinStockInicial || 0}</MetricaValor>
                            <MetricaLabel>Pendientes de stock inicial</MetricaLabel>
                        </CardMetrica>
                    </GridMetricas>

                    <Panel>
                        <PanelHeader>
                            <TituloConIcono>
                                <FaWarehouse />
                                <H2 size="20px" color="var(--colorMorado)">Inventario resumido</H2>
                            </TituloConIcono>
                            <InputBase value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar producto, grupo, marca, categoría o código" />
                        </PanelHeader>
                        {resumenes.length === 0 ? (
                            <EmptyState>
                                <FaBox />
                                <strong>Aún no hay productos en despensa</strong>
                                <span>Empieza creando un producto con su presentación inicial.</span>
                            </EmptyState>
                        ) : (
                            <TablaWrap>
                                <Tabla>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Stock</th>
                                            <th>Valor</th>
                                            <th>Estado</th>
                                            <th>Último movimiento</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resumenes.map((producto) => {
                                            const valuacion = estadoValuacion(producto.valuacionEstado);
                                            return (
                                                <tr key={producto.productoId}>
                                                    <td>
                                                        <strong>{producto.nombre}</strong>
                                                        <ProductoMeta>{producto.grupo ? `${producto.grupo} · ` : ""}{producto.categoria}{producto.marca ? ` · ${producto.marca}` : ""}</ProductoMeta>
                                                    </td>
                                                    <td>{producto.resumenStock}</td>
                                                    <td>{formatoMoneda(producto.valorInventarioActual)}</td>
                                                    <td>
                                                        <AccionesInline>
                                                            <Badge $estado={producto.faltante ? "alerta" : "ok"}>
                                                                {producto.faltante ? <FaBell /> : <FaCheckCircle />}
                                                                {producto.faltante ? "Faltante" : "OK"}
                                                            </Badge>
                                                            <Badge $estado={valuacion.tipo}>{valuacion.texto}</Badge>
                                                        </AccionesInline>
                                                    </td>
                                                    <td>{fechaLabel(producto.ultimaFechaMovimiento)}</td>
                                                    <td>
                                                        <BotonSecundario type="button" onClick={() => handleNecesario(producto.productoId, !producto.necesario)}>
                                                            {producto.necesario ? "Quitar marca" : "Marcar necesario"}
                                                        </BotonSecundario>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Tabla>
                            </TablaWrap>
                        )}
                    </Panel>
                </>
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
                                        <th>Valor FIFO</th>
                                        <th>Estado</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resumenes.map((producto) => {
                                        const valuacion = estadoValuacion(producto.valuacionEstado);
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

                </Layout>
            )}

            {tab === "compras" && (
                <Layout>
                    <PanelCompleto>
                        <PanelHeader>
                            <TituloConIcono>
                                <FaShoppingCart />
                                <H2 size="20px" color="var(--colorMorado)">Compras y tickets</H2>
                            </TituloConIcono>
                            <BotonPrimario type="button" onClick={() => setModalActivo("compra")}><FaArrowUp /> Capturar ticket</BotonPrimario>
                        </PanelHeader>
                        <TablaWrap>
                            <Tabla>
                                <thead>
                                    <tr>
                                        <th>Campo</th>
                                        <th>Estado actual</th>
                                        <th>Uso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td><strong>Renglones</strong></td><td>{compraItems.length}</td><td>Productos y presentaciones del ticket.</td></tr>
                                    <tr><td><strong>Subtotal capturado</strong></td><td>{formatoMoneda(subtotalCompra)}</td><td>Suma de precios por renglón.</td></tr>
                                    <tr><td><strong>Total ticket</strong></td><td>{formatoMoneda(compraForm.totalTicket)}</td><td>Se compara contra el subtotal para detectar diferencia.</td></tr>
                                    <tr><td><strong>Valuación</strong></td><td>FIFO</td><td>Cada renglón crea un lote independiente.</td></tr>
                                </tbody>
                            </Tabla>
                        </TablaWrap>
                    </PanelCompleto>
                </Layout>
            )}

            {tab === "movimientos" && (
                <Layout>
                    <Panel $accent>
                        <PanelHeader>
                            <TituloConIcono>
                                <FaEdit />
                                <H2 size="20px" color="var(--colorMorado)">Consumo y ajustes</H2>
                            </TituloConIcono>
                        </PanelHeader>
                        <TxtGenerico color="rgba(33, 27, 56, 0.68)" weight="700" line="1.5">
                            Descuenta consumo con FIFO o corrige inventario con ajustes positivos y negativos sin tocar historial previo.
                        </TxtGenerico>
                        <BotonFull style={{ marginTop: "14px" }}>
                            <BotonPrimario type="button" onClick={() => setModalActivo("movimiento")}><FaArrowDown /> Registrar movimiento</BotonPrimario>
                        </BotonFull>
                    </Panel>

                    <Panel>
                        <PanelHeader>
                            <TituloConIcono>
                                <FaBell />
                                <H2 size="20px" color="var(--colorMorado)">Faltantes</H2>
                            </TituloConIcono>
                        </PanelHeader>
                        {faltantes.length === 0 ? (
                            <EmptyState><FaCheckCircle /><strong>No hay faltantes</strong><span>Tu despensa está por encima de los mínimos configurados.</span></EmptyState>
                        ) : (
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
                        )}
                    </Panel>
                </Layout>
            )}

            {modalActivo === "producto" && (
                <ModalOverlay onClick={() => setModalActivo(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <div>
                                <H2 size="22px" color="var(--colorMorado)">Nuevo producto</H2>
                                <ModalDescripcion>Escanea un código para prellenar datos o crea el producto manualmente con su grupo y primera presentación.</ModalDescripcion>
                            </div>
                            <BotonTexto type="button" onClick={() => setModalActivo(null)}><FaTimes /> Cerrar</BotonTexto>
                        </ModalHeader>
                        <ModalBody>
                            <FormGrid onSubmit={handleCrearProducto}>
                                <CampoCompleto>Código de barras
                                    <AccionesInline>
                                        <InputBase style={{ flex: "1 1 220px" }} inputMode="numeric" value={productoForm.codigoBarras} onChange={(event) => handleProductoChange("codigoBarras", normalizarCodigoBarras(event.target.value))} placeholder="Escanea o pega el código" />
                                        <BotonSecundario type="button" disabled={consultandoCodigo} onClick={handleBuscarCodigoProducto}><FaBarcode /> {consultandoCodigo ? "Buscando..." : "Buscar datos"}</BotonSecundario>
                                    </AccionesInline>
                                </CampoCompleto>
                                <CampoCompleto>Nombre<InputBase value={productoForm.nombre} onChange={(event) => handleProductoChange("nombre", event.target.value)} placeholder="Arroz, leche, atún" /></CampoCompleto>
                                <Campo>Categoría<SelectBase value={productoForm.categoria} onChange={(event) => handleProductoChange("categoria", event.target.value)}>{CATEGORIAS_DESPENSA.map((item) => <option key={item} value={item}>{item}</option>)}</SelectBase></Campo>
                                <Campo>Grupo<InputBase list="grupos-despensa" value={productoForm.grupo} onChange={(event) => handleProductoChange("grupo", event.target.value)} placeholder="Atún, frijoles, cereal" /></Campo>
                                <Campo>Marca opcional<InputBase value={productoForm.marca} onChange={(event) => handleProductoChange("marca", event.target.value)} placeholder="Marca" /></Campo>
                                <Campo>Unidad base<SelectBase value={productoForm.unidadBase} onChange={(event) => handleProductoChange("unidadBase", event.target.value)}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Stock mínimo<InputBase type="number" min="0" step="0.01" value={productoForm.stockMinimo} onChange={(event) => handleProductoChange("stockMinimo", event.target.value)} placeholder="Ej. 2" /></Campo>
                                <Campo>Medible<SelectBase value={productoForm.medible} onChange={(event) => handleProductoChange("medible", event.target.value)}><option value="true">Sí</option><option value="false">No</option></SelectBase></Campo>
                                <Campo>Unidades permitidas<InputBase value={productoForm.unidadesPermitidas} onChange={(event) => handleProductoChange("unidadesPermitidas", event.target.value)} placeholder="kg,g,paq" /></Campo>
                                <CampoCompleto>Presentación inicial<InputBase value={productoForm.presentacionNombre} onChange={(event) => handleProductoChange("presentacionNombre", event.target.value)} placeholder="Bolsa 900 g, botella 1 L" /></CampoCompleto>
                                <Campo>Cantidad<InputBase type="number" min="0" step="0.01" value={productoForm.presentacionCantidad} onChange={(event) => handleProductoChange("presentacionCantidad", event.target.value)} /></Campo>
                                <Campo>Unidad<SelectBase value={productoForm.presentacionUnidad} onChange={(event) => handleProductoChange("presentacionUnidad", event.target.value)}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Equivalencia base<InputBase type="number" min="0" step="0.0001" value={productoForm.equivalenciaBase} onChange={(event) => handleProductoChange("equivalenciaBase", event.target.value)} placeholder="Opcional" /></Campo>
                                <Campo>Precio aproximado<InputBase type="number" min="0" step="0.01" value={productoForm.precioAproximado} onChange={(event) => handleProductoChange("precioAproximado", event.target.value)} /></Campo>
                                <Campo>Buen precio<InputBase type="number" min="0" step="0.01" value={productoForm.buenPrecio} onChange={(event) => handleProductoChange("buenPrecio", event.target.value)} /></Campo>
                                <Campo>Nota interna<InputBase value={productoForm.codigoNota} onChange={(event) => handleProductoChange("codigoNota", event.target.value)} /></Campo>
                                <BotonFull><BotonPrimario disabled={guardando} type="submit"><FaPlus /> Crear producto</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalOverlay>
            )}

            {modalActivo === "presentacion" && (
                <ModalOverlay onClick={() => setModalActivo(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <div>
                                <H2 size="22px" color="var(--colorMorado)">Nueva presentación</H2>
                                <ModalDescripcion>Agrega otra forma de comprar o almacenar un producto existente.</ModalDescripcion>
                            </div>
                            <BotonTexto type="button" onClick={() => setModalActivo(null)}><FaTimes /> Cerrar</BotonTexto>
                        </ModalHeader>
                        <ModalBody>
                            <FormGrid onSubmit={handleAgregarPresentacion}>
                                <CampoCompleto>Producto<ProductoBuscadorSelect productos={productos} value={presentacionForm.productoId} onChange={(productoId) => setPresentacionForm((prev) => ({ ...prev, productoId }))} placeholder="Buscar por nombre, marca o categoría" /></CampoCompleto>
                                <CampoCompleto>Código de barras<InputBase inputMode="numeric" value={presentacionForm.codigoBarras} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, codigoBarras: normalizarCodigoBarras(event.target.value) }))} placeholder="Escanea o pega el código de esta presentación" /></CampoCompleto>
                                <CampoCompleto>Descripción<InputBase value={presentacionForm.presentacionNombre} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, presentacionNombre: event.target.value }))} placeholder="Caja 12 piezas, lata 140 g" /></CampoCompleto>
                                <Campo>Cantidad<InputBase type="number" min="0" step="0.01" value={presentacionForm.presentacionCantidad} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, presentacionCantidad: event.target.value }))} /></Campo>
                                <Campo>Unidad<SelectBase value={presentacionForm.presentacionUnidad} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, presentacionUnidad: event.target.value }))}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Equivalencia base<InputBase type="number" min="0" step="0.0001" value={presentacionForm.equivalenciaBase} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, equivalenciaBase: event.target.value }))} /></Campo>
                                <Campo>Precio aproximado<InputBase type="number" min="0" step="0.01" value={presentacionForm.precioAproximado} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, precioAproximado: event.target.value }))} /></Campo>
                                <Campo>Buen precio<InputBase type="number" min="0" step="0.01" value={presentacionForm.buenPrecio} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, buenPrecio: event.target.value }))} /></Campo>
                                <Campo>Nota interna<InputBase value={presentacionForm.codigoNota} onChange={(event) => setPresentacionForm((prev) => ({ ...prev, codigoNota: event.target.value }))} /></Campo>
                                <BotonFull><BotonPrimario disabled={guardando || productos.length === 0} type="submit"><FaPlus /> Agregar presentación</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalOverlay>
            )}

            {modalActivo === "editar" && (
                <ModalOverlay onClick={() => setModalActivo(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <div>
                                <H2 size="22px" color="var(--colorMorado)">Editar producto</H2>
                                <ModalDescripcion>Actualiza catálogo y referencias sin recalcular lotes FIFO ya comprados.</ModalDescripcion>
                            </div>
                            <BotonTexto type="button" onClick={() => setModalActivo(null)}><FaTimes /> Cerrar</BotonTexto>
                        </ModalHeader>
                        <ModalBody>
                            <FormGrid onSubmit={handleActualizarProducto}>
                                <CampoCompleto>Producto<ProductoBuscadorSelect productos={productos} value={edicionProducto.id} onChange={handleSeleccionProductoEditar} placeholder="Buscar producto para editar" /></CampoCompleto>
                                <CampoCompleto>Código de barras<InputBase inputMode="numeric" value={edicionProducto.codigoBarras} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, codigoBarras: normalizarCodigoBarras(event.target.value) }))} /></CampoCompleto>
                                <CampoCompleto>Nombre<InputBase value={edicionProducto.nombre} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, nombre: event.target.value }))} /></CampoCompleto>
                                <Campo>Categoría<SelectBase value={edicionProducto.categoria} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, categoria: event.target.value }))}>{CATEGORIAS_DESPENSA.map((item) => <option key={item} value={item}>{item}</option>)}</SelectBase></Campo>
                                <Campo>Grupo<InputBase list="grupos-despensa" value={edicionProducto.grupo} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, grupo: event.target.value }))} placeholder="Atún, frijoles, cereal" /></Campo>
                                <Campo>Marca<InputBase value={edicionProducto.marca} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, marca: event.target.value }))} /></Campo>
                                <Campo>Unidad base<SelectBase value={edicionProducto.unidadBase} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, unidadBase: event.target.value }))}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Stock mínimo<InputBase type="number" min="0" step="0.01" value={edicionProducto.stockMinimo} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, stockMinimo: event.target.value }))} /></Campo>
                                <CampoCompleto>Unidades permitidas<InputBase value={edicionProducto.unidadesPermitidas} onChange={(event) => setEdicionProducto((prev) => ({ ...prev, unidadesPermitidas: event.target.value }))} /></CampoCompleto>
                                <BotonFull><BotonPrimario disabled={guardando || !edicionProducto.id} type="submit"><FaEdit /> Actualizar producto</BotonPrimario></BotonFull>
                            </FormGrid>
                            <FormGrid onSubmit={handleActualizarPresentacion} style={{ marginTop: "18px" }}>
                                <CampoCompleto>Presentación<SelectBase value={edicionPresentacion.presentacionId} onChange={(event) => {
                                    const producto = productos.find((item) => item.id === edicionProducto.id);
                                    const presentacion = obtenerPresentaciones(producto).find((item) => item.id === event.target.value);
                                    if (!presentacion) return;
                                    setEdicionPresentacion({ productoId: producto.id, presentacionId: presentacion.id, codigoBarras: presentacion.codigoBarras || producto.codigoBarras || "", presentacionNombre: presentacion.nombre || "", presentacionCantidad: presentacion.cantidad || "", presentacionUnidad: presentacion.unidad || producto.unidadBase || "pz", equivalenciaBase: presentacion.equivaleAUnidadBase ?? "", precioAproximado: presentacion.precioAproximado ?? "", buenPrecio: presentacion.buenPrecio ?? "", codigoNota: presentacion.codigoNota || "" });
                                }}><option value="">Selecciona presentación</option>{obtenerPresentaciones(productos.find((item) => item.id === edicionProducto.id)).map((presentacion) => <option key={presentacion.id} value={presentacion.id}>{presentacion.nombre}</option>)}</SelectBase></CampoCompleto>
                                <CampoCompleto>Código de barras<InputBase inputMode="numeric" value={edicionPresentacion.codigoBarras} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, codigoBarras: normalizarCodigoBarras(event.target.value) }))} /></CampoCompleto>
                                <CampoCompleto>Nombre presentación<InputBase value={edicionPresentacion.presentacionNombre} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, presentacionNombre: event.target.value }))} /></CampoCompleto>
                                <Campo>Cantidad<InputBase type="number" min="0" step="0.01" value={edicionPresentacion.presentacionCantidad} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, presentacionCantidad: event.target.value }))} /></Campo>
                                <Campo>Unidad<SelectBase value={edicionPresentacion.presentacionUnidad} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, presentacionUnidad: event.target.value }))}>{UNIDADES_DESPENSA.map((unidad) => <option key={unidad} value={unidad}>{unidad}</option>)}</SelectBase></Campo>
                                <Campo>Equivalencia base<InputBase type="number" min="0" step="0.0001" value={edicionPresentacion.equivalenciaBase} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, equivalenciaBase: event.target.value }))} /></Campo>
                                <Campo>Precio aproximado<InputBase type="number" min="0" step="0.01" value={edicionPresentacion.precioAproximado} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, precioAproximado: event.target.value }))} /></Campo>
                                <Campo>Buen precio<InputBase type="number" min="0" step="0.01" value={edicionPresentacion.buenPrecio} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, buenPrecio: event.target.value }))} /></Campo>
                                <Campo>Nota interna<InputBase value={edicionPresentacion.codigoNota} onChange={(event) => setEdicionPresentacion((prev) => ({ ...prev, codigoNota: event.target.value }))} /></Campo>
                                <BotonFull><BotonPrimario disabled={guardando || !edicionPresentacion.presentacionId} type="submit"><FaTag /> Actualizar presentación</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalOverlay>
            )}

            {modalActivo === "compra" && (
                <ModalOverlay onClick={() => setModalActivo(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <div>
                                <H2 size="22px" color="var(--colorMorado)">Capturar ticket</H2>
                                <ModalDescripcion>Escanea códigos o agrega productos manualmente. Cada renglón crea su propio lote FIFO.</ModalDescripcion>
                            </div>
                            <BotonTexto type="button" onClick={() => setModalActivo(null)}><FaTimes /> Cerrar</BotonTexto>
                        </ModalHeader>
                        <ModalBody>
                            <FormGrid onSubmit={handleRegistrarCompra}>
                                <Campo>Total ticket<InputBase type="number" min="0" step="0.01" value={compraForm.totalTicket} onChange={(event) => setCompraForm((prev) => ({ ...prev, totalTicket: event.target.value }))} placeholder="Opcional" /></Campo>
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
                                                            <td><InputBase type="number" min="0" step="0.01" value={item.cantidadComprada} onChange={(event) => handleCompraItemChange(index, "cantidadComprada", event.target.value)} /></td>
                                                            <td><InputBase type="number" min="0" step="0.01" value={item.precioTotalItem} onChange={(event) => handleCompraItemChange(index, "precioTotalItem", event.target.value)} placeholder="Opcional" /></td>
                                                            <td><InputBase value={item.nota} onChange={(event) => handleCompraItemChange(index, "nota", event.target.value)} placeholder="Opcional" /></td>
                                                            <td><BotonTexto type="button" onClick={() => handleEliminarRenglonCompra(index)}>Quitar</BotonTexto></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Tabla>
                                    </TablaWrap>
                                </CampoCompleto>
                                <BotonFull><BotonPrimario disabled={guardando || productos.length === 0} type="submit"><FaArrowUp /> Confirmar ticket FIFO</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalOverlay>
            )}

            {modalActivo === "movimiento" && (
                <ModalOverlay onClick={() => setModalActivo(null)}>
                    <ModalCard onClick={(event) => event.stopPropagation()}>
                        <ModalHeader>
                            <div>
                                <H2 size="22px" color="var(--colorMorado)">Consumo o ajuste</H2>
                                <ModalDescripcion>Registra salidas FIFO o corrige diferencias de inventario.</ModalDescripcion>
                            </div>
                            <BotonTexto type="button" onClick={() => setModalActivo(null)}><FaTimes /> Cerrar</BotonTexto>
                        </ModalHeader>
                        <ModalBody>
                            <FormGrid onSubmit={handleRegistrarMovimiento}>
                                <CampoCompleto>Producto<SelectBase value={movimientoForm.productoId} onChange={(event) => handleProductoMovimiento(event.target.value)}><option value="">Selecciona producto</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</SelectBase></CampoCompleto>
                                <CampoCompleto>Presentación<SelectBase value={movimientoForm.presentacionId} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, presentacionId: event.target.value }))}><option value="">Selecciona presentación</option>{presentacionesMovimiento.map((presentacion) => <option key={presentacion.id} value={presentacion.id}>{presentacion.nombre}</option>)}</SelectBase></CampoCompleto>
                                <Campo>Tipo<SelectBase value={movimientoForm.tipo} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, tipo: event.target.value }))}><option value="salida">Consumo / salida</option><option value="ajuste_positivo">Ajuste positivo</option><option value="ajuste_negativo">Ajuste negativo</option></SelectBase></Campo>
                                <Campo>Cantidad<InputBase type="number" min="0" step="0.01" value={movimientoForm.cantidad} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, cantidad: event.target.value }))} /></Campo>
                                <Campo>Fecha<InputBase type="date" value={movimientoForm.fecha} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, fecha: event.target.value }))} /></Campo>
                                <CampoCompleto>Motivo<TextArea value={movimientoForm.motivo} onChange={(event) => setMovimientoForm((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Consumido, merma, corrección de conteo" /></CampoCompleto>
                                <BotonFull><BotonPrimario disabled={guardando || productos.length === 0} type="submit"><FaArrowDown /> Registrar movimiento</BotonPrimario></BotonFull>
                            </FormGrid>
                        </ModalBody>
                    </ModalCard>
                </ModalOverlay>
            )}
        </Pagina>
    );
};
