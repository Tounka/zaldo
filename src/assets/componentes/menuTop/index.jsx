import styled from "styled-components"

import { FaPlus } from "react-icons/fa6";
import { FaBars, FaBarsStaggered } from "react-icons/fa6";
import { useState } from "react";
import { MenuSecundario } from "./menuSecundarioLateral";

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
`;

const ContenedorBtnStyled = styled.button`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 40px;
    background-color: var(--colorMoradoSecundario);

    cursor: pointer;
    border: none;
    color: var(--colorMoradoFondo);

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
    
    @media (max-width: 600px) {
        font-size: var(--fontLg);
        line-height: 1.1;
        
    }
`;
export const MenuTop = ({ txt = "Buenos días luis" }) => {
    const [isOpenMenuLateral, setIsOpenMenuLateral] = useState(false);
    const handleClickBtnMenu = () => {
        setIsOpenMenuLateral(prev => !prev)

    }
    return (
        <ContenedorMenuTop>
            <MenuSecundario isOpen={isOpenMenuLateral} />
            <ContenedorBtnStyled>
                <FaPlus />
            </ContenedorBtnStyled>

            <ContenedorTitulo>
                {txt}
            </ContenedorTitulo>

            <ContenedorBtnStyled onClick={() => handleClickBtnMenu()}>
                {isOpenMenuLateral ?
                    <FaBarsStaggered />
                    :
                    <FaBars />
                }


            </ContenedorBtnStyled>

        </ContenedorMenuTop>

    )
} 