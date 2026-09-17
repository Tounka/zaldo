import { useState, useMemo } from "react";
import styled from "styled-components";
import {
    FaSearch,
    FaTimes,
    FaPlus,
    FaBell,
    FaCheck,
    FaExclamationTriangle,
    FaBoxes,
    FaPen,
    FaChevronDown,
    FaExpandAlt,
    FaCompressAlt,
    FaThLarge,
    FaList,
} from "react-icons/fa";
import {
    AREAS_DESPENSA,
    ESTRUCTURA_AREAS,
    resolverAreaYCategoria,
    colorArea,
    colorCategoriaInterna,
} from "../areasYCategorias";
import { resolverImagenProducto } from "../iconosDespensa";

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

const ContenedorAcordeones = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SeccionAcordeon = styled.div`
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(83, 59, 143, 0.03);
  transition: all 0.2s ease;
`;

const CabeceraAcordeon = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: #ffffff;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: #faf9ff;
  }
`;

const InfoAcordeon = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  span.dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $color }) => $color || "#6c5ce7"};
    flex-shrink: 0;
  }

  h3.titulo {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: #1a1a2e;
    letter-spacing: -0.2px;
  }

  span.badgeArea {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b6484;
    background: rgba(107, 100, 132, 0.1);
    padding: 2px 7px;
    border-radius: 5px;
  }

  span.badgeCount {
    font-size: 11px;
    font-weight: 600;
    color: #6b6484;
    background: #f2f1fa;
    padding: 2px 9px;
    border-radius: 999px;
  }

  span.badgeAlerta {
    font-size: 11px;
    font-weight: 700;
    color: #c0392b;
    background: rgba(192, 57, 43, 0.1);
    padding: 2px 8px;
    border-radius: 999px;
  }
`;

const ChevronWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f6f5fc;
  color: #6b6484;
  font-size: 12px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${({ $abierto }) => ($abierto ? "rotate(180deg)" : "rotate(0deg)")};
`;

const AcordeonAnimado = styled.div`
  display: grid;
  grid-template-rows: ${({ $abierto }) => ($abierto ? "1fr" : "0fr")};
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const CuerpoAcordeon = styled.div`
  min-height: 0;
  overflow: hidden;
  opacity: ${({ $abierto }) => ($abierto ? 1 : 0)};
  transition: opacity 0.25s ease, padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: ${({ $abierto }) => ($abierto ? "4px 16px 16px" : "0 16px")};
  border-top: ${({ $abierto }) => ($abierto ? "1px solid rgba(83, 59, 143, 0.08)" : "none")};
  background: #ffffff;
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

  &:hover {
    background: ${({ $primario }) => ($primario ? "var(--colorMoradoOscuro, #533b8f)" : "rgba(83, 59, 143, 0.06)")};
    transform: translateY(-1px);
  }
`;

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
    inventario,
    onAbrirEntrada,
    onAbrirEditar,
    onAlternarNecesario,
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
                const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa !== false);
                let stockTotal = 0;
                let unidadPrincipal = prod.unidadBase || "pz";

                presentaciones.forEach((pr) => {
                    stockTotal += Number(pr.stockActual || 0);
                    if (pr.unidad) unidadPrincipal = pr.unidad;
                });

                const stockMin = Number(prod.stockMinimo || 1);
                let estadoStock = "ok";
                if (stockTotal <= 0) estadoStock = "agotado";
                else if (stockTotal <= stockMin) estadoStock = "bajo";

                return {
                    ...prod,
                    area,
                    categoria,
                    stockTotal: Math.round(stockTotal * 100) / 100,
                    unidadPrincipal,
                    estadoStock,
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

            // Filtro por texto
            if (!busqueda) return true;
            const texto = busqueda.toLowerCase();
            return (
                prod.nombre.toLowerCase().includes(texto) ||
                prod.categoria.toLowerCase().includes(texto) ||
                prod.area.toLowerCase().includes(texto)
            );
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
        let valorCalculado = 0;

        productosEnArea.forEach((prod) => {
            if (prod.necesario) necesarios += 1;
            if (prod.estadoStock !== "ok") porAgotar += 1;

            const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa !== false);
            const valorProd = presentaciones.reduce((sub, pres) => {
                const stock = Number(pres.stockActual || 0);
                const precio = Number(pres.ultimoPrecioPagado || pres.precioAproximado || pres.buenPrecio || 0);
                return sub + stock * precio;
            }, 0);
            valorCalculado += valorProd;
        });

        const valorFinal = (areaActiva === "Todas" && inventario?.valorTotalInventario)
            ? Number(inventario.valorTotalInventario)
            : valorCalculado;

        return {
            totalProductos: productosEnArea.length,
            valorTotal: Math.round(valorFinal),
            porAgotar,
            necesarios,
        };
    }, [productos, areaActiva, inventario]);

    return (
        <Contenedor>
            {/* 4 Cards de resumen */}
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
                        title={modoVista === "grid" ? "Cambiar a vista agrupada por categorías (acordeones)" : "Cambiar a vista de cuadrícula continua (grid)"}
                    >
                        {modoVista === "grid" ? <FaList /> : <FaThLarge />}
                    </BtnToggleAcordeones>
                </div>
            </FilaFiltrosYAcciones>

            {/* Listado según el modo de visualización seleccionado */}
            {productosFiltrados.length === 0 ? (
                <EstadoVacio>
                    <FaBoxes />
                    <p>No se encontraron productos en esta área o con estos filtros.</p>
                </EstadoVacio>
            ) : modoVista === "grid" ? (
                <GridProductos>
                    {productosFiltrados.map((prod) => (
                        <TarjetaProducto
                            key={prod.id}
                            $color={colorCategoriaInterna(prod.categoria, prod.area)}
                        >
                            <BotonCampana
                                type="button"
                                $activo={prod.necesario}
                                onClick={() => onAlternarNecesario(prod.id, !prod.necesario)}
                                title={prod.necesario ? "Quitar de lista de compras" : "Marcar como necesario para comprar"}
                            >
                                <FaBell />
                            </BotonCampana>

                            <img
                                className="sticker"
                                src={prod.imagenSticker}
                                alt={prod.nombre}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                }}
                            />
                            <h4>{prod.nombre}</h4>

                            <StockBadge $estado={prod.estadoStock}>
                                {prod.estadoStock === "ok" && <FaCheck />}
                                {prod.estadoStock === "bajo" && <FaExclamationTriangle />}
                                {prod.stockTotal} {prod.unidadPrincipal}
                            </StockBadge>

                            {Object.keys(prod.presentaciones || {}).length > 1 && (
                                <span style={{ fontSize: "11px", color: "#6b6484", fontWeight: 700 }}>
                                    {Object.values(prod.presentaciones)
                                        .map((pr) => `${pr.stockActual} ${pr.nombre.toLowerCase()}`)
                                        .join(" • ")}
                                </span>
                            )}

                            <BotonesAccion>
                                <BotonMini
                                    type="button"
                                    $primario
                                    onClick={() => onAbrirEntrada(prod)}
                                    title="Dar entrada rápida a este producto"
                                >
                                    <FaPlus /> Entrada
                                </BotonMini>
                                <BotonMini
                                    type="button"
                                    onClick={() => onAbrirEditar?.(prod)}
                                    title="Editar producto y presentaciones"
                                >
                                    <FaPen /> Editar
                                </BotonMini>
                            </BotonesAccion>
                        </TarjetaProducto>
                    ))}
                </GridProductos>
            ) : (
                <ContenedorAcordeones>
                    {gruposPorCategoria.map((grupo) => {
                        // Por defecto, abierto si no está explícitamente en false
                        const estaAbierto = acordeonesAbiertos[grupo.categoria] !== false;

                        return (
                            <SeccionAcordeon key={grupo.categoria}>
                                <CabeceraAcordeon
                                    type="button"
                                    onClick={() => toggleAcordeon(grupo.categoria)}
                                    aria-expanded={estaAbierto}
                                >
                                    <InfoAcordeon $color={grupo.color}>
                                        <span className="dot" />
                                        <h3 className="titulo">{grupo.categoria}</h3>
                                        {areaActiva === "Todas" && (
                                            <span className="badgeArea">{grupo.area}</span>
                                        )}
                                        <span className="badgeCount">
                                            {grupo.productos.length} {grupo.productos.length === 1 ? "producto" : "productos"}
                                        </span>
                                        {grupo.porAgotar > 0 && (
                                            <span className="badgeAlerta">
                                                {grupo.porAgotar} por agotar
                                            </span>
                                        )}
                                    </InfoAcordeon>

                                    <ChevronWrap $abierto={estaAbierto}>
                                        <FaChevronDown />
                                    </ChevronWrap>
                                </CabeceraAcordeon>

                                <AcordeonAnimado $abierto={estaAbierto}>
                                    <CuerpoAcordeon $abierto={estaAbierto}>
                                        <GridProductos>
                                            {grupo.productos.map((prod) => (
                                                <TarjetaProducto
                                                    key={prod.id}
                                                    $color={grupo.color}
                                                >
                                                    <BotonCampana
                                                        type="button"
                                                        $activo={prod.necesario}
                                                        onClick={() => onAlternarNecesario(prod.id, !prod.necesario)}
                                                        title={prod.necesario ? "Quitar de lista de compras" : "Marcar como necesario para comprar"}
                                                    >
                                                        <FaBell />
                                                    </BotonCampana>

                                                    <img
                                                        className="sticker"
                                                        src={prod.imagenSticker}
                                                        alt={prod.nombre}
                                                        onError={(e) => {
                                                            e.currentTarget.onerror = null;
                                                            e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                                        }}
                                                    />
                                                    <h4>{prod.nombre}</h4>

                                                    <StockBadge $estado={prod.estadoStock}>
                                                        {prod.estadoStock === "ok" && <FaCheck />}
                                                        {prod.estadoStock === "bajo" && <FaExclamationTriangle />}
                                                        {prod.stockTotal} {prod.unidadPrincipal}
                                                    </StockBadge>

                                                    {Object.keys(prod.presentaciones || {}).length > 1 && (
                                                        <span style={{ fontSize: "11px", color: "#6b6484", fontWeight: 700 }}>
                                                            {Object.values(prod.presentaciones)
                                                                .map((pr) => `${pr.stockActual} ${pr.nombre.toLowerCase()}`)
                                                                .join(" • ")}
                                                        </span>
                                                    )}

                                                    <BotonesAccion>
                                                        <BotonMini
                                                            type="button"
                                                            $primario
                                                            onClick={() => onAbrirEntrada(prod)}
                                                            title="Dar entrada rápida a este producto"
                                                        >
                                                            <FaPlus /> Entrada
                                                        </BotonMini>
                                                        <BotonMini
                                                            type="button"
                                                            onClick={() => onAbrirEditar?.(prod)}
                                                            title="Editar producto y presentaciones"
                                                        >
                                                            <FaPen /> Editar
                                                        </BotonMini>
                                                    </BotonesAccion>
                                                </TarjetaProducto>
                                            ))}
                                        </GridProductos>
                                    </CuerpoAcordeon>
                                </AcordeonAnimado>
                            </SeccionAcordeon>
                        );
                    })}
                </ContenedorAcordeones>
            )}
        </Contenedor>
    );
};
