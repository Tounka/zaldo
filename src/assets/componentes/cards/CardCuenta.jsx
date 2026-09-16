import styled, { keyframes } from "styled-components";
import { useRef, useState, useCallback } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { obtenerEsLiquida } from "../../funciones/utils/cuentas";
import { useFormatoMoneda } from "../../funciones/utils/moneda";
import { obtenerEstadoPagoTarjeta } from "../../funciones/utils/tarjetasCredito";

const chargeGlow = keyframes`
  0% { box-shadow: 0 0 4px rgba(241, 196, 15, 0.4); border-color: rgba(241, 196, 15, 0.4); }
  100% { box-shadow: 0 0 16px rgba(241, 196, 15, 0.9); border-color: #f1c40f; }
`;

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
  position: relative;
  user-select: none;
  transition: transform 0.15s ease;

  ${({ $isPressing }) =>
    $isPressing &&
    `
    transform: scale(0.985);
  `}
`;

const IndicadorCargaHold = styled.div`
  position: absolute;
  inset: 0;
  border: 2px solid #f1c40f;
  border-radius: 4px;
  pointer-events: none;
  z-index: 5;
  animation: ${chargeGlow} 0.4s ease-in-out infinite alternate;
`;

const ContenedorIzquierdo = styled.button`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 100%;
  border: 0;
  appearance: none;
  background: ${({ $esPasivo, $esLiquida }) =>
    $esPasivo
      ? $esLiquida
        ? "var(--colorRojo)"
        : "#8d1924"
      : $esLiquida
      ? "var(--colorPrincipal)"
      : "#392663"};
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
  background: ${({ $esPasivo, $esLiquida }) =>
    $esPasivo
      ? $esLiquida
        ? "var(--colorRojo)"
        : "#8f1d29"
      : $esLiquida
      ? "var(--colorPrincipal)"
      : "#4b3479"};
  box-shadow: inset -6px 0 0 ${({ $estadoPago }) => $estadoPago?.color || "transparent"};
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

export const CardCuenta = ({ cuenta, esPasivo = false, esLiquida }) => {
  const { setCuentaSeleccionada } = useAppStore();
  const {
    setIsOpenModificarMontoCuenta,
    setIsOpenModificarTarjeta,
    abrirForjadorMovimiento,
  } = useModalStore();
  const formatearMoneda = useFormatoMoneda();

  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const obtenerSaldoTotal = () =>
    (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0);

  const saldoTotal = obtenerSaldoTotal();
  const cuentaEsLiquida = esLiquida ?? obtenerEsLiquida(cuenta);
  const estadoPago =
    cuenta?.tipoDeCuenta === "credito" ? obtenerEstadoPagoTarjeta(cuenta) : null;

  const iniciarLongPress = useCallback(() => {
    isLongPressRef.current = false;
    setIsPressing(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPressing(false);
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(45);
        }
      } catch {
        // Ignorar si la API no está disponible
      }
      abrirForjadorMovimiento({ cuentaOrigen: cuenta });
    }, 420);
  }, [abrirForjadorMovimiento, cuenta]);

  const cancelarLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const handleClickBtnIzquierdo = (e) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e?.preventDefault?.();
      return;
    }
    setCuentaSeleccionada(cuenta);
    setIsOpenModificarTarjeta(true);
  };

  const handleClickBtnDerecho = (e) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e?.preventDefault?.();
      return;
    }
    setCuentaSeleccionada(cuenta);
    setIsOpenModificarMontoCuenta(true);
  };

  return (
    <ContenedorCardCuenta
      $isPressing={isPressing}
      onPointerDown={iniciarLongPress}
      onPointerUp={cancelarLongPress}
      onPointerLeave={cancelarLongPress}
      onPointerCancel={cancelarLongPress}
    >
      {isPressing && <IndicadorCargaHold />}

      <ContenedorIzquierdo
        type="button"
        $esPasivo={esPasivo}
        $esLiquida={cuentaEsLiquida}
        onClick={handleClickBtnIzquierdo}
        aria-label={`Editar información de ${cuenta?.nombre || "la cuenta"}. Mantén presionado para enlazar.`}
      >
        <NombreCuenta className="nombre-cuenta">
          {cuenta?.nombre || "Sin nombre"}
        </NombreCuenta>
        {(cuenta?.fechaDeCorte || cuenta?.fechaLimiteDePago) && (
          <FechaCorte>
            ({cuenta?.tipoDeCuenta === "credito"
              ? `${cuenta?.fechaDeCorte || "—"} · ${cuenta?.fechaLimiteDePago || "—"}`
              : cuenta?.fechaDeCorte})
          </FechaCorte>
        )}
      </ContenedorIzquierdo>

      <ContenedorDerecho
        type="button"
        $esPasivo={esPasivo}
        $esLiquida={cuentaEsLiquida}
        $estadoPago={estadoPago}
        onClick={handleClickBtnDerecho}
        aria-label={`Modificar saldo de ${cuenta?.nombre || "la cuenta"}. Mantén presionado para enlazar.`}
        title={estadoPago?.etiqueta}
      >
        <MontoCuenta>{formatearMoneda(Math.abs(saldoTotal))}</MontoCuenta>
      </ContenedorDerecho>
    </ContenedorCardCuenta>
  );
};
