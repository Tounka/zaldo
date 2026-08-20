import styled from "styled-components";
import { Formik, Form } from "formik";
import { useState } from "react";
import {
    FaBuilding,
    FaDollarSign,
    FaCalendarAlt,
    FaClock,
    FaPalette,
    FaTrash,
    FaCheck,
} from "react-icons/fa";
import { ModalGenerico } from "../../../componentes/modales/modalGenerico";
import { FieldForm, SelectForm, BtnSubmit } from "../../../componentes/genericos/formulariosV1";
import { H2, TxtGenerico } from "../../../componentes/genericos/titulos";
import { guardarEmpresa, eliminarEmpresa } from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";

const ContenedorModal = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
`;

const FormularioStyled = styled(Form)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const SpanFull = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FilaCheckbox = styled.label`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #2c2c3e;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(83, 59, 143, 0.04);

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--colorMorado);
  }
`;

const BotonesWrapper = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 10px;
  flex-wrap: wrap;
`;

const BtnEliminar = styled.button`
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;

const OPCIONES_ESQUEMA = [
    { value: "por_horas", label: "Por Horas + Bono Internet (ej. iNNCi)" },
    { value: "diario_sexto_dia", label: "Cortes Diarios + 6to Día por Ley ($577/día)" },
    { value: "quincenal", label: "Quincenal Fijo + Bonos (ej. Sitio Random)" },
    { value: "mensual", label: "Sueldo Mensual Fijo" },
    { value: "libre", label: "Honorarios / Libre / Variable" },
];

export const ModalEmpresa = ({
    isOpen,
    onClose,
    empresa = null,
    uid,
    year,
    dataIngresos,
    onGuardado,
}) => {
    const [cargando, setCargando] = useState(false);

    const initialValues = {
        nombre: empresa?.nombre || "",
        tipoEsquema: empresa?.tipoEsquema || "diario_sexto_dia",
        salarioDiario: empresa?.salarioDiario || 577,
        precioHora: empresa?.precioHora || 52,
        horasSemanales: empresa?.horasSemanales || 11,
        bonoInternet: empresa?.bonoInternet || 200,
        quincenaBase: empresa?.quincenaBase || 3000,
        color: empresa?.color || "#533B8F",
        activo: empresa?.activo !== undefined ? empresa.activo : true,
        aplicarResico: empresa?.aplicarResico || false,
        liquidarCortesMensualmente: empresa?.liquidarCortesMensualmente || false,
        notas: empresa?.notas || "",
    };

    const validate = (values) => {
        const errors = {};
        if (!values.nombre) errors.nombre = "Requerido";
        return errors;
    };

    const handleSubmit = async (values) => {
        setCargando(true);
        try {
            const empresaData = {
                id: empresa?.id,
                nombre: values.nombre,
                tipoEsquema: values.tipoEsquema,
                salarioDiario: Number(values.salarioDiario || 0),
                precioHora: Number(values.precioHora || 0),
                horasSemanales: Number(values.horasSemanales || 0),
                bonoInternet: Number(values.bonoInternet || 0),
                quincenaBase: Number(values.quincenaBase || 0),
                color: values.color,
                activo: Boolean(values.activo),
                aplicarResico: Boolean(values.aplicarResico),
                liquidarCortesMensualmente: Boolean(values.liquidarCortesMensualmente),
                notas: values.notas,
            };

            const dataActualizada = await guardarEmpresa(uid, year, dataIngresos, empresaData);
            onGuardado?.(dataActualizada);
            Swal.fire({
                icon: "success",
                title: "Empresa guardada",
                showConfirmButton: false,
                timer: 1500,
            });
            onClose();
        } catch (e) {
            console.error("Error al guardar empresa:", e);
            Swal.fire("Error", "No se pudo guardar la empresa.", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleEliminar = async () => {
        if (!empresa?.id) return;
        const confirmacion = await Swal.fire({
            title: "¿Eliminar empresa?",
            text: `Se eliminará ${empresa.nombre} del catálogo de este año.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirmacion.isConfirmed) {
            setCargando(true);
            try {
                const dataActualizada = await eliminarEmpresa(uid, year, dataIngresos, empresa.id);
                onGuardado?.(dataActualizada);
                Swal.fire("Eliminada", "La empresa ha sido eliminada.", "success");
                onClose();
            } catch (e) {
                console.error("Error al eliminar empresa:", e);
            } finally {
                setCargando(false);
            }
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose} wide>
            <ContenedorModal>
                <H2 size="20px" color="var(--colorMorado)">
                    <FaBuilding style={{ marginRight: 8 }} />
                    {empresa ? `Editar Empresa: ${empresa.nombre}` : "Nueva Empresa / Empleo"}
                </H2>
                <TxtGenerico size="13px" color="#666">
                    Configura la empresa que te paga y la fórmula de cálculo de tus percepciones.
                </TxtGenerico>

                <Formik
                    initialValues={initialValues}
                    validate={validate}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ values, setFieldValue }) => (
                        <FormularioStyled>
                            <SpanFull>
                                <FieldForm
                                    id="nombre"
                                    name="nombre"
                                    type="text"
                                    label="Nombre de la Empresa"
                                    placeholder="Ej. iNNCi, Sitio Random, Empleo Actual"
                                    icon={<FaBuilding />}
                                />
                            </SpanFull>

                            <SpanFull>
                                <SelectForm
                                    id="tipoEsquema"
                                    name="tipoEsquema"
                                    label="Esquema de Pago"
                                    options={OPCIONES_ESQUEMA}
                                    placeholder="Selecciona el esquema"
                                    icon={<FaCalendarAlt />}
                                />
                            </SpanFull>

                            {values.tipoEsquema === "diario_sexto_dia" && (
                                <SpanFull>
                                    <FieldForm
                                        id="salarioDiario"
                                        name="salarioDiario"
                                        type="number"
                                        label="Salario por Día ($)"
                                        placeholder="Ej. 577"
                                        icon={<FaDollarSign />}
                                        step="0.01"
                                    />
                                </SpanFull>
                            )}

                            {values.tipoEsquema === "por_horas" && (
                                <>
                                    <FieldForm
                                        id="precioHora"
                                        name="precioHora"
                                        type="number"
                                        label="Precio por Hora ($)"
                                        placeholder="Ej. 52"
                                        icon={<FaDollarSign />}
                                        step="0.01"
                                    />
                                    <FieldForm
                                        id="bonoInternet"
                                        name="bonoInternet"
                                        type="number"
                                        label="Bono Internet ($)"
                                        placeholder="Ej. 200 o 240"
                                        icon={<FaDollarSign />}
                                        step="0.01"
                                    />
                                    <FilaCheckbox>
                                        <input
                                            type="checkbox"
                                            checked={values.aplicarResico}
                                            onChange={(e) => setFieldValue("aplicarResico", e.target.checked)}
                                        />
                                        <span>Aplicar Retenciones RESICO / IVA (Desmarcado = Estímulo 0% ISR)</span>
                                    </FilaCheckbox>
                                </>
                            )}

                            {values.tipoEsquema === "quincenal" && (
                                <FieldForm
                                    id="quincenaBase"
                                    name="quincenaBase"
                                    type="number"
                                    label="Sueldo Base Quincenal ($)"
                                    placeholder="Ej. 3000 o 5000"
                                    icon={<FaDollarSign />}
                                    step="0.01"
                                />
                            )}

                            <FieldForm
                                id="color"
                                name="color"
                                type="color"
                                label="Color Distintivo"
                                icon={<FaPalette />}
                            />

                            <FilaCheckbox>
                                <input
                                    type="checkbox"
                                    checked={values.activo}
                                    onChange={(e) => setFieldValue("activo", e.target.checked)}
                                />
                                <span>Empresa Activa actualmente</span>
                            </FilaCheckbox>

                            <SpanFull>
                                <FieldForm
                                    id="notas"
                                    name="notas"
                                    type="text"
                                    label="Notas / Observaciones"
                                    placeholder="Detalles sobre el contrato o acuerdo de pago"
                                    icon={<FaClock />}
                                />
                            </SpanFull>

                            <BotonesWrapper>
                                {empresa?.id ? (
                                    <BtnEliminar type="button" onClick={handleEliminar} disabled={cargando}>
                                        <FaTrash /> Eliminar
                                    </BtnEliminar>
                                ) : <div />}

                                <BtnSubmit type="submit" disabled={cargando}>
                                    {cargando ? "Guardando..." : "Guardar Empresa"}
                                </BtnSubmit>
                            </BotonesWrapper>
                        </FormularioStyled>
                    )}
                </Formik>
            </ContenedorModal>
        </ModalGenerico>
    );
};
