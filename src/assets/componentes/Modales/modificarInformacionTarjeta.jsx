import styled from "styled-components";
import { ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { modificarInformacionCuenta } from "../../funciones/firebase/cuentas";
import { useContextoModales } from "../../contextos/modales";

// 🎨 Estilos
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

// 🧠 Componente principal
export const ModalModificarTarjeta = () => {
  const { usuario, cuentaSeleccionada, cuentas, setCuentas } = useContextoGeneral();
  const { isOpenModificarTarjeta, setIsOpenModificarTarjeta } = useContextoModales();
  const onClose = () => setIsOpenModificarTarjeta(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📦 Actualizar estado local con nueva info
  const handleActualizarData = (values) => {
    const arregloModificado = cuentas.map((cuenta) =>
      cuenta.id === cuentaSeleccionada.id
        ? { ...cuentaSeleccionada, ...values }
        : { ...cuenta }
    );
    setCuentas(arregloModificado);
  };

  // 🟩 Initial values dinámico
  const initialValues =
    cuentaSeleccionada?.tipoDeCuenta === "credito"
      ? {
          nombre: cuentaSeleccionada?.nombre || "",
          fechaLimiteDePago: cuentaSeleccionada?.fechaLimiteDePago || "",
        }
      : {
          nombre: cuentaSeleccionada?.nombre || "",
        };

  // 🔎 Validación dinámica
  const validateForm = (values) => {
    const errors = {};
    const { error } = validarCampoRequerido(values.nombre);
    if (error) errors.nombre = error;

    if (cuentaSeleccionada?.tipoDeCuenta === "credito") {
      const { error: errorFecha } = validarCampoRequerido(values.fechaLimiteDePago);
      if (errorFecha) errors.fechaLimiteDePago = errorFecha;
      else if (values.fechaLimiteDePago < 1 || values.fechaLimiteDePago > 31) {
        errors.fechaLimiteDePago = "El día debe estar entre 1 y 31";
      }
    }

    return errors;
  };

  // 📤 Envío del formulario
  const onSubmit = async (values, { resetForm }) => {
    setIsSubmitting(true);
    try {
      const dataActualizada = await modificarInformacionCuenta(
        values,
        usuario?.uid,
        cuentaSeleccionada?.id
      );
      handleActualizarData(dataActualizada);
      resetForm();
      onClose();
    } catch (error) {
      console.log("Ha sucedido un error al modificar la cuenta", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalGenerico isOpen={isOpenModificarTarjeta} onClose={onClose}>
      <Formik
        validate={validateForm}
        initialValues={initialValues}
        onSubmit={onSubmit}
        enableReinitialize={true}
      >
        {({ handleSubmit }) => (
          <Formulario onSubmit={handleSubmit}>
            <FormularioModificarTarjeta tipoDeCuenta={cuentaSeleccionada?.tipoDeCuenta} />
          </Formulario>
        )}
      </Formik>
    </ModalGenerico>
  );
};

// 🧩 Formulario según tipo de cuenta
export const FormularioModificarTarjeta = ({ tipoDeCuenta }) => {
  return (
    <ContenedorFormulario>
      <H2 size="30px" align="center" color="var(--colorMorado)">
        Modificar Tarjeta
      </H2>
      <ContenedorInputs>
        {tipoDeCuenta === "credito" ? <FCredito /> : <FDebito />}
      </ContenedorInputs>
      <BtnSubmit type="submit">Enviar</BtnSubmit>
    </ContenedorFormulario>
  );
};


const FDebito = () => {
  return (
    <FieldForm
      id="nombre"
      name="nombre"
      type="text"
      placeholder="Ingresa nuevo nombre de la cuenta"
    />
  );
};


const FCredito = () => {
  return (
    <>
      <FieldForm
        id="nombre"
        name="nombre"
        type="text"
        placeholder="Ingresa nuevo nombre de la cuenta"
      />
      <FieldForm
        id="fechaLimiteDePago"
        name="fechaLimiteDePago"
        type="number"
        min={1}
        max={31}
        placeholder="Ingresa el día en que tu tarjeta hace corte"
      />
    </>
  );
};
