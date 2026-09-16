import { useState, useEffect, useMemo, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  FaTimes,
  FaBolt,
  FaArrowRight,
  FaCreditCard,
  FaWallet,
  FaMoneyBillWave,
  FaPiggyBank,
  FaUniversity,
  FaUndo,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { movimientoEntreCuentas } from "../../funciones/firebase/movimientos";
import { modificarCuentaDesdeMovimientoEntreCuentas } from "../../funciones/firebase/cuentas";
import { useFormatoMoneda } from "../../funciones/utils/moneda";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";

/* ============================================================
   ESTILOS GENERALES Y OVERLAY
   ============================================================ */

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(142, 68, 173, 0.5); }
  70% { box-shadow: 0 0 0 12px rgba(142, 68, 173, 0); }
  100% { box-shadow: 0 0 0 0 rgba(142, 68, 173, 0); }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(14, 9, 26, 0.88);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const HeaderForjador = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(28, 18, 51, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  z-index: 20;

  @media (max-width: 600px) {
    padding: 10px 14px;
  }
`;

const TituloGrupo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  .icono-rayo {
    font-size: 20px;
    color: #f1c40f;
    filter: drop-shadow(0 0 8px rgba(241, 196, 15, 0.6));
  }

  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.3px;
    color: #fff;
  }

  p {
    margin: 0;
    font-size: 11px;
    color: #bfaedc;
  }
`;

const BtnCerrar = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const BarraEstado = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${({ $activo }) =>
    $activo ? "linear-gradient(90deg, #533b8f, #8e44ad)" : "rgba(255, 255, 255, 0.05)"};
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
`;

const CanvasWrapper = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;

  .react-flow__background {
    background: #110b22;
  }

  .react-flow__controls {
    border-radius: 12px;
    overflow: hidden;
    background: #20133c;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .react-flow__controls-button {
    background: #20133c;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    fill: #bfaedc;

    &:hover {
      background: #311d59;
      fill: #fff;
    }
  }

  .react-flow__attribution {
    display: none;
  }
`;

/* ============================================================
   NODO REACT FLOW PERSONALIZADO (REACTNODE)
   ============================================================ */

const NodoCard = styled.div`
  width: 215px;
  min-height: 82px;
  border-radius: 14px;
  padding: 10px 13px;
  box-sizing: border-box;
  background: ${({ $bg }) => $bg || "#281b47"};
  background-size: cover;
  background-position: center;
  position: relative;
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45);
  border: 2px solid
    ${({ $esOrigen, $esDestino }) =>
      $esOrigen
        ? "#f1c40f"
        : $esDestino
        ? "#2ecc71"
        : "rgba(255, 255, 255, 0.18)"};
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  cursor: pointer;

  ${({ $esOrigen }) =>
    $esOrigen &&
    `
    animation: ${pulseGlow} 2s infinite;
    transform: scale(1.04);
  `}

  ${({ $esDestino }) =>
    $esDestino &&
    `
    transform: scale(1.04);
    box-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
  `}

  &:hover {
    border-color: ${({ $esOrigen, $esDestino }) =>
      $esOrigen ? "#f1c40f" : $esDestino ? "#2ecc71" : "#bb9af7"};
    transform: translateY(-2px) scale(1.02);
  }

  .nodo-overlay {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(
      135deg,
      rgba(20, 12, 38, 0.88) 0%,
      rgba(35, 20, 68, 0.78) 100%
    );
    z-index: 1;
    pointer-events: none;
  }

  .nodo-contenido {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nodo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .nodo-tipo-tag {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 2px 7px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: ${({ $tagBg }) => $tagBg || "rgba(255, 255, 255, 0.15)"};
    color: ${({ $tagColor }) => $tagColor || "#fff"};
  }

  .nodo-rol-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: ${({ $esOrigen }) => ($esOrigen ? "#f1c40f" : "#2ecc71")};
    color: #1a1a2e;
    font-weight: 900;
  }

  .nodo-nombre {
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
    color: #ffffff;
  }

  .nodo-saldo {
    font-size: 13px;
    font-weight: 700;
    color: ${({ $esPasivo }) => ($esPasivo ? "#ff7675" : "#55efc4")};
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }

  .nodo-footer-hint {
    margin-top: 2px;
    font-size: 9px;
    opacity: 0.75;
    color: #d1c4e9;
  }
`;

const CustomHandleSource = styled(Handle)`
  width: 14px;
  height: 14px;
  background: #f1c40f !important;
  border: 3px solid #1c1233 !important;
  box-shadow: 0 0 10px rgba(241, 196, 15, 0.8);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.4);
  }
`;

const CustomHandleTarget = styled(Handle)`
  width: 14px;
  height: 14px;
  background: #2ecc71 !important;
  border: 3px solid #1c1233 !important;
  box-shadow: 0 0 10px rgba(46, 204, 113, 0.8);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.4);
  }
`;

const NodoCuentaReactFlow = ({ data }) => {
  const { cuenta, esOrigen, esDestino, onSeleccionar } = data;
  const saldoTotal = (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0);
  const esPasivo = saldoTotal < 0;

  const configPorTipo = useMemo(() => {
    switch (cuenta?.tipoDeCuenta) {
      case "credito":
        return {
          label: "Crédito",
          icono: <FaCreditCard />,
          tagBg: "rgba(231, 76, 60, 0.3)",
          tagColor: "#ff7675",
        };
      case "debito":
        return {
          label: "Débito",
          icono: <FaUniversity />,
          tagBg: "rgba(142, 68, 173, 0.3)",
          tagColor: "#d6a2e8",
        };
      case "efectivo":
        return {
          label: "Efectivo",
          icono: <FaMoneyBillWave />,
          tagBg: "rgba(46, 204, 113, 0.3)",
          tagColor: "#55efc4",
        };
      case "inversion":
        return {
          label: "Inversión",
          icono: <FaPiggyBank />,
          tagBg: "rgba(52, 152, 219, 0.3)",
          tagColor: "#74b9ff",
        };
      default:
        return {
          label: "Cuenta",
          icono: <FaWallet />,
          tagBg: "rgba(255, 255, 255, 0.15)",
          tagColor: "#fff",
        };
    }
  }, [cuenta?.tipoDeCuenta]);

  const fondo = useMemo(() => obtenerFondoTarjeta(cuenta), [cuenta]);

  return (
    <NodoCard
      $bg={fondo ? `url(${fondo})` : null}
      $esOrigen={esOrigen}
      $esDestino={esDestino}
      $tagBg={configPorTipo.tagBg}
      $tagColor={configPorTipo.tagColor}
      $esPasivo={esPasivo}
      onClick={() => onSeleccionar?.(cuenta)}
      title="Toca para seleccionar origen o destino"
    >
      <CustomHandleTarget type="target" position={Position.Left} />
      <div className="nodo-overlay" />
      <div className="nodo-contenido">
        <div className="nodo-header">
          <span className="nodo-tipo-tag">
            {configPorTipo.icono} {configPorTipo.label}
          </span>
          {esOrigen && <span className="nodo-rol-badge">Sale</span>}
          {esDestino && <span className="nodo-rol-badge">Recibe</span>}
        </div>
        <div className="nodo-nombre">{cuenta?.nombre || "Cuenta"}</div>
        <div className="nodo-saldo">
          {new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(saldoTotal)}
        </div>
        <div className="nodo-footer-hint">
          {esOrigen
            ? "Punto de salida (Origen)"
            : esDestino
            ? "Punto de llegada (Destino)"
            : "Toca o arrastra para enlazar"}
        </div>
      </div>
      <CustomHandleSource type="source" position={Position.Right} />
    </NodoCard>
  );
};

const nodeTypes = { cuentaNodo: NodoCuentaReactFlow };

/* ============================================================
   DRAWER INFERIOR: FORJA DE MOVIMIENTO
   ============================================================ */

const DrawerForja = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #22143f 0%, #170d2c 100%);
  border-top: 1px solid rgba(241, 196, 15, 0.35);
  box-shadow: 0 -12px 35px rgba(0, 0, 0, 0.6);
  padding: 16px 22px 24px;
  z-index: 50;
  color: white;
  border-radius: 20px 20px 0 0;
  max-width: 780px;
  margin: 0 auto;

  @media (max-width: 600px) {
    padding: 14px 16px 20px;
  }
`;

const EncabezadoDrawer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;

  .tipo-operacion {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(241, 196, 15, 0.15);
    color: #f1c40f;
    border: 1px solid rgba(241, 196, 15, 0.35);
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-desenlazar {
    background: transparent;
    border: 0;
    color: #bfaedc;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;

    &:hover {
      color: #fff;
    }
  }
`;

const VisualizadorCuentas = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const CuentaResumen = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  .etiqueta {
    font-size: 10px;
    color: #9d8db8;
    text-transform: uppercase;
    font-weight: 800;
  }

  .nombre {
    font-size: 14px;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .saldos-preview {
    font-size: 11px;
    color: #d1c4e9;
    display: flex;
    align-items: center;
    gap: 5px;

    .despues {
      font-weight: 700;
      color: ${({ $positivo }) => ($positivo ? "#55efc4" : "#ff7675")};
    }
  }
`;

const ConectorIcono = styled.div`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(241, 196, 15, 0.2);
  color: #f1c40f;
  font-size: 14px;
  margin: 0 auto;
`;

const FormularioForja = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FilaInputs = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const GrupoCampo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  label {
    font-size: 10px;
    font-weight: 800;
    color: #bfaedc;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input,
  select {
    height: 42px;
    background: rgba(14, 8, 26, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 10px;
    padding: 0 12px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    outline: none;
    transition: all 0.2s ease;

    &:focus {
      border-color: #f1c40f;
      box-shadow: 0 0 0 3px rgba(241, 196, 15, 0.2);
    }
  }
`;

const ChipsMontos = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const ChipMonto = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 4px 10px;
  color: #e3d5fa;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(241, 196, 15, 0.2);
    border-color: #f1c40f;
    color: #fff;
  }
`;

const BtnForjar = styled(motion.button)`
  height: 46px;
  background: linear-gradient(135deg, #f1c40f 0%, #e67e22 100%);
  border: none;
  border-radius: 12px;
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(241, 196, 15, 0.35);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  svg {
    font-size: 15px;
  }
`;

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export const ModalForjadorMovimiento = () => {
  const { cuentas, setCuentas, usuario } = useAppStore();
  const {
    isOpenForjadorMovimiento,
    cuentaOrigenForjador,
    cerrarForjadorMovimiento,
  } = useModalStore();

  const formatearMoneda = useFormatoMoneda();

  const [cuentaOrigen, setCuentaOrigen] = useState(null);
  const [cuentaDestino, setCuentaDestino] = useState(null);
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar al abrir
  useEffect(() => {
    if (!isOpenForjadorMovimiento) return;
    if (cuentaOrigenForjador) {
      setCuentaOrigen(cuentaOrigenForjador);
    } else if (cuentas.length > 0) {
      setCuentaOrigen(null);
    }
    setCuentaDestino(null);
    setMonto("");
    setNota("");
  }, [isOpenForjadorMovimiento, cuentaOrigenForjador, cuentas]);

  // Manejar selección al tocar nodo
  const handleSeleccionarNodo = useCallback(
    (cuenta) => {
      if (!cuentaOrigen) {
        setCuentaOrigen(cuenta);
        return;
      }

      if (cuentaOrigen.id === cuenta.id) {
        // Tocar la misma cuenta deselecciona o reinicia
        setCuentaOrigen(null);
        setCuentaDestino(null);
        return;
      }

      // Si ya hay origen diferente, se selecciona como destino
      setCuentaDestino(cuenta);
    },
    [cuentaOrigen]
  );

  // Armar Nodos de React Flow en disposición radial/circular o cuadrícula
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!isOpenForjadorMovimiento) return;

    // Distribuir los nodos espacialmente
    const total = cuentas.length;
    const columnas = Math.min(Math.ceil(Math.sqrt(total)), 3);
    const espacioX = 260;
    const espacioY = 130;

    const nuevosNodos = cuentas.map((cuenta, index) => {
      const col = index % columnas;
      const row = Math.floor(index / columnas);
      const x = 50 + col * espacioX;
      const y = 40 + row * espacioY;

      return {
        id: cuenta.id,
        type: "cuentaNodo",
        position: { x, y },
        data: {
          cuenta,
          esOrigen: cuentaOrigen?.id === cuenta.id,
          esDestino: cuentaDestino?.id === cuenta.id,
          onSeleccionar: handleSeleccionarNodo,
        },
      };
    });

    setNodes(nuevosNodos);
  }, [cuentas, cuentaOrigen, cuentaDestino, isOpenForjadorMovimiento, handleSeleccionarNodo, setNodes]);

  // Actualizar Edge cuando ambos están seleccionados
  useEffect(() => {
    if (!cuentaOrigen || !cuentaDestino) {
      setEdges([]);
      return;
    }

    setEdges([
      {
        id: `forja-${cuentaOrigen.id}-${cuentaDestino.id}`,
        source: cuentaOrigen.id,
        target: cuentaDestino.id,
        animated: true,
        style: { stroke: "#f1c40f", strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f1c40f",
          width: 22,
          height: 22,
        },
      },
    ]);
  }, [cuentaOrigen, cuentaDestino, setEdges]);

  // Soporte para conectar arrastrando Handle -> Handle
  const onConnect = useCallback(
    (connection) => {
      const origen = cuentas.find((c) => c.id === connection.source);
      const destino = cuentas.find((c) => c.id === connection.target);
      if (origen && destino && origen.id !== destino.id) {
        setCuentaOrigen(origen);
        setCuentaDestino(destino);
      }
    },
    [cuentas]
  );

  // Tipo de operación calculado
  const tipoOperacion = useMemo(() => {
    if (!cuentaDestino) return "Transferencia";
    if (cuentaDestino.tipoDeCuenta === "credito") return "Pago de Tarjeta";
    if (cuentaDestino.tipoDeCuenta === "inversion") return "Fondeo de Inversión";
    if (cuentaOrigen?.tipoDeCuenta === "debito" && cuentaDestino.tipoDeCuenta === "efectivo")
      return "Retiro de Efectivo";
    return "Transferencia Interna";
  }, [cuentaOrigen, cuentaDestino]);

  // Cálculos de saldo simulado
  const montoNumerico = Number(monto) || 0;
  const saldoOrigenActual =
    (cuentaOrigen?.saldoALaFecha ?? 0) + (cuentaOrigen?.saldoALaFechaMSI ?? 0);
  const saldoOrigenFinal = saldoOrigenActual - montoNumerico;

  const saldoDestinoActual =
    (cuentaDestino?.saldoALaFecha ?? 0) + (cuentaDestino?.saldoALaFechaMSI ?? 0);
  const saldoDestinoFinal =
    cuentaDestino?.tipoDeCuenta === "credito"
      ? saldoDestinoActual + montoNumerico
      : saldoDestinoActual + montoNumerico;

  // Enviar el movimiento
  const handleForjar = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!cuentaOrigen || !cuentaDestino || montoNumerico <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Completa el enlace",
        text: "Ingresa un monto válido mayor a 0 para forjar el movimiento.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const esPagoTarjeta = cuentaDestino.tipoDeCuenta === "credito";
      const categoria = esPagoTarjeta
        ? "pagoTarjeta"
        : cuentaDestino.tipoDeCuenta === "inversion"
        ? "inversion"
        : "transferencia";

      const resultado = await movimientoEntreCuentas(
        cuentaOrigen,
        cuentaDestino,
        {
          monto: montoNumerico,
          tipoDeMovimiento: "gasto",
          categoria,
          nota: nota ? `Forjado: ${nota}` : "Forjado desde Home",
        },
        usuario.uid
      );

      if (!resultado) {
        throw new Error("No se obtuvo resultado de la transacción.");
      }

      // Actualizar saldos en Firestore para ambas cuentas
      const [origenActualizado, destinoActualizado] = await Promise.all([
        modificarCuentaDesdeMovimientoEntreCuentas(
          resultado.cuentaOrigen,
          usuario.uid,
          resultado.cuentaOrigen.id
        ),
        modificarCuentaDesdeMovimientoEntreCuentas(
          resultado.cuentaDestinoModificada,
          usuario.uid,
          resultado.cuentaDestinoModificada.id
        ),
      ]);

      // Reflejar en el store
      setCuentas((prev) =>
        prev.map((c) => {
          if (c.id === resultado.cuentaOrigen.id) return { ...c, ...origenActualizado };
          if (c.id === resultado.cuentaDestinoModificada.id)
            return { ...c, ...destinoActualizado };
          return c;
        })
      );

      Swal.fire({
        icon: "success",
        title: "¡Movimiento forjado!",
        text: `Se transfirieron ${formatearMoneda(montoNumerico)} de ${cuentaOrigen.nombre} a ${cuentaDestino.nombre}.`,
        timer: 2200,
        showConfirmButton: false,
      });

      cerrarForjadorMovimiento();
    } catch (error) {
      console.error("Error al forjar movimiento:", error);
      Swal.fire({
        icon: "error",
        title: "Error al forjar",
        text: "No se pudo registrar la transferencia. Intenta de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpenForjadorMovimiento) return null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <HeaderForjador>
          <TituloGrupo>
            <FaBolt className="icono-rayo" />
            <div>
              <h2>Forjador de Movimientos</h2>
              <p>Enlaza cuentas manteniendo o tocando nodos interactivos</p>
            </div>
          </TituloGrupo>
          <BtnCerrar
            type="button"
            onClick={cerrarForjadorMovimiento}
            aria-label="Cerrar forjador"
          >
            <FaTimes />
          </BtnCerrar>
        </HeaderForjador>

        <BarraEstado $activo={Boolean(cuentaOrigen && cuentaDestino)}>
          {!cuentaOrigen ? (
            <>1️⃣ Selecciona la cuenta de salida (toca un nodo para marcar origen)</>
          ) : !cuentaDestino ? (
            <>2️⃣ Ahora toca o arrastra a la cuenta de llegada (destino)</>
          ) : (
            <>⚡ ¡Cuentas enlazadas! Ingresa el monto a forjar</>
          )}
        </BarraEstado>

        <CanvasWrapper>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25, minZoom: 0.6, maxZoom: 1.2 }}
          >
            <Background color="rgba(255, 255, 255, 0.08)" gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>

          {/* DRAWER FLOTANTE DE FORJA */}
          {cuentaOrigen && cuentaDestino && (
            <DrawerForja
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
            >
              <EncabezadoDrawer>
                <div className="tipo-operacion">
                  <FaBolt /> {tipoOperacion}
                </div>
                <button
                  type="button"
                  className="btn-desenlazar"
                  onClick={() => setCuentaDestino(null)}
                >
                  <FaUndo /> Cambiar destino
                </button>
              </EncabezadoDrawer>

              <VisualizadorCuentas>
                <CuentaResumen $positivo={saldoOrigenFinal >= 0}>
                  <span className="etiqueta">Sale de</span>
                  <span className="nombre">{cuentaOrigen.nombre}</span>
                  <span className="saldos-preview">
                    {formatearMoneda(saldoOrigenActual)} &rarr;{" "}
                    <span className="despues">
                      {formatearMoneda(saldoOrigenFinal)}
                    </span>
                  </span>
                </CuentaResumen>

                <ConectorIcono>
                  <FaArrowRight />
                </ConectorIcono>

                <CuentaResumen $positivo={saldoDestinoFinal >= 0}>
                  <span className="etiqueta">Paga a</span>
                  <span className="nombre">{cuentaDestino.nombre}</span>
                  <span className="saldos-preview">
                    {formatearMoneda(saldoDestinoActual)} &rarr;{" "}
                    <span className="despues">
                      {formatearMoneda(saldoDestinoFinal)}
                    </span>
                  </span>
                </CuentaResumen>
              </VisualizadorCuentas>

              <FormularioForja onSubmit={handleForjar}>
                <FilaInputs>
                  <GrupoCampo>
                    <label>Monto a transferir</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      required
                      autoFocus
                    />
                  </GrupoCampo>

                  <GrupoCampo>
                    <label>Nota (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Pago quincenal"
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                    />
                  </GrupoCampo>
                </FilaInputs>

                <ChipsMontos>
                  {cuentaDestino?.tipoDeCuenta === "credito" &&
                    saldoDestinoActual < 0 && (
                      <ChipMonto
                        type="button"
                        onClick={() =>
                          setMonto(String(Math.abs(saldoDestinoActual)))
                        }
                      >
                        Deuda total (
                        {formatearMoneda(Math.abs(saldoDestinoActual))})
                      </ChipMonto>
                    )}
                  <ChipMonto type="button" onClick={() => setMonto("200")}>
                    +$200
                  </ChipMonto>
                  <ChipMonto type="button" onClick={() => setMonto("500")}>
                    +$500
                  </ChipMonto>
                  <ChipMonto type="button" onClick={() => setMonto("1000")}>
                    +$1,000
                  </ChipMonto>
                  <ChipMonto type="button" onClick={() => setMonto("2000")}>
                    +$2,000
                  </ChipMonto>
                  {saldoOrigenActual > 0 && (
                    <ChipMonto
                      type="button"
                      onClick={() => setMonto(String(saldoOrigenActual))}
                    >
                      Todo el saldo ({formatearMoneda(saldoOrigenActual)})
                    </ChipMonto>
                  )}
                </ChipsMontos>

                <BtnForjar
                  type="submit"
                  disabled={isSubmitting || montoNumerico <= 0}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaBolt />
                  {isSubmitting
                    ? "Forjando movimiento..."
                    : `Forjar Movimiento de ${
                        montoNumerico > 0 ? formatearMoneda(montoNumerico) : "$0.00"
                      }`}
                </BtnForjar>
              </FormularioForja>
            </DrawerForja>
          )}
        </CanvasWrapper>
      </Overlay>
    </AnimatePresence>
  );
};
