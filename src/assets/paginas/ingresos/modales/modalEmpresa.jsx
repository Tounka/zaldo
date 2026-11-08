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
    FaGift,
    FaPlus,
    FaTimes,
} from "react-icons/fa";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "../../../componentes/Modales/ModalGenerico";
import { FieldForm, SelectForm, BtnSubmit } from "../../../componentes/genericos/formulariosV1";
import { guardarEmpresa, eliminarEmpresa } from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";
import { useAppStore } from "../../../stores/useAppStore";
import {
    FRECUENCIAS_PERCEPCION,
    limpiarPercepcion,
    nuevaPercepcion,
    TIPOS_PERCEPCION,
} from "../../../funciones/ingresosPercepciones";
import { MESES_ANIO } from "../../../funciones/ingresosCalculos";

const ContenedorModal = styled(ContenedorFormularioGenerico)`
  gap: 16px;
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
  grid-column: ${({ $compacta }) => ($compacta ? "auto" : "1 / -1")};
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

  @media (max-width: 500px) {
    grid-column: 1 / -1;
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

const BloquePercepciones = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 12px;
  background: rgba(83, 59, 143, 0.03);
`;

const TituloBloque = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--colorMorado);
`;

const AyudaBloque = styled.small`
  color: #6a6a7a;
  font-size: 11px;
  line-height: 1.4;
`;

const FilaPercepcion = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(80px, 0.7fr) minmax(0, 1fr) minmax(0, 1.2fr) auto;
  gap: 6px;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 1fr 1fr auto;
    padding-bottom: 8px;
    border-bottom: 1px dashed rgba(83, 59, 143, 0.15);
  }
`;

const CampoMini = styled.input`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  padding: 8px 9px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: #1a1a2e;
  background: white;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const SelectMini = styled.select`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  padding: 8px 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: #1a1a2e;
  background: white;
`;

const BtnAgregar = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed rgba(83, 59, 143, 0.35);
  border-radius: 9px;
  background: transparent;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 700;
  padding: 7px 10px;
  cursor: pointer;
`;

const BtnQuitar = styled.button`
  border: none;
  background: transparent;
  color: #b33a3a;
  cursor: pointer;
  padding: 6px;
  display: inline-flex;
`;

const OPCIONES_ESQUEMA = [
    { value: "por_horas", label: "Por horas + bono internet" },
    { value: "diario_sexto_dia", label: "Cortes diarios + 6to día por ley" },
    { value: "quincenal", label: "Quincenal fijo + bonos" },
    { value: "mensual", label: "Sueldo Mensual Fijo" },
    { value: "libre", label: "Honorarios / Libre / Variable" },
];

const OPCIONES_RECORDATORIO = [
    { value: "sabado", label: "Cada Sábado (ej. horas trabajadas)" },
    { value: "viernes", label: "Cada Viernes" },
    { value: "domingo", label: "Cada Domingo" },
    { value: "lunes", label: "Cada Lunes" },
    { value: "quincenal", label: "Quincenal (Día 15 y último)" },
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
    const { cuentas } = useAppStore();
    const [cargando, setCargando] = useState(false);

    const initialValues = {
        nombre: empresa?.nombre || "",
        tipoEsquema: empresa?.tipoEsquema || "diario_sexto_dia",
        salarioDiario: empresa?.salarioDiario || 0,
        precioHora: empresa?.precioHora || 0,
        horasSemanales: empresa?.horasSemanales || 0,
        bonoInternet: empresa?.bonoInternet || 0,
        quincenaBase: empresa?.quincenaBase || 0,
        color: empresa?.color || "#533B8F",
        activo: empresa?.activo !== undefined ? empresa.activo : true,
        aplicarResico: empresa?.aplicarResico || false,
        liquidarCortesMensualmente: empresa?.liquidarCortesMensualmente || false,
        recordatorioRecurrenteActivo: empresa?.recordatorioRecurrenteActivo !== undefined ? empresa.recordatorioRecurrenteActivo : (empresa?.tipoEsquema === "por_horas"),
        diaRecordatorio: empresa?.diaRecordatorio || "sabado",
        notas: empresa?.notas || "",
        cuentaPorDefectoId: empresa?.cuentaPorDefectoId || "",
        percepciones: Array.isArray(empresa?.percepciones) ? empresa.percepciones : [],
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
                recordatorioRecurrenteActivo: Boolean(values.recordatorioRecurrenteActivo),
                diaRecordatorio: values.diaRecordatorio || "sabado",
                notas: values.notas,
                cuentaPorDefectoId: values.cuentaPorDefectoId || "",
                percepciones: (values.percepciones || [])
                    .filter((percepcion) => String(percepcion.nombre || "").trim() || Number(percepcion.monto) > 0)
                    .map(limpiarPercepcion),
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
            Swal.fire("Error", `No se pudo guardar la empresa. ${e?.message || ""}`, "error");
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
                <ModalEncabezado
                    icon={<FaBuilding />}
                    title={empresa ? `Editar Empresa: ${empresa.nombre}` : "Nueva Empresa / Empleo"}
                    description="Configura la empresa que te paga y la fórmula de cálculo de tus percepciones."
                />

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
                                    placeholder="Ej. Empleo actual, Proyecto freelance"
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

                            <SpanFull>
                                <SelectForm
                                    id="cuentaPorDefectoId"
                                    name="cuentaPorDefectoId"
                                    label="Cuenta por defecto para ingresos"
                                    placeholder="Sin cuenta por defecto"
                                    icon={<FaDollarSign />}
                                    options={[
                                        { value: "", label: "Sin cuenta por defecto" },
                                        ...(cuentas || []).map((cuenta) => ({
                                            value: cuenta.id,
                                            label: `${cuenta.nombre || "Sin nombre"} · ${cuenta.tipoDeCuenta || "cuenta"}`,
                                        })),
                                    ]}
                                />
                            </SpanFull>

                            {values.tipoEsquema === "diario_sexto_dia" && (
                                <SpanFull>
                                    <FieldForm
                                        id="salarioDiario"
                                        name="salarioDiario"
                                        type="number" inputMode="decimal"
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
                                        type="number" inputMode="decimal"
                                        label="Precio por Hora ($)"
                                        placeholder="Ej. 52"
                                        icon={<FaDollarSign />}
                                        step="0.01"
                                    />
                                    <FieldForm
                                        id="bonoInternet"
                                        name="bonoInternet"
                                        type="number" inputMode="decimal"
                                        label="Bono Internet ($)"
                                        placeholder="Ej. 200 o 240"
                                        icon={<FaDollarSign />}
                                        step="0.01"
                                    />
                                    <FilaCheckbox $compacta>
                                        <input
                                            type="checkbox"
                                            checked={values.aplicarResico}
                                            onChange={(e) => setFieldValue("aplicarResico", e.target.checked)}
                                        />
                                        <span>Aplicar Retenciones RESICO / IVA (Desmarcado = Estímulo 0% ISR)</span>
                                    </FilaCheckbox>
                                    <FilaCheckbox $compacta>
                                        <input
                                            type="checkbox"
                                            checked={values.liquidarCortesMensualmente}
                                            onChange={(e) => setFieldValue("liquidarCortesMensualmente", e.target.checked)}
                                        />
                                        <span>Los cortes se cobran juntos en una liquidación posterior</span>
                                    </FilaCheckbox>
                                </>
                            )}

                            {values.tipoEsquema === "quincenal" && (
                                <FieldForm
                                    id="quincenaBase"
                                    name="quincenaBase"
                                    type="number" inputMode="decimal"
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

                            <FilaCheckbox>
                                <input
                                    type="checkbox"
                                    checked={values.recordatorioRecurrenteActivo}
                                    onChange={(e) => setFieldValue("recordatorioRecurrenteActivo", e.target.checked)}
                                />
                                <span>Recordarme registrar horas / corte semanal</span>
                            </FilaCheckbox>

                            {values.recordatorioRecurrenteActivo && (
                                <SpanFull>
                                    <SelectForm
                                        id="diaRecordatorio"
                                        name="diaRecordatorio"
                                        label="Día del recordatorio"
                                        options={OPCIONES_RECORDATORIO}
                                        placeholder="Selecciona el día del recordatorio"
                                        icon={<FaClock />}
                                    />
                                </SpanFull>
                            )}

                            <BloquePercepciones>
                                <TituloBloque><FaGift /> Percepciones recurrentes</TituloBloque>
                                <AyudaBloque>
                                    Bonos, vales de despensa, fondo de ahorro… Se proponen solos al registrar un pago
                                    y cada uno se deposita en su cuenta (p. ej. los vales en tu tarjeta de vales).
                                </AyudaBloque>
                                {(values.percepciones || []).map((percepcion, indice) => {
                                    const cambiar = (campo, valor) => setFieldValue(`percepciones.${indice}.${campo}`, valor);
                                    return (
                                        <FilaPercepcion key={percepcion.id}>
                                            <CampoMini
                                                value={percepcion.nombre}
                                                onChange={(e) => cambiar("nombre", e.target.value)}
                                                placeholder="Ej. Vales Edenred"
                                                aria-label="Concepto"
                                            />
                                            <SelectMini value={percepcion.tipo} onChange={(e) => cambiar("tipo", e.target.value)} aria-label="Tipo">
                                                {TIPOS_PERCEPCION.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                                            </SelectMini>
                                            <CampoMini
                                                type="number"
                                                inputMode="decimal"
                                                value={percepcion.monto}
                                                onChange={(e) => cambiar("monto", e.target.value)}
                                                placeholder="$0"
                                                aria-label="Monto"
                                            />
                                            <SelectMini value={percepcion.frecuencia} onChange={(e) => cambiar("frecuencia", e.target.value)} aria-label="Frecuencia">
                                                {FRECUENCIAS_PERCEPCION.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </SelectMini>
                                            <SelectMini value={percepcion.cuentaId || ""} onChange={(e) => cambiar("cuentaId", e.target.value)} aria-label="Cuenta">
                                                <option value="">Cuenta del empleo</option>
                                                {(cuentas || []).map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre || "Sin nombre"}</option>)}
                                            </SelectMini>
                                            <BtnQuitar
                                                type="button"
                                                aria-label="Quitar percepción"
                                                onClick={() => setFieldValue("percepciones", values.percepciones.filter((_, i) => i !== indice))}
                                            >
                                                <FaTimes />
                                            </BtnQuitar>
                                            {percepcion.frecuencia === "anual" && (
                                                <SelectMini
                                                    style={{ gridColumn: "1 / -1" }}
                                                    value={percepcion.mes || ""}
                                                    onChange={(e) => cambiar("mes", e.target.value ? Number(e.target.value) : null)}
                                                    aria-label="Mes en que se paga"
                                                >
                                                    <option value="">Se paga en cualquier mes</option>
                                                    {MESES_ANIO.map((mes) => <option key={mes.num} value={mes.num}>Se paga en {mes.nombre}</option>)}
                                                </SelectMini>
                                            )}
                                        </FilaPercepcion>
                                    );
                                })}
                                <BtnAgregar
                                    type="button"
                                    onClick={() => setFieldValue("percepciones", [...(values.percepciones || []), nuevaPercepcion()])}
                                >
                                    <FaPlus /> Agregar percepción
                                </BtnAgregar>
                            </BloquePercepciones>

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
