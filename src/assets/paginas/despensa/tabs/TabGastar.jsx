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
    FaUtensils,
    FaCheckCircle,
} from "react-icons/fa";
import { colorCategoria } from "../estilos";
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

/* ─── Paso 1: Grid de selección ─── */
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

  span.stock {
    font-size: 11px;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: ${({ $sinStock }) => ($sinStock ? "#c0392b" : "#2f7d54")};
    background: ${({ $sinStock }) => ($sinStock ? "rgba(192, 57, 43, 0.1)" : "rgba(47, 125, 84, 0.1)")};
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

/* ─── Paso 2: Ajuste de cantidades a gastar ─── */
const ListaCantidades = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FilaGasto = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.03);

  img {
    width: 52px;
    height: 52px;
    object-fit: contain;
    flex-shrink: 0;
  }
`;

const InfoGasto = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 2px;

  strong {
    font-size: 14px;
    color: #211b38;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    font-size: 12px;
    color: #6b6484;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ControlStepper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 8px;
  padding: 4px 8px;
`;

const BotonStep = styled.button`
  width: 30px;
  height: 30px;
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
  width: 44px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1a1a2e;

  &:focus {
    outline: none;
  }
`;

export const TabGastar = ({ catalogo, onConfirmarGasto }) => {
    const [paso, setPaso] = useState(1);
    const [busqueda, setBusqueda] = useState("");
    const [seleccionados, setSeleccionados] = useState({}); // { [key]: { producto, presentacion, cantidad } }
    const [motivoGeneral, setMotivoGeneral] = useState("Consumo en casa");
    const [guardando, setGuardando] = useState(false);

    // Obtener todas las presentaciones disponibles con stock
    const itemsDisponibles = useMemo(() => {
        if (!catalogo?.productos) return [];
        const lista = [];

        Object.values(catalogo.productos).forEach((prod) => {
            if (!prod.activo) return;
            const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa);

            presentaciones.forEach((pres) => {
                lista.push({
                    key: `${prod.id}_${pres.id}`,
                    productoId: prod.id,
                    presentacionId: pres.id,
                    producto: prod,
                    presentacion: pres,
                    nombre: prod.nombre,
                    nombreCompleto: `${prod.nombre} (${pres.nombre})`,
                    categoria: prod.categoria || "Despensa",
                    imagen: resolverImagenProducto({ ...prod, imagen: pres.imagen || prod.imagen }),
                    stock: Number(pres.stockActual || 0),
                    unidad: pres.unidad || "pz",
                });
            });
        });

        return lista;
    }, [catalogo]);

    const itemsFiltrados = useMemo(() => {
        if (!busqueda) return itemsDisponibles;
        return itemsDisponibles.filter((item) => (
            item.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase())
            || item.categoria.toLowerCase().includes(busqueda.toLowerCase())
        ));
    }, [itemsDisponibles, busqueda]);

    const toggleSeleccion = (item) => {
        setSeleccionados((prev) => {
            const copia = { ...prev };
            if (copia[item.key]) {
                delete copia[item.key];
            } else {
                copia[item.key] = {
                    ...item,
                    cantidadGasto: 1,
                };
            }
            return copia;
        });
    };

    const actualizarCantidadGasto = (key, delta) => {
        setSeleccionados((prev) => {
            const item = prev[key];
            if (!item) return prev;
            const actual = Number(item.cantidadGasto || 1);
            const nueva = Math.max(0.1, Math.round((actual + delta) * 10) / 10);
            return {
                ...prev,
                [key]: { ...item, cantidadGasto: nueva },
            };
        });
    };

    const setCantidadDirecta = (key, valor) => {
        const num = Number(valor);
        setSeleccionados((prev) => {
            const item = prev[key];
            if (!item) return prev;
            return {
                ...prev,
                [key]: { ...item, cantidadGasto: num >= 0 ? num : 1 },
            };
        });
    };

    const totalSeleccionados = Object.keys(seleccionados).length;

    const handleConfirmar = async () => {
        const consumos = Object.values(seleccionados).map((item) => ({
            productoId: item.productoId,
            presentacionId: item.presentacionId,
            cantidad: Number(item.cantidadGasto || 1),
            motivo: motivoGeneral,
        }));

        if (!consumos.length) return;

        setGuardando(true);
        try {
            await onConfirmarGasto(consumos, motivoGeneral);
            setSeleccionados({});
            setPaso(1);
        } catch (error) {
            console.error("Error al gastar despensa:", error);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Contenedor>
            {/* Header del paso */}
            <IndicadorPaso>
                <TextoPaso>
                    <strong>
                        {paso === 1 ? "Paso 1: Toca los productos a gastar" : "Paso 2: ¿Cuánto vas a gastar?"}
                    </strong>
                    <span>
                        {paso === 1
                            ? "Selecciona 1 o más productos con un toque"
                            : "Ajusta la cantidad a descontar de tu inventario"}
                    </span>
                </TextoPaso>
                <BadgePaso $activo={paso === 2}>
                    Paso {paso} de 2
                </BadgePaso>
            </IndicadorPaso>

            {paso === 1 ? (
                <>
                    {/* Buscador rápido */}
                    <BarraBusqueda>
                        <FaSearch className="lupa" />
                        <InputBuscador
                            type="text"
                            placeholder="Buscar en lo que tienes guardado..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && <FaTimes className="borrar" onClick={() => setBusqueda("")} />}
                    </BarraBusqueda>

                    {/* Grid de productos seleccionables */}
                    <GridSeleccion>
                        {itemsFiltrados.map((item) => {
                            const seleccionado = Boolean(seleccionados[item.key]);
                            return (
                                <TarjetaSeleccionable
                                    key={item.key}
                                    $seleccionado={seleccionado}
                                    $color={colorCategoria(item.categoria)}
                                    $sinStock={item.stock <= 0}
                                    onClick={() => toggleSeleccion(item)}
                                >
                                    {seleccionado && (
                                        <CheckBadge>
                                            <FaCheck />
                                        </CheckBadge>
                                    )}
                                    <img
                                        src={item.imagen}
                                        alt={item.nombre}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                        }}
                                    />
                                    <h5>{item.nombreCompleto}</h5>
                                    <span className="stock">
                                        {item.stock > 0 ? `${item.stock} ${item.unidad}` : "Sin stock"}
                                    </span>
                                </TarjetaSeleccionable>
                            );
                        })}
                    </GridSeleccion>

                    {/* Barra fija inferior para avanzar al paso 2 */}
                    <BarraFlotanteInferior>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ fontSize: "14px", color: "#211b38" }}>
                                {totalSeleccionados} {totalSeleccionados === 1 ? "producto" : "productos"}
                            </strong>
                            <span style={{ fontSize: "12px", color: "#6b6484" }}>
                                {totalSeleccionados > 0 ? "Listos para descontar" : "Toca los que vayas a usar"}
                            </span>
                        </div>
                        <BotonContinuar
                            type="button"
                            disabled={totalSeleccionados === 0}
                            onClick={() => setPaso(2)}
                        >
                            Siguiente paso <FaArrowRight />
                        </BotonContinuar>
                    </BarraFlotanteInferior>
                </>
            ) : (
                <>
                    {/* Botón para regresar al paso 1 */}
                    <button
                        type="button"
                        onClick={() => setPaso(1)}
                        style={{
                            alignSelf: "flex-start",
                            background: "transparent",
                            border: "none",
                            color: "var(--colorMorado, #6c5ce7)",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <FaArrowLeft /> Regresar y elegir más
                    </button>

                    {/* Lista de productos para ajustar cantidades */}
                    <ListaCantidades>
                        {Object.values(seleccionados).map((item) => (
                            <FilaGasto key={item.key}>
                                <img
                                    src={item.imagen}
                                    alt={item.nombre}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                    }}
                                />
                                <InfoGasto>
                                    <strong>{item.nombreCompleto}</strong>
                                    <span>Stock actual: {item.stock} {item.unidad}</span>
                                </InfoGasto>

                                <ControlStepper>
                                    <BotonStep
                                        type="button"
                                        onClick={() => actualizarCantidadGasto(item.key, -1)}
                                    >
                                        <FaMinus />
                                    </BotonStep>
                                    <InputCantidad
                                        type="number"
                                        step="any"
                                        value={item.cantidadGasto}
                                        onChange={(e) => setCantidadDirecta(item.key, e.target.value)}
                                    />
                                    <span style={{ fontSize: "12px", color: "#6b6484", fontWeight: 700 }}>
                                        {item.unidad}
                                    </span>
                                    <BotonStep
                                        type="button"
                                        onClick={() => actualizarCantidadGasto(item.key, 1)}
                                    >
                                        <FaPlus />
                                    </BotonStep>
                                </ControlStepper>
                            </FilaGasto>
                        ))}
                    </ListaCantidades>

                    {/* Barra fija inferior para confirmar el gasto */}
                    <BarraFlotanteInferior>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ fontSize: "14px", color: "#211b38" }}>
                                Total a gastar: {totalSeleccionados} ítems
                            </strong>
                            <span style={{ fontSize: "12px", color: "#6b6484" }}>
                                Se descontará de tu despensa
                            </span>
                        </div>
                        <BotonContinuar
                            type="button"
                            disabled={guardando}
                            onClick={handleConfirmar}
                            style={{ background: "#2f7d54" }}
                        >
                            <FaCheckCircle /> {guardando ? "Descontando..." : "Confirmar Consumo"}
                        </BotonContinuar>
                    </BarraFlotanteInferior>
                </>
            )}
        </Contenedor>
    );
};
