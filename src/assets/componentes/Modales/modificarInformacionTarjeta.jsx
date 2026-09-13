import styled from "styled-components";
import { avisarError } from "../../funciones/utils/avisos";
import {
  CampoModalCompleto,
  ContenedorFormularioGenerico,
  ModalEncabezado,
  ModalGenerico,
  RejillaCamposModal,
} from "./modalGenerico";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Form, Formik, useFormikContext } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido, validarCampoNumerico } from "../../funciones/validaciones";
import { modificarInformacionCuenta } from "../../funciones/firebase/cuentas";
import { motion, AnimatePresence } from "framer-motion";
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
  FaTimes,
  FaCheck,
  FaChevronDown,
} from "react-icons/fa";
import { adaptadorTimestampATxt } from "../../funciones/utils/adaptadorTxtLabel";
import { FONDOS_TARJETAS } from "../../funciones/fondosTarjetas";
import { obtenerValorSelectorLiquidez } from "../../funciones/utils/cuentas";
import { obtenerEstadoPagoTarjeta } from "../../funciones/utils/tarjetasCredito";

// 🎨 Estilos
const ContenedorFormulario = styled.div`
  width: 100%;
  max-width: none;
  box-sizing: border-box;
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
  gap: 12px;
`;

const CamposCuenta = styled(RejillaCamposModal)`
  align-items: start;
`;

const ContenedorSelectorLiquidez = styled.div`
  margin-top: auto;
  width: 100%;
`;

const ContenedorFondoYPreferencias = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FilaFondoYSwitches = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
  width: 100%;

  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const ColumnaFondo = styled.div`
  flex: 0 0 150px;
  width: 150px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 480px) {
    flex: 0 0 120px;
    width: 120px;
  }
`;

const ColumnaSwitches = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: space-between;
`;

const SwitchesWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  justify-content: space-between;
`;

const EtiquetaSeccion = styled.span`
  color: #5a4b70;
  font-size: 12px;
  font-weight: 700;
  display: block;
`;

const ConfiguracionCard = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  flex: 1;
  min-height: 42px;
  box-sizing: border-box;
  border: 1.5px solid ${({ $activa, $tipo }) =>
    $activa
      ? $tipo === "preferida"
        ? "#d8b85a"
        : "#86efac"
      : "rgba(83, 59, 143, .18)"};
  border-radius: 11px;
  background: ${({ $activa, $tipo }) =>
    $activa
      ? $tipo === "preferida"
        ? "#fffbec"
        : "#f0fdf4"
      : "#fbf9ff"};
  color: ${({ $activa, $tipo }) =>
    $activa
      ? $tipo === "preferida"
        ? "#8d6813"
        : "#166534"
      : "#4b4058"};
  cursor: pointer;
  transition: all 0.18s ease;

  input {
    width: 16px;
    height: 16px;
    accent-color: ${({ $tipo }) => ($tipo === "preferida" ? "#b88717" : "#15803d")};
    flex-shrink: 0;
    cursor: pointer;
  }

  &:hover {
    border-color: ${({ $activa, $tipo }) =>
      $activa
        ? $tipo === "preferida"
          ? "#b88717"
          : "#15803d"
        : "var(--colorMorado)"};
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
  }
`;

const IconoSwitch = styled.span`
  display: grid;
  place-items: center;
  font-size: 15px;
  flex-shrink: 0;
  color: ${({ $tipo, $activa }) => {
    if ($tipo === "preferida") return $activa ? "#b88717" : "#8d79a2";
    if ($tipo === "pago") return $activa ? "#16a34a" : "#8d79a2";
    return "inherit";
  }};
`;

const TextoSwitch = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;

  span {
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    color: #837591;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

/* =======================
   ANIMACIONES & FONDO CARD
======================= */

const gridAnimacion = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.02,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const cardAnimacion = {
  hidden: { opacity: 0, y: 12, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 22,
      stiffness: 350,
      mass: 0.75,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.92,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
  },
};

const cabeceraAnimacion = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

const TarjetaUnicaWrapper = styled(motion.div)`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
`;

const TarjetaUnicaBoton = styled(motion.button)`
  position: relative;
  width: 100%;
  min-height: 94px;
  height: 100%;
  aspect-ratio: 1.58;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 2px solid #000000;
  border-radius: 11px;
  background: #30215f;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  isolation: isolate;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      180deg,
      transparent 34%,
      rgba(23, 15, 55, 0.12) 57%,
      rgba(23, 15, 55, 0.42) 100%
    );
    pointer-events: none;
  }

  &:hover {
    border-color: #000000;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.3);
  }
`;

const IndicadorCambiar = styled.span`
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2.5px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #1e1538;
  font-size: 9px;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;

  svg {
    font-size: 8px;
  }

  ${TarjetaUnicaBoton}:hover & {
    background: var(--colorMorado, #7c3aed);
    color: #ffffff;
  }
`;

const FondoImagenModal = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FondoEtiquetaModal = styled.span`
  position: absolute;
  left: 5px;
  right: 5px;
  bottom: 5px;
  z-index: 2;
  display: block;
  width: fit-content;
  max-width: calc(100% - 10px);
  padding: 3px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.96);
  color: #1e1538;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.15;
  text-align: left;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.1);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CabeceraDesplegable = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0 8px;
`;

const TituloDesplegable = styled.span`
  color: #4b3874;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const BotonCerrarX = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1.5px solid #000000;
  border-radius: 8px;
  background: #ffffff;
  color: #000000;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transition: all 0.15s ease;

  &:hover {
    background: #000000;
    color: #ffffff;
    transform: scale(1.02);
  }

  svg {
    font-size: 11px;
  }
`;

const GaleriaGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding-top: 4px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
`;

const OpcionFondoBoton = styled(motion.button)`
  position: relative;
  min-width: 0;
  aspect-ratio: 1.58;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 2px solid ${({ $activo }) => ($activo ? "var(--colorMorado, #7c3aed)" : "#000000")};
  border-radius: 10px;
  background: #231647;
  transform: ${({ $activo }) => ($activo ? "scale(0.98)" : "scale(1)")};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 2px #7c3aed, 0 6px 18px rgba(0, 0, 0, 0.35)"
      : "0 3px 8px rgba(0, 0, 0, 0.18)"};
  cursor: pointer;
  isolation: isolate;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      180deg,
      transparent 32%,
      rgba(15, 10, 35, 0.15) 55%,
      rgba(15, 10, 35, 0.52) 100%
    );
    pointer-events: none;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    box-shadow: ${({ $activo }) =>
      $activo
        ? "0 0 0 2.5px #7c3aed, 0 8px 22px rgba(0, 0, 0, 0.45)"
        : "0 6px 16px rgba(0, 0, 0, 0.28)"};
  }
`;

const BadgeCheckSeleccionado = styled(motion.span)`
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 3;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--colorMorado, #7c3aed);
  border: 1.5px solid #000000;
  color: #ffffff;
  font-size: 9px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
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

const SelectorFondoTarjetaVisual = ({
  value = 0,
  onChange,
  desplegado = false,
  onDesplegadoChange,
}) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const seleccionado =
    Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) < FONDOS_TARJETAS.length
      ? Number(value)
      : 0;
  const fondoActual = FONDOS_TARJETAS[seleccionado];

  const handleSeleccionar = (indice) => {
    onChange?.(indice);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onDesplegadoChange?.(false);
    }, 160);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!desplegado ? (
        <TarjetaUnicaWrapper
          key="resumen"
          initial={{ opacity: 0, scale: 0.92, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -6 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
        >
          <TarjetaUnicaBoton
            type="button"
            onClick={() => onDesplegadoChange?.(true)}
            whileHover={{ scale: 1.025, y: -2 }}
            whileTap={{ scale: 0.96 }}
            aria-label={`Fondo seleccionado: Fondo ${seleccionado + 1}. Toca para cambiar.`}
            aria-expanded="false"
          >
            <IndicadorCambiar>
              Cambiar <FaChevronDown />
            </IndicadorCambiar>
            <FondoImagenModal src={fondoActual} alt="" />
            <FondoEtiquetaModal>Fondo {seleccionado + 1}</FondoEtiquetaModal>
          </TarjetaUnicaBoton>
        </TarjetaUnicaWrapper>
      ) : (
        <motion.div
          key="cuadricula"
          variants={gridAnimacion}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ width: "100%" }}
        >
          <CabeceraDesplegable
            variants={cabeceraAnimacion}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <TituloDesplegable>Seleccionar fondo de tarjeta</TituloDesplegable>
            <BotonCerrarX
              type="button"
              onClick={() => onDesplegadoChange?.(false)}
              whileTap={{ scale: 0.94 }}
              aria-label="Cerrar catálogo de fondos"
            >
              <FaTimes /> Cerrar
            </BotonCerrarX>
          </CabeceraDesplegable>

          <GaleriaGrid role="listbox" aria-label="Fondos disponibles">
            {FONDOS_TARJETAS.map((fondo, indice) => {
              const activo = seleccionado === indice;
              return (
                <OpcionFondoBoton
                  key={fondo}
                  variants={cardAnimacion}
                  type="button"
                  role="option"
                  aria-selected={activo}
                  $activo={activo}
                  animate={{ scale: activo ? 0.98 : 1 }}
                  whileHover={activo ? { scale: 0.98 } : { scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSeleccionar(indice)}
                >
                  <AnimatePresence>
                    {activo && (
                      <BadgeCheckSeleccionado
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ type: "spring", stiffness: 450, damping: 20 }}
                        aria-hidden="true"
                      >
                        <FaCheck />
                      </BadgeCheckSeleccionado>
                    )}
                  </AnimatePresence>
                  <FondoImagenModal src={fondo} alt="" />
                  <FondoEtiquetaModal>Fondo {indice + 1}</FondoEtiquetaModal>
                </OpcionFondoBoton>
              );
            })}
          </GaleriaGrid>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SeccionFondoYPreferencias = ({ tipoDeCuenta }) => {
  const [desplegadoFondo, setDesplegadoFondo] = useState(false);
  const { values, setFieldValue } = useFormikContext();

  return (
    <ContenedorFondoYPreferencias>
      {desplegadoFondo ? (
        <SelectorFondoTarjetaVisual
          value={values.fondoTarjeta}
          onChange={(nuevoFondo) => setFieldValue("fondoTarjeta", nuevoFondo)}
          desplegado={desplegadoFondo}
          onDesplegadoChange={setDesplegadoFondo}
        />
      ) : (
        <FilaFondoYSwitches>
          <ColumnaFondo>
            <EtiquetaSeccion>Fondo</EtiquetaSeccion>
            <SelectorFondoTarjetaVisual
              value={values.fondoTarjeta}
              onChange={(nuevoFondo) => setFieldValue("fondoTarjeta", nuevoFondo)}
              desplegado={desplegadoFondo}
              onDesplegadoChange={setDesplegadoFondo}
            />
          </ColumnaFondo>

          <ColumnaSwitches>
            <EtiquetaSeccion>Preferencias</EtiquetaSeccion>
            <SwitchesWrapper>
              <ConfiguracionCard $activa={Boolean(values.preferida)} $tipo="preferida">
                <input
                  type="checkbox"
                  checked={Boolean(values.preferida)}
                  onChange={(event) => setFieldValue("preferida", event.target.checked)}
                />
                <IconoSwitch $activa={Boolean(values.preferida)} $tipo="preferida">
                  {values.preferida ? <FaStar /> : <FaRegStar />}
                </IconoSwitch>
                <TextoSwitch>
                  <span>Tarjeta preferida</span>
                  <small>Aparecerá primero al pagar una tarjeta</small>
                </TextoSwitch>
              </ConfiguracionCard>

              {tipoDeCuenta === "credito" && (
                <ConfiguracionCard
                  $activa={Boolean(values.pagoDelPeriodoActual)}
                  $tipo="pago"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(values.pagoDelPeriodoActual)}
                    onChange={(event) =>
                      setFieldValue("pagoDelPeriodoActual", event.target.checked)
                    }
                  />
                  <IconoSwitch $activa={Boolean(values.pagoDelPeriodoActual)} $tipo="pago">
                    <FaCalendarCheck />
                  </IconoSwitch>
                  <TextoSwitch>
                    <span>Pago de este mes realizado</span>
                    <small>Se reinicia automáticamente el próximo mes</small>
                  </TextoSwitch>
                </ConfiguracionCard>
              )}
            </SwitchesWrapper>
          </ColumnaSwitches>
        </FilaFondoYSwitches>
      )}
    </ContenedorFondoYPreferencias>
  );
};

const BeneficiosTarjeta = () => {
  const { values, setFieldValue } = useFormikContext();
  const beneficios = values.beneficiosMarkdown || "";

  return (
    <BeneficiosEditor>
      <label htmlFor="beneficiosMarkdown">
        <FaMarkdown style={{ marginRight: 5 }} />
        Beneficios de la tarjeta · Markdown básico
      </label>
      <textarea
        id="beneficiosMarkdown"
        value={beneficios}
        onChange={(event) => setFieldValue("beneficiosMarkdown", event.target.value)}
        placeholder="Ej. **2x1** en cine\n- Sin anualidad\n_Acceso a salas_"
      />
      {beneficios && <PreviewMarkdown>{renderMarkdownBasico(beneficios)}</PreviewMarkdown>}
    </BeneficiosEditor>
  );
};

const SelectorLiquidez = () => (
  <ContenedorSelectorLiquidez>
    <SelectForm
      id="esLiquida"
      name="esLiquida"
      placeholder="¿Es una cuenta líquida?"
      options={[
        { label: "Sí, es líquida", value: "true" },
        { label: "No, no es líquida", value: "false" },
      ]}
      icon={<FaMoneyBillWave />}
    />
  </ContenedorSelectorLiquidez>
);

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
  const esLiquida = obtenerValorSelectorLiquidez(cuentaSeleccionada);
  const initialValues =
    cuentaSeleccionada?.tipoDeCuenta === "credito"
      ? {
        tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
        nombre: cuentaSeleccionada?.nombre || "",
        fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
        esLiquida,
        preferida: Boolean(cuentaSeleccionada?.preferida),
        beneficiosMarkdown: cuentaSeleccionada?.beneficiosMarkdown || "",
        fechaDeCorte: cuentaSeleccionada?.fechaDeCorte ?? "",
        fechaLimiteDePago: cuentaSeleccionada?.fechaLimiteDePago ?? "",
        limiteDeCredito: cuentaSeleccionada?.limiteDeCredito || 0,
        pagoDelPeriodoActual: obtenerEstadoPagoTarjeta(cuentaSeleccionada).pagada,
      }
      : cuentaSeleccionada?.tipoDeCuenta === "debito"
        ? {
          tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
          nombre: cuentaSeleccionada?.nombre || "",
          fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
          esLiquida,
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
            esLiquida,
            preferida: Boolean(cuentaSeleccionada?.preferida),
            beneficiosMarkdown: cuentaSeleccionada?.beneficiosMarkdown || "",
            tipoDeEfectivo: cuentaSeleccionada?.tipoDeEfectivo || "",
            metaDeAhorro: cuentaSeleccionada?.metaDeAhorro || 0,
          }
          : {
            tipoDeCuenta: cuentaSeleccionada?.tipoDeCuenta,
            nombre: cuentaSeleccionada?.nombre || "",
            fondoTarjeta: cuentaSeleccionada?.fondoTarjeta ?? 0,
            esLiquida,
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
      if (values.fechaDeCorte !== "" && (values.fechaDeCorte === null || values.fechaDeCorte === undefined || !Number.isInteger(Number(values.fechaDeCorte)) || Number(values.fechaDeCorte) < 1 || Number(values.fechaDeCorte) > 31)) {
        errors.fechaDeCorte = "El día debe estar entre 1 y 31";
      }

      if (values.fechaLimiteDePago !== "" && (values.fechaLimiteDePago === null || values.fechaLimiteDePago === undefined || !Number.isInteger(Number(values.fechaLimiteDePago)) || Number(values.fechaLimiteDePago) < 1 || Number(values.fechaLimiteDePago) > 31)) {
        errors.fechaLimiteDePago = "El día debe estar entre 1 y 31";
      }

      const { error: errorLimiteDeCredito } = validarCampoNumerico(values.limiteDeCredito);
      if (errorLimiteDeCredito) errors.limiteDeCredito = errorLimiteDeCredito;
    }

    if (cuentaSeleccionada?.tipoDeCuenta === "debito") {
      const { error: errorLiquidez } = validarCampoRequerido(values.esLiquida);
      if (errorLiquidez) errors.esLiquida = errorLiquidez;

      const { error: errorMetaDeAhorro } = validarCampoNumerico(values.metaDeAhorro);
      if (errorMetaDeAhorro) errors.metaDeAhorro = errorMetaDeAhorro;
    }

    if (cuentaSeleccionada?.tipoDeCuenta === "efectivo") {
      const { error: errorLiquidez } = validarCampoRequerido(values.esLiquida);
      if (errorLiquidez) errors.esLiquida = errorLiquidez;

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
        avisarError("No se pudo guardar la cuenta. Intenta de nuevo.", error);
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
      <ModalEncabezado
        icon={<FaRegCreditCard />}
        title="Modificar Tarjeta"
        description="Actualiza los datos, preferencias y apariencia de la cuenta."
      />
      <ContenedorInputs>
        <CamposCuenta>
          {tipoDeCuenta === "credito" && <FCredito />}
          {tipoDeCuenta === "debito" && <FDebito />}
          {tipoDeCuenta === "efectivo" && <FEfectivo />}
          {tipoDeCuenta === "inversion" && <FInversion />}
          {!['debito', 'efectivo'].includes(tipoDeCuenta) && <SelectorLiquidez />}
        </CamposCuenta>
        <SeccionFondoYPreferencias tipoDeCuenta={tipoDeCuenta} />
        {tipoDeCuenta === "credito" && <BeneficiosTarjeta />}
      </ContenedorInputs>
      <BtnSubmit type="submit">Enviar</BtnSubmit>
    </ContenedorFormularioGenerico>
  );
};

// 💳 Crédito
const FCredito = () => (
  <>
    <CampoModalCompleto>
      <FieldForm
        id="nombre"
        name="nombre"
        type="text"
        placeholder="Nombre de la tarjeta"
        label="Nombre de la tarjeta de crédito"
        icon={<FaRegCreditCard />}
      />
    </CampoModalCompleto>
    <FieldForm
      id="fechaDeCorte"
      name="fechaDeCorte"
      type="number" inputMode="decimal"
      min={1}
      max={31}
      placeholder="Día de corte"
      label="Día de corte (1 al 31)"
      icon={<FaCalendarAlt />}
    />
    <FieldForm
      id="fechaLimiteDePago"
      name="fechaLimiteDePago"
      type="number" inputMode="decimal"
      min={1}
      max={31}
      placeholder="Día límite de pago"
      label="Día límite de pago (1 al 31)"
      icon={<FaCalendarCheck />}
    />
    <FieldForm
      id="limiteDeCredito"
      name="limiteDeCredito"
      type="number" inputMode="decimal"
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
    { label: "Sí, es líquida", value: "true" },
    { label: "No, no es líquida", value: "false" },
  ];
  return (
    <>
      <CampoModalCompleto>
        <FieldForm
          id="nombre"
          name="nombre"
          type="text"
          placeholder="Nombre de la cuenta"
          label="Nombre de la cuenta de débito"
          icon={<FaUniversity />}
        />
      </CampoModalCompleto>
      <SelectForm
        id="esLiquida"
        name="esLiquida"
        placeholder="¿Es una cuenta líquida?"
        options={tiposDeDebitos}
        label="Liquidez de la cuenta"
        icon={<FaPiggyBank />}
      />
      <FieldForm
        id="metaDeAhorro"
        name="metaDeAhorro"
        type="number" inputMode="decimal"
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
    { label: "Sí, es líquida", value: "true" },
    { label: "No, no es líquida", value: "false" },
  ];
  return (
    <>
      <CampoModalCompleto>
        <FieldForm
          id="nombre"
          name="nombre"
          type="text"
          placeholder="Nombre de la cuenta"
          label="Nombre de la cuenta de efectivo"
          icon={<FaMoneyBillWave />}
        />
      </CampoModalCompleto>
      <SelectForm
        id="esLiquida"
        name="esLiquida"
        placeholder="¿Es una cuenta líquida?"
        options={tiposDeEfectivo}
        label="Liquidez de la cuenta"
        icon={<FaPiggyBank />}
      />
      <FieldForm
        id="metaDeAhorro"
        name="metaDeAhorro"
        type="number" inputMode="decimal"
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
    <CampoModalCompleto>
      <FieldForm
        id="nombre"
        name="nombre"
        type="text"
        placeholder="Nombre de la inversión"
        label="Nombre de la inversión"
        icon={<FaChartLine />}
      />
    </CampoModalCompleto>
    <FieldForm
      id="saldoInicialInversion"
      name="saldoInicialInversion"
      type="number" inputMode="decimal"
      min={0}
      placeholder="Monto inicial invertido"
      label="Monto inicial invertido"
      icon={<FaDollarSign />}
    />
    <FieldForm
      id="saldoFinalInversion"
      name="saldoFinalInversion"
      type="number" inputMode="decimal"
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
