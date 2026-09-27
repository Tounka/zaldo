import styled, { keyframes } from "styled-components";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    FaPlus,
    FaMoneyBillWave,
    FaClock,
    FaCheckCircle,
    FaSearch,
    FaCalendarCheck,
    FaCoins,
    FaStickyNote,
    FaBell,
    FaBolt,
    FaHandHoldingUsd,
    FaUsers,
    FaCheckSquare,
    FaTimes,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerTodosPrestamos,
    asignarPrestamosEnBloque,
    reconstruirIndiceAsignaciones,
} from "../../funciones/firebase/prestamos";
import { obtenerUsuarios } from "../../funciones/firebase/usuario";
import { SearchableCollaboratorSelect } from "./selectorColaboradores";
import { fnFormatMoney, formatFechaLegible } from "../../funciones/prestamosCalculos";
import { fechaLocalISO } from "../../funciones/utils/fechas";
import { obtenerFechaProximoPago, obtenerProximoPago, obtenerTipoPrestamo } from "../../funciones/prestamosPresentacion";
import { CardNotaDeuda } from "./cardNotaDeuda";
import { ModalCrearNotaDeuda } from "./modalCrearNotaDeuda";
import { ModalRegistrarAbono } from "./modalRegistrarAbono";
import { ModalEditarPrestamo } from "./modalEditarPrestamo";
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
  gap: 16px;
  animation: ${fadeUp} 0.35s ease;
  padding-bottom: 32px;
`;

const HeaderPrincipal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: 720px) {
    align-items: stretch;
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
  gap: 2px;
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

const BotoneraHeader = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    display: none;
  }
`;

const BtnNuevaNota = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 800;
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
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: rgba(83, 59, 143, 0.05);
  }
`;

/* ================= RECORDATORIOS INTERACTIVOS ================= */

const SeccionRecordatorios = styled.div`
  background: #fdfcff;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 16px;
  padding: 15px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const HeaderRecordatorios = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const TituloRecordatorios = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--colorMorado);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GridRecordatorios = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const CardRecordatorio = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.035);
`;

const RecordatorioInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`;

const RecordatorioNombre = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RecordatorioDetalle = styled.span`
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RecordatorioMonto = styled.strong`
  color: #2d2450;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  font-size: 21px;
  letter-spacing: -0.04em;
  line-height: 1;
`;

const BtnCobrarRecordatorio = styled.button`
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  width: 100%;
  transition: all 0.15s ease;

  &:hover {
    background: #218838;
    transform: scale(1.03);
  }
`;

/* ================= KPIS ================= */

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 16px;
  box-shadow: 0 5px 18px rgba(52, 37, 81, 0.045);

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const KpiCard = styled.div`
  min-width: 0;
  padding: 13px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-right: 1px solid rgba(83, 59, 143, 0.1);

  &:last-child { border-right: none; }

  @media (max-width: 900px) {
    &:nth-child(2) { border-right: none; }
    &:nth-child(-n + 2) { border-bottom: 1px solid rgba(83, 59, 143, 0.1); }
  }

  @media (max-width: 480px) {
    padding: 10px 10px;
    gap: 8px;
  }
`;

const KpiIcono = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: ${({ $bg }) => $bg || "rgba(83, 59, 143, 0.1)"};
  color: ${({ $color }) => $color || "var(--colorMorado)"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
`;

const KpiContenido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const KpiTitulo = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #777;
  letter-spacing: 0.4px;
`;

const KpiValor = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

/* ================= BARRA DE FILTROS ================= */

const BarraControles = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 38px;
`;

const GrupoFiltros = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
  overflow-x: auto;
`;

const PillFiltro = styled.button`
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.1)" : "white")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#666")};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
  }
`;

const InputBuscadorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 10px;
  padding: 6px 12px;
  min-width: 260px;
  max-width: 330px;
  flex: 1;

  svg {
    color: #888;
    font-size: 13px;
  }

  input {
    border: none;
    background: transparent;
    font-size: 13px;
    color: #1a1a2e;
    outline: none;
    width: 100%;
  }
`;

/* ================= TABLA FINANCIERA ================= */

const TablaShell = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(52, 37, 81, 0.045);
`;

const TablaNotas = styled.table`
  width: 100%;
  min-width: 1120px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
`;

const TablaCabecera = styled.thead`
  background: #f7f5fa;

  th {
    padding: 11px 12px;
    border-bottom: 1px solid rgba(83, 59, 143, 0.12);
    color: #756d80;
    font-size: 10px;
    letter-spacing: .08em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  th:nth-child(1) { width: 22%; }
  th:nth-child(2) { width: 12%; }
  th:nth-child(3) { width: 14%; }
  th:nth-child(4) { width: 14%; }
  th:nth-child(5) { width: 11%; }
  th:nth-child(6) { width: 11%; }
  th:nth-child(7) { width: 9%; }
  th:nth-child(8) { width: 15%; }
`;

const EstadoVacio = styled.div`
  padding: 48px 20px;
  text-align: center;
  color: #888;
  background: white;
  border: 1px dashed rgba(83, 59, 143, 0.2);
  border-radius: 16px;
`;

const BarraAdmin = styled.div`
  display: grid;
  grid-template-columns: auto minmax(240px, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  border-radius: 14px;
  background: linear-gradient(110deg, rgba(83, 59, 143, 0.07), rgba(142, 109, 212, 0.04));

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const BadgeVencido = styled.span`
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(220, 53, 69, 0.12);
  color: #b02a37;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
`;

const AdminSelection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
`;

const AdminActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
`;

const BtnAdmin = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 13px;
  border: 1px solid ${({ $primary }) => ($primary ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.2)")};
  border-radius: 10px;
  background: ${({ $primary }) => ($primary ? "var(--colorMorado)" : "#fff")};
  color: ${({ $primary }) => ($primary ? "#fff" : "var(--colorMorado)")};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all .15s ease;

  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(83, 59, 143, 0.14); }
  &:disabled { opacity: .45; cursor: not-allowed; }
`;

const BadgeAdmin = styled.span`
  color: #7a7090;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
`;

export const PaginaPrestamosUx = () => {
    const { usuario, setPrestamosCache, invalidarOtraCachePrestamos } = useAppStore();
    const [prestamos, setPrestamos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [busqueda, setBusqueda] = useState("");

    // Modales
    const [isModalCrearOpen, setIsModalCrearOpen] = useState(false);
    const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
    const [prestamoParaAbono, setPrestamoParaAbono] = useState(null);
    const [pagoAEditar, setPagoAEditar] = useState(null);
    const [montoAbonoSugerido, setMontoAbonoSugerido] = useState(null);
    const [fechaAbonoSugerida, setFechaAbonoSugerida] = useState(null);
    const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
    const [prestamoAEditar, setPrestamoAEditar] = useState(null);
    const [seleccionados, setSeleccionados] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [colaboradoresEnBloque, setColaboradoresEnBloque] = useState([]);
    const [guardandoBloque, setGuardandoBloque] = useState(false);
    const esAdmin = usuario?.admin === true;

    // Las asignaciones hechas antes del índice `asignaciones/{cobradorUid}` no aparecen
    // para el cobrador; se indexan una sola vez por navegador (la operación es idempotente).
    useEffect(() => {
        if (!esAdmin || !usuario?.uid) return;
        const clave = `zaldo_indiceAsignaciones_v1_${usuario.uid}`;
        try {
            if (localStorage.getItem(clave)) return;
        } catch {
            // sin almacenamiento local: se intenta igual
        }
        reconstruirIndiceAsignaciones(usuario.uid)
            .then(() => {
                try { localStorage.setItem(clave, "1"); } catch { /* ignorar */ }
            })
            .catch((e) => console.warn("No se pudo reconstruir el índice de asignaciones:", e));
    }, [esAdmin, usuario?.uid]);

    /* ── Cargar Préstamos ── */
    const cargarPrestamos = useCallback(async (forzarFirebase = false) => {
        if (!usuario?.uid) return;

        const cacheKey = `${usuario.uid}_false`;
        const dataCache = useAppStore.getState().prestamosPorUsuario[cacheKey];
        if (dataCache && !forzarFirebase) {
            setPrestamos(dataCache);
            setCargando(false);
            return;
        }

        setCargando(true);
        try {
            const data = await obtenerTodosPrestamos(usuario.uid, false, usuario);
            setPrestamos(data);
            setPrestamosCache(usuario.uid, false, data);
        } catch (e) {
            console.error("Error al cargar préstamos:", e);
        } finally {
            setCargando(false);
        }
    }, [usuario, setPrestamosCache]);

    useEffect(() => {
        cargarPrestamos();
    }, [cargarPrestamos]);

    // Mantiene sincronizada la caché del store con cada actualización optimista local,
    // para que no quede obsoleta al volver a esta página desde otra ruta.
    const actualizarPrestamos = useCallback((updater) => {
        if (!usuario?.uid) return;
        const actuales = useAppStore.getState().prestamosPorUsuario[`${usuario.uid}_false`] || [];
        const next = updater(actuales);
        setPrestamos(next);
        setPrestamosCache(usuario.uid, false, next);
        invalidarOtraCachePrestamos(usuario.uid, false);
    }, [usuario?.uid, setPrestamosCache, invalidarOtraCachePrestamos]);

    useEffect(() => {
        if (esAdmin) obtenerUsuarios().then(setColaboradores);
    }, [esAdmin]);

    /* ── Cálculo de Totales KPIs ── */
    const kpis = useMemo(() => {
        let totalPrestado = 0;
        let totalCobrado = 0;
        let totalPendiente = 0;
        let conteoPendientes = 0;
        let conteoLiquidados = 0;

        prestamos.forEach((p) => {
            const prestado = Number(p.montoPrestado || 0);
            const interes = Number(p.interesEstimado || 0);
            const totalDeuda = prestado + interes;
            const cobrado = (p.pagos || []).reduce((acc, pg) => acc + Number(pg.monto || 0), 0);
            const pendiente = Math.max(0, totalDeuda - cobrado);

            totalPrestado += prestado;
            totalCobrado += cobrado;
            totalPendiente += pendiente;

            if (pendiente <= 0 && cobrado > 0) {
                conteoLiquidados += 1;
            } else {
                conteoPendientes += 1;
            }
        });

        return {
            totalPrestado,
            totalCobrado,
            totalPendiente,
            conteoPendientes,
            conteoLiquidados,
            totalNotas: prestamos.length,
        };
    }, [prestamos]);

    /* ── Recordatorios Próximos ── */
    const recordatorios = useMemo(() => {
        const list = [];
        const hoy = new Date();

        prestamos.forEach((p) => {
            const totalDeuda = Number(p.montoPrestado || 0) + Number(p.interesEstimado || 0);
            const cobrado = (p.pagos || []).reduce((acc, pg) => acc + Number(pg.monto || 0), 0);
            const saldo = Math.max(0, totalDeuda - cobrado);
            if (saldo <= 0) return;

            // Misma fecha que muestra la tabla (quincenal, cada N días o fecha única)
            const fechaProx = obtenerFechaProximoPago(p);
            if (!fechaProx) return;

            const cuota = Number(p.abonoTeorico || 0);
            const esFechaUnica = p.tipoPeriodicidad === "fechas_especificas";
            const montoSugerido = esFechaUnica ? (cuota || saldo) : Math.min(cuota || saldo, saldo);
            const detalle = esFechaUnica
                ? `Pago único pactado (${fechaLocalISO(fechaProx)})`
                : `${obtenerTipoPrestamo(p)} · ${cuota > 0 ? fnFormatMoney(cuota) : "sin cuota fija"}`;

            list.push({
                prestamo: p,
                titulo: p.nombre,
                fecha: fechaLocalISO(fechaProx),
                montoSugerido,
                detalle,
            });
        });

        const hoyIso = fechaLocalISO(hoy);
        return list
            .map((rec) => {
                const diasAtraso = rec.fecha < hoyIso
                    ? Math.round((new Date(`${hoyIso}T12:00:00`) - new Date(`${rec.fecha}T12:00:00`)) / 86400000)
                    : 0;
                return { ...rec, diasAtraso };
            })
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }, [prestamos]);

    /* ── Filtrar Notas ── */
    const notasFiltradas = useMemo(() => {
        return prestamos.filter((p) => {
            const totalDeuda = Number(p.montoPrestado || 0) + Number(p.interesEstimado || 0);
            const cobrado = (p.pagos || []).reduce((acc, pg) => acc + Number(pg.monto || 0), 0);
            const saldo = Math.max(0, totalDeuda - cobrado);
            const esLiquidado = saldo <= 0 && cobrado > 0;

            if (filtroEstado === "pendientes" && esLiquidado) return false;
            if (filtroEstado === "liquidados" && !esLiquidado) return false;

            if (busqueda.trim()) {
                const term = busqueda.toLowerCase();
                const nom = (p.nombre || "").toLowerCase();
                const not = (p.notas || "").toLowerCase();
                if (!nom.includes(term) && !not.includes(term)) return false;
            }

            return true;
        });
    }, [prestamos, filtroEstado, busqueda]);

    const handleAbrirAbono = (prestamo, montoSug = null, fechaSug = null) => {
        setPrestamoParaAbono(prestamo);
        setPagoAEditar(null);
        setMontoAbonoSugerido(montoSug);
        setFechaAbonoSugerida(fechaSug);
        setIsModalAbonoOpen(true);
    };

    const handleAbonoGuardado = (prestamoId, nuevoPago) => {
        actualizarPrestamos((prev) =>
            prev.map((p) =>
                p.id === prestamoId
                    ? { ...p, pagos: [...(p.pagos || []), nuevoPago] }
                    : p
            )
        );
    };

    const handleNotaActualizada = (notaActualizada) => {
        actualizarPrestamos((prev) => notaActualizada.activo === false
            ? prev.filter((p) => p.id !== notaActualizada.id)
            : prev.map((p) => (p.id === notaActualizada.id ? notaActualizada : p))
        );
    };

    const handleNotaEliminada = (prestamoId) => {
        actualizarPrestamos((prev) => prev.filter((p) => p.id !== prestamoId));
        setSeleccionados((prev) => prev.filter((id) => id !== prestamoId));
    };

    const toggleSeleccion = (prestamoId) => {
        setSeleccionados((prev) => prev.includes(prestamoId)
            ? prev.filter((id) => id !== prestamoId)
            : [...prev, prestamoId]);
    };

    const seleccionarVisibles = () => {
        const idsVisibles = notasFiltradas.map((prestamo) => prestamo.id);
        setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])));
    };

    const limpiarSeleccion = () => {
        setSeleccionados([]);
        setColaboradoresEnBloque([]);
    };

    const guardarAsignacionEnBloque = async () => {
        if (!esAdmin || seleccionados.length === 0 || colaboradoresEnBloque.length === 0) return;
        setGuardandoBloque(true);
        try {
            // Solo se reasignan los préstamos de la colección propia (no los que llegan del índice de otro dueño)
            const idsPropios = prestamos
                .filter((p) => seleccionados.includes(p.id) && (p.ownerUid || usuario.uid) === usuario.uid)
                .map((p) => p.id);
            await asignarPrestamosEnBloque(usuario.uid, idsPropios, colaboradoresEnBloque);
            actualizarPrestamos((prev) => prev.map((prestamo) => seleccionados.includes(prestamo.id)
                ? { ...prestamo, asignadoA: colaboradoresEnBloque[0], cobradoresAsignados: colaboradoresEnBloque }
                : prestamo));
            Swal.fire({ icon: "success", title: "Asignación actualizada", text: `${seleccionados.length} préstamo(s) configurado(s).`, timer: 1800, showConfirmButton: false });
            limpiarSeleccion();
        } catch (error) {
            console.error("Error al asignar préstamos en bloque:", error);
            Swal.fire("Error", "No se pudo aplicar la asignación masiva.", "error");
        } finally {
            setGuardandoBloque(false);
        }
    };

    return (
        <PaginaContenedor>
            {/* HEADER PRINCIPAL */}
            <HeaderPrincipal>
                <TituloFilaHeader>
                    <TituloGrupo>
                        <H2 size="24px" color="var(--colorMorado)">
                            Cobranza & Notas de Deuda
                        </H2>
                        <TxtGenerico size="13px" color="#666">
                            Control financiero de préstamos, abonos y próximos cobros.
                        </TxtGenerico>
                    </TituloGrupo>
                    <BtnNuevoMobile
                        type="button"
                        onClick={() => setIsModalCrearOpen(true)}
                        title="Nueva Nota de Deuda"
                    >
                        <FaPlus />
                    </BtnNuevoMobile>
                </TituloFilaHeader>

                <BotoneraHeader>
                    <BtnNuevaNota onClick={() => setIsModalCrearOpen(true)}>
                        <FaPlus /> Nueva Nota de Deuda
                    </BtnNuevaNota>
                </BotoneraHeader>
            </HeaderPrincipal>

            {/* RESUMEN FINANCIERO PRIORITARIO */}
            <KpiGrid>
                <KpiCard>
                    <KpiIcono $bg="rgba(83, 59, 143, 0.12)" $color="var(--colorMorado)">
                        <FaMoneyBillWave />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Total Prestado</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.totalPrestado)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(40, 167, 69, 0.12)" $color="#28a745">
                        <FaCoins />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Total Cobrado</KpiTitulo>
                        <KpiValor style={{ color: "#28a745" }}>{fnFormatMoney(kpis.totalCobrado)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(243, 156, 18, 0.12)" $color="#f39c12">
                        <FaClock />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Saldo Pendiente</KpiTitulo>
                        <KpiValor style={{ color: kpis.totalPendiente > 0 ? "#d35400" : "#1a1a2e" }}>
                            {fnFormatMoney(kpis.totalPendiente)}
                        </KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(0, 136, 254, 0.12)" $color="#0088FE">
                        <FaStickyNote />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Notas Activas</KpiTitulo>
                        <KpiValor>{kpis.conteoPendientes}</KpiValor>
                    </KpiContenido>
                </KpiCard>
            </KpiGrid>

            {/* 📌 RECORDATORIOS ACTIVOS DE 1 CLIC */}
            {recordatorios.length > 0 && (
                <SeccionRecordatorios>
                    <HeaderRecordatorios>
                        <TituloRecordatorios>
                            <FaBell /> Recordatorios de Cobro Activos ({recordatorios.length})
                        </TituloRecordatorios>
                        <span style={{ fontSize: 11, color: "#666" }}>
                            Registra el abono directamente en 1 clic
                        </span>
                    </HeaderRecordatorios>

                    <GridRecordatorios>
                        {recordatorios.map((rec, idx) => (
                            <CardRecordatorio key={idx}>
                                <RecordatorioInfo>
                                    <RecordatorioNombre>{rec.titulo}</RecordatorioNombre>
                                    <RecordatorioMonto>{fnFormatMoney(rec.montoSugerido)}</RecordatorioMonto>
                                    <RecordatorioDetalle>
                                        <FaClock /> Próximo pago: {formatFechaLegible(rec.fecha)}
                                        {rec.diasAtraso > 0 && (
                                            <BadgeVencido>Vencido · {rec.diasAtraso} {rec.diasAtraso === 1 ? "día" : "días"}</BadgeVencido>
                                        )}
                                    </RecordatorioDetalle>
                                </RecordatorioInfo>

                                <BtnCobrarRecordatorio
                                    onClick={() => handleAbrirAbono(rec.prestamo, rec.montoSugerido, rec.fecha)}
                                    title="Registrar abono para esta fecha"
                                >
                                    <FaBolt /> Cobrar
                                </BtnCobrarRecordatorio>
                            </CardRecordatorio>
                        ))}
                    </GridRecordatorios>
                </SeccionRecordatorios>
            )}

            {/* 🔍 FILTROS Y BÚSQUEDA */}
            <BarraControles>
                <GrupoFiltros>
                    <PillFiltro
                        $activo={filtroEstado === "todos"}
                        onClick={() => setFiltroEstado("todos")}
                    >
                        Todas ({kpis.totalNotas})
                    </PillFiltro>
                    <PillFiltro
                        $activo={filtroEstado === "pendientes"}
                        onClick={() => setFiltroEstado("pendientes")}
                    >
                        Pendientes ({kpis.conteoPendientes})
                    </PillFiltro>
                    <PillFiltro
                        $activo={filtroEstado === "liquidados"}
                        onClick={() => setFiltroEstado("liquidados")}
                    >
                        Liquidadas ({kpis.conteoLiquidados})
                    </PillFiltro>
                </GrupoFiltros>

                <InputBuscadorWrapper>
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Buscar por deudor o notas..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </InputBuscadorWrapper>
            </BarraControles>

            {esAdmin && (
                <BarraAdmin>
                    <AdminSelection>
                        <FaUsers />
                        {seleccionados.length} seleccionados
                        <BadgeAdmin>Administración</BadgeAdmin>
                    </AdminSelection>
                    <SearchableCollaboratorSelect
                        usuarios={colaboradores}
                        value={colaboradoresEnBloque}
                        multiple
                        placeholder="Asignar colaboradores a la selección..."
                        onChange={setColaboradoresEnBloque}
                    />
                    <AdminActions>
                        <BtnAdmin type="button" onClick={seleccionarVisibles} disabled={notasFiltradas.length === 0}>
                            <FaCheckSquare /> Seleccionar visibles
                        </BtnAdmin>
                        <BtnAdmin type="button" onClick={limpiarSeleccion} disabled={seleccionados.length === 0}>
                            <FaTimes /> Limpiar
                        </BtnAdmin>
                        <BtnAdmin type="button" $primary onClick={guardarAsignacionEnBloque} disabled={guardandoBloque || seleccionados.length === 0 || colaboradoresEnBloque.length === 0}>
                            {guardandoBloque ? "Guardando..." : "Aplicar"}
                        </BtnAdmin>
                    </AdminActions>
                </BarraAdmin>
            )}

            {/* 🗂️ GRID DE NOTAS DE DEUDA */}
            {cargando ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
                    Cargando notas de cobranza...
                </div>
            ) : notasFiltradas.length === 0 && prestamos.length > 0 ? (
                <EstadoVacio>
                    <FaSearch style={{ fontSize: 32, color: "var(--colorMorado)", opacity: 0.5, marginBottom: 12 }} />
                    <h3 style={{ margin: "0 0 8px", color: "var(--colorMorado)" }}>Sin coincidencias</h3>
                    <p style={{ margin: "0 0 16px", color: "#666", fontSize: 13 }}>
                        Ninguna nota coincide con la búsqueda o el filtro actual.
                    </p>
                    <BtnNuevaNota
                        onClick={() => { setBusqueda(""); setFiltroEstado("todos"); }}
                        style={{ display: "inline-flex" }}
                    >
                        Limpiar filtros
                    </BtnNuevaNota>
                </EstadoVacio>
            ) : notasFiltradas.length === 0 ? (
                <EstadoVacio>
                    <FaStickyNote style={{ fontSize: 40, color: "var(--colorMorado)", opacity: 0.5, marginBottom: 12 }} />
                    <h3 style={{ margin: "0 0 8px", color: "var(--colorMorado)" }}>No hay notas de deuda para mostrar</h3>
                    <p style={{ margin: "0 0 16px", color: "#666", fontSize: 13 }}>
                        Crea una nueva nota de cobranza con solo el nombre y el monto prestado.
                    </p>
                    <BtnNuevaNota onClick={() => setIsModalCrearOpen(true)} style={{ display: "inline-flex" }}>
                        <FaPlus /> Crear Primera Nota
                    </BtnNuevaNota>
                </EstadoVacio>
            ) : (
                <TablaShell>
                    <TablaNotas aria-label="Listado financiero de notas de deuda">
                        <TablaCabecera>
                            <tr>
                                <th>Deudor</th>
                                <th>Tipo</th>
                                <th>Próximo pago</th>
                                <th>Saldo pendiente</th>
                                <th>Prestado</th>
                                <th>Abonado</th>
                                <th>Estado</th>
                                <th>Acción</th>
                            </tr>
                        </TablaCabecera>
                        <tbody>
                            {notasFiltradas.map((prestamo) => (
                                <CardNotaDeuda
                                    key={prestamo.id}
                                    prestamo={prestamo}
                                    uid={prestamo.ownerUid || usuario?.uid}
                                    modoTabla
                                    tipoLabel={obtenerTipoPrestamo(prestamo)}
                                    proximoPago={obtenerProximoPago(prestamo)}
                                    onAbrirAbono={(p) => handleAbrirAbono(p)}
                                    onEditarNota={(p) => {
                                        setPrestamoAEditar(p);
                                        setIsModalEditarOpen(true);
                                    }}
                                    onNotaActualizada={handleNotaActualizada}
                                    onNotaEliminada={handleNotaEliminada}
                                    onEditarAbono={(p, pago) => {
                                        setPrestamoParaAbono(p);
                                        setPagoAEditar(pago);
                                        setIsModalAbonoOpen(true);
                                    }}
                                    esAdmin={esAdmin}
                                    seleccionado={seleccionados.includes(prestamo.id)}
                                    onToggleSeleccion={() => toggleSeleccion(prestamo.id)}
                                />
                            ))}
                        </tbody>
                    </TablaNotas>
                </TablaShell>
            )}

            {/* ── MODALES ── */}
            <ModalCrearNotaDeuda
                isOpen={isModalCrearOpen}
                onClose={() => setIsModalCrearOpen(false)}
                uid={usuario?.uid}
                onNotaCreada={(nueva) => actualizarPrestamos((prev) => [nueva, ...prev])}
            />

            <ModalRegistrarAbono
                isOpen={isModalAbonoOpen}
                onClose={() => {
                    setIsModalAbonoOpen(false);
                    setPagoAEditar(null);
                }}
                prestamo={prestamoParaAbono}
                montoSugerido={montoAbonoSugerido}
                fechaSugerida={fechaAbonoSugerida}
                uid={prestamoParaAbono?.ownerUid || usuario?.uid}
                onAbonoRegistrado={handleAbonoGuardado}
                pagoAEditar={pagoAEditar}
                onAbonoEditado={handleNotaActualizada}
            />

            <ModalEditarPrestamo
                isOpen={isModalEditarOpen}
                onClose={() => setIsModalEditarOpen(false)}
                prestamo={prestamoAEditar}
                uid={prestamoAEditar?.ownerUid || usuario?.uid}
                onPrestamoActualizado={handleNotaActualizada}
                esAdmin={esAdmin}
            />
        </PaginaContenedor>
    );
};
