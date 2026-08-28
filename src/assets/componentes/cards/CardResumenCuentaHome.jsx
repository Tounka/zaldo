import styled from "styled-components"
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { ContenedorCentradoGenerico } from "../genericos/contenedores";
import { useState } from "react";
import { FaQuestion } from "react-icons/fa";
import { ModalEncabezado, ModalGenerico } from "../modales/ModalGenerico";

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
    position: relative;
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
        font-size: clamp(12px, 3vw, 18px);
        padding: 0 2px;
    }

    @media (max-width: 400px) {
        font-size: clamp(10.8px, 3vw, 13.8px);
    }
`;

const BotonAyuda = styled.button`
    position: absolute;
    top: 50%;
    right: 8px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    transform: translateY(-50%);
    border: 1px solid rgba(255, 255, 255, .42);
    border-radius: 50%;
    background: rgba(255, 255, 255, .14);
    color: #fff;
    font-size: 11px;
    cursor: pointer;

    &:hover, &:focus-visible { background: rgba(255, 255, 255, .28); }
    &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

    @media (max-width: 500px) { right: 3px; width: 17px; height: 17px; font-size: 8px; }
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

    span { white-space: nowrap; }

`;

const AyudaContenido = styled.div`
    width: min(470px, 100%);
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 0 20px 22px;
    color: #5c5168;
    font-size: 13px;
    line-height: 1.5;

    p { margin: 0; }
    strong { color: var(--colorMorado); }
`;

const formatearMoneda = formatearMonedaSegunPreferencia;

export const CardResumenCuenta = ({
    titulo = "Nombre Resumen",
    cantidad = "20",
    detalleTitulo,
    detalleCantidad,
    mostrarAyuda = false,
}) => {
    const tieneDetalle = detalleTitulo && detalleCantidad !== undefined;
    const [ayudaAbierta, setAyudaAbierta] = useState(false);

    return (
        <ContenedorResumenCuenta $tieneDetalle={tieneDetalle}>
            <ContenedorTop>
                {titulo}
                {mostrarAyuda && (
                    <BotonAyuda
                        type="button"
                        aria-label={`Explicar ${titulo}`}
                        title={`¿Qué significa ${titulo}?`}
                        onClick={() => setAyudaAbierta(true)}
                    >
                        <FaQuestion aria-hidden="true" />
                    </BotonAyuda>
                )}
            </ContenedorTop>
            <ContenedorBottom>{formatearMoneda(cantidad)}</ContenedorBottom>
            {tieneDetalle && (
                <ContenedorDetalle>
                    <span>{detalleTitulo}</span>
                    <strong aria-label={detalleTitulo}>{formatearMoneda(detalleCantidad)}</strong>
                </ContenedorDetalle>
            )}
            {mostrarAyuda && (
                <ModalGenerico isOpen={ayudaAbierta} onClose={() => setAyudaAbierta(false)}>
                    <AyudaContenido>
                        <ModalEncabezado
                            icon={<FaQuestion />}
                            title="Cómo leer tu balance"
                            description="Una guía rápida de los números de esta tarjeta."
                        />
                        <p><strong>Balance</strong> es la suma de tus activos menos tus pasivos. Las cuentas de crédito aparecen como deuda, por eso reducen este total.</p>
                        <p><strong>Líquido real</strong> estima el dinero disponible en cuentas líquidas, considerando el saldo revolvente de tus tarjetas.</p>
                        <p>El número grande es el total principal. La línea inferior muestra el desglose complementario de la tarjeta.</p>
                    </AyudaContenido>
                </ModalGenerico>
            )}
        </ContenedorResumenCuenta>
    )
}
