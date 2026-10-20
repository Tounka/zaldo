import { useCallback, useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";

/*
 * El topo armado por capas (public/topo/rig, recortadas de
 * diseno/topo/rig-capas). Todas comparten el mismo lienzo, así que se apilan
 * sin acomodarlas y los brazos giran sobre el hombro.
 *
 * A diferencia de <Topo>, que muestra una ilustración por estado, aquí el
 * topo está vivo: respira, parpadea y cada pocos segundos hace algo
 * (saludar, reír, sorprenderse, mover los brazos, mirar a los lados o dar un
 * saltito). Tocarlo lo hace saludar.
 *
 *   accion      → fuerza una acción y apaga las automáticas (lo usa
 *                 TopoBurbuja durante su entrada).
 *   saludarAlInicio → abre con un saludo.
 *   cada        → [mínimo, máximo] en ms entre acciones automáticas.
 */

const capa = (nombre) => `/topo/rig/${nombre}.webp`;

const CAPAS = [
  "cuerpo", "brazo-izquierdo", "brazo-derecho", "brazo-derecho-saludo", "nariz",
  ...["izquierdo", "derecho"].flatMap((lado) => ["abierto", "feliz", "sorpresa"].map((ojo) => `ojo-${lado}-${ojo}`)),
  "boca-sonrisa", "boca-risa", "boca-sorpresa",
];

let capasPrecargadas = false;
const precargarRigTopo = () => {
  if (capasPrecargadas || typeof window === "undefined") return;
  capasPrecargadas = true;
  CAPAS.forEach((nombre) => {
    const img = new Image();
    img.decoding = "async";
    img.src = capa(nombre);
  });
};

/* Puntos de giro del manifest: hombros y centro de cada ojo. */
const PIVOTE_BRAZO_DER = "26% 51%";
const PIVOTE_BRAZO_IZQ = "74% 51%";
const PIVOTE_OJO_IZQ = "62.6% 31.4%";
const PIVOTE_OJO_DER = "38.6% 31.4%";

/* Cara, duración y movimiento de cada acción. */
const ACCIONES = {
  saludo: { ojos: "feliz", boca: "risa", duracion: 1700 },
  risa: { ojos: "feliz", boca: "risa", duracion: 1300 },
  sorpresa: { ojos: "sorpresa", boca: "sorpresa", duracion: 1100 },
  brazos: { ojos: "feliz", boca: "sonrisa", duracion: 1300 },
  mirar: { ojos: "abierto", boca: "sonrisa", duracion: 1800 },
  salto: { ojos: "feliz", boca: "risa", duracion: 900 },
};
const AUTOMATICAS = ["saludo", "risa", "sorpresa", "brazos", "mirar", "salto", "saludo"];
const REPOSO = { ojos: "abierto", boca: "sonrisa" };

const movimientoCuerpo = (accion) => {
  switch (accion) {
    case "salto":
      return {
        animate: { y: ["0%", "-9%", "0%", "-3%", "0%"], scaleY: [1, 0.94, 1.05, 0.98, 1] },
        transition: { duration: 0.9, ease: "easeOut" },
      };
    case "risa":
      return {
        animate: { y: ["0%", "-3%", "0%", "-3%", "0%"], rotate: [0, -2, 2, -1, 0] },
        transition: { duration: 1.2, ease: "easeInOut" },
      };
    case "sorpresa":
      return {
        animate: { y: ["0%", "-5%", "0%"], scaleY: [1, 1.06, 1] },
        transition: { duration: 0.5, ease: "easeOut" },
      };
    case "brazos":
    case "saludo":
      return {
        animate: { rotate: [0, -2, 2, -1, 0] },
        transition: { duration: 1.5, ease: "easeInOut" },
      };
    default:
      // Respiración en reposo.
      return {
        animate: { scaleY: [1, 1.03, 1], scaleX: [1, 0.99, 1] },
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
      };
  }
};

export const TopoRig = ({
  tamano = 88,
  accion: accionForzada,
  saludarAlInicio = true,
  cada = [3500, 7000],
  interactivo = true,
  className,
  style,
}) => {
  const [accionAuto, setAccionAuto] = useState(saludarAlInicio ? "saludo" : null);
  const [parpadeo, setParpadeo] = useState(false);
  const temporizador = useRef(null);
  const ultimaRef = useRef(null);
  const controlado = accionForzada !== undefined;
  const accion = controlado ? accionForzada : accionAuto;
  const [minimo, maximo] = cada;

  useEffect(() => {
    precargarRigTopo();
  }, []);

  // Termina la acción en curso y, en reposo, programa la siguiente al azar.
  useEffect(() => {
    if (controlado) return undefined;
    clearTimeout(temporizador.current);
    if (accionAuto) {
      temporizador.current = setTimeout(() => setAccionAuto(null), ACCIONES[accionAuto].duracion);
    } else {
      temporizador.current = setTimeout(() => {
        // Sin repetir la anterior, para que no parezca un bucle.
        const opciones = AUTOMATICAS.filter((nombre) => nombre !== ultimaRef.current);
        const siguiente = opciones[Math.floor(Math.random() * opciones.length)];
        ultimaRef.current = siguiente;
        setAccionAuto(siguiente);
      }, minimo + Math.random() * (maximo - minimo));
    }
    return () => clearTimeout(temporizador.current);
  }, [accionAuto, controlado, minimo, maximo]);

  // Parpadeo al azar mientras tiene los ojos abiertos.
  const ojosAbiertos = (ACCIONES[accion] || REPOSO).ojos === "abierto";
  useEffect(() => {
    if (!ojosAbiertos) return undefined;
    let vivo = true;
    let espera;
    const siguiente = () => {
      espera = setTimeout(() => {
        if (!vivo) return;
        setParpadeo(true);
        espera = setTimeout(() => {
          setParpadeo(false);
          siguiente();
        }, 140);
      }, 2200 + Math.random() * 3000);
    };
    siguiente();
    return () => {
      vivo = false;
      clearTimeout(espera);
      setParpadeo(false);
    };
  }, [ojosAbiertos]);

  const saludar = useCallback(() => {
    if (!interactivo || controlado || accionAuto) return;
    setAccionAuto("saludo");
  }, [interactivo, controlado, accionAuto]);

  const cara = ACCIONES[accion] || REPOSO;
  const cuerpo = movimientoCuerpo(accion);
  const ojosCerrados = parpadeo && cara.ojos === "abierto";
  const miradaX = accion === "mirar" ? ["0%", "-2.5%", "-2.5%", "2.5%", "2.5%", "0%"] : "0%";

  return (
    <span
      className={className}
      onClick={saludar}
      style={{
        position: "relative",
        display: "inline-block",
        width: tamano,
        height: tamano,
        flexShrink: 0,
        cursor: interactivo && !controlado ? "pointer" : undefined,
        ...style,
      }}
    >
      <Motion.span
        style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}
        initial={false}
        animate={cuerpo.animate}
        transition={cuerpo.transition}
      >
        <Capa nombre="cuerpo" />
        <Capa
          nombre="brazo-izquierdo"
          origen={PIVOTE_BRAZO_IZQ}
          animate={{ rotate: accion === "brazos" ? [0, -18, 0, -18, 0] : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        {accion === "saludo" ? (
          <Capa
            nombre="brazo-derecho-saludo"
            origen={PIVOTE_BRAZO_DER}
            animate={{ rotate: [0, -12, 10, -12, 10, -8, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        ) : (
          <Capa
            nombre="brazo-derecho"
            origen={PIVOTE_BRAZO_DER}
            animate={{ rotate: accion === "brazos" ? [0, 18, 0, 18, 0] : 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        )}
        <Capa
          nombre={`ojo-izquierdo-${cara.ojos}`}
          origen={PIVOTE_OJO_IZQ}
          animate={{ scaleY: ojosCerrados ? 0.1 : 1, x: miradaX }}
          transition={accion === "mirar" ? { x: { duration: 1.7, ease: "easeInOut" }, scaleY: { duration: 0.07 } } : { duration: 0.07 }}
        />
        <Capa
          nombre={`ojo-derecho-${cara.ojos}`}
          origen={PIVOTE_OJO_DER}
          animate={{ scaleY: ojosCerrados ? 0.1 : 1, x: miradaX }}
          transition={accion === "mirar" ? { x: { duration: 1.7, ease: "easeInOut" }, scaleY: { duration: 0.07 } } : { duration: 0.07 }}
        />
        <Capa nombre={`boca-${cara.boca}`} />
        <Capa nombre="nariz" />
      </Motion.span>
    </span>
  );
};

const Capa = ({ nombre, origen = "50% 50%", animate, transition }) => (
  <Motion.img
    src={capa(nombre)}
    alt=""
    draggable={false}
    decoding="async"
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      transformOrigin: origen,
      userSelect: "none",
      pointerEvents: "none",
    }}
    initial={false}
    animate={animate}
    transition={transition}
  />
);
