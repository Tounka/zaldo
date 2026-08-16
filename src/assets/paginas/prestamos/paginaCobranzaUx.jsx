import styled, { keyframes } from "styled-components";
import { useEffect, useState, useMemo } from "react";
import {
    FaSearch,
    FaPlus,
    FaCalendarAlt,
    FaHandHoldingUsd,
    FaMoneyBillWave,
    FaExchangeAlt,
    FaUserCheck,
    FaUserTie,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerTodosPrestamos,
    sincronizarPrestamosIniciales,
} from "../../funciones/firebase/prestamos";
import {
    formatDateToYYYYMMDD,
    generarOrdenesDeCobro,
    fnFormatMoney,
    calcularMontoSinTransferir,
    calcularTotalPagado,
} from "../../funciones/prestamosCalculos";
import { CardOrdenCobro } from "./cardOrdenCobro";
import { ModalNuevoPrestamoCobranza } from "./modalNuevoPrestamoCobranza";
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
  gap: 22px;
  animation: ${fadeUp} 0.35s ease;
  padding-bottom: 40px;
`;

const HeaderCobranza = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
`;

const TituloGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BadgeAdmin = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--colorMorado);
  background: rgba(83, 59, 143, 0.1);
  padding: 4px 10px;
  border-radius: 8px;
  width: fit-content;
`;

const BadgeCobradora = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.12);
  padding: 4px 10px;
  border-radius: 8px;
  width: fit-content;
`;

const BtnNuevoPrestamo = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(83, 59, 143, 0.25);
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: translateY(-1px);
  }
`;

/* ================= KPIs / RESUMEN ================= */

const KpiGrid = styled.div`
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

const KpiCard = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
`;

const KpiIcono = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg || "rgba(83, 59, 143, 0.1)"};
  color: ${({ $color }) => $color || "var(--colorMorado)"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const KpiContenido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const KpiTitulo = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.4px;
`;

const KpiValor = styled.span`
  font-size: 17px;
  font-weight: 800;
  color: #1a1a2e;
`;

/* ================= BARRA DE BÚSQUEDA Y FILTROS ================= */

const BarraHerramientas = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FilaControles = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const BuscadorInputWrapper = styled.div`
  flex: 1;
  min-width: 240px;
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 14px;
    color: #888;
    font-size: 14px;
  }
`;

const InputBuscador = styled.input`
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #1a1a2e;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const SelectorFechaWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const BtnFechaRapida = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.2)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "transparent")};
  color: ${({ $activo }) => ($activo ? "white" : "var(--colorMorado)")};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.08)")};
  }
`;

const InputFecha = styled.input`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const PestanasFiltro = styled.div`
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  padding-top: 12px;
  overflow-x: auto;
`;

const TabBoton = styled.button`
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.15)" : "transparent")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#777")};
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(83, 59, 143, 0.1);
  }
`;

/* ================= GRID DE ÓRDENES ================= */

const GridOrdenes = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const EstadoVacio = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
  background: white;
  border-radius: 16px;
  border: 1px dashed rgba(83, 59, 143, 0.2);

  svg {
    font-size: 44px;
    color: var(--colorMorado);
    opacity: 0.5;
  }
`;

export const PaginaCobranzaUx = () => {
    const { usuario } = useAppStore();
    const [prestamos, setPrestamos] = useState([]);
    const [cargando, setCargando] = useState(true);

    const hoyStr = formatDateToYYYYMMDD(new Date());
    const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
    const [filtroTexto, setFiltroTexto] = useState("");
    const [tabFiltro, setTabFiltro] = useState("fecha"); // "fecha" | "todos" | "sin_transferir"

    // Modales
    const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
    const [prestamoAEditar, setPrestamoAEditar] = useState(null);

    const esAdmin = usuario?.admin === true || usuario?.nombres?.includes("Luis Ramon");

    /* ── Cargar Préstamos con filtro de asignación ── */
    const cargarPrestamos = async () => {
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
    };

    useEffect(() => {
        cargarPrestamos();
    }, [usuario]);

    /* ── Cálculo de Órdenes para la fecha seleccionada ── */
    const ordenesDelDia = useMemo(() => {
        return generarOrdenesDeCobro(prestamos, fechaSeleccionada);
    }, [prestamos, fechaSeleccionada]);

    /* ── Cálculo de Totales KPIs ── */
    const kpis = useMemo(() => {
        let totalCobradoFecha = 0;
        let totalEsperadoFecha = 0;
        let totalPendienteTransferir = 0;
        let totalDeudaActiva = 0;

        ordenesDelDia.forEach((ord) => {
            totalEsperadoFecha += ord.montoSugerido;
            if (ord.yaPago) {
                totalCobradoFecha += ord.montoCobrado;
            }
        });

        prestamos.forEach((p) => {
            const pagado = calcularTotalPagado(p.pagos);
            const deuda = Math.max(0, Number(p.montoPrestado || 0) - pagado);
            totalDeudaActiva += deuda;
            totalPendienteTransferir += calcularMontoSinTransferir(p.pagos);
        });

        return {
            totalCobradoFecha,
            totalEsperadoFecha,
            totalPendienteTransferir,
            totalDeudaActiva,
        };
    }, [ordenesDelDia, prestamos]);

    /* ── Filtrado según pestaña y buscador ── */
    const ordenesFiltradas = useMemo(() => {
        let lista = [];

        if (tabFiltro === "fecha") {
            lista = ordenesDelDia;
        } else if (tabFiltro === "sin_transferir") {
            lista = prestamos
                .filter((p) => (p.pagos || []).some((pago) => pago.transferidoAlAdmin === false))
                .map((p) => {
                    const pagoSinTransferir = (p.pagos || []).find((pago) => pago.transferidoAlAdmin === false);
                    return {
                        prestamoId: p.id,
                        prestamo: p,
                        nombreDeudor: p.nombre,
                        montoPrestado: Number(p.montoPrestado || 0),
                        totalPagado: calcularTotalPagado(p.pagos),
                        deudaPendiente: Math.max(0, Number(p.montoPrestado || 0) - calcularTotalPagado(p.pagos)),
                        montoSugerido: Number(p.abonoTeorico || 0),
                        montoCobrado: Number(pagoSinTransferir?.monto || 0),
                        pagoId: pagoSinTransferir?.id || null,
                        pagoRegistrado: pagoSinTransferir,
                        numeroPago: pagoSinTransferir?.numeroPago || 1,
                        totalPagosEstimados: p.numPagos || null,
                        diasAtraso: pagoSinTransferir?.diasAtraso || 0,
                        atrasado: (pagoSinTransferir?.diasAtraso || 0) > 0,
                        fechaOrden: pagoSinTransferir?.ordenFecha || formatDateToYYYYMMDD(pagoSinTransferir?.fecha) || hoyStr,
                        yaPago: true,
                        transferidoAlAdmin: false,
                        estadoOrden: "cobrado_sin_transferir",
                    };
                });
        } else if (tabFiltro === "todos") {
            lista = prestamos.map((p) => {
                const totalPag = calcularTotalPagado(p.pagos);
                return {
                    prestamoId: p.id,
                    prestamo: p,
                    nombreDeudor: p.nombre,
                    montoPrestado: Number(p.montoPrestado || 0),
                    totalPagado: totalPag,
                    deudaPendiente: Math.max(0, Number(p.montoPrestado || 0) - totalPag),
                    montoSugerido: Number(p.abonoTeorico || 0),
                    montoCobrado: 0,
                    pagoId: null,
                    pagoRegistrado: null,
                    numeroPago: (p.pagos || []).length + 1,
                    totalPagosEstimados: p.numPagos || null,
                    diasAtraso: 0,
                    atrasado: false,
                    fechaOrden: fechaSeleccionada,
                    yaPago: false,
                    transferidoAlAdmin: false,
                    estadoOrden: "pendiente",
                };
            });
        }

        if (filtroTexto.trim()) {
            const query = filtroTexto.toLowerCase();
            lista = lista.filter((ord) =>
                ord.nombreDeudor?.toLowerCase().includes(query)
            );
        }

        return lista;
    }, [tabFiltro, ordenesDelDia, prestamos, filtroTexto, fechaSeleccionada, hoyStr]);

    /* ── Fechas rápidas ── */
    const setFechaHoy = () => setFechaSeleccionada(hoyStr);
    const setFechaAyer = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setFechaSeleccionada(formatDateToYYYYMMDD(d));
    };
    const setFechaManana = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        setFechaSeleccionada(formatDateToYYYYMMDD(d));
    };

    return (
        <PaginaContenedor>
            {/* ── HEADER SUPERIOR ── */}
            <HeaderCobranza>
                <TituloGrupo>
                    <H2 size="22px" color="var(--colorMorado)">
                        Cobranza de Préstamos
                    </H2>
                    {esAdmin ? (
                        <BadgeAdmin>
                            <FaUserCheck /> Administrador / Supervisor
                        </BadgeAdmin>
                    ) : (
                        <BadgeCobradora>
                            <FaUserTie /> Cobranza Asignada
                        </BadgeCobradora>
                    )}
                </TituloGrupo>

                <BtnNuevoPrestamo onClick={() => setIsModalNuevoOpen(true)}>
                    <FaPlus /> Nuevo Préstamo
                </BtnNuevoPrestamo>
            </HeaderCobranza>

            {/* ── TARJETAS DE KPIs ── */}
            <KpiGrid>
                <KpiCard>
                    <KpiIcono $bg="rgba(83, 59, 143, 0.1)" $color="var(--colorMorado)">
                        <FaCalendarAlt />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Cobro Esperado</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.totalEsperadoFecha)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(40, 167, 69, 0.12)" $color="#28a745">
                        <FaMoneyBillWave />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Cobrado en Fecha</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.totalCobradoFecha)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(255, 152, 0, 0.12)" $color="#e65100">
                        <FaExchangeAlt />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Pendiente de Transferir a Luis</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.totalPendienteTransferir)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(33, 150, 243, 0.12)" $color="#1976d2">
                        <FaHandHoldingUsd />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Deuda Activa Total</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.totalDeudaActiva)}</KpiValor>
                    </KpiContenido>
                </KpiCard>
            </KpiGrid>

            {/* ── BARRA DE BÚSQUEDA Y CALENDARIO ── */}
            <BarraHerramientas>
                <FilaControles>
                    <BuscadorInputWrapper>
                        <FaSearch />
                        <InputBuscador
                            type="text"
                            placeholder="Buscar deudor por nombre..."
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                        />
                    </BuscadorInputWrapper>

                    <SelectorFechaWrapper>
                        <BtnFechaRapida
                            $activo={fechaSeleccionada === hoyStr}
                            onClick={setFechaHoy}
                        >
                            Hoy
                        </BtnFechaRapida>
                        <BtnFechaRapida onClick={setFechaAyer}>Ayer</BtnFechaRapida>
                        <BtnFechaRapida onClick={setFechaManana}>Mañana</BtnFechaRapida>
                        <InputFecha
                            type="date"
                            value={fechaSeleccionada}
                            onChange={(e) => setFechaSeleccionada(e.target.value)}
                        />
                    </SelectorFechaWrapper>
                </FilaControles>

                <PestanasFiltro>
                    <TabBoton
                        $activo={tabFiltro === "fecha"}
                        onClick={() => setTabFiltro("fecha")}
                    >
                        Órdenes de {fechaSeleccionada === hoyStr ? "Hoy" : fechaSeleccionada} ({ordenesDelDia.length})
                    </TabBoton>

                    <TabBoton
                        $activo={tabFiltro === "sin_transferir"}
                        onClick={() => setTabFiltro("sin_transferir")}
                    >
                        Cobrado pendiente de transferir
                    </TabBoton>

                    <TabBoton
                        $activo={tabFiltro === "todos"}
                        onClick={() => setTabFiltro("todos")}
                    >
                        Todos los Préstamos Activos ({prestamos.length})
                    </TabBoton>
                </PestanasFiltro>
            </BarraHerramientas>

            {/* ── LISTADO DE ÓRDENES ── */}
            {cargando ? (
                <TxtGenerico color="var(--colorMorado)" align="center">
                    Cargando órdenes de cobranza...
                </TxtGenerico>
            ) : ordenesFiltradas.length === 0 ? (
                <EstadoVacio>
                    <FaHandHoldingUsd />
                    <TxtGenerico color="var(--colorMorado)" weight="bold" size="16px">
                        {filtroTexto
                            ? `No se encontraron deudores que coincidan con "${filtroTexto}"`
                            : tabFiltro === "sin_transferir"
                                ? "No hay dinero pendiente de transferir a Luis."
                                : `No hay órdenes de pago programadas para el ${fechaSeleccionada}.`}
                    </TxtGenerico>
                    <TxtGenerico size="13px" color="#777">
                        Puedes usar el selector de fecha o registrar un nuevo préstamo.
                    </TxtGenerico>
                </EstadoVacio>
            ) : (
                <GridOrdenes>
                    {ordenesFiltradas.map((ord) => (
                        <CardOrdenCobro
                            key={`${ord.prestamoId}_${ord.fechaOrden}`}
                            orden={ord}
                            uid={usuario.uid}
                            esAdmin={esAdmin}
                            onOrdenActualizada={cargarPrestamos}
                            onEditarPrestamo={(p) => setPrestamoAEditar(p)}
                        />
                    ))}
                </GridOrdenes>
            )}

            {/* ── MODALES ── */}
            <ModalNuevoPrestamoCobranza
                isOpen={isModalNuevoOpen}
                onClose={() => setIsModalNuevoOpen(false)}
                uid={usuario?.uid}
                onPrestamoCreado={cargarPrestamos}
            />

            {prestamoAEditar && (
                <ModalEditarPrestamo
                    isOpen={!!prestamoAEditar}
                    onClose={() => setPrestamoAEditar(null)}
                    prestamo={prestamoAEditar}
                    uid={usuario?.uid}
                    onPrestamoActualizado={cargarPrestamos}
                />
            )}
        </PaginaContenedor>
    );
};
