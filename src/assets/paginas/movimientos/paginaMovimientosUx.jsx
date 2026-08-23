import styled from "styled-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartLine,
  FaEdit,
  FaRedo,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTag,
  FaUser,
  FaUsers,
  FaWallet,
  FaExchangeAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from "recharts";
import Swal from "sweetalert2";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { fechaLocalISO } from "../../funciones/utils/fechas";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
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
import { GastosRecurrentes } from "./gastosRecurrentes";
import {
  BadgeCategoria,
  obtenerEstiloCategoria,
  CONFIG_CATEGORIAS,
} from "../../funciones/utils/coloresCategorias";

/* =======================
   HELPERS DE MOVIMIENTOS
======================= */

const fechaDeMovimiento = (valor) => {
  if (!valor) return null;
  if (typeof valor.toDate === "function") return valor.toDate();
  if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const movimientoEsGasto = (movimiento) => Number(movimiento.monto || 0) < 0;

const movimientoEsInterno = (movimiento = {}) =>
  Boolean(
    movimiento.esTransferencia ||
      movimiento.cuentaDestino ||
      movimiento.cuentaDestinoNombre ||
      movimiento.tipoOperacion === "transferencia" ||
      movimiento.tipoOperacion === "pago_tarjeta" ||
      ["transferencia", "pagoTarjeta"].includes(movimiento.categoria)
  );

const movimientoEsAjusteSaldo = (movimiento = {}) =>
  Boolean(
    ["ajusteDeSaldo", "ajusteDeSaldoMSI"].includes(movimiento.categoria) ||
      movimiento.esAjusteSaldo === true
  );

const movimientoIgnoradoEnResumen = (movimiento = {}) =>
  Boolean(movimiento.ignorarEnResumen);

const movimientoNoContabilizable = (movimiento) =>
  movimientoEsInterno(movimiento) ||
  movimientoEsAjusteSaldo(movimiento) ||
  movimientoIgnoradoEnResumen(movimiento);

const movimientoEsPersonal = (movimiento) =>
  Boolean(
    !movimientoNoContabilizable(movimiento) &&
      (movimiento.esPersonal ||
        (movimiento.categoria === "personal" && movimientoEsGasto(movimiento)))
  );

const mismoMovimiento = (a, b) => {
  const fechaA = a?.fechaMovimiento;
  const fechaB = b?.fechaMovimiento;
  return Boolean(
    fechaA &&
      fechaB &&
      Number(fechaA.seconds) === Number(fechaB.seconds) &&
      Number(fechaA.nanoseconds || 0) === Number(fechaB.nanoseconds || 0)
  );
};

const ordenarMovimientos = (movimientos = []) =>
  [...movimientos].sort((a, b) => {
    const fechaA = fechaDeMovimiento(a.fechaMovimiento)?.getTime() || 0;
    const fechaB = fechaDeMovimiento(b.fechaMovimiento)?.getTime() || 0;
    return fechaB - fechaA;
  });

/* Respeta la preferencia de centavos elegida en el perfil. */
const formatoMoneda = formatearMonedaSegunPreferencia;

const nombreCategoria = (categoria) =>
  adaptadorTxtLabel(categoriasEsqueleto, categoria) || "Sin categoría";

const formatearFilas = (movimientos = []) =>
  ordenarMovimientos(movimientos).map((movimiento, index) => ({
    id: `${fechaDeMovimiento(movimiento.fechaMovimiento)?.getTime() || "sin-fecha"}-${index}`,
    ...movimiento,
    fechaMovimientoFormateada:
      fechaDeMovimiento(movimiento.fechaMovimiento)?.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      }) || "Sin fecha",
    cuentaDescripcion: movimiento.cuentaDestinoNombre
      ? `${movimiento.nombreCuenta || "Sin cuenta"} → ${movimiento.cuentaDestinoNombre}`
      : movimiento.nombreCuenta || "Sin cuenta",
    categoriaNombre: nombreCategoria(movimiento.categoria),
    tipoMovimiento: movimientoIgnoradoEnResumen(movimiento)
      ? "Excluido"
      : movimientoEsAjusteSaldo(movimiento)
      ? "Ajuste"
      : movimientoEsInterno(movimiento)
      ? "Interno"
      : Number(movimiento.monto || 0) >= 0
      ? "Ingreso"
      : "Gasto",
    clasificacion: movimientoNoContabilizable(movimiento)
      ? "No contabiliza"
      : movimientoEsPersonal(movimiento)
      ? "Personal"
      : "Por terceros",
  }));

/* =======================
   ESTILOS PRINCIPALES
======================= */

const ContenedorPagina = styled.main`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 36px;
`;

const Encabezado = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
`;

const Titulo = styled.h1`
  margin: 0;
  color: #1e1b4b;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
`;

const Subtitulo = styled.p`
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
`;

const AccionesEncabezado = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;

  @media (max-width: 680px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const Navegacion = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 13px;
  border: none;
  border-radius: 9px;
  background: ${({ $active }) =>
    $active ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "transparent"};
  color: ${({ $active }) => ($active ? "#ffffff" : "#64748b")};
  box-shadow: ${({ $active }) =>
    $active ? "0 3px 10px rgba(99, 102, 241, 0.3)" : "none"};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;

  &:hover {
    color: ${({ $active }) => ($active ? "#ffffff" : "#1e293b")};
    background: ${({ $active }) =>
      $active
        ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
        : "rgba(0, 0, 0, 0.04)"};
  }
`;

const BtnNuevo = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }
`;

/* =======================
   TARJETAS MÉTRICAS (KPIS)
======================= */

const Metricas = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Metrica = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 12px 16px;
  border-radius: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  ${({ $tone }) => {
    switch ($tone) {
      case "red":
        return `
          background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
          border: 1px solid #fecdd3;
          box-shadow: 0 2px 8px rgba(244, 63, 94, 0.08);
        `;
      case "green":
        return `
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1px solid #a7f3d0;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
        `;
      case "orange":
        return `
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid #fde68a;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
        `;
      case "blue":
        return `
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.08);
        `;
      default:
        return `
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          border: 1px solid #ddd6fe;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
        `;
    }
  }}

  &:hover {
    transform: translateY(-2px);
  }
`;

const MetricaIcono = styled.div`
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  font-size: 16px;

  ${({ $tone }) => {
    switch ($tone) {
      case "red":
        return `
          background: #ffe4e6;
          color: #e11d48;
          box-shadow: 0 2px 6px rgba(225, 29, 72, 0.18);
        `;
      case "green":
        return `
          background: #d1fae5;
          color: #059669;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.18);
        `;
      case "orange":
        return `
          background: #fef3c7;
          color: #d97706;
          box-shadow: 0 2px 6px rgba(217, 119, 6, 0.18);
        `;
      case "blue":
        return `
          background: #e0f2fe;
          color: #0284c7;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.18);
        `;
      default:
        return `
          background: #ede9fe;
          color: #6366f1;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.18);
        `;
    }
  }}
`;

const MetricaEtiqueta = styled.span`
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const MetricaValor = styled.strong`
  display: block;
  margin-top: 2px;
  color: #0f172a;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 17px;
  font-weight: 800;
`;

/* =======================
   BARRA DE CONTROLES
======================= */

const BarraControles = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const GrupoPeriodo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const PeriodoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;

  input {
    border: none;
    outline: none;
    background: transparent;
    color: #0f172a;
    font-weight: 700;
    font-family: inherit;
    font-size: 12px;
  }
`;

const BtnNavMes = styled.button`
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
  }
`;

const Buscador = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #94a3b8;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }

  input {
    width: 100%;
    border: none;
    outline: none;
    color: #0f172a;
    font: inherit;
    font-size: 12px;
  }
`;

const Filtros = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
`;

const Filtro = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  ${({ $active, $color }) =>
    $active
      ? `
        background: ${$color || "#6366f1"};
        color: #ffffff;
        border: 1px solid ${$color || "#6366f1"};
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      `
      : `
        background: #ffffff;
        color: #64748b;
        border: 1px solid #e2e8f0;
        &:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: #cbd5e1;
        }
      `}
`;

/* =======================
   TABLA DE MOVIMIENTOS
======================= */

const TablaShell = styled.div`
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
`;

const MontoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 800;

  ${({ $positive }) =>
    $positive
      ? `
        background: #d1fae5;
        color: #059669;
        border: 1px solid #a7f3d0;
      `
      : `
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      `}
`;

const ChipPersonal = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;

  ${({ $tipo }) => {
    switch ($tipo) {
      case "personal":
        return `
          background: #f3e8ff;
          color: #9333ea;
          border: 1px solid #e9d5ff;
        `;
      case "terceros":
        return `
          background: #fef3c7;
          color: #d97706;
          border: 1px solid #fde68a;
        `;
      default:
        return `
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        `;
    }
  }}
`;

const Acciones = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
`;

const BtnPersonal = styled.button`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $personal }) =>
    $personal
      ? `
        background: #f3e8ff;
        color: #9333ea;
        border: 1px solid #d8b4fe;
        box-shadow: 0 1px 3px rgba(147, 51, 234, 0.15);
      `
      : `
        background: #ffffff;
        color: #94a3b8;
        border: 1px solid #cbd5e1;
        &:hover {
          border-color: #9333ea;
          color: #9333ea;
          background: #faf5ff;
        }
      `}
`;

const BtnEditar = styled.button`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: #f5f3ff;
  }
`;

const BtnRepetir = styled(BtnEditar)`
  &:hover {
    border-color: #0d9488;
    color: #0d9488;
    background: #f0fdfa;
  }
`;

const EstadoVacio = styled.div`
  padding: 40px 20px;
  color: #64748b;
  text-align: center;
  font-size: 13px;
`;

/* =======================
   PESTAÑA DE ANÁLISIS
======================= */

const AnalisisLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  min-width: 0;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
`;

const PanelTitulo = styled.h2`
  margin: 0;
  color: #1e1b4b;
  font-size: 15px;
  font-weight: 900;
`;

const PanelTexto = styled.p`
  margin: 3px 0 0;
  color: #64748b;
  font-size: 11px;
`;

const Heatmap = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(20px, 1fr));
  gap: 6px;
`;

const DiaSemana = styled.span`
  color: #94a3b8;
  font-size: 10px;
  font-weight: 800;
  text-align: center;
`;

const CeldaDia = styled.div`
  min-height: 40px;
  padding: 4px 6px;
  border-radius: 8px;
  background: ${({ $level, $empty }) =>
    $empty ? "transparent" : `rgba(99, 102, 241, ${$level || 0.08})`};
  color: ${({ $level }) => ($level > 0.4 ? "#ffffff" : "#4338ca")};
  font-size: 10px;
  font-weight: 800;
  text-align: right;
  border: ${({ $empty }) => ($empty ? "none" : "1px solid rgba(99, 102, 241, 0.12)")};
  transition: transform 0.1s ease;

  &:hover {
    transform: ${({ $empty }) => ($empty ? "none" : "scale(1.06)")};
    z-index: 2;
  }
`;

const CategoriaLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  gap: 8px;
  min-width: 0;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
`;

const BarraCategoria = styled.div`
  height: 7px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #f1f5f9;

  span {
    display: block;
    width: ${({ $width }) => `${$width}%`};
    height: 100%;
    border-radius: inherit;
    background: ${({ $color }) => $color || "#6366f1"};
    transition: width 0.3s ease;
  }
`;

const NumeroCategoria = styled.strong`
  color: #0f172a;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
`;

const TreemapShell = styled.div`
  width: 100%;
  height: 290px;
  margin-top: 6px;
`;

const TreemapVacio = styled.div`
  display: grid;
  min-height: 220px;
  place-items: center;
  padding: 20px;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  text-align: center;
`;

const TreemapContenido = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name,
  value = 0,
  fill = "#6366f1",
}) => {
  if (width <= 0 || height <= 0) return null;
  const label = String(name || "Sin categoría");
  const labelCorto = label.length > 18 ? `${label.slice(0, 16)}…` : label;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={3}
      />
      {width > 70 && height > 38 && (
        <>
          <text
            x={x + 10}
            y={y + 20}
            fill="#ffffff"
            fontSize="12"
            fontWeight="800"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
          >
            {labelCorto}
          </text>
          {height > 58 && (
            <text
              x={x + 10}
              y={y + 38}
              fill="rgba(255, 255, 255, 0.9)"
              fontSize="11"
              fontWeight="700"
              fontFamily="monospace"
            >
              {formatoMoneda(value)}
            </text>
          )}
        </>
      )}
    </g>
  );
};

/* =======================
   COMPONENTE PRINCIPAL
======================= */

export const PaginaMovimientosUx = () => {
  const { usuario, movimientos, setMovimientos, cuentas } = useAppStore();
  const { setIsOpenAgregarMovimiento, abrirAgregarMovimiento } = useModalStore();

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
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  );
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

  useEffect(() => {
    buscarMovimientos();
  }, [buscarMovimientos]);

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
      .finally(() => {
        if (activo) setLoadingAnalisis(false);
      });
    return () => {
      activo = false;
    };
  }, [anioAnalisis, anioCargado, usuario?.uid, vista]);

  const estadisticasMes = useMemo(
    () =>
      filas.reduce(
        (acc, movimiento) => {
          const monto = Math.abs(Number(movimiento.monto || 0));
          if (movimientoNoContabilizable(movimiento)) {
            acc.internos += monto;
          } else if (movimientoEsGasto(movimiento)) {
            acc.gastos += monto;
            if (movimientoEsPersonal(movimiento)) acc.personal += monto;
            else acc.terceros += monto;
          } else {
            acc.ingresos += monto;
          }
          return acc;
        },
        { gastos: 0, personal: 0, terceros: 0, ingresos: 0, internos: 0 }
      ),
    [filas]
  );

  const estadisticasAnio = useMemo(
    () =>
      movimientosAnio.reduce(
        (acc, movimiento) => {
          if (movimientoNoContabilizable(movimiento) || !movimientoEsGasto(movimiento))
            return acc;
          const monto = Math.abs(Number(movimiento.monto || 0));
          acc.gastos += monto;
          if (movimientoEsPersonal(movimiento)) acc.personal += monto;
          else acc.terceros += monto;

          const catKey = movimiento.categoria || "sinCategoria";
          acc.categorias[catKey] =
            (acc.categorias[catKey] || 0) +
            monto * (movimientoEsPersonal(movimiento) ? 1 : 0);
          return acc;
        },
        { gastos: 0, personal: 0, terceros: 0, categorias: {} }
      ),
    [movimientosAnio]
  );

  const filasVisibles = useMemo(
    () =>
      filas.filter((movimiento) => {
        if (filtro === "internos" && !movimientoNoContabilizable(movimiento))
          return false;
        if (filtro !== "internos" && movimientoNoContabilizable(movimiento))
          return filtro === "todos";
        if (filtro === "personal" && !movimientoEsPersonal(movimiento))
          return false;
        if (filtro === "terceros" && movimientoEsPersonal(movimiento))
          return false;
        if (!busqueda.trim()) return true;
        const termino = busqueda.toLowerCase();
        return [
          movimiento.nombreCuenta,
          movimiento.nota,
          nombreCategoria(movimiento.categoria),
        ].some((valor) => String(valor || "").toLowerCase().includes(termino));
      }),
    [busqueda, filtro, filas]
  );

  const categorias = useMemo(
    () =>
      Object.entries(estadisticasAnio.categorias).sort(([, a], [, b]) => b - a),
    [estadisticasAnio.categorias]
  );

  const maxCategoria = categorias[0]?.[1] || 1;

  const treemapData = useMemo(
    () =>
      categorias.map(([catKey, size]) => {
        const estilo = obtenerEstiloCategoria(catKey);
        return {
          name: estilo.label,
          size,
          fill: estilo.color,
        };
      }),
    [categorias]
  );

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

  const celdasHeatmap = useMemo(
    () => [
      ...Array.from({ length: mapaDias.primerDia }, () => null),
      ...Array.from({ length: mapaDias.diasEnMes }, (_, index) => index + 1),
    ],
    [mapaDias]
  );

  const navegarMes = (delta) => {
    const [anioStr, mesStr] = fechaSeleccionada.split("-");
    const d = new Date(Number(anioStr), Number(mesStr) - 1 + delta, 1);
    const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setFechaSeleccionada(nuevo);
    setAnioAnalisis(String(d.getFullYear()));
  };

  const cambiarFecha = (event) => {
    const valor = event.target.value;
    setFechaSeleccionada(valor);
    if (valor) setAnioAnalisis(valor.slice(0, 4));
  };

  const abrirEdicion = (movimiento) => setMovimientoEditar(movimiento);

  /*
   * Repetir abre el alta con los datos del movimiento ya cargados y la fecha en
   * hoy: los gastos que se repiten (café, gasolina) se anotan en dos toques.
   */
  const repetirMovimiento = useCallback(
    (movimiento) => {
      const cuenta = cuentas.find(
        (item) => item.id === movimiento?.cuentaAsociada
      );

      abrirAgregarMovimiento({
        cuenta: cuenta || null,
        valores: {
          cuentaAsociada: movimiento?.cuentaAsociada || "",
          nombreCuenta: movimiento?.nombreCuenta || "",
          monto: String(Math.abs(Number(movimiento?.monto || 0)) || ""),
          categoria: movimiento?.categoria || "",
          nota: movimiento?.nota || "",
          esPersonal: Boolean(movimiento?.esPersonal),
          tipoDeMovimiento:
            Number(movimiento?.monto || 0) >= 0 ? "ingreso" : "gasto",
          fechaMovimiento: fechaLocalISO(),
        },
      });
    },
    [cuentas, abrirAgregarMovimiento]
  );

  const actualizarMovimientoEnCache = useCallback(
    (movimientoActualizado) => {
      setMovimientos((prev) => {
        const cache = Array.isArray(prev) ? {} : prev;
        const fecha = fechaDeMovimiento(movimientoActualizado?.fechaMovimiento);
        if (!fecha) return cache;
        const key = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        return {
          ...cache,
          [key]: (cache[key] || []).map((m) =>
            mismoMovimiento(m, movimientoActualizado) ? movimientoActualizado : m
          ),
        };
      });
      setFilas((prev) =>
        prev.map((fila) =>
          mismoMovimiento(fila, movimientoActualizado)
            ? {
                ...fila,
                ...movimientoActualizado,
                clasificacion: movimientoNoContabilizable(movimientoActualizado)
                  ? "No contabiliza"
                  : movimientoEsPersonal(movimientoActualizado)
                  ? "Personal"
                  : "Por terceros",
              }
            : fila
        )
      );
      setMovimientosAnio((prev) =>
        prev.map((fila) =>
          mismoMovimiento(fila, movimientoActualizado)
            ? {
                ...fila,
                ...movimientoActualizado,
                clasificacion: movimientoNoContabilizable(movimientoActualizado)
                  ? "No contabiliza"
                  : movimientoEsPersonal(movimientoActualizado)
                  ? "Personal"
                  : "Por terceros",
              }
            : fila
        )
      );
    },
    [setMovimientos, setMovimientosAnio]
  );

  const alternarPersonal = useCallback(
    async (movimiento) => {
      if (movimientoNoContabilizable(movimiento)) return;
      if (movimientoClasificando) return;
      const siguienteValor = !movimientoEsPersonal(movimiento);
      setMovimientoClasificando(movimiento.id);
      const actualizado = await actualizarEsPersonalMovimiento(
        movimiento,
        siguienteValor,
        usuario?.uid
      );
      if (actualizado) actualizarMovimientoEnCache(actualizado);
      else
        Swal.fire({
          icon: "error",
          title: "No se guardó",
          text: "Intenta nuevamente.",
        });
      setMovimientoClasificando(null);
    },
    [actualizarMovimientoEnCache, movimientoClasificando, usuario?.uid]
  );

  const columnas = useMemo(
    () => [
      {
        field: "fechaMovimientoFormateada",
        headerName: "Fecha",
        minWidth: 95,
        flex: 0.65,
      },
      {
        field: "cuentaDescripcion",
        headerName: "Cuenta",
        minWidth: 170,
        flex: 1.15,
        renderCell: (params) => (
          <span style={{ fontWeight: 700, color: "#1e293b" }}>
            {params.row.cuentaDescripcion}
          </span>
        ),
      },
      {
        field: "categoria",
        headerName: "Categoría",
        minWidth: 155,
        flex: 1,
        renderCell: (params) => (
          <BadgeCategoria categoria={params.row.categoria} size="sm" />
        ),
      },
      {
        field: "monto",
        headerName: "Monto",
        minWidth: 130,
        flex: 0.85,
        type: "number",
        valueGetter: (_value, row) => Math.abs(Number(row.monto || 0)),
        renderCell: (params) => {
          const positivo = Number(params.row.monto || 0) >= 0;
          return (
            <MontoBadge $positive={positivo}>
              {positivo ? "+" : "−"}
              {formatoMoneda(Math.abs(Number(params.row.monto || 0)))}
            </MontoBadge>
          );
        },
      },
      {
        field: "clasificacion",
        headerName: "Clasificación",
        minWidth: 130,
        flex: 0.85,
        renderCell: (params) => {
          const personal = movimientoEsPersonal(params.row);
          const noContabiliza = movimientoNoContabilizable(params.row);
          const tipo = noContabiliza ? "interno" : personal ? "personal" : "terceros";
          const label = noContabiliza
            ? "No cuenta"
            : personal
            ? "Personal"
            : "Terceros";
          return <ChipPersonal $tipo={tipo}>{label}</ChipPersonal>;
        },
      },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 90,
        flex: 0.65,
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const personal = movimientoEsPersonal(params.row);
          const interno = movimientoNoContabilizable(params.row);
          const guardando = movimientoClasificando === params.row.id;
          return (
            <Acciones>
              {!interno && (
                <BtnPersonal
                  type="button"
                  $personal={personal}
                  disabled={guardando}
                  onClick={(event) => {
                    event.stopPropagation();
                    alternarPersonal(params.row);
                  }}
                  title={
                    personal ? "Quitar marca personal" : "Marcar como personal"
                  }
                  aria-label={
                    personal ? "Quitar marca personal" : "Marcar como personal"
                  }
                >
                  <FaUser />
                </BtnPersonal>
              )}
              {!interno && (
                <BtnRepetir
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    repetirMovimiento(params.row);
                  }}
                  title="Repetir este movimiento"
                  aria-label="Repetir este movimiento"
                >
                  <FaRedo />
                </BtnRepetir>
              )}
              <BtnEditar
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  abrirEdicion(params.row);
                }}
                title="Editar movimiento"
                aria-label="Editar movimiento"
              >
                <FaEdit />
              </BtnEditar>
            </Acciones>
          );
        },
      },
    ],
    [alternarPersonal, movimientoClasificando, repetirMovimiento]
  );

  return (
    <ContenedorPagina>
      {/* Encabezado Principal */}
      <Encabezado>
        <div>
          <Titulo>Movimientos</Titulo>
          <Subtitulo>
            Control y categorización inteligente de tus finanzas
          </Subtitulo>
        </div>
        <AccionesEncabezado>
          <Navegacion aria-label="Secciones de movimientos">
            <Tab
              $active={vista === "registro"}
              onClick={() => setVista("registro")}
            >
              <FaWallet /> Registro
            </Tab>
            <Tab
              $active={vista === "analisis"}
              onClick={() => setVista("analisis")}
            >
              <FaChartLine /> Gasto personal
            </Tab>
            <Tab
              $active={vista === "compras"}
              onClick={() => setVista("compras")}
            >
              <FaTag /> Despensa y compras
            </Tab>
            <Tab
              $active={vista === "recurrentes"}
              onClick={() => setVista("recurrentes")}
            >
              <FaCalendarCheck /> Recurrentes
            </Tab>
          </Navegacion>
        </AccionesEncabezado>
      </Encabezado>

      {vista === "recurrentes" ? (
        <GastosRecurrentes />
      ) : vista === "compras" ? (
        <ComprasPlaneadas />
      ) : (
        <>
          {/* Controles de Periodo y Acción */}
          <BarraControles>
            <GrupoPeriodo>
              <BtnNavMes type="button" onClick={() => navegarMes(-1)} title="Mes anterior">
                <FaChevronLeft />
              </BtnNavMes>
              <PeriodoBox>
                <FaCalendarAlt style={{ color: "#6366f1" }} />
                <input
                  type="month"
                  value={fechaSeleccionada}
                  onChange={cambiarFecha}
                />
              </PeriodoBox>
              <BtnNavMes type="button" onClick={() => navegarMes(1)} title="Mes siguiente">
                <FaChevronRight />
              </BtnNavMes>
              <BtnNuevo
                type="button"
                onClick={() => setIsOpenAgregarMovimiento(true)}
              >
                <FaPlus /> Nuevo movimiento
              </BtnNuevo>
            </GrupoPeriodo>

            {vista === "registro" && (
              <Buscador>
                <FaSearch />
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar cuenta, nota o categoría..."
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
              </Buscador>
            )}

            {vista === "analisis" && (
              <PeriodoBox>
                <span>Año</span>
                <input
                  type="number" inputMode="decimal"
                  min="2020"
                  max="2100"
                  value={anioAnalisis}
                  onChange={(event) => {
                    setAnioAnalisis(event.target.value);
                    setAnioCargado("");
                  }}
                  style={{ width: "60px" }}
                />
              </PeriodoBox>
            )}
          </BarraControles>

          {/* Tarjetas Métricas con Variedad de Colores */}
          <Metricas>
            <Metrica $tone="red">
              <MetricaIcono $tone="red">
                <FaArrowDown />
              </MetricaIcono>
              <div>
                <MetricaEtiqueta>Gastos del mes</MetricaEtiqueta>
                <MetricaValor>{formatoMoneda(estadisticasMes.gastos)}</MetricaValor>
              </div>
            </Metrica>

            <Metrica $tone="green">
              <MetricaIcono $tone="green">
                <FaUser />
              </MetricaIcono>
              <div>
                <MetricaEtiqueta>Personal · Mes</MetricaEtiqueta>
                <MetricaValor style={{ color: "#059669" }}>
                  {formatoMoneda(estadisticasMes.personal)}
                </MetricaValor>
              </div>
            </Metrica>

            <Metrica $tone="orange">
              <MetricaIcono $tone="orange">
                <FaUsers />
              </MetricaIcono>
              <div>
                <MetricaEtiqueta>Por terceros · Mes</MetricaEtiqueta>
                <MetricaValor style={{ color: "#d97706" }}>
                  {formatoMoneda(estadisticasMes.terceros)}
                </MetricaValor>
              </div>
            </Metrica>

            <Metrica $tone="blue">
              <MetricaIcono $tone="blue">
                <FaArrowUp />
              </MetricaIcono>
              <div>
                <MetricaEtiqueta>Ingresos · Mes</MetricaEtiqueta>
                <MetricaValor style={{ color: "#0284c7" }}>
                  {formatoMoneda(estadisticasMes.ingresos)}
                </MetricaValor>
              </div>
            </Metrica>
          </Metricas>

          {/* Vista Registro vs Análisis */}
          {vista === "registro" ? (
            <>
              <BarraControles>
                <Filtros>
                  <Filtro
                    $active={filtro === "todos"}
                    $color="#6366f1"
                    onClick={() => setFiltro("todos")}
                  >
                    <FaFilter /> Todos
                  </Filtro>
                  <Filtro
                    $active={filtro === "personal"}
                    $color="#9333ea"
                    onClick={() => setFiltro("personal")}
                  >
                    <FaUser /> Solo Personal
                  </Filtro>
                  <Filtro
                    $active={filtro === "terceros"}
                    $color="#d97706"
                    onClick={() => setFiltro("terceros")}
                  >
                    <FaUsers /> Por terceros
                  </Filtro>
                  <Filtro
                    $active={filtro === "internos"}
                    $color="#0284c7"
                    onClick={() => setFiltro("internos")}
                  >
                    <FaExchangeAlt /> Internos y ajustes
                  </Filtro>
                </Filtros>
                <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>
                  {filasVisibles.length}{" "}
                  {filasVisibles.length === 1 ? "movimiento" : "movimientos"}
                </span>
              </BarraControles>

              <TablaShell>
                {loading ? (
                  <EstadoVacio>Cargando movimientos...</EstadoVacio>
                ) : filasVisibles.length === 0 ? (
                  <EstadoVacio>
                    No hay movimientos con esos filtros para este periodo.
                  </EstadoVacio>
                ) : (
                  <DataGrid
                    aria-label="Movimientos financieros"
                    rows={filasVisibles}
                    columns={columnas}
                    loading={loading}
                    autoHeight
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10, page: 0 } },
                    }}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                      toolbar: {
                        showQuickFilter: true,
                        quickFilterProps: { debounceMs: 250 },
                      },
                    }}
                    sx={{
                      border: 0,
                      color: "#1e293b",
                      "& .MuiDataGrid-columnHeaders": {
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        borderBottom: "1px solid #e2e8f0",
                      },
                      "& .MuiDataGrid-cell": {
                        borderColor: "#f1f5f9",
                        fontSize: 13,
                      },
                      "& .MuiDataGrid-row:hover": {
                        backgroundColor: "#f8fafc",
                      },
                      "& .MuiDataGrid-toolbarContainer": {
                        padding: "10px 14px",
                        borderBottom: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                      },
                      "& .MuiButtonBase-root": {
                        color: "#6366f1",
                        fontWeight: 700,
                      },
                    }}
                  />
                )}
              </TablaShell>
            </>
          ) : (
            <>
              {/* Sección de Análisis de Gasto Personal */}
              <AnalisisLayout>
                <Panel>
                  <PanelHeader>
                    <div>
                      <PanelTitulo>Mapa de calor de gasto diario</PanelTitulo>
                      <PanelTexto>
                        Concentración de gastos personales en {fechaSeleccionada}
                      </PanelTexto>
                    </div>
                    <ChipPersonal $tipo="personal">
                      <FaUser /> Solo personal
                    </ChipPersonal>
                  </PanelHeader>
                  <Heatmap>
                    {["D", "L", "M", "M", "J", "V", "S"].map((dia, index) => (
                      <DiaSemana key={`${dia}-${index}`}>{dia}</DiaSemana>
                    ))}
                    {celdasHeatmap.map((dia, index) => {
                      const gasto = dia ? mapaDias.gastos[dia] || 0 : 0;
                      const level = gasto
                        ? 0.15 + (0.75 * gasto) / mapaDias.maximo
                        : 0.08;
                      return (
                        <CeldaDia
                          key={`${dia || "vacio"}-${index}`}
                          $empty={!dia}
                          $level={level}
                          title={dia && gasto ? `${dia}: ${formatoMoneda(gasto)}` : ""}
                        >
                          {dia || ""}
                          {gasto > 0 && (
                            <span
                              style={{
                                display: "block",
                                fontSize: 8,
                                fontWeight: 600,
                              }}
                            >
                              {formatoMoneda(gasto).replace("MX", "")}
                            </span>
                          )}
                        </CeldaDia>
                      );
                    })}
                  </Heatmap>
                </Panel>

                <Panel>
                  <PanelHeader>
                    <div>
                      <PanelTitulo>Top Categorías Personales</PanelTitulo>
                      <PanelTexto>
                        Gasto personal acumulado en {anioAnalisis}
                      </PanelTexto>
                    </div>
                    <MontoBadge $positive={false}>
                      {formatoMoneda(estadisticasAnio.personal)}
                    </MontoBadge>
                  </PanelHeader>
                  {loadingAnalisis ? (
                    <EstadoVacio>Cargando resumen anual...</EstadoVacio>
                  ) : categorias.length === 0 ? (
                    <EstadoVacio>
                      Marca movimientos como personales para ver tus categorías.
                    </EstadoVacio>
                  ) : (
                    <CategoriaLista>
                      {categorias.slice(0, 7).map(([catKey, monto]) => {
                        const estilo = obtenerEstiloCategoria(catKey);
                        const Icono = estilo.icon;
                        return (
                          <CategoriaFila key={catKey}>
                            <div>
                              <CategoriaNombre>
                                <Icono style={{ color: estilo.color }} />
                                {estilo.label}
                              </CategoriaNombre>
                              <BarraCategoria
                                $width={(monto / maxCategoria) * 100}
                                $color={estilo.color}
                              >
                                <span />
                              </BarraCategoria>
                            </div>
                            <NumeroCategoria>
                              {formatoMoneda(monto)}
                            </NumeroCategoria>
                          </CategoriaFila>
                        );
                      })}
                    </CategoriaLista>
                  )}
                </Panel>
              </AnalisisLayout>

              {/* Treemap Multicolor por Categorías */}
              <Panel>
                <PanelHeader>
                  <div>
                    <PanelTitulo>Distribución Treemap por Categoría</PanelTitulo>
                    <PanelTexto>
                      Proporción visual de tu gasto personal en {anioAnalisis}
                    </PanelTexto>
                  </div>
                  <ChipPersonal $tipo="personal">
                    <FaTag /> Vista Treemap
                  </ChipPersonal>
                </PanelHeader>
                {loadingAnalisis ? (
                  <EstadoVacio>Cargando visualización...</EstadoVacio>
                ) : treemapData.length === 0 ? (
                  <TreemapVacio>
                    Marca movimientos como personales para construir tu mapa de
                    gastos.
                  </TreemapVacio>
                ) : (
                  <TreemapShell>
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={treemapData}
                        dataKey="size"
                        nameKey="name"
                        aspectRatio={1.8}
                        content={<TreemapContenido />}
                      >
                        <RechartsTooltip
                          formatter={(value) => formatoMoneda(value)}
                        />
                      </Treemap>
                    </ResponsiveContainer>
                  </TreemapShell>
                )}
              </Panel>

              {/* Lectura Rápida del Año */}
              <Panel>
                <PanelHeader>
                  <div>
                    <PanelTitulo>Resumen del Año {anioAnalisis}</PanelTitulo>
                    <PanelTexto>
                      Diferenciación entre consumos personales y gastos por terceros
                    </PanelTexto>
                  </div>
                  <ChipPersonal $tipo="personal">
                    <FaChartLine />
                    {estadisticasAnio.personal + estadisticasAnio.terceros > 0
                      ? `${Math.round(
                          (estadisticasAnio.personal /
                            (estadisticasAnio.personal +
                              estadisticasAnio.terceros)) *
                            100
                        )}% personal`
                      : "Sin gastos"}
                  </ChipPersonal>
                </PanelHeader>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <MetricaEtiqueta>Gasto total anual</MetricaEtiqueta>
                    <MetricaValor style={{ color: "#0f172a" }}>
                      {formatoMoneda(estadisticasAnio.gastos)}
                    </MetricaValor>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    <MetricaEtiqueta style={{ color: "#059669" }}>
                      Realmente tuyo
                    </MetricaEtiqueta>
                    <MetricaValor style={{ color: "#059669" }}>
                      {formatoMoneda(estadisticasAnio.personal)}
                    </MetricaValor>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <MetricaEtiqueta style={{ color: "#d97706" }}>
                      Por terceros
                    </MetricaEtiqueta>
                    <MetricaValor style={{ color: "#d97706" }}>
                      {formatoMoneda(estadisticasAnio.terceros)}
                    </MetricaValor>
                  </div>
                </div>
              </Panel>
            </>
          )}
        </>
      )}

      {/* Modal Editar Movimiento */}
      <ModalGenerico
        isOpen={Boolean(movimientoEditar)}
        onClose={() => setMovimientoEditar(null)}
      >
        {movimientoEditar && (
          <ModalEditarMovimiento
            movimiento={movimientoEditar}
            onClose={() => setMovimientoEditar(null)}
          />
        )}
      </ModalGenerico>
    </ContenedorPagina>
  );
};
