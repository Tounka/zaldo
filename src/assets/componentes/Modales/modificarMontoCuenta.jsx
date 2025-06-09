import styled from "styled-components";
import { ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm } from "../genericos/FormulariosV1";
import { validarCampoNumerico, validarCampoRequerido } from "../../funciones/validaciones";
import { altaDeInstitucion } from "../../funciones/firebase/instituciones";
import { useContextoModales } from "../../contextos/modales";
import { modificarCuenta } from "../../funciones/firebase/cuentas";


const ContenedorFormulario = styled.div`
    width: 500px;
    max-width: 100%;
    height: 500px;
    max-height: 90%;
    display: grid;
    grid-template-rows: auto 1fr 60px;
    padding: 0 20px 20px 20px;
    align-items: center;
    gap:10px;
`
const Formulario = styled(Form)`
    display: flex;
    flex-direction: column;
    
`

const ContenedorInputs = styled.div`
    width: 100%;
    height: 100%;
    justify-content:start;
     display: flex;
    flex-direction: column;
    gap: 10px;
    
`

export const ModalModificarMontoCuenta = () => {
    const { usuario} = useContextoGeneral();
    const {isOpenModificarMontoCuenta, setIsOpenModificarMontoCuenta} = useContextoModales();
    const {cuentaSeleccionada} = useContextoGeneral();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const onClose = () => {
        setIsOpenModificarMontoCuenta(false);
    }
    const validateForm = (values) => {
        const errors = {};

        const { error, valor } = validarCampoNumerico(values.saldoALaFecha);
        if (error) {
            errors.saldoALaFecha = error;
        }

        return errors;
    };

    const initialValues = {
        saldoALaFecha: 0,

    };

    const onSubmit = async (values, { resetForm }) => {
        setIsSubmitting(true);
        try{
            await modificarCuenta({saldoALaFecha:Number(values.saldoALaFecha)}, usuario.uid,cuentaSeleccionada?.id);
            resetForm();
            onClose();
        }catch(error){
            console.log("Ha sucedido un error al agregar instituciones", error);
        }
        
    };

    return (
        <ModalGenerico isOpen={isOpenModificarMontoCuenta} onClose={onClose}>
            <Formik
                validate={validateForm}
                initialValues={initialValues}
                onSubmit={onSubmit}
            >
                {({
                    values,
                    handleChange,
                    handleSubmit,
                    setFieldValue,
                    handleBlur,
                    isSubmitting: formikIsSubmitting
                }) => (
                    <Formulario onSubmit={handleSubmit}>
                        <FormularioModificarCuenta validateForm={validateForm} initialValues={initialValues} onSubmit={onSubmit} />
                    </Formulario>
                )}
            </Formik>
        </ModalGenerico>
    )
}
export const FormularioModificarCuenta = ({ validateForm, initialValues, onSubmit }) => {
    return (
        <ContenedorFormulario>
            <H2 size="30px" align="center" color="var(--colorMorado)">Modifica el monto actual</H2>
            <ContenedorInputs>
                <FieldForm id="saldoALaFecha" name="saldoALaFecha" type="number" placeholder="Ingresa el monto actual" onChange={(e) => setNombre(e.target.value)} />
            </ContenedorInputs>
            <BtnSubmit type="submit"> Enviar </BtnSubmit>
        </ContenedorFormulario>

    )
}
