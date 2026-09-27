import styled from "styled-components";
import { FaArrowRight, FaDatabase } from "react-icons/fa";
import { ModalEncabezado, ModalGenerico } from "./ModalGenerico";

/*
 * Punto único para cargar y descargar datos de forma masiva en cada módulo:
 * la página muestra solo <BotonDatos /> y todas las opciones viven en <ModalDatos />.
 */

const BotonDatosStyled = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 7px 14px;
  border: 1px solid rgba(83, 59, 143, 0.22);
  border-radius: 9px;
  background: white;
  color: var(--colorMorado);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }

  svg {
    font-size: 13px;
  }

  @media (max-width: 720px) {
    min-height: 40px;
    min-width: 40px;
  }
`;

export const BotonDatos = ({ onClick, etiqueta = "Datos", title = "Cargar o descargar datos" }) => (
  <BotonDatosStyled type="button" onClick={onClick} title={title} aria-haspopup="dialog">
    <FaDatabase />
    <span>{etiqueta}</span>
  </BotonDatosStyled>
);

const Contenido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px 22px;
`;

const Seccion = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TituloSeccion = styled.h4`
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7a7090;
`;

const Opcion = styled.button`
  width: 100%;
  min-height: 64px;
  border: 1px solid ${({ $peligro }) => ($peligro ? "rgba(220, 53, 69, 0.28)" : "rgba(83, 59, 143, 0.15)")};
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: white;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $peligro }) => ($peligro ? "#dc3545" : "var(--colorMorado)")};
    background: ${({ $peligro }) => ($peligro ? "rgba(220, 53, 69, 0.03)" : "rgba(83, 59, 143, 0.03)")};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OpcionInfo = styled.span`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const IconoOpcion = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
`;

const TextosOpcion = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 14px;
    color: #1a1a2e;
  }

  small {
    font-size: 12px;
    color: #666;
    line-height: 1.35;
  }
`;

const Accion = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  flex-shrink: 0;

  svg {
    font-size: 10px;
  }

  @media (max-width: 420px) {
    span {
      display: none;
    }
  }
`;

const COLORES = {
  cargar: { bg: "rgba(83, 59, 143, 0.1)", color: "var(--colorMorado)", accion: "Abrir" },
  descargar: { bg: "rgba(40, 167, 69, 0.12)", color: "#28a745", accion: "Descargar" },
  peligro: { bg: "rgba(220, 53, 69, 0.1)", color: "#dc3545", accion: "Abrir" },
};

const ListaOpciones = ({ titulo, opciones, tipo, onClose }) => {
  const visibles = opciones.filter(Boolean);
  if (visibles.length === 0) return null;

  return (
    <Seccion aria-label={titulo}>
      <TituloSeccion>{titulo}</TituloSeccion>
      {visibles.map((opcion) => {
        const estilo = COLORES[opcion.peligro ? "peligro" : tipo];
        return (
          <Opcion
            key={opcion.id}
            type="button"
            $peligro={opcion.peligro}
            disabled={opcion.deshabilitado}
            onClick={() => {
              onClose?.();
              opcion.onClick?.();
            }}
          >
            <OpcionInfo>
              <IconoOpcion $bg={estilo.bg} $color={estilo.color}>{opcion.icono}</IconoOpcion>
              <TextosOpcion>
                <strong>{opcion.titulo}</strong>
                {opcion.descripcion && <small>{opcion.descripcion}</small>}
              </TextosOpcion>
            </OpcionInfo>
            <Accion $color={estilo.color}>
              <span>{opcion.textoAccion || estilo.accion}</span>
              <FaArrowRight />
            </Accion>
          </Opcion>
        );
      })}
    </Seccion>
  );
};

/**
 * @param cargar    Opciones que traen datos a la app: [{ id, titulo, descripcion, icono, onClick, peligro?, deshabilitado?, textoAccion? }]
 * @param descargar Opciones que exportan datos, con la misma forma.
 */
export const ModalDatos = ({
  isOpen,
  onClose,
  titulo = "Datos",
  descripcion = "Carga o descarga tu información de forma masiva.",
  cargar = [],
  descargar = [],
}) => (
  <ModalGenerico
    isOpen={isOpen}
    onClose={onClose}
    maxAncho="500px"
    encabezado={<ModalEncabezado icon={<FaDatabase />} title={titulo} description={descripcion} />}
  >
    <Contenido>
      <ListaOpciones titulo="Cargar" opciones={cargar} tipo="cargar" onClose={onClose} />
      <ListaOpciones titulo="Descargar" opciones={descargar} tipo="descargar" onClose={onClose} />
    </Contenido>
  </ModalGenerico>
);
