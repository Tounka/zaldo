import styled from "styled-components"

import { FaPlus } from "react-icons/fa6";
import { FaBars, FaBarsStaggered } from "react-icons/fa6";
import { useState } from "react";
import { MenuSecundario } from "./menuSecundarioLateral";
import { useContextoGeneral } from "../../contextos/general";
import { useContextoModales } from "../../contextos/modales";
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
    @media (max-width: 600px) {
        font-size: var(--fontLg);
        line-height: 1.1;
        
    }
       @media (max-width: 400px) {
        font-size: var(--fontSm);
        line-height: 1.1;
        
    }
`;
export const MenuTop = () => {

    const { usuario } = useContextoGeneral();
    const { isOpenAgregarMovimiento, setIsOpenAgregarMovimiento } = useContextoModales();
    const [isOpenMenuLateral, setIsOpenMenuLateral] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const handleClickBtnMenu = () => {
        setIsOpenMenuLateral(prev => !prev)

    }
    const handleClickMenuIzquierdo = () => {
        setIsOpenAgregarMovimiento(prev => !prev)
    }
    const handleClickBtnPrincipal = () => {
        console.log(location)
        if (location.pathname == "/home") {
            navigate("/cuentas")
        } else if (location.pathname === "/cuentas") {
            navigate("/home")
        }
    }
    return (
        <ContenedorMenuTop>
            <ContenedorBtnStyled onClick={() => handleClickMenuIzquierdo()}>
                <FaPlus />
            </ContenedorBtnStyled>

            <ContenedorTitulo onClick={() => handleClickBtnPrincipal()} >
                Buenos Dias {usuario?.nombres?.split(" ")[0]}
            </ContenedorTitulo>

            <ContenedorBtnStyled onClick={() => handleClickBtnMenu()} zIndex="30000" >
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