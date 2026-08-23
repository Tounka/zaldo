import styled from "styled-components"
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { obtenerEsLiquida } from "../../funciones/utils/cuentas";
import { useFormatoMoneda } from "../../funciones/utils/moneda";

const ContenedorCardCuenta = styled.div`
    width: 100%;
    max-width: none;
    min-width: 0;
    justify-self: stretch;
    height: 42px;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    overflow: hidden;
    gap: 10px;
    border-radius: 4px;
`;

const ContenedorIzquierdo = styled.button`
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 100%;
    border: 0;
    appearance: none;
    background: ${({ $esPasivo, $esLiquida }) => $esPasivo
        ? ($esLiquida ? "linear-gradient(100deg, var(--colorRojo), #8d1924)" : "linear-gradient(100deg, #a32632, #741520)")
        : ($esLiquida ? "linear-gradient(100deg, var(--colorPrincipal), #392663)" : "linear-gradient(100deg, #60468f, #2b1f4c)")};
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
    align-items: center;
    gap: 2px;
    min-width: 0;
    line-height: 1;
    padding-left: 25px;
    background: ${({ $esPasivo, $esLiquida }) => $esPasivo
        ? ($esLiquida ? "var(--colorRojo)" : "#8f1d29")
        : ($esLiquida ? "var(--colorPrincipal)" : "#4b3479")};
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
    font-weight: 600;
    line-height: 1.1;
    white-space: nowrap;
`;

const PorcentajeCuenta = styled.span`
    display: inline-flex;
    align-items: center;
    align-self: center;
    height: 100%;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.02em;
    opacity: 0.9;
    line-height: 1;
    margin-left: 3px;
    white-space: nowrap;
`;

export const CardCuenta = ({ cuenta, porcentaje, esPasivo = false, esLiquida }) => {
  const { setCuentaSeleccionada } = useAppStore()
  const { setIsOpenModificarMontoCuenta, setIsOpenModificarTarjeta } =
    useModalStore()
  const formatearMoneda = useFormatoMoneda()

  const obtenerSaldoTotal = () =>
    (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0)

  const saldoTotal = obtenerSaldoTotal()
  const cuentaEsLiquida = esLiquida ?? obtenerEsLiquida(cuenta);

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
        $esLiquida={cuentaEsLiquida}
        onClick={handleClickBtnIzquierdo}
        aria-label={`Editar información de ${cuenta?.nombre || "la cuenta"}`}
      >
        <NombreCuenta className="nombre-cuenta">{cuenta?.nombre || "Sin nombre"}</NombreCuenta>
        {cuenta?.fechaDeCorte && <FechaCorte>({cuenta.fechaDeCorte})</FechaCorte>}
      </ContenedorIzquierdo>

      <ContenedorDerecho
        type="button"
        $esPasivo={esPasivo}
        $esLiquida={cuentaEsLiquida}
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
