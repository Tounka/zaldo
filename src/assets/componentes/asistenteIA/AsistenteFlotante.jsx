import { useCallback, useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { FiCamera, FiCheck, FiInfo, FiMic, FiRotateCcw, FiSend, FiSquare, FiX } from "react-icons/fi";
import { PiSparkleFill } from "react-icons/pi";
import { AvatarAsistente } from "./AvatarAsistente";
import { useConversacionCaptura } from "./useConversacionCaptura";
import { BienvenidaAsistente } from "./BienvenidaAsistente";
import { LIMITE_MENSAJE_CAPTURA } from "../../funciones/ia/solicitarCaptura";
import { dictadoDisponible, useDictado } from "./useDictado";
import { ErrorImagenIA, prepararImagenParaIA } from "../../funciones/ia/imagenParaIA";

/*
 * Asistente de captura como burbuja flotante (estilo WhatsApp).
 *
 * La burbuja cerrada se vuelve semitransparente cuando no se le presta
 * atención (sin puntero encima ni foco dentro) y recupera la opacidad al
 * acercarse, al tocarla o cuando el asistente responde algo nuevo. El chat
 * abierto siempre es opaco: se está usando.
 *
 * Mantener presionada la burbuja abre el chat con el micrófono ya escuchando.
 *
 * Vive en LayoutConMenu, así que solo aparece con sesión iniciada. Queda por
 * debajo de los modales (z-index 11000) para que "Editar en formulario" se
 * vea encima del chat.
 */

const Z_ASISTENTE = 10500;
const ESPERA_BURBUJA_MS = 3500;
const OPACIDAD_BURBUJA_INACTIVA = 0.4;
const PRESION_LARGA_MS = 450;

/* Mensajes del bot con `estado`: llevan un icono en vez de emoji. */
const ICONOS_ESTADO = {
  exito: <FiCheck aria-hidden="true" />,
  aviso: <FiInfo aria-hidden="true" />,
};

/*
 * Atención = puntero encima o foco dentro. En pantallas táctiles no existe el
 * "hover" (pointerleave llega justo después de cada toque), así que ahí cada
 * toque solo reinicia la cuenta regresiva.
 */
const useAtencion = (espera) => {
  const [atento, setAtento] = useState(true);
  const encimaRef = useRef(false);
  const focoRef = useRef(false);
  const temporizadorRef = useRef(null);

  const programar = useCallback(() => {
    clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(() => {
      if (!encimaRef.current && !focoRef.current) setAtento(false);
    }, espera);
  }, [espera]);

  const despertar = useCallback(() => {
    setAtento(true);
    programar();
  }, [programar]);

  useEffect(() => {
    programar();
    return () => clearTimeout(temporizadorRef.current);
  }, [programar]);

  const eventos = {
    onPointerEnter: (evento) => {
      if (evento.pointerType === "touch") return;
      encimaRef.current = true;
      setAtento(true);
    },
    onPointerLeave: (evento) => {
      if (evento.pointerType === "touch") return;
      encimaRef.current = false;
      programar();
    },
    onPointerDown: despertar,
    onFocus: () => {
      focoRef.current = true;
      setAtento(true);
    },
    onBlur: (evento) => {
      if (evento.currentTarget.contains(evento.relatedTarget)) return;
      focoRef.current = false;
      programar();
    },
  };

  return { atento, despertar, eventos };
};

export const AsistenteFlotante = () => {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [noLeidos, setNoLeidos] = useState(0);
  /* Foto lista para enviar (ya reducida) y el aviso si no se pudo preparar. */
  const [adjunto, setAdjunto] = useState(null);
  const [errorAdjunto, setErrorAdjunto] = useState("");

  const {
    mensajes,
    pensando,
    estadoAvatar,
    preguntaActivaId,
    enviarTexto,
    enviarImagen,
    elegirOpcion,
    reiniciar,
  } = useConversacionCaptura();

  /*
   * El dictado solo llena la caja de texto: el usuario revisa lo que se
   * transcribió y decide enviarlo. A la IA nunca le llega el audio.
   */
  const dictado = useDictado({ alTexto: (dictadoActual) => setTexto(dictadoActual.slice(0, LIMITE_MENSAJE_CAPTURA)) });

  const burbuja = useAtencion(ESPERA_BURBUJA_MS);
  const despertarBurbuja = burbuja.despertar;

  const listaRef = useRef(null);
  const inputRef = useRef(null);
  const archivoRef = useRef(null);
  const presionRef = useRef({ temporizador: null, disparada: false });
  const totalMensajesRef = useRef(mensajes.length);

  // Mensaje nuevo: baja al final, despierta el chat y cuenta no leídos si está cerrado.
  useEffect(() => {
    const nuevos = mensajes.slice(totalMensajesRef.current);
    totalMensajesRef.current = mensajes.length;
    if (nuevos.length === 0) return;

    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });

    if (abierto) return;

    const delBot = nuevos.filter((mensaje) => mensaje.autor === "bot").length;
    if (delBot > 0) {
      setNoLeidos((previos) => previos + delBot);
      despertarBurbuja();
    }
  }, [mensajes, abierto, despertarBurbuja]);

  useEffect(() => {
    if (pensando) listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight });
  }, [pensando]);

  useEffect(() => {
    if (!abierto) return;
    setNoLeidos(0);
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight });
    // En teléfono el teclado taparía el chat recién abierto.
    if (window.matchMedia("(min-width: 601px)").matches) inputRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionar = (evento) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  // Cerrar el chat corta el micrófono.
  const detenerDictado = dictado.detener;
  useEffect(() => {
    if (!abierto) detenerDictado();
  }, [abierto, detenerDictado]);

  useEffect(() => () => clearTimeout(presionRef.current.temporizador), []);

  const enviar = (evento) => {
    evento?.preventDefault();
    if (pensando || (!texto.trim() && !adjunto)) return;
    dictado.detener();
    if (adjunto) enviarImagen(adjunto, texto);
    else enviarTexto(texto);
    setTexto("");
    setAdjunto(null);
  };

  const adjuntarImagen = async (archivo) => {
    if (!archivo) return;
    setErrorAdjunto("");
    try {
      setAdjunto(await prepararImagenParaIA(archivo));
    } catch (error) {
      setErrorAdjunto(error instanceof ErrorImagenIA ? error.message : "No pude preparar esa imagen.");
    }
  };

  const alElegirArchivo = (evento) => {
    adjuntarImagen(evento.target.files?.[0]);
    // Permite volver a elegir la misma foto.
    evento.target.value = "";
  };

  /* Pegar una captura de pantalla en la caja de texto también la adjunta. */
  const alPegar = (evento) => {
    const archivo = Array.from(evento.clipboardData?.files || []).find((item) => item.type.startsWith("image/"));
    if (!archivo) return;
    evento.preventDefault();
    adjuntarImagen(archivo);
  };

  /*
   * Presión larga sobre la burbuja: abre el chat ya dictando. El clic que
   * llega al soltar se ignora para no volver a cerrarlo.
   */
  const alPresionarBurbuja = (evento) => {
    burbuja.eventos.onPointerDown(evento);
    clearTimeout(presionRef.current.temporizador);
    presionRef.current.disparada = false;
    if (abierto || !dictadoDisponible || evento.button > 0) return;

    presionRef.current.temporizador = setTimeout(() => {
      presionRef.current.disparada = true;
      navigator.vibrate?.(15);
      setAbierto(true);
      dictado.iniciar(texto);
    }, PRESION_LARGA_MS);
  };

  const cancelarPresion = () => clearTimeout(presionRef.current.temporizador);

  const alTocarBurbuja = () => {
    if (presionRef.current.disparada) {
      presionRef.current.disparada = false;
      return;
    }
    setAbierto((previo) => !previo);
  };

  /* El inicio de frase va a la caja de texto, no se envía: el usuario la completa. */
  const usarEjemplo = (ejemplo) => {
    setTexto(ejemplo);
    requestAnimationFrame(() => {
      const entrada = inputRef.current;
      if (!entrada) return;
      entrada.focus();
      entrada.setSelectionRange(ejemplo.length, ejemplo.length);
    });
  };

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <Panel
            key="panel"
            role="dialog"
            aria-label="Asistente de captura"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
          >
            <Encabezado>
              <AvatarAsistente estado={estadoAvatar} tamano={40} />
              <div>
                <Nombre>Asistente Zaldo</Nombre>
                <Estado $pensando={pensando}>{pensando ? "Escribiendo…" : "En línea"}</Estado>
              </div>
              <AccionesEncabezado>
                <BotonIcono type="button" onClick={reiniciar} aria-label="Nueva conversación" title="Nueva conversación">
                  <FiRotateCcw />
                </BotonIcono>
                <BotonIcono type="button" onClick={() => setAbierto(false)} aria-label="Cerrar asistente" title="Cerrar">
                  <FiX />
                </BotonIcono>
              </AccionesEncabezado>
            </Encabezado>

            <ListaMensajes ref={listaRef} aria-live="polite">
              {mensajes.map((mensaje) => (mensaje.tipo === "bienvenida" ? (
                <FilaMensaje key={mensaje.id}>
                  <BienvenidaAsistente onUsarEjemplo={usarEjemplo} />
                </FilaMensaje>
              ) : (
                <FilaMensaje key={mensaje.id} $usuario={mensaje.autor === "usuario"}>
                  <Burbuja
                    $usuario={mensaje.autor === "usuario"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {mensaje.imagen && <ImagenMensaje src={mensaje.imagen} alt="Imagen enviada al asistente" />}
                    {mensaje.resumen && <TarjetaResumen resumen={mensaje.resumen} />}
                    {ICONOS_ESTADO[mensaje.estado] ? (
                      <ConEstado $estado={mensaje.estado}>
                        {ICONOS_ESTADO[mensaje.estado]}
                        <span>{mensaje.texto}</span>
                      </ConEstado>
                    ) : mensaje.texto}
                  </Burbuja>

                  {mensaje.opciones && mensaje.id === preguntaActivaId && (
                    <Opciones>
                      {mensaje.opciones.map((opcion) => (
                        <Chip
                          key={opcion.valor || "vacio"}
                          type="button"
                          $principal={opcion.principal}
                          $secundaria={opcion.secundaria}
                          disabled={pensando}
                          onClick={() => elegirOpcion(mensaje.id, opcion)}
                        >
                          {opcion.etiqueta}
                        </Chip>
                      ))}
                    </Opciones>
                  )}
                </FilaMensaje>
              )))}

              {pensando && (
                <FilaMensaje>
                  <Burbuja as="div" aria-label="El asistente está escribiendo">
                    <Escribiendo><span /><span /><span /></Escribiendo>
                  </Burbuja>
                </FilaMensaje>
              )}
            </ListaMensajes>

            {(dictado.error || errorAdjunto) && (
              <AvisoDictado role="status">{errorAdjunto || dictado.error}</AvisoDictado>
            )}

            {adjunto && (
              <VistaAdjunto>
                <img src={adjunto} alt="Foto lista para enviar" />
                <span>Foto lista. Agrega un comentario si quieres y envíala.</span>
                <BotonIcono type="button" onClick={() => setAdjunto(null)} aria-label="Quitar foto" title="Quitar foto">
                  <FiX />
                </BotonIcono>
              </VistaAdjunto>
            )}

            <BarraEntrada onSubmit={enviar}>
              <input
                ref={archivoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={alElegirArchivo}
              />
              <BotonAdjuntar
                type="button"
                onClick={() => archivoRef.current?.click()}
                disabled={pensando}
                aria-label="Adjuntar foto de un ticket o productos"
                title="Foto de un ticket o productos"
              >
                <FiCamera />
              </BotonAdjuntar>
              <CampoEntrada>
                <PiSparkleFill aria-hidden="true" />
                <Entrada
                  ref={inputRef}
                  value={texto}
                  onChange={(evento) => setTexto(evento.target.value)}
                  onPaste={alPegar}
                  placeholder={dictado.escuchando ? "Escuchando… habla ahora" : "Escribe, pregunta o dicta…"}
                  maxLength={LIMITE_MENSAJE_CAPTURA}
                  aria-label="Mensaje para el asistente"
                  autoComplete="off"
                />
              </CampoEntrada>
              {dictado.escuchando ? (
                <BotonEnviar type="button" $grabando onClick={dictado.detener} aria-label="Dejar de dictar">
                  <FiSquare />
                </BotonEnviar>
              ) : dictadoDisponible && !texto.trim() && !adjunto ? (
                <BotonEnviar type="button" onClick={() => dictado.iniciar(texto)} aria-label="Dictar mensaje por voz">
                  <FiMic />
                </BotonEnviar>
              ) : (
                <BotonEnviar type="submit" disabled={(!texto.trim() && !adjunto) || pensando} aria-label="Enviar">
                  <FiSend />
                </BotonEnviar>
              )}
            </BarraEntrada>
          </Panel>
        )}
      </AnimatePresence>

      <BotonFlotante
        type="button"
        $oculto={abierto}
        onClick={alTocarBurbuja}
        aria-label={abierto ? "Cerrar asistente" : "Abrir asistente de captura"}
        aria-expanded={abierto}
        title={abierto ? "Cerrar asistente" : dictadoDisponible ? "Toca para escribir · mantén presionado para dictar" : "Abrir asistente"}
        data-tour="asistente"
        animate={{ opacity: burbuja.atento || abierto ? 1 : OPACIDAD_BURBUJA_INACTIVA, scale: 1 }}
        initial={{ opacity: 0, scale: 0.6 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.3 }}
        {...burbuja.eventos}
        onPointerDown={alPresionarBurbuja}
        onPointerUp={cancelarPresion}
        onPointerCancel={cancelarPresion}
        onPointerLeave={(evento) => {
          cancelarPresion();
          burbuja.eventos.onPointerLeave(evento);
        }}
        onContextMenu={(evento) => evento.preventDefault()}
      >
        {!abierto && noLeidos > 0 && <Pulso />}
        <AnimatePresence mode="wait" initial={false}>
          <Motion.span
            key={abierto ? "cerrar" : "avatar"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex" }}
          >
            {abierto ? <FiX size={24} /> : <AvatarAsistente estado={estadoAvatar} tamano={44} />}
          </Motion.span>
        </AnimatePresence>
        {!abierto && noLeidos > 0 && <Insignia aria-label={`${noLeidos} mensajes nuevos`}>{noLeidos}</Insignia>}
      </BotonFlotante>
    </>
  );
};

const TarjetaResumen = ({ resumen }) => (
  <Resumen $tono={resumen.tono}>
    <ResumenTitulo>
      <span>{resumen.titulo}</span>
      {resumen.monto && <strong>{resumen.monto}</strong>}
    </ResumenTitulo>
    <dl>
      {resumen.filas.map(([etiqueta, valor], indice) => (
        <div key={`${indice}-${etiqueta}`}>
          <dt>{etiqueta}</dt>
          <dd>{valor || "—"}</dd>
        </div>
      ))}
    </dl>
    {resumen.advertencias.length > 0 && (
      <Advertencias>
        {resumen.advertencias.map((advertencia) => <li key={advertencia}>{advertencia}</li>)}
      </Advertencias>
    )}
  </Resumen>
);

/* =======================
   ESTILOS
======================= */

/*
 * Paleta sobria: superficies blancas, grises neutros y el morado de la marca
 * solo como acento (mensajes propios, acción principal). Sin degradados.
 */
const MORADO = "var(--colorMorado, #533b8f)";
const TINTA = "#18161f";
const TEXTO_SUAVE = "#6b6a75";
const TEXTO_TENUE = "#8e8d97";
const LINEA = "#ebeaf0";
const SUPERFICIE = "#ffffff";
const SUPERFICIE_SUAVE = "#f4f3f7";

const latido = keyframes`
  0% { transform: scale(1); opacity: .35; }
  100% { transform: scale(1.5); opacity: 0; }
`;

const rebote = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: .35; }
  30% { transform: translateY(-3px); opacity: .9; }
`;

const BotonFlotante = styled(Motion.button)`
  position: fixed;
  /* Sin menú contextual ni selección al mantener presionado en el teléfono. */
  -webkit-touch-callout: none;
  user-select: none;
  touch-action: manipulation;
  right: 24px;
  bottom: 24px;
  z-index: ${Z_ASISTENTE};
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  padding: 0;
  display: grid;
  place-items: center;
  color: white;
  cursor: pointer;
  background: ${MORADO};
  box-shadow: 0 8px 24px -6px rgba(24, 22, 31, .35), 0 1px 3px rgba(24, 22, 31, .12);

  &:focus-visible {
    outline: 2px solid ${MORADO};
    outline-offset: 3px;
  }

  @media (max-width: 600px) {
    right: 16px;
    bottom: 16px;
    width: 52px;
    height: 52px;
    ${({ $oculto }) => $oculto && css`display: none;`}
  }
`;

const Pulso = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: ${MORADO};
  animation: ${latido} 1.8s ease-out infinite;
  z-index: -1;
`;

const Insignia = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--colorRojo, #db2b39);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
  border: 2px solid white;
  box-sizing: border-box;
`;

const Panel = styled(Motion.section)`
  position: fixed;
  right: 24px;
  bottom: 96px;
  z-index: ${Z_ASISTENTE};
  width: min(380px, calc(100vw - 32px));
  height: min(600px, calc(100dvh - 140px));
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: ${SUPERFICIE};
  border: 1px solid rgba(24, 22, 31, .08);
  box-shadow: 0 24px 60px -16px rgba(24, 22, 31, .28), 0 2px 8px rgba(24, 22, 31, .06);
  transform-origin: bottom right;
  color: ${TINTA};

  @media (max-width: 600px) {
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 88dvh;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
  }
`;

const Encabezado = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px 12px 16px;
  background: ${SUPERFICIE};
`;

const Nombre = styled.div`
  font-weight: 700;
  font-size: 15px;
  line-height: 1.2;
  color: ${TINTA};
`;

const Estado = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 12px;
  color: ${TEXTO_TENUE};

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $pensando }) => ($pensando ? TEXTO_TENUE : "#22a06b")};
  }
`;

const AccionesEncabezado = styled.div`
  margin-left: auto;
  display: flex;
  gap: 2px;
`;

const BotonIcono = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${TEXTO_SUAVE};
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 16px;
  transition: background .15s ease, color .15s ease;

  &:hover { background: ${SUPERFICIE_SUAVE}; color: ${TINTA}; }
  &:focus-visible { outline: 2px solid ${MORADO}; outline-offset: 1px; }
`;

const ListaMensajes = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${SUPERFICIE};
`;

const FilaMensaje = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ $usuario }) => ($usuario ? "flex-end" : "flex-start")};
  gap: 8px;
`;

const Burbuja = styled(Motion.div)`
  max-width: 82%;
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  ${({ $usuario }) => ($usuario
    ? css`
      background: ${MORADO};
      color: white;
      border-bottom-right-radius: 6px;
    `
    : css`
      background: ${SUPERFICIE_SUAVE};
      color: ${TINTA};
      border-bottom-left-radius: 6px;
    `)}
`;

const ConEstado = styled.span`
  display: flex;
  align-items: flex-start;
  gap: 8px;

  > svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    padding: 3px;
    box-sizing: border-box;
    border-radius: 50%;
    stroke-width: 3;
    color: white;
    background: ${({ $estado }) => ($estado === "exito" ? "#22a06b" : TEXTO_TENUE)};
  }
`;

const Opciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 92%;
`;

const Chip = styled.button`
  border-radius: 999px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${LINEA};
  background: ${SUPERFICIE};
  color: ${TINTA};
  transition: background .15s ease, border-color .15s ease;

  &:hover:not(:disabled) { background: #fafafb; border-color: #d9d8e0; }

  ${({ $principal }) => $principal && css`
    background: ${MORADO};
    border-color: ${MORADO};
    color: white;

    &:hover:not(:disabled) { background: ${MORADO}; border-color: ${MORADO}; filter: brightness(1.08); }
  `}

  ${({ $secundaria }) => $secundaria && css`
    border-color: transparent;
    background: transparent;
    color: ${TEXTO_SUAVE};

    &:hover:not(:disabled) { background: ${SUPERFICIE_SUAVE}; border-color: transparent; }
  `}

  &:disabled { opacity: .5; cursor: default; }
  &:focus-visible { outline: 2px solid ${MORADO}; outline-offset: 2px; }
`;

const Escribiendo = styled.div`
  display: flex;
  gap: 4px;
  padding: 5px 2px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${TEXTO_SUAVE};
    animation: ${rebote} 1.2s infinite ease-in-out;
  }
  span:nth-child(2) { animation-delay: .15s; }
  span:nth-child(3) { animation-delay: .3s; }
`;

const COLORES_TONO = {
  gasto: "var(--colorRojo, #db2b39)",
  ingreso: "var(--colorVerde, #006c67)",
  transferencia: MORADO,
  despensa: "var(--colorDorado, #cca43b)",
};

const Resumen = styled.div`
  margin: 2px 0 10px;
  border-radius: 12px;
  background: ${SUPERFICIE};
  border: 1px solid ${LINEA};
  padding: 10px 12px;
  white-space: normal;

  dl { margin: 8px 0 0; padding-top: 8px; border-top: 1px solid ${LINEA}; display: grid; gap: 4px; }
  dl div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
  dt { color: ${TEXTO_TENUE}; }
  dd { margin: 0; text-align: right; font-weight: 500; color: ${TINTA}; }

  /* El color del tipo de movimiento queda como un punto junto al título. */
  > div:first-child span::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 6px;
    border-radius: 50%;
    vertical-align: middle;
    background: ${({ $tono }) => COLORES_TONO[$tono] || MORADO};
  }
`;

const ResumenTitulo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;

  span { font-size: 12px; font-weight: 500; color: ${TEXTO_SUAVE}; }
  strong { font-size: 18px; font-weight: 600; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
`;

const Advertencias = styled.ul`
  margin: 8px 0 0;
  padding-left: 16px;
  font-size: 12px;
  color: #8a5a00;
`;

const BarraEntrada = styled.form`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: ${SUPERFICIE};
  padding-bottom: max(14px, env(safe-area-inset-bottom));
`;

/* Píldora con el destello a la izquierda; el borde se marca al enfocar. */
const CampoEntrada = styled.label`
  flex: 1;
  min-width: 0;
  height: 48px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1.5px solid #ddd6f5;
  background: ${SUPERFICIE};
  cursor: text;
  transition: border-color .15s ease, box-shadow .15s ease;

  > svg {
    flex-shrink: 0;
    font-size: 17px;
    color: ${MORADO};
  }

  &:focus-within {
    border-color: ${MORADO};
    box-shadow: 0 0 0 3px rgba(83, 59, 143, .1);
  }
`;

const Entrada = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  padding: 0;
  font-size: 14.5px;
  background: transparent;
  color: ${TINTA};

  &::placeholder { color: ${TEXTO_TENUE}; }
  &:focus { outline: none; }

  /* Evita el zoom automático de iOS al enfocar. */
  @media (max-width: 600px) { font-size: 16px; }
`;

const latidoGrabando = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(219, 43, 57, .3); }
  50% { box-shadow: 0 0 0 6px rgba(219, 43, 57, 0); }
`;

const BotonEnviar = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: ${MORADO};
  color: white;
  font-size: 19px;
  cursor: pointer;
  box-shadow: 0 6px 16px -6px rgba(83, 59, 143, .55);
  transition: filter .15s ease, opacity .15s ease;

  &:hover:not(:disabled) { filter: brightness(1.1); }
  &:disabled { opacity: .4; cursor: default; box-shadow: none; }
  &:focus-visible { outline: 2px solid ${MORADO}; outline-offset: 2px; }

  ${({ $grabando }) => $grabando && css`
    background: var(--colorRojo, #db2b39);
    box-shadow: none;
    animation: ${latidoGrabando} 1.4s ease-in-out infinite;
  `}
`;

const ImagenMensaje = styled.img`
  display: block;
  max-width: 100%;
  max-height: 220px;
  border-radius: 10px;
  margin-bottom: 6px;
  object-fit: cover;
`;

const VistaAdjunto = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid ${LINEA};
  font-size: 12px;
  color: ${TEXTO_SUAVE};

  img {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  span { flex: 1; min-width: 0; }
`;

const BotonAdjuntar = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: ${SUPERFICIE_SUAVE};
  color: ${MORADO};
  font-size: 18px;
  cursor: pointer;
  transition: filter .15s ease;

  &:hover:not(:disabled) { filter: brightness(.96); }
  &:disabled { opacity: .5; cursor: default; }
  &:focus-visible { outline: 2px solid ${MORADO}; outline-offset: 2px; }
`;

const AvisoDictado = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  color: #8a5a00;
  background: #fffaf0;
  border-top: 1px solid ${LINEA};
`;
