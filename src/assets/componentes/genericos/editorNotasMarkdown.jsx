import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { FaMarkdown, FaPen, FaCheck, FaListUl, FaBold, FaPlus } from "react-icons/fa";
import { renderizarMarkdownConListas } from "../../funciones/utils/markdown";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 26px;
`;

const Etiqueta = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: #2f2147;
  font-size: 12.5px;
  font-weight: 800;

  svg {
    flex-shrink: 0;
    color: var(--colorMorado);
  }
`;

const Acciones = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const BotonMini = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border: 1.5px solid ${({ $primario }) => ($primario ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.35)")};
  border-radius: 7px;
  background: ${({ $primario }) => ($primario ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $primario }) => ($primario ? "#ffffff" : "#3b2a63")};
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  svg {
    font-size: 10px;
  }

  &:hover {
    border-color: var(--colorMorado);
    background: ${({ $primario }) => ($primario ? "#45307a" : "rgba(83, 59, 143, 0.08)")};
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const AreaTexto = styled.textarea`
  width: 100%;
  min-height: ${({ $alturaMinima }) => $alturaMinima}px;
  box-sizing: border-box;
  resize: vertical;
  border: 1.5px solid rgba(83, 59, 143, 0.4);
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  color: #1d1529;
  font-family: "SF Mono", "Fira Code", ui-monospace, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  outline: none;

  &::placeholder {
    color: #85779a;
  }

  &:focus {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.15);
  }
`;

const Vista = styled.div`
  min-height: ${({ $alturaMinima }) => Math.round($alturaMinima * 0.5)}px;
  max-height: ${({ $alturaMaxima }) => $alturaMaxima}px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.25);
  border-radius: 10px;
  background: #ffffff;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const VistaVacia = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 52px;
  padding: 10px 12px;
  border: 1.5px dashed rgba(83, 59, 143, 0.35);
  border-radius: 10px;
  background: #faf8fd;
  color: #4a3a66;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  svg {
    font-size: 10px;
  }

  &:hover {
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.06);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const Ayuda = styled.small`
  color: #5f5271;
  font-size: 10.5px;
  line-height: 1.35;
`;

const OPCIONES_MARKDOWN = {
  fontSize: "12.5px",
  color: "#241a33",
  colorFuerte: "#140d22",
  colorEm: "#5b3f86",
};

/**
 * Notas en markdown que se leen renderizadas y solo se vuelven textarea al
 * pulsar "Editar". Escape o "Listo" regresan a la vista.
 */
export const EditorNotasMarkdown = ({
  id,
  value = "",
  onChange,
  etiqueta = "Notas",
  placeholder = "Ej.\n- Primera nota\n- **Importante**",
  textoVacio = "Agregar notas",
  editandoInicial = false,
  alturaMinima = 110,
  alturaMaxima = 220,
}) => {
  const [editando, setEditando] = useState(editandoInicial);
  const textareaRef = useRef(null);
  // Solo se enfoca cuando el usuario pidió editar: al abrir el modal en
  // celular un foco automático subiría el teclado encima de todo.
  const enfocarRef = useRef(false);

  useEffect(() => {
    if (!editando || !enfocarRef.current) return;
    enfocarRef.current = false;
    const area = textareaRef.current;
    if (!area) return;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }, [editando]);

  const abrirEdicion = () => {
    enfocarRef.current = true;
    setEditando(true);
  };

  // Inserta en el cursor, no al final, para poder agregar viñetas a mitad de la nota.
  const insertar = (antes, despues = "") => {
    const area = textareaRef.current;
    const inicio = area ? area.selectionStart : value.length;
    const fin = area ? area.selectionEnd : value.length;
    const seleccion = value.slice(inicio, fin);
    const nuevo = `${value.slice(0, inicio)}${antes}${seleccion}${despues}${value.slice(fin)}`;
    onChange?.(nuevo);
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      const cursor = inicio + antes.length + seleccion.length;
      area.setSelectionRange(cursor, cursor);
    });
  };

  const insertarVineta = () => {
    const area = textareaRef.current;
    const inicio = area ? area.selectionStart : value.length;
    const alInicioDeLinea = inicio === 0 || value[inicio - 1] === "\n";
    insertar(alInicioDeLinea ? "- " : "\n- ");
  };

  const alPresionarTecla = (evento) => {
    if (evento.key === "Escape") {
      // Que el modal no se cierre: Escape solo sale del modo edición.
      evento.preventDefault();
      evento.stopPropagation();
      setEditando(false);
    }
  };

  const tieneTexto = Boolean(value.trim());

  return (
    <Contenedor>
      <Cabecera>
        <Etiqueta htmlFor={editando ? id : undefined} as={editando ? "label" : "span"}>
          <FaMarkdown aria-hidden="true" />
          {etiqueta}
        </Etiqueta>
        <Acciones>
          {editando ? (
            <>
              <BotonMini type="button" onClick={insertarVineta} title="Agregar viñeta (- )">
                <FaListUl /> Viñeta
              </BotonMini>
              <BotonMini type="button" onClick={() => insertar("**", "**")} title="Negrita (**texto**)" aria-label="Negrita">
                <FaBold />
              </BotonMini>
              <BotonMini type="button" $primario onClick={() => setEditando(false)}>
                <FaCheck /> Listo
              </BotonMini>
            </>
          ) : (
            tieneTexto && (
              <BotonMini type="button" onClick={abrirEdicion}>
                <FaPen /> Editar
              </BotonMini>
            )
          )}
        </Acciones>
      </Cabecera>

      {editando ? (
        <>
          <AreaTexto
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(evento) => onChange?.(evento.target.value)}
            onKeyDown={alPresionarTecla}
            placeholder={placeholder}
            $alturaMinima={alturaMinima}
          />
          <Ayuda>
            Usa <b>- </b> para viñetas, <b>**negrita**</b>, <b>_cursiva_</b> y <b># </b> para títulos. Esc para ver el resultado.
          </Ayuda>
        </>
      ) : tieneTexto ? (
        <Vista $alturaMinima={alturaMinima} $alturaMaxima={alturaMaxima}>
          {renderizarMarkdownConListas(value, OPCIONES_MARKDOWN)}
        </Vista>
      ) : (
        <VistaVacia type="button" onClick={abrirEdicion}>
          <FaPlus aria-hidden="true" /> {textoVacio}
        </VistaVacia>
      )}
    </Contenedor>
  );
};
