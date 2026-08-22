import styled from "styled-components"
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";

const ContenedorCardCuenta = styled.div`
    width: 100%;
    max-width: 600px;
    height: 42px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    overflow: hidden;
    gap: 10px;
    border-radius: 4px;
`;

const ContenedorIzquierdo = styled.button`
    width: 100%;
    height: 100%;
    border: 0;
    background: ${({ $esPasivo }) => $esPasivo
        ? "linear-gradient(100deg, var(--colorRojo), #8d1924)"
        : "linear-gradient(100deg, var(--colorPrincipal), #392663)"};
    font: inherit;
    color: var(--colorBlanco);
    display: flex;
    align-items: center;
    padding: 0 10px;
    text-align: left;
    cursor: pointer;
    transition: filter 0.2s ease;
    border-radius: 4px;

    &:hover {
        filter: brightness(1.08);

        .nombre-cuenta {
            margin-left: 12px;
        }
    }

    &:focus-visible {
        outline: 2px solid var(--colorBlanco);
        outline-offset: -2px;
    }
`;

const ContenedorDerecho = styled(ContenedorIzquierdo)`
    position: relative;
    justify-content: center;
    gap: 2px;
    padding-left: 25px;
    background: ${({ $esPasivo }) => $esPasivo ? "var(--colorRojo)" : "var(--colorPrincipal)"};
    clip-path: polygon(0 0, 15px 50%, 0 100%, 100% 100%, 100% 0);
`;

const NombreCuenta = styled.span`
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: clamp(12px, 1.6vw, 15px);
    font-weight: 700;
    line-height: 1.2;
    transition: margin-left 0.2s ease;
`;

const FechaCorte = styled.span`
    margin-left: 4px;
    font-size: 10px;
    font-weight: 500;
    opacity: 0.9;
`;

const MontoCuenta = styled.span`
    font-size: clamp(13px, 1.7vw, 16px);
    font-weight: 800;
    line-height: 1.1;
    white-space: nowrap;
`;

const PorcentajeCuenta = styled.span`
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.02em;
    opacity: 0.9;
    white-space: nowrap;
`;

const formatearMoneda = (valor) => new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(valor) || 0);

export const CardCuenta = ({ cuenta, porcentaje, esPasivo = false }) => {
  const { setCuentaSeleccionada } = useAppStore()
  const { setIsOpenModificarMontoCuenta, setIsOpenModificarTarjeta } =
    useModalStore()

  const obtenerSaldoTotal = () =>
    (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0)

  const saldoTotal = obtenerSaldoTotal()

  const handleClickBtnIzquierdo = () => {
    setCuentaSeleccionada(cuenta)
    setIsOpenModificarTarjeta(true)
  }

  const handleClickBtnDerecho = () => {
    setCuentaSeleccionada(cuenta)
    setIsOpenModificarMontoCuenta(true)
  }

  return (
    <ContenedorCardCuenta>
      <ContenedorIzquierdo
        type="button"
        $esPasivo={esPasivo}
        onClick={handleClickBtnIzquierdo}
        aria-label={`Editar información de ${cuenta?.nombre || "la cuenta"}`}
      >
        <NombreCuenta className="nombre-cuenta">{cuenta?.nombre || "Sin nombre"}</NombreCuenta>
        {cuenta?.fechaDeCorte && <FechaCorte>({cuenta.fechaDeCorte})</FechaCorte>}
      </ContenedorIzquierdo>

      <ContenedorDerecho
        type="button"
        $esPasivo={esPasivo}
        onClick={handleClickBtnDerecho}
        aria-label={`Modificar saldo de ${cuenta?.nombre || "la cuenta"}`}
      >
        <MontoCuenta>{formatearMoneda(Math.abs(saldoTotal))}</MontoCuenta>
        {porcentaje !== undefined && (
          <PorcentajeCuenta>{porcentaje.toFixed(1)}%</PorcentajeCuenta>
        )}
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
     background-color: ${({ enPositivo }) => enPositivo ? "var(--colorPrincipal)" : "var(--colorRojo)"} ;
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
    saldoALaFecha: ((cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0)),
    id: cuenta?.id || "",
  };


  // Formatear saldo
  const saldoFormateado = data.saldoALaFecha.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });


  return (
    <ContenedorCardCuentaBtn enPositivo={data.saldoALaFecha >= 0} onClick={() => handleClick()} >
      <p>{data.nombre}</p>
      <span>{saldoFormateado}</span>
    </ContenedorCardCuentaBtn>
  );
};
