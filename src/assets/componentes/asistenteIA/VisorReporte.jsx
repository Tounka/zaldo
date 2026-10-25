import { useEffect, useRef } from "react";
import styled from "styled-components";
import { motion as Motion } from "framer-motion";
import { FiCode, FiPrinter, FiX } from "react-icons/fi";
import { descargarHTMLReporte, imprimirReporte } from "./reporteArchivo";

/*
 * Reporte a pantalla completa. El HTML va en un iframe aislado (sandbox sin
 * allow-same-origin): sus scripts dibujan las gráficas y la navegación, pero
 * no pueden leer la sesión ni el DOM de la app.
 *
 * Queda por encima de todo (también de los modales) y se cierra con Esc o
 * con la X. Dentro del reporte se navega con las flechas.
 */

const Z_VISOR = 12000;

export const VisorReporte = ({ reporte, alCerrar }) => {
  const marcoRef = useRef(null);

  useEffect(() => {
    const alPresionar = (evento) => {
      if (evento.key === "Escape") alCerrar();
    };
    window.addEventListener("keydown", alPresionar);
    // El foco al reporte: así las flechas cambian de diapositiva sin hacer clic.
    const temporizador = setTimeout(() => marcoRef.current?.focus(), 250);
    const desbordeAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPresionar);
      clearTimeout(temporizador);
      document.body.style.overflow = desbordeAnterior;
    };
  }, [alCerrar]);

  return (
    <Fondo
      role="dialog"
      aria-modal="true"
      aria-label={reporte.titulo}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Barra>
        <TituloBarra>
          <strong>{reporte.nombre}</strong>
          <span>{reporte.periodo}</span>
        </TituloBarra>
        <BotonBarra type="button" onClick={() => imprimirReporte(reporte)} title="Abre la impresión: elige “Guardar como PDF”">
          <FiPrinter aria-hidden="true" /> <span>PDF</span>
        </BotonBarra>
        <BotonBarra type="button" onClick={() => descargarHTMLReporte(reporte)} title="Descargar HTML">
          <FiCode aria-hidden="true" /> <span>HTML</span>
        </BotonBarra>
        <BotonBarra type="button" $cerrar onClick={alCerrar} aria-label="Cerrar reporte" title="Cerrar (Esc)">
          <FiX aria-hidden="true" />
        </BotonBarra>
      </Barra>
      <Marco
        ref={marcoRef}
        title={reporte.titulo}
        srcDoc={reporte.html}
        sandbox="allow-scripts"
        allow="fullscreen"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      />
      <Ayuda>Usa ← → para cambiar de diapositiva</Ayuda>
    </Fondo>
  );
};

/* =======================
   ESTILOS
======================= */

const Fondo = styled(Motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${Z_VISOR};
  display: flex;
  flex-direction: column;
  background: #0f0e13;
`;

const Barra = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 8px 16px;
  padding-top: max(8px, env(safe-area-inset-top));
  color: #f4f3f7;
`;

const TituloBarra = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;

  strong { font-size: 14px; font-weight: 650; white-space: nowrap; }
  span { font-size: 12px; color: #a9a7b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  @media (max-width: 600px) { span { display: none; } }
`;

const BotonBarra = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, .14);
  background: ${({ $cerrar }) => ($cerrar ? "rgba(255, 255, 255, .12)" : "transparent")};
  color: #f4f3f7;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s ease;

  &:hover { background: rgba(255, 255, 255, .18); }
  &:focus-visible { outline: 2px solid #b9a8ef; outline-offset: 2px; }

  @media (max-width: 420px) { span { display: none; } }
`;

const Marco = styled(Motion.iframe)`
  flex: 1;
  width: 100%;
  border: 0;
  background: #fcfcfb;
`;

const Ayuda = styled.div`
  padding: 6px 16px max(6px, env(safe-area-inset-bottom));
  font-size: 11px;
  color: #8e8d97;
  text-align: center;

  @media (hover: none) { display: none; }
`;
