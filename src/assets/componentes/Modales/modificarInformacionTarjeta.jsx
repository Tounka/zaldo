import styled from "styled-components";
import { ContenedorFormularioGenerico, ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Form, Formik, useFormikContext } from "formik";
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
  FaRegStar,
  FaStar,
  FaMarkdown,
} from "react-icons/fa";
import { adaptadorTimestampATxt } from "../../funciones/utils/adaptadorTxtLabel";
import { FONDOS_TARJETAS } from "../../funciones/fondosTarjetas";

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

const GaleriaFondos = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
  padding: 5px 0;
`;

const EtiquetaFondo = styled.div`
  color: #5a4b70;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const BotonFondo = styled.button`
  aspect-ratio: 1.7;
  border: 2px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "transparent")};
  border-radius: 8px;
  background-image: url(${({ $fondo }) => $fondo});
  background-position: center;
  background-size: cover;
  box-shadow: ${({ $activo }) => ($activo ? "0 0 0 2px rgba(83, 59, 143, .18)" : "none")};
  cursor: pointer;
  transition: transform .16s ease, border-color .16s ease;

  &:hover { transform: translateY(-2px); }
`;

const ConfiguracionPreferida = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid ${({ $activa }) => $activa ? "#d8b85a" : "rgba(83, 59, 143, .18)"};
  border-radius: 10px;
  background: ${({ $activa }) => $activa ? "#fffbec" : "#fbf9ff"};
  color: ${({ $activa }) => $activa ? "#8d6813" : "#4b4058"};
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;

  input { width: 16px; height: 16px; accent-color: #b88717; }
  small { margin-left: auto; color: #918698; font-size: 10px; font-weight: 500; }
`;

const BeneficiosEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label { color: #5a4b70; font-size: 12px; font-weight: 700; }
  textarea {
    width: 100%;
    min-height: 92px;
    box-sizing: border-box;
    resize: vertical;
    border: 1px solid rgba(83, 59, 143, .22);
    border-radius: 10px;
    padding: 9px 10px;
    color: #362c43;
    font: inherit;
    font-size: 12px;
    line-height: 1.5;
    outline: none;
  }
  textarea:focus { border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .1); }
`;

const PreviewMarkdown = styled.div`
  padding: 8px 10px;
  border-radius: 9px;
  background: #faf8fc;
  color: #5c5168;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;

  strong { color: #352543; }
  em { color: #80649b; }
`;

const renderMarkdownBasico = (texto = "") => texto.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((fragmento, indice) => {
  if (fragmento.startsWith("**") && fragmento.endsWith("**")) return <strong key={indice}>{fragmento.slice(2, -2)}</strong>;
  if (fragmento.startsWith("_") && fragmento.endsWith("_")) return <em key={indice}>{fragmento.slice(1, -1)}</em>;
  return fragmento;
});

const PreferenciasTarjeta = () => {
  const { values, setFieldValue } = useFormikContext();
  const beneficios = values.beneficiosMarkdown || "";

  return (
    <>
      <ConfiguracionPreferida $activa={Boolean(values.preferida)}>
        <input type="checkbox" checked={Boolean(values.preferida)} onChange={(event) => setFieldValue("preferida", event.target.checked)} />
        {values.preferida ? <FaStar /> : <FaRegStar />}
        <span>Tarjeta preferida</span>
        <small>Aparecerá primero al pagar una tarjeta</small>
      </ConfiguracionPreferida>
      <BeneficiosEditor>
        <label htmlFor="beneficiosMarkdown"><FaMarkdown style={{ marginRight: 5 }} />Beneficios de la tarjeta · Markdown básico</label>
        <textarea id="beneficiosMarkdown" value={beneficios} onChange={(event) => setFieldValue("beneficiosMarkdown", event.target.value)} placeholder="Ej. **2x1** en cine\n- Sin anualidad\n_Acceso a salas_" />
        {beneficios && <PreviewMarkdown>{renderMarkdownBasico(beneficios)}</PreviewMarkdown>}
      </BeneficiosEditor>
    </>
  );
};

const SelectorFondoTarjeta = () => {
  const { values, setFieldValue } = useFormikContext();
  const seleccionado = Number(values.fondoTarjeta) || 0;

  return (
    <div>
      <EtiquetaFondo>
        <span>Fondo de la tarjeta</span>
        <span style={{ color: "var(--colorMorado)" }}>Seleccionado: {seleccionado + 1}</span>
      </EtiquetaFondo>
      <GaleriaFondos>
        {FONDOS_TARJETAS.map((fondo, indice) => (
          <BotonFondo
            key={fondo}
            type="button"
            $fondo={fondo}
            $activo={seleccionado === indice}
            aria-label={`Elegir fondo ${indice + 1}`}
            title={`Fondo ${indice + 1}`}
            onClick={() => setFieldValue("fondoTarjeta", indice)}
          />
        ))}
      </GaleriaFondos>
    </div>
  );
};

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
        fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
        preferida: Boolean(cuentaSeleccionada?.preferida),
        beneficiosMarkdown: cuentaSeleccionada?.beneficiosMarkdown || "",
        fechaDeCorte: cuentaSeleccionada?.fechaDeCorte || 1,
        limiteDeCredito: cuentaSeleccionada?.limiteDeCredito || 0,
      }
      : cuentaSeleccionada?.tipoDeCuenta === "debito"
        ? {
          tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
          nombre: cuentaSeleccionada?.nombre || "",
          fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
          preferida: Boolean(cuentaSeleccionada?.preferida),
          beneficiosMarkdown: cuentaSeleccionada?.beneficiosMarkdown || "",
          tipoDeDebito: cuentaSeleccionada?.tipoDeDebito || "",
          metaDeAhorro: cuentaSeleccionada?.metaDeAhorro || 0,
        }
        : cuentaSeleccionada?.tipoDeCuenta === "efectivo"
          ? {
            tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
            nombre: cuentaSeleccionada?.nombre || "",
            fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
            preferida: Boolean(cuentaSeleccionada?.preferida),
            beneficiosMarkdown: cuentaSeleccionada?.beneficiosMarkdown || "",
            tipoDeEfectivo: cuentaSeleccionada?.tipoDeEfectivo || "",
            metaDeAhorro: cuentaSeleccionada?.metaDeAhorro || 0,
          }
          : {
            tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
            nombre: cuentaSeleccionada?.nombre || "",
            fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
            preferida: Boolean(cuentaSeleccionada?.preferida),
            beneficiosMarkdown: cuentaSeleccionada?.beneficiosMarkdown || "",
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
        {tipoDeCuenta === "credito" && <PreferenciasTarjeta />}
        <SelectorFondoTarjeta />
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
