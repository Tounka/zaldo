import { useEffect, useState } from "react";
import { TopoAnimado } from "./TopoAnimado";

export const TopoVivo = ({ tamano = 88, ...props }) => {
  const [parpadeando, setParpadeando] = useState(false);
  useEffect(() => {
    if (parpadeando) return undefined;
    const espera = setTimeout(() => setParpadeando(true), 3200 + Math.random() * 2400);
    return () => clearTimeout(espera);
  }, [parpadeando]);
  return <TopoAnimado {...props} tamano={tamano}
    animacion={parpadeando ? "parpadeo" : "respirar"}
    alTerminar={() => setParpadeando(false)}
    alError={() => setParpadeando(false)} />;
};
