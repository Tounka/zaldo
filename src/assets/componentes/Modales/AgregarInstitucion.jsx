import styled from "styled-components";
import { ModalGenerico } from "./ModalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";


const ContenedorFormulario = styled.div`
    width: 500px;
    max-width: 90%;
    height: 500px;
    max-height: 90%;
`
const Formulario = styled(Form)`
    display: flex;
    flex-direction: column;
    
`

export const ModalAgregarIntituciones = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const validateForm = (values) => {
            const errors = {};

            const nombreError = ValidateCampoRequerido(values.nombres);
            if (nombreError) errors.nombres = nombreError;
    
            return errors;
        };
    
        const initialValues = {
            nombres: "",

        };
    
        const onSubmit = async (values, { resetForm }) => {
            setIsSubmitting(true);
            console.log("hola")
        };
    
    return (
        <ModalGenerico>
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
                        <FormularioAgregarIntituciones validateForm={validateForm} initialValues={initialValues} onSubmit={onSubmit} />
                    </Formulario>
                )}
            </Formik>
        </ModalGenerico>
    )
}
export const FormularioAgregarIntituciones = ({ validateForm,initialValues,onSubmit  }) => {
    return (
        <ContenedorFormulario>
            <H2>Agregar Institución</H2>
         
        </ContenedorFormulario>

    )
}
