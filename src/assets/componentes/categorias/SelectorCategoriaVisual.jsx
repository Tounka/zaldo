import { useState, useRef, useEffect } from "react";
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

const CabeceraDesplegable = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0 6px;
`;

const TituloDesplegable = styled.span`
  color: #4b3874;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const BotonCerrarX = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1.5px solid #000000;
  border-radius: 8px;
  background: #ffffff;
  color: #000000;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transition: all 0.15s ease;

  &:hover {
    background: #000000;
    color: #ffffff;
    transform: scale(1.02);
  }

  svg {
    font-size: 11px;
  }
`;

export const CategoriaGridModal = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-top: 4px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`;

export const CategoriaOpcionModal = styled(motion.button)`
  position: relative;
  min-width: 0;
  min-height: 98px;
  aspect-ratio: 1.18;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 2px solid #000000;
  border-radius: 12px;
  background: #231647;
  transform: ${({ $activo }) => ($activo ? "scale(0.98)" : "scale(1)")};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 2px #7c3aed, 0 6px 18px rgba(0, 0, 0, 0.35)"
      : "0 4px 12px rgba(0, 0, 0, 0.18)"};
  cursor: pointer;
  isolation: isolate;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      180deg,
      transparent 32%,
      rgba(15, 10, 35, 0.15) 55%,
      rgba(15, 10, 35, 0.52) 100%
    );
    pointer-events: none;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    box-shadow: ${({ $activo }) =>
      $activo
        ? "0 0 0 2.5px #7c3aed, 0 8px 22px rgba(0, 0, 0, 0.45)"
        : "0 8px 20px rgba(0, 0, 0, 0.28)"};
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
  left: 6px;
  right: 6px;
  bottom: 6px;
  z-index: 2;
  display: block;
  width: fit-content;
  max-width: calc(100% - 12px);
  padding: 3.5px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  color: #1e1538;
  font-size: 10.5px;
  font-weight: 800;
  line-height: 1.15;
  text-align: left;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.1);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BadgeCheckSeleccionado = styled(motion.span)`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--colorMorado, #7c3aed);
  border: 1.5px solid #000000;
  color: #ffffff;
  font-size: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
`;

const TarjetaUnicaWrapper = styled(motion.div)`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
`;

const TarjetaUnicaBoton = styled(motion.button)`
  position: relative;
  width: 100%;
  max-width: 140px;
  min-height: 104px;
  height: 100%;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 2px solid #000000;
  border-radius: 12px;
  background: #30215f;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  isolation: isolate;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      180deg,
      transparent 34%,
      rgba(23, 15, 55, 0.12) 57%,
      rgba(23, 15, 55, 0.42) 100%
    );
    pointer-events: none;
  }

  &:hover {
    border-color: #000000;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.3);
  }

  @media (max-width: 480px) {
    max-width: 118px;
    min-height: 100px;
  }
`;

const IndicadorCambiar = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #1e1538;
  font-size: 9.5px;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;

  svg {
    font-size: 8.5px;
  }

  ${TarjetaUnicaBoton}:hover & {
    background: var(--colorMorado, #7c3aed);
    color: #ffffff;
  }
`;

const gridAnimacion = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.022,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.012,
      staggerDirection: -1,
    },
  },
};

const cardAnimacion = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.86,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 22,
      stiffness: 350,
      mass: 0.75,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.9,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const cabeceraAnimacion = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

export const SelectorCategoriaVisual = ({
  value = "",
  onChange,
  categorias = categoriasEsqueleto,
  permitirSinCategoria = true,
  desplegadoInicial = false,
  desplegado: desplegadoProp,
  onDesplegadoChange,
}) => {
  const [desplegadoInterno, setDesplegadoInterno] = useState(desplegadoInicial);
  const timeoutRef = useRef(null);

  const esControlado = desplegadoProp !== undefined;
  const desplegado = esControlado ? desplegadoProp : desplegadoInterno;

  const setDesplegado = (nuevoEstado) => {
    if (!esControlado) {
      setDesplegadoInterno(nuevoEstado);
    }
    onDesplegadoChange?.(nuevoEstado);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Encontrar etiqueta e imagen de la categoría actualmente seleccionada
  const categoriaActual = categorias.find((cat) => cat.value === value);
  const etiquetaSeleccionada =
    categoriaActual?.label || (value ? value : "Sin categoría");
  const imagenSeleccionada = obtenerImagenCategoriaCompra(value);

  const handleSeleccionar = (nuevoValor) => {
    onChange?.(nuevoValor);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Micro retardo de 160ms para apreciar el .98 de escala y el checkmark
    timeoutRef.current = setTimeout(() => {
      setDesplegado(false);
    }, 160);
  };

  return (
    <ContenedorSelector>
      <AnimatePresence mode="wait" initial={false}>
        {!desplegado ? (
          <TarjetaUnicaWrapper
            key="resumen"
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
          >
            <TarjetaUnicaBoton
              type="button"
              onClick={() => setDesplegado(true)}
              whileHover={{ scale: 1.025, y: -2 }}
              whileTap={{ scale: 0.96 }}
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
            <CabeceraDesplegable
              variants={cabeceraAnimacion}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <TituloDesplegable>Seleccionar categoría</TituloDesplegable>
              <BotonCerrarX
                type="button"
                onClick={() => setDesplegado(false)}
                whileTap={{ scale: 0.94 }}
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
                  animate={{ scale: !value ? 0.98 : 1 }}
                  whileHover={!value ? { scale: 0.98 } : { scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSeleccionar("")}
                >
                  <AnimatePresence>
                    {!value && (
                      <BadgeCheckSeleccionado
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ type: "spring", stiffness: 450, damping: 20 }}
                        aria-hidden="true"
                      >
                        <FaCheck />
                      </BadgeCheckSeleccionado>
                    )}
                  </AnimatePresence>
                  <CategoriaImagenModal
                    src={obtenerImagenCategoriaCompra("")}
                    alt=""
                  />
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
                    animate={{ scale: activo ? 0.98 : 1 }}
                    whileHover={activo ? { scale: 0.98 } : { scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() =>
                      handleSeleccionar(activo ? "" : categoria.value)
                    }
                  >
                    <AnimatePresence>
                      {activo && (
                        <BadgeCheckSeleccionado
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 45 }}
                          transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 20,
                          }}
                          aria-hidden="true"
                        >
                          <FaCheck />
                        </BadgeCheckSeleccionado>
                      )}
                    </AnimatePresence>
                    <CategoriaImagenModal
                      src={obtenerImagenCategoriaCompra(categoria.value)}
                      alt=""
                    />
                    <CategoriaEtiquetaModal>
                      {categoria.label}
                    </CategoriaEtiquetaModal>
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
