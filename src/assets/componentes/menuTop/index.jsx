import styled from "styled-components"

import { FaPlus, FaBars, FaXmark, FaQuestion } from "react-icons/fa6";
import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { MenuSecundario } from "./menuSecundarioLateral";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { obtenerTutorial } from "../../tutoriales";
import { useLocation, useNavigate } from "react-router-dom";

const ContenedorMenuTop = styled.div`
    display: grid;
    grid-template-columns: 80px auto 80px;
    width: 100%;
    height: var(--alturaTopMenu);
    background-color: var(--colorMorado);
    border-radius: 0 0 20px 20px;
    overflow: visible;
    
    
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    @media (max-width: 400px) {
        height: var(--alturaTopMenuTelefono);
    }
`;

const ContenedorBtnStyled = styled.button`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 40px;
    background-color: var(--colorMoradoSecundario);
    z-index: ${({ zIndex }) => zIndex || "1000"};
    cursor: pointer;
    border: none;
    color: var(--colorMoradoFondo);
    transition: background-color 0.15s ease, color 0.15s ease, border-radius 0.2s ease, opacity 0.15s ease;
    border-radius: ${({ $lado, $isOpen }) => {
        if ($lado === "izq") return "0 0 0 20px";
        if ($lado === "der") return $isOpen ? "0 0 0 14px" : "0 0 20px 0";
        return "0";
    }};

    &:hover {
        opacity: 0.92;
    }
    &:active {
        opacity: 0.8;
    }
    
    @media (max-width: 800px) {
        font-size: 30px; 
    }
    @media (max-width: 400px) {
        font-size: 24px; 
    }
`;
const ContenedorTitulo = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: var(--fontXl);
    
    text-align: center;
    color: var(--colorMoradoFondo);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    /* Sin esto el navegador puede tomar el gesto y mandar pointercancel a mitad del toque. */
    touch-action: none;
    transition: opacity 0.15s ease;

    &:active {
        opacity: 0.8;
    }

    @media (max-width: 600px) {
        font-size: var(--fontLg);
        line-height: 1.1;
        
    }
       @media (max-width: 400px) {
        font-size: var(--fontSm);
        line-height: 1.1;
        
    }
`;

const IndicadorLongPress = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: var(--colorMoradoSecundario);
    border-radius: 0 2px 0 0;
    width: ${({ $progreso }) => $progreso}%;
    transition: width 0.05s linear;
    pointer-events: none;
`;

const ContenedorTituloWrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    /* Reserva el hueco del botón de ayuda en ambos lados para que el saludo siga centrado. */
    padding: 0 ${({ $conAyuda }) => ($conAyuda ? "40px" : "0")};
`;

const BtnAyuda = styled.button`
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(238, 238, 255, 0.4);
    border-radius: 50%;
    appearance: none;
    background: transparent;
    color: var(--colorMoradoFondo);
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.15s ease;

    /* Área táctil de 44 px sin agrandar el círculo. */
    &::before {
        content: "";
        position: absolute;
        inset: -7px;
    }

    &:hover {
        background: rgba(238, 238, 255, 0.14);
    }

    &:focus-visible {
        outline: 2px solid var(--colorMoradoSecundario);
        outline-offset: 2px;
    }
`;

const saludoSegunHora = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
};

export const MenuTop = () => {

    const { usuario, preferencias } = useAppStore();
    const { setIsOpenAgregarMovimiento } = useModalStore();
    const pedirTutorial = useTutorialStore((state) => state.pedirTutorial);
    const [isOpenMenuLateral, setIsOpenMenuLateral] = useState(false);
    const [progresoLongPress, setProgresoLongPress] = useState(0);

    const location = useLocation();
    const navigate = useNavigate();
    const hayTutorial = Boolean(obtenerTutorial(location.pathname));
    
    const longPressStartRef = useRef(null);
    const isLongPressRef = useRef(false);
    const animFrameRef = useRef(null);
    
    const LONG_PRESS_DURATION = 600;

    const handleClickMenuIzquierdo = () => {
        setIsOpenAgregarMovimiento(prev => !prev);
    };

    const iniciarLongPress = useCallback((e) => {
        // Solo el botón principal; el clic derecho o el central no navegan.
        if (e.button !== 0) return;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        isLongPressRef.current = false;
        longPressStartRef.current = Date.now();
        setProgresoLongPress(0);

        const actualizarProgreso = () => {
            if (!longPressStartRef.current) return;
            const elapsed = Date.now() - longPressStartRef.current;
            const progreso = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
            setProgresoLongPress(progreso);

            if (progreso >= 100) {
                isLongPressRef.current = true;
                if (location.pathname === "/home") {
                    navigate("/cuentas");
                } else {
                    navigate("/home");
                }
                longPressStartRef.current = null;
                setProgresoLongPress(0);
                return;
            }

            animFrameRef.current = requestAnimationFrame(actualizarProgreso);
        };

        animFrameRef.current = requestAnimationFrame(actualizarProgreso);
    }, [location.pathname, navigate]);

    const destinoBotonPrincipal = preferencias.destinoBotonPrincipal || "/ahorros";

    const handleClickTitulo = useCallback(() => {
        if (location.pathname === destinoBotonPrincipal) {
            navigate("/home");
            return;
        }

        navigate(destinoBotonPrincipal);
    }, [destinoBotonPrincipal, location.pathname, navigate]);

    const terminarLongPress = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        
        if (!isLongPressRef.current && longPressStartRef.current) {
            handleClickTitulo();
        }
        
        longPressStartRef.current = null;
        setProgresoLongPress(0);
    }, [handleClickTitulo]);

    const cancelarLongPress = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        longPressStartRef.current = null;
        setProgresoLongPress(0);
    }, []);

    return (
        <ContenedorMenuTop>
            <ContenedorBtnStyled onClick={() => handleClickMenuIzquierdo()} $lado="izq" aria-label="Agregar movimiento" data-tour="menu-nuevo-movimiento">
                <FaPlus />
            </ContenedorBtnStyled>

            <ContenedorTituloWrapper $conAyuda={hayTutorial}>
                <ContenedorTitulo
                    data-tour="menu-titulo"
                    role="button"
                    tabIndex={0}
                    /*
                     * Eventos de puntero y no touch + mouse: en celular el navegador
                     * emula mousedown/mouseup después del touchend y el toque
                     * navegaba dos veces (ida y vuelta), así que parecía no hacer nada.
                     */
                    onPointerDown={iniciarLongPress}
                    onPointerUp={terminarLongPress}
                    onPointerLeave={cancelarLongPress}
                    onPointerCancel={cancelarLongPress}
                    onContextMenu={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleClickTitulo();
                        }
                    }}
                >
                    {saludoSegunHora()} {usuario?.nombres?.split(" ")[0]}
                </ContenedorTitulo>
                <IndicadorLongPress $progreso={progresoLongPress} />
                {hayTutorial && (
                    <BtnAyuda
                        type="button"
                        onClick={pedirTutorial}
                        aria-label="Ver el tutorial de esta pantalla"
                        title="Ver el tutorial de esta pantalla"
                        data-tour="menu-ayuda"
                    >
                        <FaQuestion aria-hidden="true" />
                    </BtnAyuda>
                )}
            </ContenedorTituloWrapper>

            <ContenedorBtnStyled
                onClick={() => setIsOpenMenuLateral(prev => !prev)}
                zIndex="30000"
                $lado="der"
                $isOpen={isOpenMenuLateral}
                aria-label={isOpenMenuLateral ? "Cerrar menú lateral" : "Abrir menú lateral"}
                data-tour="menu-lateral"
            >
                <AnimatePresence mode="wait" initial={false}>
                    <Motion.span
                        key={isOpenMenuLateral ? "cerrar" : "abrir"}
                        style={{ display: "grid", placeItems: "center" }}
                        initial={{ rotate: isOpenMenuLateral ? -135 : 135, scale: 0.6, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        exit={{ rotate: isOpenMenuLateral ? 135 : -135, scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {isOpenMenuLateral ? <FaXmark /> : <FaBars />}
                    </Motion.span>
                </AnimatePresence>
            </ContenedorBtnStyled>

            <MenuSecundario setIsOpenMenuLateral={setIsOpenMenuLateral} isOpen={isOpenMenuLateral} />
        </ContenedorMenuTop>

    )
} 
