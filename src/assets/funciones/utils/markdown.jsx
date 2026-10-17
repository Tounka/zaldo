import styled from "styled-components";

const ContenedorMarkdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  /* URLs y palabras largas (números de cuenta, correos) rompían el ancho de la tarjeta. */
  overflow-wrap: anywhere;
  word-break: break-word;
  /* Se renderiza dentro de chips y celdas con nowrap: sin esto no hace salto de línea. */
  white-space: normal;
  text-align: left;
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
    max-width: 100%;
  }

  li[data-nivel="1"] { margin-left: 14px; }
  li[data-nivel="2"] { margin-left: 28px; }
  li[data-nivel="3"] { margin-left: 42px; }

  li[data-nivel] {
    font-size: 0.95em;
    list-style-type: circle;
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
    white-space: pre-wrap;
  }

  /* Tablas pegadas desde otro lado: se desplazan dentro, no ensanchan la tarjeta. */
  .md-tabla {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    font-size: 0.95em;
    overflow-wrap: normal;
    word-break: normal;
  }

  .md-tabla th,
  .md-tabla td {
    padding: 3px 8px;
    border-bottom: 1px solid rgba(83, 59, 143, 0.12);
    text-align: left;
    white-space: nowrap;
  }

  .md-tabla th {
    font-weight: 800;
    color: ${({ $colorFuerte }) => $colorFuerte || "#281b3d"};
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
  // Cursivas solo en límite de palabra: nombres_con_guiones o "2 * 3 * 4" no se vuelven cursiva.
  const regex = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+|\*\*[^*]+\*\*|(?<![\w])_[^_\s](?:[^_]*[^_\s])?_(?![\w])|(?<![\w*])\*[^*\s](?:[^*]*[^*\s])?\*(?![\w*])|`[^`]+`)/g;
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
    .replace(/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*$/gm, "")
    .replace(/\s*\|\s*/g, " ")
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

    // Tabla estilo markdown: | a | b |. La fila separadora |---|---| se omite.
    if (/^\|.*\|$/.test(linea)) {
      if (listaActual && listaActual.tipo !== "tabla") {
        bloques.push(listaActual);
        listaActual = null;
      }
      if (!listaActual) listaActual = { tipo: "tabla", filas: [], conEncabezado: false };
      const celdas = linea.slice(1, -1).split("|").map((celda) => celda.trim());
      if (celdas.every((celda) => /^:?-{2,}:?$/.test(celda))) {
        if (listaActual.filas.length === 1) listaActual.conEncabezado = true;
        return;
      }
      listaActual.filas.push(celdas);
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

    if (listaActual?.tipo === "tabla") {
      bloques.push(listaActual);
      listaActual = null;
    }

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
                <li key={itemIdx} data-nivel={item.nivel || undefined}>
                  {formatearTextoEnLinea(item.texto)}
                </li>
              ))}
            </Lista>
          );
        }
        if (bloque.tipo === "tabla") {
          const [encabezado, ...cuerpo] = bloque.conEncabezado ? bloque.filas : [null, ...bloque.filas];
          return (
            <table key={idx} className="md-tabla">
              {encabezado && (
                <thead>
                  <tr>{encabezado.map((celda, i) => <th key={i}>{formatearTextoEnLinea(celda)}</th>)}</tr>
                </thead>
              )}
              <tbody>
                {cuerpo.map((fila, filaIdx) => (
                  <tr key={filaIdx}>{fila.map((celda, i) => <td key={i}>{formatearTextoEnLinea(celda)}</td>)}</tr>
                ))}
              </tbody>
            </table>
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
