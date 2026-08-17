import styled from "styled-components";
import { Formik, Form } from "formik";
import { useEffect, useState } from "react";
import {
    FaUser,
    FaDollarSign,
    FaPercent,
    FaCalendarAlt,
    FaHashtag,
    FaTrash,
    FaUndo,
} from "react-icons/fa";
import { ModalGenerico } from "../../componentes/modales/modalGenerico";
import { FieldForm, SelectForm, BtnSubmit } from "../../componentes/genericos/formulariosV1";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import { modificarPrestamo, softDeletePrestamo, reactivarPrestamo } from "../../funciones/firebase/prestamos";
import { obtenerUsuarios } from "../../funciones/firebase/usuario";
import { SearchableCollaboratorSelect } from "./selectorColaboradores";
import Swal from "sweetalert2";

const ContenedorModal = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 10px;
  flex-wrap: wrap;
`;

const BtnPeligro = styled.button`
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
  transition: all 0.2s ease;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;

const BtnReactivar = styled.button`
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #28a745;
    color: white;
  }
`;

const OPCIONES_PERIODICIDAD = [
    { value: "dias_mes", label: "Días fijos del mes (ej. 15 y 30)" },
    { value: "frecuencia_dias", label: "Frecuencia cada N días" },
    { value: "fechas_especificas", label: "Fechas específicas" },
];

export const ModalEditarPrestamo = ({
    isOpen,
    onClose,
    prestamo,
    uid,
    onPrestamoActualizado,
    esAdmin = false,
}) => {
    const [cargando, setCargando] = useState(false);
    const [colaboradores, setColaboradores] = useState([]);

    useEffect(() => {
        if (!isOpen || !esAdmin) return;
        obtenerUsuarios().then(setColaboradores);
    }, [isOpen, esAdmin]);

    if (!prestamo || !esAdmin) return null;

    const initialValues = {
        nombre: prestamo.nombre || "",
        montoPrestado: prestamo.montoPrestado || "",
        interesEstimado: prestamo.interesEstimado !== undefined ? prestamo.interesEstimado : "",
        tipoPeriodicidad: prestamo.tipoPeriodicidad || "dias_mes",
        diasMes: Array.isArray(prestamo.diasMes) ? prestamo.diasMes.join(", ") : (prestamo.diasDePago || "15, 30"),
        diasDePago: prestamo.diasDePago || 15,
        fechasEspecificas: Array.isArray(prestamo.fechasEspecificas) ? prestamo.fechasEspecificas.join(", ") : "",
        abonoTeorico: prestamo.abonoTeorico || "",
        numPagos: prestamo.numPagos || "",
        cobradoresAsignados: Array.isArray(prestamo.cobradoresAsignados) && prestamo.cobradoresAsignados.length > 0
            ? prestamo.cobradoresAsignados
            : (prestamo.asignadoA ? [prestamo.asignadoA] : []),
    };

    const validate = (values) => {
        const errors = {};
        if (!values.nombre) errors.nombre = "Requerido";
        if (!values.montoPrestado || Number(values.montoPrestado) <= 0)
            errors.montoPrestado = "Debe ser > 0";
        return errors;
    };

    const handleGuardar = async (values) => {
        setCargando(true);
        try {
            const dataActualizada = {
                nombre: values.nombre,
                montoPrestado: Number(values.montoPrestado),
                interesEstimado: Number(values.interesEstimado || 0),
                tipoPeriodicidad: values.tipoPeriodicidad,
                abonoTeorico: values.abonoTeorico ? Number(values.abonoTeorico) : null,
                numPagos: values.numPagos ? Number(values.numPagos) : null,
                asignadoA: values.cobradoresAsignados?.[0] || null,
                cobradoresAsignados: values.cobradoresAsignados || [],
            };

            if (values.tipoPeriodicidad === "dias_mes") {
                const diasArray = String(values.diasMes)
                    .split(",")
                    .map((d) => Number(d.trim()))
                    .filter((n) => !isNaN(n) && n >= 1 && n <= 31);
                dataActualizada.diasMes = diasArray.length > 0 ? diasArray : [15, 30];
            } else if (values.tipoPeriodicidad === "frecuencia_dias") {
                dataActualizada.diasDePago = Number(values.diasDePago || 15);
            } else if (values.tipoPeriodicidad === "fechas_especificas") {
                dataActualizada.fechasEspecificas = String(values.fechasEspecificas)
                    .split(",")
                    .map((f) => f.trim())
                    .filter(Boolean);
            }

            await modificarPrestamo(uid, prestamo.id, dataActualizada);
            onPrestamoActualizado?.({ ...prestamo, ...dataActualizada });
            Swal.fire({
                icon: "success",
                title: "Préstamo actualizado",
                showConfirmButton: false,
                timer: 1500,
            });
            onClose();
        } catch (error) {
            console.error("Error al actualizar:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo actualizar el préstamo.",
            });
        } finally {
            setCargando(false);
        }
    };

    const handleSoftDelete = async () => {
        const result = await Swal.fire({
            title: "¿Ocultar este préstamo?",
            text: "No se borrará de la base de datos, solo se ocultará y ya no se tomará en cuenta para cálculos ni órdenes de cobro.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Sí, ocultar",
            cancelButtonText: "Cancelar",
        });

        if (result.isConfirmed) {
            setCargando(true);
            const ok = await softDeletePrestamo(uid, prestamo.id);
            if (ok) {
                onPrestamoActualizado?.({ ...prestamo, activo: false });
                Swal.fire("Ocultado", "El préstamo ha sido desactivado.", "success");
                onClose();
            } else {
                Swal.fire("Error", "No se pudo ocultar el préstamo.", "error");
            }
            setCargando(false);
        }
    };

    const handleReactivar = async () => {
        setCargando(true);
        const ok = await reactivarPrestamo(uid, prestamo.id);
        if (ok) {
            onPrestamoActualizado?.({ ...prestamo, activo: true });
            Swal.fire("Reactivado", "El préstamo vuelve a estar activo.", "success");
            onClose();
        } else {
            Swal.fire("Error", "No se pudo reactivar el préstamo.", "error");
        }
        setCargando(false);
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <ContenedorModal>
                <H2 size="20px" color="var(--colorMorado)">
                    Editar Préstamo / Configuración
                </H2>
                <TxtGenerico size="13px" color="#666">
                    {prestamo.activo === false
                        ? "Este préstamo está actualmente OCULTO / DESACTIVADO."
                        : "Modifica montos, fechas de corte, cuotas o cobrador asignado."}
                </TxtGenerico>

                <Formik
                    initialValues={initialValues}
                    validate={validate}
                    onSubmit={handleGuardar}
                    enableReinitialize
                >
                    {({ values, setFieldValue }) => (
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
                                type="number"
                                label="Monto prestado ($)"
                                placeholder="0.00"
                                icon={<FaDollarSign />}
                                min="0"
                                step="0.01"
                            />
                            <FieldForm
                                id="interesEstimado"
                                name="interesEstimado"
                                type="number"
                                label="Interés estimado (%)"
                                placeholder="0"
                                icon={<FaPercent />}
                                min="0"
                                step="0.01"
                            />
                            <FieldForm
                                id="abonoTeorico"
                                name="abonoTeorico"
                                type="number"
                                label="Abono sugerido / cuota ($)"
                                placeholder="Ej. 500"
                                icon={<FaDollarSign />}
                                min="0"
                                step="0.01"
                            />

                            <SpanFull>
                                <label htmlFor="cobradoresAsignados" style={{ fontSize: 16, fontWeight: 700, color: "var(--colorPrincipal)", marginBottom: 4 }}>
                                    Asignar colaboradores
                                </label>
                                <SearchableCollaboratorSelect
                                    usuarios={colaboradores}
                                    value={values.cobradoresAsignados}
                                    multiple
                                    placeholder="Busca y selecciona cobradores..."
                                    onChange={(value) => setFieldValue("cobradoresAsignados", value)}
                                />
                                <span style={{ fontSize: 11, color: "rgba(26, 26, 46, 0.65)" }}>
                                    Puedes asignar uno o varios colaboradores. Solo administración puede cambiar esta configuración.
                                </span>
                            </SpanFull>

                            <SpanFull>
                                <SelectForm
                                    id="tipoPeriodicidad"
                                    name="tipoPeriodicidad"
                                    options={OPCIONES_PERIODICIDAD}
                                    placeholder="Periodicidad de pago"
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
                                        type="number"
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

                            <FieldForm
                                id="numPagos"
                                name="numPagos"
                                type="number"
                                label="Total de pagos estimados"
                                placeholder="Ej. 12"
                                icon={<FaHashtag />}
                                min="1"
                            />

                            <BotonesWrapper>
                                {prestamo.activo === false ? (
                                    <BtnReactivar type="button" onClick={handleReactivar} disabled={cargando}>
                                        <FaUndo /> Reactivar Préstamo
                                    </BtnReactivar>
                                ) : (
                                    <BtnPeligro type="button" onClick={handleSoftDelete} disabled={cargando}>
                                        <FaTrash /> Ocultar Préstamo
                                    </BtnPeligro>
                                )}

                                <BtnSubmit type="submit" disabled={cargando}>
                                    {cargando ? "Guardando..." : "Guardar Cambios"}
                                </BtnSubmit>
                            </BotonesWrapper>
                        </FormularioStyled>
                    )}
                </Formik>
            </ContenedorModal>
        </ModalGenerico>
    );
};
