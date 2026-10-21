import styled from "styled-components";

export const MarcoMadriguera = styled.section`
  position: relative;
  isolation: isolate;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: url("/madriguera/patron-tuneles.webp") repeat;
    background-size: 512px 512px;
    opacity: 0.05;
    pointer-events: none;
  }
`;

export const TopoAsomadoMadriguera = styled.img.attrs({
  src: "/madriguera/topo-agujero.webp", alt: "", "aria-hidden": true,
  width: 100, height: 55, loading: "lazy", decoding: "async",
})`
  position: absolute;
  width: 100px;
  height: auto;
  right: 58px;
  top: -45px;
  pointer-events: none;
  user-select: none;
  @media (max-width: 600px) { width: 76px; top: -32px; right: 52px; }
`;

const VARIANTES = new Set(["camara-monedas", "camara-tarjetas", "camara-despensa", "camara-vacia", "topo-dormido-camara"]);
export const IlustracionMadriguera = ({ variante = "camara-vacia", ancho = 116, style }) => (
  <img src={`/madriguera/${VARIANTES.has(variante) ? variante : "camara-vacia"}.webp`}
    alt="" aria-hidden="true" loading="lazy" decoding="async" width={ancho}
    style={{ display: "block", width: ancho, maxWidth: "100%", height: "auto", margin: "0 auto 12px", pointerEvents: "none", ...style }} />
);

export const SeparadorMadriguera = styled.img.attrs({
  src: "/madriguera/separador.webp", alt: "", "aria-hidden": true,
  loading: "lazy", decoding: "async", width: 1200, height: 164,
})`
  display: block;
  width: 100%;
  height: 16px;
  object-fit: fill;
  opacity: 0.25;
  pointer-events: none;
`;
