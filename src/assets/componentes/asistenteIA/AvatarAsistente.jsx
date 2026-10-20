import { Topo } from "../topo/Topo";
import { TopoRig } from "../topo/TopoRig";

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
      <TopoRig
        tamano={Math.round(tamano * 1.15)}
        saludarAlInicio={false}
        cada={[4000, 8000]}
        interactivo={false}
        style={{ marginBottom: -tamano * 0.28 }}
      />
    ) : (
      <Topo estado={estado} tamano={Math.round(tamano * 1.18)} prioridad style={{ marginBottom: -tamano * 0.2 }} />
    )}
  </span>
);
