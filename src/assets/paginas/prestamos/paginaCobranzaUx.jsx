import styled, { keyframes } from "styled-components";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
    FaPlus,
    FaMoneyBillWave,
    FaClock,
    FaCheckCircle,
    FaSearch,
    FaFilter,
    FaCalendarCheck,
    FaCoins,
    FaStickyNote,
    FaBell,
    FaBolt,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerTodosPrestamos,
    sincronizarPrestamosIniciales,
} from "../../funciones/firebase/prestamos";
import { fnFormatMoney, formatFechaLegible } from "../../funciones/prestamosCalculos";
import { obtenerProximoPago, obtenerTipoPrestamo } from "../../funciones/prestamosPresentacion";
import { CardNotaDeuda } from "./cardNotaDeuda";
import { ModalCrearNotaDeuda } from "./modalCrearNotaDeuda";
import { ModalRegistrarAbono } from "./modalRegistrarAbono";
import { ModalEditarPrestamo } from "./modalEditarPrestamo";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";

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
  padding-bottom: 28px;
`;

const HeaderPrincipal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 52px;
`;

const TituloGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const BtnNuevaNota = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 9px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(83, 59, 143, 0.25);
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: translateY(-1px);
  }
`;

/* ================= RECORDATORIOS INTERACTIVOS ================= */

const SeccionRecordatorios = styled.div`
  background: linear-gradient(135deg, rgba(83, 59, 143, 0.07), rgba(0, 196, 159, 0.06));
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 14px;
  padding: 13px 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const HeaderRecordatorios = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`;

const TituloRecordatorios = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--colorMorado);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GridRecordatorios = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const CardRecordatorio = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 11px;
  padding: 11px 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 3px 8px;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
`;

const RecordatorioInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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
  font-size: 10px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RecordatorioMonto = styled.strong`
  grid-column: 1;
  color: #30244a;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 19px;
  line-height: 1.1;
  letter-spacing: -.04em;
`;

const BtnCobrarRecordatorio = styled.button`
  grid-column: 2;
  grid-row: 1 / span 2;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
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
  gap: 9px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 11px;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
`;

const KpiIcono = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
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
  font-size: 9px;
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
`;

const GrupoFiltros = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
`;

const PillFiltro = styled.button`
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "white")};
  color: ${({ $activo }) => ($activo ? "white" : "#555")};
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
  border-radius: 8px;
  padding: 5px 10px;
  min-width: 220px;

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
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(52, 37, 81, 0.045);
`;

const TablaNotas = styled.table`
  width: 100%;
  min-width: 1040px;
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

export const PaginaCobranzaUx = () => {
    const { usuario } = useAppStore();
    const [prestamos, setPrestamos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "pendientes" | "liquidados"
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
    const esAdmin = usuario?.admin === true;

    /* ── Cargar Préstamos ── */
    const cargarPrestamos = useCallback(async () => {
        if (!usuario?.uid) return;
        setCargando(true);
        try {
            const email = (usuario.correo || usuario.email || "").toLowerCase();
            const esUsuarioLuis = email.includes("luisarraca") || email.includes("luisydiego") || usuario.admin === true;

            if (esUsuarioLuis) {
                await sincronizarPrestamosIniciales(usuario.uid);
            }

            const data = await obtenerTodosPrestamos(usuario.uid, false, usuario);
            setPrestamos(data);
        } catch (e) {
            console.error("Error al cargar cobranza:", e);
        } finally {
            setCargando(false);
        }
    }, [usuario]);

    useEffect(() => {
        cargarPrestamos();
    }, [cargarPrestamos]);

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
            if (saldo <= 0) return; // Ya liquidado

            // 1. Fechas específicas (ej: 22 de Agosto, 30 de Agosto)
            if (p.tipoPeriodicidad === "fechas_especificas" && p.fechasEspecificas?.[0]) {
                list.push({
                    prestamo: p,
                    titulo: p.nombre,
                    fecha: p.fechasEspecificas[0],
                    montoSugerido: p.abonoTeorico || saldo,
                    detalle: `Pago único pactado (${p.fechasEspecificas[0]})`,
                });
            } else if (p.tipoPeriodicidad === "dias_mes") {
                // Quincenal
                const diaActual = hoy.getDate();
                const proxDia = diaActual <= 15 ? 15 : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
                const mesActual = hoy.getMonth() + 1;
                const anioActual = hoy.getFullYear();
                const fechaProxIso = `${anioActual}-${String(mesActual).padStart(2, "0")}-${String(proxDia).padStart(2, "0")}`;

                list.push({
                    prestamo: p,
                    titulo: p.nombre,
                    fecha: fechaProxIso,
                    montoSugerido: p.abonoTeorico || 500,
                    detalle: `Abono quincenal (${p.abonoTeorico ? fnFormatMoney(p.abonoTeorico) : "$500"})`,
                });
            }
        });

        return list;
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
        setPrestamos((prev) =>
            prev.map((p) =>
                p.id === prestamoId
                    ? { ...p, pagos: [...(p.pagos || []), nuevoPago] }
                    : p
            )
        );
    };

    const handleNotaActualizada = (notaActualizada) => {
        setPrestamos((prev) =>
            prev.map((p) => (p.id === notaActualizada.id ? notaActualizada : p))
        );
    };

    const handleNotaEliminada = (prestamoId) => {
        setPrestamos((prev) => prev.filter((p) => p.id !== prestamoId));
    };

    return (
        <PaginaContenedor>
            {/* HEADER PRINCIPAL */}
            <HeaderPrincipal>
                <TituloGrupo>
                    <H2 size="24px" color="var(--colorMorado)">
                        Cobranza & Notas de Deuda
                    </H2>
                    <TxtGenerico size="12px" color="#746d7d">
                        Control de préstamos, abonos y próximos cobros.
                    </TxtGenerico>
                </TituloGrupo>

                <BtnNuevaNota onClick={() => setIsModalCrearOpen(true)}>
                    <FaPlus /> Nueva Nota de Deuda
                </BtnNuevaNota>
            </HeaderPrincipal>

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
                                    <RecordatorioDetalle>
                                        <FaClock /> Próximo pago: {formatFechaLegible(rec.fecha)}
                                    </RecordatorioDetalle>
                                </RecordatorioInfo>

                                <RecordatorioMonto>{fnFormatMoney(rec.montoSugerido)}</RecordatorioMonto>

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

            {/* 📊 KPIS GENERALES */}
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
                        <KpiValor>{kpis.conteoPendientes} / {kpis.totalNotas}</KpiValor>
                    </KpiContenido>
                </KpiCard>
            </KpiGrid>

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

            {/* 🗂️ TABLA DE NOTAS DE DEUDA */}
            {cargando ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
                    Cargando notas de cobranza...
                </div>
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
                                    uid={usuario?.uid}
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
                onNotaCreada={(nueva) => setPrestamos((prev) => [nueva, ...prev])}
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
                uid={usuario?.uid}
                onAbonoRegistrado={handleAbonoGuardado}
                pagoAEditar={pagoAEditar}
                onAbonoEditado={handleNotaActualizada}
            />

            <ModalEditarPrestamo
                isOpen={isModalEditarOpen}
                onClose={() => setIsModalEditarOpen(false)}
                prestamo={prestamoAEditar}
                uid={usuario?.uid}
                onPrestamoModificado={handleNotaActualizada}
                esAdmin={esAdmin}
            />
        </PaginaContenedor>
    );
};
