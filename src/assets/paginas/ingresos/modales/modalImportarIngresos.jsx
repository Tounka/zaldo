import styled from "styled-components";
import { useState } from "react";
import {
    FaFileImport,
    FaClipboardList,
    FaTable,
    FaBolt,
    FaCheck,
    FaShieldAlt,
} from "react-icons/fa";
import { ModalGenerico } from "../../../componentes/modales/modalGenerico";
import { H2, TxtGenerico } from "../../../componentes/genericos/titulos";
import {
    parsearTablaSitioRandom,
    parsearTablaiNNCi,
    parsearMatrizMensualPegada,
} from "../../../funciones/ingresosCalculos";
import {
    guardarRegistrosMasivos,
    guardarEmpresa,
    obtenerOAInicializarIngresosAnio,
    importarRegistrosEnVariosAnios,
} from "../../../funciones/firebase/ingresos";
import { cargarHistoricosEnFirestore } from "../../../funciones/datosHistoricosIngresos";
import Swal from "sweetalert2";

const ContenedorModal = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PestanasWrapper = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.12);
  padding-bottom: 8px;
  overflow-x: auto;
`;

const TabBtn = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.06)")};
  color: ${({ $activo }) => ($activo ? "white" : "var(--colorMorado)")};
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.12)")};
  }
`;

const TextAreaPegar = styled.textarea`
  width: 100%;
  min-height: 180px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #1a1a2e;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const BotonesAccion = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
`;

const BtnImportar = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: var(--colorMoradoSecundario);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PanelPreconfigurado = styled.div`
  background: rgba(83, 59, 143, 0.04);
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ItemDetalleHistorico = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
`;

export const ModalImportarIngresos = ({
    isOpen,
    onClose,
    empresas = [],
    uid,
    year,
    dataIngresos,
    onImportado,
}) => {
    const [tipoImportacion, setTipoImportacion] = useState("historico_completo");
    const [textoPegado, setTextoPegado] = useState("");
    const [cargando, setCargando] = useState(false);

    // Carga rápida del histórico 2025 y 2026 sin borrar nada
    const handleCargarHistoricoCompleto = async () => {
        if (!uid) return;
        setCargando(true);
        try {
            await cargarHistoricosEnFirestore(uid);
            const dataRecargada = await obtenerOAInicializarIngresosAnio(uid, year);
            onImportado?.(dataRecargada);
            Swal.fire({
                icon: "success",
                title: "¡Histórico cargado con éxito!",
                text: `Se subieron y fusionaron todos los pagos y empresas de 2025 y 2026 para tu cuenta sin borrar ningún dato existente.`,
            });
            onClose();
        } catch (e) {
            console.error("Error al cargar histórico completo:", e);
            Swal.fire("Error", "No se pudo cargar el histórico completo.", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleProcesar = async () => {
        if (!textoPegado.trim()) {
            Swal.fire("Texto vacío", "Pega las filas de tu hoja de cálculo antes de importar.", "warning");
            return;
        }

        setCargando(true);
        try {
            let nuevosRegistros = [];
            let dataActualizada = { ...dataIngresos };

            if (tipoImportacion === "sitio_random") {
                let empSitio = empresas.find((e) => e.nombre.toLowerCase().includes("sitio random"));
                if (!empSitio) {
                    empSitio = {
                        id: "emp_sitio_random",
                        nombre: "Sitio Random",
                        activo: false,
                        color: "#533B8F",
                        tipoEsquema: "quincenal",
                    };
                    dataActualizada = await guardarEmpresa(uid, year, dataActualizada, empSitio);
                }
                nuevosRegistros = parsearTablaSitioRandom(textoPegado, empSitio.id, empSitio.nombre);
            } else if (tipoImportacion === "innci") {
                let empInnci = empresas.find((e) => e.nombre.toLowerCase().includes("innci"));
                if (!empInnci) {
                    empInnci = {
                        id: "emp_innci",
                        nombre: "iNNCi",
                        activo: true,
                        color: "#0088FE",
                        tipoEsquema: "por_horas",
                        precioHora: 52,
                        bonoInternet: 200,
                    };
                    dataActualizada = await guardarEmpresa(uid, year, dataActualizada, empInnci);
                }
                nuevosRegistros = parsearTablaiNNCi(textoPegado, empInnci.id, empInnci.nombre);
            } else if (tipoImportacion === "matriz") {
                const parsed = parsearMatrizMensualPegada(textoPegado);
                if (parsed) {
                    for (const empNom of parsed.empresasNombres) {
                        const existe = (dataActualizada.empresas || []).some((e) => e.nombre.toLowerCase() === empNom.toLowerCase());
                        if (!existe) {
                            const nuevaEmp = {
                                id: "emp_" + empNom.toLowerCase().replace(/\s+/g, "_"),
                                nombre: empNom,
                                activo: true,
                                color: "#" + Math.floor(Math.random() * 16777215).toString(16),
                                tipoEsquema: "libre",
                            };
                            dataActualizada = await guardarEmpresa(uid, year, dataActualizada, nuevaEmp);
                        }
                    }

                    parsed.registrosMeses.forEach((rm) => {
                        Object.entries(rm.valoresEmpresas).forEach(([empNom, monto]) => {
                            if (monto > 0) {
                                const emp = (dataActualizada.empresas || []).find((e) => e.nombre.toLowerCase() === empNom.toLowerCase());
                                const fechaStr = `${year}-${String(rm.mesNum).padStart(2, "0")}-15`;
                                nuevosRegistros.push({
                                    id: "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                                    empresaId: emp?.id || "emp_" + empNom.toLowerCase().replace(/\s+/g, "_"),
                                    empresaNombre: empNom,
                                    fecha: fechaStr,
                                    mes: rm.mesNum,
                                    numeroPeriodo: rm.numPagos || 1,
                                    montoTeorico: monto,
                                    montoExtra: 0,
                                    tipo: "Resumen Mes",
                                    estado: "Pagado",
                                    montoReal: monto,
                                    notas: "Importado desde matriz histórica",
                                });
                            }
                        });
                    });
                }
            }

            const empresasACrear = [];
            if (tipoImportacion === "sitio_random") {
                empresasACrear.push({
                    id: "emp_sitio_random",
                    nombre: "Sitio Random",
                    activo: false,
                    color: "#533B8F",
                    tipoEsquema: "quincenal",
                    quincenaBase: 3000,
                });
            } else if (tipoImportacion === "innci") {
                empresasACrear.push({
                    id: "emp_innci",
                    nombre: "iNNCi",
                    activo: true,
                    color: "#0088FE",
                    tipoEsquema: "por_horas",
                    precioHora: 52,
                    bonoInternet: 200,
                });
            }

            const resultadosPorAnio = await importarRegistrosEnVariosAnios(uid, nuevosRegistros, empresasACrear);
            dataActualizada = await obtenerOAInicializarIngresosAnio(uid, year);
            onImportado?.(dataActualizada);

            const resumenTexto = Object.entries(resultadosPorAnio)
                .map(([a, count]) => `${count} pagos en ${a}`)
                .join(", ");

            Swal.fire({
                icon: "success",
                title: "Importación exitosa",
                text: `Se distribuyeron y guardaron: ${resumenTexto}.`,
            });
            setTextoPegado("");
            onClose();
        } catch (e) {
            console.error("Error al importar:", e);
            Swal.fire("Error", "Ocurrió un error al procesar los datos.", "error");
        } finally {
            setCargando(false);
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <ContenedorModal>
                <H2 size="20px" color="var(--colorMorado)">
                    <FaFileImport style={{ marginRight: 8 }} />
                    Importación y Carga de Ingresos
                </H2>
                <TxtGenerico size="13px" color="#666">
                    Sube tu histórico completo o pega datos tabulares desde Excel.
                </TxtGenerico>

                <PestanasWrapper>
                    <TabBtn
                        $activo={tipoImportacion === "historico_completo"}
                        onClick={() => setTipoImportacion("historico_completo")}
                    >
                        <FaBolt style={{ marginRight: 5, color: "#f39c12" }} /> Histórico Completo 2025 y 2026 (1 Clic)
                    </TabBtn>
                    <TabBtn
                        $activo={tipoImportacion === "sitio_random"}
                        onClick={() => setTipoImportacion("sitio_random")}
                    >
                        <FaTable style={{ marginRight: 5 }} /> Tabla Sitio Random (Quincenal)
                    </TabBtn>
                    <TabBtn
                        $activo={tipoImportacion === "innci"}
                        onClick={() => setTipoImportacion("innci")}
                    >
                        <FaTable style={{ marginRight: 5 }} /> Tabla iNNCi (Por Horas)
                    </TabBtn>
                    <TabBtn
                        $activo={tipoImportacion === "matriz"}
                        onClick={() => setTipoImportacion("matriz")}
                    >
                        <FaClipboardList style={{ marginRight: 5 }} /> Matriz Resumen Mensual
                    </TabBtn>
                </PestanasWrapper>

                {tipoImportacion === "historico_completo" ? (
                    <PanelPreconfigurado>
                        <TxtGenerico weight="bold" size="14px" color="var(--colorMorado)">
                            ⚡ Carga automática de los documentos 2025 y 2026
                        </TxtGenerico>
                        <ItemDetalleHistorico>
                            <FaCheck style={{ color: "#28a745" }} />
                            <span><strong>Año 2025:</strong> Pagos de Julio a Diciembre (Sitio Random, iNNCi, Otros).</span>
                        </ItemDetalleHistorico>
                        <ItemDetalleHistorico>
                            <FaCheck style={{ color: "#28a745" }} />
                            <span><strong>Año 2026:</strong> 26 semanas iNNCi + 21 quincenas/bonos/finiquito Sitio Random.</span>
                        </ItemDetalleHistorico>
                        <ItemDetalleHistorico>
                            <FaShieldAlt style={{ color: "#0088FE" }} />
                            <span><strong>Seguridad:</strong> Se fusiona de forma segura sin borrar ninguna otra cuenta, movimiento ni dato existente.</span>
                        </ItemDetalleHistorico>

                        <BotonesAccion>
                            <BtnImportar onClick={handleCargarHistoricoCompleto} disabled={cargando}>
                                <FaBolt /> {cargando ? "Cargando en Firestore..." : "Cargar Histórico 2025 y 2026 Ahora"}
                            </BtnImportar>
                        </BotonesAccion>
                    </PanelPreconfigurado>
                ) : (
                    <>
                        <TextAreaPegar
                            value={textoPegado}
                            onChange={(e) => setTextoPegado(e.target.value)}
                            placeholder={
                                tipoImportacion === "sitio_random"
                                    ? "Pega las filas de Sitio Random (Fecha \t # pago \t Días \t Total Quincenal \t Total + 6to \t Tipo \t Estado \t Pago...)"
                                    : tipoImportacion === "innci"
                                        ? "Pega las filas de iNNCi (# \t # \t Fecha \t Horas \t $ Horas \t Días \t Bono Internet \t Neto \t Bruto \t Estado...)"
                                        : "Pega la matriz mensual (Mes \t # pagos \t Sitio Random \t iNNCi \t Otros \t Total...)"
                            }
                        />

                        <BotonesAccion>
                            <BtnImportar onClick={handleProcesar} disabled={cargando || !textoPegado.trim()}>
                                <FaCheck /> {cargando ? "Importando..." : "Procesar e Importar"}
                            </BtnImportar>
                        </BotonesAccion>
                    </>
                )}
            </ContenedorModal>
        </ModalGenerico>
    );
};
