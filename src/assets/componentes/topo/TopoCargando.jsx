import { TopoAnimado } from "./TopoAnimado";

/* El topo cavando en bucle: lo que se ve mientras una pantalla carga datos. */
export const TopoCargando = ({ tamano = 110, ...props }) => (
  <TopoAnimado {...props} animacion="cavar-bucle" tamano={tamano} estadoRespaldo="excavando" />
);
