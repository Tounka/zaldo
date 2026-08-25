import styled, { keyframes } from "styled-components";
import { SelectVisual } from "../../componentes/genericos/SelectVisual";
import modalMetalPins from "../../imagenes/banners/modal-metal-pins.png";

/*
 * Estilos de la Despensa.
 *
 * Criterios del rediseño:
 *  - Color plano. Cero degradados, cero blur, una sola sombra muy suave.
 *  - La jerarquía la da el color de categoría y el espacio, no las cajas.
 *  - Un dato por fila: nombre a la izquierda, un único indicador a la derecha.
 *  - Todo lo táctil mide 44px o más; el texto de los inputs 16px en móvil
 *    para que iOS no haga zoom al enfocar.
 */

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─────────────  Tokens locales  ───────────── */

export const T = {
    fondo: "#f6f6fb",
    superficie: "#ffffff",
    borde: "#e2e0f0",
    bordeFuerte: "#cbc7e2",
    texto: "#211b38",
    textoSuave: "#6b6484",
    marca: "var(--colorMorado)",
    ok: "#2f7d54",
    alerta: "#b4791a",
    peligro: "#c0392b",
};

/*
 * Un color por categoría. Es lo que permite reconocer un grupo de un vistazo
 * sin leer el encabezado, igual que las franjas de colores de una despensa real.
 */
export const COLORES_CATEGORIA = {
    Abarrotes: "#c79a2e",
    Bebidas: "#2f7fc4",
    "Lácteos": "#5b74c9",
    Limpieza: "#2f9b8f",
    Higiene: "#8a63c9",
    Enlatados: "#d1662b",
    Botanas: "#c94f68",
    Congelados: "#3aa0c9",
    Otros: "#8b88a0",
};

export const colorCategoria = (categoria) => COLORES_CATEGORIA[categoria] || COLORES_CATEGORIA.Otros;

/* ─────────────  Estructura  ───────────── */

export const Pagina = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: ${T.texto};
  animation: ${fadeUp} 0.3s ease;
`;

export const Encabezado = styled.header`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const EncabezadoTitulo = styled.h1`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: ${T.texto};

  @media (min-width: 700px) { font-size: 30px; }
`;

export const EncabezadoTexto = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${T.textoSuave};
`;

/*
 * Tres cifras, no ocho. El resto vive en su pestaña; en el encabezado solo va
 * lo que se mira todos los días.
 */
export const ResumenCifras = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: ${T.borde};
  border: 1px solid ${T.borde};
  border-radius: 14px;
  overflow: hidden;
`;

export const Cifra = styled.div`
  background: ${T.superficie};
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const CifraValor = styled.strong`
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: ${({ $tono }) => ($tono === "alerta" ? T.peligro : T.texto)};
  font-variant-numeric: tabular-nums;
`;

export const CifraLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${T.textoSuave};
`;

/* ─────────────  Navegación  ───────────── */

export const Tabs = styled.nav`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid ${T.borde};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

export const TabButton = styled.button`
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 14px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: ${({ $activo }) => ($activo ? 700 : 600)};
  color: ${({ $activo }) => ($activo ? T.marca : T.textoSuave)};
  border-bottom: 2px solid ${({ $activo }) => ($activo ? T.marca : "transparent")};
  display: inline-flex;
  align-items: center;
  gap: 7px;

  svg { font-size: 15px; }
`;

export const BarraAcciones = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
  &::-webkit-scrollbar { display: none; }
  > * { flex-shrink: 0; }

  @media (min-width: 700px) { overflow-x: visible; flex-wrap: wrap; }
`;

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Panel = styled.section`
  background: ${T.superficie};
  border: 1px solid ${T.borde};
  border-radius: 16px;
  overflow: hidden;
`;

export const PanelCompleto = Panel;

export const PanelHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid ${T.borde};
`;

export const TituloConIcono = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: ${T.texto};

  svg { color: ${T.marca}; font-size: 15px; }
`;

/* ─────────────  Lista agrupada por categoría  ───────────── */

export const Grupo = styled.section`
  & + & { margin-top: 14px; }
`;

export const GrupoTitulo = styled.h2`
  margin: 0 0 6px;
  padding-left: 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  span {
    letter-spacing: 0;
    text-transform: none;
    font-weight: 600;
    color: ${T.textoSuave};
  }
`;

/* La franja de color a la izquierda es lo que identifica al grupo de un vistazo. */
export const GrupoLista = styled.div`
  background: ${T.superficie};
  border: 1px solid ${T.borde};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: 12px;
  overflow: hidden;
`;

export const Fila = styled.button`
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;

  & + & { border-top: 1px solid ${T.borde}; }
  &:active { background: #f6f6fb; }
`;

export const FilaTexto = styled.div`
  flex: 1;
  min-width: 0;
`;

export const FilaNombre = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${T.texto};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const FilaMeta = styled.div`
  font-size: 12px;
  color: ${T.textoSuave};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const FilaDerecha = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

export const FilaValor = styled.div`
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  color: ${T.texto};
  font-variant-numeric: tabular-nums;

  span {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: ${T.textoSuave};
  }
`;

/*
 * Indicador de existencias. El anillo se llena según el stock contra su mínimo,
 * así que se lee igual que un medidor de combustible: lleno = tranquilo.
 */
export const Anillo = styled.div`
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  background: conic-gradient(
    ${({ $color }) => $color} ${({ $fill }) => Math.round($fill * 360)}deg,
    #e6e4f2 0deg
  );

  &::after {
    content: "";
    position: absolute;
    inset: 7px;
    border-radius: 50%;
    background: ${T.superficie};
  }
`;

/* ─────────────  Controles  ───────────── */

export const Chip = styled.button`
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${({ $activo }) => ($activo ? "transparent" : T.borde)};
  background: ${({ $activo }) => ($activo ? T.marca : "#f2f1fa")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : T.texto)};
  font-size: 13px;
  font-weight: ${({ $activo }) => ($activo ? 700 : 600)};
  cursor: pointer;
`;

export const ChipGrupo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/* Segmentado tipo Bajo / Medio / Lleno, como en la referencia. */
export const Segmentado = styled.div`
  display: flex;
  padding: 3px;
  gap: 3px;
  background: #f2f1fa;
  border: 1px solid ${T.borde};
  border-radius: 999px;
`;

export const SegmentoBtn = styled.button`
  flex: 1;
  min-height: 38px;
  border: none;
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? T.marca : "transparent")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : T.textoSuave)};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;

export const BotonPrimario = styled.button`
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: ${T.marca};
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

export const BotonSecundario = styled.button`
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid ${T.borde};
  border-radius: 12px;
  background: ${T.superficie};
  color: ${T.texto};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

export const BotonTexto = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: none;
  border-radius: 10px;
  background: none;
  color: ${T.textoSuave};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

export const BotonFull = styled.div`
  grid-column: 1 / -1;
  > button { width: 100%; }
`;

/* Botón flotante de acción principal, como en la referencia. */
export const Fab = styled.button`
  position: fixed;
  right: 18px;
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 900;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: ${T.marca};
  color: #ffffff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(83, 59, 143, 0.3);
`;

/* ─────────────  Formularios  ───────────── */

export const FormGrid = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  padding: 16px;

  @media (min-width: 620px) { grid-template-columns: 1fr 1fr; }
`;

export const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${T.textoSuave};
`;

export const CampoCompleto = styled(Campo)`
  grid-column: 1 / -1;
`;

const campoBase = `
  width: 100%;
  min-height: 46px;
  border: 1px solid #dedbee;
  border-radius: 12px;
  padding: 0 12px;
  background: #ffffff;
  color: #211b38;
  font-size: 16px;
  font-weight: 500;
  outline: none;

  &:focus { border-color: var(--colorMorado); }
  &::placeholder { color: #9d97b5; }

  @media (min-width: 700px) { font-size: 14px; }
`;

export const InputBase = styled.input`${campoBase}`;

export const SelectBase = styled(SelectVisual)`
  ${campoBase}
  padding: 0;
  border: none;
  background: transparent;

  > button {
    min-height: 46px;
    border-color: #dedbee;
    border-radius: 12px;
    background: #ffffff;
    color: #211b38;
    font-size: 14px;
  }
`;

export const TextArea = styled.textarea`
  ${campoBase}
  min-height: 84px;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.5;
`;

export const Mensaje = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid ${({ $tipo }) => ($tipo === "error" ? "#f0cdc8" : "#c3ddcd")};
  background: ${({ $tipo }) => ($tipo === "error" ? "#fdf2f0" : "#eff7f2")};
  color: ${({ $tipo }) => ($tipo === "error" ? T.peligro : T.ok)};
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $estado }) => {
        if ($estado === "alerta") return "#fdeeeb";
        if ($estado === "parcial") return "#fcf3e2";
        return "#eef6f1";
    }};
  color: ${({ $estado }) => {
        if ($estado === "alerta") return T.peligro;
        if ($estado === "parcial") return T.alerta;
        return T.ok;
    }};
`;

export const AccionesInline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

export const ProductoMeta = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${T.textoSuave};
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
  color: ${T.textoSuave};

  svg { font-size: 26px; color: ${T.bordeFuerte}; }
  strong { font-size: 15px; color: ${T.texto}; }
  span { font-size: 13px; max-width: 34ch; }
`;

/* ─────────────  Tabla (vista de detalle)  ───────────── */

export const TablaWrap = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

export const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    position: sticky;
    top: 0;
    background: #f6f6fb;
    text-align: left;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: ${T.textoSuave};
    white-space: nowrap;
    border-bottom: 1px solid ${T.borde};
  }

  td {
    padding: 11px 12px;
    border-bottom: 1px solid #efedf8;
    vertical-align: middle;
    white-space: nowrap;
  }

  tbody tr:last-child td { border-bottom: none; }

  strong { font-weight: 700; }
`;

/* ─────────────  Buscador con autocompletado  ───────────── */

export const BuscadorSelectWrap = styled.div`
  position: relative;
  width: 100%;
`;

export const BuscadorSelectInput = styled.input`${campoBase}`;

export const BuscadorSelectMenu = styled.div`
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid ${T.borde};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(33, 27, 56, 0.1);
`;

export const BuscadorSelectOpcion = styled.button`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  color: ${T.texto};

  & + & { border-top: 1px solid #efedf8; }
  &:hover { background: #f6f6fb; }
`;

export const BuscadorSelectVacio = styled.div`
  padding: 12px;
  font-size: 13px;
  color: ${T.textoSuave};
`;

/* ─────────────  Modales  ───────────── */

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(33, 27, 56, 0.45);

  @media (min-width: 700px) {
    align-items: center;
    padding: 20px;
  }
`;

export const ModalCard = styled.div`
  width: 100%;
  max-height: 92dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  animation: ${fadeUp} 0.2s ease;

  @media (min-width: 700px) {
    width: min(720px, 100%);
    max-height: 88dvh;
    border-radius: 18px;
    padding-bottom: 0;
  }
`;

export const ModalHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background-image: linear-gradient(105deg, rgba(255, 255, 255, .96), rgba(246, 243, 252, .88)), url(${modalMetalPins});
  background-position: center;
  background-size: cover;
  border-bottom: 1px solid ${T.borde};
  border-radius: 18px 18px 0 0;
`;

export const ModalBody = styled.div`
  padding: 0;
`;

export const ModalDescripcion = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${T.textoSuave};
`;

/* ─────────────  Captura rápida  ───────────── */

export const CapturaLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 860px) { grid-template-columns: 300px minmax(0, 1fr); }
`;

export const CapturaAyuda = styled.div`
  font-size: 12px;
  line-height: 1.6;
  color: ${T.textoSuave};
  background: #f6f6fb;
  border: 1px solid ${T.borde};
  border-radius: 12px;
  padding: 12px;

  code {
    display: block;
    margin-top: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: ${T.texto};
    white-space: pre-line;
  }
`;

export const CapturaTextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  border: 1px dashed ${T.bordeFuerte};
  border-radius: 12px;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 16px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  background: #ffffff;
  color: ${T.texto};

  &:focus { border-color: var(--colorMorado); border-style: solid; }
  @media (min-width: 700px) { font-size: 13px; }
`;

export const CapturaResumen = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
`;

export const CapturaChip = styled.span`
  font-size: 12px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
  background: ${({ $tipo }) => {
        if ($tipo === "nuevo") return "#fcf3e2";
        if ($tipo === "probable") return "#f1eefb";
        return "#eef6f1";
    }};
  color: ${({ $tipo }) => {
        if ($tipo === "nuevo") return T.alerta;
        if ($tipo === "probable") return T.marca;
        return T.ok;
    }};
`;

export const CapturaLista = styled.div`
  max-height: 46dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

export const CapturaFila = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 44px;
  grid-template-areas:
    "nombre nombre nombre"
    "cant precio borrar";
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 1px solid ${T.borde};
  border-left: 4px solid ${({ $estado }) => {
        if ($estado === "nuevo") return T.alerta;
        if ($estado === "probable") return "var(--colorMoradoSecundario)";
        return T.ok;
    }};
  border-radius: 10px;
  margin-bottom: 6px;

  > *:nth-child(2) { grid-area: cant; }
  > *:nth-child(3) { grid-area: precio; }
  > *:nth-child(4) { grid-area: borrar; }

  @media (min-width: 560px) {
    grid-template-columns: minmax(0, 1fr) 72px 92px 44px;
    grid-template-areas: "nombre cant precio borrar";
  }
`;

export const CapturaNombre = styled.div`
  grid-area: nombre;
  min-width: 0;

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: ${T.texto};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 11px;
    color: ${T.textoSuave};
  }
`;
