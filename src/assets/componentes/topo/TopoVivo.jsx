import { useCallback, useEffect, useRef, useState } from "react";
import { TopoAnimado } from "./TopoAnimado";
import { precargarAnimacionesTopo } from "./animacionesTopo";

/*
 * Respira en bucle y parpadea de vez en cuando. El parpadeo espera a que la
 * respiración vuelva a su primer cuadro: si entraba a media inhalación el
 * cuerpo brincaba de inflado a reposo y se veía como un tirón.
 */
export const TopoVivo = ({ tamano = 88, ...props }) => {
  const [parpadeando, setParpadeando] = useState(false);
  const toca = useRef(false);

  useEffect(() => { precargarAnimacionesTopo(["respirar", "parpadeo"]); }, []);

  useEffect(() => {
    if (parpadeando) return undefined;
    const espera = setTimeout(() => { toca.current = true; }, 3200 + Math.random() * 2400);
    return () => clearTimeout(espera);
  }, [parpadeando]);

  const alCiclo = useCallback(() => {
    if (!toca.current) return;
    toca.current = false;
    setParpadeando(true);
  }, []);
  const alTerminar = useCallback(() => setParpadeando(false), []);

  return <TopoAnimado {...props} tamano={tamano}
    animacion={parpadeando ? "parpadeo" : "respirar"}
    alCiclo={parpadeando ? undefined : alCiclo}
    alTerminar={alTerminar}
    alError={alTerminar} />;
};
