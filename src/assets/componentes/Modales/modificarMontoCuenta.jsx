import styled from "styled-components";
import { ContenedorFormularioGenerico, ModalGenerico } from "./modalGenerico";
import { H2, TxtGenerico } from "../genericos/titulos";
import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm } from "../genericos/FormulariosV1";
import { validarCampoNumerico } from "../../funciones/validaciones";
import { modificarCuenta } from "../../funciones/firebase/cuentas";
import { useContextoModales } from "../../contextos/modales";
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
        cuentas,
        setCuentas,
        movimientos,
        setMovimientos,
    } = useContextoGeneral();

    const { isOpenModificarMontoCuenta, setIsOpenModificarMontoCuenta } =
        useContextoModales();

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!cuentaSeleccionada) return null;

    const onClose = () => setIsOpenModificarMontoCuenta(false);

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
            console.error("Error al modificar la cuenta:", error);
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
                        <FormularioModificarCuenta esCredito={cuentaManejada?.tipoDeCuenta === "credito"} />
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
export const FormularioModificarCuenta = ({esCredito}) => {
    return (
        <ContenedorFormularioGenerico>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Modifica el monto actual
            </H2>

            <ContenedorInputs>
                <div>
                    <Label htmlFor="saldoALaFecha" > Saldo </Label>
                    <FieldForm
                        id="saldoALaFecha"
                        name="saldoALaFecha"
                        type="number"
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
                            type="number"
                            step=".01"
                            placeholder="Saldo en MSI"
                        />
                    </div> : <></>

                }

            </ContenedorInputs>

            <BtnSubmit type="submit">Guardar</BtnSubmit>
        </ContenedorFormularioGenerico>
    );
};
