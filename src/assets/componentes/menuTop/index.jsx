import styled from "styled-components"

import { FaPlus } from "react-icons/fa6";
import { FaBars, FaBarsStaggered } from "react-icons/fa6";
import { useState, useRef, useCallback } from "react";
import { MenuSecundario } from "./menuSecundarioLateral";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { useLocation, useNavigate } from "react-router-dom";

const ContenedorMenuTop = styled.div`
    display: grid;
    grid-template-columns: 80px auto 80px;
    width: 100%;
    height: var(--alturaTopMenu);
    background-color: var(--colorMorado);
    border-radius: 0 0 20px 20px;
    overflow: hidden;
    
    
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
`;

export const MenuTop = () => {

    const { usuario } = useAppStore();
    const { setIsOpenAgregarMovimiento } = useModalStore();
    const [isOpenMenuLateral, setIsOpenMenuLateral] = useState(false);
    const [progresoLongPress, setProgresoLongPress] = useState(0);

    const location = useLocation();
    const navigate = useNavigate();
    
    const longPressStartRef = useRef(null);
    const isLongPressRef = useRef(false);
    const animFrameRef = useRef(null);
    
    const LONG_PRESS_DURATION = 600;

    const handleClickMenuIzquierdo = () => {
        setIsOpenAgregarMovimiento(prev => !prev);
    };

    const iniciarLongPress = useCallback(() => {
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

    const terminarLongPress = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        
        if (!isLongPressRef.current && longPressStartRef.current) {
            navigate("/ahorros");
        }
        
        longPressStartRef.current = null;
        setProgresoLongPress(0);
    }, [navigate]);

    const cancelarLongPress = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        longPressStartRef.current = null;
        setProgresoLongPress(0);
    }, []);

    return (
        <ContenedorMenuTop>
            <ContenedorBtnStyled onClick={() => handleClickMenuIzquierdo()}>
                <FaPlus />
            </ContenedorBtnStyled>

            <ContenedorTituloWrapper>
                <ContenedorTitulo 
                    onMouseDown={iniciarLongPress}
                    onMouseUp={terminarLongPress}
                    onMouseLeave={cancelarLongPress}
                    onTouchStart={iniciarLongPress}
                    onTouchEnd={terminarLongPress}
                    onTouchCancel={cancelarLongPress}
                >
                    Buenos Dias {usuario?.nombres?.split(" ")[0]}
                </ContenedorTitulo>
                <IndicadorLongPress $progreso={progresoLongPress} />
            </ContenedorTituloWrapper>

            <ContenedorBtnStyled onClick={() => setIsOpenMenuLateral(prev => !prev)} zIndex="30000" >
                {isOpenMenuLateral ?
                    <FaBarsStaggered />
                    :
                    <FaBars />
                }
            </ContenedorBtnStyled>

            <MenuSecundario setIsOpenMenuLateral={setIsOpenMenuLateral} isOpen={isOpenMenuLateral} />
        </ContenedorMenuTop>

    )
} 