import styled from "styled-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEnlaceCuentasStore } from "../../stores/useEnlaceCuentasStore";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { markdownATextoPlano } from "../../funciones/utils/markdown";
import { TarjetaVisual } from "./TarjetaVisual";

export const Donut = ({ porcentaje, fondo, cuentaId }) => {
    const radio = 30;
    const circunferencia = 2 * Math.PI * radio;
    const progreso = (porcentaje / 100) * circunferencia;
    const idBase = String(cuentaId || "cuenta").replace(/[^a-zA-Z0-9_-]/g, "-");
    const clipId = `donut-background-${idBase}`;

    return (
        <svg
            height="90%"
            style={{ width: "auto" }}
            viewBox="0 0 80 80"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <clipPath id={clipId}>
                    <circle cx="40" cy="40" r={radio} />
                </clipPath>
            </defs>
            <image
                href={fondo}
                x="10"
                y="10"
                width="60"
                height="60"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
            />
            <circle
                cx="40"
                cy="40"
                r={radio}
                fill="rgba(16, 9, 35, 0.36)"
                stroke="rgba(255,255,255,0.24)"
                strokeWidth="8"
            />
            <circle
                cx="40"
                cy="40"
                r={radio}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
                fill="none"
            />
            <circle
                cx="40"
                cy="40"
                r={radio}
                stroke="var(--colorBlanco)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circunferencia}
                strokeDashoffset={circunferencia - progreso}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
            />
            <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
            >
                {`${porcentaje}%`}
            </text>
        </svg>
    );
};



// 🟦 Estilos

const ContenedorCardTarjetaStyled = styled.div`
  position: relative;
  width: clamp(250px, 30dvw, 360px);
  border-radius: 16px;
  cursor: pointer;
  outline: none;
  transition: transform .18s ease, filter .18s ease;

  &:hover { transform: translateY(-4px) rotate(-0.4deg); filter: drop-shadow(0 14px 18px rgba(27, 14, 48, .22)); }
  &:focus-visible { box-shadow: 0 0 0 3px rgba(83, 59, 143, .45); }

  @media (max-width: 800px) {
      width: min(43dvw, 360px);
  }
  @media (max-width: 500px) {
      width: 100%;
  }
`;

/* Marco dorado del enlace entre cuentas (mismo criterio que la card del home). */
const IndicadorEnlaceTarjeta = styled.div`
    position: absolute;
    inset: 0;
    border: 2px solid #f1c40f;
    border-radius: 16px;
    pointer-events: none;
    z-index: 5;
    box-shadow: 0 0 10px rgba(241, 196, 15, 0.6), inset 0 0 14px rgba(241, 196, 15, 0.25);
    animation: ${({ $rol }) => ($rol === "origen" ? "none" : "brilloEnlaceTarjeta 1.1s ease-in-out infinite alternate")};

    @keyframes brilloEnlaceTarjeta {
        0% { box-shadow: 0 0 5px rgba(241, 196, 15, 0.4); border-color: rgba(241, 196, 15, 0.55); }
        100% { box-shadow: 0 0 14px rgba(241, 196, 15, 0.85); border-color: #f1c40f; }
    }
`
/*
 * Lo que la tarjeta muestra según su tipo. Lo comparten la tarjeta de la
 * cuadrícula y la del visor de /cuentas.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const resumenTarjeta = (cuenta) => {
  const saldoNormal = cuenta?.saldoALaFecha ?? 0
  const saldoMSI = cuenta?.saldoALaFechaMSI ?? 0
  const saldoTotal = saldoNormal + saldoMSI
  const saldoAbsoluto = Math.abs(saldoTotal)

  // En crédito se muestra la deuda en positivo (deuda / límite); en el resto,
  // un saldo negativo debe verse negativo para no parecer un activo.
  let textoLateral = formatearMonedaSegunPreferencia(saldoTotal)
  let textoFechaDeCorte = ""
  let porcentaje = 0

  const tipoDeCuenta = cuenta?.tipoDeCuenta
  const beneficiosCortos = markdownATextoPlano(cuenta?.beneficiosMarkdown)

  // 🔹 CRÉDITO
  if (tipoDeCuenta === "credito") {
    if (cuenta?.limiteDeCredito) {
      textoLateral = `${formatearMonedaSegunPreferencia(saldoAbsoluto)} / ${formatearMonedaSegunPreferencia(cuenta.limiteDeCredito)}`

      porcentaje = Math.min(
        100,
        Math.round((saldoAbsoluto / cuenta.limiteDeCredito) * 100)
      )
    }

    if (cuenta?.fechaDeCorte >= 1) {
      textoFechaDeCorte = `Corte: ${cuenta.fechaDeCorte} · Pago: ${cuenta?.fechaLimiteDePago || "—"}`
    }
  }

  // 🔹 DÉBITO / EFECTIVO
  if (tipoDeCuenta === "debito" || tipoDeCuenta === "efectivo") {
    porcentaje = cuenta?.metaDeAhorro
      ? Math.min(
          100,
          Math.round((saldoAbsoluto / cuenta.metaDeAhorro) * 100)
        )
      : 0
  }

  // 🔹 INVERSIÓN
  if (
    tipoDeCuenta === "inversion" &&
    cuenta?.fechaInicioInversion &&
    cuenta?.fechaFinalInversion
  ) {
    const totalMs =
      cuenta.fechaFinalInversion.toMillis() -
      cuenta.fechaInicioInversion.toMillis()

    const pasadoMs =
      Date.now() - cuenta.fechaInicioInversion.toMillis()

    const porcentajeRaw = (pasadoMs / totalMs) * 100

    porcentaje = Math.min(100, Math.max(0, Math.round(porcentajeRaw)))
  }

  return { saldoTotal, textoLateral, textoFechaDeCorte, porcentaje, tipoDeCuenta, beneficiosCortos }
}

// 🔷 Componente principal
/*
 * `onAbrir(cuenta, rect)`: si llega, el clic abre el visor de /cuentas desde la
 * posición de la tarjeta en vez del modal de edición. `oculta` la deja en su
 * hueco sin pintarla mientras su copia vive en el visor.
 */
export const CardCuentaTarjeta = ({ cuenta, onAbrir, oculta = false }) => {
  const { setCuentaSeleccionada } = useAppStore();
  const { setIsOpenModificarTarjeta, abrirMovimientoEntreCuentas } = useModalStore();

  const armado = useEnlaceCuentasStore((estado) => estado.armado);
  const cuentaOrigenEnlace = useEnlaceCuentasStore((estado) => estado.cuentaOrigen);
  const armarEnlace = useEnlaceCuentasStore((estado) => estado.armar);
  const desarmarEnlace = useEnlaceCuentasStore((estado) => estado.desarmar);
  const seleccionarOrigenEnlace = useEnlaceCuentasStore((estado) => estado.seleccionarOrigen);
  const setCuentaHoverEnlace = useEnlaceCuentasStore((estado) => estado.setCuentaHover);
  const cancelarEnlace = useEnlaceCuentasStore((estado) => estado.cancelar);
  const registrarRect = useEnlaceCuentasStore((estado) => estado.registrarRect);
  const olvidarRect = useEnlaceCuentasStore((estado) => estado.olvidarRect);

  const [hover, setHover] = useState(false);
  const tarjetaRef = useRef(null);
  const temporizadorRef = useRef(null);
  const pulsacionLargaRef = useRef(false);

  // Igual que en el home: Shift arma el enlace y el clic fija origen y destino.
  const esOrigenDelEnlace = Boolean(cuentaOrigenEnlace && cuentaOrigenEnlace.id === cuenta?.id);
  const enlaceEnCurso = Boolean(cuentaOrigenEnlace);
  const tarjetaArmada = hover && (armado || enlaceEnCurso) && !esOrigenDelEnlace;
  const tarjetaResaltada = tarjetaArmada || esOrigenDelEnlace;

  // Publicar la posición para que el lienzo dibuje la flecha encima.
  useEffect(() => {
    const id = cuenta?.id;
    if (!id || !tarjetaResaltada) return undefined;

    const publicar = () => {
      const nodo = tarjetaRef.current;
      if (!nodo) return;
      const rect = nodo.getBoundingClientRect();
      registrarRect(id, { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    };

    publicar();
    window.addEventListener("scroll", publicar, true);
    window.addEventListener("resize", publicar);
    return () => {
      window.removeEventListener("scroll", publicar, true);
      window.removeEventListener("resize", publicar);
      olvidarRect(id);
    };
  }, [cuenta?.id, olvidarRect, registrarRect, tarjetaResaltada]);

  // Shift presionado con el puntero encima arma el enlace.
  useEffect(() => {
    if (!hover) return undefined;
    const esModificador = (e) => e.key === "Shift" || e.key === "Control" || e.key === "Meta";
    const alPresionar = (e) => { if (esModificador(e)) armarEnlace(); };
    const alSoltar = (e) => { if (esModificador(e)) desarmarEnlace(); };
    window.addEventListener("keydown", alPresionar);
    window.addEventListener("keyup", alSoltar);
    return () => {
      window.removeEventListener("keydown", alPresionar);
      window.removeEventListener("keyup", alSoltar);
    };
  }, [armarEnlace, desarmarEnlace, hover]);

  // Escape aborta un enlace a medias.
  useEffect(() => {
    if (!esOrigenDelEnlace) return undefined;
    const alPresionar = (e) => { if (e.key === "Escape") cancelarEnlace(); };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [cancelarEnlace, esOrigenDelEnlace]);

  useEffect(() => () => clearTimeout(temporizadorRef.current), []);

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
  }, [abrirMovimientoEntreCuentas, cancelarEnlace, cuenta, cuentaOrigenEnlace, seleccionarOrigenEnlace]);

  const alEntrar = (event) => {
    setHover(true);
    if (event.shiftKey || event.ctrlKey || event.metaKey) armarEnlace();
    if (cuentaOrigenEnlace && cuentaOrigenEnlace.id !== cuenta?.id) setCuentaHoverEnlace(cuenta);
  };

  const alMover = (event) => {
    if (event.pointerType !== "mouse") return;
    if (event.shiftKey || event.ctrlKey || event.metaKey) armarEnlace();
    else if (armado) desarmarEnlace();
  };

  const alSalir = () => {
    setHover(false);
    desarmarEnlace();
    clearTimeout(temporizadorRef.current);
  };

  // En móvil: mantener presionado arma el enlace.
  const alPresionar = (event) => {
    if (event.pointerType === "mouse") return;
    pulsacionLargaRef.current = false;
    clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(() => {
      pulsacionLargaRef.current = true;
      try { navigator.vibrate?.(45); } catch { /* Sin soporte de vibración. */ }
      avanzarEnlace();
    }, 450);
  };

  const cancelarPulsacion = () => clearTimeout(temporizadorRef.current);

  const activar = (event) => {
    if (pulsacionLargaRef.current) {
      pulsacionLargaRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey || armado || enlaceEnCurso) {
      event.preventDefault();
      event.stopPropagation();
      avanzarEnlace();
      return;
    }
    if (onAbrir) {
      onAbrir(cuenta, event.currentTarget.getBoundingClientRect());
      return;
    }
    setCuentaSeleccionada(cuenta);
    setIsOpenModificarTarjeta(true);
  };

  return (
    <ContenedorCardTarjetaStyled
      ref={tarjetaRef}
      data-tour="cuenta-tarjeta"
      data-tarjeta-id={cuenta?.id}
      style={oculta ? { visibility: "hidden" } : undefined}
      role="button"
      tabIndex={0}
      title={
        esOrigenDelEnlace
          ? "Cuenta de salida · toca otra cuenta para enviarle dinero"
          : enlaceEnCurso
            ? `Enviar dinero a ${cuenta?.nombre || "esta cuenta"}`
            : tarjetaArmada
              ? "Shift + Clic: elegir esta cuenta como salida"
              : undefined
      }
      aria-label={`${onAbrir ? "Ver" : "Editar"} tarjeta ${cuenta?.nombre || ""}`}
      onPointerEnter={alEntrar}
      onPointerMove={alMover}
      onPointerLeave={alSalir}
      onPointerDown={alPresionar}
      onPointerUp={cancelarPulsacion}
      onPointerCancel={cancelarPulsacion}
      onClick={activar}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activar(event);
        }
      }}
    >
      {tarjetaResaltada && <IndicadorEnlaceTarjeta $rol={esOrigenDelEnlace ? "origen" : "destino"} />}
      <TarjetaVisual cuenta={cuenta} plana />
    </ContenedorCardTarjetaStyled>
  )
}

