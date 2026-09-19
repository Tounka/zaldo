import styled from "styled-components";

const ContenedorMarkdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
  font-size: ${({ $fontSize }) => $fontSize || "11.5px"};
  line-height: 1.45;
  color: ${({ $color }) => $color || "#453859"};

  ul, ol {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  li {
    margin: 0;
    padding: 0;
  }

  p {
    margin: 0;
  }

  strong {
    font-weight: 700;
    color: ${({ $colorFuerte }) => $colorFuerte || "#281b3d"};
  }

  em {
    font-style: italic;
    color: ${({ $colorEm }) => $colorEm || "#6c538c"};
  }

  code {
    font-family: monospace;
    background: rgba(83, 59, 143, 0.08);
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 0.9em;
  }
`;

/**
 * Parsea fragmentos en línea para negritas (**texto**), cursivas (_texto_ o *texto*) y código (`codigo`)
 */
export const formatearTextoEnLinea = (texto = "") => {
  if (!texto) return null;
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g;
  const partes = String(texto).split(regex);

  return partes.map((parte, index) => {
    if (!parte) return null;
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={index}>{parte.slice(2, -2)}</strong>;
    }
    if ((parte.startsWith("_") && parte.endsWith("_")) || (parte.startsWith("*") && parte.endsWith("*"))) {
      return <em key={index}>{parte.slice(1, -1)}</em>;
    }
    if (parte.startsWith("`") && parte.endsWith("`")) {
      return <code key={index}>{parte.slice(1, -1)}</code>;
    }
    return parte;
  });
};

/**
 * Convierte un texto con markdown a una estructura de bloques (listas y párrafos)
 */
export const renderizarMarkdownConListas = (texto = "", opciones = {}) => {
  if (!texto || typeof texto !== "string") return null;

  const lineas = texto.split("\n");
  const bloques = [];
  let listaActual = null;

  lineas.forEach((lineaCruda) => {
    const linea = lineaCruda.trim();
    if (!linea) {
      if (listaActual) {
        bloques.push(listaActual);
        listaActual = null;
      }
      return;
    }

    // Detectar viñeta no ordenada: - item, * item, • item
    const matchNoOrdenada = linea.match(/^[-*•]\s+(.*)$/);
    // Detectar viñeta ordenada: 1. item, 2. item
    const matchOrdenada = linea.match(/^(\d+)\.\s+(.*)$/);

    if (matchNoOrdenada) {
      if (!listaActual || listaActual.tipo !== "ul") {
        if (listaActual) bloques.push(listaActual);
        listaActual = { tipo: "ul", items: [] };
      }
      listaActual.items.push(matchNoOrdenada[1]);
    } else if (matchOrdenada) {
      if (!listaActual || listaActual.tipo !== "ol") {
        if (listaActual) bloques.push(listaActual);
        listaActual = { tipo: "ol", items: [] };
      }
      listaActual.items.push(matchOrdenada[2]);
    } else {
      if (listaActual) {
        bloques.push(listaActual);
        listaActual = null;
      }
      bloques.push({ tipo: "p", texto: linea });
    }
  });

  if (listaActual) {
    bloques.push(listaActual);
  }

  return (
    <ContenedorMarkdown
      $fontSize={opciones.fontSize}
      $color={opciones.color}
      $colorFuerte={opciones.colorFuerte}
      $colorEm={opciones.colorEm}
      className={opciones.className}
      style={opciones.style}
    >
      {bloques.map((bloque, idx) => {
        if (bloque.tipo === "ul") {
          return (
            <ul key={idx}>
              {bloque.items.map((item, itemIdx) => (
                <li key={itemIdx}>{formatearTextoEnLinea(item)}</li>
              ))}
            </ul>
          );
        }
        if (bloque.tipo === "ol") {
          return (
            <ol key={idx}>
              {bloque.items.map((item, itemIdx) => (
                <li key={itemIdx}>{formatearTextoEnLinea(item)}</li>
              ))}
            </ol>
          );
        }
        return <p key={idx}>{formatearTextoEnLinea(bloque.texto)}</p>;
      })}
    </ContenedorMarkdown>
  );
};
