import styled, { keyframes } from "styled-components";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    FaPlus,
    FaBuilding,
    FaMoneyBillWave,
    FaChartLine,
    FaFileImport,
    FaFileExport,
    FaEllipsisV,
    FaGripVertical,
    FaEdit,
    FaBolt,
    FaChevronLeft,
    FaChevronRight,
    FaTable,
    FaClock,
    FaCheckCircle,
    FaTimes,
    FaLightbulb,
    FaDatabase,
} from "react-icons/fa";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    AreaChart,
    Area,
    Tooltip,
} from "recharts";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerOAInicializarIngresosAnio,
    reordenarEmpresa,
    guardarRegistrosMasivos,
} from "../../funciones/firebase/ingresos";
import { aplicarAjusteInnciAgosto2026, cargarHistoricosEnFirestore } from "../../funciones/datosHistoricosIngresos";
import {
    obtenerTodosPrestamos,
} from "../../funciones/firebase/prestamos";
import {
    fnFormatMoney,
    calcularMatrizResumenMensual,
    MESES_ANIO,
    esCobroConfirmado,
    obtenerMontoRegistro,
    generarPeriodosRecurrentesEmpresa,
    exportarMatrizACSV,
    exportarRegistrosEmpresaACSV,
} from "../../funciones/ingresosCalculos";
import { TablaResumenMensual } from "./secciones/tablaResumenMensual";
import { TablaEmpresaPagos } from "./secciones/tablaEmpresaPagos";
import { IngresosAnalitica } from "./secciones/IngresosAnalitica";
import { ModalEmpresa } from "./modales/modalEmpresa";
import { ModalNuevoIngreso } from "./modales/modalNuevoIngreso";
import { ModalImportarIngresos } from "./modales/modalImportarIngresos";
import { ModalGenerico, ModalEncabezado } from "../../componentes/modales/modalGenerico";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import Swal from "sweetalert2";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const PaginaContenedor = styled.div`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${fadeUp} 0.35s ease;
  padding-bottom: 40px;
`;

const HeaderPrincipal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;

  @media (max-width: 720px) {
    align-items: stretch;
    gap: 10px;
  }
`;

const TituloFilaHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 1 1 auto;
`;

const TituloGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BtnNuevoMobile = styled.button`
  display: none;
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 12px;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(83, 59, 143, 0.25);
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: scale(1.05);
  }

  @media (max-width: 720px) {
    display: flex;
  }
`;

const SelectorAnioWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  padding: 4px 8px;
`;

const BtnAnio = styled.button`
  background: none;
  border: none;
  color: var(--colorMorado);
  font-size: 16px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }
`;

const AnioTexto = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: #1a1a2e;
  padding: 0 8px;
  min-width: 60px;
  text-align: center;
`;

const ControlesHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 720px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const BotonesHeader = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  @media (max-width: 720px) {
    .btn-desktop-nuevo {
      display: none;
    }
  }
`;

const BtnPrincipal = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(83, 59, 143, 0.2);
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: translateY(-1px);
  }
`;

const BtnSecundario = styled.button`
  background: white;
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    transform: translateY(-1px);
  }
`;

const BtnAccionDatos = styled.button`
  background: white;
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.25);
  border-radius: 12px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    transform: translateY(-1px);
  }

  @media (max-width: 720px) {
    padding: 8px 12px;
    .texto-btn {
      display: none;
    }
  }
`;

/* ================= KPIs DINÁMICOS CON ESTILO UNIFICADO (2 COLS EN MÓVIL) ================= */

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 16px;
  box-shadow: 0 5px 18px rgba(52, 37, 81, 0.045);

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const KpiCard = styled.div`
  min-width: 0;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  border-right: 1px solid rgba(83, 59, 143, 0.1);
  position: relative;
  transition: background 0.15s ease;

  &:last-child { border-right: none; }

  &:hover {
    background: rgba(83, 59, 143, 0.015);
  }

  @media (max-width: 960px) {
    &:nth-child(2) { border-right: none; }
    &:nth-child(-n + 2) { border-bottom: 1px solid rgba(83, 59, 143, 0.1); }
  }

  @media (max-width: 560px) {
    padding: 10px 12px;
    gap: 6px;
  }
`;

const KpiCabecera = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

const KpiIcono = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg || "rgba(83, 59, 143, 0.1)"};
  color: ${({ $color }) => $color || "var(--colorMorado)"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;

  @media (max-width: 560px) {
    width: 30px;
    height: 30px;
    font-size: 14px;
    border-radius: 8px;
  }
`;

const KpiContenido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const KpiTitulo = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #777;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const KpiValor = styled.span`
  font-size: clamp(14px, 3.2vw, 18px);
  font-weight: 800;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  overflow-wrap: anywhere;
  line-height: 1.2;
`;

const KpiSubtitulo = styled.span`
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 560px) {
    font-size: 10px;
  }
`;

const KpiGraficaWrapper = styled.div`
  width: 100%;
  height: 36px;
  margin-top: -2px;
  transition: all 0.2s ease;

  @media (max-width: 720px) {
    display: none;
  }

  ${KpiCard}:hover & {
    display: block;
  }
`;

/* ================= BARRA DE PESTAÑAS PRINCIPALES ================= */

const BarraPestanasWrapper = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 2px solid rgba(83, 59, 143, 0.08);
  padding-bottom: 0;
  gap: 8px;
  width: 100%;
`;

/* ================= BANNER DE RECORDATORIO RECURRENTE ================= */

const BannerRecordatorioIngreso = styled.div`
  background: linear-gradient(135deg, rgba(83, 59, 143, 0.08) 0%, rgba(83, 59, 143, 0.02) 100%);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const InfoRecordatorioTexto = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #1a1a2e;

  b {
    color: var(--colorMorado);
  }
`;

const BotonAccionBanner = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
  }
`;

const BotonCerrarBanner = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    color: #333;
    background: rgba(0, 0, 0, 0.05);
  }
`;

/* ================= TOGGLE COLAPSABLE DE ANALÍTICA ================= */

const ContenedorToggleAnalitica = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.02);
    border-color: rgba(83, 59, 143, 0.25);
  }
`;

const TituloToggleAnalitica = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: var(--colorMorado);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BtnToggleAnalitica = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--colorMorado);
  background: rgba(83, 59, 143, 0.08);
  padding: 4px 10px;
  border-radius: 6px;
`;

/* ================= OPCIONES DEL MODAL DE DATOS ================= */

const GridOpcionesExportar = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 14px 20px 20px;
`;

const TarjetaOpcionExportar = styled.div`
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: white;

  &:hover {
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.03);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(83, 59, 143, 0.06);
  }
`;

const OpcionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconoOpcion = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg || "rgba(83, 59, 143, 0.1)"};
  color: ${({ $color }) => $color || "var(--colorMorado)"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const TextosOpcion = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #666;
  }
`;

const GrupoTabs = styled.div`
  display: flex;
  gap: 4px;
  align-items: flex-end;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 0;
  margin-bottom: -2px;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(83, 59, 143, 0.25);
    border-radius: 3px;
  }
`;

const TabBoton = styled.button`
  padding: 10px 16px;
  border: none;
  border-bottom: 3px solid ${({ $activo, $color }) => ($activo ? ($color || "var(--colorMorado)") : "transparent")};
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.04)" : "none")};
  border-radius: 8px 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $activo, $color }) => ($activo ? ($color || "var(--colorMorado)") : "#666")};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ $color }) => $color || "var(--colorMorado)"};
    background: rgba(83, 59, 143, 0.04);
  }

  @media (max-width: 620px) {
    padding: 9px 12px;
    font-size: 12px;
  }
`;

const DotEmpresa = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $color }) => $color || "var(--colorMorado)"};
  display: inline-block;
  flex-shrink: 0;
`;

const BtnNuevaEmpresaTab = styled.button`
  background: none;
  border: 1px dashed rgba(83, 59, 143, 0.3);
  color: var(--colorMorado);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  align-self: center;
  margin: 0;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    border-color: var(--colorMorado);
  }

  @media (max-width: 620px) {
    padding: 7px 10px;
    font-size: 11px;
  }
`;

const EmpresaTab = styled.div`
  padding: 10px 14px;
  border: none;
  border-bottom: 3px solid ${({ $activo, $color }) => ($activo ? ($color || "var(--colorMorado)") : "transparent")};
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.04)" : "none")};
  border-radius: 8px 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $activo, $color }) => ($activo ? ($color || "var(--colorMorado)") : "#666")};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  user-select: none;
  flex-shrink: 0;
  position: relative;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
  outline: ${({ $over }) => ($over ? "2px dashed var(--colorMorado)" : "none")};
  outline-offset: -2px;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ $color }) => $color || "var(--colorMorado)"};
    background: rgba(83, 59, 143, 0.04);
  }

  @media (max-width: 620px) {
    padding: 9px 12px;
    font-size: 12px;
    gap: 6px;
  }
`;

const AgarraderaEmpresa = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #a29ab8;
  opacity: 0.4;
  font-size: 11px;
  cursor: grab;
  transition: opacity 0.15s ease, color 0.15s ease;

  &:hover {
    opacity: 1;
    color: var(--colorMorado);
  }

  &:active {
    cursor: grabbing;
  }
`;

const EmpresaNombre = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: inherit;
  white-space: nowrap;

  @media (max-width: 620px) {
    font-size: 12px;
  }
`;

const EmpresaBadgeCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.12)" : "rgba(0, 0, 0, 0.05)")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#777")};
  line-height: 1.3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const BotonMenuEmpresa = styled.button`
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  color: #8b849e;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: all 0.15s ease;

  &:hover, &:focus-visible {
    outline: none;
    color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.1);
  }
`;

const MenuEmpresa = styled.div`
  position: fixed;
  z-index: 12000;
  width: 220px;
  max-width: calc(100vw - 16px);
  max-height: min(320px, calc(100dvh - 16px));
  overflow-y: auto;
  padding: 5px;
  border: 1px solid #e3dcef;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(41, 30, 73, .16);
`;

const MenuEmpresaItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #3b3155;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover, &:focus-visible {
    outline: none;
    background: #f5f2fb;
    color: var(--colorMorado);
  }
`;

const EmpresasVacias = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  color: #817a96;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
`;

const registroPerteneceAlAnio = (registro, year) => {
    const fechaAnio = Number(String(registro?.fecha || "").split("-")[0]);
    const anioRegistrado = fechaAnio || Number(registro?.anio) || Number(year);
    return anioRegistrado === Number(year);
};

export const PaginaIngresosUx = () => {
    const { usuario } = useAppStore();
    const hoyAnio = new Date().getFullYear();
    const [year, setYear] = useState(hoyAnio);

    const [dataIngresos, setDataIngresos] = useState(null);
    const [prestamosPagos, setPrestamosPagos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Tab activa: "matriz" o ID de la empresa (ej: "emp_sitio_random", "emp_innci")
    const [vistaActiva, setVistaActiva] = useState("matriz");

    // Modales
    const [isModalEmpresaOpen, setIsModalEmpresaOpen] = useState(false);
    const [empresaAEditar, setEmpresaAEditar] = useState(null);
    const [isModalNuevoPagoOpen, setIsModalNuevoPagoOpen] = useState(false);
    const [registroAEditar, setRegistroAEditar] = useState(null);
    const [empresaParaPago, setEmpresaParaPago] = useState(null);
    const [isModalImportarOpen, setIsModalImportarOpen] = useState(false);
    const [isModalAccionesDatosOpen, setIsModalAccionesDatosOpen] = useState(false);
    const [mostrarAnalitica, setMostrarAnalitica] = useState(false);
    const [bannerRecordatorioCerrado, setBannerRecordatorioCerrado] = useState(false);
    const preferencias = useAppStore((state) => state.preferencias);

    const [empresaArrastradaId, setEmpresaArrastradaId] = useState(null);
    const [empresaSobreId, setEmpresaSobreId] = useState(null);
    const [menuEmpresaId, setMenuEmpresaId] = useState(null);
    const [menuEmpresaPosicion, setMenuEmpresaPosicion] = useState(null);
    const botonesMenuEmpresaRef = useRef(new Map());
    const menuEmpresaRef = useRef(null);

    const actualizarPosicionMenuEmpresa = useCallback(() => {
        const boton = botonesMenuEmpresaRef.current.get(menuEmpresaId);
        if (!boton) return;

        const rect = boton.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margen = 8;
        const gap = 7;
        const width = Math.min(220, Math.max(160, viewportWidth - margen * 2));
        const espacioAbajo = Math.max(0, viewportHeight - rect.bottom - margen);
        const espacioArriba = Math.max(0, rect.top - margen);
        const maxHeight = Math.max(120, Math.min(320, Math.max(espacioAbajo, espacioArriba) - gap));
        const left = Math.min(
            Math.max(margen, rect.right - width),
            Math.max(margen, viewportWidth - width - margen)
        );

        setMenuEmpresaPosicion({
            left,
            width,
            maxHeight,
            top: espacioAbajo >= 180 || espacioAbajo >= espacioArriba
                ? rect.bottom + gap
                : Math.max(margen, rect.top - maxHeight - gap),
            visibility: "hidden",
        });

        requestAnimationFrame(() => {
            const menu = menuEmpresaRef.current;
            if (!menu) return;
            const menuHeight = Math.min(menu.getBoundingClientRect().height, maxHeight);
            const abrirArriba = espacioAbajo < menuHeight + gap && espacioArriba > espacioAbajo;
            const top = abrirArriba
                ? Math.max(margen, rect.top - menuHeight - gap)
                : Math.min(rect.bottom + gap, Math.max(margen, viewportHeight - menuHeight - margen));
            setMenuEmpresaPosicion((actual) => ({ ...actual, top, visibility: "visible" }));
        });
    }, [menuEmpresaId]);

    useEffect(() => {
        if (!menuEmpresaId) {
            setMenuEmpresaPosicion(null);
            return undefined;
        }

        actualizarPosicionMenuEmpresa();
        const reposicionar = () => actualizarPosicionMenuEmpresa();
        const cerrarAlHacerClickFuera = (event) => {
            const boton = botonesMenuEmpresaRef.current.get(menuEmpresaId);
            if (!boton?.contains(event.target) && !menuEmpresaRef.current?.contains(event.target)) {
                setMenuEmpresaId(null);
            }
        };

        window.addEventListener("resize", reposicionar);
        window.addEventListener("scroll", reposicionar, true);
        document.addEventListener("mousedown", cerrarAlHacerClickFuera);
        return () => {
            window.removeEventListener("resize", reposicionar);
            window.removeEventListener("scroll", reposicionar, true);
            document.removeEventListener("mousedown", cerrarAlHacerClickFuera);
        };
    }, [menuEmpresaId, actualizarPosicionMenuEmpresa]);

    /* ── Cargar Datos de Ingresos del Año ── */
    const cargarIngresos = async () => {
        if (!usuario?.uid) return;
        setCargando(true);
        try {
            let [ingresosDoc, prestamosList] = await Promise.all([
                obtenerOAInicializarIngresosAnio(usuario.uid, year),
                obtenerTodosPrestamos(usuario.uid, true),
            ]);

            const email = (usuario.correo || usuario.email || "").toLowerCase();
            const esUsuarioLuis = email.includes("luisarraca") || email.includes("luisydiego") || usuario.admin === true;

            // Si es la cuenta de Luis y aún no tiene CSLP-mex o no tiene registros en el año, auto-cargar de forma segura
            const tieneCslp = (ingresosDoc?.empresas || []).some((e) => e.id === "emp_cslp_mex" || e.nombre?.toLowerCase().includes("cslp"));
            if (esUsuarioLuis && (!ingresosDoc?.registros || ingresosDoc.registros.length === 0 || !tieneCslp)) {
                await cargarHistoricosEnFirestore(usuario.uid);
                ingresosDoc = await obtenerOAInicializarIngresosAnio(usuario.uid, year);
            }

            if (esUsuarioLuis && Number(year) === 2026) {
                ingresosDoc = await aplicarAjusteInnciAgosto2026(usuario.uid, ingresosDoc);
            }

            setDataIngresos(ingresosDoc);

            // Extraer todos los pagos de préstamos
            const todosLosPagos = [];
            (prestamosList || []).forEach((p) => {
                (p.pagos || []).forEach((pago) => {
                    todosLosPagos.push({ ...pago, prestamoNombre: p.nombre });
                });
            });
            setPrestamosPagos(todosLosPagos);
        } catch (e) {
            console.error("Error al cargar ingresos:", e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarIngresos();
    }, [usuario, year]);

    const empresas = useMemo(() => [...(dataIngresos?.empresas || [])].sort((a, b) => {
        const ordenA = Number.isFinite(Number(a.orden)) ? Number(a.orden) : Number.MAX_SAFE_INTEGER;
        const ordenB = Number.isFinite(Number(b.orden)) ? Number(b.orden) : Number.MAX_SAFE_INTEGER;
        return ordenA - ordenB;
    }), [dataIngresos?.empresas]);
    const registros = dataIngresos?.registros || [];
    const registrosDelAnio = useMemo(
        () => registros.filter((registro) => registro?.empresaId && registroPerteneceAlAnio(registro, year)),
        [registros, year]
    );

    // Las empresas se heredan entre años para conservar la configuración, pero
    // solo se muestran como pestañas las que tienen al menos un registro en el
    // año consultado.
    const empresasVisibles = useMemo(
        () => empresas.filter((empresa) => registrosDelAnio.some((registro) => registro.empresaId === empresa.id)),
        [empresas, registrosDelAnio]
    );

    const resumenEmpresas = useMemo(() => registrosDelAnio.reduce((acumulado, registro) => {
        if (!acumulado[registro.empresaId]) acumulado[registro.empresaId] = { registros: 0, monto: 0 };
        acumulado[registro.empresaId].registros += 1;
        acumulado[registro.empresaId].monto += obtenerMontoRegistro(registro);
        return acumulado;
    }, {}), [registrosDelAnio]);

    // Empresa seleccionada cuando la vista no es 'matriz'
    const empresaSeleccionada = useMemo(() => {
        if (vistaActiva === "matriz") return null;
        return empresasVisibles.find((e) => e.id === vistaActiva) || empresasVisibles[0] || null;
    }, [empresasVisibles, vistaActiva]);

    useEffect(() => {
        if (vistaActiva !== "matriz" && !empresasVisibles.some((empresa) => empresa.id === vistaActiva)) {
            setVistaActiva("matriz");
            setMenuEmpresaId(null);
        }
    }, [empresasVisibles, vistaActiva]);

    /* ── Cálculo de KPIs Dinámicos según la vista (General vs Empresa) ── */
    const { kpis, datosGraficaTotal, datosGraficaPromedio, datosGraficaPendiente } = useMemo(() => {
        if (!dataIngresos) {
            return {
                kpis: { totalPercibido: 0, promedio: 0, pendienteCobro: 0, numPagos: 0, numPagados: 0, numPendientes: 0 },
                datosGraficaTotal: [],
                datosGraficaPromedio: [],
                datosGraficaPendiente: [],
            };
        }

        if (vistaActiva === "matriz" || !empresaSeleccionada) {
            // Totales GLOBALES de todo el año
            const { matriz, totalAnual } = calcularMatrizResumenMensual(
                empresasVisibles,
                dataIngresos.registros || [],
                dataIngresos.ingresosExtra || [],
                prestamosPagos,
                dataIngresos.configuracion?.incluirPrestamosEnResumen !== false,
                year
            );

            const promedio = totalAnual.totalMes / Math.max(1, totalAnual.numPagos);

            let pendienteCobro = 0;
            let numPendientes = 0;
            let numPagados = totalAnual.numPagos;

            registrosDelAnio.forEach((r) => {
                const regAnio = Number(r.fecha?.split("-")[0]);
                if (!regAnio || regAnio === Number(year)) {
                    if (r.estado === "Pendiente") {
                        pendienteCobro += obtenerMontoRegistro(r);
                        numPendientes += 1;
                    }
                }
            });

            // Datos para las gráficas mensuales
            const datosGraficaTotal = matriz.map((m) => ({ mes: m.mesCorto, monto: m.totalMes }));
            const datosGraficaPromedio = matriz.map((m) => ({
                mes: m.mesCorto,
                monto: m.numPagos ? m.totalMes / m.numPagos : 0,
            }));
            const datosGraficaPendiente = matriz.map((m) => ({
                mes: m.mesCorto,
                monto: registrosDelAnio
                    .filter((r) => r.mes === m.mesNum && r.estado === "Pendiente")
                    .reduce((sum, r) => sum + obtenerMontoRegistro(r), 0),
            }));

            const numPagosGlobal = totalAnual.numPagos + numPendientes;

            return {
                kpis: {
                    totalPercibido: totalAnual.totalMes,
                    promedio,
                    pendienteCobro,
                    numPagos: numPagosGlobal > 0 ? numPagosGlobal : totalAnual.numPagos,
                    numPagados,
                    numPendientes,
                    esEmpresa: false,
                },
                datosGraficaTotal,
                datosGraficaPromedio,
                datosGraficaPendiente,
            };
        } else {
            // Totales ESPECÍFICOS de la empresa seleccionada
            const regsEmpresa = registrosDelAnio.filter((r) => r.empresaId === empresaSeleccionada.id);

            let totalPercibido = 0;
            let pendienteCobro = 0;
            let numPagados = 0;
            let numPendientes = 0;

            const porMes = Array(12).fill(0);
            const pagosPorMes = Array(12).fill(0);
            const pendMes = Array(12).fill(0);

            regsEmpresa.forEach((r) => {
                const monto = obtenerMontoRegistro(r);
                const mesIdx = (r.mes || 1) - 1;

                if (esCobroConfirmado(r, empresaSeleccionada)) {
                    totalPercibido += monto;
                    numPagados += 1;
                    porMes[mesIdx] += monto;
                    pagosPorMes[mesIdx] += 1;
                } else if (r.estado === "Pendiente") {
                    pendienteCobro += monto;
                    numPendientes += 1;
                    pendMes[mesIdx] += monto;
                }
            });

            const promedio = totalPercibido / Math.max(1, numPagados);

            const datosGraficaTotal = MESES_ANIO.map((m, i) => ({ mes: m.corto, monto: porMes[i] }));
            const datosGraficaPromedio = MESES_ANIO.map((m, i) => ({
                mes: m.corto,
                monto: pagosPorMes[i] ? porMes[i] / pagosPorMes[i] : 0,
            }));
            const datosGraficaPendiente = MESES_ANIO.map((m, i) => ({ mes: m.corto, monto: pendMes[i] }));

            const numPagosTotal = numPagados + numPendientes;

            return {
                kpis: {
                    totalPercibido,
                    promedio,
                    pendienteCobro,
                    numPagos: numPagosTotal > 0 ? numPagosTotal : numPagados,
                    numPagados,
                    numPendientes,
                    esEmpresa: true,
                    nombreEmpresa: empresaSeleccionada.nombre,
                },
                datosGraficaTotal,
                datosGraficaPromedio,
                datosGraficaPendiente,
            };
        }
    }, [dataIngresos, empresasVisibles, registrosDelAnio, prestamosPagos, year, vistaActiva, empresaSeleccionada]);
    const handleCrearEmpresa = () => {
        setEmpresaAEditar(null);
        setIsModalEmpresaOpen(true);
    };

    const handleEditarEmpresa = (emp) => {
        setEmpresaAEditar(emp);
        setIsModalEmpresaOpen(true);
    };

    const handleNuevoPago = (empresa = null) => {
        setRegistroAEditar(null);
        setEmpresaParaPago(empresa || empresaSeleccionada || empresas[0]);
        setIsModalNuevoPagoOpen(true);
    };

    const handleEditarRegistro = (reg) => {
        setRegistroAEditar(reg);
        const emp = empresas.find((e) => e.id === reg.empresaId);
        setEmpresaParaPago(emp);
        setIsModalNuevoPagoOpen(true);
    };

    const handleMoverEmpresa = async (empresaId, empresaDestinoId) => {
        if (!dataIngresos || empresaId === empresaDestinoId) return;
        const origen = empresas.findIndex((empresa) => empresa.id === empresaId);
        const destino = empresas.findIndex((empresa) => empresa.id === empresaDestinoId);
        if (origen < 0 || destino < 0) return;

        try {
            let dataActualizada = dataIngresos;
            const direccion = destino > origen ? 1 : -1;
            for (let paso = origen; paso !== destino; paso += direccion) {
                dataActualizada = await reordenarEmpresa(usuario?.uid, year, dataActualizada, empresaId, direccion);
            }
            setDataIngresos(dataActualizada);
        } catch (error) {
            console.error("Error al guardar el nuevo orden de empresas:", error);
        } finally {
            setEmpresaArrastradaId(null);
            setEmpresaSobreId(null);
        }
    };

    const handleGenerarPeriodos = async (empresa) => {
        setMenuEmpresaId(null);
        const nuevos = generarPeriodosRecurrentesEmpresa(empresa, year, registros);
        if (nuevos.length === 0) {
            Swal.fire("Todo al día", `No hay periodos nuevos para ${empresa.nombre} en ${year}.`, "info");
            return;
        }

        const confirmacion = await Swal.fire({
            title: "Proyectar periodos",
            text: `Se agregarán ${nuevos.length} periodos pendientes para ${empresa.nombre}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, proyectar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#533b8f",
        });
        if (!confirmacion.isConfirmed) return;

        try {
            const dataActualizada = await guardarRegistrosMasivos(usuario?.uid, year, dataIngresos, nuevos);
            setDataIngresos(dataActualizada);
            Swal.fire("Listo", `Se proyectaron ${nuevos.length} periodos pendientes.`, "success");
        } catch (error) {
            console.error("Error al proyectar periodos:", error);
            Swal.fire("Error", "No se pudieron proyectar los periodos.", "error");
        }
    };

    const empresaConRecordatorio = useMemo(() => {
        if (preferencias?.preguntarIngresosRecurrentes === false) return null;
        if (bannerRecordatorioCerrado) return null;

        const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const diaHoy = diasSemana[new Date().getDay()];

        return empresasVisibles.find((emp) => {
            if (emp.activo === false) return false;
            const esPorHoras = emp.tipoEsquema === "por_horas";
            const tieneRecordatorioActivo = emp.recordatorioRecurrenteActivo !== undefined
                ? emp.recordatorioRecurrenteActivo
                : esPorHoras;

            if (!tieneRecordatorioActivo) return false;

            const diaPactado = emp.diaRecordatorio || "sabado";
            return diaPactado === diaHoy || diaPactado === "quincenal";
        });
    }, [empresasVisibles, preferencias?.preguntarIngresosRecurrentes, bannerRecordatorioCerrado]);

    const handleExportarMatrizCSV = () => {
        exportarMatrizACSV(dataIngresos, year, prestamosPagos);
        setIsModalAccionesDatosOpen(false);
    };

    const handleExportarEmpresaCSV = (empresaAExportar) => {
        const emp = empresaAExportar || empresaSeleccionada || empresasVisibles[0];
        if (!emp) {
            Swal.fire("Sin datos", "No hay empresas para exportar.", "info");
            return;
        }
        const regs = registrosDelAnio.filter((r) => r.empresaId === emp.id);
        exportarRegistrosEmpresaACSV(emp.nombre || "Empresa", regs, year, emp);
        setIsModalAccionesDatosOpen(false);
    };

    return (
        <PaginaContenedor>
            {/* ── HEADER PRINCIPAL ── */}
            <HeaderPrincipal>
                <TituloFilaHeader>
                    <TituloGrupo>
                        <H2 size="26px" color="var(--colorMorado)">
                            Módulo de Ingresos y Percepciones
                        </H2>
                        <TxtGenerico size="13px" color="#666">
                            Gestión salarial, reportes semanales, quincenas y proyecciones anuales.
                        </TxtGenerico>
                    </TituloGrupo>

                    {/* Botón + exclusivo de responsive a la derecha del título */}
                    <BtnNuevoMobile
                        type="button"
                        onClick={() => handleNuevoPago(empresaSeleccionada)}
                        title="Nuevo ingreso"
                    >
                        <FaPlus />
                    </BtnNuevoMobile>
                </TituloFilaHeader>

                <ControlesHeader>
                    <SelectorAnioWrapper>
                        <BtnAnio type="button" onClick={() => setYear((y) => y - 1)} title="Año anterior">
                            <FaChevronLeft />
                        </BtnAnio>
                        <AnioTexto>{year}</AnioTexto>
                        <BtnAnio type="button" onClick={() => setYear((y) => y + 1)} title="Año siguiente">
                            <FaChevronRight />
                        </BtnAnio>
                    </SelectorAnioWrapper>

                    <BotonesHeader>
                        <BtnPrincipal className="btn-desktop-nuevo" onClick={() => handleNuevoPago(empresaSeleccionada)}>
                            <FaPlus /> Nuevo ingreso
                        </BtnPrincipal>
                        <BtnAccionDatos
                            type="button"
                            onClick={() => setIsModalAccionesDatosOpen(true)}
                            title="Herramientas de datos (Importar / Exportar)"
                        >
                            <FaFileExport />
                            <span className="texto-btn">Datos / Exportar</span>
                        </BtnAccionDatos>
                    </BotonesHeader>
                </ControlesHeader>
            </HeaderPrincipal>

            {/* ── BANNER DE RECORDATORIO RECURRENTE ── */}
            {empresaConRecordatorio && (
                <BannerRecordatorioIngreso>
                    <InfoRecordatorioTexto>
                        <FaLightbulb style={{ color: "#f39c12", fontSize: 18, flexShrink: 0 }} />
                        <span>
                            <b>Recordatorio de horas:</b> Hoy es día programado para registrar percepciones en <b>{empresaConRecordatorio.nombre}</b>. ¿Deseas capturar tus horas?
                        </span>
                    </InfoRecordatorioTexto>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <BotonAccionBanner onClick={() => handleNuevoPago(empresaConRecordatorio)}>
                            <FaPlus /> Registrar ahora
                        </BotonAccionBanner>
                        <BotonCerrarBanner
                            type="button"
                            onClick={() => setBannerRecordatorioCerrado(true)}
                            title="Cerrar recordatorio por hoy"
                        >
                            <FaTimes />
                        </BotonCerrarBanner>
                    </div>
                </BannerRecordatorioIngreso>
            )}

            {/* ── 4 KPI CARDS DINÁMICAS (2 COLUMNAS EN RESPONSIVE) ── */}
            <KpiGrid>
                {/* CARD 1: TOTAL PERCIBIDO */}
                <KpiCard>
                    <KpiCabecera>
                        <KpiIcono $bg="rgba(40, 167, 69, 0.12)" $color="#28a745">
                            <FaMoneyBillWave />
                        </KpiIcono>
                        <KpiContenido>
                            <KpiTitulo>
                                {kpis.esEmpresa ? `Total ${kpis.nombreEmpresa}` : `Total Ingresos ${year}`}
                            </KpiTitulo>
                            <KpiValor>{fnFormatMoney(kpis.totalPercibido)}</KpiValor>
                            <KpiSubtitulo>
                                {kpis.numPagados} percepciones cobradas
                            </KpiSubtitulo>
                        </KpiContenido>
                    </KpiCabecera>
                    <KpiGraficaWrapper>
                        <ResponsiveContainer width="100%" height={38}>
                            <BarChart data={datosGraficaTotal} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                <Tooltip
                                    formatter={(value) => [fnFormatMoney(value), "Monto"]}
                                    labelFormatter={(label) => `Mes: ${label}`}
                                    contentStyle={{ fontSize: "11px", borderRadius: "8px", padding: "4px 8px" }}
                                />
                                <Bar
                                    dataKey="monto"
                                    fill={kpis.esEmpresa && empresaSeleccionada?.color ? empresaSeleccionada.color : "#28a745"}
                                    radius={[2, 2, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </KpiGraficaWrapper>
                </KpiCard>

                {/* CARD 2: PROMEDIO */}
                <KpiCard>
                    <KpiCabecera>
                        <KpiIcono $bg="rgba(0, 136, 254, 0.12)" $color="#0088FE">
                            <FaChartLine />
                        </KpiIcono>
                        <KpiContenido>
                            <KpiTitulo>
                                {kpis.esEmpresa ? `Promedio por pago · ${kpis.nombreEmpresa}` : "Promedio por pago"}
                            </KpiTitulo>
                            <KpiValor>{fnFormatMoney(kpis.promedio)}</KpiValor>
                            <KpiSubtitulo>
                                Tendencia de percepción
                            </KpiSubtitulo>
                        </KpiContenido>
                    </KpiCabecera>
                    <KpiGraficaWrapper>
                        <ResponsiveContainer width="100%" height={38}>
                            <AreaChart data={datosGraficaPromedio} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                <Tooltip
                                    formatter={(value) => [fnFormatMoney(value), "Monto"]}
                                    labelFormatter={(label) => `Mes: ${label}`}
                                    contentStyle={{ fontSize: "11px", borderRadius: "8px", padding: "4px 8px" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="monto"
                                    stroke="#0088FE"
                                    fill="rgba(0, 136, 254, 0.15)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </KpiGraficaWrapper>
                </KpiCard>

                {/* CARD 3: PENDIENTE POR COBRAR */}
                <KpiCard>
                    <KpiCabecera>
                        <KpiIcono $bg="rgba(243, 156, 18, 0.12)" $color="#f39c12">
                            <FaClock />
                        </KpiIcono>
                        <KpiContenido>
                            <KpiTitulo>Pendiente por Cobrar</KpiTitulo>
                            <KpiValor style={{ color: kpis.pendienteCobro > 0 ? "#d35400" : "#1a1a2e" }}>
                                {fnFormatMoney(kpis.pendienteCobro)}
                            </KpiValor>
                            <KpiSubtitulo>
                                {kpis.numPendientes > 0 ? `${kpis.numPendientes} periodos pendientes` : "Al día"}
                            </KpiSubtitulo>
                        </KpiContenido>
                    </KpiCabecera>
                    <KpiGraficaWrapper>
                        <ResponsiveContainer width="100%" height={38}>
                            <BarChart data={datosGraficaPendiente} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                <Tooltip
                                    formatter={(value) => [fnFormatMoney(value), "Pendiente"]}
                                    labelFormatter={(label) => `Mes: ${label}`}
                                    contentStyle={{ fontSize: "11px", borderRadius: "8px", padding: "4px 8px" }}
                                />
                                <Bar dataKey="monto" fill="#f39c12" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </KpiGraficaWrapper>
                </KpiCard>

                {/* CARD 4: TOTAL DE PAGOS */}
                <KpiCard>
                    <KpiCabecera>
                        <KpiIcono $bg="rgba(83, 59, 143, 0.12)" $color="var(--colorMorado)">
                            <FaCheckCircle />
                        </KpiIcono>
                        <KpiContenido>
                            <KpiTitulo>
                                {kpis.esEmpresa ? `Pagos ${kpis.nombreEmpresa}` : "Total de Pagos"}
                            </KpiTitulo>
                            <KpiValor>{kpis.numPagos} pagos</KpiValor>
                            <KpiSubtitulo>
                                <span style={{ color: "#28a745", fontWeight: 700 }}>{kpis.numPagados} pagados</span>
                                {kpis.numPendientes > 0 && (
                                    <span style={{ color: "#d35400", fontWeight: 700, marginLeft: 6 }}>
                                        • {kpis.numPendientes} pendientes
                                    </span>
                                )}
                            </KpiSubtitulo>
                        </KpiContenido>
                    </KpiCabecera>
                    <KpiGraficaWrapper>
                        <div style={{ display: "flex", height: "100%", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 10, background: "#f0f0f0", borderRadius: 5, overflow: "hidden", display: "flex" }}>
                                <div
                                    style={{
                                        width: `${kpis.numPagos > 0 ? (kpis.numPagados / kpis.numPagos) * 100 : 100}%`,
                                        background: "var(--colorMorado)",
                                    }}
                                />
                                <div
                                    style={{
                                        width: `${kpis.numPagos > 0 ? (kpis.numPendientes / kpis.numPagos) * 100 : 0}%`,
                                        background: "#f39c12",
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--colorMorado)" }}>
                                {kpis.numPagos > 0 ? Math.round((kpis.numPagados / kpis.numPagos) * 100) : 100}%
                            </span>
                        </div>
                    </KpiGraficaWrapper>
                </KpiCard>
            </KpiGrid>

            {/* ── BARRA UNIFICADA DE EMPRESAS Y MATRIZ ── */}
            <BarraPestanasWrapper>
                <GrupoTabs>
                    <TabBoton
                        $activo={vistaActiva === "matriz"}
                        onClick={() => setVistaActiva("matriz")}
                    >
                        <FaTable /> Matriz Resumen Mensual
                    </TabBoton>

                    {empresasVisibles.length === 0 ? (
                        <EmpresasVacias>
                            <FaBuilding aria-hidden="true" />
                            No hay percepciones registradas en {year}
                        </EmpresasVacias>
                    ) : empresasVisibles.map((emp) => (
                        <EmpresaTab
                            key={emp.id}
                            $activo={vistaActiva === emp.id}
                            $color={emp.color}
                            draggable
                            $dragging={empresaArrastradaId === emp.id}
                            $over={empresaSobreId === emp.id}
                            onClick={() => {
                                setVistaActiva(emp.id);
                                setMenuEmpresaId(null);
                            }}
                            onDragStart={(event) => {
                                setEmpresaArrastradaId(emp.id);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", emp.id);
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setEmpresaSobreId(emp.id);
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const empresaOrigenId = event.dataTransfer.getData("text/plain") || empresaArrastradaId;
                                handleMoverEmpresa(empresaOrigenId, emp.id);
                            }}
                            onDragEnd={() => {
                                setEmpresaArrastradaId(null);
                                setEmpresaSobreId(null);
                            }}
                            title={`${emp.nombre} • ${resumenEmpresas[emp.id]?.registros || 0} registros · ${fnFormatMoney(resumenEmpresas[emp.id]?.monto || 0)}`}
                        >
                            <AgarraderaEmpresa title="Arrastra para cambiar el orden" onClick={(e) => e.stopPropagation()}>
                                <FaGripVertical aria-hidden="true" />
                            </AgarraderaEmpresa>
                            <DotEmpresa $color={emp.color} />
                            <EmpresaNombre>{emp.nombre}</EmpresaNombre>
                            <EmpresaBadgeCount $activo={vistaActiva === emp.id}>
                                {resumenEmpresas[emp.id]?.registros || 0}
                            </EmpresaBadgeCount>
                            <BotonMenuEmpresa
                                type="button"
                                ref={(node) => {
                                    if (node) botonesMenuEmpresaRef.current.set(emp.id, node);
                                    else botonesMenuEmpresaRef.current.delete(emp.id);
                                }}
                                $activo={menuEmpresaId === emp.id}
                                aria-label={`Acciones de ${emp.nombre}`}
                                aria-expanded={menuEmpresaId === emp.id}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setMenuEmpresaId((actual) => actual === emp.id ? null : emp.id);
                                }}
                            >
                                <FaEllipsisV aria-hidden="true" />
                            </BotonMenuEmpresa>
                            {menuEmpresaId === emp.id && typeof document !== "undefined" && document.body && createPortal(
                                <MenuEmpresa
                                    ref={menuEmpresaRef}
                                    style={menuEmpresaPosicion || { visibility: "hidden" }}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <MenuEmpresaItem type="button" onClick={() => {
                                        setMenuEmpresaId(null);
                                        handleEditarEmpresa(emp);
                                    }}>
                                        <FaEdit /> Configurar empresa
                                    </MenuEmpresaItem>
                                    <MenuEmpresaItem type="button" onClick={() => handleGenerarPeriodos(emp)}>
                                        <FaBolt /> Proyectar periodos
                                    </MenuEmpresaItem>
                                    <MenuEmpresaItem type="button" onClick={() => {
                                        setMenuEmpresaId(null);
                                        handleNuevoPago(emp);
                                    }}>
                                        <FaPlus /> Registrar pago
                                    </MenuEmpresaItem>
                                    <MenuEmpresaItem type="button" onClick={() => {
                                        setMenuEmpresaId(null);
                                        setVistaActiva(emp.id);
                                        setIsModalImportarOpen(true);
                                    }}>
                                        <FaFileImport /> Importar historial
                                    </MenuEmpresaItem>
                                </MenuEmpresa>,
                                document.body
                            )}
                        </EmpresaTab>
                    ))}

                    <BtnNuevaEmpresaTab type="button" onClick={handleCrearEmpresa}>
                        <FaPlus /> Nueva Empresa
                    </BtnNuevaEmpresaTab>
                </GrupoTabs>
            </BarraPestanasWrapper>

            {/* ── VISTA ACTIVA ── */}
            {cargando ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
                    Cargando ingresos de {year}...
                </div>
            ) : vistaActiva === "matriz" ? (
                <TablaResumenMensual
                    dataIngresos={dataIngresos}
                    empresasVisibles={empresasVisibles}
                    prestamosPagos={prestamosPagos}
                    uid={usuario?.uid}
                    year={year}
                    onActualizado={(data) => setDataIngresos(data)}
                />
            ) : (
                <TablaEmpresaPagos
                    dataIngresos={dataIngresos}
                    empresasVisibles={empresasVisibles}
                    empresaSeleccionadaId={vistaActiva}
                    uid={usuario?.uid}
                    year={year}
                    onActualizado={(data) => setDataIngresos(data)}
                    onEditarEmpresa={handleEditarEmpresa}
                    onAbrirNuevoPago={(emp) => handleNuevoPago(emp)}
                    onAbrirImportador={() => setIsModalImportarOpen(true)}
                    onEditarRegistro={handleEditarRegistro}
                />
            )}

            {/* ── SECCIÓN DE ANALÍTICA HISTÓRICA COLAPSABLE ── */}
            <ContenedorToggleAnalitica onClick={() => setMostrarAnalitica(!mostrarAnalitica)}>
                <TituloToggleAnalitica>
                    <FaChartLine /> Analítica y Tendencias de {year}
                </TituloToggleAnalitica>
                <BtnToggleAnalitica>
                    {mostrarAnalitica ? "Ocultar Gráficas ▲" : "Ver Análisis Completo ▼"}
                </BtnToggleAnalitica>
            </ContenedorToggleAnalitica>

            {mostrarAnalitica && (
                <IngresosAnalitica
                    registros={registrosDelAnio}
                    empresas={empresasVisibles}
                    empresaSeleccionada={empresaSeleccionada}
                    year={year}
                />
            )}

            {/* ── MODALES ── */}
            <ModalGenerico
                isOpen={isModalAccionesDatosOpen}
                onClose={() => setIsModalAccionesDatosOpen(false)}
                maxAncho="480px"
                encabezado={
                    <ModalEncabezado
                        icon={<FaDatabase />}
                        title="Herramientas de Datos"
                        description={`Importa o descarga tus registros salariales de ${year}.`}
                    />
                }
            >
                <GridOpcionesExportar>
                    <TarjetaOpcionExportar
                        onClick={() => {
                            setIsModalAccionesDatosOpen(false);
                            setIsModalImportarOpen(true);
                        }}
                    >
                        <OpcionInfo>
                            <IconoOpcion $bg="rgba(83, 59, 143, 0.1)" $color="var(--colorMorado)">
                                <FaFileImport />
                            </IconoOpcion>
                            <TextosOpcion>
                                <h4>Importar desde Excel</h4>
                                <p>Copia y pega celdas o sube archivo con desglose de pagos.</p>
                            </TextosOpcion>
                        </OpcionInfo>
                        <span style={{ fontSize: 13, color: "var(--colorMorado)", fontWeight: 700 }}>Abrir &rarr;</span>
                    </TarjetaOpcionExportar>

                    <TarjetaOpcionExportar onClick={handleExportarMatrizCSV}>
                        <OpcionInfo>
                            <IconoOpcion $bg="rgba(40, 167, 69, 0.12)" $color="#28a745">
                                <FaTable />
                            </IconoOpcion>
                            <TextosOpcion>
                                <h4>Exportar Matriz Resumen (CSV)</h4>
                                <p>Descarga la tabla mensual consolidada con todas las empresas.</p>
                            </TextosOpcion>
                        </OpcionInfo>
                        <span style={{ fontSize: 13, color: "#28a745", fontWeight: 700 }}>Descargar &rarr;</span>
                    </TarjetaOpcionExportar>

                    {empresasVisibles.length > 0 && (
                        <TarjetaOpcionExportar onClick={() => handleExportarEmpresaCSV(empresaSeleccionada)}>
                            <OpcionInfo>
                                <IconoOpcion $bg="rgba(0, 136, 254, 0.12)" $color="#0088fe">
                                    <FaFileExport />
                                </IconoOpcion>
                                <TextosOpcion>
                                    <h4>Exportar Pagos {empresaSeleccionada ? `de ${empresaSeleccionada.nombre}` : "de Empresa"} (CSV)</h4>
                                    <p>Descarga el historial detallado de fechas, horas y montos.</p>
                                </TextosOpcion>
                            </OpcionInfo>
                            <span style={{ fontSize: 13, color: "#0088fe", fontWeight: 700 }}>Descargar &rarr;</span>
                        </TarjetaOpcionExportar>
                    )}
                </GridOpcionesExportar>
            </ModalGenerico>

            <ModalEmpresa
                isOpen={isModalEmpresaOpen}
                onClose={() => setIsModalEmpresaOpen(false)}
                empresa={empresaAEditar}
                uid={usuario?.uid}
                year={year}
                dataIngresos={dataIngresos}
                onGuardado={(data) => setDataIngresos(data)}
            />

            <ModalNuevoIngreso
                isOpen={isModalNuevoPagoOpen}
                onClose={() => setIsModalNuevoPagoOpen(false)}
                registro={registroAEditar}
                empresaPreseleccionada={empresaParaPago}
                empresas={empresas}
                uid={usuario?.uid}
                year={year}
                dataIngresos={dataIngresos}
                onGuardado={(data) => setDataIngresos(data)}
            />

            <ModalImportarIngresos
                isOpen={isModalImportarOpen}
                onClose={() => setIsModalImportarOpen(false)}
                empresas={empresas}
                uid={usuario?.uid}
                year={year}
                dataIngresos={dataIngresos}
                onImportado={(data) => setDataIngresos(data)}
            />
        </PaginaContenedor>
    );
};
