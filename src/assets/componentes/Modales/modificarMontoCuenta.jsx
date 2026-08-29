import styled from "styled-components";
import { avisarError } from "../../funciones/utils/avisos";
import { FaDollarSign, FaPlus } from "react-icons/fa";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico, RejillaCamposModal } from "./modalGenerico";
import { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm } from "../genericos/FormulariosV1";
import { validarCampoNumerico } from "../../funciones/validaciones";
import { modificarCuenta } from "../../funciones/firebase/cuentas";
import { manejarTarjetas } from "../../funciones/comportamientoTarjetas";
import { agregarMovimiento } from "../../funciones/firebase/movimientos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";

/* ================== STYLES ================== */

const Formulario = styled(Form)`
    display: flex;
    flex-direction: column;
`;

const ContenedorInputs = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

/* ================== MODAL ================== */

export const ModalModificarMontoCuenta = () => {
    const {
        usuario,
        cuentaSeleccionada,
        setCuentas,
        movimientos,
        setMovimientos,
    } = useAppStore();

    const {
        isOpenModificarMontoCuenta,
        setIsOpenModificarMontoCuenta,
        abrirAgregarMovimiento,
    } = useModalStore();

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!cuentaSeleccionada) return null;

    const onClose = () => setIsOpenModificarMontoCuenta(false);

    /*
     * Ajustar el saldo y registrar un movimiento son las dos formas de cambiar
     * el monto de la cuenta, así que el salto se ofrece aquí mismo: se cierra
     * este modal y se abre el de movimiento ya apuntando a esta cuenta.
     */
    const handleNuevoMovimiento = () => {
        setIsOpenModificarMontoCuenta(false);
        abrirAgregarMovimiento({ cuenta: cuentaSeleccionada });
    };

    const cuentaManejada = manejarTarjetas(cuentaSeleccionada);

    /* ================== HELPERS ================== */

    const handleActualizarCuentaLocal = (dataActualizada) => {
        setCuentas((prev) =>
            prev.map((cuenta) =>
                cuenta.id === cuentaSeleccionada.id
                    ? { ...cuenta, ...dataActualizada }
                    : cuenta
            )
        );
    };

    const handleActualizarMovimientos = (nuevoMovimiento) => {
        const fecha = convertirADatosFecha(new Date());
        const key = `${fecha.anio}${fecha.mes}`;

        setMovimientos((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), nuevoMovimiento],
        }));
    };

    /* ================== FORM ================== */

    const initialValues = {
        saldoALaFecha: cuentaManejada?.saldoALaFecha ?? 0,
        saldoALaFechaMSI: cuentaManejada?.saldoALaFechaMSI ?? 0,
        tipoDeCuenta: cuentaManejada?.tipoDeCuenta,
    };

    const validateForm = (values) => {
        const errors = {};

        const errorSaldo = validarCampoNumerico(values.saldoALaFecha);
        if (errorSaldo.error) errors.saldoALaFecha = errorSaldo.error;

        const errorMsi = validarCampoNumerico(values.saldoALaFechaMSI);
        if (errorMsi.error) errors.saldoALaFechaMSI = errorMsi.error;

        return errors;
    };

    const onSubmit = async (values, { resetForm }) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            let nuevoSaldo = Number(values.saldoALaFecha);
            let nuevoSaldoMSI = Number(values.saldoALaFechaMSI);

            if (values.tipoDeCuenta === "credito") {
                nuevoSaldo *= -1;
                nuevoSaldoMSI *= -1;
            }

            const diferenciaSaldoNormal =
                nuevoSaldo - cuentaSeleccionada.saldoALaFecha;

            const diferenciaSaldoMSI =
                nuevoSaldoMSI -
                (cuentaSeleccionada.saldoALaFechaMSI ?? 0);

            const movimientosACrear = [];

            if (diferenciaSaldoNormal !== 0) {
                movimientosACrear.push({
                    monto: diferenciaSaldoNormal,
                    cuentaAsociada: cuentaSeleccionada.id,
                    nombreCuenta: cuentaSeleccionada.nombre,
                    categoria: "ajusteDeSaldo",
                    nota: "Ajuste de saldo",
                });
            }

            if (diferenciaSaldoMSI !== 0) {
                movimientosACrear.push({
                    monto: diferenciaSaldoMSI,
                    cuentaAsociada: cuentaSeleccionada.id,
                    nombreCuenta: cuentaSeleccionada.nombre,
                    categoria: "ajusteDeSaldoMSI",
                    nota: "Ajuste de saldo MSI",
                });
            }

            const valoresCuenta = {
                saldoALaFecha: nuevoSaldo,
                saldoALaFechaMSI: nuevoSaldoMSI,
            };

            const dataActualizada = await modificarCuenta(
                valoresCuenta,
                usuario.uid,
                cuentaSeleccionada.id
            );

            handleActualizarCuentaLocal(dataActualizada);

            for (const movimiento of movimientosACrear) {
                const movimientoAgregado = await agregarMovimiento(
                    movimiento,
                    usuario.uid
                );

                if (Object.keys(movimientos).length !== 0) {
                    handleActualizarMovimientos(movimientoAgregado);
                }
            }

            resetForm();
            onClose();
        } catch (error) {
            avisarError("No se pudo actualizar el saldo. Intenta de nuevo.", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalGenerico isOpen={isOpenModificarMontoCuenta} onClose={onClose}>
            <Formik
                initialValues={initialValues}
                validate={validateForm}
                onSubmit={onSubmit}
                enableReinitialize
            >
                {({ handleSubmit }) => (
                    <Formulario onSubmit={handleSubmit}>
                        <FormularioModificarCuenta
                            esCredito={cuentaManejada?.tipoDeCuenta === "credito"}
                            onNuevoMovimiento={handleNuevoMovimiento}
                        />
                    </Formulario>
                )}
            </Formik>
        </ModalGenerico>
    );
};

/* ================== FORM UI ================== */
const Label = styled.label`
    cursor: pointer;
    color:var(--colorMorado);
    font-size: 18px;
    padding-left: 10px;
    font-weight: bold;
`

const BtnNuevoMovimiento = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 14px;
    border: 1px dashed rgba(83, 59, 143, .45);
    border-radius: 10px;
    background: rgba(83, 59, 143, .05);
    color: var(--colorMorado);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;

    &:hover {
        background: rgba(83, 59, 143, .1);
        border-color: var(--colorMorado);
    }

    &:focus-visible {
        outline: 2px solid var(--colorMorado);
        outline-offset: 2px;
    }
`;

const SeparadorAcciones = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    color: #9a93a6;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;

    &::before,
    &::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(83, 59, 143, .16);
    }
`;

export const FormularioModificarCuenta = ({ esCredito, onNuevoMovimiento }) => {
    return (
        <ContenedorFormularioGenerico>
            <ModalEncabezado
                icon={<FaDollarSign />}
                title="Modifica el monto actual"
                description="Actualiza el saldo registrado de esta cuenta."
            />

            <ContenedorInputs>
                <RejillaCamposModal>
                    <div>
                        <Label htmlFor="saldoALaFecha" > Saldo </Label>
                        <FieldForm
                            id="saldoALaFecha"
                            name="saldoALaFecha"
                            type="number" inputMode="decimal"
                            step=".01"
                            placeholder="Saldo actual"
                        />
                    </div>
                    {esCredito ?
                        <div>
                            <Label htmlFor="saldoALaFechaMSI" > Saldo MSI </Label>
                            <FieldForm
                                id="saldoALaFechaMSI"
                                name="saldoALaFechaMSI"
                                type="number" inputMode="decimal"
                                step=".01"
                                placeholder="Saldo en MSI"
                            />
                        </div> : <></>
                    }
                </RejillaCamposModal>

                {onNuevoMovimiento && (
                    <>
                        <SeparadorAcciones>o</SeparadorAcciones>

                        <BtnNuevoMovimiento type="button" onClick={onNuevoMovimiento}>
                            <FaPlus aria-hidden="true" /> Registrar un nuevo movimiento
                        </BtnNuevoMovimiento>
                    </>
                )}
            </ContenedorInputs>

            <BtnSubmit type="submit">Guardar</BtnSubmit>
        </ContenedorFormularioGenerico>
    );
};
