import { useEffect, useState } from "react";
import { BREAKPOINT_MOVIL } from "./responsivoEstilos";

const CONSULTA_MOVIL = `(max-width: ${BREAKPOINT_MOVIL}px)`;

/* true en celular; sirve para montar una vista distinta (lista vs. tabla). */
export const useEsMovil = () => {
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.(CONSULTA_MOVIL).matches)
  );

  useEffect(() => {
    const consulta = window.matchMedia?.(CONSULTA_MOVIL);
    if (!consulta) return undefined;
    const alCambiar = () => setEsMovil(consulta.matches);
    alCambiar();
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return esMovil;
};
