import styled from "styled-components";
import { ContenedorFormularioGenerico, ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { altaDeInstitucion } from "../../funciones/firebase/instituciones";


const ContenedorFormulario = styled.div`
    width: 500px;
    max-width: 100%;
    height: 500px;
    max-height: 100%;
    display: grid;
    overflow-y: auto;
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

export const ModalAgregarIntituciones = () => {
    const { isOpenAgregarInstituciones, setIsOpenAgregarInstituciones, usuario, setInstituciones, instituciones} = useContextoGeneral();
    const onClose = () => {
        setIsOpenAgregarInstituciones(false);
    }

    const [isSubmitting, setIsSubmitting] = useState(false);
    const validateForm = (values) => {
        const errors = {};

        const { error, valor } = validarCampoRequerido(values.nombreInstitucion);
        if (error) {
            errors.nombreInstitucion = error;
        }

        return errors;
    };

    const initialValues = {
        nombreInstitucion: "",

    };

    const onSubmit = async (values, { resetForm }) => {
        if(!isSubmitting){
            setIsSubmitting(true);

            try{
                const institucionNueva = await altaDeInstitucion(values, usuario.uid);
                setInstituciones(prev => [...prev, institucionNueva]);
                resetForm();
                onClose();
            }catch(error){
                console.log("Ha sucedido un error al agregar instituciones", error);
            }
            setIsSubmitting(false);
        }
        
    };

    return (
        <ModalGenerico isOpen={isOpenAgregarInstituciones} onClose={onClose}>
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
export const FormularioAgregarIntituciones = ({ validateForm, initialValues, onSubmit }) => {
    return (
        <ContenedorFormularioGenerico>
            <H2 size="30px" align="center" color="var(--colorMorado)">Agregar Institución</H2>
            <ContenedorInputs>
                <FieldForm label="Nombre de la institución" id="nombreInstitucion" name="nombreInstitucion" type="text" placeholder="Ingresa el nombre de la Institución" onChange={(e) => setNombre(e.target.value)} />
            </ContenedorInputs>
            <BtnSubmit type="submit"> Enviar </BtnSubmit>
        </ContenedorFormularioGenerico>

    )
}
