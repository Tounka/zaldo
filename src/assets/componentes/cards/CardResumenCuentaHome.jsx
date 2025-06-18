import styled from "styled-components"
import { ContenedorCentradoGenerico } from "../genericos/contenedores";
import { limitarADosDecimales } from "../../funciones/utils/numeros";

const ContenedorResumenCuenta = styled.div`
    width: 100%;
    height: 110px;
    display: grid;
    grid-template-rows: 40px auto;
    border-radius: 20px;
    border: 2px solid var(--colorMorado);
    overflow: hidden;
    
`;

const ContenedorTop = styled(ContenedorCentradoGenerico)`
    background-color: var(--colorMorado);
    color: var(--colorBlanco);
    text-align: center;
    line-height: 1;
`;
const ContenedorBottom = styled(ContenedorCentradoGenerico)`
    font-weight: bold;
    font-size: var(--fontMd);
    color: var(--colorMorado);

    @media (max-width: 800px) {
        font-size: 18px;
    }

    @media (max-width: 400px) {
        font-size: 16px;
    }
`;
export const CardResumenCuenta = ({ titulo = "Nombre Resumen", cantidad = "20" }) => {
    return (
        <ContenedorResumenCuenta>
            <ContenedorTop>{titulo}</ContenedorTop>
            <ContenedorBottom> ${ limitarADosDecimales(cantidad)}</ContenedorBottom>
        </ContenedorResumenCuenta>
    )
}