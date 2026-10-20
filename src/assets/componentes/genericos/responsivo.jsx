import { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import { FaCheck, FaChevronDown } from "react-icons/fa";
import { MEDIA_ESCRITORIO, MEDIA_MOVIL } from "./responsivoEstilos";

/*
 * Piezas para compactar pantallas en el teléfono sin tocar el escritorio.
 *
 * En celular cada fila de pestañas, filtros o tarjetas es un "nivel" más que
 * hay que recorrer antes de llegar al contenido. Aquí viven dos formas de
 * resumirlos, con el mismo look del selector de vistas de Despensa:
 *
 *  - SelectorVistaMovil: una fila de pestañas se vuelve un solo botón
 *    desplegable. La página oculta sus pestañas con `ocultarEnMovil`
 *    (responsivoEstilos.js).
 *  - DesplegableMovil: un bloque (KPIs, filtros) queda detrás de una línea
 *    de resumen que se abre al tocarla. En escritorio se ve siempre, sin
 *    encabezado.
 */

export const SoloMovil = styled.div`
  ${MEDIA_ESCRITORIO} {
    display: none !important;
  }
`;

const useCerrarAlSalir = (abierto, cerrar) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alTocarFuera = (evento) => {
      if (ref.current && !ref.current.contains(evento.target)) cerrar();
    };
    const alPresionar = (evento) => {
      if (evento.key === "Escape") cerrar();
    };
    document.addEventListener("pointerdown", alTocarFuera);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("pointerdown", alTocarFuera);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto, cerrar]);

  return ref;
};

/*
 * opciones: [{ id, etiqueta, icono?, color?, contador? }]
 * acciones: [{ id, etiqueta, icono?, onClick }] — van al final, separadas
 * (p. ej. "Nueva empresa").
 */
export const SelectorVistaMovil = ({
  opciones = [],
  valor,
  onCambiar,
  titulo = "Vistas",
  acciones = [],
  ancho = "100%",
  className,
  ...resto
}) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarAlSalir(abierto, () => setAbierto(false));
  const idMenu = useId();
  const actual = opciones.find((opcion) => opcion.id === valor) || opciones[0];

  if (!actual) return null;

  return (
    <EnvolturaSelector ref={ref} className={className} $ancho={ancho} {...resto}>
      <BotonSelector
        type="button"
        $abierto={abierto}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((previo) => !previo)}
      >
        <IconoOpcion $color={actual.color}>{actual.icono || <Punto $color={actual.color} />}</IconoOpcion>
        <span className="etiqueta">
          <small>{titulo}</small>
          {actual.etiqueta}
        </span>
        <FaChevronDown className="chevron" aria-hidden="true" />
      </BotonSelector>

      <Menu id={idMenu} role="menu" $abierto={abierto}>
        {opciones.map((opcion) => {
          const activa = opcion.id === actual.id;
          return (
            <Opcion
              key={opcion.id}
              type="button"
              role="menuitemradio"
              aria-checked={activa}
              $activo={activa}
              $color={opcion.color}
              onClick={() => {
                setAbierto(false);
                if (!activa) onCambiar?.(opcion.id);
              }}
            >
              <IconoOpcion $color={opcion.color}>{opcion.icono || <Punto $color={opcion.color} />}</IconoOpcion>
              <span className="etiqueta">{opcion.etiqueta}</span>
              {opcion.contador !== undefined && <Contador>{opcion.contador}</Contador>}
              {activa && <FaCheck className="check" aria-hidden="true" />}
            </Opcion>
          );
        })}

        {acciones.length > 0 && <Separador />}
        {acciones.map((accion) => (
          <Opcion
            key={accion.id}
            type="button"
            role="menuitem"
            $accion
            onClick={() => {
              setAbierto(false);
              accion.onClick?.();
            }}
          >
            <IconoOpcion>{accion.icono}</IconoOpcion>
            <span className="etiqueta">{accion.etiqueta}</span>
          </Opcion>
        ))}
      </Menu>
    </EnvolturaSelector>
  );
};

/*
 * En escritorio pinta `children` tal cual. En celular muestra una línea con
 * el título y un resumen corto (p. ej. el monto principal) y despliega el
 * contenido al tocarla.
 */
export const DesplegableMovil = ({
  titulo,
  resumen,
  icono,
  inicialAbierto = false,
  children,
  className,
  ...resto
}) => {
  const [abierto, setAbierto] = useState(inicialAbierto);
  const idContenido = useId();

  return (
    <EnvolturaDesplegable className={className} $abierto={abierto} {...resto}>
      <EncabezadoDesplegable
        type="button"
        aria-expanded={abierto}
        aria-controls={idContenido}
        onClick={() => setAbierto((previo) => !previo)}
      >
        {icono && <span className="icono" aria-hidden="true">{icono}</span>}
        <span className="titulo">{titulo}</span>
        {resumen !== undefined && resumen !== null && <span className="resumen">{resumen}</span>}
        <FaChevronDown className="chevron" aria-hidden="true" />
      </EncabezadoDesplegable>
      <ContenidoDesplegable id={idContenido} $abierto={abierto}>
        {children}
      </ContenidoDesplegable>
    </EnvolturaDesplegable>
  );
};

/* =======================
   ESTILOS
======================= */

const MORADO = "var(--colorMorado, #533b8f)";

const EnvolturaSelector = styled.div`
  position: relative;
  width: ${({ $ancho }) => $ancho};
  min-width: 0;

  ${MEDIA_ESCRITORIO} {
    display: none;
  }
`;

const BotonSelector = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 8px;
  border: 1.5px solid ${({ $abierto }) => ($abierto ? MORADO : "rgba(83, 59, 143, 0.22)")};
  border-radius: 12px;
  background: #ffffff;
  color: #211b38;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.06);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  .etiqueta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    small {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #8a88a0;
    }
  }

  .chevron {
    flex-shrink: 0;
    font-size: 11px;
    color: #8a88a0;
    transition: transform 0.2s ease;
    transform: rotate(${({ $abierto }) => ($abierto ? "180deg" : "0deg")});
  }

  &:focus-visible {
    outline: 2px solid ${MORADO};
    outline-offset: 2px;
  }
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 1000;
  max-height: min(60dvh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(33, 27, 56, 0.16), 0 2px 8px rgba(83, 59, 143, 0.06);
  transform-origin: top center;
  opacity: ${({ $abierto }) => ($abierto ? 1 : 0)};
  transform: ${({ $abierto }) => ($abierto ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)")};
  pointer-events: ${({ $abierto }) => ($abierto ? "auto" : "none")};
  visibility: ${({ $abierto }) => ($abierto ? "visible" : "hidden")};
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
`;

const IconoOpcion = styled.span`
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  font-size: 14px;
  color: ${({ $color }) => $color || MORADO};
  background: ${({ $color }) => ($color ? `color-mix(in srgb, ${$color} 14%, white)` : "rgba(83, 59, 143, 0.09)")};
`;

const Punto = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $color }) => $color || MORADO};
`;

const Opcion = styled.button`
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: none;
  border-radius: 9px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.08)" : "transparent")};
  color: ${({ $activo, $accion }) => ($activo || $accion ? MORADO : "#211b38")};
  font-size: 13.5px;
  font-weight: ${({ $activo }) => ($activo ? 700 : 600)};
  text-align: left;
  cursor: pointer;

  .etiqueta {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check {
    flex-shrink: 0;
    font-size: 12px;
    color: ${MORADO};
  }

  &:hover,
  &:focus-visible {
    background: rgba(83, 59, 143, 0.07);
    outline: none;
  }
`;

const Contador = styled.span`
  min-width: 22px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(83, 59, 143, 0.08);
  color: ${MORADO};
  font-size: 11px;
  font-weight: 700;
  text-align: center;
`;

const Separador = styled.hr`
  margin: 6px 4px;
  border: none;
  border-top: 1px solid rgba(83, 59, 143, 0.1);
`;

const EnvolturaDesplegable = styled.section`
  min-width: 0;

  ${MEDIA_MOVIL} {
    border: 1px solid rgba(83, 59, 143, 0.12);
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
    overflow: hidden;
  }
`;

const EncabezadoDesplegable = styled.button`
  display: none;

  ${MEDIA_MOVIL} {
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: #211b38;
    text-align: left;
    cursor: pointer;
  }

  .icono {
    display: grid;
    place-items: center;
    color: ${MORADO};
    font-size: 14px;
  }

  .titulo {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #6b6a75;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .resumen {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 800;
    color: ${MORADO};
    font-variant-numeric: tabular-nums;
  }

  .chevron {
    flex-shrink: 0;
    font-size: 11px;
    color: #8a88a0;
    transition: transform 0.2s ease;
  }

  &[aria-expanded="true"] .chevron {
    transform: rotate(180deg);
  }

  &:focus-visible {
    outline: 2px solid ${MORADO};
    outline-offset: -2px;
  }
`;

const ContenidoDesplegable = styled.div`
  ${MEDIA_MOVIL} {
    display: ${({ $abierto }) => ($abierto ? "block" : "none")};
    padding: 0 8px 8px;
  }
`;
