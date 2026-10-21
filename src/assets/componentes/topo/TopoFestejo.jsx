import { useEffect, useState } from "react";
import styled from "styled-components";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Topo } from "./Topo";
import { TopoAnimado } from "./TopoAnimado";
import { useTopoStore } from "../../stores/useTopoStore";

const Aparicion = ({ aparicion, ocultar }) => {
  const [fase, setFase] = useState("entrada");
  useEffect(() => {
    if (fase !== "reaccion") return undefined;
    const espera = setTimeout(() => setFase("salida"), 1700);
    return () => clearTimeout(espera);
  }, [fase]);
  const terminar = () => fase === "entrada" ? setFase("reaccion") : ocultar(aparicion.id);
  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      {fase === "reaccion"
        ? <Topo estado={aparicion.estado} tamano={104} prioridad />
        : <TopoAnimado animacion={fase === "entrada" ? "excavar-salir" : "excavar-entrar"}
            tamano={104} alTerminar={terminar} alError={terminar} />}
      {aparicion.texto && fase !== "salida" && <Globo>{aparicion.texto}</Globo>}
    </Motion.div>
  );
};

export const TopoFestejo = () => {
  const aparicion = useTopoStore((state) => state.aparicion);
  const ocultar = useTopoStore((state) => state.ocultar);
  return (
    <Hoyo aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {aparicion && <Aparicion key={aparicion.id} aparicion={aparicion} ocultar={ocultar} />}
      </AnimatePresence>
    </Hoyo>
  );
};

const Hoyo = styled.div`
  position: fixed;
  left: 12px;
  bottom: 0;
  z-index: 10400;
  height: 160px;
  width: min(340px, calc(100vw - 96px));
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  pointer-events: none;
`;
const Globo = styled.div`
  margin-bottom: 58px;
  padding: 8px 12px;
  border-radius: 14px 14px 14px 4px;
  background: #fff;
  color: #18161f;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  box-shadow: 0 10px 28px -10px rgba(24, 22, 31, 0.35), 0 1px 3px rgba(24, 22, 31, 0.1);
`;
