import { Topo } from "../topo/Topo";
import { TopoVivo } from "../topo/TopoVivo";
import { TopoAnimado } from "../topo/TopoAnimado";

/*
 * Avatar del asistente: el topo de Zaldo dentro de un círculo claro, para que
 * su pelaje café no se pierda sobre el morado del botón.
 *
 *   estado "reposo"   → el topo por capas: parpadea y cada pocos segundos
 *                       saluda, se ríe o mueve los brazos
 *   estado "pensando" → pata en la barbilla, mirando arriba
 *   estado "feliz"    → ojos cerrados de gusto (al guardar algo)
 *
 * Conserva la misma API que el robot anterior (`estado`, `tamano`).
 */
export const AvatarAsistente = ({ estado = "reposo", tamano = 40 }) => (
  <span
    aria-hidden="true"
    style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      width: tamano,
      height: tamano,
      borderRadius: "50%",
      background: "#f1eff6",
      overflow: "hidden",
    }}
  >
    {/* Un poco más grande que el círculo y hacia abajo: así se ve cabeza y panza. */}
    {estado === "reposo" ? (
      <TopoVivo
        tamano={Math.round(tamano * 1.15)}
        style={{ marginBottom: -tamano * 0.28 }}
      />
    ) : estado === "pensando" ? (
      <TopoAnimado animacion="cavar-bucle" tamano={Math.round(tamano * 1.15)} estadoRespaldo="pensando" style={{ marginBottom: -tamano * 0.15 }} />
    ) : (
      <Topo estado={estado} tamano={Math.round(tamano * 1.18)} prioridad style={{ marginBottom: -tamano * 0.2 }} />
    )}
  </span>
);
