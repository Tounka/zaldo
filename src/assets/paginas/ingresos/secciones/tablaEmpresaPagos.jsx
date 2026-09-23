import styled from "styled-components";
import { useState, useMemo, useEffect } from "react";
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaFileCsv,
    FaBuilding,
    FaCheckCircle,
    FaCheckDouble,
    FaClock,
    FaFileImport,
    FaFileExport,
    FaInfoCircle,
    FaBolt,
    FaSortAmountDown,
    FaSortAmountUp,
    FaHandHoldingUsd,
    FaCalendarAlt,
    FaTable,
    FaChevronLeft,
    FaChevronRight,
    FaDatabase,
} from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/modalGenerico";
import {
    fnFormatMoney,
    exportarRegistrosEmpresaACSV,
    generarPeriodosRecurrentesEmpresa,
    CLASIFICACIONES_COBRO,
    esCobroConfirmado,
    obtenerClasificacionCobro,
    obtenerMontoRegistro,
    MESES_ANIO,
} from "../../../funciones/ingresosCalculos";
import {
    guardarRegistroPago,
    eliminarRegistroPago,
    guardarRegistrosMasivos,
    liquidarAdeudoIngreso,
} from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";
import { useAppStore } from "../../../stores/useAppStore";

const ContenedorDetalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EncabezadoEmpresa = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;

  @media (max-width: 700px) {
    align-items: stretch;
    padding: 14px;
  }
`;

const InfoEmpresa = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const TituloFila = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const DotColor = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color || "var(--colorMorado)"};
  display: inline-block;
`;

const TituloEmpresa = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: #1a1a2e;
`;

const EsquemaBadge = styled.div`
  font-size: 12px;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(83, 59, 143, 0.04);
  border-radius: 8px;
  padding: 4px 10px;
  width: fit-content;
`;

const BotonesAccionEmpresa = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 700px) {
    width: 100%;

    button {
      flex: 1 1 130px;
      justify-content: center;
    }
  }
`;

const BtnAccion = styled.button`
  background: ${({ $primario, $destacado }) => ($destacado ? "rgba(243, 156, 18, 0.12)" : ($primario ? "var(--colorMorado)" : "white"))};
  color: ${({ $primario, $destacado }) => ($destacado ? "#d35400" : ($primario ? "white" : "var(--colorMorado)"))};
  border: 1px solid ${({ $primario, $destacado }) => ($destacado ? "rgba(243, 156, 18, 0.35)" : ($primario ? "transparent" : "rgba(83, 59, 143, 0.2)"))};
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    background: ${({ $primario, $destacado }) => ($destacado ? "rgba(243, 156, 18, 0.18)" : ($primario ? "var(--colorMoradoSecundario)" : "rgba(83, 59, 143, 0.06)"))};
  }

  &:disabled {
    opacity: .4;
    cursor: not-allowed;
    transform: none;
  }
`;

const BtnAccionDesktop = styled(BtnAccion)`
  @media (max-width: 700px) {
    display: none;
  }
`;

const BtnAccionMovil = styled(BtnAccion)`
  display: none;

  @media (max-width: 700px) {
    display: flex;
  }
`;

/* ================= OPCIONES DEL MODAL DE DATOS ================= */

const GridOpcionesExportar = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 18px 20px 20px;
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
    font-weight: 700;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #666;
  }
`;

const GrupoSelectorVista = styled.div`
  display: inline-flex;
  background: #f1f2f6;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  border: 1px solid rgba(83, 59, 143, 0.12);
`;

const BtnSelectorVista = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${({ $activo }) => ($activo ? "white" : "transparent")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#666")};
  box-shadow: ${({ $activo }) => ($activo ? "0 2px 6px rgba(0, 0, 0, 0.08)" : "none")};

  &:hover {
    color: var(--colorMorado);
  }
`;

const CalendarioWrapper = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(83, 59, 143, 0.04);
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const CalendarioBarraControl = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const NavegadorMes = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: var(--colorMorado);
    min-width: 140px;
    text-align: center;
  }
`;

const BtnMesNav = styled.button`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--colorMorado);
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--colorMorado);
    color: white;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const ResumenMesCalendario = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #555;
  display: flex;
  align-items: center;
  gap: 14px;

  span b {
    color: var(--colorMorado);
  }
`;

const CalendarioGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  min-width: 540px;

  @media (max-width: 640px) {
    gap: 4px;
  }
`;

const CabeceraDiaSemana = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--colorMorado);
  padding: 8px 4px;
  background: rgba(83, 59, 143, 0.05);
  border-radius: 8px;
`;

const CeldaDia = styled.div`
  min-height: 85px;
  background: ${({ $esMesActual, $esHoy }) => ($esHoy ? "rgba(83, 59, 143, 0.05)" : $esMesActual ? "#fdfdfd" : "#f8f9fa")};
  border: 1px solid ${({ $esHoy }) => ($esHoy ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.1)")};
  border-radius: 10px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  transition: all 0.15s ease;
  cursor: pointer;

  &:hover {
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.03);
  }

  @media (max-width: 640px) {
    min-height: 68px;
    padding: 4px;
  }
`;

const CabeceraDia = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NumeroDia = styled.span`
  font-size: 12px;
  font-weight: 800;
  color: ${({ $esMesActual, $esHoy }) => ($esHoy ? "white" : $esMesActual ? "#333" : "#aaa")};
  background: ${({ $esHoy }) => ($esHoy ? "var(--colorMorado)" : "transparent")};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ContenedorPagosDia = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 90px;
`;

const TarjetaPagoDia = styled.div`
  background: ${({ $pagado, $liquidado }) => ($liquidado ? "rgba(111, 66, 193, 0.12)" : $pagado ? "rgba(40, 167, 69, 0.12)" : "rgba(255, 193, 7, 0.18)")};
  border-left: 3px solid ${({ $pagado, $liquidado }) => ($liquidado ? "#6f42c1" : $pagado ? "#28a745" : "#e0a800")};
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 11px;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:hover {
    transform: scale(1.02);
  }

  @media (max-width: 640px) {
    padding: 2px 4px;
    font-size: 10px;
  }
`;

const MontoPagoDia = styled.div`
  font-weight: 800;
  color: #1a1a2e;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoExtraDia = styled.div`
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TablaWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  background: white;
  box-shadow: 0 2px 10px rgba(83, 59, 143, 0.04);
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
`;

const Thead = styled.thead`
  background: rgba(83, 59, 143, 0.06);
`;

const Th = styled.th`
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--colorMorado);
  text-align: ${({ $align }) => $align || "left"};
  border-bottom: 2px solid rgba(83, 59, 143, 0.12);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 12px;
  font-size: 13px;
  color: #1a1a2e;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  text-align: ${({ $align }) => $align || "left"};
  font-family: ${({ $mono }) => ($mono ? "'SF Mono', 'Fira Code', monospace" : "inherit")};
  white-space: nowrap;
`;

const Tr = styled.tr`
  &:hover {
    background: rgba(83, 59, 143, 0.02);
  }
`;

const TrTotal = styled.tr`
  background: rgba(83, 59, 143, 0.08);
  font-weight: 800;
  border-top: 2px solid rgba(83, 59, 143, 0.2);
`;

const BadgeEstado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  background: ${({ $estado }) => ($estado === "Pagado" ? "rgba(40, 167, 69, 0.12)" : $estado === "Liquidado" ? "rgba(111, 66, 193, 0.12)" : "rgba(255, 193, 7, 0.18)")};
  color: ${({ $estado }) => ($estado === "Pagado" ? "#1e7e34" : $estado === "Liquidado" ? "#6f42c1" : "#856404")};
  border: 1px solid ${({ $estado }) => ($estado === "Pagado" ? "rgba(40, 167, 69, 0.3)" : $estado === "Liquidado" ? "rgba(111, 66, 193, 0.3)" : "rgba(255, 193, 7, 0.4)")};
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.04);
  }
`;

const InputRapido = styled.input`
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  width: 110px;
  text-align: right;
  background: transparent;

  &:hover {
    border-color: rgba(83, 59, 143, 0.2);
    background: white;
  }

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: white;
  }
`;

const InputFechaRapido = styled.input`
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 12px;
  color: #1a1a2e;
  background: transparent;
  cursor: pointer;

  &:hover {
    border-color: rgba(83, 59, 143, 0.2);
    background: white;
  }

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: white;
  }
`;

const BotonIcono = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
    background: rgba(83, 59, 143, 0.06);
  }
`;

const EstadoVacio = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #888;
  font-size: 13px;
`;

export const TablaEmpresaPagos = ({
    dataIngresos,
    empresasVisibles,
    empresaSeleccionadaId,
    uid,
    year,
    onActualizado,
    onEditarEmpresa,
    onAbrirNuevoPago,
    onAbrirImportador,
    onEditarRegistro,
}) => {
    const empresas = useMemo(() => [...(empresasVisibles || dataIngresos?.empresas || [])]
        .map((empresa, orden) => ({ ...empresa, orden: empresa.orden ?? orden }))
        .sort((a, b) => Number(a.orden) - Number(b.orden)), [dataIngresos?.empresas, empresasVisibles]);
    const registros = dataIngresos?.registros || [];

    const [empresaIdLocal, setEmpresaIdLocal] = useState(
        empresaSeleccionadaId || empresas[0]?.id || ""
    );
    const [ordenDesc, setOrdenDesc] = useState(true); // true = Más reciente primero
    const [montosEditados, setMontosEditados] = useState({});
    const [modalDatosEmpresaOpen, setModalDatosEmpresaOpen] = useState(false);

    const preferencias = useAppStore((state) => state.preferencias);
    const [modoVista, setModoVista] = useState(() => preferencias?.vistaPreferidaIngresos || "tabla");
    const [mesCalendario, setMesCalendario] = useState(() => new Date().getMonth());

    useEffect(() => {
        if (preferencias?.vistaPreferidaIngresos) {
            setModoVista(preferencias.vistaPreferidaIngresos);
        }
    }, [preferencias?.vistaPreferidaIngresos]);

    useEffect(() => {
        if (empresaSeleccionadaId) {
            setEmpresaIdLocal(empresaSeleccionadaId);
        }
    }, [empresaSeleccionadaId]);

    const empresaActual = empresas.find((e) => e.id === empresaIdLocal) || empresas[0] || {};


    // Registros ordenados por fecha (Más recientes arriba por defecto)
    const registrosEmpresa = useMemo(() => {
        const filtrados = registros.filter((r) => r.empresaId === empresaActual.id);
        return [...filtrados].sort((a, b) => {
            const comp = (b.fecha || "").localeCompare(a.fecha || "");
            return ordenDesc ? comp : -comp;
        });
    }, [registros, empresaActual.id, ordenDesc]);

    // Totales de la empresa
    const totales = useMemo(() => {
        let totalTeorico = 0;
        let totalReal = 0;
        let totalPendiente = 0;

        registrosEmpresa.forEach((r) => {
            const teorico = Number(r.montoTeorico || 0) + Number(r.montoExtra || 0);
            totalTeorico += teorico;
            if (esCobroConfirmado(r, empresaActual)) {
                totalReal += obtenerMontoRegistro(r);
            } else if (r.estado === "Pendiente") {
                totalPendiente += obtenerMontoRegistro(r);
            }
        });

        return { totalTeorico, totalReal, totalPendiente };
    }, [registrosEmpresa]);

    // Días y pagos mapeados para la vista de calendario
    const { diasMes, pagosPorDia, totalMesCalendario } = useMemo(() => {
        const primerDiaSemana = new Date(year, mesCalendario, 1).getDay(); // 0 = Domingo
        const totalDias = new Date(year, mesCalendario + 1, 0).getDate();

        const dias = [];
        for (let i = 0; i < primerDiaSemana; i++) {
            dias.push({ tipo: "vacio", key: `vacio-${i}` });
        }
        for (let d = 1; d <= totalDias; d++) {
            const fechaStr = `${year}-${String(mesCalendario + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            dias.push({ tipo: "dia", dia: d, fecha: fechaStr, key: fechaStr });
        }

        const mapa = {};
        let sumConfirmado = 0;
        let sumPendiente = 0;
        registrosEmpresa.forEach((reg) => {
            if (!reg.fecha) return;
            const partes = reg.fecha.split("-");
            if (partes.length < 2) return;
            const rY = Number(partes[0]);
            const rM = Number(partes[1]);
            if (rY === Number(year) && rM === mesCalendario + 1) {
                if (!mapa[reg.fecha]) mapa[reg.fecha] = [];
                mapa[reg.fecha].push(reg);
                if (esCobroConfirmado(reg, empresaActual)) {
                    sumConfirmado += obtenerMontoRegistro(reg);
                } else if (reg.estado === "Pendiente") {
                    sumPendiente += obtenerMontoRegistro(reg);
                }
            }
        });

        return { diasMes: dias, pagosPorDia: mapa, totalMesCalendario: { confirmado: sumConfirmado, pendiente: sumPendiente } };
    }, [year, mesCalendario, registrosEmpresa, empresaActual]);

    // Generar todas las semanas o quincenas pendientes del año automáticamente
    const handleGenerarRecurrentes = async () => {
        const nuevos = generarPeriodosRecurrentesEmpresa(empresaActual, year, registros);
        if (nuevos.length === 0) {
            Swal.fire("Todo al día", "Todas las fechas del año ya están generadas para esta empresa.", "info");
            return;
        }

        const confirm = await Swal.fire({
            title: `¿Generar ${nuevos.length} periodos pendientes?`,
            text: `Se crearán automáticamente las fechas restantes de ${year} en estado Pendiente para ${empresaActual.nombre}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: `Sí, generar ${nuevos.length} periodos`,
            confirmButtonColor: "var(--colorMorado)",
            cancelButtonText: "Cancelar",
        });

        if (confirm.isConfirmed) {
            try {
                const dataActualizada = await guardarRegistrosMasivos(uid, year, dataIngresos, nuevos);
                onActualizado?.(dataActualizada);
                Swal.fire("¡Listo!", `Se generaron ${nuevos.length} periodos pendientes para ${year}.`, "success");
            } catch (e) {
                console.error("Error al generar periodos:", e);
                Swal.fire("Error", "No se pudieron generar los periodos.", "error");
            }
        }
    };

    // Toggle estado Pagado / Pendiente rápido
    const handleToggleEstado = async (registro) => {
        if (registro.estado === "Liquidado") {
            const resp = await Swal.fire({
                title: "Registro liquidado",
                text: "Este adeudo ya fue marcado como liquidado por otro pago. ¿Deseas volver a marcarlo como Pendiente o como Pagado directo?",
                icon: "question",
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: "Marcar Pagado directo",
                denyButtonText: "Marcar Pendiente",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#28a745",
                denyButtonColor: "#ffc107",
            });
            if (resp.isConfirmed) {
                const teoricoTotal = Number(registro.montoTeorico || 0) + Number(registro.montoExtra || 0);
                const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                    ...registro,
                    estado: "Pagado",
                    clasificacionCobro: CLASIFICACIONES_COBRO.PAGO,
                    montoReal: registro.montoReal || teoricoTotal,
                });
                onActualizado?.(dataActualizada);
            } else if (resp.isDenied) {
                const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                    ...registro,
                    estado: "Pendiente",
                });
                onActualizado?.(dataActualizada);
            }
            return;
        }
        if (registro.estado === "Pendiente" && obtenerClasificacionCobro(registro, empresaActual) === CLASIFICACIONES_COBRO.CORTE) {
            const resp = await Swal.fire({
                title: "Es un corte por liquidar",
                text: "¿Deseas marcarlo directamente como pagado o generar el cobro del adeudo?",
                icon: "question",
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: "Cobrar con adeudo",
                denyButtonText: "Marcar Pagado directo",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "var(--colorMorado)",
                denyButtonColor: "#28a745",
            });
            if (resp.isConfirmed) {
                handleLiquidarAdeudo(registro);
            } else if (resp.isDenied) {
                const teoricoTotal = Number(registro.montoTeorico || 0) + Number(registro.montoExtra || 0);
                const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                    ...registro,
                    estado: "Pagado",
                    clasificacionCobro: CLASIFICACIONES_COBRO.PAGO,
                    montoReal: registro.montoReal || teoricoTotal,
                });
                onActualizado?.(dataActualizada);
            }
            return;
        }
        const nuevoEstado = registro.estado === "Pagado" ? "Pendiente" : "Pagado";
        const teoricoTotal = Number(registro.montoTeorico || 0) + Number(registro.montoExtra || 0);
        const montoRealNuevo = nuevoEstado === "Pagado" && (!registro.montoReal || Number(registro.montoReal) === 0)
            ? teoricoTotal
            : (registro.montoReal ?? teoricoTotal);

        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                estado: nuevoEstado,
                montoReal: montoRealNuevo,
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al cambiar estado:", e);
        }
    };

    // Cambio rápido de fecha
    const handleCambioFecha = async (registro, nuevaFecha) => {
        if (!nuevaFecha || nuevaFecha === registro.fecha) return;
        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                fecha: nuevaFecha,
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al actualizar fecha:", e);
        }
    };

    // Cambio rápido de monto real
    const handleCambioMontoReal = async (registro, nuevoMonto) => {
        const montoNum = parseFloat(nuevoMonto);
        if (Number.isNaN(montoNum)) {
            setMontosEditados((actuales) => {
                const siguiente = { ...actuales };
                delete siguiente[registro.id];
                return siguiente;
            });
            return;
        }
        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                montoReal: montoNum,
            });
            onActualizado?.(dataActualizada);
            setMontosEditados((actuales) => {
                const siguiente = { ...actuales };
                delete siguiente[registro.id];
                return siguiente;
            });
        } catch (e) {
            console.error("Error al actualizar monto:", e);
        }
    };

    const handleLiquidarAdeudo = async (registro) => {
        const monto = obtenerMontoRegistro(registro);
        const respuesta = await Swal.fire({
            title: "Generar pago del adeudo",
            html: `Se registrará un pago confirmado por <b>${fnFormatMoney(monto)}</b>. El corte original quedará como liquidado y no se contará dos veces.`,
            input: "date",
            inputValue: new Date().toISOString().slice(0, 10),
            inputLabel: "Fecha en la que recibiste el pago",
            showCancelButton: true,
            confirmButtonText: "Generar pago",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "var(--colorMorado)",
            inputValidator: (value) => !value && "Indica la fecha del pago.",
        });
        if (!respuesta.isConfirmed) return;
        try {
            const dataActualizada = await liquidarAdeudoIngreso(uid, year, dataIngresos, registro, respuesta.value);
            onActualizado?.(dataActualizada);
            Swal.fire("Pago generado", "El adeudo se mantuvo como historial y el pago ya cuenta como ingreso.", "success");
        } catch (error) {
            console.error("Error al liquidar adeudo:", error);
            Swal.fire("Error", "No se pudo generar el pago del adeudo.", "error");
        }
    };

    // Eliminar registro
    const handleEliminarRegistro = async (registroId) => {
        const confirmacion = await Swal.fire({
            title: "¿Eliminar pago?",
            text: "Se quitará este registro del historial.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirmacion.isConfirmed) {
            try {
                const dataActualizada = await eliminarRegistroPago(uid, year, dataIngresos, registroId);
                onActualizado?.(dataActualizada);
            } catch (e) {
                console.error("Error al eliminar:", e);
            }
        }
    };

    const handleExportarCSV = () => {
        exportarRegistrosEmpresaACSV(empresaActual.nombre || "Empresa", registrosEmpresa, year, empresaActual);
    };

    if (empresas.length === 0) {
        return (
            <ContenedorDetalle>
                <EstadoVacio style={{ background: "white", borderRadius: 14, border: "1px dashed rgba(83, 59, 143, 0.2)", padding: "50px 20px" }}>
                    <FaBuilding style={{ fontSize: 40, color: "var(--colorMorado)", opacity: 0.5, marginBottom: 12 }} />
                    <h3 style={{ margin: "0 0 8px", color: "var(--colorMorado)" }}>Aún no tienes empresas registradas en el año {year}</h3>
                    <p style={{ margin: "0 0 16px", color: "#666", fontSize: 13 }}>
                        Da de alta tu primera empresa o importa tu historial de pagos desde Excel.
                    </p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                        <BtnAccion $primario onClick={() => onEditarEmpresa?.(null)}>
                            <FaPlus /> Crear Primera Empresa
                        </BtnAccion>
                        <BtnAccion onClick={onAbrirImportador}>
                            <FaFileImport /> Importar desde Excel
                        </BtnAccion>
                    </div>
                </EstadoVacio>
            </ContenedorDetalle>
        );
    }

    return (
        <ContenedorDetalle>
            {/* ── ENCABEZADO DE LA EMPRESA SELECCIONADA ── */}
            <EncabezadoEmpresa>
                <InfoEmpresa>
                    <TituloFila>
                        <DotColor $color={empresaActual.color} />
                        <TituloEmpresa>{empresaActual.nombre || "Empresa"}</TituloEmpresa>
                    </TituloFila>
                    <EsquemaBadge>
                        <FaInfoCircle />
                        {empresaActual.tipoEsquema === "diario_sexto_dia" && `Cortes diarios: $${empresaActual.salarioDiario}/día (5 días + 6to por ley)`}
                        {empresaActual.tipoEsquema === "por_horas" && `Por horas: $${empresaActual.precioHora}/hr + Bono Internet $${empresaActual.bonoInternet}`}
                        {empresaActual.tipoEsquema === "quincenal" && `Quincenal base: $${empresaActual.quincenaBase} + Bonos`}
                        {empresaActual.tipoEsquema === "mensual" && "Sueldo Mensual"}
                        {empresaActual.tipoEsquema === "libre" && "Honorarios / Libre"}
                        {empresaActual.notas ? ` • ${empresaActual.notas}` : ""}
                    </EsquemaBadge>
                </InfoEmpresa>

                <BotonesAccionEmpresa>
                    <GrupoSelectorVista>
                        <BtnSelectorVista
                            type="button"
                            $activo={modoVista === "tabla"}
                            onClick={() => setModoVista("tabla")}
                            title="Vista de tabla"
                        >
                            <FaTable /> Tabla
                        </BtnSelectorVista>
                        <BtnSelectorVista
                            type="button"
                            $activo={modoVista === "calendario"}
                            onClick={() => setModoVista("calendario")}
                            title="Vista de calendario mensual"
                        >
                            <FaCalendarAlt /> Calendario
                        </BtnSelectorVista>
                    </GrupoSelectorVista>
                    <BtnAccion $primario onClick={() => onAbrirNuevoPago?.(empresaActual)}>
                        <FaPlus /> Nuevo ingreso
                    </BtnAccion>
                    <BtnAccion onClick={() => setOrdenDesc(!ordenDesc)}>
                        {ordenDesc ? <FaSortAmountDown /> : <FaSortAmountUp />} {ordenDesc ? "Recientes Primero" : "Antiguos Primero"}
                    </BtnAccion>
                    {/* Botones directos en escritorio (al final) */}
                    <BtnAccionDesktop onClick={() => onAbrirImportador?.(empresaActual)}>
                        <FaFileImport /> Importar
                    </BtnAccionDesktop>
                    <BtnAccionDesktop onClick={handleExportarCSV}>
                        <FaFileCsv /> CSV
                    </BtnAccionDesktop>

                    {/* Botón único en responsive que abre modal intermedio (al final) */}
                    <BtnAccionMovil onClick={() => setModalDatosEmpresaOpen(true)} title="Herramientas de datos (Importar / CSV)">
                        <FaFileExport /> Datos / Exportar
                    </BtnAccionMovil>
                </BotonesAccionEmpresa>
            </EncabezadoEmpresa>

            {/* ── VISTA CALENDARIO O TABLA DE REGISTROS ── */}
            {modoVista === "calendario" ? (
                <CalendarioWrapper>
                    <CalendarioBarraControl>
                        <NavegadorMes>
                            <BtnMesNav
                                type="button"
                                disabled={mesCalendario === 0}
                                onClick={() => setMesCalendario((m) => Math.max(0, m - 1))}
                                title="Mes anterior"
                            >
                                <FaChevronLeft />
                            </BtnMesNav>
                            <h4>{MESES_ANIO[mesCalendario]?.nombre} {year}</h4>
                            <BtnMesNav
                                type="button"
                                disabled={mesCalendario === 11}
                                onClick={() => setMesCalendario((m) => Math.min(11, m + 1))}
                                title="Mes siguiente"
                            >
                                <FaChevronRight />
                            </BtnMesNav>
                        </NavegadorMes>
                        <ResumenMesCalendario>
                            <span>Cobrado: <b>{fnFormatMoney(totalMesCalendario.confirmado)}</b></span>
                            {totalMesCalendario.pendiente > 0 && (
                                <span style={{ color: "#d35400" }}>Por cobrar: <b>{fnFormatMoney(totalMesCalendario.pendiente)}</b></span>
                            )}
                        </ResumenMesCalendario>
                    </CalendarioBarraControl>

                    <CalendarioGrid>
                        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((nom) => (
                            <CabeceraDiaSemana key={nom}>{nom}</CabeceraDiaSemana>
                        ))}
                        {diasMes.map((item) => {
                            if (item.tipo === "vacio") {
                                return (
                                    <CeldaDia
                                        key={item.key}
                                        style={{
                                            opacity: 0.2,
                                            background: "transparent",
                                            border: "1px dashed rgba(83, 59, 143, 0.08)",
                                            cursor: "default",
                                        }}
                                    />
                                );
                            }
                            const fechaHoy = new Date().toISOString().split("T")[0];
                            const esHoy = item.fecha === fechaHoy;
                            const pagosDia = pagosPorDia[item.fecha] || [];

                            return (
                                <CeldaDia
                                    key={item.key}
                                    $esMesActual={true}
                                    $esHoy={esHoy}
                                    onClick={() => {
                                        if (pagosDia.length === 0) {
                                            onAbrirNuevoPago?.({ ...empresaActual, fechaSugerida: item.fecha });
                                        }
                                    }}
                                    title={pagosDia.length === 0 ? "Click para registrar pago en este día" : undefined}
                                >
                                    <CabeceraDia>
                                        <NumeroDia $esMesActual={true} $esHoy={esHoy}>{item.dia}</NumeroDia>
                                        {pagosDia.length === 0 && (
                                            <span style={{ fontSize: 11, color: "#aaa", opacity: 0.6 }}>+</span>
                                        )}
                                    </CabeceraDia>
                                    <ContenedorPagosDia>
                                        {pagosDia.map((pago) => {
                                            const pagado = esCobroConfirmado(pago, empresaActual);
                                            const esLiquidado = pago.estado === "Liquidado";
                                            return (
                                                <TarjetaPagoDia
                                                    key={pago.id}
                                                    $pagado={pagado}
                                                    $liquidado={esLiquidado}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditarRegistro?.(pago);
                                                    }}
                                                    title={`Click para editar pago (${esLiquidado ? "Liquidado" : pagado ? "Pagado" : "Pendiente"})`}
                                                >
                                                    <MontoPagoDia>
                                                        <span>{fnFormatMoney(obtenerMontoRegistro(pago))}</span>
                                                        {esLiquidado ? (
                                                            <FaCheckDouble style={{ color: "#6f42c1", fontSize: 10 }} />
                                                        ) : pagado ? (
                                                            <FaCheckCircle style={{ color: "#28a745", fontSize: 10 }} />
                                                        ) : (
                                                            <FaClock style={{ color: "#e0a800", fontSize: 10 }} />
                                                        )}
                                                    </MontoPagoDia>
                                                    {pago.horasReportadas ? (
                                                        <InfoExtraDia>{pago.horasReportadas} hrs</InfoExtraDia>
                                                    ) : pago.diasTrabajados ? (
                                                        <InfoExtraDia>{pago.diasTrabajados} días</InfoExtraDia>
                                                    ) : pago.horasTrabajadas ? (
                                                        <InfoExtraDia>{pago.horasTrabajadas} hrs</InfoExtraDia>
                                                    ) : pago.numDias ? (
                                                        <InfoExtraDia>{pago.numDias} días</InfoExtraDia>
                                                    ) : pago.notas ? (
                                                        <InfoExtraDia>{pago.notas}</InfoExtraDia>
                                                    ) : null}
                                                </TarjetaPagoDia>
                                            );
                                        })}
                                    </ContenedorPagosDia>
                                </CeldaDia>
                            );
                        })}
                    </CalendarioGrid>
                </CalendarioWrapper>
            ) : (
                <TablaWrapper>
                <Tabla>
                    <Thead>
                        <tr>
                            <Th>Fecha</Th>
                            <Th $align="center"># Periodo</Th>
                            <Th $align="center">Días / Horas</Th>
                            <Th $align="right">Monto Teórico</Th>
                            <Th $align="right">Extra / Bono</Th>
                            <Th>Tipo</Th>
                            <Th $align="center">Estado</Th>
                            <Th $align="right">Pago Real Confirmado</Th>
                            <Th>Notas</Th>
                            <Th $align="center">Acciones</Th>
                        </tr>
                    </Thead>
                    <tbody>
                        {registrosEmpresa.length === 0 ? (
                            <tr>
                                <td colSpan="10">
                                    <EstadoVacio>
                                        No hay pagos registrados para {empresaActual.nombre} en el año {year}.
                                        <div style={{ marginTop: 12 }}>
                                            <BtnAccion $destacado onClick={handleGenerarRecurrentes} style={{ display: "inline-flex" }}>
                                                <FaBolt /> Generar Semanas Pendientes de {year}
                                            </BtnAccion>
                                        </div>
                                    </EstadoVacio>
                                </td>
                            </tr>
                        ) : (
                            registrosEmpresa.map((reg) => (
                                <Tr key={reg.id}>
                                    <Td $mono>
                                        <InputFechaRapido
                                            type="date"
                                            value={reg.fecha || ""}
                                            onChange={(e) => handleCambioFecha(reg, e.target.value)}
                                            title="Click para cambiar fecha"
                                        />
                                    </Td>
                                    <Td $align="center" $mono>
                                        {reg.numeroPeriodo || "—"}
                                    </Td>
                                    <Td $align="center" $mono>
                                        {reg.tipo === "Semana (Horas)" && reg.horasReportadas
                                            ? `${reg.horasReportadas} hrs`
                                            : (reg.diasTrabajados ? `${reg.diasTrabajados} días` : "—")}
                                    </Td>
                                    <Td $align="right" $mono>
                                        {fnFormatMoney(reg.montoTeorico)}
                                    </Td>
                                    <Td $align="right" $mono style={{ color: reg.montoExtra > 0 ? "#28a745" : "#888" }}>
                                        {reg.montoExtra > 0 ? `+${fnFormatMoney(reg.montoExtra)}` : "—"}
                                    </Td>
                                    <Td>
                                        <div>{reg.tipo || "Quincena"}</div>
                                        <div style={{ color: "#777", fontSize: 10, marginTop: 2 }}>
                                            {reg.estado === "Liquidado"
                                                ? "Adeudo liquidado"
                                                : obtenerClasificacionCobro(reg, empresaActual) === CLASIFICACIONES_COBRO.CORTE
                                                    ? "Corte por liquidar"
                                                    : obtenerClasificacionCobro(reg, empresaActual) === CLASIFICACIONES_COBRO.LIQUIDACION
                                                        ? "Liquidación recibida"
                                                        : "Pago directo"}
                                        </div>
                                    </Td>
                                    <Td $align="center">
                                        <BadgeEstado
                                            $estado={reg.estado}
                                            onClick={() => handleToggleEstado(reg)}
                                            title={reg.estado === "Liquidado" ? "Corte saldado vía liquidación" : "Click para alternar entre Pagado y Pendiente"}
                                        >
                                            {reg.estado === "Pagado" ? (
                                                <FaCheckCircle />
                                            ) : reg.estado === "Liquidado" ? (
                                                <FaCheckDouble />
                                            ) : (
                                                <FaClock />
                                            )}
                                            {reg.estado === "Pendiente" ? "Adeudo" : reg.estado}
                                        </BadgeEstado>
                                    </Td>
                                    <Td $align="right" $mono>
                                        <InputRapido
                                            type="number" inputMode="decimal"
                                            value={montosEditados[reg.id] ?? (reg.montoReal !== undefined ? reg.montoReal : (Number(reg.montoTeorico || 0) + Number(reg.montoExtra || 0)))}
                                            onChange={(e) => setMontosEditados((actuales) => ({ ...actuales, [reg.id]: e.target.value }))}
                                            onBlur={(e) => handleCambioMontoReal(reg, e.target.value)}
                                            title="Edita el monto real depositado"
                                        />
                                    </Td>
                                    <Td style={{ color: "#777", fontSize: 12 }}>{reg.notas || "—"}</Td>
                                    <Td $align="center">
                                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                            <BotonIcono onClick={() => onEditarRegistro?.(reg)} title="Editar detalles completos">
                                                <FaEdit />
                                            </BotonIcono>
                                            {reg.estado === "Pendiente" && (
                                                <BotonIcono onClick={() => handleLiquidarAdeudo(reg)} title="Generar el pago de este adeudo">
                                                    <FaHandHoldingUsd />
                                                </BotonIcono>
                                            )}
                                            <BotonIcono $danger onClick={() => handleEliminarRegistro(reg.id)} title="Eliminar registro">
                                                <FaTrash />
                                            </BotonIcono>
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </tbody>
                    {registrosEmpresa.length > 0 && (
                        <tfoot>
                            <TrTotal>
                                <Td colSpan="3">TOTAL {empresaActual.nombre?.toUpperCase()}</Td>
                                <Td $align="right" $mono>{fnFormatMoney(totales.totalTeorico)}</Td>
                                <Td $align="right">—</Td>
                                <Td colSpan="2" $align="center">
                                    <span style={{ fontSize: 11, color: "#28a745" }}>
                                        Cobrado: {fnFormatMoney(totales.totalReal)}
                                    </span>
                                    {totales.totalPendiente > 0 && (
                                        <span style={{ fontSize: 11, color: "#e65100", marginLeft: 8 }}>
                                            Pendiente: {fnFormatMoney(totales.totalPendiente)}
                                        </span>
                                    )}
                                </Td>
                                <Td $align="right" $mono>{fnFormatMoney(totales.totalReal)}</Td>
                                <Td colSpan="2" />
                            </TrTotal>
                        </tfoot>
                    )}
                </Tabla>
            </TablaWrapper>
            )}

            {/* ── MODAL INTERMEDIO DE DATOS DE EMPRESA (IMPORTAR / CSV) ── */}
            <ModalGenerico
                isOpen={modalDatosEmpresaOpen}
                onClose={() => setModalDatosEmpresaOpen(false)}
                maxAncho="480px"
                encabezado={
                    <ModalEncabezado
                        icon={<FaDatabase />}
                        title="Herramientas de Datos"
                        description={`Gestiona los registros de ${empresaActual?.nombre || "Empresa"} en ${year}.`}
                    />
                }
            >
                <GridOpcionesExportar>
                    <TarjetaOpcionExportar
                        onClick={() => {
                            setModalDatosEmpresaOpen(false);
                            onAbrirImportador?.(empresaActual);
                        }}
                    >
                        <OpcionInfo>
                            <IconoOpcion $bg="rgba(83, 59, 143, 0.1)" $color="var(--colorMorado)">
                                <FaFileImport />
                            </IconoOpcion>
                            <TextosOpcion>
                                <h4>Importar desde Excel</h4>
                                <p>Carga o pega pagos específicos para {empresaActual?.nombre}.</p>
                            </TextosOpcion>
                        </OpcionInfo>
                        <span style={{ fontSize: 13, color: "var(--colorMorado)", fontWeight: 700 }}>Abrir &rarr;</span>
                    </TarjetaOpcionExportar>

                    <TarjetaOpcionExportar
                        onClick={() => {
                            setModalDatosEmpresaOpen(false);
                            handleExportarCSV();
                        }}
                    >
                        <OpcionInfo>
                            <IconoOpcion $bg="rgba(0, 136, 254, 0.12)" $color="#0088fe">
                                <FaFileCsv />
                            </IconoOpcion>
                            <TextosOpcion>
                                <h4>Exportar Pagos (CSV)</h4>
                                <p>Descarga el historial de fechas, horas y montos en CSV.</p>
                            </TextosOpcion>
                        </OpcionInfo>
                        <span style={{ fontSize: 13, color: "#0088fe", fontWeight: 700 }}>Descargar &rarr;</span>
                    </TarjetaOpcionExportar>
                </GridOpcionesExportar>
            </ModalGenerico>
        </ContenedorDetalle>
    );
};
