import styled from "styled-components";
import { avisarError } from "../../funciones/utils/avisos";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "./modalGenerico";
import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Form, Formik, useFormikContext } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { HiLibrary } from "react-icons/hi";
import { FaCalendarAlt, FaCalendarCheck } from "react-icons/fa";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
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
    const { usuario, instituciones, setCuentas } = useAppStore();
    const { isOpenAgregarCuenta, setIsOpenAgregarCuenta } = useModalStore();
    const [institucionesLabel, setInstitucionesLabel] = useState([])
    useEffect(() => {
        const institucionesTratadas = instituciones.map((institucion) => ({
            label: institucion.nombre,
            value: institucion.id
        }));
        setInstitucionesLabel(institucionesTratadas)

    }, [instituciones])

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

        const { error: liquidezError } = validarCampoRequerido(values.esLiquida);
        if (liquidezError) {
            errors.esLiquida = liquidezError;
        }

        if (values.tipoDeCuenta === "credito") {
            ["fechaDeCorte", "fechaLimiteDePago"].forEach((campo) => {
                if (values[campo] !== "" && (!Number.isInteger(Number(values[campo])) || Number(values[campo]) < 1 || Number(values[campo]) > 31)) {
                    errors[campo] = "El día debe estar entre 1 y 31";
                }
            });
        }

        return errors;
    };


    const initialValues = {
        nombreCuenta: "",
        institucionAsociada: "",
        tipoDeCuenta: "",
        esLiquida: "",
        fechaDeCorte: "",
        fechaLimiteDePago: "",

    };

    const onSubmit = async (values, { resetForm }) => {
        if (!isSubmitting) {
            setIsSubmitting(true);
            try {
                const cuenta = await altaDeCuenta(values, usuario.uid);

                handleActualizar(cuenta);


                resetForm();
                onClose();
            } catch (error) {
                avisarError("No se pudo crear la cuenta. Intenta de nuevo.", error);
            }
            setIsSubmitting(false);
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
                {({ handleSubmit }) => (
                    <Formulario onSubmit={handleSubmit}>
                        <FormularioAgregarCuenta instituciones={institucionesLabel} />
                    </Formulario>
                )}
            </Formik>
        </ModalGenerico>
    )
}
export const FormularioAgregarCuenta = ({ instituciones }) => {
    const { values } = useFormikContext();

    return (
        <ContenedorFormularioGenerico>
            <ModalEncabezado
                icon={<HiLibrary />}
                title="Agregar Cuenta"
                description="Vincula una nueva cuenta para organizar tus movimientos."
            />
            <ContenedorInputs>
                <SelectForm id="institucionAsociada" name="institucionAsociada" placeholder="Selecciona la institución a la que pertenece" options={instituciones} icon={<HiLibrary />} />
                <FieldForm label="Nombre de la cuenta" id="nombreCuenta" name="nombreCuenta" type="text" placeholder="Ingresa el nombre de la cuenta" />
                <SelectForm label="Tipo de cuenta" id="tipoDeCuenta" name="tipoDeCuenta" placeholder="Selecciona el tipo de cuenta" options={tipoDeCuentaInput} icon={<HiLibrary />} />
                <SelectForm id="esLiquida" name="esLiquida" placeholder="¿Es una cuenta líquida?" options={[{ label: "Sí, es líquida", value: "true" }, { label: "No, no es líquida", value: "false" }]} icon={<HiLibrary />} />
                {values.tipoDeCuenta === "credito" && (
                    <>
                        <FieldForm
                            id="fechaDeCorte"
                            name="fechaDeCorte"
                            type="number"
                            min={1}
                            max={31}
                            placeholder="Día de corte (opcional)"
                            label="Día de corte"
                            icon={<FaCalendarAlt />}
                        />
                        <FieldForm
                            id="fechaLimiteDePago"
                            name="fechaLimiteDePago"
                            type="number"
                            min={1}
                            max={31}
                            placeholder="Día límite (opcional)"
                            label="Día límite de pago"
                            icon={<FaCalendarCheck />}
                        />
                    </>
                )}
            </ContenedorInputs>
            <BtnSubmit type="submit"> Enviar </BtnSubmit>
        </ContenedorFormularioGenerico>

    )
}
