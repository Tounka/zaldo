import styled from "styled-components";
import { avisarError } from "../../funciones/utils/avisos";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Field, Form, Formik, useFormikContext } from "formik";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { ModalEncabezado, ModalGenerico } from "./modalGenerico";
import { categoriasEsqueleto, tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import {
  FaArrowDown,
  FaArrowUp,
  FaPen,
  FaDollarSign,
  FaCheck,
  FaStar,
  FaTags,
  FaRegClock,
  FaChevronDown,
  FaWallet,
  FaUser,
} from "react-icons/fa";
import { agregarMovimiento } from "../../funciones/firebase/movimientos";
import {
  convertirADatosFecha,
  fechaLocalISO,
  fechaLocalISOConDesfase,
} from "../../funciones/utils/fechas";
import {
  obtenerUltimaCuentaUsada,
  recordarUltimaCuentaUsada,
  registrarUsoCategoria,
  ordenarCategoriasPorUso,
} from "../../funciones/utils/preferenciasCaptura";
import { modificarMontoDesdeMovimiento } from "../../funciones/firebase/cuentas";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { BadgeCategoria } from "../../funciones/utils/coloresCategorias";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { SelectorCategoriaVisual } from "../categorias/SelectorCategoriaVisual";

/* =======================
   ESTILOS GENERALES
======================= */

const ContenedorModal = styled.div`
  width: 520px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 24px 20px;
  box-sizing: border-box;
`;

/* =======================
   PASO 1: SELECCIONAR CUENTA
======================= */

const ListaAcordeones = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  height: min(480px, calc(100dvh - 230px));
  max-height: min(480px, calc(100dvh - 230px));
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
`;

const Acordeon = styled.div`
  flex: 0 0 auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
`;

const CabeceraAcordeon = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: 0;
  background: ${({ $abierto }) => ($abierto ? "#f8fafc" : "#ffffff")};
  color: #1e293b;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f1f5f9;
  }

  & > span:first-child {
    min-width: 0;
    flex: 1 1 auto;
  }

  @media (max-width: 480px) {
    padding: 11px 12px;
    font-size: 13px;
  }
`;

const ConteoAcordeon = styled.span`
  min-width: 22px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
`;

const TotalAcordeon = styled.span`
  margin-left: auto;
  color: ${({ $negativo }) => ($negativo ? "#ef4444" : "#10b981")};
  font-size: 13px;
  font-weight: 800;
  font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: nowrap;
`;

const FlechaAcordeon = styled.span`
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 11px;
  transform: rotate(${({ $abierto }) => ($abierto ? "180deg" : "0deg")});
  transition: transform 0.2s ease;
`;

const CuerpoAcordeon = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;

  @media (max-width: 480px) {
    gap: 8px;
    padding: 10px;
  }

  @media (max-width: 340px) {
    grid-template-columns: 1fr;
  }
`;

const AcordeonContenido = styled.div`
  display: grid;
  grid-template-rows: ${({ $abierto }) => ($abierto ? "1fr" : "0fr")};
  transition: grid-template-rows 0.24s ease;

  & > * {
    min-height: 0;
    overflow: ${({ $abierto }) => ($abierto ? "visible" : "hidden")};
  }
`;

const AcordeonVacio = styled.p`
  margin: 0;
  padding: 14px;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
`;

const TarjetaCuenta = styled.button`
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 5px;
  padding: 10px 11px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  background-color: #1e1b4b;
  background-image: linear-gradient(
      140deg,
      ${({ $negativo }) => ($negativo ? "rgba(220, 38, 38, 0.65)" : "rgba(67, 56, 202, 0.55)")},
      rgba(15, 10, 30, 0.85)
    ),
    url(${({ $fondo }) => $fondo});
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(15, 10, 30, 0.3);
  }

  @media (max-width: 480px) {
    min-height: 82px;
    padding: 9px 10px;
    border-radius: 11px;
  }
`;

const NombreTarjeta = styled.span`
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`;

const PieTarjetaCuenta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
`;

const SaldoTarjeta = styled.span`
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'SF Mono', 'Fira Code', monospace;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
`;

const TipoTarjetaBadge = styled.span`
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  font-size: 8px;
  font-weight: 800;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

const EstrellaTarjeta = styled.span`
  position: absolute;
  top: 7px;
  right: 7px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(254, 240, 138, 0.95);
  color: #b45309;
  font-size: 9px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

/* =======================
   PASO 2: FORMULARIO
======================= */

const FormularioStyled = styled(Form)`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CuentaElegidaBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  color: #ffffff;
  background-color: #1e1b4b;
  background-image: linear-gradient(
      120deg,
      rgba(49, 46, 129, 0.65),
      rgba(15, 10, 30, 0.88)
    ),
    url(${({ $fondo }) => $fondo});
  background-position: center;
  background-size: cover;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
`;

const IconoCuentaCheck = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #10b981;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  flex-shrink: 0;
`;

const InfoCuentaElegida = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
`;

const NombreCuentaElegida = styled.span`
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SaldoCuentaElegida = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const BtnCambiarCuenta = styled.button`
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.6);
  }
`;

/* Selector de Tipo (Gasto vs Ingreso) */
const SelectorTipoWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const BotonTipo = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $activo, $tipo }) =>
    $activo
      ? $tipo === "gasto"
        ? `
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        `
        : `
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        `
      : `
          background: transparent;
          color: #64748b;
          &:hover {
            background: #e2e8f0;
            color: #1e293b;
          }
        `}
`;

/* Hero Input de Monto */
const MontoHeroContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MontoHeroInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 58px;
  padding: 0 16px;
  border: 2px solid ${({ $error }) => ($error ? "#ef4444" : "#cbd5e1")};
  border-radius: 14px;
  background: #ffffff;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
  }

  span.moneda {
    font-size: 24px;
    font-weight: 800;
    color: #6366f1;
  }

  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    font-family: 'SF Mono', 'Fira Code', monospace;

    &::placeholder {
      color: #cbd5e1;
    }
  }
`;

const ErrorTexto = styled.span`
  color: #ef4444;
  font-size: 11px;
  font-weight: 600;
`;

/* Campo con Icono */
const CampoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

/*
 * Ocupa el lugar del icono del campo cuando ya hay categoría elegida, para que
 * la imagen sea visible sin abrir el desplegable.
 */
const EtiquetaCampo = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

/* ── Selector de fecha: hoy por defecto, con atajos ── */

const FilaFecha = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const ChipFecha = styled.button`
  padding: 6px 11px;
  border: 1px solid ${({ $activo }) => ($activo ? "#6366f1" : "#cbd5e1")};
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "#eef2ff" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#4338ca" : "#64748b")};
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover { border-color: #6366f1; }
`;

const InputFecha = styled.input`
  flex: 1 1 130px;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #f8fafc;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

/* ── Cuadrícula de categorías: reconocer en vez de leer ── */

const InputConIcono = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  svg {
    color: #6366f1;
    font-size: 14px;
    flex-shrink: 0;
  }

  input,
  select {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #0f172a;
    font-family: inherit;

    &::placeholder {
      color: #94a3b8;
    }
  }

  select {
    cursor: pointer;
  }
`;

/* Gasto Personal Switch Card */
const TarjetaGastoPersonal = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ $checked }) => ($checked ? "#c4b5fd" : "#e2e8f0")};
  background: ${({ $checked }) => ($checked ? "#f5f3ff" : "#ffffff")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #a78bfa;
  }
`;

const InfoPersonal = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TituloPersonal = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $checked }) => ($checked ? "#5b21b6" : "#334155")};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SubtituloPersonal = styled.span`
  font-size: 11px;
  color: #64748b;
`;

const SwitchTrack = styled.div`
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: ${({ $checked }) => ($checked ? "#7c3aed" : "#cbd5e1")};
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $checked }) => ($checked ? "20px" : "2px")};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.2s ease;
  }

  input {
    display: none;
  }
`;

/* Selector MSI Pills */
const GrupoPillsMSI = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const PillMSI = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  border: 1px solid ${({ $activo }) => ($activo ? "#6366f1" : "#cbd5e1")};
  border-radius: 9px;
  background: ${({ $activo }) => ($activo ? "#ede9fe" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#4338ca" : "#475569")};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #6366f1;
  }
`;

/* Botón Enviar */
const BtnSubmitModerno = styled.button`
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: all 0.15s ease;
  margin-top: 4px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
    transform: none;
  }
`;

/* =======================
   HELPERS
======================= */

const obtenerSaldoTotal = (cuenta) =>
  (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0);

const formatearMoneda = formatearMonedaSegunPreferencia;

const ordenarComoEnCuentas = (listaDeCuentas) =>
  [...listaDeCuentas].sort((a, b) => {
    const preferidaA = Number(Boolean(a?.preferida));
    const preferidaB = Number(Boolean(b?.preferida));
    return preferidaB - preferidaA || obtenerSaldoTotal(b) - obtenerSaldoTotal(a);
  });

const GRUPOS_CUENTA = [
  {
    id: "activos",
    titulo: "Activos (Saldo a favor)",
    pertenece: (cuenta) => obtenerSaldoTotal(cuenta) > 0,
  },
  {
    id: "pasivos",
    titulo: "Pasivos (Tarjetas / Deudas)",
    pertenece: (cuenta) => obtenerSaldoTotal(cuenta) < 0,
  },
  {
    id: "sinSaldo",
    titulo: "Sin saldo registrado",
    pertenece: (cuenta) => obtenerSaldoTotal(cuenta) === 0,
  },
];

/* =======================
   MODAL PRINCIPAL
======================= */

export const ModalAgregarMovimiento = () => {
  const { usuario, setMovimientos, movimientos, setCuentas, cuentas, preferencias } = useAppStore();
  const {
    isOpenAgregarMovimiento,
    cuentasParaMovimiento,
    cuentaParaMovimiento,
    valoresParaMovimiento,
    cerrarAgregarMovimiento,
  } = useModalStore();

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Al abrir se resuelve la cuenta en este orden: la que venga preseleccionada,
   * si no la última que se usó, y si ninguna aplica se muestra el paso 1.
   * Cuando el modal se abrió acotado a una sección (el "+" del home), la última
   * cuenta solo vale si pertenece a esa sección.
   */
  useEffect(() => {
    if (!isOpenAgregarMovimiento) {
      setCuentaSeleccionada(null);
      return;
    }

    if (cuentaParaMovimiento) {
      setCuentaSeleccionada(cuentaParaMovimiento);
      return;
    }

    if (!preferencias.recordarUltimaCuenta) {
      setCuentaSeleccionada(null);
      return;
    }

    const ultimaCuentaId = obtenerUltimaCuentaUsada();
    const esElegible = (cuenta) => !Array.isArray(cuentasParaMovimiento)
      || cuentasParaMovimiento.includes(cuenta.id);

    const ultimaCuenta = ultimaCuentaId
      ? cuentas.find((cuenta) => cuenta.id === ultimaCuentaId && esElegible(cuenta))
      : null;

    setCuentaSeleccionada(ultimaCuenta || null);
  }, [isOpenAgregarMovimiento, cuentaParaMovimiento, cuentasParaMovimiento, cuentas, preferencias.recordarUltimaCuenta]);

  const onClose = () => cerrarAgregarMovimiento();

  /*
   * La caché local se indexa por el mes del movimiento, no por el mes actual:
   * un gasto fechado en el mes pasado debe caer en el bloque que le toca.
   */
  const handleActualizar = (nuevoMovimiento) => {
    const fecha = nuevoMovimiento?.fechaMovimiento?.toDate
      ? convertirADatosFecha(nuevoMovimiento.fechaMovimiento.toDate())
      : convertirADatosFecha(new Date());
    const key = `${fecha.anio}${fecha.mes}`;

    setMovimientos((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), nuevoMovimiento],
    }));
  };

  const handleActualizarMonto = (dataActualizada) => {
    setCuentas((prev) =>
      prev.map((cuenta) =>
        cuenta.id === cuentaSeleccionada.id
          ? { ...cuenta, ...dataActualizada }
          : cuenta
      )
    );
  };

  const validateForm = (values) => {
    const errors = {};
    if (validarCampoRequerido(values.monto).error) errors.monto = "El monto es obligatorio";
    return errors;
  };

  const initialValues = {
    cuentaAsociada: cuentaSeleccionada?.id || "",
    nombreCuenta: cuentaSeleccionada?.nombre || "",
    monto: "",
    categoria: preferencias.categoriaPorDefecto || "",
    nota: "",
    esPersonal: Boolean(preferencias.gastoPersonalPorDefecto),
    fechaMovimiento: fechaLocalISO(),
    tipoDeMovimiento: "gasto",
    pagoAMeses:
      cuentaSeleccionada?.tipoDeCuenta === "credito"
        ? (preferencias.msiPorDefectoEnCredito ? "msi" : "revolvente")
        : null,
    /*
     * Al repetir un movimiento o confirmar uno recurrente llegan valores
     * precargados; siempre se sobreescriben después de los de arriba para que
     * ganen, pero la fecha se deja en hoy salvo que venga uno explícito.
     */
    ...(valoresParaMovimiento || {}),
  };

  const onSubmit = async (values, { resetForm }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (values.tipoDeMovimiento !== "gasto") {
        values.pagoAMeses = null;
      }

      const movimientoAgregado = await agregarMovimiento(values, usuario.uid);
      const cuentaActualizada = await modificarMontoDesdeMovimiento(
        values,
        usuario.uid,
        cuentaSeleccionada
      );

      if (Object.keys(movimientos).length !== 0) {
        handleActualizar(movimientoAgregado);
      }

      handleActualizarMonto(cuentaActualizada);

      // Atajos para la próxima captura: cuenta usada y frecuencia de categoría.
      recordarUltimaCuentaUsada(cuentaSeleccionada?.id);
      registrarUsoCategoria(values.categoria);

      resetForm();
      onClose();
      setCuentaSeleccionada(null);
    } catch (err) {
      avisarError("No se pudo guardar el movimiento. Intenta de nuevo.", err);
    }

    setIsSubmitting(false);
  };

  return (
    <ModalGenerico isOpen={isOpenAgregarMovimiento} onClose={onClose}>
      <ContenedorModal>
        {!cuentaSeleccionada ? (
          <SeleccionarCuenta
            setCuentaSeleccionada={setCuentaSeleccionada}
            idsPermitidos={cuentasParaMovimiento}
          />
        ) : (
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validate={validateForm}
            onSubmit={onSubmit}
          >
            {() => (
              <FormularioContenido
                cuentaSeleccionada={cuentaSeleccionada}
                onCambiarCuenta={() => setCuentaSeleccionada(null)}
                isSubmitting={isSubmitting}
                ordenarPorUso={preferencias.ordenarCategoriasPorUso}
              />
            )}
          </Formik>
        )}
      </ContenedorModal>
    </ModalGenerico>
  );
};

/* =======================
   SUBCOMPONENTE: PASO 1
======================= */

const TarjetaCuentaBoton = ({ cuenta, onSeleccionar }) => {
  const saldoTotal = obtenerSaldoTotal(cuenta);

  return (
    <TarjetaCuenta
      type="button"
      $fondo={obtenerFondoTarjeta(cuenta)}
      $negativo={saldoTotal < 0}
      onClick={() => onSeleccionar(cuenta)}
      aria-label={`Registrar movimiento en ${cuenta?.nombre || "la cuenta"}`}
    >
      {cuenta?.preferida && (
        <EstrellaTarjeta title="Cuenta preferida">
          <FaStar />
        </EstrellaTarjeta>
      )}
      <NombreTarjeta>{cuenta?.nombre || "Sin nombre"}</NombreTarjeta>
      <PieTarjetaCuenta>
        <SaldoTarjeta>{formatearMoneda(saldoTotal)}</SaldoTarjeta>
        <TipoTarjetaBadge>
          {adaptadorTxtLabel(tipoDeCuentaInput, cuenta?.tipoDeCuenta)}
        </TipoTarjetaBadge>
      </PieTarjetaCuenta>
    </TarjetaCuenta>
  );
};

const SeleccionarCuenta = ({ setCuentaSeleccionada, idsPermitidos }) => {
  const { cuentas } = useAppStore();

  const grupos = useMemo(() => {
    const cuentasVisibles = Array.isArray(idsPermitidos)
      ? cuentas.filter((cuenta) => idsPermitidos.includes(cuenta.id))
      : cuentas;

    return GRUPOS_CUENTA.map((grupo) => {
      const cuentasDelGrupo = ordenarComoEnCuentas(
        cuentasVisibles.filter(grupo.pertenece)
      );

      return {
        ...grupo,
        cuentas: cuentasDelGrupo,
        total: cuentasDelGrupo.reduce(
          (acumulado, cuenta) => acumulado + obtenerSaldoTotal(cuenta),
          0
        ),
      };
    });
  }, [cuentas, idsPermitidos]);

  const [abierto, setAbierto] = useState(
    () => grupos.find((grupo) => grupo.cuentas.length > 0)?.id ?? null
  );
  const inicializacionAcordeon = useRef(false);

  useEffect(() => {
    const primerGrupoConCuentas = grupos.find((grupo) => grupo.cuentas.length > 0);

    // Las cuentas pueden llegar después de montar el modal. En ese caso abre
    // el primer grupo disponible una sola vez, sin reabrirlo cuando el usuario
    // cierre manualmente todos los acordeones.
    if (!inicializacionAcordeon.current) {
      if (primerGrupoConCuentas) {
        setAbierto(primerGrupoConCuentas.id);
        inicializacionAcordeon.current = true;
      }
      return;
    }

    // Si la cuenta abierta dejó de existir por un cambio de filtro, conserva
    // una sección válida abierta para que el paso no quede en blanco.
    if (abierto && !grupos.some((grupo) => grupo.id === abierto)) {
      setAbierto(primerGrupoConCuentas?.id ?? null);
    }
  }, [grupos, abierto]);

  const alternar = (id) => setAbierto((actual) => (actual === id ? null : id));

  return (
    <>
      <ModalEncabezado
        icon={<FaWallet />}
        title="Selecciona una cuenta"
        description="Elige la cuenta donde quieres registrar este movimiento."
        badge="Paso 1 de 2"
      />

      <ListaAcordeones tabIndex={0} aria-label="Cuentas disponibles">
        {grupos.map((grupo) => {
          const estaAbierto = abierto === grupo.id;

          return (
            <Acordeon key={grupo.id}>
              <CabeceraAcordeon
                type="button"
                $abierto={estaAbierto}
                onClick={() => alternar(grupo.id)}
                aria-expanded={estaAbierto}
              >
                <span>{grupo.titulo}</span>
                <ConteoAcordeon>{grupo.cuentas.length}</ConteoAcordeon>
                <TotalAcordeon $negativo={grupo.total < 0}>
                  {formatearMoneda(grupo.total)}
                </TotalAcordeon>
                <FlechaAcordeon $abierto={estaAbierto} aria-hidden="true">
                  <FaChevronDown />
                </FlechaAcordeon>
              </CabeceraAcordeon>

              <AcordeonContenido $abierto={estaAbierto}>
                {grupo.cuentas.length > 0 ? (
                  <CuerpoAcordeon>
                    {grupo.cuentas.map((cuenta, index) => (
                      <TarjetaCuentaBoton
                        key={cuenta.id ?? `cuenta-${index}`}
                        cuenta={cuenta}
                        onSeleccionar={setCuentaSeleccionada}
                      />
                    ))}
                  </CuerpoAcordeon>
                ) : (
                  <AcordeonVacio>No hay cuentas en esta sección.</AcordeonVacio>
                )}
              </AcordeonContenido>
            </Acordeon>
          );
        })}
      </ListaAcordeones>
    </>
  );
};

/* =======================
   SUBCOMPONENTE: PASO 2 FORM
======================= */

const FormularioContenido = ({ cuentaSeleccionada, onCambiarCuenta, isSubmitting, ordenarPorUso }) => {
  const { values, setFieldValue, errors, touched } = useFormikContext();

  /*
   * El orden se calcula una vez al abrir: si se recalculara en cada cambio, la
   * categoría recién elegida podría saltar de lugar bajo el dedo.
   */
  const categoriasOrdenadas = useMemo(
    () => (ordenarPorUso
      ? ordenarCategoriasPorUso(categoriasEsqueleto)
      : categoriasEsqueleto),
    [ordenarPorUso]
  );

  const esGasto = values.tipoDeMovimiento === "gasto";
  const mostrarPagoAMeses =
    cuentaSeleccionada?.tipoDeCuenta === "credito" && esGasto;
  const saldoTotal = obtenerSaldoTotal(cuentaSeleccionada);

  return (
    <FormularioStyled>
      <ModalEncabezado
        icon={<FaDollarSign />}
        title="Nuevo Movimiento"
        description="Captura el monto, categoría y fecha de tu movimiento."
        badge="Paso 2 de 2"
      />

      {/* Banner Cuenta Elegida */}
      <CuentaElegidaBanner $fondo={obtenerFondoTarjeta(cuentaSeleccionada)}>
        <IconoCuentaCheck>
          <FaCheck />
        </IconoCuentaCheck>
        <InfoCuentaElegida>
          <NombreCuentaElegida>
            {cuentaSeleccionada?.nombre || "Sin nombre"}
          </NombreCuentaElegida>
          <SaldoCuentaElegida>
            Saldo: {formatearMoneda(saldoTotal)}
          </SaldoCuentaElegida>
        </InfoCuentaElegida>
        {onCambiarCuenta && (
          <BtnCambiarCuenta type="button" onClick={onCambiarCuenta}>
            Cambiar
          </BtnCambiarCuenta>
        )}
      </CuentaElegidaBanner>

      {/* Segmented Switch: Gasto vs Ingreso */}
      <SelectorTipoWrapper>
        <BotonTipo
          type="button"
          $tipo="gasto"
          $activo={esGasto}
          onClick={() => setFieldValue("tipoDeMovimiento", "gasto")}
        >
          <FaArrowDown /> Gasto
        </BotonTipo>
        <BotonTipo
          type="button"
          $tipo="ingreso"
          $activo={!esGasto}
          onClick={() => setFieldValue("tipoDeMovimiento", "ingreso")}
        >
          <FaArrowUp /> Ingreso
        </BotonTipo>
      </SelectorTipoWrapper>

      {/* Hero Monto Input */}
      <MontoHeroContainer>
        <MontoHeroInputWrapper $error={touched.monto && errors.monto}>
          <span className="moneda">$</span>
          <Field
            name="monto"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            step="0.01"
            min="0"
            autoFocus
          />
        </MontoHeroInputWrapper>
        {touched.monto && errors.monto && (
          <ErrorTexto>{errors.monto}</ErrorTexto>
        )}
      </MontoHeroContainer>

      {/* Fecha del movimiento: hoy por defecto, editable */}
      <CampoWrapper>
        <EtiquetaCampo>¿Cuándo fue?</EtiquetaCampo>
        <FilaFecha>
          <ChipFecha
            type="button"
            $activo={values.fechaMovimiento === fechaLocalISO()}
            onClick={() => setFieldValue("fechaMovimiento", fechaLocalISO())}
          >
            Hoy
          </ChipFecha>
          <ChipFecha
            type="button"
            $activo={values.fechaMovimiento === fechaLocalISOConDesfase(-1)}
            onClick={() =>
              setFieldValue("fechaMovimiento", fechaLocalISOConDesfase(-1))
            }
          >
            Ayer
          </ChipFecha>
          <InputFecha
            type="date"
            max={fechaLocalISO()}
            value={values.fechaMovimiento}
            onChange={(evento) =>
              setFieldValue("fechaMovimiento", evento.target.value)
            }
            aria-label="Fecha del movimiento"
          />
        </FilaFecha>
      </CampoWrapper>

      {/* Categoría: cuadrícula visual, un solo toque */}
      <CampoWrapper>
        <EtiquetaCampo>
          Categoría
          {values.categoria && (
            <BadgeCategoria categoria={values.categoria} size="sm" />
          )}
        </EtiquetaCampo>
        <SelectorCategoriaVisual
          value={values.categoria}
          categorias={categoriasOrdenadas}
          onChange={(categoria) => setFieldValue("categoria", categoria)}
        />
      </CampoWrapper>

      {/* Opciones de MSI para Tarjetas de Crédito */}
      {mostrarPagoAMeses && (
        <CampoWrapper>
          <GrupoPillsMSI>
            <PillMSI
              type="button"
              $activo={values.pagoAMeses === "revolvente"}
              onClick={() => setFieldValue("pagoAMeses", "revolvente")}
            >
              <FaDollarSign /> Contado (No MSI)
            </PillMSI>
            <PillMSI
              type="button"
              $activo={values.pagoAMeses === "msi"}
              onClick={() => setFieldValue("pagoAMeses", "msi")}
            >
              <FaRegClock /> A Meses (MSI)
            </PillMSI>
          </GrupoPillsMSI>
        </CampoWrapper>
      )}

      {/* Nota Opcional */}
      <CampoWrapper>
        <InputConIcono>
          <FaPen />
          <Field
            name="nota"
            type="text"
            placeholder="Nota o descripción (opcional)"
          />
        </InputConIcono>
      </CampoWrapper>

      {/* Toggle Gasto Personal */}
      {esGasto && (
        <TarjetaGastoPersonal $checked={values.esPersonal}>
          <InfoPersonal>
            <TituloPersonal $checked={values.esPersonal}>
              <FaUser /> Gasto Personal
            </TituloPersonal>
            <SubtituloPersonal>
              Se contabilizará en tus métricas de consumo real
            </SubtituloPersonal>
          </InfoPersonal>
          <SwitchTrack $checked={values.esPersonal}>
            <Field type="checkbox" name="esPersonal" />
          </SwitchTrack>
        </TarjetaGastoPersonal>
      )}

      {/* Botón de Enviar */}
      <BtnSubmitModerno type="submit" disabled={isSubmitting}>
        <FaCheck /> {isSubmitting ? "Registrando..." : "Registrar Movimiento"}
      </BtnSubmitModerno>
    </FormularioStyled>
  );
};
