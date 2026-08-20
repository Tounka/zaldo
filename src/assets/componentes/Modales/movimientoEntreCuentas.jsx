import styled from "styled-components";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FaArrowRight, FaCreditCard, FaExchangeAlt, FaWallet } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { ModalGenerico } from "./modalGenerico";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { movimientoEntreCuentas } from "../../funciones/firebase/movimientos";
import { modificarCuentaDesdeMovimientoEntreCuentas } from "../../funciones/firebase/cuentas";
import Swal from "sweetalert2";

const ModalContenido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(960px, 96vw);
  padding: 0 22px 22px;
`;

const Encabezado = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    color: #30244a;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(24px, 4vw, 32px);
    letter-spacing: -.04em;
    line-height: 1;
  }

  p {
    max-width: 560px;
    margin: 7px 0 0;
    color: #776f80;
    font-size: 12px;
  }
`;

const SwitchCard = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 236px;
  padding: 10px 12px;
  border: 1px solid ${({ $active }) => $active ? "#cbb7ed" : "#e1dbe8"};
  border-radius: 12px;
  background: ${({ $active }) => $active ? "#f4effd" : "#faf9fc"};
  color: #493960;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  strong { display: block; font-size: 11px; }
  small { display: block; margin-top: 2px; color: #8b8197; font-size: 10px; }
`;

const Switch = styled.span`
  position: relative;
  width: 36px;
  height: 21px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: ${({ $active }) => $active ? "var(--colorMorado)" : "#c9c3d1"};
  transition: background .18s ease;

  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: ${({ $active }) => $active ? "18px" : "3px"};
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px rgba(44, 29, 67, .25);
    transition: left .18s ease;
  }
`;

const FlujoShell = styled.div`
  height: 340px;
  overflow: hidden;
  border: 1px solid #e6e0ed;
  border-radius: 15px;
  background: #fbfaff;

  .react-flow__controls {
    overflow: hidden;
    border: 1px solid #e2d9ef;
    border-radius: 9px;
    box-shadow: 0 4px 12px rgba(71, 45, 103, .08);
  }

  .react-flow__controls-button {
    border-bottom-color: #e2d9ef;
    background: #fff;
    fill: #684ba1;
  }

  .react-flow__attribution { display: none; }

  .cuenta-node {
    position: relative;
    width: 210px;
    min-height: 67px;
    padding: 10px 13px;
    border: 1px solid #d7c9eb;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 8px 18px rgba(78, 53, 111, .1);
  }

  .react-flow__node.cuenta-node--origen .cuenta-node {
    border-color: #a98dd5;
    background: linear-gradient(135deg, #66469f, #8666bc);
    color: #fff;
  }

  .react-flow__node.cuenta-node--selected .cuenta-node {
    border-color: #bb8e2c;
    box-shadow: 0 0 0 3px rgba(204, 164, 59, .2), 0 8px 18px rgba(78, 53, 111, .14);
  }

  .cuenta-node__eyebrow {
    color: #8f82a2;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .09em;
    text-transform: uppercase;
  }

  .react-flow__node.cuenta-node--origen .cuenta-node__eyebrow { color: #e7dcf8; }

  .cuenta-node__name {
    overflow: hidden;
    margin-top: 3px;
    color: #34274b;
    font-size: 13px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .react-flow__node.cuenta-node--origen .cuenta-node__name { color: #fff; }

  .cuenta-node__meta {
    margin-top: 3px;
    color: #897c9a;
    font-size: 10px;
  }

  .react-flow__node.cuenta-node--origen .cuenta-node__meta { color: #e6d9f8; }
`;

const NodoCuenta = ({ data }) => (
  <div className="cuenta-node">
    {data.side === "destino" && <Handle type="target" position={Position.Left} />}
    <div className="cuenta-node__eyebrow">{data.side === "origen" ? "Sale de" : "Paga a"}</div>
    <div className="cuenta-node__name">{data.nombre}</div>
    <div className="cuenta-node__meta">{data.tipoLabel} · {data.saldo}</div>
    {data.side === "origen" && <Handle type="source" position={Position.Right} />}
  </div>
);

const nodeTypes = { cuenta: NodoCuenta };

const Formulario = styled.form`
  display: grid;
  grid-template-columns: minmax(150px, .7fr) minmax(180px, 1fr) minmax(180px, 1fr);
  gap: 10px;
  align-items: end;

  @media (max-width: 760px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 520px) { grid-template-columns: 1fr; }
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #756b80;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;

  input, select {
    width: 100%;
    height: 40px;
    border: 1px solid #ddd6e6;
    border-radius: 9px;
    padding: 0 11px;
    outline: none;
    background: #fff;
    color: #40374d;
    font: inherit;
    font-size: 12px;
    text-transform: none;
    letter-spacing: normal;

    &:focus { border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .1); }
  }
`;

const BotonPrincipal = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 15px;
  border: none;
  border-radius: 9px;
  background: var(--colorMorado);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;

  &:disabled { cursor: wait; opacity: .6; }
  &:hover:not(:disabled) { background: #6948a7; }
`;

const AyudaFlujo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 9px;
  background: #f5f1fb;
  color: #675681;
  font-size: 11px;

  svg { flex: 0 0 auto; color: var(--colorMorado); }
`;

const tipoCuentaLabel = (tipo) => ({
  credito: "Crédito",
  debito: "Débito",
  efectivo: "Efectivo",
  inversion: "Inversión",
}[tipo] || "Cuenta");

const formatoSaldo = (cuenta) => new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
}).format(Number(cuenta?.saldoALaFecha || 0) + Number(cuenta?.saldoALaFechaMSI || 0));

export const ModalAgregarMovimientoEntreCuentas = () => {
  const { cuentas, setCuentas, usuario } = useAppStore();
  const { isOpenMovimientoEntreCuentas, setIsOpenMovimientoEntreCuentas } = useModalStore();
  const [modoPagoTarjeta, setModoPagoTarjeta] = useState(true);
  const [cuentaOrigen, setCuentaOrigen] = useState(null);
  const [cuentaDestino, setCuentaDestino] = useState(null);
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nota, setNota] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpenMovimientoEntreCuentas) return;
    setModoPagoTarjeta(true);
    setCuentaOrigen(null);
    setCuentaDestino(null);
    setMonto("");
    setCategoria("");
    setNota("");
  }, [isOpenMovimientoEntreCuentas]);

  const cuentasOrigen = useMemo(() => cuentas.filter((cuenta) => (
    !modoPagoTarjeta || cuenta.tipoDeCuenta !== "credito"
  )), [cuentas, modoPagoTarjeta]);
  const cuentasDestino = useMemo(() => cuentas.filter((cuenta) => (
    cuenta.id !== cuentaOrigen?.id && (!modoPagoTarjeta || cuenta.tipoDeCuenta === "credito")
  )), [cuentaOrigen?.id, cuentas, modoPagoTarjeta]);

  useEffect(() => {
    if (cuentaOrigen && !cuentasOrigen.some((cuenta) => cuenta.id === cuentaOrigen.id)) setCuentaOrigen(null);
    if (cuentaDestino && !cuentasDestino.some((cuenta) => cuenta.id === cuentaDestino.id)) setCuentaDestino(null);
  }, [cuentaDestino, cuentaOrigen, cuentasDestino, cuentasOrigen]);

  const nodos = useMemo(() => [
    ...cuentasOrigen.map((cuenta, index) => ({
      id: `origen-${cuenta.id}`,
      type: "cuenta",
      position: { x: 45, y: 34 + index * 95 },
      data: {
        side: "origen",
        nombre: cuenta.nombre,
        tipoLabel: tipoCuentaLabel(cuenta.tipoDeCuenta),
        saldo: formatoSaldo(cuenta),
      },
      className: `${cuentaOrigen?.id === cuenta.id ? "cuenta-node--selected " : ""}cuenta-node--origen`,
    })),
    ...cuentasDestino.map((cuenta, index) => ({
      id: `destino-${cuenta.id}`,
      type: "cuenta",
      position: { x: 555, y: 34 + index * 95 },
      data: {
        side: "destino",
        nombre: cuenta.nombre,
        tipoLabel: tipoCuentaLabel(cuenta.tipoDeCuenta),
        saldo: formatoSaldo(cuenta),
      },
      className: cuentaDestino?.id === cuenta.id ? "cuenta-node--selected" : "",
    })),
  ], [cuentaDestino?.id, cuentaOrigen?.id, cuentasDestino, cuentasOrigen]);

  const edges = useMemo(() => {
    if (!cuentaOrigen || !cuentaDestino) return [];
    return [{
      id: `flujo-${cuentaOrigen.id}-${cuentaDestino.id}`,
      source: `origen-${cuentaOrigen.id}`,
      target: `destino-${cuentaDestino.id}`,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7655a8" },
      style: { stroke: "#7655a8", strokeWidth: 2 },
    }];
  }, [cuentaDestino, cuentaOrigen]);

  const cambiarModo = (event) => {
    const activo = event.target.checked;
    setModoPagoTarjeta(activo);
    setCuentaDestino(null);
    setCategoria(activo ? "pagoTarjeta" : "");
  };

  const seleccionarNodo = (_event, nodo) => {
    if (nodo.data.side === "origen") setCuentaOrigen(cuentas.find((cuenta) => cuenta.id === nodo.id.replace("origen-", "")) || null);
    if (nodo.data.side === "destino") setCuentaDestino(cuentas.find((cuenta) => cuenta.id === nodo.id.replace("destino-", "")) || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!cuentaOrigen || !cuentaDestino || Number(monto) <= 0) {
      Swal.fire({ icon: "info", title: "Completa el flujo", text: "Selecciona origen, destino y un monto mayor a cero." });
      return;
    }

    setIsSubmitting(true);
    try {
      const resultado = await movimientoEntreCuentas(
        cuentaOrigen,
        cuentaDestino,
        {
          monto: Number(monto),
          tipoDeMovimiento: "gasto",
          categoria: modoPagoTarjeta ? "pagoTarjeta" : categoria || "transferencia",
          nota,
        },
        usuario.uid,
      );

      if (!resultado) return;

      const [origenActualizado, destinoActualizado] = await Promise.all([
        modificarCuentaDesdeMovimientoEntreCuentas(resultado.cuentaOrigen, usuario.uid, resultado.cuentaOrigen.id),
        modificarCuentaDesdeMovimientoEntreCuentas(resultado.cuentaDestinoModificada, usuario.uid, resultado.cuentaDestinoModificada.id),
      ]);

      setCuentas((prev) => prev.map((cuenta) => {
        if (cuenta.id === resultado.cuentaOrigen.id) return { ...cuenta, ...origenActualizado };
        if (cuenta.id === resultado.cuentaDestinoModificada.id) return { ...cuenta, ...destinoActualizado };
        return cuenta;
      }));
      setIsOpenMovimientoEntreCuentas(false);
    } catch (error) {
      console.error("Error al procesar el movimiento entre cuentas", error);
      Swal.fire({ icon: "error", title: "No se pudo registrar", text: "Ha sucedido un error al procesar el movimiento." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalGenerico isOpen={isOpenMovimientoEntreCuentas} onClose={() => setIsOpenMovimientoEntreCuentas(false)} wide>
      <ModalContenido>
        <Encabezado>
          <div>
            <h2>Movimiento entre cuentas</h2>
            <p>Selecciona una cuenta de salida y una cuenta de llegada. El flujo se actualizará visualmente antes de guardar.</p>
          </div>
          <SwitchCard $active={modoPagoTarjeta}>
            <input type="checkbox" role="switch" checked={modoPagoTarjeta} onChange={cambiarModo} />
            <Switch $active={modoPagoTarjeta} aria-hidden="true" />
            <span><strong><FaCreditCard /> Pago de tarjeta</strong><small>{modoPagoTarjeta ? "Activo · destino limitado a crédito" : "Transferencia libre entre cuentas"}</small></span>
          </SwitchCard>
        </Encabezado>

        <FlujoShell>
          <ReactFlow
            nodes={nodos}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={seleccionarNodo}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: .3, minZoom: .6, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e3dced" gap={22} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </FlujoShell>

        <AyudaFlujo>
          {cuentaOrigen && cuentaDestino ? <><FaArrowRight /> {cuentaOrigen.nombre} enviará {monto ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(monto)) : "el monto indicado"} a {cuentaDestino.nombre}.</> : <><FaWallet /> Haz clic en un nodo morado para definir el origen y en un nodo claro para definir el destino.</>}
        </AyudaFlujo>

        <Formulario onSubmit={handleSubmit}>
          <Campo>Monto<input type="number" min="0.01" step=".01" value={monto} onChange={(event) => setMonto(event.target.value)} placeholder="0.00" required /></Campo>
          {!modoPagoTarjeta ? <Campo>Categoría<select value={categoria} onChange={(event) => setCategoria(event.target.value)}><option value="">Transferencia</option>{categoriasEsqueleto.filter((item) => !["pagoTarjeta", "transferencia"].includes(item.value)).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Campo> : <Campo>Concepto<input value="Pago de tarjeta" disabled /></Campo>}
          <Campo>Nota<input value={nota} onChange={(event) => setNota(event.target.value)} placeholder="Opcional" /></Campo>
          <BotonPrincipal type="submit" disabled={isSubmitting || !cuentaOrigen || !cuentaDestino}><FaExchangeAlt /> {isSubmitting ? "Guardando..." : modoPagoTarjeta ? "Registrar pago" : "Registrar transferencia"}</BotonPrincipal>
        </Formulario>
      </ModalContenido>
    </ModalGenerico>
  );
};
