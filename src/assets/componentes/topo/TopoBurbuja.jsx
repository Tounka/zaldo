import { useState } from "react";
import { TopoAnimado } from "./TopoAnimado";
import { TopoVivo } from "./TopoVivo";

const CLAVE_INTRO_VISTA = "zaldo_topo_burbuja_intro";
const introPendiente = () => {
  try { return sessionStorage.getItem(CLAVE_INTRO_VISTA) !== "1"; }
  catch { return true; }
};

/** La entrada excavando se reproduce una vez por sesión. Después queda vivo. */
export const TopoBurbuja = ({ tamano = 88, colorBorde = "#6c45e3", intro = true, className, style }) => {
  const [entrando, setEntrando] = useState(() => intro && introPendiente());
  const terminar = () => {
    try { sessionStorage.setItem(CLAVE_INTRO_VISTA, "1"); } catch { /* Sin almacenamiento, la intro vuelve a mostrarse. */ }
    setEntrando(false);
  };
  return (
    <span className={className} role="img" aria-label="Topo de Zaldo saludando"
      style={{ position: "relative", display: "inline-block", width: tamano, height: tamano, flexShrink: 0, ...style }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: "5%", border: `2px solid ${colorBorde}`, borderRadius: "50%", opacity: 0.45 }} />
      {entrando
        ? <TopoAnimado animacion="excavar-salir" tamano="100%" alTerminar={terminar} alError={terminar} />
        : <TopoVivo tamano="100%" />}
    </span>
  );
};
