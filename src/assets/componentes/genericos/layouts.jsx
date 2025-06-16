import { Outlet } from "react-router-dom";
import styled from "styled-components";
import { MenuTop } from "../menuTop";
import { ModalModificarTarjeta } from "../modales/modificarInformacionTarjeta";
import { ModalModificarMontoCuenta } from "../modales/modificarMontoCuenta";
import { ModalAgregarMovimiento } from "../modales/agregaMovimiento";
import { ModalAgregarIntituciones } from "../modales/agregarInstitucion";
import { ModalAgregarCuenta } from "../modales/agregarCuenta";
import { useContextoGeneral } from "../../contextos/general";
import { useContextoModales } from "../../contextos/modales";

export const Contenedor100vdh = styled.div`
    width: 100dvw;
    height: 100dvh;
    display: flex;
    justify-content: center;
    align-items: center;
`
export const Contenedor100 = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: ${props => props.top ? "start" : "center"} ;
    flex-direction: ${({ direction }) => direction || "row"} ;
    gap: ${({ gap }) => gap || "0"} ;
    align-items:  center;
    overflow-x: hidden;
`

export const LayoutApp = styled(Contenedor100vdh)`
    margin-left: ${props => props.user ? "var(--anchoMenuLateral)" : "0"};
    width: ${props => props.user ? "calc(100dvw - var(--anchoMenuLateral))" : "100%"};
    transition: margin-left .3s ease;
`


export const ContenedorApp = styled.div`
  display: flex;
  padding-top: var(--alturaTopMenu);
  width: 100%;
  height: 100%;   
  max-height: auto;
`;
const ContenedorRutas = styled.div`
  width: 100%;
  padding: 20px;
  height: auto;
  
`;

export const LayoutConMenu = () => {
    return (
        <ContenedorApp>
            <MenuTop />
            <ContenedorRutas>
                <Outlet />
            </ContenedorRutas>



            <ModalModificarTarjeta />
            <ModalModificarMontoCuenta />
            <ModalAgregarMovimiento />
            <ModalAgregarIntituciones />
            <ModalAgregarCuenta />
        </ContenedorApp>
    )
}
