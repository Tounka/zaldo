import styled from "styled-components"
import { SeccionResumenes } from "./secciones/seccionResumenes"
import { SeccionCuentas } from "./secciones/seccionCuentas";
import { useState } from "react";
import { ModalAgregarIntituciones } from "../../componentes/modales/agregarInstitucion";
import { ModalAgregarCuenta } from "../../componentes/modales/agregaCuenta";
import { ModalAgregarMovimiento } from "../../componentes/modales/agregaMovimiento";
import { ModalModificarMontoCuenta } from "../../componentes/modales/modificarMontoCuenta";
import { ModalModificarTarjeta } from "../../componentes/modales/modificarInformacionTarjeta";

const ContenedorHomeUx = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
`;

export const HomeUx = () =>{
    
    return(
        <ContenedorHomeUx>
            <SeccionResumenes />
            <SeccionCuentas />
            
            
            <ModalModificarTarjeta />
            <ModalModificarMontoCuenta />
            <ModalAgregarMovimiento />
            <ModalAgregarIntituciones />
            <ModalAgregarCuenta />
        </ContenedorHomeUx>
    )
}