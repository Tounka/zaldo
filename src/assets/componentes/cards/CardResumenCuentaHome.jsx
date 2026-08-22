import styled from "styled-components"
import { ContenedorCentradoGenerico } from "../genericos/contenedores";

const ContenedorResumenCuenta = styled.div`
    width: 100%;
    min-height: ${({ $tieneDetalle }) => ($tieneDetalle ? "118px" : "94px")};
    display: grid;
    grid-template-rows: 34px ${({ $tieneDetalle }) => ($tieneDetalle ? "1fr 38px" : "1fr")};
    border-radius: 15px;
    border: 1px solid rgba(83, 59, 143, 0.2);
    background: #fff;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(83, 59, 143, 0.05);
`;

const ContenedorTop = styled(ContenedorCentradoGenerico)`
    background-color: var(--colorMorado);
    color: var(--colorBlanco);
    text-align: center;
    line-height: 1;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 700;

    @media (max-width: 500px) {
        font-size: 10px;
    }
`;
const ContenedorBottom = styled(ContenedorCentradoGenerico)`
    font-weight: bold;
    font-size: 16px;
    color: var(--colorMorado);

    @media (max-width: 800px) {
        font-size: 14px;
    }

    @media (max-width: 400px) {
        font-size: 12px;
    }
`;

const ContenedorDetalle = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
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

const formatearMoneda = (valor) => new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(Number(valor) || 0);

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
                    <span>{detalleTitulo}</span>
                    <strong>{formatearMoneda(detalleCantidad)}</strong>
                </ContenedorDetalle>
            )}
        </ContenedorResumenCuenta>
    )
}
