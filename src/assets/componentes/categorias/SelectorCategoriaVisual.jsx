import { useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaCheck, FaChevronDown } from "react-icons/fa";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";

const ContenedorSelector = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CabeceraDesplegable = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0 4px;
`;

const TituloDesplegable = styled.span`
  color: #4b3874;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const BotonCerrarX = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1.5px solid #5a4484;
  border-radius: 8px;
  background: #ffffff;
  color: #3b2865;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(48, 33, 95, 0.1);
  transition: all 0.15s ease;

  &:hover {
    background: #f3effc;
    border-color: var(--colorMorado);
    color: var(--colorMorado);
    transform: scale(1.02);
  }

  svg {
    font-size: 11px;
  }
`;

export const CategoriaGridModal = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding-top: 4px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`;

export const CategoriaOpcionModal = styled(motion.button)`
  position: relative;
  min-width: 0;
  min-height: 108px;
  aspect-ratio: 1.18;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 2px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#503d77")};
  border-radius: 14px;
  background: #30215f;
  box-shadow: ${({ $activo }) => ($activo
    ? "0 0 0 3px rgba(83, 59, 143, .28), 0 8px 20px rgba(53, 37, 96, .26)"
    : "0 5px 14px rgba(53, 37, 96, .14)")};
  cursor: pointer;
  isolation: isolate;
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg, transparent 34%, rgba(23, 15, 55, .12) 57%, rgba(23, 15, 55, .42) 100%);
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    outline: none;
    border-color: var(--colorMorado);
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(53, 37, 96, .28);
  }
`;

export const CategoriaImagenModal = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CategoriaEtiquetaModal = styled.span`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  display: block;
  width: fit-content;
  max-width: calc(100% - 16px);
  padding: 5px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, .97);
  color: #30244a;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.15;
  text-align: left;
  box-shadow: 0 3px 10px rgba(18, 12, 43, .22);
`;

const BadgeCheckSeleccionado = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--colorMorado);
  color: #ffffff;
  font-size: 11px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
`;

const TarjetaUnicaWrapper = styled(motion.div)`
  width: 100%;
  display: flex;
  align-items: center;
`;

const TarjetaUnicaBoton = styled.button`
  position: relative;
  width: 100%;
  max-width: 220px;
  min-height: 108px;
  aspect-ratio: 1.18;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 2px solid #503d77;
  border-radius: 14px;
  background: #30215f;
  box-shadow: 0 6px 16px rgba(53, 37, 96, 0.18);
  cursor: pointer;
  isolation: isolate;
  transition: all 0.18s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg, transparent 34%, rgba(23, 15, 55, .12) 57%, rgba(23, 15, 55, .42) 100%);
    pointer-events: none;
  }

  &:hover {
    border-color: var(--colorMorado);
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(53, 37, 96, 0.28);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, .3);
  }

  @media (max-width: 480px) {
    max-width: 180px;
  }
`;

const IndicadorCambiar = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #30244a;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;

  svg {
    font-size: 9px;
  }

  ${TarjetaUnicaBoton}:hover & {
    background: var(--colorMorado);
    color: #ffffff;
  }
`;

const gridAnimacion = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.2, 0.8, 0.2, 1],
      staggerChildren: 0.018,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const cardAnimacion = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.2, 0.8, 0.2, 1],
    },
  },
};

export const SelectorCategoriaVisual = ({
  value = "",
  onChange,
  categorias = categoriasEsqueleto,
  permitirSinCategoria = true,
  desplegadoInicial = false,
}) => {
  const [desplegado, setDesplegado] = useState(desplegadoInicial);

  // Encontrar etiqueta e imagen de la categoría actualmente seleccionada
  const categoriaActual = categorias.find((cat) => cat.value === value);
  const etiquetaSeleccionada = categoriaActual?.label || (value ? value : "Sin categoría");
  const imagenSeleccionada = obtenerImagenCategoriaCompra(value);

  const handleSeleccionar = (nuevoValor) => {
    onChange?.(nuevoValor);
    setDesplegado(false);
  };

  return (
    <ContenedorSelector>
      <AnimatePresence mode="wait" initial={false}>
        {!desplegado ? (
          <TarjetaUnicaWrapper
            key="resumen"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <TarjetaUnicaBoton
              type="button"
              onClick={() => setDesplegado(true)}
              aria-label={`Categoría seleccionada: ${etiquetaSeleccionada}. Toca para cambiar.`}
              aria-expanded="false"
            >
              <IndicadorCambiar>
                Cambiar <FaChevronDown />
              </IndicadorCambiar>
              <CategoriaImagenModal src={imagenSeleccionada} alt="" />
              <CategoriaEtiquetaModal>{etiquetaSeleccionada}</CategoriaEtiquetaModal>
            </TarjetaUnicaBoton>
          </TarjetaUnicaWrapper>
        ) : (
          <motion.div
            key="cuadricula"
            variants={gridAnimacion}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <CabeceraDesplegable>
              <TituloDesplegable>Seleccionar categoría</TituloDesplegable>
              <BotonCerrarX
                type="button"
                onClick={() => setDesplegado(false)}
                aria-label="Cerrar catálogo de categorías"
              >
                <FaTimes /> Cerrar
              </BotonCerrarX>
            </CabeceraDesplegable>

            <CategoriaGridModal role="listbox" aria-label="Categorías disponibles">
              {permitirSinCategoria && (
                <CategoriaOpcionModal
                  variants={cardAnimacion}
                  type="button"
                  role="option"
                  aria-selected={!value}
                  $activo={!value}
                  onClick={() => handleSeleccionar("")}
                >
                  {!value && (
                    <BadgeCheckSeleccionado aria-hidden="true">
                      <FaCheck />
                    </BadgeCheckSeleccionado>
                  )}
                  <CategoriaImagenModal src={obtenerImagenCategoriaCompra("")} alt="" />
                  <CategoriaEtiquetaModal>Sin categoría</CategoriaEtiquetaModal>
                </CategoriaOpcionModal>
              )}
              {categorias.map((categoria) => {
                const activo = value === categoria.value;
                return (
                  <CategoriaOpcionModal
                    key={categoria.value}
                    variants={cardAnimacion}
                    type="button"
                    role="option"
                    aria-selected={activo}
                    $activo={activo}
                    onClick={() => handleSeleccionar(activo ? "" : categoria.value)}
                  >
                    {activo && (
                      <BadgeCheckSeleccionado aria-hidden="true">
                        <FaCheck />
                      </BadgeCheckSeleccionado>
                    )}
                    <CategoriaImagenModal
                      src={obtenerImagenCategoriaCompra(categoria.value)}
                      alt=""
                    />
                    <CategoriaEtiquetaModal>{categoria.label}</CategoriaEtiquetaModal>
                  </CategoriaOpcionModal>
                );
              })}
            </CategoriaGridModal>
          </motion.div>
        )}
      </AnimatePresence>
    </ContenedorSelector>
  );
};
