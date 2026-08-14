import styled from "styled-components";
import { Formik, Form } from "formik";
import { useState, useEffect } from "react";
import {
    FaBuilding,
    FaDollarSign,
    FaCalendarAlt,
    FaClock,
    FaCheckCircle,
    FaHashtag,
    FaTrash,
    FaCalculator,
} from "react-icons/fa";
import { ModalGenerico } from "../../../componentes/modales/modalGenerico";
import { FieldForm, SelectForm, BtnSubmit } from "../../../componentes/genericos/formulariosV1";
import { H2, TxtGenerico } from "../../../componentes/genericos/titulos";
import { guardarRegistroPago, eliminarRegistroPago } from "../../../funciones/firebase/ingresos";
import {
    calcularTeoricoPorHoras,
    calcularTeoricoDiarioSextoDia,
} from "../../../funciones/ingresosCalculos";
import Swal from "sweetalert2";

const ContenedorModal = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
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

const BannerCalculo = styled.div`
  grid-column: 1 / -1;
  background: rgba(83, 59, 143, 0.06);
  border: 1px dashed rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--colorMorado);
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

const OPCIONES_ESTADO = [
    { value: "Pagado", label: "Pagado" },
    { value: "Pendiente", label: "Pendiente" },
];

export const ModalNuevoIngreso = ({
    isOpen,
    onClose,
    registro = null,
    empresaPreseleccionada = null,
    empresas = [],
    uid,
    year,
    dataIngresos,
    onGuardado,
}) => {
    const [cargando, setCargando] = useState(false);

    const hoyStr = new Date().toISOString().split("T")[0];
    const empresaActual = empresas.find(
        (e) => e.id === (registro?.empresaId || empresaPreseleccionada?.id)
    ) || empresas[0] || {};

    const initialValues = {
        empresaId: registro?.empresaId || empresaActual?.id || "",
        fecha: registro?.fecha || hoyStr,
        numeroPeriodo: registro?.numeroPeriodo || "",
        diasTrabajados: registro?.diasTrabajados !== undefined ? registro.diasTrabajados : (empresaActual?.tipoEsquema === "diario_sexto_dia" ? 5 : (empresaActual?.tipoEsquema === "por_horas" ? 3 : 15)),
        horasReportadas: registro?.horasReportadas !== undefined ? registro.horasReportadas : (empresaActual?.tipoEsquema === "por_horas" ? 11 : ""),
        precioHora: registro?.precioHora !== undefined ? registro.precioHora : (empresaActual?.precioHora || 52),
        montoTeorico: registro?.montoTeorico !== undefined ? registro.montoTeorico : "",
        montoExtra: registro?.montoExtra !== undefined ? registro.montoExtra : (empresaActual?.bonoInternet || 0),
        tipo: registro?.tipo || (empresaActual?.tipoEsquema === "por_horas" ? "Semana (Horas)" : (empresaActual?.tipoEsquema === "diario_sexto_dia" ? "Corte Semanal" : "Quincena")),
        estado: registro?.estado || "Pagado",
        montoReal: registro?.montoReal !== undefined ? registro.montoReal : "",
        notas: registro?.notas || "",
    };

    const validate = (values) => {
        const errors = {};
        if (!values.empresaId) errors.empresaId = "Selecciona una empresa";
        if (!values.fecha) errors.fecha = "Requerido";
        return errors;
    };

    const handleGuardar = async (values) => {
        setCargando(true);
        try {
            const emp = empresas.find((e) => e.id === values.empresaId);
            const registroData = {
                id: registro?.id,
                empresaId: values.empresaId,
                empresaNombre: emp?.nombre || "Empresa",
                fecha: values.fecha,
                numeroPeriodo: Number(values.numeroPeriodo || 1),
                diasTrabajados: values.diasTrabajados !== "" ? Number(values.diasTrabajados) : null,
                horasReportadas: values.horasReportadas !== "" ? Number(values.horasReportadas) : null,
                precioHora: values.precioHora !== "" ? Number(values.precioHora) : null,
                montoTeorico: Number(values.montoTeorico || 0),
                montoExtra: Number(values.montoExtra || 0),
                tipo: values.tipo,
                estado: values.estado,
                montoReal: values.montoReal !== "" ? Number(values.montoReal) : Number(values.montoTeorico || 0) + Number(values.montoExtra || 0),
                notas: values.notas,
            };

            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, registroData);
            onGuardado?.(dataActualizada);
            Swal.fire({
                icon: "success",
                title: "Registro de ingreso guardado",
                showConfirmButton: false,
                timer: 1500,
            });
            onClose();
        } catch (e) {
            console.error("Error al guardar registro:", e);
            Swal.fire("Error", "No se pudo guardar el registro.", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleEliminar = async () => {
        if (!registro?.id) return;
        const confirmacion = await Swal.fire({
            title: "¿Eliminar este registro?",
            text: "Se quitará este pago del historial del año.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirmacion.isConfirmed) {
            setCargando(true);
            try {
                const dataActualizada = await eliminarRegistroPago(uid, year, dataIngresos, registro.id);
                onGuardado?.(dataActualizada);
                Swal.fire("Eliminado", "El registro ha sido eliminado.", "success");
                onClose();
            } catch (e) {
                console.error("Error al eliminar registro:", e);
            } finally {
                setCargando(false);
            }
        }
    };

    const opcionesEmpresas = empresas.map((e) => ({
        value: e.id,
        label: e.nombre + (!e.activo ? " (Inactiva)" : ""),
    }));

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <ContenedorModal>
                <H2 size="20px" color="var(--colorMorado)">
                    <FaDollarSign style={{ marginRight: 6 }} />
                    {registro ? "Editar Registro de Pago" : "Registrar Pago / Percepción"}
                </H2>
                <TxtGenerico size="13px" color="#666">
                    Ingresa o ajusta los días, horas, monto teórico y el pago real recibido.
                </TxtGenerico>

                <Formik
                    initialValues={initialValues}
                    validate={validate}
                    onSubmit={handleGuardar}
                    enableReinitialize
                >
                    {({ values, setFieldValue }) => {
                        const empSeleccionada = empresas.find((e) => e.id === values.empresaId);

                        // Auto-cálculo de sugerido
                        let calculoSugerido = 0;
                        if (empSeleccionada?.tipoEsquema === "diario_sexto_dia") {
                            const res = calcularTeoricoDiarioSextoDia({
                                diasTrabajados: values.diasTrabajados,
                                salarioDiario: empSeleccionada.salarioDiario || 577,
                                incluirSextoDia: true,
                                bonosExtra: values.montoExtra,
                            });
                            calculoSugerido = res.total;
                        } else if (empSeleccionada?.tipoEsquema === "por_horas") {
                            const res = calcularTeoricoPorHoras({
                                horas: values.horasReportadas,
                                precioHora: values.precioHora || empSeleccionada.precioHora || 52,
                                bonoInternet: values.montoExtra || empSeleccionada.bonoInternet || 200,
                                aplicarResico: empSeleccionada.aplicarResico,
                            });
                            calculoSugerido = res.neto;
                        }

                        return (
                            <FormularioStyled>
                                <SpanFull>
                                    <SelectForm
                                        id="empresaId"
                                        name="empresaId"
                                        label="Empresa / Fuente"
                                        options={opcionesEmpresas}
                                        placeholder="Selecciona empresa"
                                        icon={<FaBuilding />}
                                    />
                                </SpanFull>

                                <FieldForm
                                    id="fecha"
                                    name="fecha"
                                    type="date"
                                    label="Fecha de Corte / Pago"
                                    icon={<FaCalendarAlt />}
                                />

                                <FieldForm
                                    id="numeroPeriodo"
                                    name="numeroPeriodo"
                                    type="number"
                                    label="Semana / Quincena #"
                                    placeholder="Ej. 1, 2, 3..."
                                    icon={<FaHashtag />}
                                />

                                {empSeleccionada?.tipoEsquema === "por_horas" && (
                                    <>
                                        <FieldForm
                                            id="horasReportadas"
                                            name="horasReportadas"
                                            type="number"
                                            label="Horas Reportadas"
                                            placeholder="Ej. 11"
                                            icon={<FaClock />}
                                            step="0.5"
                                        />
                                        <FieldForm
                                            id="precioHora"
                                            name="precioHora"
                                            type="number"
                                            label="Precio por Hora ($)"
                                            placeholder="Ej. 52"
                                            icon={<FaDollarSign />}
                                            step="0.01"
                                        />
                                    </>
                                )}

                                {empSeleccionada?.tipoEsquema === "diario_sexto_dia" && (
                                    <FieldForm
                                        id="diasTrabajados"
                                        name="diasTrabajados"
                                        type="number"
                                        label="Días Trabajados"
                                        placeholder="5"
                                        icon={<FaCalendarAlt />}
                                        step="0.5"
                                    />
                                )}

                                <FieldForm
                                    id="montoTeorico"
                                    name="montoTeorico"
                                    type="number"
                                    label="Monto Teórico Base ($)"
                                    placeholder="Ej. 2885 o 572"
                                    icon={<FaDollarSign />}
                                    step="0.01"
                                />

                                <FieldForm
                                    id="montoExtra"
                                    name="montoExtra"
                                    type="number"
                                    label="Extra (6to día / Bono / Otros $)"
                                    placeholder="Ej. 577 o 240"
                                    icon={<FaDollarSign />}
                                    step="0.01"
                                />

                                {calculoSugerido > 0 && (
                                    <BannerCalculo>
                                        <span>
                                            <FaCalculator style={{ marginRight: 6 }} />
                                            Cálculo teórico según fórmula:
                                        </span>
                                        <strong>${calculoSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</strong>
                                    </BannerCalculo>
                                )}

                                <SelectForm
                                    id="estado"
                                    name="estado"
                                    label="Estado de Pago"
                                    options={OPCIONES_ESTADO}
                                    placeholder="Estado"
                                    icon={<FaCheckCircle />}
                                />

                                <FieldForm
                                    id="montoReal"
                                    name="montoReal"
                                    type="number"
                                    label="Monto Real Confirmado / Pagado ($)"
                                    placeholder="Lo depositado en tu cuenta"
                                    icon={<FaDollarSign />}
                                    step="0.01"
                                />

                                <FieldForm
                                    id="tipo"
                                    name="tipo"
                                    type="text"
                                    label="Tipo de Pago"
                                    placeholder="Quincena, Bono, Finiquito, etc."
                                    icon={<FaCalendarAlt />}
                                />

                                <FieldForm
                                    id="notas"
                                    name="notas"
                                    type="text"
                                    label="Notas / Desglose"
                                    placeholder="Detalles sobre extras o aclaraciones"
                                    icon={<FaClock />}
                                />

                                <BotonesWrapper>
                                    {registro?.id ? (
                                        <BtnEliminar type="button" onClick={handleEliminar} disabled={cargando}>
                                            <FaTrash /> Eliminar
                                        </BtnEliminar>
                                    ) : <div />}

                                    <BtnSubmit type="submit" disabled={cargando}>
                                        {cargando ? "Guardando..." : "Guardar Pago"}
                                    </BtnSubmit>
                                </BotonesWrapper>
                            </FormularioStyled>
                        );
                    }}
                </Formik>
            </ContenedorModal>
        </ModalGenerico>
    );
};
