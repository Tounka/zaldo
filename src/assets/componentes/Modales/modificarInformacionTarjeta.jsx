import styled from "styled-components";
import { ContenedorFormularioGenerico, ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido, validarCampoNumerico } from "../../funciones/validaciones";
import { modificarInformacionCuenta } from "../../funciones/firebase/cuentas";
import {
  FaRegCreditCard,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaPiggyBank,
  FaUniversity,
  FaChartLine,
  FaDollarSign,
  FaCalendarCheck,
} from "react-icons/fa";
import { adaptadorTimestampATxt } from "../../funciones/utils/adaptadorTxtLabel";

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
  const { usuario, cuentaSeleccionada, cuentas, setCuentas } = useAppStore();
  const { isOpenModificarTarjeta, setIsOpenModificarTarjeta } = useModalStore();
  const onClose = () => setIsOpenModificarTarjeta(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
        nombre: cuentaSeleccionada?.nombre || "",
        fechaDeCorte: cuentaSeleccionada?.fechaDeCorte || 1,
        limiteDeCredito: cuentaSeleccionada?.limiteDeCredito || 0,
      }
      : cuentaSeleccionada?.tipoDeCuenta === "debito"
        ? {
          tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
          nombre: cuentaSeleccionada?.nombre || "",
          tipoDeDebito: cuentaSeleccionada?.tipoDeDebito || "",
          metaDeAhorro: cuentaSeleccionada?.metaDeAhorro || 0,
        }
        : cuentaSeleccionada?.tipoDeCuenta === "efectivo"
          ? {
            tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
            nombre: cuentaSeleccionada?.nombre || "",
            tipoDeEfectivo: cuentaSeleccionada?.tipoDeEfectivo || "",
            metaDeAhorro: cuentaSeleccionada?.metaDeAhorro || 0,
          }
          : {
            tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
            nombre: cuentaSeleccionada?.nombre || "",
            saldoInicialInversion: cuentaSeleccionada?.saldoInicialInversion || 0,
            saldoFinalInversion: cuentaSeleccionada?.saldoFinalInversion || 0,
            fechaInicioInversion: adaptadorTimestampATxt(cuentaSeleccionada?.fechaInicioInversion) || "",
            fechaFinalInversion: adaptadorTimestampATxt(cuentaSeleccionada?.fechaFinalInversion) || "",
          };

  // 🔎 Validación dinámica
  const validateForm = (values) => {
    const errors = {};
    const { error } = validarCampoRequerido(values.nombre);
    if (error) errors.nombre = error;

    if (cuentaSeleccionada?.tipoDeCuenta === "credito") {
      const { error: errorFecha } = validarCampoRequerido(values.fechaDeCorte);
      if (errorFecha) errors.fechaDeCorte = errorFecha;
      else if (values.fechaDeCorte < 1 || values.fechaDeCorte > 31) {
        errors.fechaDeCorte = "El día debe estar entre 1 y 31";
      }

      const { error: errorLimiteDeCredito } = validarCampoNumerico(values.limiteDeCredito);
      if (errorLimiteDeCredito) errors.limiteDeCredito = errorLimiteDeCredito;
    }

    if (cuentaSeleccionada?.tipoDeCuenta === "debito") {
      const { error: errortipoDeDebito } = validarCampoRequerido(values.tipoDeDebito);
      if (errortipoDeDebito) errors.tipoDeDebito = errortipoDeDebito;

      const { error: errorMetaDeAhorro } = validarCampoNumerico(values.metaDeAhorro);
      if (errorMetaDeAhorro) errors.metaDeAhorro = errorMetaDeAhorro;
    }

    if (cuentaSeleccionada?.tipoDeCuenta === "efectivo") {
      const { error: errortipoDeEfectivo } = validarCampoRequerido(values.tipoDeEfectivo);
      if (errortipoDeEfectivo) errors.tipoDeEfectivo = errortipoDeEfectivo;

      const { error: errorMetaDeAhorro } = validarCampoNumerico(values.metaDeAhorro);
      if (errorMetaDeAhorro) errors.metaDeAhorro = errorMetaDeAhorro;
    }

    if (cuentaSeleccionada?.tipoDeCuenta === "inversion") {


      const { error: errorSaldoFinalInversion } = validarCampoNumerico(values.saldoFinalInversion);
      if (errorSaldoFinalInversion) errors.saldoFinalInversion = errorSaldoFinalInversion;

      const { error: errorSaldoInicialInversion } = validarCampoNumerico(values.saldoInicialInversion);
      if (errorSaldoInicialInversion) errors.saldoInicialInversion = errorSaldoInicialInversion;

      const { error: errorFechaInicio } = validarCampoRequerido(values.fechaInicioInversion);
      if (errorFechaInicio) errors.fechaInicioInversion = errorFechaInicio;

      const { error: errorFechaFin } = validarCampoRequerido(values.fechaFinalInversion);
      if (errorFechaFin) errors.fechaFinalInversion = errorFechaFin;
    }

    return errors;
  };

  // 📤 Envío del formulario
  const onSubmit = async (values, { resetForm }) => {
    if (!isSubmitting) {

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
        console.error("Ha sucedido un error al modificar la cuenta:", error);
      } finally {
        setIsSubmitting(false);
      }
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
    <ContenedorFormularioGenerico>
      <H2 size="30px" align="center" color="var(--colorMorado)">
        Modificar Tarjeta
      </H2>
      <ContenedorInputs>
        {tipoDeCuenta === "credito" && <FCredito />}
        {tipoDeCuenta === "debito" && <FDebito />}
        {tipoDeCuenta === "efectivo" && <FEfectivo />}
        {tipoDeCuenta === "inversion" && <FInversion />}
      </ContenedorInputs>
      <BtnSubmit type="submit">Enviar</BtnSubmit>
    </ContenedorFormularioGenerico>
  );
};

// 💳 Crédito
const FCredito = () => (
  <>
    <FieldForm
      id="nombre"
      name="nombre"
      type="text"
      placeholder="Nombre de la tarjeta"
      label="Nombre de la tarjeta de crédito"
      icon={<FaRegCreditCard />}
    />
    <FieldForm
      id="fechaDeCorte"
      name="fechaDeCorte"
      type="number"
      min={1}
      max={31}
      placeholder="Día de corte"
      label="Día de corte (1 al 31)"
      icon={<FaCalendarAlt />}
    />
    <FieldForm
      id="limiteDeCredito"
      name="limiteDeCredito"
      type="number"
      min={0}
      placeholder="Límite de crédito"
      label="Límite de crédito disponible"
      icon={<FaMoneyBillWave />}
    />
  </>
);

// 💰 Débito
const FDebito = () => {
  const tiposDeDebitos = [
    { label: "Cuenta del día a día", value: "liquido" },
    { label: "Cuenta de ahorro", value: "ahorro" },
  ];
  return (
    <>
      <FieldForm
        id="nombre"
        name="nombre"
        type="text"
        placeholder="Nombre de la cuenta"
        label="Nombre de la cuenta de débito"
        icon={<FaUniversity />}
      />
      <SelectForm
        id="tipoDeDebito"
        name="tipoDeDebito"
        placeholder="Tipo de cuenta"
        options={tiposDeDebitos}
        label="Tipo de cuenta de débito"
        icon={<FaPiggyBank />}
      />
      <FieldForm
        id="metaDeAhorro"
        name="metaDeAhorro"
        type="number"
        min={0}
        placeholder="Meta de ahorro"
        label="Meta de ahorro"
        icon={<FaPiggyBank />}
      />
    </>
  );
};

// 💵 Efectivo (igual que débito pero con sus propios campos)
const FEfectivo = () => {
  const tiposDeEfectivo = [
    { label: "Caja chica", value: "liquido" },
    { label: "Fondo de ahorro", value: "ahorro" },
  ];
  return (
    <>
      <FieldForm
        id="nombre"
        name="nombre"
        type="text"
        placeholder="Nombre de la cuenta"
        label="Nombre de la cuenta de efectivo"
        icon={<FaMoneyBillWave />}
      />
      <SelectForm
        id="tipoDeEfectivo"
        name="tipoDeEfectivo"
        placeholder="Tipo de efectivo"
        options={tiposDeEfectivo}
        label="Tipo de efectivo"
        icon={<FaPiggyBank />}
      />
      <FieldForm
        id="metaDeAhorro"
        name="metaDeAhorro"
        type="number"
        min={0}
        placeholder="Meta de ahorro"
        label="Meta de ahorro"
        icon={<FaPiggyBank />}
      />
    </>
  );
};

// 📈 Inversión
const FInversion = () => (
  <>
    <FieldForm
      id="nombre"
      name="nombre"
      type="text"
      placeholder="Nombre de la inversión"
      label="Nombre de la inversión"
      icon={<FaChartLine />}
    />
    <FieldForm
      id="saldoInicialInversion"
      name="saldoInicialInversion"
      type="number"
      min={0}
      placeholder="Monto inicial invertido"
      label="Monto inicial invertido"
      icon={<FaDollarSign />}
    />
    <FieldForm
      id="saldoFinalInversion"
      name="saldoFinalInversion"
      type="number"
      min={0}
      placeholder="Monto final esperado"
      label="Monto final esperado"
      icon={<FaMoneyBillWave />}
    />
    <FieldForm
      id="fechaInicioInversion"
      name="fechaInicioInversion"
      type="date"
      placeholder="Fecha de inicio"
      label="Fecha de inicio de la inversión"
      icon={<FaCalendarAlt />}
    />
    <FieldForm
      id="fechaFinalInversion"
      name="fechaFinalInversion"
      type="date"
      placeholder="Fecha de finalización"
      label="Fecha de finalización de la inversión"
      icon={<FaCalendarCheck />}
    />
  </>
);
