import styled from "styled-components";
import { Formik, Form } from "formik";
import { useState } from "react";
import {
    FaUser,
    FaDollarSign,
    FaPercent,
    FaCalendarAlt,
    FaHashtag,
    FaPlus,
    FaUserTie,
} from "react-icons/fa";
import { ModalEncabezado, ModalGenerico } from "../../componentes/modales/modalGenerico";
import { FieldForm, SelectForm, BtnSubmit } from "../../componentes/genericos/formulariosV1";
import { crearPrestamo } from "../../funciones/firebase/prestamos";
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

const BotonesWrapper = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
`;

const OPCIONES_PERIODICIDAD = [
    { value: "dias_mes", label: "Días fijos del mes (ej. 15 y 30)" },
    { value: "frecuencia_dias", label: "Frecuencia cada N días" },
    { value: "fechas_especificas", label: "Fechas específicas" },
];

export const ModalNuevoPrestamoCobranza = ({
    isOpen,
    onClose,
    uid,
    onPrestamoCreado,
}) => {
    const [cargando, setCargando] = useState(false);

    const hoyStr = new Date().toISOString().split("T")[0];

    const initialValues = {
        nombre: "",
        montoPrestado: "",
        interesEstimado: "10",
        abonoTeorico: "",
        tipoPeriodicidad: "dias_mes",
        diasMes: "15, 30",
        diasDePago: "15",
        fechasEspecificas: "",
        fechaInicio: hoyStr,
        numPagos: "",
        asignadoA: "", // Email o UID de la persona asignada (ej. Mamá)
    };

    const validate = (values) => {
        const errors = {};
        if (!values.nombre) errors.nombre = "Requerido";
        if (!values.montoPrestado || Number(values.montoPrestado) <= 0)
            errors.montoPrestado = "Debe ser > 0";
        if (!values.fechaInicio) errors.fechaInicio = "Requerido";
        return errors;
    };

    const handleCrear = async (values, { resetForm }) => {
        setCargando(true);
        try {
            const nuevoPrestamoData = {
                nombre: values.nombre,
                montoPrestado: Number(values.montoPrestado),
                interesEstimado: Number(values.interesEstimado || 0),
                abonoTeorico: values.abonoTeorico ? Number(values.abonoTeorico) : null,
                tipoPeriodicidad: values.tipoPeriodicidad,
                fechaInicio: values.fechaInicio,
                numPagos: values.numPagos ? Number(values.numPagos) : null,
                asignadoA: values.asignadoA ? values.asignadoA.trim() : null,
                estado: "pendiente",
                activo: true,
            };

            if (values.tipoPeriodicidad === "dias_mes") {
                const diasArray = String(values.diasMes)
                    .split(",")
                    .map((d) => Number(d.trim()))
                    .filter((n) => !isNaN(n) && n >= 1 && n <= 31);
                nuevoPrestamoData.diasMes = diasArray.length > 0 ? diasArray : [15, 30];
                nuevoPrestamoData.diasDePago = nuevoPrestamoData.diasMes[0] || 15;
            } else if (values.tipoPeriodicidad === "frecuencia_dias") {
                nuevoPrestamoData.diasDePago = Number(values.diasDePago || 15);
            } else if (values.tipoPeriodicidad === "fechas_especificas") {
                nuevoPrestamoData.fechasEspecificas = String(values.fechasEspecificas)
                    .split(",")
                    .map((f) => f.trim())
                    .filter(Boolean);
            }

            const creado = await crearPrestamo(nuevoPrestamoData, uid);
            onPrestamoCreado?.(creado);
            Swal.fire({
                icon: "success",
                title: "Préstamo registrado",
                text: `Se ha programado la cobranza para ${values.nombre}`,
                timer: 2000,
                showConfirmButton: false,
            });
            resetForm();
            onClose();
        } catch (error) {
            console.error("Error al crear préstamo:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo registrar el préstamo.",
            });
        } finally {
            setCargando(false);
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <ContenedorModal>
                <ModalEncabezado
                    icon={<FaPlus />}
                    title="Registrar Nuevo Préstamo"
                    description="Configura al deudor, las fechas programadas y el abono esperado."
                    bleed={24}
                />

                <Formik
                    initialValues={initialValues}
                    validate={validate}
                    onSubmit={handleCrear}
                >
                    {({ values }) => (
                        <FormularioStyled>
                            <FieldForm
                                id="nombre"
                                name="nombre"
                                type="text"
                                label="Nombre del deudor"
                                placeholder="Nombre completo"
                                icon={<FaUser />}
                            />
                            <FieldForm
                                id="montoPrestado"
                                name="montoPrestado"
                                type="number" inputMode="decimal"
                                label="Monto prestado ($)"
                                placeholder="Ej. 5000"
                                icon={<FaDollarSign />}
                                min="0"
                                step="0.01"
                            />
                            <FieldForm
                                id="interesEstimado"
                                name="interesEstimado"
                                type="number" inputMode="decimal"
                                label="Interés estimado (%)"
                                placeholder="10"
                                icon={<FaPercent />}
                                min="0"
                                step="0.01"
                            />
                            <FieldForm
                                id="abonoTeorico"
                                name="abonoTeorico"
                                type="number" inputMode="decimal"
                                label="Abono sugerido / cuota ($)"
                                placeholder="Ej. 500"
                                icon={<FaDollarSign />}
                                min="0"
                                step="0.01"
                            />
                            <FieldForm
                                id="fechaInicio"
                                name="fechaInicio"
                                type="date"
                                label="Fecha de inicio"
                                icon={<FaCalendarAlt />}
                            />
                            <FieldForm
                                id="numPagos"
                                name="numPagos"
                                type="number" inputMode="decimal"
                                label="Total de cuotas (opcional)"
                                placeholder="Ej. 10"
                                icon={<FaHashtag />}
                                min="1"
                            />

                            <SpanFull>
                                <FieldForm
                                    id="asignadoA"
                                    name="asignadoA"
                                    type="text"
                                    label="Asignar a cobradora (Email o UID opcional)"
                                    placeholder="Ej. correo de tu mamá o dejar vacío para todos"
                                    icon={<FaUserTie />}
                                />
                            </SpanFull>

                            <SpanFull>
                                <SelectForm
                                    id="tipoPeriodicidad"
                                    name="tipoPeriodicidad"
                                    options={OPCIONES_PERIODICIDAD}
                                    placeholder="Periodicidad de cobro"
                                    icon={<FaCalendarAlt />}
                                />
                            </SpanFull>

                            {values.tipoPeriodicidad === "dias_mes" && (
                                <SpanFull>
                                    <FieldForm
                                        id="diasMes"
                                        name="diasMes"
                                        type="text"
                                        label="Días del mes de cobro (separados por coma)"
                                        placeholder="15, 30"
                                        icon={<FaCalendarAlt />}
                                    />
                                </SpanFull>
                            )}

                            {values.tipoPeriodicidad === "frecuencia_dias" && (
                                <SpanFull>
                                    <FieldForm
                                        id="diasDePago"
                                        name="diasDePago"
                                        type="number" inputMode="decimal"
                                        label="Cada cuántos días cobrar"
                                        placeholder="15"
                                        icon={<FaCalendarAlt />}
                                        min="1"
                                    />
                                </SpanFull>
                            )}

                            {values.tipoPeriodicidad === "fechas_especificas" && (
                                <SpanFull>
                                    <FieldForm
                                        id="fechasEspecificas"
                                        name="fechasEspecificas"
                                        type="text"
                                        label="Fechas específicas (YYYY-MM-DD separadas por coma)"
                                        placeholder="2026-08-15, 2026-08-30"
                                        icon={<FaCalendarAlt />}
                                    />
                                </SpanFull>
                            )}

                            <BotonesWrapper>
                                <BtnSubmit type="submit" disabled={cargando}>
                                    {cargando ? "Registrando..." : "Crear Préstamo"}
                                </BtnSubmit>
                            </BotonesWrapper>
                        </FormularioStyled>
                    )}
                </Formik>
            </ContenedorModal>
        </ModalGenerico>
    );
};
