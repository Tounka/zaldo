import styled from "styled-components"
import { useContextoGeneral } from "../../contextos/general";
import { useContextoModales } from "../../contextos/modales";

const ContenedorCardCuenta = styled.div`
    width: 100%;
    max-width: 600px;
    height: 50px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    overflow: hidden;
    gap: 15px;

    
`;

const ContenedorIzquierdo = styled.div`
    width: 100%;
    height: 100%;
    background-color: var(--colorMorado);
    color: var(--colorBlanco);
    display: flex;
    align-items: center;
    font-size: var(--fontLg);
    font-weight: bold;
    line-height: 1;
    padding-left: 10px;

    cursor: pointer;

    p{
        transition: margin-left .2s ease;
    }
    &:hover{
        p{
            transition: margin-left .2s ease;
            margin-left: 20px;
        }
    }

    @media (max-width: 600px) {
        font-size: 18px;
    }
    @media (max-width: 400px) {
        font-size: 14px;
    }

`;

const ContenedorDerecho = styled(ContenedorIzquierdo)`
  position: relative;
  padding-left: 30px;
  clip-path: polygon(0 0, 20px 50%, 0 100%, 100% 100%, 100% 0);
`;
export const CardCuenta = ({ cuenta }) => {
    const { setCuentaSeleccionada } = useContextoGeneral();
    const { setIsOpenModificarMontoCuenta, setIsOpenModificarTarjeta } = useContextoModales();
    let saldoTratado = cuenta?.saldoALaFecha || 0;



    const data = {
        nombre: cuenta?.nombre || "",
        saldoALaFecha: cuenta?.saldoALaFecha || 0,
        id: cuenta?.id || "",
    }

    const handleClickBtnIzquierdo = () => {
        setCuentaSeleccionada(cuenta);
        setIsOpenModificarTarjeta(true)
    }
    const handleClickBtnDerecho = () => {
        setCuentaSeleccionada(cuenta);
        setIsOpenModificarMontoCuenta(true)
    }
    return (
        <ContenedorCardCuenta>
            <ContenedorIzquierdo onClick={() => handleClickBtnIzquierdo()}>
                <p>
                    {data.nombre}
                </p>
            </ContenedorIzquierdo>
            <ContenedorDerecho onClick={() => handleClickBtnDerecho()}>
                ${saldoTratado}
            </ContenedorDerecho>

        </ContenedorCardCuenta>
    )
}


const ContenedorCardCuentaBtn = styled.button`
    width: 180px; 
    aspect-ratio: 85.6 / 53.98; 
    border: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: var(--colorMorado);
    border-radius: 20px;
    color: white;
    padding: 1rem;
    cursor: pointer;
    transition: transform 0.2s ease;

    @media (max-width: 500px) {
        width: 100%;
        height: 60px;
        flex-direction: row;
        justify-content: space-between;

    }
    &:hover {
        transform: scale(1.03);
    }

    p {
        margin: 0;
        font-size: 1.1rem;
        font-weight: bold;
    }

    span {
        margin-top: 0.5rem;
        font-size: 1rem;
    }
`;

// Componente
export const CardCuentaBtn = ({ cuenta, handleClick }) => {
    const data = {
        nombre: cuenta?.nombre || "Sin nombre",
        saldoALaFecha: cuenta?.saldoALaFecha ?? 0,
        id: cuenta?.id || "",
    };

    // Formatear saldo
    const saldoFormateado = data.saldoALaFecha.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
    });

    return (
        <ContenedorCardCuentaBtn onClick={() => handleClick()} >
            <p>{data.nombre}</p>
            <span>{saldoFormateado}</span>
        </ContenedorCardCuentaBtn>
    );
};