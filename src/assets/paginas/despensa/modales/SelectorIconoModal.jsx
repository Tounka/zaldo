import { useState, useMemo } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes, FaCheck, FaImages } from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/ModalGenerico";
import { ICONOS_PAPER_MARIO } from "../iconosDespensa";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  width: 100%;
`;

const BarraBusqueda = styled.div`
  position: relative;
  width: 100%;

  svg.lupa {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #8c84a8;
    font-size: 14px;
  }

  svg.borrar {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #8c84a8;
    cursor: pointer;
    font-size: 14px;
  }
`;

const InputBuscador = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 36px;
  background: #fbf9ff;
  border: 1.5px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  font-size: 14px;
  color: #211b38;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado, #7c3aed);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
    background: #ffffff;
  }
`;

const CarruselCategorias = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
`;

const ChipCategoria = styled.button`
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1.5px solid ${({ $activo }) => ($activo ? "var(--colorMorado, #7c3aed)" : "rgba(83, 59, 143, 0.18)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado, #7c3aed)" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#4b4058")};
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado, #7c3aed);
  }
`;

const GaleriaGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  max-height: 380px;
  overflow-y: auto;
  padding: 4px 2px 10px 2px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbc7e2;
    border-radius: 10px;
  }

  @media (max-width: 500px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
`;

const OpcionStickerBoton = styled(motion.button)`
  position: relative;
  min-width: 0;
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  border: 2.5px solid ${({ $activo }) => ($activo ? "var(--colorMorado, #7c3aed)" : "rgba(83, 59, 143, 0.16)")};
  border-radius: 14px;
  background: #f0f7ff;
  transform: ${({ $activo }) => ($activo ? "scale(0.98)" : "scale(1)")};
  box-shadow: ${({ $activo }) =>
    $activo
      ? "0 0 0 2px #7c3aed, 0 6px 18px rgba(124, 58, 237, 0.35)"
      : "0 3px 10px rgba(0, 0, 0, 0.08)"};
  cursor: pointer;
  isolation: isolate;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover,
  &:focus-visible {
    outline: none;
    border-color: var(--colorMorado, #7c3aed);
    box-shadow: ${({ $activo }) =>
      $activo
        ? "0 0 0 2.5px #7c3aed, 0 8px 22px rgba(124, 58, 237, 0.45)"
        : "0 6px 16px rgba(0, 0, 0, 0.16)"};
  }

  img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease;
  }

  &:hover img {
    transform: scale(1.05);
  }
`;

const BadgeCheckSeleccionado = styled(motion.span)`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--colorMorado, #7c3aed);
  border: 2px solid #ffffff;
  color: #ffffff;
  font-size: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
`;

const FondoEtiquetaModal = styled.span`
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 5px;
  z-index: 3;
  display: block;
  width: fit-content;
  max-width: calc(100% - 10px);
  margin: 0 auto;
  padding: 2.5px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  color: #211b38;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(4px);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EstadoVacio = styled.div`
  text-align: center;
  padding: 30px 10px;
  color: #8c84a8;
  font-size: 13px;
  grid-column: 1 / -1;
`;

export const SelectorIconoModal = ({ abierto, onClose, onSelect, iconoSeleccionado }) => {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");

  const categorias = useMemo(() => {
    const cats = new Set(["Todos"]);
    ICONOS_PAPER_MARIO.forEach((item) => {
      if (item.categoria) cats.add(item.categoria);
    });
    return Array.from(cats);
  }, []);

  const iconosFiltrados = useMemo(() => {
    return ICONOS_PAPER_MARIO.filter((item) => {
      if (categoriaActiva !== "Todos" && item.categoria !== categoriaActiva) {
        return false;
      }
      if (!busqueda) return true;
      const q = busqueda.toLowerCase().trim();
      const coincideNombre = item.nombre?.toLowerCase().includes(q);
      const coincideKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return coincideNombre || coincideKeywords;
    });
  }, [busqueda, categoriaActiva]);

  if (!abierto) return null;

  return (
    <ModalGenerico
      isOpen={abierto}
      abierto={abierto}
      onClose={onClose}
      maxAncho="520px"
      encabezado={(
        <ModalEncabezado
          icon={<FaImages />}
          title="Stickers de Despensa"
          description="Selecciona un sticker ilustrado para identificar tu producto en la despensa."
          onCerrar={onClose}
        />
      )}
    >
      <Contenedor>
        {/* Buscador de stickers */}
        <BarraBusqueda>
          <FaSearch className="lupa" />
          <InputBuscador
            type="text"
            placeholder="Buscar sticker (ej. atún, salsa, elote)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          {busqueda && <FaTimes className="borrar" onClick={() => setBusqueda("")} />}
        </BarraBusqueda>

        {/* Categorías */}
        <CarruselCategorias>
          {categorias.map((cat) => (
            <ChipCategoria
              key={cat}
              type="button"
              $activo={categoriaActiva === cat}
              onClick={() => setCategoriaActiva(cat)}
            >
              {cat}
            </ChipCategoria>
          ))}
        </CarruselCategorias>

        {/* Grid de stickers */}
        <GaleriaGrid role="listbox" aria-label="Stickers de Despensa disponibles">
          {iconosFiltrados.length === 0 ? (
            <EstadoVacio>
              No se encontraron stickers con esa búsqueda.
            </EstadoVacio>
          ) : (
            iconosFiltrados.map((item) => {
              const activo = iconoSeleccionado === item.ruta;
              return (
                <OpcionStickerBoton
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={activo}
                  $activo={activo}
                  whileHover={activo ? { scale: 0.98 } : { scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelect(item.ruta);
                    onClose();
                  }}
                  title={item.nombre}
                >
                  <AnimatePresence>
                    {activo && (
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

                  <img
                    src={item.ruta}
                    alt={item.nombre}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/despensa/iconos/atun.jpg";
                    }}
                  />
                  <FondoEtiquetaModal>{item.nombre}</FondoEtiquetaModal>
                </OpcionStickerBoton>
              );
            })
          )}
        </GaleriaGrid>
      </Contenedor>
    </ModalGenerico>
  );
};
