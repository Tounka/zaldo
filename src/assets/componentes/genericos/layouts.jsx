import { useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import styled from "styled-components";
import { MenuTop } from "../menuTop";
import { ModalModificarTarjeta } from "../Modales/modificarInformacionTarjeta";
import { ModalModificarMontoCuenta } from "../Modales/modificarMontoCuenta";
import { ModalAgregarMovimiento } from "../Modales/agregaMovimiento";
import { ModalGastosRecurrentesPendientes } from "../Modales/gastosRecurrentesPendientes";

import { ModalAgregarCuenta } from "../Modales/agregarCuenta";
import { ModalAgregarMovimientoEntreCuentas } from "../Modales/movimientoEntreCuentas";
import { LienzoEnlaceCuentas } from "../enlaceCuentas/LienzoEnlaceCuentas";
import { ModalInstituciones } from "../Modales/instituciones";
import { ModalAgregarIntituciones } from "../Modales/AgregarInstitucion";
import { AsistenteFlotante } from "../asistenteIA/AsistenteFlotante";
import { GestorTutoriales } from "../tutoriales/GestorTutoriales";
import { TopoFestejo } from "../topo/TopoFestejo";

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
      @media (max-width: 400px) {
      padding-top: calc(var(--alturaTopMenuTelefono)  );

    }
`;
const ContenedorRutas = styled.div`
  width: 100%;
  min-width: 0;
  padding: 20px;
  height: auto;

  @media (max-width: 600px) {
    padding: 14px 12px;
  }
`;

/*
 * Congela la página que sale: AnimatePresence la sigue pintando durante su
 * animación de salida y, si leyera <Outlet /> en vivo, ya mostraría la nueva.
 */
const OutletCongelado = () => {
    const outlet = useOutlet();
    const [congelado] = useState(outlet);
    return congelado;
};

export const LayoutConMenu = () => {
    const location = useLocation();

    return (
        <ContenedorApp>
            <MenuTop />
            <ContenedorRutas>
                <AnimatePresence mode="wait" initial={false}>
                    <Motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                        <OutletCongelado />
                    </Motion.div>
                </AnimatePresence>
            </ContenedorRutas>



            <ModalModificarTarjeta />
            <ModalModificarMontoCuenta />
            <ModalAgregarMovimiento />
            <ModalInstituciones />
            <ModalAgregarIntituciones />
            <ModalAgregarCuenta />
            <ModalAgregarMovimientoEntreCuentas />
            <ModalGastosRecurrentesPendientes />
            <LienzoEnlaceCuentas />
            <AsistenteFlotante />
            <GestorTutoriales />
            <TopoFestejo />
        </ContenedorApp>
    )
}
