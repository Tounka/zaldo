import styled from "styled-components";
import { ContenedorFormularioGenerico, ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm } from "../genericos/FormulariosV1";
import { validarCampoNumerico } from "../../funciones/validaciones";
import { modificarCuenta, modificarMontoDesdeMovimiento } from "../../funciones/firebase/cuentas";
import { useContextoModales } from "../../contextos/modales";
import { manejarTarjetas } from "../../funciones/comportamientoTarjetas";
import { agregarMovimiento } from "../../funciones/firebase/movimientos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";

const ContenedorFormulario = styled.div`
    width: 500px;
    max-width: 100%;
    height: 500px;
    max-height: 90%;
    display: grid;
    grid-template-rows: auto 1fr 60px;
    padding: 0 20px 20px 20px;
    align-items: center;
    gap: 10px;
`;

const Formulario = styled(Form)`
    display: flex;
    flex-direction: column;
`;

const ContenedorInputs = styled.div`
    width: 100%;
    height: 100%;
    justify-content: start;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const ModalModificarMontoCuenta = () => {
    const { usuario, cuentaSeleccionada, cuentas, setCuentas, setMovimientos, movimientos } = useContextoGeneral();
    const { isOpenModificarMontoCuenta, setIsOpenModificarMontoCuenta } = useContextoModales();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const onClose = () => {
        setIsOpenModificarMontoCuenta(false);
    };

    const cuentaManejada = manejarTarjetas(cuentaSeleccionada);

    const handleChangeMonto = (monto) => {
        const arregloModificado = cuentas.map((cuenta) =>
            cuenta.id === cuentaSeleccionada.id
                ? { ...cuentaSeleccionada, saldoALaFecha: Number(monto) }
                : { ...cuenta }
        );
        setCuentas(arregloModificado);
    };
    const handleActualizar = (nuevoMovimiento) => {
        const fecha = convertirADatosFecha(new Date());
        const fechaConvertida = `${fecha.anio}${fecha.mes}`;

        setMovimientos(prev => {
            const movimientosPrevios = prev[fechaConvertida] || [];

            return {
                ...prev,
                [fechaConvertida]: [...movimientosPrevios, nuevoMovimiento],
            };
        });
    };

    const validateForm = (values) => {
        const errors = {};
        const { error } = validarCampoNumerico(values.saldoALaFecha);
        if (error) errors.saldoALaFecha = error;
        return errors;
    };

    if (!cuentaSeleccionada) return null;

    const initialValues = {
        saldoALaFecha: cuentaManejada?.saldoALaFecha,
        tipoDeCuenta: cuentaManejada?.tipoDeCuenta,
    };

    const onSubmit = async (values, { resetForm }) => {
        if (!isSubmitting) {
            setIsSubmitting(true);


            try {
                let montoRam = values.saldoALaFecha;
                if (values.tipoDeCuenta === "credito") {
                    montoRam = montoRam * -1;
                }
                const montoAEnviar = {
                    monto: montoRam - cuentaSeleccionada.saldoALaFecha,
                    cuentaAsociada: cuentaSeleccionada.id,
                    nombreCuenta: cuentaSeleccionada.nombre,
                    categoria: "ajusteDeSaldo",
                    nota: "Ajuste De Saldo",
                }

                const dataActualizada = await modificarCuenta(values, usuario.uid, cuentaSeleccionada?.id);
                handleChangeMonto(dataActualizada?.saldoALaFecha);

                const movimientoAgregado = await agregarMovimiento(montoAEnviar, usuario.uid);
                if (movimientos.length !== 0) {
                    handleActualizar(movimientoAgregado);

                }

                resetForm();
                onClose();
            } catch (error) {
                console.log("Ha sucedido un error al modificar la cuenta:");
            } finally {
                setIsSubmitting(false);
            }
        }

    };

    return (
        <ModalGenerico isOpen={isOpenModificarMontoCuenta} onClose={onClose}>
            <Formik
                validate={validateForm}
                initialValues={initialValues}
                onSubmit={onSubmit}
                enableReinitialize={true}
            >
                {({ handleSubmit }) => (
                    <Formulario onSubmit={handleSubmit}>
                        <FormularioModificarCuenta />
                    </Formulario>
                )}
            </Formik>
        </ModalGenerico>
    );
};

export const FormularioModificarCuenta = () => {
    return (
        <ContenedorFormularioGenerico>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Modifica el monto actual
            </H2>
            <ContenedorInputs>
                <FieldForm
                    id="saldoALaFecha"
                    name="saldoALaFecha"
                    type="number"
                    step=".1"
                    placeholder="Ingresa el monto actual"
                />
            </ContenedorInputs>
            <BtnSubmit type="submit">Enviar</BtnSubmit>
        </ContenedorFormularioGenerico>
    );
};
