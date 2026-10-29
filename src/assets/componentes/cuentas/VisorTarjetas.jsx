import styled from "styled-components";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion as Motion,
  useAnimationControls,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaUniversity,
  FaStar,
  FaExchangeAlt,
  FaPlus,
  FaSlidersH,
  FaPen,
  FaArrowLeft,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { resumenTarjeta } from "../cards/cardCuentaTarjeta";
import { TarjetaVisual } from "../cards/TarjetaVisual";
import { EditorTarjeta } from "../Modales/modificarInformacionTarjeta";
import { hayModalAbierto } from "../Modales/ModalGenerico";

/*
 * Visor de tarjetas de /cuentas.
 *
 * Al tocar una tarjeta de la cuadrícula, una copia vuela desde su posición
 * (FLIP: se mide de dónde sale y a dónde llega) y se queda a la izquierda,
 * inclinada en 3D mirando hacia la derecha. A la derecha entra el panel con
 * el detalle y el editor. < > a los lados de la tarjeta (o las flechas, o
 * deslizar) cambian de tarjeta: la actual sale girando
 * y la siguiente entra por el otro lado. Al cerrar, la tarjeta regresa volando
 * a su hueco.
 *
 * Vive debajo de los modales (z-index 10500 < 11000): editar saldo o registrar
 * un movimiento abren encima sin cerrar el visor.
 */

const Z_VISOR = 10500;

/* Inclinación de reposo: la cara mira hacia la derecha. */
const INCLINACION = { rotateY: -18, rotateX: 7, rotateZ: 3 };
const PLANA = { rotateY: 0, rotateX: 0, rotateZ: 0 };
const RESORTE = { type: "spring", stiffness: 170, damping: 19, mass: 0.9 };
const SALIDA = [0.55, 0, 1, 0.45];

const formatear = formatearMonedaSegunPreferencia;

/* ── Estilos ── */

const Capa = styled(Motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${Z_VISOR};
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(16px, 3vw, 48px);
  padding: clamp(16px, 4vw, 56px);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    align-items: start;
    align-content: start;
    padding: 64px 14px 24px;
    gap: 8px;
  }
`;

const Fondo = styled(Motion.div)`
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 28% 45%, rgba(116, 82, 196, 0.35), transparent 55%),
    rgba(14, 8, 30, 0.58);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
`;

const BotonCerrar = styled.button`
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 2;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover { background: rgba(255, 255, 255, 0.26); }
  &:active { transform: scale(0.94); }
  &:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }

  @media (max-width: 900px) {
    top: 12px;
    right: 12px;
  }
`;

const ColumnaEscena = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;
  min-width: 0;

  @media (max-width: 900px) {
    gap: 16px;
  }
`;

/* Tarjeta al centro con < > a sus costados. */
const FilaEscena = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, max-content) auto;
  justify-content: center;
  align-items: center;
  gap: clamp(10px, 2vw, 28px);

  @media (max-width: 900px) {
    gap: 8px;
  }
`;

const Escenario = styled(Motion.div)`
  display: grid;
  place-items: center;
  perspective: 1400px;
  touch-action: pan-y;
  padding: 24px 0;
`;

/* Hueco fijo de la tarjeta: se mide sin transformaciones para el FLIP. */
const Hueco = styled.div`
  grid-area: 1 / 1;
  width: clamp(270px, 36vw, 480px);
  aspect-ratio: 1.586;

  @media (max-width: 900px) {
    width: min(calc(100vw - 132px), 390px);
  }
`;

const Vuelo = styled(Motion.div)`
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
`;

const Tilt = styled(Motion.div)`
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
`;

const Flotar = styled(Motion.div)`
  width: 100%;
  height: 100%;
`;

const Navegacion = styled.div`
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  color: #ffffff;
`;

const BotonNav = styled.button`
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #ffffff;
  color: #2a1b55;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(10, 5, 30, 0.35);
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover { transform: scale(1.07); background: #f1ebff; }
  &:active { transform: scale(0.92); }
  &:disabled { opacity: 0.4; cursor: default; transform: none; }
  &:focus-visible { outline: 2px solid #ffffff; outline-offset: 3px; }

  @media (max-width: 900px) {
    width: 40px;
    height: 40px;
    font-size: 13px;
  }
`;

const Contador = styled.span`
  min-width: 64px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  small {
    display: block;
    color: rgba(255, 255, 255, 0.7);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const ColumnaPanel = styled.div`
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-start;

  @media (max-width: 900px) {
    justify-content: center;
  }
`;

const Panel = styled(Motion.section)`
  width: min(100%, 560px);
  max-height: calc(100dvh - 80px);
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 26px;
  background: rgba(250, 248, 255, 0.9);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  box-shadow: 0 30px 70px -24px rgba(10, 5, 30, 0.6);
  color: #1e1538;

  @media (max-width: 900px) {
    max-height: none;
    padding: 20px 16px;
    border-radius: 22px;
  }
`;

const CabeceraPanel = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;

  h2 {
    margin: 0 0 8px;
    font-size: clamp(22px, 2.4vw, 30px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
`;

const Etiquetas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Etiqueta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${({ $dorada }) => ($dorada ? "#fff6d6" : "#ede7fb")};
  color: ${({ $dorada }) => ($dorada ? "#8d6813" : "var(--colorMorado)")};
  font-size: 11px;
  font-weight: 800;
`;

const BotonSecundario = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(83, 59, 143, 0.28);
  border-radius: 12px;
  background: #ffffff;
  color: var(--colorMorado);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover { background: #f7f4ff; border-color: var(--colorMorado); }
  &:focus-visible { outline: 2px solid var(--colorMorado); outline-offset: 2px; }
`;

const Datos = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 16px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const Dato = styled.div`
  padding: 12px 14px;
  border: 1px solid #e6defa;
  border-radius: 14px;
  background: #ffffff;
  min-width: 0;

  dt {
    color: #6b6180;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  dd {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    color: ${({ $negativo }) => ($negativo ? "#c62828" : "#1e1538")};
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Uso = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 14px;
  margin-bottom: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f3eeff, #ffffff);
  border: 1px solid #e6defa;
`;

const AnilloUso = styled.div`
  --p: ${({ $porcentaje }) => $porcentaje};
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, #ffffff 74%, transparent 76%),
    conic-gradient(var(--colorMorado) calc(var(--p) * 1%), #e4dcf7 0);
  font-size: 13px;
  font-weight: 800;
`;

const BarraUso = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #4b3874;
  }

  div:first-child span:last-child {
    color: #6b6180;
    font-weight: 600;
    white-space: nowrap;
  }
`;

const Pista = styled.div`
  height: 9px;
  border-radius: 999px;
  background: #e4dcf7;
  overflow: hidden;
`;

const Relleno = styled(Motion.div)`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c5cd6, #b494f1);
`;

const Acciones = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const BotonAccion = styled.button`
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid ${({ $principal }) => ($principal ? "transparent" : "rgba(83, 59, 143, 0.22)")};
  border-radius: 14px;
  background: ${({ $principal }) => ($principal ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $principal }) => ($principal ? "#ffffff" : "var(--colorMorado)")};
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover { background: ${({ $principal }) => ($principal ? "#45307a" : "#f7f4ff")}; }
  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid var(--colorMorado); outline-offset: 2px; }
`;

/* El formulario trae su propio padding lateral (pensado para el modal). */
const ZonaEditor = styled.div`
  margin: 0 -20px -20px;

  @media (max-width: 520px) {
    margin: 0 -14px -16px;
  }
`;

/* ── Datos de la tarjeta ── */

const datosPorTipo = (cuenta, resumen) => {
  const tipo = cuenta?.tipoDeCuenta;
  const saldo = { etiqueta: "Saldo actual", valor: formatear(resumen.saldoTotal), negativo: resumen.saldoTotal < 0 };

  if (tipo === "credito") {
    const limite = Number(cuenta?.limiteDeCredito || 0);
    return {
      datos: [
        saldo,
        { etiqueta: "Límite de crédito", valor: limite ? formatear(limite) : "Sin registrar" },
        { etiqueta: "Día de corte", valor: cuenta?.fechaDeCorte ? `Día ${cuenta.fechaDeCorte}` : "—" },
        { etiqueta: "Día límite de pago", valor: cuenta?.fechaLimiteDePago ? `Día ${cuenta.fechaLimiteDePago}` : "—" },
      ],
      uso: limite ? {
        titulo: "Uso de crédito",
        detalle: `${formatear(Math.abs(resumen.saldoTotal))} / ${formatear(limite)}`,
      } : null,
    };
  }

  if (tipo === "inversion") {
    return {
      datos: [
        saldo,
        { etiqueta: "Monto inicial", valor: formatear(Number(cuenta?.saldoInicialInversion || 0)) },
        { etiqueta: "Monto final esperado", valor: formatear(Number(cuenta?.saldoFinalInversion || 0)) },
        { etiqueta: "Liquidez", valor: cuenta?.esLiquida ? "Líquida" : "No líquida" },
      ],
      uso: cuenta?.fechaInicioInversion && cuenta?.fechaFinalInversion
        ? { titulo: "Avance del plazo", detalle: "Tiempo transcurrido" }
        : null,
    };
  }

  const meta = Number(cuenta?.metaDeAhorro || 0);
  return {
    datos: [
      saldo,
      { etiqueta: "Meta de ahorro", valor: meta ? formatear(meta) : "Sin meta" },
      { etiqueta: "Liquidez", valor: cuenta?.esLiquida === false ? "No líquida" : "Líquida" },
      { etiqueta: "Tipo", valor: adaptadorTxtLabel(tipoDeCuentaInput, tipo) || "—" },
    ],
    uso: meta ? {
      titulo: "Avance de la meta",
      detalle: `${formatear(Math.abs(resumen.saldoTotal))} / ${formatear(meta)}`,
    } : null,
  };
};

/* ── Escena de una tarjeta (entra, flota, sale) ── */

const centro = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

const desdeRect = (rectOrigen, rectHueco) => {
  const a = centro(rectOrigen);
  const b = centro(rectHueco);
  return { x: a.x - b.x, y: a.y - b.y, scale: rectOrigen.width / rectHueco.width };
};

const variantesSalida = {
  salida: (direccion) => ({
    x: direccion > 0 ? "-115%" : "115%",
    rotateY: direccion > 0 ? 70 : -70,
    rotateZ: direccion > 0 ? -8 : 8,
    scale: 0.78,
    opacity: 0,
    transition: { duration: 0.36, ease: SALIDA },
  }),
};

const EscenaTarjeta = ({ cuenta, titular, origen, direccion, regreso, onRegreso, sinMovimiento, inclinacion }) => {
  const huecoRef = useRef(null);
  const controles = useAnimationControls();

  // Entrada: desde la cuadrícula (primera vez) o desde un lado (al navegar).
  useLayoutEffect(() => {
    if (sinMovimiento) {
      controles.set({ opacity: 0, ...INCLINACION });
      controles.start({ opacity: 1, transition: { duration: 0.2 } });
      return;
    }

    if (origen && huecoRef.current) {
      controles.set({ ...desdeRect(origen, huecoRef.current.getBoundingClientRect()), ...PLANA, opacity: 1 });
    } else {
      controles.set({
        x: direccion > 0 ? "115%" : "-115%",
        y: 0,
        scale: 0.78,
        rotateY: direccion > 0 ? -70 : 70,
        rotateX: 0,
        rotateZ: direccion > 0 ? 8 : -8,
        opacity: 0,
      });
    }
    controles.start({ x: 0, y: 0, scale: 1, opacity: 1, ...INCLINACION, transition: RESORTE });
    // Solo al montar: cada tarjeta lleva su propia key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cierre: regresa volando a su hueco de la cuadrícula.
  useEffect(() => {
    if (!regreso) return;
    if (sinMovimiento || !regreso.rect || !huecoRef.current) {
      controles.start({ opacity: 0, transition: { duration: 0.18 } }).then(onRegreso);
      return;
    }
    controles
      .start({
        ...desdeRect(regreso.rect, huecoRef.current.getBoundingClientRect()),
        ...PLANA,
        transition: { type: "spring", stiffness: 260, damping: 30 },
      })
      .then(onRegreso);
  }, [regreso, controles, onRegreso, sinMovimiento]);

  return (
    <Hueco ref={huecoRef}>
      <Vuelo
        animate={controles}
        custom={direccion}
        variants={variantesSalida}
        exit="salida"
      >
        <Tilt style={inclinacion.estilo}>
          <Flotar
            animate={sinMovimiento || regreso ? { y: 0 } : { y: [0, -9, 0] }}
            transition={sinMovimiento || regreso ? { duration: 0.2 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <TarjetaVisual cuenta={cuenta} titular={titular} brillo={inclinacion.brillo} />
          </Flotar>
        </Tilt>
      </Vuelo>
    </Hueco>
  );
};

/* Inclinación extra con el puntero, como una carta en la mano. */
const useInclinacionPuntero = (activa) => {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const bx = useMotionValue(30);
  const by = useMotionValue(20);
  const rotateX = useSpring(rx, { stiffness: 140, damping: 16 });
  const rotateY = useSpring(ry, { stiffness: 140, damping: 16 });
  const brillo = useMotionTemplate`radial-gradient(circle at ${bx}% ${by}%, rgba(255,255,255,0.55), transparent 55%)`;

  const mover = useCallback((evento) => {
    if (!activa) return;
    const rect = evento.currentTarget.getBoundingClientRect();
    const px = (evento.clientX - rect.left) / rect.width - 0.5;
    const py = (evento.clientY - rect.top) / rect.height - 0.5;
    rx.set(-py * 12);
    ry.set(px * 16);
    bx.set(50 + px * 90);
    by.set(50 + py * 90);
  }, [activa, rx, ry, bx, by]);

  const soltar = useCallback(() => {
    rx.set(0);
    ry.set(0);
    bx.set(30);
    by.set(20);
  }, [rx, ry, bx, by]);

  return { estilo: { rotateX, rotateY }, brillo: activa ? brillo : null, mover, soltar };
};

/* ── Panel derecho ── */

const PanelCuenta = ({ cuenta, editando, setEditando }) => {
  const { setCuentaSeleccionada } = useAppStore();
  const { abrirAgregarMovimiento, abrirMovimientoEntreCuentas, setIsOpenModificarMontoCuenta } = useModalStore();
  const resumen = resumenTarjeta(cuenta);
  const { datos, uso } = datosPorTipo(cuenta, resumen);

  const transferir = () => (cuenta?.tipoDeCuenta === "credito"
    ? abrirMovimientoEntreCuentas({ cuentaDestino: cuenta })
    : abrirMovimientoEntreCuentas({ cuentaOrigen: cuenta }));

  const ajustarSaldo = () => {
    setCuentaSeleccionada(cuenta);
    setIsOpenModificarMontoCuenta(true);
  };

  return (
    <>
      <CabeceraPanel>
        <div>
          <h2 id="visor-titulo">{cuenta?.nombre}</h2>
          <Etiquetas>
            <Etiqueta><FaUniversity aria-hidden="true" /> {adaptadorTxtLabel(tipoDeCuentaInput, cuenta?.tipoDeCuenta)}</Etiqueta>
            {cuenta?.preferida && <Etiqueta $dorada><FaStar aria-hidden="true" /> Preferida</Etiqueta>}
          </Etiquetas>
        </div>
        <BotonSecundario type="button" onClick={() => setEditando((valor) => !valor)}>
          {editando ? <><FaArrowLeft aria-hidden="true" /> Detalle</> : <><FaPen aria-hidden="true" /> Editar</>}
        </BotonSecundario>
      </CabeceraPanel>

      {editando ? (
        <ZonaEditor>
          <EditorTarjeta cuenta={cuenta} conEncabezado={false} onGuardado={() => setEditando(false)} />
        </ZonaEditor>
      ) : (
        <>
          <Datos>
            {datos.map((dato) => (
              <Dato key={dato.etiqueta} $negativo={dato.negativo}>
                <dt>{dato.etiqueta}</dt>
                <dd title={dato.valor}>{dato.valor}</dd>
              </Dato>
            ))}
          </Datos>

          {uso && (
            <Uso>
              <AnilloUso $porcentaje={resumen.porcentaje}>{resumen.porcentaje}%</AnilloUso>
              <BarraUso>
                <div>
                  <span>{uso.titulo}</span>
                  <span>{uso.detalle}</span>
                </div>
                <Pista>
                  <Relleno
                    initial={{ width: 0 }}
                    animate={{ width: `${resumen.porcentaje}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  />
                </Pista>
              </BarraUso>
            </Uso>
          )}

          <Acciones>
            <BotonAccion type="button" $principal onClick={() => abrirAgregarMovimiento({ cuenta })}>
              <FaPlus aria-hidden="true" /> Movimiento
            </BotonAccion>
            <BotonAccion type="button" onClick={transferir}>
              <FaExchangeAlt aria-hidden="true" /> {cuenta?.tipoDeCuenta === "credito" ? "Pagar" : "Transferir"}
            </BotonAccion>
            <BotonAccion type="button" onClick={ajustarSaldo}>
              <FaSlidersH aria-hidden="true" /> Ajustar saldo
            </BotonAccion>
          </Acciones>
        </>
      )}
    </>
  );
};

/* ── Visor ── */

const esCampoDeTexto = (elemento) => Boolean(elemento?.closest?.("input, textarea, select, [contenteditable='true']"));

const buscarTarjetaEnCuadricula = (id) => document.querySelector(`[data-tarjeta-id="${CSS.escape(String(id))}"]`);

/**
 * @param ids            Orden de navegación (el mismo de la cuadrícula).
 * @param indiceInicial  Tarjeta que se tocó.
 * @param origen         DOMRect de esa tarjeta, para el vuelo de entrada.
 * @param onCambio(id)   Avisa qué tarjeta está en el visor (la cuadrícula la oculta).
 * @param onCerrar()     Se llama cuando terminó la animación de salida.
 */
export const VisorTarjetas = ({ ids, indiceInicial = 0, origen, onCambio, onCerrar }) => {
  const cuentas = useAppStore((estado) => estado.cuentas);
  const usuario = useAppStore((estado) => estado.usuario);
  // Zaldo se anima siempre, aunque el sistema pida reducir movimiento.
  const sinMovimiento = false;

  // Se sigue por id, no por posición: editar una tarjeta puede reordenar la lista.
  const [idActual, setIdActual] = useState(() => ids[indiceInicial] ?? ids[0]);
  const [direccion, setDireccion] = useState(1);
  const [editando, setEditando] = useState(false);
  const [regreso, setRegreso] = useState(null);
  const origenEntrada = useRef(origen);
  const cerrarRef = useRef(null);

  const lista = useMemo(
    () => ids.map((id) => cuentas.find((cuenta) => cuenta.id === id)).filter(Boolean),
    [ids, cuentas]
  );
  const total = lista.length;
  const indiceActual = lista.findIndex((item) => item.id === idActual);
  const cuenta = lista[indiceActual];
  const titular = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(" ") || "Titular";
  const inclinacion = useInclinacionPuntero(!sinMovimiento && !regreso);

  useEffect(() => {
    if (cuenta?.id) onCambio?.(cuenta.id);
  }, [cuenta?.id, onCambio]);

  const navegar = useCallback((paso) => {
    if (total < 2 || regreso) return;
    // Solo la primera tarjeta vuela desde la cuadrícula.
    origenEntrada.current = null;
    setDireccion(paso);
    setEditando(false);
    setIdActual(lista[(indiceActual + paso + total) % total].id);
  }, [total, regreso, lista, indiceActual]);

  const cerrar = useCallback(() => {
    if (regreso) return;
    const elemento = cuenta ? buscarTarjetaEnCuadricula(cuenta.id) : null;
    setRegreso({ rect: elemento?.getBoundingClientRect() || null });
  }, [cuenta, regreso]);

  const alTerminarRegreso = useCallback(() => {
    const elemento = cuenta ? buscarTarjetaEnCuadricula(cuenta.id) : null;
    onCerrar?.();
    elemento?.focus?.({ preventScroll: true });
  }, [cuenta, onCerrar]);

  // Teclado: flechas para navegar y Escape para cerrar, salvo que haya un modal encima o se esté escribiendo.
  useEffect(() => {
    const alPresionar = (evento) => {
      if (hayModalAbierto() || evento.defaultPrevented) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (esCampoDeTexto(evento.target)) return;
      if (evento.key === "ArrowRight") navegar(1);
      if (evento.key === "ArrowLeft") navegar(-1);
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [cerrar, navegar]);

  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  // Si la cuenta desaparece (se eliminó desde otro lado), el visor se va.
  useEffect(() => {
    if (indiceActual < 0) onCerrar?.();
  }, [indiceActual, onCerrar]);

  if (!cuenta || typeof document === "undefined") return null;

  const saliendo = Boolean(regreso);

  return createPortal(
    <Capa role="dialog" aria-modal="true" aria-labelledby="visor-titulo">
      <Fondo
        initial={{ opacity: 0 }}
        animate={{ opacity: saliendo ? 0 : 1 }}
        transition={{ duration: saliendo ? 0.3 : 0.35 }}
        onClick={cerrar}
      />

      <BotonCerrar ref={cerrarRef} type="button" onClick={cerrar} aria-label="Cerrar visor de tarjetas">
        <FaTimes aria-hidden="true" />
      </BotonCerrar>

      <ColumnaEscena>
        <FilaEscena>
          <Motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: saliendo ? 0 : 1, x: 0 }}
            transition={{ duration: 0.3, delay: saliendo ? 0 : 0.35 }}
          >
            <BotonNav type="button" onClick={() => navegar(-1)} disabled={total < 2} aria-label="Tarjeta anterior">
              <FaChevronLeft aria-hidden="true" />
            </BotonNav>
          </Motion.div>

          <Escenario
            onPointerMove={inclinacion.mover}
            onPointerLeave={inclinacion.soltar}
            onPanEnd={(_evento, info) => {
              if (Math.abs(info.offset.x) > 60 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                navegar(info.offset.x < 0 ? 1 : -1);
              }
            }}
          >
            <AnimatePresence initial={false} custom={direccion}>
              <EscenaTarjeta
                key={cuenta.id}
                cuenta={cuenta}
                titular={titular}
                origen={origenEntrada.current}
                direccion={direccion}
                regreso={regreso}
                onRegreso={alTerminarRegreso}
                sinMovimiento={sinMovimiento}
                inclinacion={inclinacion}
              />
            </AnimatePresence>
          </Escenario>

          <Motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: saliendo ? 0 : 1, x: 0 }}
            transition={{ duration: 0.3, delay: saliendo ? 0 : 0.35 }}
          >
            <BotonNav type="button" onClick={() => navegar(1)} disabled={total < 2} aria-label="Tarjeta siguiente">
              <FaChevronRight aria-hidden="true" />
            </BotonNav>
          </Motion.div>
        </FilaEscena>

        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: saliendo ? 0 : 1, y: 0 }}
          transition={{ duration: 0.3, delay: saliendo ? 0 : 0.35 }}
        >
          <Navegacion>
            <Contador aria-live="polite">
              {indiceActual + 1} / {total}
              <small>{adaptadorTxtLabel(tipoDeCuentaInput, cuenta.tipoDeCuenta)}</small>
            </Contador>
          </Navegacion>
        </Motion.div>
      </ColumnaEscena>

      <ColumnaPanel>
        <Panel
          initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, x: 60, rotateY: -8 }}
          animate={saliendo ? { opacity: 0, x: 40 } : { opacity: 1, x: 0, rotateY: 0 }}
          transition={saliendo ? { duration: 0.22 } : { ...RESORTE, delay: 0.12 }}
          style={{ transformPerspective: 1200 }}
        >
          <AnimatePresence mode="wait" initial={false} custom={direccion}>
            <Motion.div
              key={cuenta.id}
              initial={{ opacity: 0, x: sinMovimiento ? 0 : direccion * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: sinMovimiento ? 0 : direccion * -24 }}
              transition={{ duration: 0.2 }}
            >
              <PanelCuenta cuenta={cuenta} editando={editando} setEditando={setEditando} />
            </Motion.div>
          </AnimatePresence>
        </Panel>
      </ColumnaPanel>
    </Capa>,
    document.body
  );
};
