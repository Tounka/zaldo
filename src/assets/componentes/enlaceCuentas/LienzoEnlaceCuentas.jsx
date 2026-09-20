import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import {
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEnlaceCuentasStore } from "../../stores/useEnlaceCuentasStore";

/*
 * Capa transparente que se monta encima del home mientras se está enlazando
 * una cuenta con otra. Dibuja con React Flow una flecha encuadrada que va de
 * la card de origen a la card sobre la que está el puntero.
 *
 * El lienzo no captura eventos: los clics siguen llegando a las cards reales
 * que están debajo, que son las que deciden origen y destino.
 */
const CapaLienzo = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
  pointer-events: none;

  .react-flow,
  .react-flow__pane,
  .react-flow__renderer,
  .react-flow__viewport {
    background: transparent;
  }

  .react-flow__attribution,
  .react-flow__panel {
    display: none;
  }

  .react-flow__node {
    pointer-events: none;
    cursor: default;
  }

  .react-flow__edge-path {
    filter: drop-shadow(0 0 6px rgba(241, 196, 15, 0.65));
  }
`;

/*
 * El nodo es un marco vacío del tamaño exacto de la card: sólo aporta los
 * anclajes de la flecha y un contorno que confirma qué card quedó enlazada.
 */
const MarcoNodo = styled.div`
  box-sizing: border-box;
  width: ${({ $ancho }) => `${$ancho}px`};
  height: ${({ $alto }) => `${$alto}px`};
  border-radius: 6px;
  border: 2px solid #f1c40f;
  background: rgba(241, 196, 15, 0.1);
  box-shadow: 0 0 14px rgba(241, 196, 15, 0.55);

  .marco-etiqueta {
    position: absolute;
    top: -9px;
    left: 10px;
    padding: 1px 7px;
    border-radius: 999px;
    background: #f1c40f;
    color: #1f1533;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
`;

const NodoMarcoCuenta = ({ data }) => (
  <MarcoNodo $rol={data.rol} $ancho={data.ancho} $alto={data.alto}>
    <span className="marco-etiqueta">
      {data.rol === "origen" ? "Sale de" : "Recibe"}
    </span>
    <Handle
      type="target"
      position={Position.Left}
      style={{ opacity: 0, pointerEvents: "none" }}
    />
    <Handle
      type="source"
      position={Position.Right}
      style={{ opacity: 0, pointerEvents: "none" }}
    />
  </MarcoNodo>
);

const nodeTypes = { marcoCuenta: NodoMarcoCuenta };

export const LienzoEnlaceCuentas = () => {
  const cuentaOrigen = useEnlaceCuentasStore((estado) => estado.cuentaOrigen);
  const cuentaHover = useEnlaceCuentasStore((estado) => estado.cuentaHover);
  const rects = useEnlaceCuentasStore((estado) => estado.rects);

  // Redibujar al hacer scroll o cambiar el tamaño: los rects son de viewport.
  const [, forzarRedibujo] = useState(0);

  const activo = Boolean(cuentaOrigen);

  useEffect(() => {
    if (!activo) return undefined;
    const redibujar = () => forzarRedibujo((valor) => valor + 1);
    window.addEventListener("scroll", redibujar, true);
    window.addEventListener("resize", redibujar);
    return () => {
      window.removeEventListener("scroll", redibujar, true);
      window.removeEventListener("resize", redibujar);
    };
  }, [activo]);

  const rectOrigen = cuentaOrigen ? rects[String(cuentaOrigen.id)] : null;
  const destinoDistinto =
    cuentaHover && cuentaOrigen && cuentaHover.id !== cuentaOrigen.id
      ? cuentaHover
      : null;
  const rectDestino = destinoDistinto ? rects[String(destinoDistinto.id)] : null;

  const nodes = useMemo(() => {
    const lista = [];

    if (cuentaOrigen && rectOrigen) {
      lista.push({
        id: `enlace-origen-${cuentaOrigen.id}`,
        type: "marcoCuenta",
        position: { x: rectOrigen.x, y: rectOrigen.y },
        draggable: false,
        selectable: false,
        data: {
          rol: "origen",
          ancho: rectOrigen.width,
          alto: rectOrigen.height,
        },
      });
    }

    if (destinoDistinto && rectDestino) {
      lista.push({
        id: `enlace-destino-${destinoDistinto.id}`,
        type: "marcoCuenta",
        position: { x: rectDestino.x, y: rectDestino.y },
        draggable: false,
        selectable: false,
        data: {
          rol: "destino",
          ancho: rectDestino.width,
          alto: rectDestino.height,
        },
      });
    }

    return lista;
  }, [cuentaOrigen, destinoDistinto, rectDestino, rectOrigen]);

  const edges = useMemo(() => {
    if (!cuentaOrigen || !rectOrigen || !destinoDistinto || !rectDestino) return [];

    return [
      {
        id: `enlace-${cuentaOrigen.id}-${destinoDistinto.id}`,
        source: `enlace-origen-${cuentaOrigen.id}`,
        target: `enlace-destino-${destinoDistinto.id}`,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#f1c40f", strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f1c40f",
          width: 24,
          height: 24,
        },
      },
    ];
  }, [cuentaOrigen, destinoDistinto, rectDestino, rectOrigen]);

  if (!activo || typeof document === "undefined") return null;
  if (nodes.length === 0) return null;

  return createPortal(
    <CapaLienzo aria-hidden="true">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          /* El lienzo comparte coordenadas con el viewport: sin zoom ni paneo. */
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
        />
      </ReactFlowProvider>
    </CapaLienzo>,
    document.body
  );
};

/* Mantener el nombre por compatibilidad con importaciones existentes. */
export default LienzoEnlaceCuentas;
