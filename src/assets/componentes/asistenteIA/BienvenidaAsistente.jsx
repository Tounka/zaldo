import styled from "styled-components";
import { motion as Motion } from "framer-motion";
import { PiArrowsLeftRightDuotone, PiCaretRightBold, PiCoinsDuotone, PiShoppingCartDuotone, PiWalletDuotone } from "react-icons/pi";

/*
 * Primer mensaje del asistente: las cuatro cosas que sabe registrar, como
 * tarjetas de color plano (sin degradados) con un icono duotono.
 *
 * Tocar una tarjeta deja el inicio de la frase en la caja de texto ("Gasté ")
 * para que el usuario la complete; no se envía nada sin que lo decida. Las
 * preguntas de ejemplo funcionan igual: van completas a la caja de texto.
 */
const CAPACIDADES = [
  {
    id: "gasto",
    titulo: "Gasto",
    descripcion: "Ej. Uber, comida, servicios, compras.",
    inicio: "Gasté ",
    icono: <PiWalletDuotone />,
    tono: { fondo: "#fdf1f4", borde: "#f7dfe6", icono: "#d6457a", tile: "#fbe1e9" },
  },
  {
    id: "ingreso",
    titulo: "Ingreso",
    descripcion: "Ej. Nómina, venta, pago recibido.",
    inicio: "Recibí ",
    icono: <PiCoinsDuotone />,
    tono: { fondo: "#eef8f1", borde: "#d9efe0", icono: "#2c9a5b", tile: "#dcf1e3" },
  },
  {
    id: "transferencia",
    titulo: "Entre cuentas",
    descripcion: "Ej. Débito a ahorro, tarjeta a inversión.",
    inicio: "Pasé ",
    icono: <PiArrowsLeftRightDuotone />,
    tono: { fondo: "#f3f0fc", borde: "#e4ddf8", icono: "#6a4fc4", tile: "#e6e0fa" },
  },
  {
    id: "despensa",
    titulo: "Despensa",
    descripcion: "Ej. Supermercado, Walmart, Soriana.",
    inicio: "Compré ",
    icono: <PiShoppingCartDuotone />,
    tono: { fondo: "#fdf7e8", borde: "#f6ebcc", icono: "#c4860f", tile: "#faecc8" },
  },
];

const PREGUNTAS = [
  "¿En qué categoría gasté más este mes?",
  "¿Cuánto debo en mis tarjetas?",
  "¿Qué me falta de la despensa?",
  "¿Cuánto he ahorrado?",
];

export const BienvenidaAsistente = ({ onUsarEjemplo }) => {

  return (
    <Contenedor
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Elliot ya aparece en el encabezado del panel; aquí solo el saludo. */}
      <Saludo>
        <Titulo>¿Qué registramos hoy?</Titulo>
        <Texto>Elige una acción o escribe como prefieras.</Texto>
      </Saludo>

      <Rejilla>
        {CAPACIDADES.map(({ id, titulo, descripcion, inicio, icono, tono }, indice) => (
          <Capacidad
            key={id}
            type="button"
            $tono={tono}
            onClick={() => onUsarEjemplo?.(inicio)}
            aria-label={`${titulo}. ${descripcion}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + indice * 0.04 }}
          >
            <IconoCapacidad aria-hidden="true">{icono}</IconoCapacidad>
            <Cuerpo>
              <Cabecera>
                <strong>{titulo}</strong>
                <PiCaretRightBold aria-hidden="true" />
              </Cabecera>
              <small>{descripcion}</small>
            </Cuerpo>
          </Capacidad>
        ))}
      </Rejilla>

      <Subtitulo>O pregúntame</Subtitulo>
      <Preguntas>
        {PREGUNTAS.map((pregunta, indice) => (
          <ChipPregunta
            key={pregunta}
            type="button"
            $tono={CAPACIDADES[indice % CAPACIDADES.length].tono}
            onClick={() => onUsarEjemplo?.(pregunta)}
          >
            {pregunta}
          </ChipPregunta>
        ))}
      </Preguntas>
      <Texto as="small">También puedes mandar la foto de un ticket con el botón de cámara.</Texto>
    </Contenedor>
  );
};

/* =======================
   ESTILOS
======================= */

const MORADO = "var(--colorMorado, #533b8f)";

const Contenedor = styled(Motion.div)`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 2px 2px;
  color: #18161f;
`;

const Saludo = styled.div`
  margin-bottom: 14px;

  p { margin-bottom: 0; }
`;

const Titulo = styled.div`
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -.015em;
  line-height: 1.25;
`;

const Texto = styled.p`
  margin: 4px 0 16px;
  font-size: 13.5px;
  line-height: 1.45;
  color: #6b6a75;
`;

const Rejilla = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`;

const Subtitulo = styled.div`
  margin: 16px 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: #8e8d97;
`;

const Preguntas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  + small {
    display: block;
    margin: 12px 0 0;
    font-size: 12px;
  }
`;

/* Cada pregunta toma el tono de una capacidad para que no se vean todas iguales. */
const ChipPregunta = styled.button`
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid ${({ $tono }) => $tono.borde};
  background: ${({ $tono }) => $tono.fondo};
  color: #18161f;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s ease, box-shadow .15s ease;

  &::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 7px;
    border-radius: 50%;
    vertical-align: middle;
    background: ${({ $tono }) => $tono.icono};
  }

  &:hover {
    border-color: ${({ $tono }) => $tono.icono}55;
    box-shadow: 0 3px 10px -6px ${({ $tono }) => $tono.icono}66;
  }
  &:focus-visible { outline: 2px solid ${MORADO}; outline-offset: 2px; }
`;

const IconoCapacidad = styled.span`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 26px;
`;

const Cuerpo = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;

  small {
    font-size: 11.5px;
    line-height: 1.35;
    color: #6b6a75;
  }
`;

const Cabecera = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;

  strong {
    font-size: 14px;
    font-weight: 600;
    color: #18161f;
  }

  svg {
    flex-shrink: 0;
    font-size: 12px;
    color: #a5a3ae;
    transition: transform .15s ease, color .15s ease;
  }
`;

const Capacidad = styled(Motion.button)`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 92px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid ${({ $tono }) => $tono.borde};
  background: ${({ $tono }) => $tono.fondo};
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease;

  ${IconoCapacidad} {
    color: ${({ $tono }) => $tono.icono};
    background: ${({ $tono }) => $tono.tile};
  }

  &:hover {
    border-color: ${({ $tono }) => $tono.icono}55;
    box-shadow: 0 4px 14px -6px ${({ $tono }) => $tono.icono}40;
  }

  &:hover ${Cabecera} svg {
    color: ${({ $tono }) => $tono.icono};
    transform: translateX(2px);
  }

  &:focus-visible {
    outline: 2px solid ${MORADO};
    outline-offset: 2px;
  }

  /* En pantallas muy angostas el icono va arriba para que quepa el texto. */
  @media (max-width: 360px) {
    flex-direction: column;
  }
`;
