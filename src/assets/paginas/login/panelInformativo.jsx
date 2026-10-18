import styled from "styled-components";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaWallet,
  FaExchangeAlt,
  FaPiggyBank,
  FaHandHoldingUsd,
  FaShoppingBasket,
  FaMagic,
} from "react-icons/fa";

const INTERVALO_MS = 4500;

/*
 * Assets ilustrados del panel (public/login). Están pensados para generarse
 * con IA siguiendo diseno/login/PROMPTS-ASSETS.md. Si un archivo todavía no
 * existe, el panel se ve igual que antes: las funciones vuelven a su icono y
 * las decoraciones simplemente no aparecen.
 *
 * Para reacomodar una decoración solo cambia sus números aquí; las posiciones
 * son relativas al bloque de texto del panel (440 px de ancho máximo).
 */
const ASSETS_PANEL = {
  decoracionEsquina: {
    src: "/login/decoracion-esquina.webp",
    estilo: { top: -150, right: -90, width: 230, opacity: 0.95, rotate: "8deg" },
  },
  topoAsomado: {
    src: "/login/topo-asomado.webp",
    // zIndex 0: queda detrás de la tarjeta (z 1) pero delante del fondo.
    estilo: { top: -62, right: 18, width: 96, zIndex: 0 },
  },
};

const rutaFuncion = (id) => `/login/funciones/${id}.webp`;

const FUNCIONES = [
  {
    id: "cuentas",
    icono: FaWallet,
    titulo: "Todas tus cuentas",
    texto: "Débito, crédito y efectivo con su saldo al día en una sola vista.",
  },
  {
    id: "movimientos",
    icono: FaExchangeAlt,
    titulo: "Movimientos claros",
    texto: "Registra gastos, ingresos y traspasos entre cuentas en segundos.",
  },
  {
    id: "captura-ia",
    icono: FaMagic,
    titulo: "Captura con IA",
    texto: "Describe tu gasto con tus palabras y Zaldo arma el movimiento por ti.",
  },
  {
    id: "ahorros",
    icono: FaPiggyBank,
    titulo: "Ahorros con meta",
    texto: "Ponte una meta anual y sigue mes a mes cómo crece tu ahorro.",
  },
  {
    id: "prestamos",
    icono: FaHandHoldingUsd,
    titulo: "Préstamos bajo control",
    texto: "Lleva los pagos, el interés y cuánto te falta por liquidar.",
  },
  {
    id: "despensa",
    icono: FaShoppingBasket,
    titulo: "Despensa y súper",
    texto: "Tu inventario de casa y la lista del súper conectados con tus gastos.",
  },
];

const Panel = styled.section`
  width: min(440px, calc(100% - 64px));
  color: white;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 600px) {
    display: none;
  }
`;

/* Decoraciones sueltas: se posicionan con ASSETS_PANEL y no reciben clics. */
const Decoracion = styled.img`
  position: absolute;
  height: auto;
  pointer-events: none;
  user-select: none;
  z-index: -1;
`;

/* Envuelve la tarjeta para que el topo asomado pueda salir por arriba
   (la tarjeta recorta su contenido con overflow: hidden). */
const MarcoTarjeta = styled.div`
  position: relative;
  margin-top: 8px;
`;

const Encabezado = styled.h1`
  margin: 0;
  font-size: clamp(30px, 3.4vw, 44px);
  line-height: 1.08;
  font-weight: 800;
  text-shadow: 0 2px 20px rgba(15, 8, 36, 0.55);
`;

const Bajada = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.94);
`;

const TarjetaFuncion = styled.div`
  position: relative;
  z-index: 1;
  min-height: 118px;
  padding: 20px 22px;
  border-radius: 14px;
  background: rgba(18, 10, 44, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 12px 40px rgba(29, 19, 64, 0.22);
  overflow: hidden;
`;

const ContenidoFuncion = styled(motion.div)`
  display: flex;
  gap: 16px;
  align-items: flex-start;
`;

const IconoFuncion = styled.div`
  flex: 0 0 46px;
  height: 46px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: white;
  color: var(--colorPrincipal);
  font-size: 20px;
`;

/* Ilustración de la función: ocupa el lugar del icono cuando existe. */
const IlustracionFuncion = styled.img`
  flex: 0 0 84px;
  width: 84px;
  height: 84px;
  margin: -8px 0 -8px -6px;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(10, 4, 30, 0.35));
`;

const TituloFuncion = styled.h3`
  margin: 2px 0 6px;
  font-size: 17px;
`;

const TextoFuncion = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
`;

const Puntos = styled.div`
  display: flex;
  gap: 8px;
`;

const Punto = styled.button`
  width: ${({ $activo }) => ($activo ? "26px" : "8px")};
  height: 8px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "white" : "rgba(255, 255, 255, 0.5)")};
  cursor: pointer;
  transition: width 0.3s ease, background 0.3s ease;
`;

/* Imagen que se quita sola (o cede a su respaldo) si el archivo no existe. */
const ImagenOpcional = ({ src, respaldo = null, componente = "img", ...props }) => {
  const Componente = componente;
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [src]);
  if (fallo) return respaldo;
  return <Componente src={src} alt="" draggable={false} onError={() => setFallo(true)} {...props} />;
};

const estiloDecoracion = ({ rotate, ...resto }) => ({
  ...resto,
  transform: rotate ? `rotate(${rotate})` : undefined,
});

export const PanelInformativo = () => {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return undefined;
    const id = setInterval(() => setIndice((i) => (i + 1) % FUNCIONES.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, [pausado]);

  const funcion = FUNCIONES[indice];
  const Icono = funcion.icono;
  const desplazamiento = 14;

  return (
    <Panel
      aria-label="Qué puedes hacer con Zaldo"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <ImagenOpcional
        componente={Decoracion}
        src={ASSETS_PANEL.decoracionEsquina.src}
        style={estiloDecoracion(ASSETS_PANEL.decoracionEsquina.estilo)}
        aria-hidden="true"
      />
      <Encabezado>Tu dinero, claro y en un solo lugar.</Encabezado>
      <Bajada>
        Cuentas, gastos, ahorros y hasta la despensa de tu casa, conectados para que sepas
        exactamente dónde estás parado.
      </Bajada>

      <MarcoTarjeta>
      <ImagenOpcional
        componente={Decoracion}
        src={ASSETS_PANEL.topoAsomado.src}
        style={estiloDecoracion(ASSETS_PANEL.topoAsomado.estilo)}
        aria-hidden="true"
      />
      <TarjetaFuncion aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <ContenidoFuncion
            key={indice}
            initial={{ opacity: 0, y: desplazamiento }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -desplazamiento }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <ImagenOpcional
              componente={IlustracionFuncion}
              src={rutaFuncion(funcion.id)}
              aria-hidden="true"
              respaldo={<IconoFuncion><Icono aria-hidden="true" /></IconoFuncion>}
            />
            <div>
              <TituloFuncion>{funcion.titulo}</TituloFuncion>
              <TextoFuncion>{funcion.texto}</TextoFuncion>
            </div>
          </ContenidoFuncion>
        </AnimatePresence>
      </TarjetaFuncion>
      </MarcoTarjeta>

      <Puntos>
        {FUNCIONES.map((f, i) => (
          <Punto
            key={f.titulo}
            type="button"
            $activo={i === indice}
            aria-label={f.titulo}
            aria-current={i === indice}
            onClick={() => setIndice(i)}
          />
        ))}
      </Puntos>
    </Panel>
  );
};
