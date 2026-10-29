import { useLayoutEffect, useMemo, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";

// Se anima una sola vez por sesión; al cambiar de periodo los bloques solo se reacomodan.
let entradaReproducida = false;

const HUECO = 6;

const entrar = keyframes`
  from { opacity: 0; transform: scale(0.82); }
  to   { opacity: 1; transform: scale(1); }
`;

const Lienzo = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const Bloque = styled.button`
  position: absolute;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background-color: ${({ $color }) => $color};
  background-image:
    linear-gradient(160deg, ${({ $color }) => `${$color}b3`} 0%, ${({ $color }) => `${$color}e6`} 60%, rgba(15, 10, 30, 0.6) 100%),
    url(${({ $imagen }) => $imagen});
  background-size: cover;
  background-position: center;
  color: #ffffff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 6px 14px -8px rgba(20, 10, 40, 0.45);
  transition: left 0.5s cubic-bezier(0.16, 1, 0.3, 1), top 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.5s cubic-bezier(0.16, 1, 0.3, 1), height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.15s ease;
  transform-origin: center;
  ${({ $animar, $retraso }) => $animar && css`
    animation: ${entrar} 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: ${$retraso}s;
  `}

  &:hover { filter: brightness(1.08) saturate(1.1); z-index: 1; }
  &:focus-visible { outline: 3px solid var(--colorMorado); outline-offset: 2px; z-index: 1; }
`;

const Contenido = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  padding: ${({ $compacto }) => ($compacto ? "8px" : "12px 14px")};
  box-sizing: border-box;
  min-width: 0;
`;

const Cabeza = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  strong {
    min-width: 0;
    overflow: hidden;
    font-size: ${({ $grande }) => ($grande ? "15px" : "12px")};
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
`;

const Icono = styled.span`
  flex: 0 0 auto;
  width: ${({ $grande }) => ($grande ? "32px" : "24px")};
  height: ${({ $grande }) => ($grande ? "32px" : "24px")};
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(4px);
  font-size: ${({ $grande }) => ($grande ? "15px" : "11px")};
`;

const Cifras = styled.span`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;

  span {
    overflow: hidden;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: ${({ $grande }) => ($grande ? "14px" : "11px")};
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.95;
  }

  b {
    flex: 0 0 auto;
    font-size: ${({ $grande }) => ($grande ? "30px" : "17px")};
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
`;

const Porcion = styled.span`
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  width: ${({ $porcentaje }) => $porcentaje}%;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 0 4px 0 0;
`;

const SoloIcono = styled.span`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 14px;
`;

const peor = (fila, lado) => {
  const suma = fila.reduce((acc, item) => acc + item.area, 0);
  const max = Math.max(...fila.map((item) => item.area));
  const min = Math.min(...fila.map((item) => item.area));
  return Math.max((lado * lado * max) / (suma * suma), (suma * suma) / (lado * lado * min));
};

// Treemap "squarified" (Bruls et al.): bloques lo más cuadrados posible.
const squarify = (items, ancho, alto) => {
  const total = items.reduce((acc, item) => acc + item.valor, 0);
  if (!total || ancho <= 0 || alto <= 0) return [];
  const escala = (ancho * alto) / total;
  const pendientes = items.map((item) => ({ ...item, area: item.valor * escala }));
  const resultado = [];
  let x = 0;
  let y = 0;
  let w = ancho;
  let h = alto;

  while (pendientes.length) {
    const lado = Math.min(w, h);
    const fila = [pendientes.shift()];
    while (pendientes.length && peor([...fila, pendientes[0]], lado) <= peor(fila, lado)) {
      fila.push(pendientes.shift());
    }
    const suma = fila.reduce((acc, item) => acc + item.area, 0);
    if (w >= h) {
      const anchoFila = suma / h;
      let cursor = y;
      fila.forEach((item) => {
        const altoItem = item.area / anchoFila;
        resultado.push({ ...item, x, y: cursor, w: anchoFila, h: altoItem });
        cursor += altoItem;
      });
      x += anchoFila;
      w -= anchoFila;
    } else {
      const altoFila = suma / w;
      let cursor = x;
      fila.forEach((item) => {
        const anchoItem = item.area / altoFila;
        resultado.push({ ...item, x: cursor, y, w: anchoItem, h: altoFila });
        cursor += anchoItem;
      });
      y += altoFila;
      h -= altoFila;
    }
  }
  return resultado;
};

export const MosaicoCategorias = ({ datos, formatear, onSeleccionar }) => {
  const lienzoRef = useRef(null);
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [animar] = useState(() => !entradaReproducida);

  useLayoutEffect(() => {
    const nodo = lienzoRef.current;
    if (!nodo) return undefined;
    const medir = () => setMedida({ ancho: nodo.clientWidth, alto: nodo.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (animar && medida.ancho) entradaReproducida = true;
  }, [animar, medida.ancho]);

  const total = useMemo(() => datos.reduce((acc, item) => acc + item.size, 0), [datos]);
  const bloques = useMemo(
    () => squarify(
      datos.map((item) => ({ ...item, valor: item.size })),
      medida.ancho + HUECO,
      medida.alto + HUECO
    ),
    [datos, medida.ancho, medida.alto]
  );

  return (
    <Lienzo ref={lienzoRef}>
      {bloques.map((bloque, indice) => {
        const ancho = Math.max(0, bloque.w - HUECO);
        const alto = Math.max(0, bloque.h - HUECO);
        const porcentaje = total ? (bloque.size / total) * 100 : 0;
        const textoPorcentaje = `${porcentaje < 1 ? porcentaje.toFixed(1) : Math.round(porcentaje)}%`;
        const grande = ancho > 220 && alto > 130;
        const conTexto = ancho > 92 && alto > 62;
        const IconoCategoria = bloque.icon;
        const etiqueta = `${bloque.name}: ${formatear(bloque.size)} (${textoPorcentaje})`;

        return (
          <Bloque
            key={bloque.categoria}
            type="button"
            title={etiqueta}
            aria-label={`${etiqueta}. Ver movimientos`}
            $color={bloque.fill}
            $imagen={obtenerImagenCategoriaCompra(bloque.categoria)}
            $animar={animar}
            $retraso={Math.min(indice, 8) * 0.06}
            style={{ left: bloque.x, top: bloque.y, width: ancho, height: alto }}
            onClick={() => onSeleccionar?.(bloque.categoria)}
          >
            {conTexto ? (
              <Contenido $compacto={!grande}>
                <Cabeza $grande={grande}>
                  {IconoCategoria && <Icono $grande={grande}><IconoCategoria aria-hidden="true" /></Icono>}
                  <strong>{bloque.name}</strong>
                </Cabeza>
                <Cifras $grande={grande}>
                  <span>{formatear(bloque.size)}</span>
                  <b>{textoPorcentaje}</b>
                </Cifras>
              </Contenido>
            ) : (
              <SoloIcono>{IconoCategoria ? <IconoCategoria aria-hidden="true" /> : textoPorcentaje}</SoloIcono>
            )}
            <Porcion $porcentaje={porcentaje} aria-hidden="true" />
          </Bloque>
        );
      })}
    </Lienzo>
  );
};
