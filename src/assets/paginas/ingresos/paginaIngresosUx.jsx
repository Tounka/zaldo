import styled, { keyframes } from "styled-components";
import { useEffect, useState, useMemo } from "react";
import {
    FaPlus,
    FaBuilding,
    FaMoneyBillWave,
    FaChartLine,
    FaFileImport,
    FaEllipsisV,
    FaGripVertical,
    FaEdit,
    FaBolt,
    FaChevronLeft,
    FaChevronRight,
    FaTable,
    FaClock,
    FaCheckCircle,
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
} from "../../funciones/ingresosCalculos";
import { TablaResumenMensual } from "./secciones/tablaResumenMensual";
import { TablaEmpresaPagos } from "./secciones/tablaEmpresaPagos";
import { IngresosAnalitica } from "./secciones/IngresosAnalitica";
import { ModalEmpresa } from "./modales/modalEmpresa";
import { ModalNuevoIngreso } from "./modales/modalNuevoIngreso";
import { ModalImportarIngresos } from "./modales/modalImportarIngresos";
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

const TituloGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  flex-wrap: wrap;

  @media (max-width: 720px) {
    flex: 1 1 auto;
  }

  @media (max-width: 460px) {
    width: 100%;

    button {
      flex: 1 1 0;
      justify-content: center;
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

/* ================= KPIs DINÁMICOS CON GRÁFICAS ================= */

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px 16px 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
  position: relative;
  overflow: hidden;

  @media (max-width: 520px) {
    padding: 13px 13px 8px;
  }
`;

const KpiCabecera = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const KpiIcono = styled.div`
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

const KpiContenido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
`;

const KpiTitulo = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #777;
  letter-spacing: 0.5px;
`;

const KpiValor = styled.span`
  font-size: clamp(16px, 3.4vw, 19px);
  font-weight: 800;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  overflow-wrap: anywhere;
`;

const KpiSubtitulo = styled.span`
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const KpiGraficaWrapper = styled.div`
  width: 100%;
  height: 42px;
  margin-top: -4px;
`;

/* ================= BARRA DE PESTAÑAS PRINCIPALES ================= */

const BarraPestanasWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid rgba(83, 59, 143, 0.08);
  padding-bottom: 2px;
  gap: 8px;

  /*
   * En pantallas chicas las pestañas se apilan sobre el botón de "nueva
   * empresa": si compartieran fila, el scroll horizontal escondería el botón.
   */
  @media (max-width: 620px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
`;

const GrupoTabs = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(83, 59, 143, 0.25);
    border-radius: 3px;
  }
`;

const TabBoton = styled.button`
  padding: 10px 18px;
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
    padding: 9px 13px;
    font-size: 12px;
  }
`;

const DotEmpresa = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color || "var(--colorMorado)"};
  display: inline-block;
`;

const BtnNuevaEmpresaTab = styled.button`
  background: none;
  border: 1px dashed rgba(83, 59, 143, 0.3);
  color: var(--colorMorado);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    border-color: var(--colorMorado);
  }
`;

const EmpresaChip = styled.div`
  position: relative;
  display: inline-flex;
  align-items: stretch;
  flex: 0 0 auto;
  border-radius: 10px;
  opacity: ${({ $dragging }) => ($dragging ? 0.5 : 1)};
  transform: ${({ $over }) => ($over ? "translateY(-2px)" : "none")};
  transition: opacity .15s ease, transform .15s ease;
`;

const AgarraderaEmpresa = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 0 0 7px;
  border: 1px solid rgba(83, 59, 143, .14);
  border-right: none;
  border-radius: 10px 0 0 10px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, .04)" : "#fff")};
  color: #a29ab8;
  cursor: grab;

  &:active { cursor: grabbing; }
`;

const EmpresaChipBoton = styled(TabBoton)`
  border: 1px solid rgba(83, 59, 143, .14);
  border-left: none;
  border-radius: 0 10px 10px 0;
  padding-right: 9px;
`;

const BotonMenuEmpresa = styled.button`
  width: 30px;
  min-height: 100%;
  display: grid;
  place-items: center;
  border: 1px solid rgba(83, 59, 143, .14);
  border-left: 1px solid rgba(83, 59, 143, .1);
  border-radius: 0 10px 10px 0;
  background: ${({ $activo }) => ($activo ? "#f2effd" : "#fff")};
  color: var(--colorMorado);
  cursor: pointer;

  &:hover, &:focus-visible {
    outline: none;
    background: #f2effd;
  }
`;

const MenuEmpresa = styled.div`
  position: absolute;
  z-index: 30;
  top: calc(100% + 7px);
  right: 0;
  min-width: 190px;
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
    const [empresaArrastradaId, setEmpresaArrastradaId] = useState(null);
    const [empresaSobreId, setEmpresaSobreId] = useState(null);
    const [menuEmpresaId, setMenuEmpresaId] = useState(null);

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

    // Empresa seleccionada cuando la vista no es 'matriz'
    const empresaSeleccionada = useMemo(() => {
        if (vistaActiva === "matriz") return null;
        return empresas.find((e) => e.id === vistaActiva) || empresas[0] || null;
    }, [empresas, vistaActiva]);

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
                dataIngresos.empresas || [],
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

            (dataIngresos.registros || []).forEach((r) => {
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
                monto: (dataIngresos.registros || [])
                    .filter((r) => r.mes === m.mesNum && r.estado === "Pendiente")
                    .reduce((sum, r) => sum + obtenerMontoRegistro(r), 0),
            }));

            return {
                kpis: {
                    totalPercibido: totalAnual.totalMes,
                    promedio,
                    pendienteCobro,
                    numPagos: totalAnual.numPagos,
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
            const regsEmpresa = (dataIngresos.registros || []).filter((r) => {
                const regAnio = Number(r.fecha?.split("-")[0]);
                return r.empresaId === empresaSeleccionada.id && (!regAnio || regAnio === Number(year));
            });

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

            return {
                kpis: {
                    totalPercibido,
                    promedio,
                    pendienteCobro,
                    numPagos: regsEmpresa.length,
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
    }, [dataIngresos, prestamosPagos, year, vistaActiva, empresaSeleccionada]);

    // Handlers
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

    return (
        <PaginaContenedor>
            {/* ── HEADER PRINCIPAL ── */}
            <HeaderPrincipal>
                <TituloGrupo>
                    <H2 size="26px" color="var(--colorMorado)">
                        Módulo de Ingresos y Percepciones
                    </H2>
                    <TxtGenerico size="13px" color="#666">
                        Gestión salarial, reportes semanales, quincenas y proyecciones anuales.
                    </TxtGenerico>
                </TituloGrupo>

                <ControlesHeader>
                    <SelectorAnioWrapper>
                        <BtnAnio onClick={() => setYear((y) => y - 1)}>
                            <FaChevronLeft />
                        </BtnAnio>
                        <AnioTexto>{year}</AnioTexto>
                        <BtnAnio onClick={() => setYear((y) => y + 1)}>
                            <FaChevronRight />
                        </BtnAnio>
                    </SelectorAnioWrapper>

                    <BotonesHeader>
                        <BtnPrincipal onClick={() => handleNuevoPago(empresaSeleccionada)}>
                            <FaPlus /> Registrar Pago
                        </BtnPrincipal>
                        <BtnSecundario onClick={() => setIsModalImportarOpen(true)}>
                            <FaFileImport /> Importar Excel
                        </BtnSecundario>
                    </BotonesHeader>
                </ControlesHeader>
            </HeaderPrincipal>

            {/* ── 4 KPI CARDS DINÁMICAS CON GRÁFICAS SPARKLINE ── */}
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

                    {empresas.map((emp) => (
                        <EmpresaChip
                            key={emp.id}
                            draggable
                            $dragging={empresaArrastradaId === emp.id}
                            $over={empresaSobreId === emp.id}
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
                        >
                            <AgarraderaEmpresa $activo={vistaActiva === emp.id} title="Arrastra para cambiar el orden">
                                <FaGripVertical aria-hidden="true" />
                            </AgarraderaEmpresa>
                            <EmpresaChipBoton
                                $activo={vistaActiva === emp.id}
                                $color={emp.color}
                                onClick={() => {
                                    setVistaActiva(emp.id);
                                    setMenuEmpresaId(null);
                                }}
                            >
                                <DotEmpresa $color={emp.color} />
                                {emp.nombre}
                            </EmpresaChipBoton>
                            <BotonMenuEmpresa
                                type="button"
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
                            {menuEmpresaId === emp.id && (
                                <MenuEmpresa onClick={(event) => event.stopPropagation()}>
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
                                </MenuEmpresa>
                            )}
                        </EmpresaChip>
                    ))}
                </GrupoTabs>

                <BtnNuevaEmpresaTab onClick={handleCrearEmpresa}>
                    <FaPlus /> Nueva Empresa
                </BtnNuevaEmpresaTab>
            </BarraPestanasWrapper>

            {/* ── VISTA ACTIVA ── */}
            {cargando ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
                    Cargando ingresos de {year}...
                </div>
            ) : vistaActiva === "matriz" ? (
                <TablaResumenMensual
                    dataIngresos={dataIngresos}
                    prestamosPagos={prestamosPagos}
                    uid={usuario?.uid}
                    year={year}
                    onActualizado={(data) => setDataIngresos(data)}
                />
            ) : (
                <TablaEmpresaPagos
                    dataIngresos={dataIngresos}
                    empresaSeleccionadaId={vistaActiva}
                    onCambiarEmpresaSeleccionada={(id) => setVistaActiva(id)}
                    uid={usuario?.uid}
                    year={year}
                    onActualizado={(data) => setDataIngresos(data)}
                    onEditarEmpresa={handleEditarEmpresa}
                    onAbrirNuevoPago={(emp) => handleNuevoPago(emp)}
                    onAbrirImportador={() => setIsModalImportarOpen(true)}
                    onEditarRegistro={handleEditarRegistro}
                />
            )}

            <IngresosAnalitica
                registros={registros}
                empresas={empresas}
                empresaSeleccionada={empresaSeleccionada}
                year={year}
            />

            {/* ── MODALES ── */}
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
