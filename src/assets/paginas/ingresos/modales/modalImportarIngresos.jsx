import styled from "styled-components";
import { useState } from "react";
import {
    FaFileImport,
    FaClipboardList,
    FaTable,
    FaCheck,
} from "react-icons/fa";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "../../../componentes/Modales/ModalGenerico";
import {
    parsearTablaQuincenal,
    parsearTablaPorHoras,
    parsearMatrizMensualPegada,
} from "../../../funciones/ingresosCalculos";
import {
    guardarEmpresa,
    obtenerOAInicializarIngresosAnio,
    importarRegistrosEnVariosAnios,
} from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";

const ContenedorModal = styled(ContenedorFormularioGenerico)`
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

// Empresas que se crean si no existe una con el mismo esquema de pago.
const PLANTILLAS_EMPRESA = {
    quincenal: {
        id: "emp_quincenal",
        nombre: "Empleo quincenal",
        activo: true,
        color: "#533B8F",
        tipoEsquema: "quincenal",
    },
    por_horas: {
        id: "emp_por_horas",
        nombre: "Empleo por horas",
        activo: true,
        color: "#0088FE",
        tipoEsquema: "por_horas",
    },
};

export const ModalImportarIngresos = ({
    isOpen,
    onClose,
    empresas = [],
    uid,
    year,
    dataIngresos,
    onImportado,
}) => {
    const [tipoImportacion, setTipoImportacion] = useState("matriz");
    const [textoPegado, setTextoPegado] = useState("");
    const [cargando, setCargando] = useState(false);

    const handleProcesar = async () => {
        if (!textoPegado.trim()) {
            Swal.fire("Texto vacío", "Pega las filas de tu hoja de cálculo antes de importar.", "warning");
            return;
        }

        setCargando(true);
        try {
            let nuevosRegistros = [];
            let dataActualizada = { ...dataIngresos };

            let empresaImportada = null;
            if (tipoImportacion === "quincenal" || tipoImportacion === "por_horas") {
                const esquema = PLANTILLAS_EMPRESA[tipoImportacion];
                empresaImportada = empresas.find((e) => e.tipoEsquema === esquema.tipoEsquema);
                if (!empresaImportada) {
                    empresaImportada = { ...esquema };
                    dataActualizada = await guardarEmpresa(uid, year, dataActualizada, empresaImportada);
                }
                const parser = tipoImportacion === "quincenal" ? parsearTablaQuincenal : parsearTablaPorHoras;
                nuevosRegistros = parser(textoPegado, empresaImportada.id, empresaImportada.nombre);
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
                                color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
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

            const empresasACrear = empresaImportada ? [empresaImportada] : [];

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
                <ModalEncabezado
                    icon={<FaFileImport />}
                    title="Importación y Carga de Ingresos"
                    description="Sube tu histórico completo o pega datos tabulares desde Excel."
                />

                <PestanasWrapper>
                    <TabBtn
                        $activo={tipoImportacion === "matriz"}
                        onClick={() => setTipoImportacion("matriz")}
                    >
                        <FaClipboardList style={{ marginRight: 5 }} /> Matriz Resumen Mensual
                    </TabBtn>
                    <TabBtn
                        $activo={tipoImportacion === "quincenal"}
                        onClick={() => setTipoImportacion("quincenal")}
                    >
                        <FaTable style={{ marginRight: 5 }} /> Tabla quincenal
                    </TabBtn>
                    <TabBtn
                        $activo={tipoImportacion === "por_horas"}
                        onClick={() => setTipoImportacion("por_horas")}
                    >
                        <FaTable style={{ marginRight: 5 }} /> Tabla por horas
                    </TabBtn>
                </PestanasWrapper>

                <TextAreaPegar
                    value={textoPegado}
                    onChange={(e) => setTextoPegado(e.target.value)}
                    placeholder={
                        tipoImportacion === "quincenal"
                            ? "Pega las filas de tu empleo quincenal (Fecha \t # pago \t Días \t Total Quincenal \t Total + 6to \t Tipo \t Estado \t Pago...)"
                            : tipoImportacion === "por_horas"
                                ? "Pega las filas de tu empleo por horas (# \t # \t Fecha \t Horas \t $ Horas \t Días \t Bono Internet \t Neto \t Bruto \t Estado...)"
                                : "Pega la matriz mensual (Mes \t # pagos \t Empleo A \t Empleo B \t Otros \t Total...)"
                    }
                />

                <BotonesAccion>
                    <BtnImportar onClick={handleProcesar} disabled={cargando || !textoPegado.trim()}>
                        <FaCheck /> {cargando ? "Importando..." : "Procesar e Importar"}
                    </BtnImportar>
                </BotonesAccion>
            </ContenedorModal>
        </ModalGenerico>
    );
};
