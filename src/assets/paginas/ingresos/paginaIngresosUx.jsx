import styled, { keyframes } from "styled-components";
import { useEffect, useState, useMemo } from "react";
import {
    FaPlus,
    FaBuilding,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaChartLine,
    FaFileImport,
    FaChevronLeft,
    FaChevronRight,
    FaTable,
    FaBriefcase,
    FaClock,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerOAInicializarIngresosAnio,
} from "../../funciones/firebase/ingresos";
import { cargarHistoricosEnFirestore } from "../../funciones/datosHistoricosIngresos";
import {
    obtenerTodosPrestamos,
} from "../../funciones/firebase/prestamos";
import {
    fnFormatMoney,
    calcularMatrizResumenMensual,
} from "../../funciones/ingresosCalculos";
import { TablaResumenMensual } from "./secciones/tablaResumenMensual";
import { TablaEmpresaPagos } from "./secciones/tablaEmpresaPagos";
import { ModalEmpresa } from "./modales/modalEmpresa";
import { ModalNuevoIngreso } from "./modales/modalNuevoIngreso";
import { ModalImportarIngresos } from "./modales/modalImportarIngresos";
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

const HeaderPrincipal = styled.div`
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

const BotonesHeader = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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

/* ================= KPIs ANUALES ================= */

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

/* ================= PESTAÑAS PRINCIPALES ================= */

const BarraPestanas = styled.div`
  display: flex;
  gap: 10px;
  border-bottom: 2px solid rgba(83, 59, 143, 0.08);
  padding-bottom: 2px;
`;

const TabPrincipal = styled.button`
  padding: 10px 20px;
  border: none;
  border-bottom: 3px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "transparent")};
  background: none;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#777")};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;

  &:hover {
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
    const [tabVista, setTabVista] = useState("matriz"); // "matriz" | "empresas"

    // Modales
    const [isModalEmpresaOpen, setIsModalEmpresaOpen] = useState(false);
    const [empresaAEditar, setEmpresaAEditar] = useState(null);
    const [isModalNuevoPagoOpen, setIsModalNuevoPagoOpen] = useState(false);
    const [registroAEditar, setRegistroAEditar] = useState(null);
    const [empresaParaPago, setEmpresaParaPago] = useState(null);
    const [isModalImportarOpen, setIsModalImportarOpen] = useState(false);

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

            // Si es la cuenta de Luis y aún no tiene registros en el año, auto-cargar de forma segura
            if (esUsuarioLuis && (!ingresosDoc?.registros || ingresosDoc.registros.length === 0)) {
                await cargarHistoricosEnFirestore(usuario.uid);
                ingresosDoc = await obtenerOAInicializarIngresosAnio(usuario.uid, year);
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

    /* ── Cálculo de KPIs ── */
    const kpis = useMemo(() => {
        if (!dataIngresos) return { totalPercibido: 0, promedioMensual: 0, pendienteCobro: 0, numPagos: 0 };

        const { matriz, totalAnual } = calcularMatrizResumenMensual(
            dataIngresos.empresas || [],
            dataIngresos.registros || [],
            dataIngresos.ingresosExtra || [],
            prestamosPagos,
            dataIngresos.configuracion?.incluirPrestamosEnResumen !== false,
            year
        );

        // Meses con ingresos > 0
        const mesesConIngreso = matriz.filter((m) => m.totalMes > 0).length || 1;
        const promedio = totalAnual.totalMes / Math.max(1, mesesConIngreso);

        // Pendiente de cobro
        let pendiente = 0;
        (dataIngresos.registros || []).forEach((r) => {
            if (r.estado === "Pendiente") {
                const monto = r.montoReal !== undefined && r.montoReal !== "" ? Number(r.montoReal) : Number(r.montoTeorico || 0) + Number(r.montoExtra || 0);
                pendiente += monto;
            }
        });

        return {
            totalPercibido: totalAnual.totalMes,
            promedioMensual: promedio,
            pendienteCobro: pendiente,
            numPagos: totalAnual.numPagos,
        };
    }, [dataIngresos, prestamosPagos]);

    /* ── Handlers Modales ── */
    const handleAbrirNuevaEmpresa = () => {
        setEmpresaAEditar(null);
        setIsModalEmpresaOpen(true);
    };

    const handleAbrirEditarEmpresa = (emp) => {
        setEmpresaAEditar(emp);
        setIsModalEmpresaOpen(true);
    };

    const handleAbrirNuevoPago = (empresa = null) => {
        setRegistroAEditar(null);
        setEmpresaParaPago(empresa);
        setIsModalNuevoPagoOpen(true);
    };

    const handleAbrirEditarRegistro = (reg) => {
        setRegistroAEditar(reg);
        setIsModalNuevoPagoOpen(true);
    };

    return (
        <PaginaContenedor>
            {/* ── HEADER PRINCIPAL ── */}
            <HeaderPrincipal>
                <TituloGrupo>
                    <H2 size="22px" color="var(--colorMorado)">
                        Módulo de Ingresos
                    </H2>
                    <TxtGenerico size="13px" color="#666">
                        Gestión de empresas, hojas de cálculo de pagos y percepciones anuales.
                    </TxtGenerico>
                </TituloGrupo>

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
                    <BtnPrincipal onClick={() => handleAbrirNuevoPago()}>
                        <FaPlus /> Registrar Pago
                    </BtnPrincipal>
                    <BtnSecundario onClick={handleAbrirNuevaEmpresa}>
                        <FaBuilding /> Nueva Empresa
                    </BtnSecundario>
                    <BtnSecundario onClick={() => setIsModalImportarOpen(true)}>
                        <FaFileImport /> Importar Excel
                    </BtnSecundario>
                </BotonesHeader>
            </HeaderPrincipal>

            {/* ── TARJETAS DE KPIs ── */}
            <KpiGrid>
                <KpiCard>
                    <KpiIcono $bg="rgba(40, 167, 69, 0.12)" $color="#28a745">
                        <FaMoneyBillWave />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Total Ingresos {year}</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.totalPercibido)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(83, 59, 143, 0.1)" $color="var(--colorMorado)">
                        <FaChartLine />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Promedio Mensual</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.promedioMensual)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(255, 152, 0, 0.12)" $color="#e65100">
                        <FaClock />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Pendiente por Cobrar</KpiTitulo>
                        <KpiValor>{fnFormatMoney(kpis.pendienteCobro)}</KpiValor>
                    </KpiContenido>
                </KpiCard>

                <KpiCard>
                    <KpiIcono $bg="rgba(33, 150, 243, 0.12)" $color="#1976d2">
                        <FaBriefcase />
                    </KpiIcono>
                    <KpiContenido>
                        <KpiTitulo>Total de Pagos Registrados</KpiTitulo>
                        <KpiValor>{kpis.numPagos} pagos</KpiValor>
                    </KpiContenido>
                </KpiCard>
            </KpiGrid>

            {/* ── PESTAÑAS PRINCIPALES ── */}
            <BarraPestanas>
                <TabPrincipal
                    $activo={tabVista === "matriz"}
                    onClick={() => setTabVista("matriz")}
                >
                    <FaTable /> Matriz Resumen Mensual
                </TabPrincipal>

                <TabPrincipal
                    $activo={tabVista === "empresas"}
                    onClick={() => setTabVista("empresas")}
                >
                    <FaBuilding /> Detalle por Empresa (Hoja de Pagos)
                </TabPrincipal>
            </BarraPestanas>

            {/* ── CONTENIDO PRINCIPAL ── */}
            {cargando ? (
                <TxtGenerico color="var(--colorMorado)" align="center">
                    Cargando ingresos del año {year}...
                </TxtGenerico>
            ) : tabVista === "matriz" ? (
                <TablaResumenMensual
                    dataIngresos={dataIngresos}
                    prestamosPagos={prestamosPagos}
                    uid={usuario?.uid}
                    year={year}
                    onActualizado={setDataIngresos}
                />
            ) : (
                <TablaEmpresaPagos
                    dataIngresos={dataIngresos}
                    uid={usuario?.uid}
                    year={year}
                    onActualizado={setDataIngresos}
                    onEditarEmpresa={handleAbrirEditarEmpresa}
                    onAbrirNuevoPago={handleAbrirNuevoPago}
                    onAbrirImportador={() => setIsModalImportarOpen(true)}
                    onEditarRegistro={handleAbrirEditarRegistro}
                />
            )}

            {/* ── MODALES ── */}
            <ModalEmpresa
                isOpen={isModalEmpresaOpen}
                onClose={() => setIsModalEmpresaOpen(false)}
                empresa={empresaAEditar}
                uid={usuario?.uid}
                year={year}
                dataIngresos={dataIngresos}
                onGuardado={setDataIngresos}
            />

            <ModalNuevoIngreso
                isOpen={isModalNuevoPagoOpen}
                onClose={() => setIsModalNuevoPagoOpen(false)}
                registro={registroAEditar}
                empresaPreseleccionada={empresaParaPago}
                empresas={dataIngresos?.empresas || []}
                uid={usuario?.uid}
                year={year}
                dataIngresos={dataIngresos}
                onGuardado={setDataIngresos}
            />

            <ModalImportarIngresos
                isOpen={isModalImportarOpen}
                onClose={() => setIsModalImportarOpen(false)}
                empresas={dataIngresos?.empresas || []}
                uid={usuario?.uid}
                year={year}
                dataIngresos={dataIngresos}
                onImportado={setDataIngresos}
            />
        </PaginaContenedor>
    );
};
