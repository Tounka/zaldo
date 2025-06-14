import styled from "styled-components";
import { ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { HiLibrary } from "react-icons/hi";
import { tipoDeCuentaInput } from "../../funciones/esqueletos";
import { altaDeCuenta } from "../../funciones/firebase/cuentas";


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

export const ModalAgregarCuenta = () => {
    const { isOpenAgregarCuenta, setIsOpenAgregarCuenta, usuario, instituciones, setCuentas } = useContextoGeneral();
    const institucionesLabel = instituciones.map((institucion) => ({
        label: institucion.nombre,
        value: institucion.id
    }));

    const onClose = () => {
        setIsOpenAgregarCuenta(false);
    }

    const handleActualizar = (cuenta) => {
        setCuentas(prev => [...prev, cuenta]);
    }


    const [isSubmitting, setIsSubmitting] = useState(false);
    const validateForm = (values) => {
        const errors = {};

        const { error: nombreError } = validarCampoRequerido(values.nombreCuenta);
        const { error: institucionError } = validarCampoRequerido(values.institucionAsociada);
        const { error: tipoCuentaError } = validarCampoRequerido(values.tipoDeCuenta);

        if (nombreError) {
            errors.nombreCuenta = nombreError;
        }

        if (institucionError) {
            errors.institucionAsociada = institucionError;
        }

        if (tipoCuentaError) {
            errors.tipoDeCuenta = tipoCuentaError;
        }

        return errors;
    };


    const initialValues = {
        nombreCuenta: "",
        institucionAsociada: "",
        tipoDeCuenta: "",

    };

    const onSubmit = async (values, { resetForm }) => {
        setIsSubmitting(true);
        try {
            const cuenta = await altaDeCuenta(values, usuario.uid);

            handleActualizar(cuenta);

            resetForm();
            onClose();
        } catch (error) {
            console.log("Ha sucedido un error al agregar instituciones", error);
        }
    };

    return (
        <ModalGenerico isOpen={isOpenAgregarCuenta} onClose={onClose}>
            <Formik
                validate={validateForm}
                initialValues={initialValues}
                onSubmit={onSubmit}
                enableReinitialize={true}
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
                        <FormularioAgregarCuenta validateForm={validateForm} initialValues={initialValues} onSubmit={onSubmit} instituciones={institucionesLabel} />
                    </Formulario>
                )}
            </Formik>
        </ModalGenerico>
    )
}
export const FormularioAgregarCuenta = ({ validateForm, initialValues, onSubmit, instituciones }) => {

    return (
        <ContenedorFormulario>
            <H2 size="30px" align="center" color="var(--colorMorado)">Agregar Cuenta</H2>
            <ContenedorInputs>
                <SelectForm id="institucionAsociada" name="institucionAsociada" placeholder="Selecciona la institución a la que pertenece" options={instituciones} icon={<HiLibrary />} />
                <FieldForm id="nombreCuenta" name="nombreCuenta" type="text" placeholder="Ingresa el nombre de la cuenta" />
                <SelectForm id="tipoDeCuenta" name="tipoDeCuenta" placeholder="Selecciona el tipo de cuenta" options={tipoDeCuentaInput} icon={<HiLibrary />} />
            </ContenedorInputs>
            <BtnSubmit type="submit"> Enviar </BtnSubmit>
        </ContenedorFormulario>

    )
}
