import { useState, useMemo } from "react";
import styled from "styled-components";
import {
    FaSearch,
    FaTimes,
    FaPlus,
    FaBell,
    FaCheck,
    FaExclamationTriangle,
    FaPen,
    FaChevronDown,
    FaExpandAlt,
    FaCompressAlt,
    FaThLarge,
    FaList,
    FaMinus,
} from "react-icons/fa";
import {
    AREAS_DESPENSA,
    ESTRUCTURA_AREAS,
    resolverAreaYCategoria,
    colorArea,
    colorCategoriaInterna,
} from "../areasYCategorias";
import { resolverImagenProducto, usarImagenGenerica } from "../iconosDespensa";
import { coincideBusqueda } from "../busqueda";
import { derivarResumenProducto } from "../../../funciones/firebase/despensa";
import { IlustracionMadriguera } from "../../../componentes/topo/Madriguera";
import { DesplegableMovil } from "../../../componentes/genericos/responsivo";

const STORAGE_KEY_ACORDEONES = "zaldo_despensa_acordeones_v1";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const ResumenKpis = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const TarjetaKpi = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  min-width: 0;

  span.label {
    font-size: 11px;
    font-weight: 700;
    color: #6b6484;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span.valor {
    font-size: 20px;
    font-weight: 800;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: ${({ $color }) => $color || "#1a1a2e"};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 380px) {
    padding: 10px 8px;
    span.valor {
      font-size: 17px;
    }
  }
`;

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

const BarraBusqueda = styled.div`
  position: relative;
  width: 100%;

  svg.lupa {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b6484;
  }

  svg.borrar {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    cursor: pointer;
  }
`;

const InputBuscador = styled.input`
  width: 100%;
  height: 46px;
  padding: 0 40px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 12px;
  font-size: 14px;
  color: #1a1a2e;
  box-sizing: border-box;
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.08);
  }
`;

const CarruselAreas = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ChipArea = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1.5px solid ${({ $color, $activo }) => ($activo ? $color : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $color, $activo }) => ($activo ? $color : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#211b38")};
  box-shadow: ${({ $activo }) => ($activo ? "0 3px 10px rgba(0, 0, 0, 0.12)" : "none")};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $color, $activo }) => ($activo ? $color : "rgba(83, 59, 143, 0.05)")};
    transform: translateY(-1px);
  }
`;

const FilaFiltrosYAcciones = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    gap: 8px;
  }
`;

const GrupoStatusFiltros = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ChipStatus = styled.button`
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid ${({ $color, $activo }) => ($activo ? $color : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $color, $activo }) => ($activo ? $color : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#6b6484")};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $color, $activo }) => ($activo ? $color : "rgba(83, 59, 143, 0.06)")};
  }
`;

const BtnToggleAcordeones = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "#ffffff")};
  border: 1px dashed ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "rgba(83, 59, 143, 0.25)")};
  border-radius: 8px;
  font-size: 13px;
  color: ${({ $activo }) => ($activo ? "#ffffff" : "var(--colorMorado, #6c5ce7)")};
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.04);
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "rgba(83, 59, 143, 0.08)")};
    transform: translateY(-1px);
    border-color: var(--colorMorado, #6c5ce7);
  }
`;

const GridProductos = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding-top: 12px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
    gap: 14px;
  }
`;

const TarjetaProducto = styled.div`
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 14px 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  box-shadow: 0 1px 4px rgba(83, 59, 143, 0.04);
  transition: all 0.2s ease;
  min-width: 0;
  box-sizing: border-box;

  @media (min-width: 600px) {
    padding: 16px 12px 14px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(83, 59, 143, 0.09);
    border-color: rgba(83, 59, 143, 0.25);
  }

  img.sticker {
    width: 68px;
    height: 68px;
    object-fit: contain;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12));

    @media (min-width: 600px) {
      width: 74px;
      height: 74px;
    }
  }

  h4 {
    margin: 0;
    font-size: 13.5px;
    font-weight: 800;
    color: #1a1a2e;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  span.categoria {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${({ $color }) => $color};
    background: ${({ $color }) => `${$color}15`};
    padding: 2px 8px;
    border-radius: 6px;
  }
`;

const StockBadge = styled.div`
  font-size: 12px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  padding: 4px 10px;
  border-radius: 6px;
  background: ${({ $estado }) => ($estado === "ok" ? "rgba(47, 125, 84, 0.1)" : $estado === "bajo" ? "rgba(180, 121, 26, 0.1)" : "rgba(192, 57, 43, 0.1)")};
  color: ${({ $estado }) => ($estado === "ok" ? "#2f7d54" : $estado === "bajo" ? "#b4791a" : "#c0392b")};
  display: flex;
  align-items: center;
  gap: 5px;
`;

const BotonCampana = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: ${({ $activo }) => ($activo ? "rgba(243, 156, 18, 0.12)" : "transparent")};
  border: 1px solid ${({ $activo }) => ($activo ? "#f39c12" : "transparent")};
  color: ${({ $activo }) => ($activo ? "#f39c12" : "#a29db8")};
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    color: #f39c12;
    background: rgba(243, 156, 18, 0.1);
  }
`;

const BotonesAccion = styled.div`
  display: flex;
  width: 100%;
  gap: 6px;
  margin-top: 4px;
`;

const BotonMini = styled.button`
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  border: ${({ $primario }) => ($primario ? "none" : "1px solid rgba(83, 59, 143, 0.2)")};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: ${({ $primario }) => ($primario ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $primario }) => ($primario ? "#ffffff" : "var(--colorMorado)")};
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ $primario }) => ($primario ? "var(--colorMoradoOscuro, #533b8f)" : "rgba(83, 59, 143, 0.06)")};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const BotonEditarEsquina = styled.button`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #a29db8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.08);
  }
`;

const MenuPresentaciones = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`;

const OpcionPresentacion = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(192, 57, 43, 0.25);
  background: rgba(192, 57, 43, 0.05);
  color: #a93226;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: rgba(192, 57, 43, 0.1);
  }
`;

/*
 * "Usé 1" descuenta directo desde el inventario: antes había que ir a Gastar y
 * pasar por dos pasos para algo que se hace varias veces al día. Con varias
 * presentaciones en existencia, primero pregunta de cuál. Lo comparten la
 * tarjeta (cuadrícula) y el renglón (tabla).
 */
const useConsumoRapido = (prod, onConsumoRapido) => {
    const [eligiendo, setEligiendo] = useState(false);
    const [descontando, setDescontando] = useState(false);

    const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa !== false);
    const conExistencia = presentaciones.filter((pr) => Number(pr.stockActual || 0) > 0);

    const consumir = async (presentacionId) => {
        setEligiendo(false);
        setDescontando(true);
        try {
            await onConsumoRapido?.(prod.id, presentacionId);
        } finally {
            setDescontando(false);
        }
    };

    const handleUsar = () => {
        if (conExistencia.length === 1) consumir(conExistencia[0].id);
        else setEligiendo((prev) => !prev);
    };

    return { eligiendo, descontando, presentaciones, conExistencia, consumir, handleUsar };
};

/* Tarjeta de producto de la vista en cuadrícula. */
const TarjetaInventario = ({
    prod,
    color,
    onAbrirEntrada,
    onAbrirEditar,
    onAlternarNecesario,
    onConsumoRapido,
}) => {
    const { eligiendo, descontando, presentaciones, conExistencia, consumir, handleUsar } = useConsumoRapido(prod, onConsumoRapido);

    return (
        <TarjetaProducto $color={color}>
            <BotonEditarEsquina
                type="button"
                onClick={() => onAbrirEditar?.(prod)}
                title="Editar producto y presentaciones"
                aria-label={`Editar ${prod.nombre}`}
            >
                <FaPen />
            </BotonEditarEsquina>

            <BotonCampana
                type="button"
                $activo={prod.necesario}
                onClick={() => onAlternarNecesario(prod.id, !prod.necesario)}
                title={prod.necesario ? "Quitar de lista de compras" : "Marcar como necesario para comprar"}
                aria-pressed={Boolean(prod.necesario)}
            >
                <FaBell />
            </BotonCampana>

            <img
                className="sticker"
                src={prod.imagenSticker}
                alt={prod.nombre}
                onError={usarImagenGenerica}
            />
            <h4>{prod.nombre}</h4>

            <StockBadge $estado={prod.estadoStock}>
                {prod.estadoStock === "ok" && <FaCheck />}
                {prod.estadoStock === "bajo" && <FaExclamationTriangle />}
                {prod.resumenStock}
            </StockBadge>

            {presentaciones.length > 1 && (
                <span style={{ fontSize: "11px", color: "#6b6484", fontWeight: 700 }}>
                    {presentaciones
                        .map((pr) => `${pr.stockActual} ${pr.nombre.toLowerCase()}`)
                        .join(" • ")}
                </span>
            )}

            {eligiendo && (
                <MenuPresentaciones>
                    {conExistencia.map((pr) => (
                        <OpcionPresentacion key={pr.id} type="button" onClick={() => consumir(pr.id)}>
                            <span>−1 {pr.nombre}</span>
                            <span>{pr.stockActual}</span>
                        </OpcionPresentacion>
                    ))}
                </MenuPresentaciones>
            )}

            <BotonesAccion>
                <BotonMini
                    type="button"
                    onClick={handleUsar}
                    disabled={!conExistencia.length || descontando}
                    title={conExistencia.length ? "Descontar 1 de lo que tienes" : "Sin existencia"}
                >
                    <FaMinus /> {descontando ? "..." : "Usé 1"}
                </BotonMini>
                <BotonMini
                    type="button"
                    $primario
                    onClick={() => onAbrirEntrada(prod)}
                    title="Registrar que compraste este producto"
                >
                    <FaPlus /> Compré
                </BotonMini>
            </BotonesAccion>
        </TarjetaProducto>
    );
};

/* ─────────────  Vista de tabla agrupada (estilo Asana)  ───────────── */

/*
 * Una sola tabla: encabezado de columnas fijo, una sección por categoría que
 * se colapsa y un renglón por producto. En móvil se ocultan Valor y Estado
 * (el color de la existencia ya lo dice) para que quepa sin scroll lateral.
 */
const COLUMNAS_TABLA = "minmax(0, 2.4fr) minmax(110px, 1fr) 96px 92px 44px 176px";
const COLUMNAS_TABLA_MOVIL = "minmax(0, 1fr) minmax(76px, auto) 40px 116px";

const TablaDespensa = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  box-shadow: 0 1px 4px rgba(83, 59, 143, 0.03);
  /* Recorta las esquinas sin cortar el encabezado pegajoso. */
  overflow: clip;
`;

const FilaBase = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNAS_TABLA};
  align-items: center;
  gap: 12px;
  padding: 0 16px;

  @media (max-width: 640px) {
    grid-template-columns: ${COLUMNAS_TABLA_MOVIL};
    gap: 8px;
    padding: 0 10px;

    .soloEscritorio {
      display: none;
    }
  }
`;

const EncabezadoTabla = styled(FilaBase)`
  position: sticky;
  top: var(--alturaTopMenu);
  z-index: 2;
  min-height: 40px;
  background: #faf9ff;
  border-bottom: 1px solid rgba(83, 59, 143, 0.1);
  color: #6b6484;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  .derecha {
    text-align: right;
  }

  @media (max-width: 400px) {
    top: var(--alturaTopMenuTelefono);
  }
`;

const CabeceraSeccion = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid rgba(83, 59, 143, 0.08);
  background: #ffffff;
  color: #1a1a2e;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #faf9ff;
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: -2px;
  }

  .flecha {
    display: grid;
    place-items: center;
    width: 20px;
    color: #6b6484;
    font-size: 11px;
    transition: transform 0.2s ease;
    transform: rotate(${({ $abierto }) => ($abierto ? "0deg" : "-90deg")});
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${({ $color }) => $color || "#6c5ce7"};
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.2px;
  }

  .area {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #6b6484;
    background: rgba(107, 100, 132, 0.1);
    padding: 2px 7px;
    border-radius: 5px;
  }

  .conteo {
    color: #8a84a3;
    font-size: 12px;
    font-weight: 600;
  }

  .alerta {
    margin-left: auto;
    font-size: 11px;
    font-weight: 700;
    color: #c0392b;
    background: rgba(192, 57, 43, 0.1);
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    padding: 0 10px;
    flex-wrap: wrap;
    row-gap: 4px;
    padding-block: 8px;

    .area {
      display: none;
    }
  }
`;

const CuerpoSeccion = styled.div`
  display: grid;
  grid-template-rows: ${({ $abierto }) => ($abierto ? "1fr" : "0fr")};
  visibility: ${({ $abierto }) => ($abierto ? "visible" : "hidden")};
  transition:
    grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    visibility 0s linear ${({ $abierto }) => ($abierto ? "0s" : "0.25s")};

  > div {
    min-height: 0;
    overflow: hidden;
  }
`;

const RenglonProducto = styled(FilaBase)`
  position: relative;
  min-height: 52px;
  padding-block: 6px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  transition: background 0.12s ease;

  /* Barra de color de la categoría, como la columna de sección en Asana. */
  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${({ $color }) => $color};
    opacity: 0.55;
  }

  &:hover {
    background: #fbfaff;
  }
`;

const CeldaProducto = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  img {
    width: 34px;
    height: 34px;
    object-fit: contain;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1));
  }

  div {
    min-width: 0;
  }

  strong {
    display: block;
    color: #1a1a2e;
    font-size: 13.5px;
    font-weight: 750;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    color: #8a84a3;
    font-size: 11px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  button:hover strong {
    color: var(--colorMorado);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const CeldaExistencia = styled.span`
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $estado }) => ($estado === "ok" ? "#2f7d54" : $estado === "bajo" ? "#b4791a" : "#c0392b")};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PildoraEstado = styled.span`
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $estado }) => ($estado === "ok" ? "rgba(47, 125, 84, 0.1)" : $estado === "bajo" ? "rgba(180, 121, 26, 0.12)" : "rgba(192, 57, 43, 0.1)")};
  color: ${({ $estado }) => ($estado === "ok" ? "#2f7d54" : $estado === "bajo" ? "#b4791a" : "#c0392b")};

  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const CeldaValor = styled.span`
  color: #4b4566;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
`;

const BotonCampanaFila = styled.button`
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid ${({ $activo }) => ($activo ? "#f39c12" : "transparent")};
  border-radius: 50%;
  background: ${({ $activo }) => ($activo ? "rgba(243, 156, 18, 0.12)" : "transparent")};
  color: ${({ $activo }) => ($activo ? "#f39c12" : "#b4afc8")};
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: #f39c12;
    background: rgba(243, 156, 18, 0.1);
  }
`;

const AccionesFila = styled.div`
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 6px;

  ${BotonMini} {
    flex: 0 0 auto;
    padding: 0 10px;
  }

  @media (max-width: 640px) {
    gap: 4px;

    ${BotonMini} {
      padding: 0 8px;
    }

    .texto {
      display: none;
    }
  }
`;

const MenuPresentacionesFila = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 3;
  width: 200px;
  padding: 6px;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(26, 18, 51, 0.16);
`;

const FilaInventario = ({
    prod,
    color,
    onAbrirEntrada,
    onAbrirEditar,
    onAlternarNecesario,
    onConsumoRapido,
}) => {
    const { eligiendo, descontando, presentaciones, conExistencia, consumir, handleUsar } = useConsumoRapido(prod, onConsumoRapido);
    const detalle = presentaciones.length > 1
        ? presentaciones.map((pr) => `${pr.stockActual} ${pr.nombre.toLowerCase()}`).join(" • ")
        : prod.categoria;
    const etiquetaEstado = prod.estadoStock === "ok" ? "Suficiente" : prod.estadoStock === "bajo" ? "Por agotar" : "Agotado";

    return (
        <RenglonProducto role="row" $color={color}>
            <CeldaProducto role="cell">
                <img src={prod.imagenSticker} alt="" onError={usarImagenGenerica} />
                <button type="button" onClick={() => onAbrirEditar?.(prod)} title="Editar producto y presentaciones">
                    <strong>{prod.nombre}</strong>
                    <small>{detalle}</small>
                </button>
            </CeldaProducto>
            <CeldaExistencia role="cell" $estado={prod.estadoStock} title={prod.resumenStock}>
                {prod.resumenStock}
            </CeldaExistencia>
            <span role="cell" className="soloEscritorio">
                <PildoraEstado $estado={prod.estadoStock}>{etiquetaEstado}</PildoraEstado>
            </span>
            <CeldaValor role="cell" className="soloEscritorio">
                {prod.valorInventario ? formatMoney(prod.valorInventario) : "—"}
            </CeldaValor>
            <span role="cell">
                <BotonCampanaFila
                    type="button"
                    $activo={prod.necesario}
                    onClick={() => onAlternarNecesario(prod.id, !prod.necesario)}
                    title={prod.necesario ? "Quitar de lista de compras" : "Marcar como necesario para comprar"}
                    aria-label={prod.necesario ? `Quitar ${prod.nombre} de la lista de compras` : `Marcar ${prod.nombre} como necesario`}
                    aria-pressed={Boolean(prod.necesario)}
                >
                    <FaBell />
                </BotonCampanaFila>
            </span>
            <AccionesFila role="cell">
                <BotonMini
                    type="button"
                    onClick={handleUsar}
                    disabled={!conExistencia.length || descontando}
                    title={conExistencia.length ? "Descontar 1 de lo que tienes" : "Sin existencia"}
                    aria-label={`Usé 1 de ${prod.nombre}`}
                    aria-expanded={conExistencia.length > 1 ? eligiendo : undefined}
                >
                    <FaMinus /> <span className="texto">{descontando ? "..." : "Usé 1"}</span>
                </BotonMini>
                <BotonMini
                    type="button"
                    $primario
                    onClick={() => onAbrirEntrada(prod)}
                    title="Registrar que compraste este producto"
                    aria-label={`Compré ${prod.nombre}`}
                >
                    <FaPlus /> <span className="texto">Compré</span>
                </BotonMini>
                {eligiendo && (
                    <MenuPresentacionesFila>
                        <MenuPresentaciones>
                            {conExistencia.map((pr) => (
                                <OpcionPresentacion key={pr.id} type="button" onClick={() => consumir(pr.id)}>
                                    <span>−1 {pr.nombre}</span>
                                    <span>{pr.stockActual}</span>
                                </OpcionPresentacion>
                            ))}
                        </MenuPresentaciones>
                    </MenuPresentacionesFila>
                )}
            </AccionesFila>
        </RenglonProducto>
    );
};

const EstadoVacio = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b6484;
  background: #ffffff;
  border-radius: 16px;
  border: 1px dashed #cbc7e2;

  svg {
    font-size: 36px;
    color: #cbc7e2;
    margin-bottom: 12px;
  }
`;

export const TabInventario = ({
    catalogo,
    onAbrirEntrada,
    onAbrirEditar,
    onAlternarNecesario,
    onConsumoRapido,
    areaActiva: areaProp,
    setAreaActiva: setAreaProp,
}) => {
    const [busqueda, setBusqueda] = useState("");
    const [areaInterna, setAreaInterna] = useState("Todas");
    const areaActiva = areaProp !== undefined ? areaProp : areaInterna;
    const setAreaActiva = setAreaProp || setAreaInterna;
    const [filtroStatus, setFiltroStatus] = useState("Todos");

    // Modo de visualización: "acordeon" (por categorías) o "grid" (cuadrícula continua)
    const [modoVista, setModoVistaState] = useState(() => {
        try {
            return localStorage.getItem("zaldo_despensa_modo_vista") || "acordeon";
        } catch {
            return "acordeon";
        }
    });

    const setModoVista = (nuevo) => {
        setModoVistaState(nuevo);
        try {
            localStorage.setItem("zaldo_despensa_modo_vista", nuevo);
        } catch (e) {
            console.warn("Error guardando modo vista en localStorage:", e);
        }
    };

    // Memoria local en el dispositivo para los acordeones
    const [acordeonesAbiertos, setAcordeonesAbiertos] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY_ACORDEONES);
            if (guardado) return JSON.parse(guardado);
        } catch (e) {
            console.warn("Error leyendo acordeones:", e);
        }
        return {};
    });

    const toggleAcordeon = (categoriaNombre) => {
        setAcordeonesAbiertos((prev) => {
            // Si no estaba definido, asumimos que estaba abierto (true) y ahora lo cerramos (false)
            const estadoActual = prev[categoriaNombre] !== false;
            const nuevo = { ...prev, [categoriaNombre]: !estadoActual };
            try {
                localStorage.setItem(STORAGE_KEY_ACORDEONES, JSON.stringify(nuevo));
            } catch (e) {
                console.warn("Error guardando acordeones:", e);
            }
            return nuevo;
        });
    };

    // Derivar productos con presentaciones, áreas normalizadas y métricas
    const productos = useMemo(() => {
        if (!catalogo?.productos) return [];
        return Object.values(catalogo.productos)
            .filter((p) => p.activo !== false)
            .map((prod) => {
                const { area, categoria } = resolverAreaYCategoria(prod);
                // Mismo cálculo que el backend: convierte presentaciones y no
                // suma bolsas con gramos.
                const resumen = derivarResumenProducto(prod);

                return {
                    ...prod,
                    area,
                    categoria,
                    resumenStock: resumen.resumenStock,
                    estadoStock: resumen.estadoStock,
                    valorInventario: resumen.valorInventarioActual,
                    imagenSticker: resolverImagenProducto(prod),
                };
            });
    }, [catalogo]);

    // Filtrar productos según Área, Búsqueda y Status
    const productosFiltrados = useMemo(() => {
        return productos.filter((prod) => {
            // Filtro por Área
            if (areaActiva !== "Todas" && prod.area !== areaActiva) {
                return false;
            }

            // Filtro por Status
            if (filtroStatus === "Por agotar" && prod.estadoStock === "ok") return false;
            if (filtroStatus === "Necesarios" && !prod.necesario) return false;

            return coincideBusqueda(busqueda, prod.nombre, prod.categoria, prod.area);
        });
    }, [productos, areaActiva, filtroStatus, busqueda]);

    // Agrupar productos filtrados por Categoría interna
    const gruposPorCategoria = useMemo(() => {
        const mapa = new Map();

        productosFiltrados.forEach((prod) => {
            const catClave = prod.categoria || "Abarrotes y Despensa seca";
            if (!mapa.has(catClave)) {
                mapa.set(catClave, {
                    categoria: catClave,
                    area: prod.area,
                    color: colorCategoriaInterna(catClave, prod.area),
                    productos: [],
                    porAgotar: 0,
                });
            }
            const grupo = mapa.get(catClave);
            grupo.productos.push(prod);
            if (prod.estadoStock !== "ok") grupo.porAgotar += 1;
        });

        // Ordenar según el orden predefinido en ESTRUCTURA_AREAS si es posible
        return Array.from(mapa.values()).sort((a, b) => {
            if (a.area !== b.area) return a.area.localeCompare(b.area);
            return a.categoria.localeCompare(b.categoria);
        });
    }, [productosFiltrados]);

    const setExpandirColapsarTodo = (abrir) => {
        const nuevo = { ...acordeonesAbiertos };
        gruposPorCategoria.forEach((g) => {
            nuevo[g.categoria] = abrir;
        });
        setAcordeonesAbiertos(nuevo);
        try {
            localStorage.setItem(STORAGE_KEY_ACORDEONES, JSON.stringify(nuevo));
        } catch (e) {
            console.warn("Error guardando acordeones:", e);
        }
    };

    const metricas = useMemo(() => {
        if (!productos || productos.length === 0) {
            return {
                totalProductos: 0,
                valorTotal: 0,
                porAgotar: 0,
                necesarios: 0,
            };
        }

        const productosEnArea = areaActiva === "Todas"
            ? productos
            : productos.filter((p) => p.area === areaActiva);

        let porAgotar = 0;
        let necesarios = 0;
        // Costo promedio de lo comprado: el mismo valor que exporta el CSV y
        // muestran las métricas, sin importar el área elegida.
        let valorTotal = 0;

        productosEnArea.forEach((prod) => {
            if (prod.necesario) necesarios += 1;
            if (prod.estadoStock !== "ok") porAgotar += 1;
            valorTotal += Number(prod.valorInventario || 0);
        });

        return {
            totalProductos: productosEnArea.length,
            valorTotal: Math.round(valorTotal),
            porAgotar,
            necesarios,
        };
    }, [productos, areaActiva]);

    return (
        <Contenedor>
            {/* 4 Cards de resumen; en celular se pliegan para llegar antes a los productos */}
            <DesplegableMovil
                titulo="Resumen de despensa"
                resumen={metricas.porAgotar > 0 ? `${metricas.porAgotar} por agotar` : formatMoney(metricas.valorTotal)}
            >
            <ResumenKpis>
                <TarjetaKpi>
                    <span className="label">Total Productos</span>
                    <span className="valor">{metricas.totalProductos}</span>
                </TarjetaKpi>
                <TarjetaKpi $color="#2f7d54">
                    <span className="label">Valor Estimado</span>
                    <span className="valor">{formatMoney(metricas.valorTotal)}</span>
                </TarjetaKpi>
                <TarjetaKpi $color={metricas.porAgotar > 0 ? "#c0392b" : "#2f7d54"}>
                    <span className="label">Por Agotar</span>
                    <span className="valor">{metricas.porAgotar}</span>
                </TarjetaKpi>
                <TarjetaKpi $color={metricas.necesarios > 0 ? "#d35400" : "#1a1a2e"}>
                    <span className="label">Marcados Necesarios</span>
                    <span className="valor">{metricas.necesarios}</span>
                </TarjetaKpi>
            </ResumenKpis>
            </DesplegableMovil>

            {/* Buscador */}
            <BarraBusqueda>
                <FaSearch className="lupa" />
                <InputBuscador
                    type="text"
                    placeholder="Buscar en tu despensa (nombre, área, categoría)..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && <FaTimes className="borrar" onClick={() => setBusqueda("")} />}
            </BarraBusqueda>

            {/* Selector de ÁREAS (solo si no viene controlado desde la barra superior) */}
            {!areaProp && (
                <CarruselAreas>
                    <ChipArea
                        type="button"
                        $color="var(--colorMorado, #6c5ce7)"
                        $activo={areaActiva === "Todas"}
                        onClick={() => setAreaActiva("Todas")}
                    >
                        Todas
                    </ChipArea>
                    {AREAS_DESPENSA.map((areaNombre) => (
                        <ChipArea
                            key={areaNombre}
                            type="button"
                            $color={colorArea(areaNombre)}
                            $activo={areaActiva === areaNombre}
                            onClick={() => setAreaActiva(areaNombre)}
                        >
                            <span>{areaNombre}</span>
                        </ChipArea>
                    ))}
                </CarruselAreas>
            )}

            {/* Filtros de estado secundarios + Control de Acordeones */}
            <FilaFiltrosYAcciones>
                <GrupoStatusFiltros>
                    <ChipStatus
                        type="button"
                        $color="var(--colorMorado, #6c5ce7)"
                        $activo={filtroStatus === "Todos"}
                        onClick={() => setFiltroStatus("Todos")}
                    >
                        Todos
                    </ChipStatus>
                    <ChipStatus
                        type="button"
                        $color="#c0392b"
                        $activo={filtroStatus === "Por agotar"}
                        onClick={() => setFiltroStatus("Por agotar")}
                    >
                        Por agotar
                    </ChipStatus>
                    <ChipStatus
                        type="button"
                        $color="#f39c12"
                        $activo={filtroStatus === "Necesarios"}
                        onClick={() => setFiltroStatus("Necesarios")}
                    >
                        Necesarios
                    </ChipStatus>
                </GrupoStatusFiltros>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {modoVista === "acordeon" && gruposPorCategoria.length > 0 && (
                        <>
                            <BtnToggleAcordeones
                                type="button"
                                onClick={() => setExpandirColapsarTodo(true)}
                                title="Expandir todas las categorías"
                            >
                                <FaExpandAlt />
                            </BtnToggleAcordeones>
                            <BtnToggleAcordeones
                                type="button"
                                onClick={() => setExpandirColapsarTodo(false)}
                                title="Colapsar todas las categorías"
                            >
                                <FaCompressAlt />
                            </BtnToggleAcordeones>
                        </>
                    )}
                    <BtnToggleAcordeones
                        type="button"
                        $activo={modoVista === "grid"}
                        onClick={() => setModoVista(modoVista === "acordeon" ? "grid" : "acordeon")}
                        title={modoVista === "grid" ? "Cambiar a tabla agrupada por categorías" : "Cambiar a vista de cuadrícula con imágenes"}
                    >
                        {modoVista === "grid" ? <FaList /> : <FaThLarge />}
                    </BtnToggleAcordeones>
                </div>
            </FilaFiltrosYAcciones>

            {/* Listado según el modo de visualización seleccionado */}
            {productosFiltrados.length === 0 ? (
                <EstadoVacio>
                    <IlustracionMadriguera variante="camara-despensa" ancho={130} />
                    <p>
                        {productos.length === 0
                            ? "Tu despensa está vacía. Registra tu primera compra con «Entrada»."
                            : "Escarbé por todos lados y no encontré productos con estos filtros."}
                    </p>
                </EstadoVacio>
            ) : modoVista === "grid" ? (
                <GridProductos>
                    {productosFiltrados.map((prod) => (
                        <TarjetaInventario
                            key={prod.id}
                            prod={prod}
                            color={colorCategoriaInterna(prod.categoria, prod.area)}
                            onAbrirEntrada={onAbrirEntrada}
                            onAbrirEditar={onAbrirEditar}
                            onAlternarNecesario={onAlternarNecesario}
                            onConsumoRapido={onConsumoRapido}
                        />
                    ))}
                </GridProductos>
            ) : (
                <TablaDespensa role="table" aria-label="Inventario por categoría">
                    <EncabezadoTabla role="row">
                        <span role="columnheader">Producto</span>
                        <span role="columnheader">Existencia</span>
                        <span role="columnheader" className="soloEscritorio">Estado</span>
                        <span role="columnheader" className="soloEscritorio derecha">Valor</span>
                        <span role="columnheader" aria-label="Necesario" title="Necesario para comprar"><FaBell /></span>
                        <span role="columnheader" className="derecha">Acciones</span>
                    </EncabezadoTabla>

                    {gruposPorCategoria.map((grupo) => {
                        // Por defecto, abierto si no está explícitamente en false
                        const estaAbierto = acordeonesAbiertos[grupo.categoria] !== false;

                        return (
                            <div role="rowgroup" key={grupo.categoria}>
                                <CabeceraSeccion
                                    type="button"
                                    $abierto={estaAbierto}
                                    $color={grupo.color}
                                    onClick={() => toggleAcordeon(grupo.categoria)}
                                    aria-expanded={estaAbierto}
                                >
                                    <span className="flecha" aria-hidden="true"><FaChevronDown /></span>
                                    <span className="dot" aria-hidden="true" />
                                    <h3>{grupo.categoria}</h3>
                                    {areaActiva === "Todas" && <span className="area">{grupo.area}</span>}
                                    <span className="conteo">{grupo.productos.length}</span>
                                    {grupo.porAgotar > 0 && (
                                        <span className="alerta">{grupo.porAgotar} por agotar</span>
                                    )}
                                </CabeceraSeccion>

                                <CuerpoSeccion $abierto={estaAbierto}>
                                    <div>
                                        {grupo.productos.map((prod) => (
                                            <FilaInventario
                                                key={prod.id}
                                                prod={prod}
                                                color={grupo.color}
                                                onAbrirEntrada={onAbrirEntrada}
                                                onAbrirEditar={onAbrirEditar}
                                                onAlternarNecesario={onAlternarNecesario}
                                                onConsumoRapido={onConsumoRapido}
                                            />
                                        ))}
                                    </div>
                                </CuerpoSeccion>
                            </div>
                        );
                    })}
                </TablaDespensa>
            )}
        </Contenedor>
    );
};
