import styled from "styled-components";
import { H2 } from "../genericos/titulos";
import { useEffect, useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { useContextoModales } from "../../contextos/modales";
import { ModalGenerico } from "./modalGenerico";
import { CardCuentaBtn } from "../cards/cardCuenta";
import { categoriasEsqueleto } from "../../funciones/esqueletos";
import { HiCurrencyDollar, HiOutlinePencilAlt } from "react-icons/hi";
import { FaTags } from "react-icons/fa";
import { agregarMovimiento } from "../../funciones/firebase/movimientos";

// Estilos
const ContenedorFormulario = styled.div`
  width: 500px;
  max-width: 100%;
  height: auto;
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
  justify-content: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ContenedorCards = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

// Componente principal
export const ModalAgregarMovimiento = () => {
    const { usuario } = useContextoGeneral();
    const { isOpenAgregarMovimiento, setIsOpenAgregarMovimiento } = useContextoModales();
    useEffect(() => {
        setCuentaSeleccionada(null);
    }, [isOpenAgregarMovimiento])
    const onClose = () => setIsOpenAgregarMovimiento(false);
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = (values) => {
        const errors = {};
        const { error: nombreError } = validarCampoRequerido(values.nombreCuenta);
        if (nombreError) errors.nombreCuenta = nombreError;
        return errors;
    };

    const initialValues = {
        cuentaAsociada: cuentaSeleccionada?.id || "",
        nombreCuenta: cuentaSeleccionada?.nombre || "",
        monto: "",
        categoria: "",
        nota: "",
    };

    const onSubmit = async (values, { resetForm }) => {
        setIsSubmitting(true);
        try {
            await agregarMovimiento(values, usuario.uid);
            resetForm();
            onClose();
            setCuentaSeleccionada(null); 
        } catch (error) {
            console.log("Error al agregar movimiento:", error);
        }
        setIsSubmitting(false);
    };

    return (
        <ModalGenerico isOpen={isOpenAgregarMovimiento} onClose={onClose}>
            {!cuentaSeleccionada ? (
                <SeleccionarCuenta setCuentaSeleccionada={setCuentaSeleccionada} />
            ) : (
                <Formik
                    validate={validateForm}
                    initialValues={initialValues}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {({ handleSubmit }) => (
                        <Formulario onSubmit={handleSubmit}>
                            <FormularioAgregarCuenta />
                        </Formulario>
                    )}
                </Formik>
            )}
        </ModalGenerico>
    );
};

const ContenedorPrimeraParte = styled.div`
    width: 100%;
    max-width: 600px;
    height: 400px;
    max-height: auto;
    gap: 20px;
    display: flex;
    flex-direction: column;
    padding: 0 20px 20px 20px;

`
const SeleccionarCuenta = ({ setCuentaSeleccionada }) => {
    const { cuentas } = useContextoGeneral();

    return (
        <ContenedorPrimeraParte>
            <H2 size="30px" align="center" color="var(--colorMorado)">Selecciona una cuenta</H2>
            <ContenedorCards>
                {cuentas.map((cuenta, index) => (
                    <CardCuentaBtn
                        cuenta={cuenta}
                        key={`cuenta-${index}`}
                        handleClick={() => setCuentaSeleccionada(cuenta)}
                    />
                ))}
            </ContenedorCards>
        </ContenedorPrimeraParte>
    );
};

// Formulario de movimiento
export const FormularioAgregarCuenta = () => {

    return (
        <ContenedorFormulario>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Agregar Movimiento
            </H2>
            <ContenedorInputs>
                <FieldForm name="monto" type="number" placeholder="Monto" icon={<HiCurrencyDollar />} />
                <SelectForm options={categoriasEsqueleto} name="categoria" type="text" placeholder="Categoría"  icon={<FaTags  />}/>
                <FieldForm name="nota" type="text" placeholder="Nota (opcional)" icon={<HiOutlinePencilAlt />} />
            </ContenedorInputs>
            <BtnSubmit type="submit">Enviar</BtnSubmit>
        </ContenedorFormulario>
    );
};
