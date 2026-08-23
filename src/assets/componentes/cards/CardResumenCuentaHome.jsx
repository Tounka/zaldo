import styled from "styled-components"
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { ContenedorCentradoGenerico } from "../genericos/contenedores";

const ContenedorResumenCuenta = styled.div`
    width: 100%;
    min-height: ${({ $tieneDetalle }) => ($tieneDetalle ? "118px" : "94px")};
    min-width: 0;
    box-sizing: border-box;
    display: grid;
    grid-template-rows: 34px ${({ $tieneDetalle }) => ($tieneDetalle ? "1fr 38px" : "1fr")};
    border-radius: 15px;
    border: none;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(83, 59, 143, 0.05);

    @media (max-width: 800px) {
        min-height: ${({ $tieneDetalle }) => ($tieneDetalle ? "86px" : "72px")};
        grid-template-rows: 26px ${({ $tieneDetalle }) => ($tieneDetalle ? "1fr 22px" : "1fr")};
        border-radius: 9px;
    }
`;

const ContenedorTop = styled(ContenedorCentradoGenerico)`
    background-color: var(--colorMorado);
    color: var(--colorBlanco);
    text-align: center;
    line-height: 1;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 500px) {
        font-size: 8px;
        padding: 0 2px;
    }
`;
const ContenedorBottom = styled(ContenedorCentradoGenerico)`
    font-weight: bold;
    font-size: 16px;
    color: var(--colorMorado);

    @media (max-width: 800px) {
        font-size: clamp(9px, 2.2vw, 13px);
        padding: 0 2px;
    }

    @media (max-width: 400px) {
        font-size: clamp(8px, 2.2vw, 10px);
    }
`;

const ContenedorDetalle = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 9px;
    border-top: 1px solid rgba(83, 59, 143, 0.12);
    color: #665b76;
    font-size: 9px;
    font-weight: 700;

    strong {
        color: var(--colorMorado);
        font-size: 11px;
        white-space: nowrap;
    }

`;

const formatearMoneda = formatearMonedaSegunPreferencia;

export const CardResumenCuenta = ({
    titulo = "Nombre Resumen",
    cantidad = "20",
    detalleTitulo,
    detalleCantidad,
}) => {
    const tieneDetalle = detalleTitulo && detalleCantidad !== undefined;

    return (
        <ContenedorResumenCuenta $tieneDetalle={tieneDetalle}>
            <ContenedorTop>{titulo}</ContenedorTop>
            <ContenedorBottom>{formatearMoneda(cantidad)}</ContenedorBottom>
            {tieneDetalle && (
                <ContenedorDetalle>
                    <strong aria-label={detalleTitulo}>{formatearMoneda(detalleCantidad)}</strong>
                </ContenedorDetalle>
            )}
        </ContenedorResumenCuenta>
    )
}
