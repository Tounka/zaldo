import { useEffect } from "react";
import styled from "styled-components";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { Topo } from "./Topo";
import { useTopoStore } from "../../stores/useTopoStore";

/*
 * El topo asoma desde el borde inferior izquierdo (el derecho es del
 * asistente), dice algo corto y se vuelve a esconder. Lo dispara
 * `festejarTopo` al guardar movimientos, transferencias, etc.
 *
 * No captura clics: es decorativo y nunca debe tapar un botón.
 */

const DURACION_MS = 2600;

export const TopoFestejo = () => {
    const aparicion = useTopoStore((state) => state.aparicion);
    const ocultar = useTopoStore((state) => state.ocultar);
    const reducirMovimiento = useReducedMotion();

    useEffect(() => {
        if (!aparicion) return undefined;
        const temporizador = setTimeout(() => ocultar(aparicion.id), DURACION_MS);
        return () => clearTimeout(temporizador);
    }, [aparicion, ocultar]);

    return (
        <Hoyo aria-live="polite">
            <AnimatePresence>
                {aparicion && (
                    <Motion.div
                        key={aparicion.id}
                        initial={reducirMovimiento ? { opacity: 0 } : { y: 110, rotate: -8 }}
                        animate={reducirMovimiento ? { opacity: 1 } : { y: 0, rotate: 0 }}
                        exit={reducirMovimiento ? { opacity: 0 } : { y: 120, transition: { duration: 0.3, ease: "easeIn" } }}
                        transition={{ type: "spring", stiffness: 380, damping: 20 }}
                        style={{ display: "flex", alignItems: "flex-end", gap: 4 }}
                    >
                        <Topo estado={aparicion.estado} tamano={92} prioridad />
                        {aparicion.texto && (
                            <Globo
                                initial={{ opacity: 0, scale: 0.7, x: -6 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ delay: reducirMovimiento ? 0 : 0.25, duration: 0.2 }}
                            >
                                {aparicion.texto}
                            </Globo>
                        )}
                    </Motion.div>
                )}
            </AnimatePresence>
        </Hoyo>
    );
};

/* Recorta al topo por abajo: parece que sale de un agujero en el borde. */
const Hoyo = styled.div`
    position: fixed;
    left: 12px;
    bottom: 0;
    z-index: 10400;
    height: 150px;
    width: min(320px, calc(100vw - 96px));
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    pointer-events: none;
`;

const Globo = styled(Motion.div)`
    margin-bottom: 58px;
    padding: 8px 12px;
    border-radius: 14px 14px 14px 4px;
    background: #ffffff;
    color: #18161f;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    box-shadow: 0 10px 28px -10px rgba(24, 22, 31, 0.35), 0 1px 3px rgba(24, 22, 31, 0.1);
    transform-origin: bottom left;
`;
