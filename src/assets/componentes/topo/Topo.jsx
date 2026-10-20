import { AnimatePresence, motion as Motion } from "framer-motion";
import { rutaTopo } from "./topoAssets";

/*
 * La mascota de Zaldo. Las pantallas piden un estado ("feliz", "excavando"...)
 * y no una imagen: si algún día el topo pasa a capas o a Rive, solo cambia
 * este componente.
 *
 * Cada estado tiene un movimiento propio en bucle (respirar, rebotar,
 * escarbar) y el cambio de estado entra con un pequeño salto. Con
 * `animar={false}` se muestra la imagen quieta.
 */

/*
 * Movimientos en porcentaje del tamaño: así se notan igual en el avatar de
 * 40 px que en un estado vacío de 130 px. Antes casi todos los estados solo
 * "respiraban" un 3 % y en pantalla parecían imágenes quietas.
 */
const MOVIMIENTOS = {
    reposo: {
        animate: { y: ["0%", "-4%", "0%"], scaleY: [1, 1.04, 1], scaleX: [1, 0.98, 1] },
        transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
    },
    pensando: {
        // Ladea la cabeza de un lado a otro, como quien busca la respuesta.
        animate: { rotate: [-5, 5, -5], y: ["0%", "-2%", "0%", "-2%", "0%"] },
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
    senalando: {
        // Empuja hacia adelante, insistiendo en lo que señala.
        animate: { x: ["0%", "5%", "0%"], rotate: [0, 4, 0] },
        transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 },
    },
    moneda: {
        animate: { y: ["0%", "-7%", "0%"], rotate: [-4, 4, -4] },
        transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
    },
    feliz: {
        animate: { y: ["0%", "-7%", "0%"], scaleY: [0.97, 1.04, 0.97] },
        transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
    },
    saludando: {
        animate: { rotate: [0, -7, 0, 6, 0], y: ["0%", "-3%", "0%"] },
        transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
    },
    celebrando: {
        animate: { y: ["0%", "-12%", "0%"], scaleY: [0.94, 1.06, 0.94], rotate: [-3, 3, -3] },
        transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" },
    },
    excavando: {
        animate: { rotate: [-4, 4, -4], x: ["-2%", "2%", "-2%"], y: ["0%", "-2%", "0%"] },
        transition: { duration: 0.4, repeat: Infinity, ease: "easeInOut" },
    },
    preocupado: {
        animate: { x: ["0%", "-3%", "3%", "-2%", "0%", "0%"], rotate: [0, -2, 2, 0, 0, 0] },
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    durmiendo: {
        animate: { scaleY: [1, 1.07, 1], scaleX: [1, 0.97, 1], rotate: [0, -2, 0] },
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
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
    const sinMovimiento = !animar;
    const movimiento = MOVIMIENTOS[estado] || MOVIMIENTOS.reposo;

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
                    initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: "5%" }}
                    animate={sinMovimiento
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1, y: "0%", ...movimiento.animate }}
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
