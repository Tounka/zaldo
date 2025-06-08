import styled from "styled-components";
import { useState } from "react";
import { Form, Formik } from "formik";
import { H2 } from "../../componentes/genericos/titulos";
import { BtnSubmit, FieldForm } from "../../componentes/genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { crearUsuario } from "../../funciones/firebase/usuario";
import { useNavigate } from "react-router-dom";

const ContenedorPadre = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow:hidden;
`



const Formulario = styled(Form)`
  
    flex-direction: column;

    background-color: white;
    border-radius: 20px;

    width: 500px;
    max-width: 100%;
    height: 500px;
    max-height: 90%;
    display: grid;
    grid-template-rows: auto 1fr 60px;
    padding: 20px;
    align-items: center;
    gap: 20px;

`;

const ContenedorInputs = styled.div`
    width: 100%;
    height: 100%;
    justify-content: start;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const CrearUsuarioUx = ({ userAuth }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const validateForm = (values) => {
        const errors = {};

        const { error: errorNombres } = validarCampoRequerido(values.nombres);
        if (errorNombres) errors.nombres = errorNombres;

        const { error: errorApellidos } = validarCampoRequerido(values.apellidos);
        if (errorApellidos) errors.apellidos = errorApellidos;

        return errors;
    };

    const initialValues = {
        nombres: "",
        apellidos: ""
    };

    const onSubmit = async (values, { resetForm }) => {
        setIsSubmitting(true);
        setError(null);

        try {

            if (!userAuth || !userAuth.uid) {
                throw new Error("No se encontró información del usuario autenticado");
            }
            await crearUsuario(values, userAuth);
            navigate("/home");
            resetForm();

        } catch (err) {
            console.error("Error al crear usuario:", err);
            setError("Ha ocurrido un error al guardar tus datos. Por favor, inténtalo nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ContenedorPadre>


            <Formik
                validate={validateForm}
                initialValues={initialValues}
                onSubmit={onSubmit}
            >
                {({ handleSubmit, isSubmitting: formikIsSubmitting }) => (
                    <Formulario onSubmit={handleSubmit}>
                      
                            <H2 size="30px" align="center" color="var(--colorMorado)">
                                Completa tu Información
                            </H2>

                            <ContenedorInputs>
                                <FieldForm
                                    id="nombres"
                                    name="nombres"
                                    type="text"
                                    placeholder="Ingresa tus nombres"
                                />
                                <FieldForm
                                    id="apellidos"
                                    name="apellidos"
                                    type="text"
                                    placeholder="Ingresa tus apellidos"
                                />
                            </ContenedorInputs>

                            {error && <div style={{ color: "red" }}>{error}</div>}

                            <BtnSubmit
                                type="submit"
                                disabled={isSubmitting || formikIsSubmitting}
                            >
                                {isSubmitting ? "Guardando..." : "Enviar"}
                            </BtnSubmit>
                      
                    </Formulario>
                )}
            </Formik>

        </ContenedorPadre>
    );
};