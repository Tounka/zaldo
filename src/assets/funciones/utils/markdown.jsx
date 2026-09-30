import styled from "styled-components";

const ContenedorMarkdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  /* URLs y palabras largas (números de cuenta, correos) rompían el ancho de la tarjeta. */
  overflow-wrap: anywhere;
  word-break: break-word;
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
    min-width: 0;
  }

  li::marker {
    color: ${({ $colorEm }) => $colorEm || "#6c538c"};
  }

  p {
    margin: 0;
  }

  .md-titulo {
    margin-top: 4px;
    font-weight: 800;
    color: ${({ $colorFuerte }) => $colorFuerte || "#281b3d"};
  }

  .md-titulo:first-child {
    margin-top: 0;
  }

  hr {
    width: 100%;
    margin: 2px 0;
    border: none;
    border-top: 1px solid rgba(83, 59, 143, 0.15);
  }

  a {
    color: var(--colorMorado, #533b8f);
    text-decoration: underline;
    word-break: break-all;
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
    word-break: break-all;
  }
`;

// Links en notas que viven dentro de tarjetas clicables: abrir el link no debe abrir el modal.
const detenerPropagacion = (event) => event.stopPropagation();

/**
 * Parsea fragmentos en línea para negritas (**texto**), cursivas (_texto_ o *texto*), código (`codigo`)
 * y links ([texto](https://...) o una URL suelta)
 */
export const formatearTextoEnLinea = (texto = "") => {
  if (!texto) return null;
  const regex = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+|\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g;
  const partes = String(texto).split(regex);

  return partes.map((parte, index) => {
    if (!parte) return null;
    const link = parte.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/) || (/^https?:\/\//.test(parte) && [parte, parte, parte]);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" onClick={detenerPropagacion}>
          {link[1]}
        </a>
      );
    }
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
 * Versión de una línea para espacios donde no cabe el bloque (pie de tarjeta, tooltips).
 */
export const markdownATextoPlano = (texto = "") =>
  String(texto || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/(^|\s)[*_]([^*_]+)[*_]/g, "$1$2")
    .replace(/^\s*(?:[-*•]|\d+\.|#{1,6})\s+/gm, "")
    .replace(/^\s*-{3,}\s*$/gm, "")
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .join(" · ");

/**
 * Convierte un texto con markdown a una estructura de bloques (listas, títulos y párrafos)
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

    // Separador: --- o ***
    if (/^(-{3,}|\*{3,})$/.test(linea)) {
      if (listaActual) {
        bloques.push(listaActual);
        listaActual = null;
      }
      bloques.push({ tipo: "hr" });
      return;
    }

    // Títulos: # Título, ## Título... se muestran todos igual; en una tarjeta no hay espacio para jerarquías.
    const matchTitulo = linea.match(/^#{1,6}\s+(.*)$/);
    if (matchTitulo) {
      if (listaActual) {
        bloques.push(listaActual);
        listaActual = null;
      }
      bloques.push({ tipo: "titulo", texto: matchTitulo[1] });
      return;
    }

    // Sangría de la línea original: permite sub-viñetas con 2+ espacios o tab.
    const nivel = Math.min(3, Math.floor(lineaCruda.replace(/\t/g, "  ").search(/\S/) / 2));

    // Detectar viñeta no ordenada: - item, * item, • item
    const matchNoOrdenada = linea.match(/^[-*•]\s+(.*)$/);
    // Detectar viñeta ordenada: 1. item, 2. item
    const matchOrdenada = linea.match(/^(\d+)\.\s+(.*)$/);

    if (matchNoOrdenada) {
      if (!listaActual || listaActual.tipo !== "ul") {
        if (listaActual) bloques.push(listaActual);
        listaActual = { tipo: "ul", items: [] };
      }
      listaActual.items.push({ texto: matchNoOrdenada[1], nivel });
    } else if (matchOrdenada) {
      if (!listaActual || listaActual.tipo !== "ol") {
        if (listaActual) bloques.push(listaActual);
        listaActual = { tipo: "ol", items: [] };
      }
      listaActual.items.push({ texto: matchOrdenada[2], nivel });
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
        if (bloque.tipo === "ul" || bloque.tipo === "ol") {
          const Lista = bloque.tipo;
          return (
            <Lista key={idx}>
              {bloque.items.map((item, itemIdx) => (
                <li key={itemIdx} style={item.nivel ? { marginLeft: item.nivel * 14 } : undefined}>
                  {formatearTextoEnLinea(item.texto)}
                </li>
              ))}
            </Lista>
          );
        }
        if (bloque.tipo === "hr") return <hr key={idx} />;
        if (bloque.tipo === "titulo") {
          return <p key={idx} className="md-titulo">{formatearTextoEnLinea(bloque.texto)}</p>;
        }
        return <p key={idx}>{formatearTextoEnLinea(bloque.texto)}</p>;
      })}
    </ContenedorMarkdown>
  );
};
