import { useState, useMemo } from "react";
import styled from "styled-components";
import {
    FaSearch,
    FaTimes,
    FaCheck,
    FaMinus,
    FaPlus,
    FaArrowRight,
    FaArrowLeft,
    FaShoppingCart,
    FaCheckCircle,
    FaStore,
} from "react-icons/fa";
import {
    ESTRUCTURA_AREAS,
    TODAS_LAS_CATEGORIAS_INTERNAS,
    resolverAreaYCategoria,
    colorCategoriaInterna,
} from "../areasYCategorias";
import { resolverImagenProducto } from "../iconosDespensa";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding-bottom: 90px;
`;

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

const IndicadorPaso = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.03);
`;

const TextoPaso = styled.div`
  display: flex;
  flex-direction: column;

  strong {
    font-size: 14px;
    color: #1a1a2e;
    font-weight: 700;
  }

  span {
    font-size: 12px;
    color: #6b6484;
  }
`;

const BadgePaso = styled.div`
  padding: 4px 12px;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.08)")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "var(--colorMorado)")};
  font-size: 12px;
  font-weight: 700;
  border-radius: 20px;
`;

const CarruselCategorias = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ChipCategoria = styled.button`
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${({ $color, $activo }) => ($activo ? $color : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $color, $activo }) => ($activo ? $color : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#6b6484")};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $color, $activo }) => ($activo ? $color : "rgba(83, 59, 143, 0.06)")};
  }
`;

/* ─── Paso 1: Grid de selección para el súper ─── */
const GridSeleccion = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  }
`;

const TarjetaSeleccionable = styled.div`
  position: relative;
  background: ${({ $seleccionado }) => ($seleccionado ? "rgba(83, 59, 143, 0.05)" : "#ffffff")};
  border: 1.5px solid ${({ $seleccionado }) => ($seleccionado ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.12)")};
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: ${({ $seleccionado }) => ($seleccionado ? "0 4px 14px rgba(83, 59, 143, 0.15)" : "0 1px 3px rgba(83, 59, 143, 0.03)")};
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--colorMorado);
    box-shadow: 0 4px 12px rgba(83, 59, 143, 0.1);
  }

  img {
    width: 68px;
    height: 68px;
    object-fit: contain;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12));
  }

  h5 {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: #211b38;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  span.precioRef {
    font-size: 11px;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #2f7d54;
    background: rgba(47, 125, 84, 0.1);
    padding: 3px 8px;
    border-radius: 6px;
  }
`;

const CheckBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--colorMorado);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 6px rgba(83, 59, 143, 0.35);
`;

const BarraFlotanteInferior = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid rgba(83, 59, 143, 0.12);
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  box-shadow: 0 -4px 16px rgba(83, 59, 143, 0.08);
  z-index: 100;

  @media (max-width: 480px) {
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
    gap: 10px;
  }
`;

const BotonContinuar = styled.button`
  height: 44px;
  padding: 0 20px;
  background: var(--colorMorado);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.25);
  transition: all 0.15s ease;

  @media (max-width: 480px) {
    padding: 0 14px;
    font-size: 13px;
  }

  &:hover:not(:disabled) {
    background: var(--colorMoradoOscuro, #533b8f);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(83, 59, 143, 0.35);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const BotonVolver = styled.button`
  height: 40px;
  padding: 0 14px;
  background: transparent;
  color: #6b6484;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.05);
    color: var(--colorMorado);
  }
`;

/* ─── Paso 2: Ajuste de cantidades y precios en el súper ─── */
const CampoTienda = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 10px;
  padding: 8px 12px;

  svg {
    color: var(--colorMorado);
    font-size: 14px;
  }

  input {
    flex: 1;
    border: none;
    font-size: 13px;
    color: #1a1a2e;
    background: transparent;

    &:focus {
      outline: none;
    }
  }
`;

const ListaCompras = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FilaSuper = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.03);

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const InfoSuperItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;

  img {
    width: 52px;
    height: 52px;
    object-fit: contain;
    flex-shrink: 0;
  }

  div.textos {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 14px;
      color: #211b38;
      font-weight: 700;
    }

    small {
      font-size: 12px;
      color: #6b6484;
    }
  }
`;

const ControlesCompra = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ControlStepper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 8px;
  padding: 3px 6px;
`;

const BotonStep = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  background: #ffffff;
  color: var(--colorMorado);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMorado);
    color: #ffffff;
    border-color: var(--colorMorado);
  }
`;

const InputCantidad = styled.input`
  width: 40px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1a1a2e;

  &:focus {
    outline: none;
  }
`;

const CajaPrecioHoy = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fbfbfe;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 8px;
  padding: 4px 8px;

  span.simbolo {
    font-weight: 700;
    color: #6b6484;
    font-size: 13px;
  }

  input {
    width: 65px;
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #1a1a2e;

    &:focus {
      outline: none;
    }
  }
`;

const SemaforoBadge = styled.div`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${({ $tipo }) =>
    $tipo === "bueno" ? "rgba(47, 125, 84, 0.12)" :
    $tipo === "caro" ? "rgba(192, 57, 43, 0.12)" :
    "rgba(83, 59, 143, 0.08)"};
  color: ${({ $tipo }) =>
    $tipo === "bueno" ? "#2f7d54" :
    $tipo === "caro" ? "#c0392b" :
    "#6b6484"};
`;

const SubtotalTexto = styled.div`
  font-size: 13px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1a1a2e;
  white-space: nowrap;
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

  p {
    margin: 0;
    font-size: 14px;
  }
`;

export const TabSuper = ({
    catalogo,
    onAbrirEntrada,
    onConfirmarCompras,
    areaSeleccionada = "Todas",
}) => {
    const [paso, setPaso] = useState(1);
    const [busqueda, setBusqueda] = useState("");
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
    const [seleccionados, setSeleccionados] = useState({}); // { [key]: itemCompra }
    const [tienda, setTienda] = useState("");
    const [guardando, setGuardando] = useState(false);

    // Extraer lista plana de productos y presentaciones
    const itemsSuper = useMemo(() => {
        if (!catalogo?.productos) return [];
        const lista = [];

        Object.values(catalogo.productos).forEach((prod) => {
            if (!prod.activo) return;
            const { area, categoria } = resolverAreaYCategoria(prod);
            const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa);

            if (!presentaciones.length) {
                lista.push({
                    key: `${prod.id}_base`,
                    productoId: prod.id,
                    presentacionId: null,
                    producto: prod,
                    presentacion: null,
                    nombre: prod.nombre,
                    nombreCompleto: prod.nombre,
                    area,
                    categoria,
                    imagen: resolverImagenProducto(prod),
                    ultimoPrecio: 0,
                    buenPrecio: 0,
                });
            } else {
                presentaciones.forEach((pres) => {
                    lista.push({
                        key: `${prod.id}_${pres.id}`,
                        productoId: prod.id,
                        presentacionId: pres.id,
                        producto: prod,
                        presentacion: pres,
                        nombre: prod.nombre,
                        nombreCompleto: `${prod.nombre} (${pres.nombre})`,
                        area,
                        categoria,
                        imagen: resolverImagenProducto({ ...prod, imagen: pres.imagen || prod.imagen }),
                        ultimoPrecio: Number(pres.ultimoPrecioPagado || pres.precioAproximado || 0),
                        buenPrecio: Number(pres.buenPrecio || 0),
                    });
                });
            }
        });

        return lista;
    }, [catalogo]);

    // Categorías disponibles según área
    const categoriasDisponibles = useMemo(() => {
        if (areaSeleccionada !== "Todas" && ESTRUCTURA_AREAS[areaSeleccionada]) {
            return ESTRUCTURA_AREAS[areaSeleccionada].categorias.map((c) => c.nombre);
        }
        return TODAS_LAS_CATEGORIAS_INTERNAS;
    }, [areaSeleccionada]);

    // Filtrar según área, categoría y texto
    const itemsFiltrados = useMemo(() => {
        return itemsSuper.filter((item) => {
            if (areaSeleccionada !== "Todas" && item.area !== areaSeleccionada) return false;
            if (categoriaSeleccionada !== "Todas" && item.categoria !== categoriaSeleccionada) return false;
            if (!busqueda) return true;
            const texto = busqueda.toLowerCase();
            return (
                item.nombreCompleto.toLowerCase().includes(texto) ||
                item.categoria.toLowerCase().includes(texto) ||
                item.area.toLowerCase().includes(texto)
            );
        });
    }, [itemsSuper, areaSeleccionada, categoriaSeleccionada, busqueda]);

    // Alternar selección de producto en Paso 1
    const toggleSeleccion = (item) => {
        setSeleccionados((prev) => {
            const copia = { ...prev };
            if (copia[item.key]) {
                delete copia[item.key];
            } else {
                // Sugerir precio: buenPrecio si existe, sino ultimoPrecio
                const precioSugerido = item.buenPrecio > 0 ? item.buenPrecio : (item.ultimoPrecio || 0);
                copia[item.key] = {
                    ...item,
                    cantidad: 1,
                    precioUnitario: precioSugerido,
                };
            }
            return copia;
        });
    };

    const actualizarCantidad = (key, delta) => {
        setSeleccionados((prev) => {
            const item = prev[key];
            if (!item) return prev;
            const actual = Number(item.cantidad || 1);
            const nueva = Math.max(0.1, Math.round((actual + delta) * 10) / 10);
            return {
                ...prev,
                [key]: { ...item, cantidad: nueva },
            };
        });
    };

    const actualizarPrecio = (key, nuevoPrecio) => {
        setSeleccionados((prev) => {
            const item = prev[key];
            if (!item) return prev;
            return {
                ...prev,
                [key]: { ...item, precioUnitario: nuevoPrecio },
            };
        });
    };

    const totalSeleccionados = Object.keys(seleccionados).length;

    // Calcular monto total de la compra en Paso 2
    const totalCompraEstimada = useMemo(() => {
        return Object.values(seleccionados).reduce((acc, item) => {
            const cant = Number(item.cantidad || 1);
            const prec = Number(item.precioUnitario || 0);
            return acc + (cant * prec);
        }, 0);
    }, [seleccionados]);

    const handleConfirmarCompras = async () => {
        const compras = Object.values(seleccionados).map((item) => ({
            ...item,
            cantidad: Number(item.cantidad || 1),
            precioUnitario: Number(item.precioUnitario || 0),
            precioTotal: Math.round((Number(item.cantidad || 1) * Number(item.precioUnitario || 0)) * 100) / 100,
        }));

        if (!compras.length) return;

        setGuardando(true);
        try {
            if (onConfirmarCompras) {
                await onConfirmarCompras(compras, tienda);
            }
            setSeleccionados({});
            setPaso(1);
        } catch (error) {
            console.error("Error al registrar compras del súper:", error);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Contenedor>
            {/* Header indicador del paso */}
            <IndicadorPaso>
                <TextoPaso>
                    <strong>
                        {paso === 1
                            ? "Paso 1: Selecciona lo que vas a comprar"
                            : "Paso 2: Confirma cantidades y precios del estante"}
                    </strong>
                    <span>
                        {paso === 1
                            ? "Toca los productos que llevas en tu carrito del súper"
                            : "Verifica precios con el semáforo para ahorrar"}
                    </span>
                </TextoPaso>
                <BadgePaso $activo={paso === 2}>
                    Paso {paso} de 2
                </BadgePaso>
            </IndicadorPaso>

            {paso === 1 ? (
                <>
                    {/* Buscador */}
                    <BarraBusqueda>
                        <FaSearch className="lupa" />
                        <InputBuscador
                            type="text"
                            placeholder="Buscar producto para el súper..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && <FaTimes className="borrar" onClick={() => setBusqueda("")} />}
                    </BarraBusqueda>

                    {/* Categorías internas del área seleccionada */}
                    <CarruselCategorias>
                        <ChipCategoria
                            type="button"
                            $color="var(--colorMorado, #6c5ce7)"
                            $activo={categoriaSeleccionada === "Todas"}
                            onClick={() => setCategoriaSeleccionada("Todas")}
                        >
                            Todas las categorías
                        </ChipCategoria>
                        {categoriasDisponibles.map((cat) => (
                            <ChipCategoria
                                key={cat}
                                type="button"
                                $color={colorCategoriaInterna(cat, areaSeleccionada)}
                                $activo={categoriaSeleccionada === cat}
                                onClick={() => setCategoriaSeleccionada(cat)}
                            >
                                {cat}
                            </ChipCategoria>
                        ))}
                    </CarruselCategorias>

                    {/* Grid de productos seleccionables (idéntico a TabGastar) */}
                    {itemsFiltrados.length === 0 ? (
                        <EstadoVacio>
                            <FaShoppingCart />
                            <p>No se encontraron productos en esta categoría.</p>
                        </EstadoVacio>
                    ) : (
                        <GridSeleccion>
                            {itemsFiltrados.map((item) => {
                                const estaSeleccionado = !!seleccionados[item.key];
                                return (
                                    <TarjetaSeleccionable
                                        key={item.key}
                                        $seleccionado={estaSeleccionado}
                                        onClick={() => toggleSeleccion(item)}
                                    >
                                        {estaSeleccionado && (
                                            <CheckBadge>
                                                <FaCheck />
                                            </CheckBadge>
                                        )}
                                        <img
                                            src={item.imagen}
                                            alt={item.nombreCompleto}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                            }}
                                        />
                                        <h5>{item.nombreCompleto}</h5>
                                        {item.buenPrecio > 0 ? (
                                            <span className="precioRef">
                                                Buen precio: ${item.buenPrecio}
                                            </span>
                                        ) : item.ultimoPrecio > 0 ? (
                                            <span className="precioRef">
                                                Último: ${item.ultimoPrecio}
                                            </span>
                                        ) : (
                                            <span className="precioRef" style={{ color: "#6b6484", background: "rgba(107, 100, 132, 0.1)" }}>
                                                Sin precio ref.
                                            </span>
                                        )}
                                    </TarjetaSeleccionable>
                                );
                            })}
                        </GridSeleccion>
                    )}

                    {/* Barra flotante inferior para avanzar */}
                    {totalSeleccionados > 0 && (
                        <BarraFlotanteInferior>
                            <div>
                                <strong style={{ color: "var(--colorMorado)", fontSize: "14px" }}>
                                    {totalSeleccionados} {totalSeleccionados === 1 ? "producto" : "productos"} en carrito
                                </strong>
                            </div>
                            <BotonContinuar type="button" onClick={() => setPaso(2)}>
                                Continuar <FaArrowRight />
                            </BotonContinuar>
                        </BarraFlotanteInferior>
                    )}
                </>
            ) : (
                <>
                    {/* Paso 2: Configuración de compras y precios */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <BotonVolver type="button" onClick={() => setPaso(1)}>
                            <FaArrowLeft /> Volver a selección
                        </BotonVolver>

                        <CampoTienda>
                            <FaStore />
                            <input
                                type="text"
                                placeholder="Tienda (Walmart, Aurrera, Soriana...)"
                                value={tienda}
                                onChange={(e) => setTienda(e.target.value)}
                            />
                        </CampoTienda>
                    </div>

                    <ListaCompras>
                        {Object.values(seleccionados).map((item) => {
                            const cant = Number(item.cantidad || 1);
                            const precioHoy = Number(item.precioUnitario || 0);
                            const tieneBuenPrecio = item.buenPrecio > 0;
                            const subtotal = Math.round(cant * precioHoy * 100) / 100;

                            let tipoSemaforo = "neutral";
                            let textoSemaforo = "Sin precio ref.";

                            if (precioHoy > 0 && tieneBuenPrecio) {
                                const diff = (item.buenPrecio - precioHoy).toFixed(2);
                                if (precioHoy <= item.buenPrecio) {
                                    tipoSemaforo = "bueno";
                                    textoSemaforo = `¡Buen precio! (-$${Math.abs(diff)})`;
                                } else {
                                    tipoSemaforo = "caro";
                                    textoSemaforo = `Caro (+$${Math.abs(diff)})`;
                                }
                            } else if (tieneBuenPrecio) {
                                textoSemaforo = `Estándar: $${item.buenPrecio}`;
                            }

                            return (
                                <FilaSuper key={item.key}>
                                    <InfoSuperItem>
                                        <img
                                            src={item.imagen}
                                            alt={item.nombreCompleto}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                            }}
                                        />
                                        <div className="textos">
                                            <strong>{item.nombreCompleto}</strong>
                                            <small>{item.categoria} • {item.area}</small>
                                        </div>
                                    </InfoSuperItem>

                                    <ControlesCompra>
                                        {/* Stepper de Cantidad */}
                                        <ControlStepper>
                                            <BotonStep
                                                type="button"
                                                onClick={() => actualizarCantidad(item.key, -1)}
                                                disabled={item.cantidad <= 1}
                                            >
                                                <FaMinus />
                                            </BotonStep>
                                            <InputCantidad
                                                type="number"
                                                min="0.1"
                                                step="1"
                                                value={item.cantidad}
                                                onChange={(e) => {
                                                    const val = Math.max(0.1, Number(e.target.value) || 1);
                                                    actualizarCantidad(item.key, val - item.cantidad);
                                                }}
                                            />
                                            <BotonStep
                                                type="button"
                                                onClick={() => actualizarCantidad(item.key, 1)}
                                            >
                                                <FaPlus />
                                            </BotonStep>
                                        </ControlStepper>

                                        {/* Precio Unitario Hoy */}
                                        <CajaPrecioHoy>
                                            <span className="simbolo">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                placeholder="0.00"
                                                value={item.precioUnitario}
                                                onChange={(e) => actualizarPrecio(item.key, Number(e.target.value))}
                                            />
                                        </CajaPrecioHoy>

                                        {/* Semáforo comparador */}
                                        <SemaforoBadge $tipo={tipoSemaforo}>
                                            {textoSemaforo}
                                        </SemaforoBadge>

                                        {/* Subtotal */}
                                        <SubtotalTexto>
                                            Subtotal: ${subtotal.toFixed(2)}
                                        </SubtotalTexto>
                                    </ControlesCompra>
                                </FilaSuper>
                            );
                        })}
                    </ListaCompras>

                    {/* Barra flotante inferior para confirmar compra */}
                    <BarraFlotanteInferior>
                        <div>
                            <span style={{ fontSize: "12px", color: "#6b6484", display: "block" }}>
                                {totalSeleccionados} {totalSeleccionados === 1 ? "artículo" : "artículos"}
                            </span>
                            <strong style={{ fontSize: "16px", color: "#2f7d54" }}>
                                Total: ${totalCompraEstimada.toFixed(2)} MXN
                            </strong>
                        </div>
                        <BotonContinuar
                            type="button"
                            onClick={handleConfirmarCompras}
                            disabled={guardando || totalSeleccionados === 0}
                        >
                            <FaCheckCircle /> {guardando ? "Registrando..." : "Confirmar e ingresar"}
                        </BotonContinuar>
                    </BarraFlotanteInferior>
                </>
            )}
        </Contenedor>
    );
};
