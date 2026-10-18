import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { sonar } from "../../funciones/sonidos";

/*
 * El topo en su burbuja, con entrada al estilo del cierre de los Looney Tunes:
 *
 *   escarbando → un montículo de tierra tiembla y salpica terrones
 *   abriendo   → la burbuja se abre como un iris desde el agujero, con dos
 *                anillos de eco que se desvanecen
 *   saliendo   → el topo brota de la tierra, sorprendido
 *   saludando  → agita el brazo desde el hombro, feliz
 *   reposo     → respira y parpadea; tocarlo lo hace saludar otra vez
 *
 * Está armado con las capas del rig (public/topo/rig, recortadas de
 * diseno/topo/rig-capas): todas comparten el mismo lienzo, así que se apilan
 * sin acomodarlas y el brazo gira sobre el punto de giro del manifest.
 *
 * La escarbada completa solo se ve la primera vez por sesión; después entra
 * directo a saludar para no hacer esperar cada vez que se abre el chat.
 */

const AZUL = "#2f80ed";
const CLAVE_INTRO_VISTA = "zaldo_topo_burbuja_intro";

const capa = (nombre) => `/topo/rig/${nombre}.webp`;

/* Todas las capas que puede mostrar; se precargan para que el cambio de cara no parpadee. */
const CAPAS = [
  "cuerpo", "brazo-izquierdo", "brazo-derecho", "brazo-derecho-saludo", "nariz",
  ...["izquierdo", "derecho"].flatMap((lado) => ["abierto", "feliz", "sorpresa"].map((ojo) => `ojo-${lado}-${ojo}`)),
  "boca-sonrisa", "boca-risa", "boca-sorpresa",
];

const precargarCapas = () => {
  CAPAS.forEach((nombre) => {
    const img = new Image();
    img.decoding = "async";
    img.src = capa(nombre);
  });
};

/* Puntos de giro del manifest, en % del recorte (x - 120) / 784, (y - 20) / 784. */
const PIVOTE_BRAZO = "26% 51%";
const PIVOTE_OJO_IZQ = "62.6% 31.4%";
const PIVOTE_OJO_DER = "38.6% 31.4%";

/* Cuándo empieza cada fase, en milisegundos desde el inicio. */
const TIEMPOS_INTRO = { abriendo: 950, saliendo: 1400, saludando: 1900, reposo: 3700 };
const TIEMPOS_SALUDO = { reposo: 1800 };

const EXPRESION = {
  saliendo: { ojos: "sorpresa", boca: "sorpresa" },
  saludando: { ojos: "feliz", boca: "risa" },
  reposo: { ojos: "abierto", boca: "sonrisa" },
};

const leerIntroVista = () => {
  try {
    return sessionStorage.getItem(CLAVE_INTRO_VISTA) === "1";
  } catch {
    return false;
  }
};

const marcarIntroVista = () => {
  try {
    sessionStorage.setItem(CLAVE_INTRO_VISTA, "1");
  } catch {
    // Sin almacenamiento solo se repite la escarbada; no pasa nada.
  }
};

/* Terrones que salen disparados del montículo: [dx, alto del arco, tamaño]. */
const TERRONES = [
  [-34, 30, 7], [-20, 42, 5], [-8, 36, 6], [10, 44, 5], [24, 34, 7], [36, 26, 5],
];

const Terrones = ({ rafaga }) => (
  <>
    {TERRONES.map(([dx, alto, tam], indice) => (
      <Motion.span
        key={`${rafaga}-${indice}`}
        style={{
          position: "absolute",
          left: "50%",
          bottom: "16%",
          width: tam,
          height: tam,
          marginLeft: -tam / 2,
          borderRadius: "40%",
          background: indice % 2 ? "#5a3d26" : "#7a5434",
          pointerEvents: "none",
        }}
        initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
        animate={{
          x: [0, dx * 0.6, dx],
          y: [0, -alto, -alto * 0.3],
          opacity: [1, 1, 0],
          rotate: dx * 4,
        }}
        transition={{ duration: 0.6, ease: "easeOut", times: [0, 0.45, 1] }}
      />
    ))}
  </>
);

/* Montículo de tierra: la entrada a la madriguera, siempre al pie de la burbuja. */
const Monticulo = ({ temblando, sinMovimiento }) => (
  <Motion.svg
    viewBox="0 0 100 34"
    aria-hidden="true"
    style={{
      position: "absolute",
      left: "11%",
      bottom: "3%",
      width: "78%",
      height: "24%",
      overflow: "visible",
      pointerEvents: "none",
    }}
    animate={temblando && !sinMovimiento
      ? { x: [0, -1.5, 1.5, -1, 1, 0], scaleY: [1, 1.08, 0.96, 1.05, 1] }
      : { x: 0, scaleY: 1 }}
    transition={temblando ? { duration: 0.32, repeat: Infinity } : { duration: 0.2 }}
  >
    <path d="M2 32 C10 14 24 6 38 9 C46 2 58 2 66 8 C80 5 92 16 98 32 Z" fill="#6b4a2f" />
    <path d="M10 32 C18 20 30 15 42 18 C50 12 62 13 70 18 C82 16 90 24 94 32 Z" fill="#4e3421" />
    <circle cx="28" cy="15" r="2.4" fill="#8a6142" />
    <circle cx="57" cy="9" r="2" fill="#8a6142" />
    <circle cx="76" cy="16" r="2.6" fill="#7a5434" />
    <circle cx="44" cy="22" r="1.6" fill="#8a6142" />
  </Motion.svg>
);

export const TopoBurbuja = ({
  tamano = 88,
  colorBorde = AZUL,
  /* false = entra directo al reposo, sin escarbar ni saludar. */
  intro = true,
  className,
  style,
}) => {
  const sinMovimiento = useReducedMotion();
  const [fase, setFase] = useState(() => {
    if (sinMovimiento || !intro) return "reposo";
    return leerIntroVista() ? "saludando" : "escarbando";
  });
  const [parpadeo, setParpadeo] = useState(false);
  const [rafaga, setRafaga] = useState(0);
  const temporizadores = useRef([]);

  const limpiar = () => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  };

  const programar = useCallback((tiempos) => {
    limpiar();
    Object.entries(tiempos).forEach(([siguiente, ms]) => {
      temporizadores.current.push(setTimeout(() => setFase(siguiente), ms));
    });
  }, []);

  // Arranque: la escarbada completa o solo el saludo.
  useEffect(() => {
    precargarCapas();
    if (fase === "escarbando") {
      marcarIntroVista();
      sonar("escarbar");
      programar(TIEMPOS_INTRO);
      // Tres salpicadas de tierra mientras escarba.
      [0, 300, 620].forEach((ms) => {
        temporizadores.current.push(setTimeout(() => setRafaga((r) => r + 1), ms));
      });
      temporizadores.current.push(setTimeout(() => sonar("escarbar"), 520));
    } else if (fase === "saludando") {
      programar(TIEMPOS_SALUDO);
    }
    return limpiar;
    // Solo al montar: después las fases avanzan con los temporizadores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fase === "saliendo") {
      sonar("aparecer");
      setRafaga((r) => r + 1);
    }
  }, [fase]);

  // Parpadeo al azar mientras descansa.
  useEffect(() => {
    if (fase !== "reposo" || sinMovimiento) return undefined;
    let vivo = true;
    let temporizador;
    const siguiente = () => {
      temporizador = setTimeout(() => {
        if (!vivo) return;
        setParpadeo(true);
        temporizador = setTimeout(() => {
          setParpadeo(false);
          siguiente();
        }, 140);
      }, 2500 + Math.random() * 3000);
    };
    siguiente();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [fase, sinMovimiento]);

  const saludarOtraVez = () => {
    if (fase !== "reposo" || sinMovimiento) return;
    setFase("saludando");
    programar(TIEMPOS_SALUDO);
  };

  const burbujaVisible = fase !== "escarbando";
  const topoVisible = !["escarbando", "abriendo"].includes(fase);
  const expresion = EXPRESION[fase] || EXPRESION.reposo;
  const saludando = fase === "saludando";

  return (
    <span
      className={className}
      role="img"
      aria-label="Topo de Zaldo saludando"
      onClick={saludarOtraVez}
      style={{
        position: "relative",
        display: "inline-block",
        width: tamano,
        height: tamano,
        flexShrink: 0,
        cursor: fase === "reposo" && !sinMovimiento ? "pointer" : "default",
        ...style,
      }}
    >
      {/* Ecos del iris: dos anillos que salen y se desvanecen al abrirse. */}
      <AnimatePresence>
        {fase === "abriendo" && [0, 1].map((indice) => (
          <Motion.span
            key={`eco-${indice}`}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${colorBorde}`,
              pointerEvents: "none",
            }}
            initial={{ scale: 0.2, opacity: 0.7 }}
            animate={{ scale: 1.25 + indice * 0.15, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: indice * 0.12, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* La burbuja: solo el borde, abierta como iris desde el agujero. */}
      <Motion.span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `2px solid ${colorBorde}`,
          overflow: "hidden",
          transformOrigin: "50% 85%",
        }}
        initial={false}
        animate={burbujaVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
      >
        {/* El topo: brota desde abajo y luego respira. */}
        <Motion.span
          style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}
          initial={false}
          animate={topoVisible
            ? (fase === "reposo" && !sinMovimiento
              ? { y: "0%", scaleY: [1, 1.025, 1], scaleX: [1, 0.99, 1] }
              : { y: "0%", scaleY: 1, scaleX: 1 })
            : { y: "75%", scaleY: 1, scaleX: 1 }}
          transition={fase === "reposo"
            ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 320, damping: 14 }}
        >
          {/* Un poco más chico y hacia abajo: la mano en alto cabe en el círculo. */}
          <span style={{ position: "absolute", inset: 0, transform: "translateY(6%) scale(0.86)", transformOrigin: "50% 100%" }}>
            <Capa nombre="cuerpo" />
            <Capa nombre="brazo-izquierdo" />
            {saludando ? (
              <Capa
                nombre="brazo-derecho-saludo"
                origen={PIVOTE_BRAZO}
                animate={sinMovimiento ? undefined : { rotate: [0, -10, 9, -10, 9, -8, 0] }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            ) : (
              <Capa nombre="brazo-derecho" />
            )}
            <Capa
              nombre={`ojo-izquierdo-${expresion.ojos}`}
              origen={PIVOTE_OJO_IZQ}
              animate={{ scaleY: parpadeo ? 0.1 : 1 }}
              transition={{ duration: 0.07 }}
            />
            <Capa
              nombre={`ojo-derecho-${expresion.ojos}`}
              origen={PIVOTE_OJO_DER}
              animate={{ scaleY: parpadeo ? 0.1 : 1 }}
              transition={{ duration: 0.07 }}
            />
            <Capa nombre={`boca-${expresion.boca}`} />
            <Capa nombre="nariz" />
          </span>
        </Motion.span>
      </Motion.span>

      {/* La madriguera tapa la parte baja del topo, como si saliera de ahí. */}
      <Monticulo temblando={fase === "escarbando"} sinMovimiento={sinMovimiento} />
      {!sinMovimiento && rafaga > 0 && <Terrones key={rafaga} rafaga={rafaga} />}
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
