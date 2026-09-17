import styled from "styled-components";
import { useRef, useState, useCallback, useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { obtenerEsLiquida } from "../../funciones/utils/cuentas";
import { useFormatoMoneda } from "../../funciones/utils/moneda";
import { obtenerEstadoPagoTarjeta } from "../../funciones/utils/tarjetasCredito";

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
`;

const IndicadorCargaHold = styled.div`
  position: absolute;
  inset: 0;
  border: 2px solid #f1c40f;
  border-radius: 4px;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 0 12px rgba(241, 196, 15, 0.7);
  animation: chargeGlowCard 0.4s ease-in-out infinite alternate;

  @keyframes chargeGlowCard {
    0% {
      box-shadow: 0 0 4px rgba(241, 196, 15, 0.4);
      border-color: rgba(241, 196, 15, 0.4);
    }
    100% {
      box-shadow: 0 0 16px rgba(241, 196, 15, 0.9);
      border-color: #f1c40f;
    }
  }
`;

const ContenedorIzquierdo = styled.button`
  position: relative;
  overflow: hidden;
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
  transition: filter 0.2s ease, transform 0.15s ease;
  border-radius: 4px;
  transform: ${({ $isPressing }) => ($isPressing ? "scale(0.985)" : "none")};

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
  transform: none;
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
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FechaCorte = styled.span`
  margin-left: 4px;
  font-size: 11px;
  font-weight: 500;
  opacity: 0.8;
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
  const [isHovered, setIsHovered] = useState(false);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Detectar tecla Shift en computadora mientras el mouse está sobre la card de la izquierda
  useEffect(() => {
    if (!isHovered) {
      setIsShiftActive(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Shift") {
        setIsShiftActive(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === "Shift") {
        setIsShiftActive(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isHovered]);

  const obtenerSaldoTotal = () =>
    (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0);

  const saldoTotal = obtenerSaldoTotal();
  const cuentaEsLiquida = esLiquida ?? obtenerEsLiquida(cuenta);
  const estadoPago =
    cuenta?.tipoDeCuenta === "credito" ? obtenerEstadoPagoTarjeta(cuenta) : null;

  // En móvil: mantener presionado activa el enlace con resaltado en la card izquierda
  const iniciarLongPressMobile = useCallback((e) => {
    // Si la interacción proviene de un mouse (computadora), ignorar el hold (se usa Shift + Clic)
    if (e?.pointerType === "mouse") {
      return;
    }

    isLongPressRef.current = false;
    startPosRef.current = { x: e?.clientX ?? 0, y: e?.clientY ?? 0 };
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
        // Ignorar si no está disponible
      }
      abrirForjadorMovimiento({ cuentaOrigen: cuenta });
    }, 450);
  }, [abrirForjadorMovimiento, cuenta]);

  const cancelarLongPressMobile = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const handlePointerMoveIzquierdo = useCallback((e) => {
    if (e?.pointerType === "mouse") {
      if (e?.shiftKey !== isShiftActive) {
        setIsShiftActive(Boolean(e?.shiftKey));
      }
      return;
    }

    // Cancelar si el usuario desliza el dedo en móvil (scroll)
    const dx = Math.abs((e?.clientX ?? 0) - startPosRef.current.x);
    const dy = Math.abs((e?.clientY ?? 0) - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelarLongPressMobile();
    }
  }, [cancelarLongPressMobile, isShiftActive]);

  const handleMouseEnterIzquierdo = (e) => {
    setIsHovered(true);
    if (e?.shiftKey) {
      setIsShiftActive(true);
    }
  };

  const handlePointerLeaveIzquierdo = () => {
    setIsHovered(false);
    setIsShiftActive(false);
    cancelarLongPressMobile();
  };

  const handleClickBtnIzquierdo = (e) => {
    // En computadora: Shift + Clic enlaza directamente la cuenta
    if (e?.shiftKey || isShiftActive) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      abrirForjadorMovimiento({ cuentaOrigen: cuenta });
      return;
    }

    // En móvil: si se activó por mantener presionado, evitar disparar el clic regular
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }

    setCuentaSeleccionada(cuenta);
    setIsOpenModificarTarjeta(true);
  };

  const handleClickBtnDerecho = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCuentaSeleccionada(cuenta);
    setIsOpenModificarMontoCuenta(true);
  };

  const mostrarResaltado = isPressing || isShiftActive;

  return (
    <ContenedorCardCuenta>
      <ContenedorIzquierdo
        type="button"
        $esPasivo={esPasivo}
        $esLiquida={cuentaEsLiquida}
        $isPressing={isPressing}
        onPointerDown={iniciarLongPressMobile}
        onPointerMove={handlePointerMoveIzquierdo}
        onPointerUp={cancelarLongPressMobile}
        onPointerLeave={handlePointerLeaveIzquierdo}
        onPointerCancel={cancelarLongPressMobile}
        onMouseEnter={handleMouseEnterIzquierdo}
        onClick={handleClickBtnIzquierdo}
        aria-label={`Editar información de ${cuenta?.nombre || "la cuenta"}`}
        title={
          isShiftActive
            ? "Shift + Clic: Enlazar cuenta"
            : `Editar información de ${cuenta?.nombre || "la cuenta"}`
        }
      >
        {mostrarResaltado && <IndicadorCargaHold />}

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
        aria-label={`Modificar saldo de ${cuenta?.nombre || "la cuenta"}`}
        title={estadoPago?.etiqueta}
      >
        <MontoCuenta>{formatearMoneda(Math.abs(saldoTotal))}</MontoCuenta>
      </ContenedorDerecho>
    </ContenedorCardCuenta>
  );
};
