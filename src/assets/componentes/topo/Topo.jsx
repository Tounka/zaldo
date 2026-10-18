import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { rutaTopo } from "./topoAssets";

/*
 * La mascota de Zaldo. Las pantallas piden un estado ("feliz", "excavando"...)
 * y no una imagen: si algún día el topo pasa a capas o a Rive, solo cambia
 * este componente.
 *
 * Cada estado tiene un movimiento propio en bucle (respirar, rebotar,
 * escarbar) y el cambio de estado entra con un pequeño salto. Con "reducir
 * movimiento" activado se muestra la imagen quieta.
 */

/* Respiración suave: crece un poco hacia arriba sin despegarse del piso. */
const RESPIRAR = {
    animate: { scaleY: [1, 1.03, 1], scaleX: [1, 0.99, 1] },
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
};

const MOVIMIENTOS = {
    reposo: RESPIRAR,
    pensando: RESPIRAR,
    senalando: RESPIRAR,
    moneda: RESPIRAR,
    feliz: {
        animate: { y: [0, -3, 0], scaleY: [1, 1.03, 1] },
        transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
    },
    saludando: {
        animate: { rotate: [0, -2.5, 0, 2, 0] },
        transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
    },
    celebrando: {
        animate: { y: [0, -10, 0], scaleY: [0.96, 1.04, 0.96] },
        transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" },
    },
    excavando: {
        animate: { rotate: [-2, 2, -2], x: [-1, 1, -1] },
        transition: { duration: 0.45, repeat: Infinity, ease: "easeInOut" },
    },
    preocupado: {
        animate: { x: [0, -2, 2, -1, 0, 0], scaleY: [1, 0.98, 1] },
        transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
    },
    durmiendo: {
        animate: { scaleY: [1, 1.045, 1], scaleX: [1, 0.985, 1] },
        transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
    },
};

export const Topo = ({
    estado = "reposo",
    tamano = 120,
    /* Texto para lectores de pantalla; vacío = decorativo. */
    alt = "",
    /* true en lo que se ve al cargar (login, avatar): evita la carga diferida. */
    prioridad = false,
    animar = true,
    className,
    style,
}) => {
    const sinMovimiento = useReducedMotion() || !animar;
    const movimiento = MOVIMIENTOS[estado] || RESPIRAR;

    return (
        <span
            className={className}
            style={{
                display: "inline-block",
                position: "relative",
                width: tamano,
                height: tamano,
                flexShrink: 0,
                ...style,
            }}
            role={alt ? "img" : undefined}
            aria-label={alt || undefined}
            aria-hidden={alt ? undefined : true}
        >
            <AnimatePresence initial={false}>
                <Motion.img
                    key={estado}
                    src={rutaTopo(estado, 256)}
                    srcSet={`${rutaTopo(estado, 256)} 256w, ${rutaTopo(estado, 512)} 512w`}
                    sizes={`${tamano}px`}
                    width={tamano}
                    height={tamano}
                    alt=""
                    draggable={false}
                    decoding="async"
                    loading={prioridad ? "eager" : "lazy"}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transformOrigin: "50% 92%",
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                    initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 6 }}
                    animate={sinMovimiento
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1, y: 0, ...movimiento.animate }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={sinMovimiento
                        ? { duration: 0.2 }
                        : {
                            opacity: { duration: 0.2 },
                            scale: { type: "spring", stiffness: 420, damping: 18 },
                            default: movimiento.transition,
                        }}
                />
            </AnimatePresence>
        </span>
    );
};
