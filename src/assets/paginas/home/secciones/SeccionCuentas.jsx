import styled from "styled-components";
import { CardCuenta } from "../../../componentes/cards/CardCuenta";
const ContenedorSeccionCuentas = styled.div`
    width: 100%;
    height:auto;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
`;
export const SeccionCuentas = () =>{
    return(
        <ContenedorSeccionCuentas>
            <CardCuenta />
        </ContenedorSeccionCuentas>
    )
}