import styled, { keyframes } from "styled-components";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    FaPlus,
    FaSearch,
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
import Swal from "sweetalert2";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const PaginaContenedor = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: ${fadeUp} 0.35s ease;
  padding-bottom: 32px;
`;

/* ================= ENCABEZADO ================= */

const Encabezado = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  h1 {
    margin: 0;
    color: #2d2450;
    font-size: 26px;
    font-weight: 850;
    letter-spacing: -0.03em;
  }

  p {
    margin: 2px 0 0;
    color: #7a7090;
    font-size: 13px;
  }
`;

const BtnNuevo = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: var(--colorMorado);
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(83, 59, 143, 0.25);
  transition: transform 0.15s ease, background 0.15s ease;
  flex-shrink: 0;

  &:hover { background: #45307a; transform: translateY(-1px); }
  &:focus-visible { outline: 2px solid var(--colorMorado); outline-offset: 2px; }

  @media (max-width: 560px) {
    width: 44px;
    padding: 0;
    justify-content: center;

    span { display: none; }
  }
`;

/* ================= RESUMEN ================= */

const Resumen = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 22px;
  padding: 22px 24px;
  border-radius: 22px;
  color: #ffffff;
  background:
    radial-gradient(circle at 90% 0%, rgba(180, 148, 241, 0.45), transparent 50%),
    linear-gradient(135deg, #3d2a6e 0%, #533b8f 55%, #6a4fb0 100%);
  box-shadow: 0 18px 40px -18px rgba(53, 34, 99, 0.6);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 18px;
  }
`;

const ResumenPrincipal = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;

  small {
    color: rgba(255, 255, 255, 0.75);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  strong {
    font-size: clamp(30px, 5vw, 42px);
    font-weight: 850;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
`;

const PistaResumen = styled.div`
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    width: ${({ $porcentaje }) => `${Math.min(100, Math.max(0, $porcentaje))}%`};
    border-radius: inherit;
    background: linear-gradient(90deg, #8ff0b8, #34c27a);
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const TextoAvance = styled.span`
  color: rgba(255, 255, 255, 0.85);
  font-size: 12.5px;
  font-weight: 600;
`;

const ResumenCifras = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  align-self: center;

  div {
    padding: 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.16);
    min-width: 0;
  }

  dt {
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  dd {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

/* ================= PRÓXIMOS COBROS ================= */

const SeccionCobros = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CabeceraSeccion = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #2d2450;
    font-size: 15px;
    font-weight: 850;
  }

  h2 span {
    padding: 1px 8px;
    border-radius: 999px;
    background: #ede7fb;
    color: var(--colorMorado);
    font-size: 11px;
  }
`;

const BtnTexto = styled.button`
  border: none;
  background: none;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  padding: 6px 4px;

  &:hover { text-decoration: underline; text-underline-offset: 3px; }
`;

const TiraCobros = styled.div`
  display: ${({ $todos }) => ($todos ? "grid" : "flex")};
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  overflow-x: ${({ $todos }) => ($todos ? "visible" : "auto")};
  scroll-snap-type: x mandatory;
  padding: 2px 2px 6px;
  scrollbar-width: thin;
`;

const CardCobro = styled.article`
  flex: 0 0 230px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid ${({ $vencido }) => ($vencido ? "rgba(220, 53, 69, 0.3)" : "rgba(83, 59, 143, 0.12)")};
  box-shadow: 0 4px 14px rgba(52, 37, 81, 0.05);
  min-width: 0;

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  h3 {
    margin: 0;
    color: #24202d;
    font-size: 13px;
    font-weight: 850;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #2d2450;
    font-size: 22px;
    font-weight: 850;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
`;

const ChipFecha = styled.span`
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
  background: ${({ $tono }) => ({ vencido: "rgba(220, 53, 69, 0.1)", hoy: "rgba(243, 156, 18, 0.14)" }[$tono] || "#f1edfa")};
  color: ${({ $tono }) => ({ vencido: "#b02a37", hoy: "#a0620b" }[$tono] || "#6a5a8e")};
`;

const BtnCobrar = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  border: none;
  border-radius: 10px;
  background: #28a745;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover { background: #218838; transform: translateY(-1px); }
  &:focus-visible { outline: 2px solid #28a745; outline-offset: 2px; }
`;

/* ================= CONTROLES ================= */

const BarraControles = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const Segmentos = styled.div`
  display: inline-flex;
  padding: 4px;
  gap: 2px;
  border-radius: 12px;
  background: #efebf8;
  overflow-x: auto;
  max-width: 100%;
`;

const Segmento = styled.button`
  padding: 7px 14px;
  border: none;
  border-radius: 9px;
  background: ${({ $activo }) => ($activo ? "#ffffff" : "transparent")};
  color: ${({ $activo }) => ($activo ? "#2d2450" : "#7a7090")};
  box-shadow: ${({ $activo }) => ($activo ? "0 2px 6px rgba(52, 37, 81, 0.12)" : "none")};
  font-size: 12.5px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  span {
    margin-left: 4px;
    color: #a198b5;
    font-weight: 700;
  }
`;

const GrupoDerecha = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 260px;
  justify-content: flex-end;
`;

const InputBuscadorWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 12px;
  flex: 1;
  max-width: 340px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
  }

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

  @media (max-width: 560px) {
    max-width: none;
  }
`;

/* ================= LISTA ================= */

const Lista = styled.section`
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 5px 18px rgba(52, 37, 81, 0.045);
  overflow: hidden;
`;

const EstadoVacio = styled.div`
  padding: 48px 20px;
  text-align: center;
  color: #888;
  background: white;
  border: 1px dashed rgba(83, 59, 143, 0.2);
  border-radius: 18px;

  h3 { margin: 0 0 8px; color: var(--colorMorado); }
  p { margin: 0 0 16px; color: #666; font-size: 13px; }
`;

/* ================= ADMINISTRACIÓN ================= */

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
  white-space: nowrap;
  cursor: pointer;
  transition: all .15s ease;

  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(83, 59, 143, 0.14); }
  &:disabled { opacity: .45; cursor: not-allowed; }
`;

/* Hoy, mañana, en N días o vencido: lo que importa al decidir a quién cobrar. */
const describirFecha = (dias) => {
    if (dias < 0) return { texto: `Vencido · ${-dias} ${dias === -1 ? "día" : "días"}`, tono: "vencido" };
    if (dias === 0) return { texto: "Hoy", tono: "hoy" };
    if (dias === 1) return { texto: "Mañana", tono: "proximo" };
    return { texto: `En ${dias} días`, tono: "proximo" };
};

/* Cuántos cobros se ven antes de "Ver todos". */
const COBROS_VISIBLES = 6;

export const PaginaPrestamosUx = () => {
    const { usuario, setPrestamosCache, invalidarOtraCachePrestamos } = useAppStore();
    const [prestamos, setPrestamos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [busqueda, setBusqueda] = useState("");
    const [mostrarTodosCobros, setMostrarTodosCobros] = useState(false);

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
                // Negativo = vencido hace N días.
                const dias = Math.round((new Date(`${rec.fecha}T12:00:00`) - new Date(`${hoyIso}T12:00:00`)) / 86400000);
                return { ...rec, dias, diasAtraso: Math.max(0, -dias) };
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

    // Cobrado contra lo que se debe en total (capital + interés).
    const totalADeber = kpis.totalCobrado + kpis.totalPendiente;
    const porcentajeCobrado = totalADeber > 0 ? (kpis.totalCobrado / totalADeber) * 100 : 0;
    const cobrosVisibles = mostrarTodosCobros ? recordatorios : recordatorios.slice(0, COBROS_VISIBLES);

    return (
        <PaginaContenedor>
            <Encabezado>
                <div>
                    <h1>Préstamos</h1>
                    <p>Lo que te deben, quién paga pronto y cada abono.</p>
                </div>
                <BtnNuevo data-tour="pres-nueva" type="button" onClick={() => setIsModalCrearOpen(true)} title="Nuevo préstamo">
                    <FaPlus aria-hidden="true" /> <span>Nuevo préstamo</span>
                </BtnNuevo>
            </Encabezado>

            <Resumen data-tour="pres-kpis" aria-label="Resumen de préstamos">
                <ResumenPrincipal>
                    <small>Por cobrar</small>
                    <strong>{fnFormatMoney(kpis.totalPendiente)}</strong>
                    <PistaResumen $porcentaje={porcentajeCobrado}><span /></PistaResumen>
                    <TextoAvance>
                        Cobrado {fnFormatMoney(kpis.totalCobrado)} · {Math.round(porcentajeCobrado)}% del total
                    </TextoAvance>
                </ResumenPrincipal>
                <ResumenCifras>
                    <div>
                        <dt>Prestado</dt>
                        <dd>{fnFormatMoney(kpis.totalPrestado)}</dd>
                    </div>
                    <div>
                        <dt>Cobrado</dt>
                        <dd>{fnFormatMoney(kpis.totalCobrado)}</dd>
                    </div>
                    <div>
                        <dt>Activos</dt>
                        <dd>{kpis.conteoPendientes}</dd>
                    </div>
                </ResumenCifras>
            </Resumen>

            {recordatorios.length > 0 && (
                <SeccionCobros data-tour="pres-recordatorios" aria-labelledby="titulo-cobros">
                    <CabeceraSeccion>
                        <h2 id="titulo-cobros"><FaBell aria-hidden="true" /> Próximos cobros <span>{recordatorios.length}</span></h2>
                        {recordatorios.length > COBROS_VISIBLES && (
                            <BtnTexto type="button" onClick={() => setMostrarTodosCobros((valor) => !valor)}>
                                {mostrarTodosCobros ? "Ver menos" : `Ver todos (${recordatorios.length})`}
                            </BtnTexto>
                        )}
                    </CabeceraSeccion>
                    <TiraCobros $todos={mostrarTodosCobros}>
                        {cobrosVisibles.map((rec) => {
                            const fecha = describirFecha(rec.dias);
                            return (
                                <CardCobro key={`${rec.prestamo.id}-${rec.fecha}`} $vencido={rec.dias < 0}>
                                    <header>
                                        <h3 title={rec.titulo}>{rec.titulo}</h3>
                                        <ChipFecha $tono={fecha.tono} title={formatFechaLegible(rec.fecha)}>{fecha.texto}</ChipFecha>
                                    </header>
                                    <strong>{fnFormatMoney(rec.montoSugerido)}</strong>
                                    <BtnCobrar
                                        type="button"
                                        onClick={() => handleAbrirAbono(rec.prestamo, rec.montoSugerido, rec.fecha)}
                                        title="Registrar abono para esta fecha"
                                    >
                                        <FaBolt aria-hidden="true" /> Cobrar
                                    </BtnCobrar>
                                </CardCobro>
                            );
                        })}
                    </TiraCobros>
                </SeccionCobros>
            )}

            <BarraControles data-tour="pres-filtros">
                <Segmentos role="tablist" aria-label="Filtrar préstamos">
                    {[
                        { id: "todos", texto: "Todos", cuenta: kpis.totalNotas },
                        { id: "pendientes", texto: "Pendientes", cuenta: kpis.conteoPendientes },
                        { id: "liquidados", texto: "Liquidados", cuenta: kpis.conteoLiquidados },
                    ].map((filtro) => (
                        <Segmento
                            key={filtro.id}
                            type="button"
                            role="tab"
                            aria-selected={filtroEstado === filtro.id}
                            $activo={filtroEstado === filtro.id}
                            onClick={() => setFiltroEstado(filtro.id)}
                        >
                            {filtro.texto}<span>{filtro.cuenta}</span>
                        </Segmento>
                    ))}
                </Segmentos>

                <GrupoDerecha>
                    <InputBuscadorWrapper>
                        <FaSearch aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Buscar por nombre o notas..."
                            aria-label="Buscar préstamos"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </InputBuscadorWrapper>
                    {esAdmin && (
                        <BtnAdmin type="button" onClick={seleccionarVisibles} disabled={notasFiltradas.length === 0} title="Seleccionar los préstamos visibles para asignarlos">
                            <FaCheckSquare aria-hidden="true" /> Seleccionar
                        </BtnAdmin>
                    )}
                </GrupoDerecha>
            </BarraControles>

            {/* La asignación masiva solo aparece cuando hay algo seleccionado. */}
            {esAdmin && seleccionados.length > 0 && (
                <BarraAdmin>
                    <AdminSelection>
                        <FaUsers aria-hidden="true" />
                        {seleccionados.length} seleccionados
                    </AdminSelection>
                    <SearchableCollaboratorSelect
                        usuarios={colaboradores}
                        value={colaboradoresEnBloque}
                        multiple
                        placeholder="Asignar colaboradores a la selección..."
                        onChange={setColaboradoresEnBloque}
                    />
                    <AdminActions>
                        <BtnAdmin type="button" onClick={limpiarSeleccion}>
                            <FaTimes aria-hidden="true" /> Limpiar
                        </BtnAdmin>
                        <BtnAdmin type="button" $primary onClick={guardarAsignacionEnBloque} disabled={guardandoBloque || colaboradoresEnBloque.length === 0}>
                            {guardandoBloque ? "Guardando..." : "Aplicar"}
                        </BtnAdmin>
                    </AdminActions>
                </BarraAdmin>
            )}

            {cargando ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
                    Cargando préstamos...
                </div>
            ) : notasFiltradas.length === 0 && prestamos.length > 0 ? (
                <EstadoVacio>
                    <FaSearch style={{ fontSize: 32, color: "var(--colorMorado)", opacity: 0.5, marginBottom: 12 }} />
                    <h3>Sin coincidencias</h3>
                    <p>Ningún préstamo coincide con la búsqueda o el filtro actual.</p>
                    <BtnNuevo type="button" onClick={() => { setBusqueda(""); setFiltroEstado("todos"); }} style={{ display: "inline-flex", width: "auto", padding: "0 18px" }}>
                        Limpiar filtros
                    </BtnNuevo>
                </EstadoVacio>
            ) : notasFiltradas.length === 0 ? (
                <EstadoVacio>
                    <FaHandHoldingUsd style={{ fontSize: 40, color: "var(--colorMorado)", opacity: 0.5, marginBottom: 12 }} />
                    <h3>Aún no hay préstamos</h3>
                    <p>Registra uno con solo el nombre y el monto prestado.</p>
                    <BtnNuevo type="button" onClick={() => setIsModalCrearOpen(true)} style={{ display: "inline-flex", width: "auto", padding: "0 18px" }}>
                        <FaPlus aria-hidden="true" /> Registrar el primero
                    </BtnNuevo>
                </EstadoVacio>
            ) : (
                <Lista data-tour="pres-tabla" aria-label="Préstamos">
                    {notasFiltradas.map((prestamo) => (
                        <CardNotaDeuda
                            key={prestamo.id}
                            prestamo={prestamo}
                            uid={prestamo.ownerUid || usuario?.uid}
                            modoLista
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
                </Lista>
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
