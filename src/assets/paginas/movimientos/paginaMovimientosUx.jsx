import styled, { keyframes } from "styled-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FaEllipsisV,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import { DataGrid } from "@mui/x-data-grid";
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
  editarMovimiento,
} from "../../funciones/firebase/movimientos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { ModalEncabezado, ModalGenerico } from "../../componentes/modales/modalGenerico";
import { ModalEditarMovimiento } from "../../componentes/modales/modalEditarMovimientos";
import { obtenerImagenCategoriaCompra, normalizarCategoriaCompra } from "../../funciones/categoriasCompra";
import {
  CategoriaEtiquetaModal,
  CategoriaGridModal,
  CategoriaImagenModal,
  CategoriaOpcionModal,
} from "../../componentes/categorias/SelectorCategoriaVisual";
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
    categoria: normalizarCategoriaCompra(movimiento.categoria),
    fechaMovimientoFormateada:
      fechaDeMovimiento(movimiento.fechaMovimiento)?.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      }) || "Sin fecha",
    cuentaDescripcion: movimiento.cuentaDestinoNombre
      ? `${movimiento.nombreCuenta || "Sin cuenta"} → ${movimiento.cuentaDestinoNombre}`
      : movimiento.nombreCuenta || "Sin cuenta",
    categoriaNombre: nombreCategoria(normalizarCategoriaCompra(movimiento.categoria)),
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

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const ContenedorPagina = styled.main`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${fadeUp} 0.35s ease;
  padding-bottom: 40px;
`;

const Encabezado = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    align-items: stretch;
    gap: 10px;
  }
`;

const TituloGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Titulo = styled.h1`
  margin: 0;
  color: var(--colorMorado);
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;

  @media (max-width: 500px) {
    font-size: 21px;
  }
`;

const Subtitulo = styled.p`
  margin: 0;
  color: #666;
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
    justify-content: stretch;
  }
`;

const Navegacion = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  background: white;
  overflow-x: auto;
  scrollbar-width: none;
  max-width: 100%;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 9px;
  background: ${({ $active }) => ($active ? "var(--colorMorado)" : "transparent")};
  color: ${({ $active }) => ($active ? "#ffffff" : "#666")};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  @media (max-width: 680px) {
    min-height: 32px;
    padding: 0 10px;
    gap: 5px;
    font-size: 11px;
  }

  @media (max-width: 420px) {
    padding: 0 9px;
    font-size: 10px;
  }

  &:hover {
    color: ${({ $active }) => ($active ? "#ffffff" : "var(--colorMorado)")};
    background: ${({ $active }) =>
      $active ? "var(--colorMoradoSecundario)" : "rgba(83, 59, 143, 0.08)"};
  }
`;

const BtnNuevo = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  background: var(--colorMorado);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(83, 59, 143, 0.2);
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: translateY(-1px);
  }
`;

/* =======================
   TARJETAS MÉTRICAS (KPIS)
======================= */

const Metricas = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    & > * {
      min-width: 0;
    }
  }

  @media (max-width: 350px) {
    grid-template-columns: 1fr;
  }
`;

const Metrica = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 72px;
  padding: 13px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(83, 59, 143, 0.08);
  }

  @media (max-width: 520px) {
    gap: 8px;
    min-height: 68px;
    padding: 10px;
    border-radius: 12px;
  }
`;

const TONOS_METRICA = {
  red: { bg: "rgba(219, 43, 57, 0.12)", color: "var(--colorRojo)" },
  green: { bg: "rgba(0, 108, 103, 0.12)", color: "var(--colorVerde)" },
  orange: { bg: "rgba(204, 164, 59, 0.16)", color: "#a37f18" },
  blue: { bg: "rgba(83, 59, 143, 0.12)", color: "var(--colorMorado)" },
};

const MetricaIcono = styled.div`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  font-size: 18px;
  background: ${({ $tone }) => (TONOS_METRICA[$tone] || TONOS_METRICA.blue).bg};
  color: ${({ $tone }) => (TONOS_METRICA[$tone] || TONOS_METRICA.blue).color};

  @media (max-width: 520px) {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    font-size: 15px;
  }
`;

const MetricaEtiqueta = styled.span`
  display: block;
  color: #777;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;

  @media (max-width: 520px) {
    font-size: 9px;
    letter-spacing: 0.25px;
  }
`;

const MetricaValor = styled.strong`
  display: block;
  margin-top: 2px;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: clamp(16px, 3.4vw, 19px);
  font-weight: 800;
  overflow-wrap: anywhere;

  @media (max-width: 520px) {
    font-size: 14px;
  }
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

  @media (max-width: 680px) {
    align-items: stretch;
    gap: 8px;
  }
`;

const GrupoPeriodo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 680px) {
    width: 100%;
    gap: 4px;
  }
`;

const PeriodoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 10px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  color: var(--colorMorado);
  font-size: 13px;
  font-weight: 700;

  @media (max-width: 520px) {
    height: 36px;
    padding: 0 8px;
    border-radius: 10px;
    font-size: 12px;

    input {
      font-size: 12px;
    }
  }

  input {
    border: none;
    outline: none;
    background: transparent;
    color: #1a1a2e;
    font-weight: 700;
    font-family: inherit;
    font-size: 13px;
  }
`;

const BtnNavMes = styled.button`
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--colorMorado);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }
`;

const Buscador = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  background: white;
  color: var(--colorMorado);
  transition: all 0.15s ease;

  @media (max-width: 680px) {
    width: 100%;
    min-width: 0;
    height: 36px;
    border-radius: 10px;
  }

  &:focus-within {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.12);
  }

  input {
    width: 100%;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: #1a1a2e;
    font: inherit;
    font-size: 13px;

    &::placeholder {
      color: #7c7c86;
      opacity: 1;
    }

    &::-webkit-search-cancel-button {
      appearance: none;
    }
  }
`;

const Filtros = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  min-width: 0;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 520px) {
    gap: 6px;
    flex: 1;
  }
`;

const Filtro = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;

  @media (max-width: 520px) {
    height: 32px;
    padding: 0 10px;
    gap: 5px;
    font-size: 11px;
  }

  ${({ $active }) =>
    $active
      ? `
        background: var(--colorMorado);
        color: #ffffff;
        border: 1px solid var(--colorMorado);
        box-shadow: 0 4px 12px rgba(83, 59, 143, 0.2);
      `
      : `
        background: #ffffff;
        color: #666;
        border: 1px solid rgba(83, 59, 143, 0.2);
        &:hover {
          background: rgba(83, 59, 143, 0.06);
          color: var(--colorMorado);
        }
      `}
`;

/* =======================
   TABLA DE MOVIMIENTOS
======================= */

const TablaShell = styled.div`
  overflow: hidden;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
`;

const CategoriaBadgeTabla = styled(BadgeCategoria)`
  && {
    align-self: center;
    box-sizing: border-box;
    height: auto !important;
    min-height: 0 !important;
    max-height: 28px;
    padding: 4px 8px;
    border-radius: 6px !important;
  }
`;

const CategoriaCeldaButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;

  &:hover, &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(83, 59, 143, .12);
  }
`;

const CategoriaImagenTabla = styled.img`
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 1px solid rgba(83, 59, 143, .16);
  border-radius: 7px;
  object-fit: cover;
`;

const SelectorCategoriaModal = styled.div`
  padding: 0 20px 24px;

  @media (max-width: 560px) {
    padding: 0 14px 18px;
  }
`;

const MontoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: ${({ $compact }) => ($compact ? "3px 8px" : "2px 6px")};
  border-radius: ${({ $compact }) => ($compact ? "6px" : "999px")};
  box-sizing: border-box;
  height: auto !important;
  min-height: 0 !important;
  max-height: 28px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;

  ${({ $positive }) =>
    $positive
      ? `
        background: rgba(0, 108, 103, 0.1);
        color: var(--colorVerde);
        border: 1px solid rgba(0, 108, 103, 0.25);
      `
      : `
        background: rgba(219, 43, 57, 0.08);
        color: var(--colorRojo);
        border: 1px solid rgba(219, 43, 57, 0.22);
      `}
`;

const ChipPersonal = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $compact }) => ($compact ? "3px 8px" : "3px 8px")};
  border-radius: ${({ $compact }) => ($compact ? "6px" : "999px")};
  box-sizing: border-box;
  height: auto !important;
  min-height: 0 !important;
  max-height: 28px;
  font-size: ${({ $compact }) => ($compact ? "9px" : "10px")};
  font-weight: 800;
  white-space: nowrap;

  ${({ $tipo }) => {
    switch ($tipo) {
      case "personal":
        return `
          background: rgba(83, 59, 143, 0.1);
          color: var(--colorMorado);
          border: 1px solid rgba(83, 59, 143, 0.22);
        `;
      case "terceros":
        return `
          background: rgba(204, 164, 59, 0.16);
          color: #a37f18;
          border: 1px solid rgba(204, 164, 59, 0.35);
        `;
      default:
        return `
          background: rgba(83, 59, 143, 0.05);
          color: #777;
          border: 1px solid rgba(83, 59, 143, 0.15);
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

  @media (max-width: 680px) {
    display: none;
  }
`;

const AccionesMoviles = styled.details`
  position: relative;
  display: none;
  z-index: 4;

  @media (max-width: 680px) {
    display: block;
  }
`;

const BotonAccionesMoviles = styled.summary`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: #ffffff;
  color: #777;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const MenuAccionesMoviles = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 174px;
  padding: 5px;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(38, 25, 70, 0.18);
`;

const OpcionAccionMovil = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #4f4860;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
    color: var(--colorMorado);
  }

  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  svg {
    width: 13px;
    flex: 0 0 auto;
  }
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
        background: var(--colorMorado);
        color: #ffffff;
        border: 1px solid var(--colorMorado);
        box-shadow: 0 2px 6px rgba(83, 59, 143, 0.2);
      `
      : `
        background: #ffffff;
        color: #999;
        border: 1px solid rgba(83, 59, 143, 0.2);
        &:hover {
          border-color: var(--colorMorado);
          color: var(--colorMorado);
          background: rgba(83, 59, 143, 0.06);
        }
      `}
`;

const BtnEditar = styled.button`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: #ffffff;
  color: #777;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
    color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.06);
  }
`;

const BtnRepetir = styled(BtnEditar)`
  &:hover {
    border-color: var(--colorVerde);
    color: var(--colorVerde);
    background: rgba(0, 108, 103, 0.07);
  }
`;

const EstadoVacio = styled.div`
  padding: 40px 20px;
  color: #666;
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
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
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
  color: var(--colorMorado);
  font-size: 18px;
  font-weight: 800;

  @media (max-width: 500px) {
    font-size: 16px;
  }
`;

const PanelTexto = styled.p`
  margin: 3px 0 0;
  color: #666;
  font-size: 12px;
`;

const Heatmap = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(20px, 1fr));
  gap: 6px;
`;

const DiaSemana = styled.span`
  color: #999;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
`;

const CeldaDia = styled.div`
  min-height: 40px;
  padding: 4px 6px;
  border-radius: 8px;
  background: ${({ $level, $empty }) =>
    $empty ? "transparent" : `rgba(83, 59, 143, ${$level || 0.08})`};
  color: ${({ $level }) => ($level > 0.4 ? "#ffffff" : "var(--colorMorado)")};
  font-size: 10px;
  font-weight: 700;
  text-align: right;
  border: ${({ $empty }) => ($empty ? "none" : "1px solid rgba(83, 59, 143, 0.12)")};
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
  color: #444;
  font-size: 12px;
  font-weight: 700;
`;

const BarraCategoria = styled.div`
  height: 7px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(83, 59, 143, 0.08);

  span {
    display: block;
    width: ${({ $width }) => `${$width}%`};
    height: 100%;
    border-radius: inherit;
    background: ${({ $color }) => $color || "var(--colorMorado)"};
    transition: width 0.3s ease;
  }
`;

const NumeroCategoria = styled.strong`
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
`;

const TreemapShell = styled.div`
  position: relative;
  width: 100%;
  height: 290px;
  margin-top: 6px;
  border-radius: 10px;

  &:fullscreen {
    width: 100vw;
    height: 100dvh;
    margin: 0;
    padding: 42px 28px 28px;
    background: #ffffff;
    border-radius: 0;
  }

  @media (max-width: 680px) {
    height: 260px;
  }
`;

const BtnPantallaCompleta = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.56);
  border-radius: 8px;
  background: rgba(30, 27, 75, 0.72);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: var(--colorMorado);
    transform: scale(1.04);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMoradoSecundario);
    outline-offset: 2px;
  }
`;

const TreemapVacio = styled.div`
  display: grid;
  min-height: 220px;
  place-items: center;
  padding: 20px;
  border-radius: 12px;
  background: rgba(83, 59, 143, 0.04);
  color: #666;
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
  fill = "var(--colorMorado)",
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

const AccionesFilaMovil = ({
  movimiento,
  interno,
  personal,
  guardando,
  alternarPersonal,
  repetirMovimiento,
  abrirEdicion,
}) => {
  const cerrarMenu = (evento) => {
    evento.currentTarget.closest("details")?.removeAttribute("open");
  };

  return (
    <AccionesMoviles>
      <BotonAccionesMoviles aria-label="Más acciones">
        <FaEllipsisV aria-hidden="true" />
      </BotonAccionesMoviles>
      <MenuAccionesMoviles>
        {!interno && (
          <OpcionAccionMovil
            type="button"
            disabled={guardando}
            onClick={(evento) => {
              evento.stopPropagation();
              alternarPersonal(movimiento);
              cerrarMenu(evento);
            }}
          >
            <FaUser />
            {personal ? "Quitar marca personal" : "Marcar como personal"}
          </OpcionAccionMovil>
        )}
        {!interno && (
          <OpcionAccionMovil
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              repetirMovimiento(movimiento);
              cerrarMenu(evento);
            }}
          >
            <FaRedo /> Repetir movimiento
          </OpcionAccionMovil>
        )}
        <OpcionAccionMovil
          type="button"
          onClick={(evento) => {
            evento.stopPropagation();
            abrirEdicion(movimiento);
            cerrarMenu(evento);
          }}
        >
          <FaEdit /> Editar movimiento
        </OpcionAccionMovil>
      </MenuAccionesMoviles>
    </AccionesMoviles>
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
  const [movimientoCategoriaEditar, setMovimientoCategoriaEditar] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [movimientoClasificando, setMovimientoClasificando] = useState(null);
  const [graficaPantallaCompleta, setGraficaPantallaCompleta] = useState(false);
  const graficaRef = useRef(null);

  const hoy = new Date();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  );
  const [anioAnalisis, setAnioAnalisis] = useState(String(hoy.getFullYear()));

  useEffect(() => {
    const actualizarEstadoPantallaCompleta = () => {
      setGraficaPantallaCompleta(document.fullscreenElement === graficaRef.current);
    };

    document.addEventListener("fullscreenchange", actualizarEstadoPantallaCompleta);
    return () => document.removeEventListener("fullscreenchange", actualizarEstadoPantallaCompleta);
  }, []);

  const alternarPantallaCompletaGrafica = async () => {
    if (!graficaRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (graficaRef.current.requestFullscreen) {
        await graficaRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error("No se pudo abrir la gráfica en pantalla completa", error);
    }
  };

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

  const abrirSelectorCategoria = useCallback((movimiento) => {
    setMovimientoCategoriaEditar(movimiento);
    setCategoriaSeleccionada(movimiento?.categoria || "");
  }, []);

  const guardarCategoria = async () => {
    if (!movimientoCategoriaEditar || guardandoCategoria) return;
    setGuardandoCategoria(true);
    const actualizado = await editarMovimiento(
      movimientoCategoriaEditar,
      {
        monto: Math.abs(Number(movimientoCategoriaEditar.monto || 0)),
        categoria: categoriaSeleccionada,
        nota: movimientoCategoriaEditar.nota || "",
        esPersonal: Boolean(movimientoCategoriaEditar.esPersonal),
        ignorarEnResumen: Boolean(movimientoCategoriaEditar.ignorarEnResumen),
      },
      usuario?.uid
    );
    if (actualizado) {
      actualizarMovimientoEnCache(actualizado);
      setMovimientoCategoriaEditar(null);
    } else {
      Swal.fire({ icon: "error", title: "No se guardó", text: "No se pudo cambiar la categoría." });
    }
    setGuardandoCategoria(false);
  };

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
          <span style={{ fontWeight: 700, color: "#1a1a2e" }}>
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
          <CategoriaCeldaButton
            type="button"
            title="Cambiar categoría"
            aria-label={`Cambiar categoría de ${params.row.categoriaNombre || "este movimiento"}`}
            onClick={(event) => {
              event.stopPropagation();
              abrirSelectorCategoria(params.row);
            }}
          >
            <CategoriaImagenTabla src={obtenerImagenCategoriaCompra(params.row.categoria)} alt="" />
            <CategoriaBadgeTabla
              categoria={params.row.categoria}
              size="sm"
              shape="rectangular"
            />
          </CategoriaCeldaButton>
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
            <MontoBadge $compact $positive={positivo}>
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
          return <ChipPersonal $compact $tipo={tipo}>{label}</ChipPersonal>;
        },
      },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 132,
        flex: 0.9,
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const personal = movimientoEsPersonal(params.row);
          const interno = movimientoNoContabilizable(params.row);
          const guardando = movimientoClasificando === params.row.id;
          return (
            <>
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
              <AccionesFilaMovil
                movimiento={params.row}
                interno={interno}
                personal={personal}
                guardando={guardando}
                alternarPersonal={alternarPersonal}
                repetirMovimiento={repetirMovimiento}
                abrirEdicion={abrirEdicion}
              />
            </>
          );
        },
      },
    ],
    [abrirSelectorCategoria, alternarPersonal, movimientoClasificando, repetirMovimiento]
  );

  return (
    <ContenedorPagina>
      {/* Encabezado Principal */}
      <Encabezado>
        <TituloGrupo>
          <Titulo>Movimientos</Titulo>
          <Subtitulo>
            Control y categorización inteligente de tus finanzas
          </Subtitulo>
        </TituloGrupo>
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
              <FaTag /> Compras
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
                <FaCalendarAlt style={{ color: "var(--colorMorado)" }} />
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
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar cuenta, nota o categoría..."
                  aria-label="Buscar movimientos"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#999",
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
                    onClick={() => setFiltro("todos")}
                  >
                    <FaFilter /> Todos
                  </Filtro>
                  <Filtro
                    $active={filtro === "personal"}
                    onClick={() => setFiltro("personal")}
                  >
                    <FaUser /> Solo Personal
                  </Filtro>
                  <Filtro
                    $active={filtro === "terceros"}
                    onClick={() => setFiltro("terceros")}
                  >
                    <FaUsers /> Por terceros
                  </Filtro>
                  <Filtro
                    $active={filtro === "internos"}
                    onClick={() => setFiltro("internos")}
                  >
                    <FaExchangeAlt /> Internos y ajustes
                  </Filtro>
                </Filtros>
                <span style={{ color: "#666", fontSize: 12, fontWeight: 600 }}>
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
                    sx={{
                      border: 0,
                      color: "#1a1a2e",
                      fontFamily: "inherit",
                      "& .MuiDataGrid-columnHeaders": {
                        backgroundColor: "rgba(83, 59, 143, 0.05)",
                        color: "var(--colorMorado)",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".5px",
                        borderBottom: "1px solid rgba(83, 59, 143, 0.12)",
                      },
                      "& .MuiDataGrid-cell": {
                        borderColor: "rgba(83, 59, 143, 0.08)",
                        fontSize: 13,
                      },
                      "& .MuiDataGrid-cell[data-field='acciones']": {
                        overflow: "visible",
                        position: "relative",
                        zIndex: 2,
                      },
                      "& .MuiDataGrid-row:hover": {
                        backgroundColor: "rgba(83, 59, 143, 0.04)",
                      },
                      "& .MuiButtonBase-root": {
                        color: "var(--colorMorado)",
                        fontWeight: 700,
                      },
                      "& .MuiDataGrid-footerContainer": {
                        borderTop: "1px solid rgba(83, 59, 143, 0.12)",
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
                  <TreemapShell ref={graficaRef}>
                    <BtnPantallaCompleta
                      type="button"
                      onClick={alternarPantallaCompletaGrafica}
                      title={graficaPantallaCompleta ? "Salir de pantalla completa" : "Ver gráfica en pantalla completa"}
                      aria-label={graficaPantallaCompleta ? "Salir de pantalla completa" : "Ver gráfica en pantalla completa"}
                    >
                      {graficaPantallaCompleta ? <FaCompress /> : <FaExpand />}
                    </BtnPantallaCompleta>
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
                      background: "rgba(83, 59, 143, 0.04)",
                      border: "1px solid rgba(83, 59, 143, 0.12)",
                    }}
                  >
                    <MetricaEtiqueta>Gasto total anual</MetricaEtiqueta>
                    <MetricaValor style={{ color: "#1a1a2e" }}>
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

      <ModalGenerico
        isOpen={Boolean(movimientoCategoriaEditar)}
        onClose={() => setMovimientoCategoriaEditar(null)}
      >
        <SelectorCategoriaModal>
          <ModalEncabezado
            icon={<FaTag />}
            title="Cambiar categoría"
            description="Elige una imagen para actualizar este movimiento."
          />
          <CategoriaGridModal role="listbox" aria-label="Categorías disponibles">
            <CategoriaOpcionModal
              type="button"
              $activo={!categoriaSeleccionada}
              onClick={() => setCategoriaSeleccionada("")}
            >
              <CategoriaImagenModal src={obtenerImagenCategoriaCompra("")} alt="" />
              <CategoriaEtiquetaModal>Sin categoría</CategoriaEtiquetaModal>
            </CategoriaOpcionModal>
            {categoriasEsqueleto.map((categoria) => (
              <CategoriaOpcionModal
                key={categoria.value}
                type="button"
                role="option"
                aria-selected={categoriaSeleccionada === categoria.value}
                $activo={categoriaSeleccionada === categoria.value}
                onClick={() => setCategoriaSeleccionada(categoria.value)}
              >
                <CategoriaImagenModal src={obtenerImagenCategoriaCompra(categoria.value)} alt="" />
                <CategoriaEtiquetaModal>{categoria.label}</CategoriaEtiquetaModal>
              </CategoriaOpcionModal>
            ))}
          </CategoriaGridModal>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button
              type="button"
              onClick={guardarCategoria}
              disabled={guardandoCategoria}
              style={{
                minHeight: 40,
                padding: "0 16px",
                border: "none",
                borderRadius: 9,
                background: "var(--colorMorado)",
                color: "#fff",
                fontWeight: 800,
                cursor: guardandoCategoria ? "wait" : "pointer",
                opacity: guardandoCategoria ? .6 : 1,
              }}
            >
              {guardandoCategoria ? "Guardando..." : "Guardar categoría"}
            </button>
          </div>
        </SelectorCategoriaModal>
      </ModalGenerico>

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
