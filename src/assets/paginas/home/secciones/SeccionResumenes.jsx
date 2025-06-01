import styled from "styled-components"
import { CardResumenCuenta } from "../../../componentes/cards/CardResumenCuentaHome";

const ContenedorSeccionResumenes = styled.div`
    display: grid;
    grid-template-columns: repeat( 6, 1fr);
    width: 100%;
    height:auto;
    max-width: 1200px;
    
    gap: 10px;
    @media (max-width: 800px) {
        grid-template-columns: repeat( 3, 1fr);
        grid-template-rows: repeat( 2, 1fr);
    }
`;

export const SeccionResumenes = () =>{
    return(
        <ContenedorSeccionResumenes>
            <CardResumenCuenta txt="Activos" />
            <CardResumenCuenta txt="Pasivos"/>
            <CardResumenCuenta txt="Liquido"/>
            <CardResumenCuenta txt="Saldo Msi"/>
            <CardResumenCuenta txt="Saldo Revolvente"/>
            <CardResumenCuenta txt="Ahorro"/>
        </ContenedorSeccionResumenes>
    )
} 