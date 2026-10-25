import { useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { AnimatePresence } from "framer-motion";
import { FiCode, FiMaximize2, FiPrinter } from "react-icons/fi";
import { VisorReporte } from "./VisorReporte";
import { descargarHTMLReporte, imprimirReporte } from "./reporteArchivo";

/*
 * Tarjeta de un reporte dentro del chat: título, periodo, 2 o 3 cifras clave
 * y las acciones Ver (pantalla completa), Descargar PDF (diálogo de
 * impresión) y Descargar HTML (respaldo).
 */

export const TarjetaReporte = ({ reporte }) => {
  const [viendo, setViendo] = useState(false);

  return (
    <Tarjeta>
      <Encabezado>
        <Etiqueta>Reporte</Etiqueta>
        <Titulo>{reporte.nombre}</Titulo>
        <Periodo>{reporte.periodo}</Periodo>
      </Encabezado>

      <Cifras>
        {reporte.cifras.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </Cifras>

      <Acciones>
        <Boton type="button" $principal onClick={() => setViendo(true)}>
          <FiMaximize2 aria-hidden="true" /> Ver
        </Boton>
        <Boton type="button" onClick={() => imprimirReporte(reporte)} title="Abre la impresión: elige “Guardar como PDF”">
          <FiPrinter aria-hidden="true" /> Descargar PDF
        </Boton>
        <Boton type="button" $discreto onClick={() => descargarHTMLReporte(reporte)} title="Archivo HTML que se abre en cualquier navegador">
          <FiCode aria-hidden="true" /> HTML
        </Boton>
      </Acciones>

      <Nota>{reporte.redactadoPorIA ? "Cifras calculadas por Zaldo; textos redactados con IA." : "Cifras y textos calculados por Zaldo."}</Nota>

      {createPortal(
        <AnimatePresence>
          {viendo && <VisorReporte key="visor" reporte={reporte} alCerrar={() => setViendo(false)} />}
        </AnimatePresence>,
        document.body,
      )}
    </Tarjeta>
  );
};

/* =======================
   ESTILOS
======================= */

const MORADO = "var(--colorMorado, #533b8f)";
const TINTA = "#18161f";
const TEXTO_SUAVE = "#6b6a75";
const TEXTO_TENUE = "#8e8d97";
const LINEA = "#ebeaf0";

const Tarjeta = styled.div`
  margin: 2px 0 10px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid ${LINEA};
  padding: 12px;
  white-space: normal;
  display: grid;
  gap: 10px;
`;

const Encabezado = styled.div`
  display: grid;
  gap: 2px;
`;

const Etiqueta = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: ${MORADO};
`;

const Titulo = styled.strong`
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -.01em;
  color: ${TINTA};
`;

const Periodo = styled.span`
  font-size: 12px;
  color: ${TEXTO_SUAVE};
`;

const Cifras = styled.dl`
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid ${LINEA};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 8px;

  div { display: grid; gap: 2px; min-width: 0; }
  dt { font-size: 11px; color: ${TEXTO_TENUE}; }
  dd {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${TINTA};
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
`;

const Acciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Boton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: ${({ $principal }) => ($principal ? 600 : 500)};
  cursor: pointer;
  border: 1px solid ${({ $principal, $discreto }) => ($principal ? MORADO : $discreto ? LINEA : "#ddd6f5")};
  background: ${({ $principal, $discreto }) => ($principal ? MORADO : $discreto ? "transparent" : "#f3f0fc")};
  color: ${({ $principal, $discreto }) => ($principal ? "#ffffff" : $discreto ? TEXTO_SUAVE : "#5a3fb4")};
  transition: filter .15s ease, transform .15s ease;

  &:hover { filter: brightness(${({ $principal }) => ($principal ? 1.1 : 0.97)}); }
  &:active { transform: scale(.97); }
  &:focus-visible { outline: 2px solid ${MORADO}; outline-offset: 2px; }
`;

const Nota = styled.p`
  margin: 0;
  font-size: 11px;
  color: ${TEXTO_TENUE};
`;
