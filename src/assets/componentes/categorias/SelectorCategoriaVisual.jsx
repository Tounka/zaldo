import styled from "styled-components";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";

export const CategoriaGridModal = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding-top: 18px;

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`;

export const CategoriaOpcionModal = styled.button`
  position: relative;
  min-width: 0;
  min-height: 108px;
  aspect-ratio: 1.18;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#e2dcef")};
  border-radius: 14px;
  background: #30215f;
  box-shadow: ${({ $activo }) => ($activo
    ? "0 0 0 3px rgba(83, 59, 143, .18), 0 8px 18px rgba(53, 37, 96, .18)"
    : "0 5px 14px rgba(53, 37, 96, .11)")};
  cursor: pointer;
  isolation: isolate;
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;

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
    box-shadow: 0 10px 20px rgba(53, 37, 96, .2);
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
  padding: 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, .97);
  color: #30244a;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.15;
  text-align: left;
  box-shadow: 0 3px 10px rgba(18, 12, 43, .18);
`;

export const SelectorCategoriaVisual = ({ value = "", onChange, categorias = categoriasEsqueleto, permitirSinCategoria = true }) => (
  <CategoriaGridModal role="listbox" aria-label="Categorías disponibles">
    {permitirSinCategoria && (
      <CategoriaOpcionModal
        type="button"
        role="option"
        aria-selected={!value}
        $activo={!value}
        onClick={() => onChange("")}
      >
        <CategoriaImagenModal src={obtenerImagenCategoriaCompra("")} alt="" />
        <CategoriaEtiquetaModal>Sin categoría</CategoriaEtiquetaModal>
      </CategoriaOpcionModal>
    )}
    {categorias.map((categoria) => (
      <CategoriaOpcionModal
        key={categoria.value}
        type="button"
        role="option"
        aria-selected={value === categoria.value}
        $activo={value === categoria.value}
        onClick={() => onChange(value === categoria.value ? "" : categoria.value)}
      >
        <CategoriaImagenModal src={obtenerImagenCategoriaCompra(categoria.value)} alt="" />
        <CategoriaEtiquetaModal>{categoria.label}</CategoriaEtiquetaModal>
      </CategoriaOpcionModal>
    ))}
  </CategoriaGridModal>
);
