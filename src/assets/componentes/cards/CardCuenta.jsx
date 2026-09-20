import styled from "styled-components";
import { useRef, useState, useCallback, useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { obtenerEsLiquida } from "../../funciones/utils/cuentas";
import { useFormatoMoneda } from "../../funciones/utils/moneda";
import { obtenerEstadoPagoTarjeta } from "../../funciones/utils/tarjetasCredito";
import { FaListUl, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { renderizarMarkdownConListas } from "../../funciones/utils/markdown";
import { useEnlaceCuentasStore } from "../../stores/useEnlaceCuentasStore";

const ContenedorCardCuentaWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ContenedorNotasHome = styled.div`
  width: 100%;
  box-sizing: border-box;
  background: rgba(83, 59, 143, 0.04);
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-left: 3px solid var(--colorMorado, #7655a8);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  animation: fadeInNotas 0.18s ease-out;

  @keyframes fadeInNotas {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &:hover {
    background: rgba(83, 59, 143, 0.08);
    border-color: rgba(83, 59, 143, 0.22);
  }
`;

const HeaderNotasHome = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  color: var(--colorMorado, #7655a8);
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;

  svg {
    font-size: 10px;
  }
`;

const BotonToggleNotas = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  border: 1px solid
    ${({ $activo }) =>
      $activo ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.2)"};
  background: ${({ $activo }) =>
    $activo ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.2)"};
  color: var(--colorBlanco, #ffffff);
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 3;

  .texto-btn-notas {
    font-size: 9px;
    letter-spacing: 0.02em;
    @media (max-width: 480px) {
      display: none;
    }
  }

  &:hover {
    background: ${({ $activo }) =>
      $activo ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.25)"};
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.03);
  }

  &:focus-visible {
    outline: 2px solid var(--colorBlanco);
    outline-offset: 1px;
  }
`;

const BotonOcultarNotas = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--colorMorado, #7655a8);
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.12);
    color: #4b3479;
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado, #7655a8);
  }
`;

/* Vibración sutil de la cuenta ya elegida, para que se note sin marear. */
const vibracionEnlace = `
  @keyframes vibrarEnlaceCuenta {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-0.7px); }
  }
`;

const ContenedorCardCuenta = styled.div`
  width: 100%;
  max-width: none;
  min-width: 0;
  justify-self: stretch;
  height: 42px;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  overflow: visible;
  gap: 10px;
  border-radius: 4px;
  position: relative;
  user-select: none;

  ${vibracionEnlace}
`;

/*
 * Marco dorado del enlace entre cuentas, sólo sobre el lado del monto: el
 * candidato late suavemente y la cuenta ya elegida se queda fija (se distingue
 * porque vibra), siempre en el mismo dorado.
 */
const IndicadorEnlaceCuenta = styled.div`
  position: absolute;
  inset: 0;
  border: 2px solid #f1c40f;
  border-radius: 4px;
  /* Mismo recorte que el lado del monto: el borde abraza la punta de flecha. */
  clip-path: polygon(0 0, 15px 50%, 0 100%, 100% 100%, 100% 0);
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 0 10px rgba(241, 196, 15, 0.6);
  animation: ${({ $rol }) =>
    $rol === "origen"
      ? "none"
      : "chargeGlowCard 1.1s ease-in-out infinite alternate"};

  @keyframes chargeGlowCard {
    0% {
      box-shadow: 0 0 5px rgba(241, 196, 15, 0.4);
      border-color: rgba(241, 196, 15, 0.55);
    }
    100% {
      box-shadow: 0 0 14px rgba(241, 196, 15, 0.85);
      border-color: #f1c40f;
    }
  }
`;


const ContenedorIzquierdo = styled.div`
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
  animation: ${({ $vibrando }) =>
    $vibrando
      ? "vibrarEnlaceCuenta 0.9s ease-in-out infinite"
      : "none"};
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
  /* Al vibrar no se fija transform: lo controlan los keyframes. */
  ${({ $vibrando }) => ($vibrando ? "" : "transform: none;")}
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
    abrirMovimientoEntreCuentas,
  } = useModalStore();
  const formatearMoneda = useFormatoMoneda();

  const armado = useEnlaceCuentasStore((estado) => estado.armado);
  const cuentaOrigenEnlace = useEnlaceCuentasStore((estado) => estado.cuentaOrigen);
  const armarEnlace = useEnlaceCuentasStore((estado) => estado.armar);
  const desarmarEnlace = useEnlaceCuentasStore((estado) => estado.desarmar);
  const seleccionarOrigenEnlace = useEnlaceCuentasStore((estado) => estado.seleccionarOrigen);
  const setCuentaHoverEnlace = useEnlaceCuentasStore((estado) => estado.setCuentaHover);
  const cancelarEnlace = useEnlaceCuentasStore((estado) => estado.cancelar);
  const registrarRect = useEnlaceCuentasStore((estado) => estado.registrarRect);
  const olvidarRect = useEnlaceCuentasStore((estado) => estado.olvidarRect);

  const [mostrarNotas, setMostrarNotas] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  // Hover sobre el lado del monto: es el único que participa en el enlace.
  const [hoverMonto, setHoverMonto] = useState(false);
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const contenedorRef = useRef(null);

  const tieneNotas = Boolean(
    cuenta?.beneficiosMarkdown && cuenta.beneficiosMarkdown.trim().length > 0
  );

  const esOrigenDelEnlace = Boolean(
    cuentaOrigenEnlace && cuentaOrigenEnlace.id === cuenta?.id
  );

  /*
   * El enlace se arma sólo sobre el lado del monto y sólo mientras el puntero
   * sigue ahí: con Shift presionado (paso 1) o mientras el enlace espera
   * destino (paso 2). La cuenta ya fijada como origen se marca siempre, sin
   * depender del hover, para no perderla de vista al mover el ratón.
   */
  const enlaceEnCurso = Boolean(cuentaOrigenEnlace);
  const cardArmada =
    hoverMonto && (armado || enlaceEnCurso) && !esOrigenDelEnlace;
  const cardResaltada = cardArmada || esOrigenDelEnlace;

  // Publicar la posición de la card para que el lienzo dibuje la flecha encima.
  useEffect(() => {
    const id = cuenta?.id;
    if (!id || !cardResaltada) return undefined;

    const publicar = () => {
      const nodo = contenedorRef.current;
      if (!nodo) return;
      const rect = nodo.getBoundingClientRect();
      registrarRect(id, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    publicar();
    window.addEventListener("scroll", publicar, true);
    window.addEventListener("resize", publicar);

    return () => {
      window.removeEventListener("scroll", publicar, true);
      window.removeEventListener("resize", publicar);
      olvidarRect(id);
    };
  }, [cardResaltada, cuenta?.id, olvidarRect, registrarRect]);

  // Shift arma el enlace mientras el puntero está sobre el lado del monto.
  useEffect(() => {
    if (!hoverMonto) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Meta") {
        armarEnlace();
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Meta") {
        desarmarEnlace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [armarEnlace, desarmarEnlace, hoverMonto]);

  // Escape aborta un enlace a medias sin tocar nada más.
  useEffect(() => {
    if (!enlaceEnCurso) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") cancelarEnlace();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelarEnlace, enlaceEnCurso]);

  const obtenerSaldoTotal = () =>
    (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0);

  const saldoTotal = obtenerSaldoTotal();
  const cuentaEsLiquida = esLiquida ?? obtenerEsLiquida(cuenta);
  const estadoPago =
    cuenta?.tipoDeCuenta === "credito" ? obtenerEstadoPagoTarjeta(cuenta) : null;

  /*
   * Un paso del enlace visual. El primer clic fija el origen y deja la flecha
   * siguiendo al puntero; el segundo cierra el enlace y abre el modal de
   * movimiento entre cuentas ya con ambas cuentas puestas (paso 2).
   */
  const avanzarEnlace = useCallback(() => {
    if (!cuenta) return;

    if (!cuentaOrigenEnlace) {
      seleccionarOrigenEnlace(cuenta);
      return;
    }

    // Volver a tocar el origen cancela la selección.
    if (cuentaOrigenEnlace.id === cuenta.id) {
      cancelarEnlace();
      return;
    }

    const origen = cuentaOrigenEnlace;
    cancelarEnlace();
    abrirMovimientoEntreCuentas({ cuentaOrigen: origen, cuentaDestino: cuenta });
  }, [
    abrirMovimientoEntreCuentas,
    cancelarEnlace,
    cuenta,
    cuentaOrigenEnlace,
    seleccionarOrigenEnlace,
  ]);

  // En móvil: mantener presionado arma el enlace con resaltado.
  const iniciarLongPressMobile = useCallback((e) => {
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
      avanzarEnlace();
    }, 450);
  }, [avanzarEnlace]);

  const cancelarLongPressMobile = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  /*
   * El lado del monto es el que arma el enlace: al entrar con Shift se marca y
   * previsualiza la flecha, y al salir se desarma.
   */
  const handleMouseEnterMonto = (e) => {
    setHoverMonto(true);
    if (e?.shiftKey || e?.ctrlKey || e?.metaKey) {
      armarEnlace();
    }
    // Previsualizar la flecha hacia esta cuenta mientras se elige destino.
    if (cuentaOrigenEnlace && cuentaOrigenEnlace.id !== cuenta?.id) {
      setCuentaHoverEnlace(cuenta);
    }
  };

  const handlePointerMoveMonto = useCallback((e) => {
    if (e?.pointerType === "mouse") {
      if (e?.shiftKey || e?.ctrlKey || e?.metaKey) {
        armarEnlace();
      } else if (armado) {
        desarmarEnlace();
      }
      return;
    }

    // Cancelar si el usuario desliza el dedo en móvil (scroll)
    const dx = Math.abs((e?.clientX ?? 0) - startPosRef.current.x);
    const dy = Math.abs((e?.clientY ?? 0) - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelarLongPressMobile();
    }
  }, [armado, armarEnlace, cancelarLongPressMobile, desarmarEnlace]);

  const handlePointerLeaveMonto = () => {
    setHoverMonto(false);
    desarmarEnlace();
    cancelarLongPressMobile();
  };

  const handleClickBtnIzquierdo = (e) => {
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
    // El lado del monto participa igual en el enlace visual.
    if (e?.ctrlKey || e?.metaKey || e?.shiftKey || armado || enlaceEnCurso) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      avanzarEnlace();
      return;
    }

    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCuentaSeleccionada(cuenta);
    setIsOpenModificarMontoCuenta(true);
  };

  const mostrarResaltado = isPressing || cardResaltada;
  const textoTituloTooltip = esOrigenDelEnlace
    ? "Cuenta de salida · toca otra cuenta para enviarle dinero"
    : enlaceEnCurso
      ? `Enviar dinero a ${cuenta?.nombre || "esta cuenta"}`
      : cardArmada
        ? "Shift + Clic: elegir esta cuenta como salida"
        : `Editar información de ${cuenta?.nombre || "la cuenta"}`;

  return (
    <ContenedorCardCuentaWrapper>
      <ContenedorCardCuenta ref={contenedorRef}>
        <ContenedorIzquierdo
          role="button"
          tabIndex={0}
          $esPasivo={esPasivo}
          $esLiquida={cuentaEsLiquida}
          onClick={handleClickBtnIzquierdo}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClickBtnIzquierdo(e);
            }
          }}
          aria-label={`Editar información de ${cuenta?.nombre || "la cuenta"}`}
          title={`Editar información de ${cuenta?.nombre || "la cuenta"}`}
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

          {tieneNotas && (
            <BotonToggleNotas
              type="button"
              $activo={mostrarNotas}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMostrarNotas((prev) => !prev);
              }}
              title={
                mostrarNotas
                  ? "Ocultar notas de la cuenta"
                  : "Ver notas de la cuenta"
              }
              aria-label={
                mostrarNotas
                  ? "Ocultar notas de la cuenta"
                  : "Ver notas de la cuenta"
              }
              aria-expanded={mostrarNotas}
            >
              <FaListUl aria-hidden="true" />
              <span className="texto-btn-notas">Notas</span>
              {mostrarNotas ? (
                <FaChevronUp size={7} aria-hidden="true" />
              ) : (
                <FaChevronDown size={7} aria-hidden="true" />
              )}
            </BotonToggleNotas>
          )}
        </ContenedorIzquierdo>

        <ContenedorDerecho
          role="button"
          tabIndex={0}
          $esPasivo={esPasivo}
          $esLiquida={cuentaEsLiquida}
          $estadoPago={estadoPago}
          $vibrando={esOrigenDelEnlace}
          $isPressing={isPressing}
          onPointerDown={iniciarLongPressMobile}
          onPointerMove={handlePointerMoveMonto}
          onPointerUp={cancelarLongPressMobile}
          onPointerCancel={cancelarLongPressMobile}
          onMouseEnter={handleMouseEnterMonto}
          onPointerLeave={handlePointerLeaveMonto}
          onClick={handleClickBtnDerecho}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClickBtnDerecho(e);
            }
          }}
          aria-label={`Modificar saldo de ${cuenta?.nombre || "la cuenta"}`}
          title={cardResaltada ? textoTituloTooltip : estadoPago?.etiqueta}
        >
          {mostrarResaltado && (
            <IndicadorEnlaceCuenta $rol={esOrigenDelEnlace ? "origen" : "destino"} />
          )}
          <MontoCuenta>{formatearMoneda(Math.abs(saldoTotal))}</MontoCuenta>
        </ContenedorDerecho>
      </ContenedorCardCuenta>

      {tieneNotas && mostrarNotas && (
        <ContenedorNotasHome
          onClick={() => {
            setCuentaSeleccionada(cuenta);
            setIsOpenModificarTarjeta(true);
          }}
          title="Toca para ver o editar las notas de esta cuenta"
        >
          <HeaderNotasHome>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <FaListUl />{" "}
              {cuenta?.tipoDeCuenta === "credito"
                ? "Beneficios y Notas"
                : "Notas de la cuenta"}
            </div>
            <BotonOcultarNotas
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMostrarNotas(false);
              }}
              title="Ocultar notas"
              aria-label="Ocultar notas"
            >
              <FaChevronUp size={8} /> Ocultar
            </BotonOcultarNotas>
          </HeaderNotasHome>
          {renderizarMarkdownConListas(cuenta.beneficiosMarkdown, {
            fontSize: "11px",
            color: "#4a3c60",
            colorFuerte: "#241838",
            colorEm: "#705096",
          })}
        </ContenedorNotasHome>
      )}
    </ContenedorCardCuentaWrapper>
  );
};
