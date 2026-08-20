import styled from "styled-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChartLine,
  FaEdit,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTag,
  FaUser,
  FaUsers,
  FaWallet,
} from "react-icons/fa";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from "recharts";
import Swal from "sweetalert2";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import {
  obtenerMovimientosPorAnio,
  obtenerMovimientosPorAnioMes,
  actualizarEsPersonalMovimiento,
} from "../../funciones/firebase/movimientos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { ModalGenerico } from "../../componentes/modales/modalGenerico";
import { ModalEditarMovimiento } from "../../componentes/modales/modalEditarMovimientos";
import { ComprasPlaneadas } from "./comprasPlaneadas";

const fechaDeMovimiento = (valor) => {
  if (!valor) return null;
  if (typeof valor.toDate === "function") return valor.toDate();
  if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const movimientoEsGasto = (movimiento) => Number(movimiento.monto || 0) < 0;
const movimientoEsPersonal = (movimiento) => Boolean(
  movimiento.esPersonal || (movimiento.categoria === "personal" && movimientoEsGasto(movimiento))
);
const mismoMovimiento = (a, b) => {
  const fechaA = a?.fechaMovimiento;
  const fechaB = b?.fechaMovimiento;
  return Boolean(
    fechaA && fechaB
    && Number(fechaA.seconds) === Number(fechaB.seconds)
    && Number(fechaA.nanoseconds || 0) === Number(fechaB.nanoseconds || 0)
  );
};

const ordenarMovimientos = (movimientos = []) => [...movimientos].sort((a, b) => {
  const fechaA = fechaDeMovimiento(a.fechaMovimiento)?.getTime() || 0;
  const fechaB = fechaDeMovimiento(b.fechaMovimiento)?.getTime() || 0;
  return fechaB - fechaA;
});

const formatearFilas = (movimientos = []) => ordenarMovimientos(movimientos).map((movimiento, index) => ({
  id: `${fechaDeMovimiento(movimiento.fechaMovimiento)?.getTime() || "sin-fecha"}-${index}`,
  ...movimiento,
  fechaMovimientoFormateada: fechaDeMovimiento(movimiento.fechaMovimiento)?.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) || "Sin fecha",
  cuentaDescripcion: movimiento.cuentaDestinoNombre
    ? `${movimiento.nombreCuenta || "Sin cuenta"} → ${movimiento.cuentaDestinoNombre}`
    : movimiento.nombreCuenta || "Sin cuenta",
  categoriaNombre: nombreCategoria(movimiento.categoria),
  tipoMovimiento: Number(movimiento.monto || 0) >= 0 ? "Ingreso" : "Gasto",
  clasificacion: movimientoEsPersonal(movimiento) ? "Personal" : "Por terceros",
}));

const formatoMoneda = (valor) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(valor || 0));
const nombreCategoria = (categoria) => adaptadorTxtLabel(categoriasEsqueleto, categoria) || "Sin categoría";

const ContenedorPagina = styled.main`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 30px;
`;

const Encabezado = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Eyebrow = styled.span`
  display: block;
  margin-bottom: 4px;
  color: #8b8197;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
`;

const Titulo = styled.h1`
  margin: 0;
  color: #30244a;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(24px, 3vw, 31px);
  letter-spacing: -.04em;
  line-height: 1;
`;

const Subtitulo = styled.p`
  margin: 7px 0 0;
  color: #776f80;
  font-size: 12px;
`;

const BtnNuevo = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border: none;
  border-radius: 9px;
  background: var(--colorMorado);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:hover { background: #694da9; }
`;

const Navegacion = styled.nav`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px;
  border: 1px solid #e4deeb;
  border-radius: 10px;
  background: #faf8fc;
  overflow-x: auto;
`;

const Tab = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 11px;
  border: none;
  border-radius: 7px;
  background: ${({ $active }) => $active ? "#fff" : "transparent"};
  color: ${({ $active }) => $active ? "var(--colorMorado)" : "#81798b"};
  box-shadow: ${({ $active }) => $active ? "0 2px 8px rgba(67, 45, 104, .08)" : "none"};
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
`;

const BarraControles = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  flex-wrap: wrap;
`;

const Periodo = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: #777080;
  font-size: 11px;

  input {
    height: 34px;
    border: 1px solid #ddd6e6;
    border-radius: 8px;
    padding: 0 9px;
    background: #fff;
    color: #40374d;
    font: inherit;
  }
`;

const BtnBuscar = styled.button`
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid #ddd6e6;
  border-radius: 8px;
  background: #fff;
  color: #5b4b71;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:hover { border-color: var(--colorMorado); color: var(--colorMorado); }
`;

const Buscador = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 220px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #ddd6e6;
  border-radius: 8px;
  background: #fff;
  color: #94899e;

  input {
    width: 100%;
    border: none;
    outline: none;
    color: #40374d;
    font: inherit;
    font-size: 11px;
  }
`;

const Metricas = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;

  @media (max-width: 800px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr 1fr; }
`;

const Metrica = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 65px;
  padding: 10px 12px;
  border: 1px solid ${({ $tone }) => $tone === "green" ? "#d8eee4" : $tone === "orange" ? "#f1dfbd" : $tone === "blue" ? "#dceaf7" : "#e2d9f0"};
  border-radius: 11px;
  background: ${({ $tone }) => $tone === "green" ? "#f4fbf7" : $tone === "orange" ? "#fffaf2" : $tone === "blue" ? "#f4f9fe" : "#fbf9ff"};
`;

const MetricaIcono = styled.span`
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: ${({ $tone }) => $tone === "green" ? "#d9f2e4" : $tone === "orange" ? "#fcebc9" : $tone === "blue" ? "#dceefa" : "#e9dff7"};
  color: ${({ $tone }) => $tone === "green" ? "#27815d" : $tone === "orange" ? "#af6d1c" : $tone === "blue" ? "#3d7aa8" : "var(--colorMorado)"};
  font-size: 12px;
`;

const MetricaEtiqueta = styled.span`
  display: block;
  color: #81798b;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .05em;
  text-transform: uppercase;
`;

const MetricaValor = styled.strong`
  display: block;
  margin-top: 2px;
  color: #302a3b;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 15px;
`;

const Filtros = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
`;

const Filtro = styled.button`
  height: 30px;
  padding: 0 10px;
  border: 1px solid ${({ $active }) => $active ? "var(--colorMorado)" : "#e1dbe8"};
  border-radius: 7px;
  background: ${({ $active }) => $active ? "var(--colorMorado)" : "#fff"};
  color: ${({ $active }) => $active ? "#fff" : "#756b80"};
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
`;

const TablaShell = styled.div`
  overflow: hidden;
  border: 1px solid rgba(83, 59, 143, .14);
  border-radius: 12px;
  background: #fff;
`;

const Monto = styled.strong`
  color: ${({ $positive }) => $positive ? "#26835d" : "#bf5b2d"};
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
`;

const ChipPersonal = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  background: ${({ $personal }) => $personal ? "#f0eafb" : "#f1f1f4"};
  color: ${({ $personal }) => $personal ? "#684ba1" : "#77717e"};
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
`;

const BtnEditar = styled.button`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid #e2dbe9;
  border-radius: 7px;
  background: #fff;
  color: #776b86;
  cursor: pointer;

  &:hover { border-color: var(--colorMorado); color: var(--colorMorado); }
`;

const Acciones = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  width: 100%;
`;

const BtnPersonal = styled.button`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid ${({ $personal }) => $personal ? "#cdb8ed" : "#dcd8e4"};
  border-radius: 7px;
  background: ${({ $personal }) => $personal ? "#f0eafb" : "#fff"};
  color: ${({ $personal }) => $personal ? "#684ba1" : "#8b8493"};
  cursor: pointer;

  &:hover {
    border-color: var(--colorMorado);
    color: var(--colorMorado);
    background: #f6f1ff;
  }
`;

const EstadoVacio = styled.div`
  padding: 36px 18px;
  color: #877f90;
  text-align: center;
  font-size: 12px;
`;

const AnalisisLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(290px, .75fr);
  gap: 12px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Panel = styled.section`
  min-width: 0;
  padding: 15px;
  border: 1px solid rgba(83, 59, 143, .13);
  border-radius: 12px;
  background: #fff;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 13px;
`;

const PanelTitulo = styled.h2`
  margin: 0;
  color: #30244a;
  font-size: 14px;
  font-weight: 900;
`;

const PanelTexto = styled.p`
  margin: 3px 0 0;
  color: #8b8197;
  font-size: 10px;
`;

const Heatmap = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(20px, 1fr));
  gap: 5px;
`;

const DiaSemana = styled.span`
  color: #91889d;
  font-size: 9px;
  font-weight: 900;
  text-align: center;
`;

const CeldaDia = styled.div`
  min-height: 35px;
  padding: 4px;
  border-radius: 6px;
  background: ${({ $level, $empty }) => $empty ? "transparent" : `rgba(83, 59, 143, ${$level || .08})`};
  color: ${({ $level }) => $level > .35 ? "#fff" : "#564476"};
  font-size: 9px;
  font-weight: 800;
  text-align: right;
`;

const CategoriaLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CategoriaFila = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
`;

const CategoriaNombre = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: #4f4659;
  font-size: 11px;
`;

const BarraCategoria = styled.div`
  height: 5px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: #f0edf4;

  span {
    display: block;
    width: ${({ $width }) => `${$width}%`};
    height: 100%;
    border-radius: inherit;
    background: #8a69c3;
  }
`;

const NumeroCategoria = styled.strong`
  color: #30244a;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
`;

const TreemapShell = styled.div`
  width: 100%;
  height: 270px;
  margin-top: 4px;
`;

const TreemapVacio = styled.div`
  display: grid;
  min-height: 220px;
  place-items: center;
  padding: 20px;
  border-radius: 10px;
  background: #faf8fd;
  color: #877f90;
  font-size: 11px;
  text-align: center;
`;

const TreemapContenido = ({ x = 0, y = 0, width = 0, height = 0, name, value = 0, fill = "#8a69c3" }) => {
  if (width <= 0 || height <= 0) return null;
  const label = String(name || "Sin categoría");
  const labelCorto = label.length > 18 ? `${label.slice(0, 16)}…` : label;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill={fill} stroke="#fff" strokeWidth={3} />
      {width > 70 && height > 38 && (
        <>
          <text x={x + 10} y={y + 19} fill="#fff" fontSize="11" fontWeight="800">{labelCorto}</text>
          {height > 58 && <text x={x + 10} y={y + 37} fill="rgba(255,255,255,.82)" fontSize="10">{formatoMoneda(value)}</text>}
        </>
      )}
    </g>
  );
};

export const PaginaMovimientosUx = () => {
  const { usuario, movimientos, setMovimientos } = useAppStore();
  const { setIsOpenAgregarMovimiento } = useModalStore();
  const [vista, setVista] = useState("registro");
  const [loading, setLoading] = useState(false);
  const [filas, setFilas] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [movimientosAnio, setMovimientosAnio] = useState([]);
  const [anioCargado, setAnioCargado] = useState("");
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [movimientoEditar, setMovimientoEditar] = useState(null);
  const [movimientoClasificando, setMovimientoClasificando] = useState(null);

  const hoy = new Date();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`);
  const [anioAnalisis, setAnioAnalisis] = useState(String(hoy.getFullYear()));

  const claveMes = fechaSeleccionada.replace("-", "");

  const buscarMovimientos = useCallback(async () => {
    if (!usuario?.uid || !claveMes) return;
    setLoading(true);
    try {
      if (movimientos?.[claveMes]) {
        setFilas(formatearFilas(movimientos[claveMes]));
      } else {
        const resultado = await obtenerMovimientosPorAnioMes(usuario.uid, claveMes);
        const nuevos = resultado?.movimientos || [];
        setMovimientos((prev) => ({ ...prev, [claveMes]: nuevos }));
        setFilas(formatearFilas(nuevos));
      }
    } catch (error) {
      console.error("Error al cargar movimientos", error);
      setFilas([]);
    } finally {
      setLoading(false);
    }
  }, [claveMes, movimientos, setMovimientos, usuario?.uid]);

  useEffect(() => { buscarMovimientos(); }, [buscarMovimientos]);

  useEffect(() => {
    if (vista !== "analisis" || !usuario?.uid || anioCargado === anioAnalisis) return;
    let activo = true;
    setLoadingAnalisis(true);
    obtenerMovimientosPorAnio(usuario.uid, anioAnalisis)
      .then((resultado) => {
        if (!activo) return;
        setMovimientosAnio(formatearFilas(resultado));
        setAnioCargado(anioAnalisis);
      })
      .catch((error) => console.error("Error al cargar el análisis de movimientos", error))
      .finally(() => { if (activo) setLoadingAnalisis(false); });
    return () => { activo = false; };
  }, [anioAnalisis, anioCargado, usuario?.uid, vista]);

  const estadisticasMes = useMemo(() => filas.reduce((acc, movimiento) => {
    const monto = Math.abs(Number(movimiento.monto || 0));
    if (movimientoEsGasto(movimiento)) {
      acc.gastos += monto;
      if (movimientoEsPersonal(movimiento)) acc.personal += monto;
      else acc.terceros += monto;
    } else {
      acc.ingresos += monto;
    }
    return acc;
  }, { gastos: 0, personal: 0, terceros: 0, ingresos: 0 }), [filas]);

  const estadisticasAnio = useMemo(() => movimientosAnio.reduce((acc, movimiento) => {
    if (!movimientoEsGasto(movimiento)) return acc;
    const monto = Math.abs(Number(movimiento.monto || 0));
    acc.gastos += monto;
    if (movimientoEsPersonal(movimiento)) acc.personal += monto;
    else acc.terceros += monto;
    const categoria = nombreCategoria(movimiento.categoria);
    acc.categorias[categoria] = (acc.categorias[categoria] || 0) + monto * (movimientoEsPersonal(movimiento) ? 1 : 0);
    return acc;
  }, { gastos: 0, personal: 0, terceros: 0, categorias: {} }), [movimientosAnio]);

  const filasVisibles = useMemo(() => filas.filter((movimiento) => {
    if (filtro === "personal" && !movimientoEsPersonal(movimiento)) return false;
    if (filtro === "terceros" && movimientoEsPersonal(movimiento)) return false;
    if (!busqueda.trim()) return true;
    const termino = busqueda.toLowerCase();
    return [movimiento.nombreCuenta, movimiento.nota, nombreCategoria(movimiento.categoria)].some((valor) => String(valor || "").toLowerCase().includes(termino));
  }), [busqueda, filtro, filas]);

  const categorias = useMemo(() => Object.entries(estadisticasAnio.categorias).sort(([, a], [, b]) => b - a), [estadisticasAnio.categorias]);
  const maxCategoria = categorias[0]?.[1] || 1;
  const treemapData = useMemo(() => categorias.map(([name, size], index) => ({
    name,
    size,
    fill: ["#6948a7", "#8061bd", "#9476ca", "#a68bd5", "#b89de0", "#c9afe7", "#d9c3ef"][index % 7],
  })), [categorias]);

  const mapaDias = useMemo(() => {
    const [anio, mes] = fechaSeleccionada.split("-").map(Number);
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const primerDia = new Date(anio, mes - 1, 1).getDay();
    const gastos = {};
    filas.forEach((movimiento) => {
      if (!movimientoEsGasto(movimiento) || !movimientoEsPersonal(movimiento)) return;
      const fecha = fechaDeMovimiento(movimiento.fechaMovimiento);
      if (!fecha) return;
      const dia = fecha.getDate();
      gastos[dia] = (gastos[dia] || 0) + Math.abs(Number(movimiento.monto || 0));
    });
    const maximo = Math.max(...Object.values(gastos), 1);
    return { diasEnMes, primerDia, gastos, maximo };
  }, [fechaSeleccionada, filas]);

  const celdasHeatmap = useMemo(() => [
    ...Array.from({ length: mapaDias.primerDia }, () => null),
    ...Array.from({ length: mapaDias.diasEnMes }, (_, index) => index + 1),
  ], [mapaDias]);

  const cambiarFecha = (event) => {
    const valor = event.target.value;
    setFechaSeleccionada(valor);
    if (valor) setAnioAnalisis(valor.slice(0, 4));
  };

  const abrirEdicion = (movimiento) => setMovimientoEditar(movimiento);

  const actualizarMovimientoEnCache = useCallback((movimientoActualizado) => {
    setMovimientos((prev) => {
      const cache = Array.isArray(prev) ? {} : prev;
      const fecha = fechaDeMovimiento(movimientoActualizado?.fechaMovimiento);
      if (!fecha) return cache;
      const key = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      return {
        ...cache,
        [key]: (cache[key] || []).map((movimiento) => (
          mismoMovimiento(movimiento, movimientoActualizado) ? movimientoActualizado : movimiento
        )),
      };
    });
    setFilas((prev) => prev.map((fila) => (
      mismoMovimiento(fila, movimientoActualizado)
        ? { ...fila, ...movimientoActualizado, clasificacion: movimientoEsPersonal(movimientoActualizado) ? "Personal" : "Por terceros" }
        : fila
    )));
    setMovimientosAnio((prev) => prev.map((fila) => (
      mismoMovimiento(fila, movimientoActualizado)
        ? { ...fila, ...movimientoActualizado, clasificacion: movimientoEsPersonal(movimientoActualizado) ? "Personal" : "Por terceros" }
        : fila
    )));
  }, [setMovimientos, setMovimientosAnio]);

  const alternarPersonal = useCallback(async (movimiento) => {
    if (movimientoClasificando) return;
    const siguienteValor = !movimientoEsPersonal(movimiento);
    setMovimientoClasificando(movimiento.id);
    const actualizado = await actualizarEsPersonalMovimiento(movimiento, siguienteValor, usuario?.uid);
    if (actualizado) actualizarMovimientoEnCache(actualizado);
    else Swal.fire({ icon: "error", title: "No se guardó", text: "Intenta nuevamente." });
    setMovimientoClasificando(null);
  }, [actualizarMovimientoEnCache, movimientoClasificando, usuario?.uid]);

  const columnas = useMemo(() => [
    { field: "fechaMovimientoFormateada", headerName: "Fecha", minWidth: 105, flex: .7 },
    { field: "cuentaDescripcion", headerName: "Cuenta", minWidth: 190, flex: 1.25 },
    { field: "categoriaNombre", headerName: "Categoría", minWidth: 145, flex: .95 },
    { field: "tipoMovimiento", headerName: "Tipo", minWidth: 100, flex: .7 },
    {
      field: "monto",
      headerName: "Monto",
      minWidth: 125,
      flex: .85,
      type: "number",
      valueGetter: (_value, row) => Math.abs(Number(row.monto || 0)),
      renderCell: (params) => {
        const positivo = Number(params.row.monto || 0) >= 0;
        return <Monto $positive={positivo}>{positivo ? "+" : "−"}{formatoMoneda(Math.abs(Number(params.row.monto || 0)))}</Monto>;
      },
    },
    { field: "clasificacion", headerName: "Clasificación", minWidth: 135, flex: .95 },
    {
      field: "acciones",
      headerName: "Acciones",
      minWidth: 90,
      flex: .65,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const personal = movimientoEsPersonal(params.row);
        const guardando = movimientoClasificando === params.row.id;
        return (
          <Acciones>
            <BtnPersonal
              type="button"
              $personal={personal}
              disabled={guardando}
              onClick={(event) => { event.stopPropagation(); alternarPersonal(params.row); }}
              title={personal ? "Quitar marca personal" : "Marcar como personal"}
              aria-label={personal ? "Quitar marca personal" : "Marcar como personal"}
            >
              <FaUser />
            </BtnPersonal>
            <BtnEditar type="button" onClick={(event) => { event.stopPropagation(); abrirEdicion(params.row); }} title="Editar movimiento" aria-label="Editar movimiento"><FaEdit /></BtnEditar>
          </Acciones>
        );
      },
    },
  ], [alternarPersonal, movimientoClasificando]);

  return (
    <ContenedorPagina>
      <Encabezado>
        <div>
          <Eyebrow>Control de flujo personal</Eyebrow>
          <Titulo>Movimientos</Titulo>
          <Subtitulo>Separa lo que pagas por ti de lo que pasa por tus tarjetas.</Subtitulo>
        </div>
        <BtnNuevo onClick={() => setIsOpenAgregarMovimiento(true)}><FaPlus /> Nuevo movimiento</BtnNuevo>
      </Encabezado>

      <Navegacion aria-label="Secciones de movimientos">
        <Tab $active={vista === "registro"} onClick={() => setVista("registro")}><FaWallet /> Registro</Tab>
        <Tab $active={vista === "analisis"} onClick={() => setVista("analisis")}><FaChartLine /> Gasto personal</Tab>
        <Tab $active={vista === "compras"} onClick={() => setVista("compras")}><FaTag /> Compras próximas</Tab>
      </Navegacion>

      {vista === "compras" ? <ComprasPlaneadas /> : (
        <>
          <BarraControles>
            <Periodo><FaCalendarAlt /> Periodo <input type="month" value={fechaSeleccionada} onChange={cambiarFecha} /><BtnBuscar type="button" onClick={buscarMovimientos}><FaFilter /> Actualizar</BtnBuscar></Periodo>
            {vista === "registro" && <Buscador><FaSearch /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cuenta, nota o categoría" /></Buscador>}
            {vista === "analisis" && <Periodo>Año <input type="number" min="2020" max="2100" value={anioAnalisis} onChange={(event) => { setAnioAnalisis(event.target.value); setAnioCargado(""); }} /></Periodo>}
          </BarraControles>

          <Metricas>
            <Metrica><MetricaIcono><FaArrowDown /></MetricaIcono><div><MetricaEtiqueta>Gasto del mes</MetricaEtiqueta><MetricaValor>{formatoMoneda(estadisticasMes.gastos)}</MetricaValor></div></Metrica>
            <Metrica $tone="green"><MetricaIcono $tone="green"><FaUser /></MetricaIcono><div><MetricaEtiqueta>Personal · mes</MetricaEtiqueta><MetricaValor>{formatoMoneda(estadisticasMes.personal)}</MetricaValor></div></Metrica>
            <Metrica $tone="orange"><MetricaIcono $tone="orange"><FaUsers /></MetricaIcono><div><MetricaEtiqueta>Por terceros · mes</MetricaEtiqueta><MetricaValor>{formatoMoneda(estadisticasMes.terceros)}</MetricaValor></div></Metrica>
            <Metrica $tone="blue"><MetricaIcono $tone="blue"><FaArrowUp /></MetricaIcono><div><MetricaEtiqueta>Ingresos · mes</MetricaEtiqueta><MetricaValor>{formatoMoneda(estadisticasMes.ingresos)}</MetricaValor></div></Metrica>
          </Metricas>

          {vista === "registro" ? (
            <>
              <BarraControles>
                <Filtros><Filtro $active={filtro === "todos"} onClick={() => setFiltro("todos")}><FaFilter /> Todos</Filtro><Filtro $active={filtro === "personal"} onClick={() => setFiltro("personal")}><FaUser /> Personal</Filtro><Filtro $active={filtro === "terceros"} onClick={() => setFiltro("terceros")}><FaUsers /> Por terceros</Filtro></Filtros>
                <span style={{ color: "#8c8395", fontSize: 10 }}>{filasVisibles.length} movimientos en el mes</span>
              </BarraControles>
              <TablaShell>
                {loading ? <EstadoVacio>Cargando movimientos...</EstadoVacio> : filasVisibles.length === 0 ? <EstadoVacio>No hay movimientos con esos filtros para este periodo.</EstadoVacio> : (
                  <DataGrid
                    aria-label="Movimientos financieros"
                    rows={filasVisibles}
                    columns={columnas}
                    loading={loading}
                    autoHeight
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 250 } } }}
                    sx={{
                      border: 0,
                      color: "#4e4658",
                      "& .MuiDataGrid-columnHeaders": { backgroundColor: "#faf9fc", color: "#756b80", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" },
                      "& .MuiDataGrid-cell": { borderColor: "#f0edf3", fontSize: 12 },
                      "& .MuiDataGrid-row:hover": { backgroundColor: "#fdfbff" },
                      "& .MuiDataGrid-toolbarContainer": { padding: "8px 10px", borderBottom: "1px solid #ebe6ef", backgroundColor: "#fff" },
                      "& .MuiButtonBase-root": { color: "#684ba1" },
                    }}
                  />
                )}
              </TablaShell>
            </>
          ) : (
            <>
              <AnalisisLayout>
                <Panel>
                  <PanelHeader><div><PanelTitulo>Mapa de gasto personal</PanelTitulo><PanelTexto>Cuánto salió de tus tarjetas cada día · {fechaSeleccionada}</PanelTexto></div><ChipPersonal $personal><FaUser /> Solo personal</ChipPersonal></PanelHeader>
                  <Heatmap>{["D", "L", "M", "M", "J", "V", "S"].map((dia, index) => <DiaSemana key={`${dia}-${index}`}>{dia}</DiaSemana>)}{celdasHeatmap.map((dia, index) => { const gasto = dia ? mapaDias.gastos[dia] || 0 : 0; const level = gasto ? .14 + (.65 * gasto / mapaDias.maximo) : .08; return <CeldaDia key={`${dia || "vacio"}-${index}`} $empty={!dia} $level={level} title={dia && gasto ? `${dia}: ${formatoMoneda(gasto)}` : ""}>{dia || ""}{gasto > 0 && <span style={{ display: "block", fontSize: 8, fontWeight: 500 }}>{formatoMoneda(gasto).replace("MX", "")}</span>}</CeldaDia>; })}</Heatmap>
                </Panel>
                <Panel>
                  <PanelHeader><div><PanelTitulo>En qué se va tu dinero</PanelTitulo><PanelTexto>Gasto personal acumulado · {anioAnalisis}</PanelTexto></div><Monto $positive>{formatoMoneda(estadisticasAnio.personal)}</Monto></PanelHeader>
                  {loadingAnalisis ? <EstadoVacio>Cargando resumen anual...</EstadoVacio> : categorias.length === 0 ? <EstadoVacio>Marca movimientos como personales para ver tus categorías.</EstadoVacio> : <CategoriaLista>{categorias.slice(0, 7).map(([categoria, monto]) => <CategoriaFila key={categoria}><div><CategoriaNombre><FaTag style={{ color: "#8a69c3" }} />{categoria}</CategoriaNombre><BarraCategoria $width={(monto / maxCategoria) * 100}><span /></BarraCategoria></div><NumeroCategoria>{formatoMoneda(monto)}</NumeroCategoria></CategoriaFila>)}</CategoriaLista>}
                </Panel>
              </AnalisisLayout>
              <Panel>
                <PanelHeader>
                  <div><PanelTitulo>Gastos por categoría</PanelTitulo><PanelTexto>El tamaño de cada bloque representa tu gasto personal acumulado · {anioAnalisis}</PanelTexto></div>
                  <ChipPersonal $personal><FaTag /> Vista treemap</ChipPersonal>
                </PanelHeader>
                {loadingAnalisis ? <EstadoVacio>Cargando visualización...</EstadoVacio> : treemapData.length === 0 ? <TreemapVacio>Marca movimientos como personales para construir tu mapa de gastos.</TreemapVacio> : (
                  <TreemapShell>
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap data={treemapData} dataKey="size" nameKey="name" aspectRatio={1.8} content={<TreemapContenido />}>
                        <RechartsTooltip formatter={(value) => formatoMoneda(value)} />
                      </Treemap>
                    </ResponsiveContainer>
                  </TreemapShell>
                )}
              </Panel>
              <Panel>
                <PanelHeader><div><PanelTitulo>Lectura rápida del año</PanelTitulo><PanelTexto>La comparación distingue tus consumos de los gastos que solo pasan por tus tarjetas.</PanelTexto></div><ChipPersonal $personal><FaChartLine /> {estadisticasAnio.personal + estadisticasAnio.terceros > 0 ? `${Math.round((estadisticasAnio.personal / (estadisticasAnio.personal + estadisticasAnio.terceros)) * 100)}% personal` : "Sin gastos"}</ChipPersonal></PanelHeader>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}><div><MetricaEtiqueta>Gasto anual</MetricaEtiqueta><MetricaValor>{formatoMoneda(estadisticasAnio.gastos)}</MetricaValor></div><div><MetricaEtiqueta>Realmente tuyo</MetricaEtiqueta><MetricaValor style={{ color: "#26835d" }}>{formatoMoneda(estadisticasAnio.personal)}</MetricaValor></div><div><MetricaEtiqueta>Por terceros</MetricaEtiqueta><MetricaValor style={{ color: "#af6d1c" }}>{formatoMoneda(estadisticasAnio.terceros)}</MetricaValor></div></div>
              </Panel>
            </>
          )}
        </>
      )}

      <ModalGenerico isOpen={Boolean(movimientoEditar)} onClose={() => setMovimientoEditar(null)}>
        {movimientoEditar && <ModalEditarMovimiento movimiento={movimientoEditar} onClose={() => setMovimientoEditar(null)} />}
      </ModalGenerico>
    </ContenedorPagina>
  );
};
