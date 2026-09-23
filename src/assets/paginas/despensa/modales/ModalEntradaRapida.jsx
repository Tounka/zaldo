import { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { FaTag, FaBox, FaDollarSign, FaPlus, FaCheck, FaStore, FaLayerGroup, FaCartPlus } from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/ModalGenerico";
import { UNIDADES_DESPENSA } from "../../../funciones/firebase/despensa";
import {
    AREAS_DESPENSA,
    ESTRUCTURA_AREAS,
    resolverAreaYCategoria,
    colorArea,
    colorCategoriaInterna,
} from "../areasYCategorias";
import { detectarIconoProducto, resolverImagenProducto } from "../iconosDespensa";
import { SelectorIconoModal } from "./SelectorIconoModal";
import { colorCategoria } from "../estilos";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 18px max(24px, env(safe-area-inset-bottom, 24px));
`;

const FilaAvatar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fbfbfe;
  border: 1px solid #e2e0f0;
  border-radius: 14px;
  padding: 12px;
`;

const AvatarBoton = styled.button`
  width: 64px;
  height: 64px;
  border-radius: 14px;
  border: 2px dashed #cbc7e2;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--colorMorado, #6c5ce7);
    transform: scale(1.05);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 12px;
  }
`;

const AvatarTexto = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;

  strong {
    font-size: 14px;
    color: #211b38;
  }

  span {
    font-size: 12px;
    color: #6b6484;
  }
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 700;
    color: #211b38;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid #e2e0f0;
  border-radius: 10px;
  font-size: 16px;
  color: #211b38;
  background: #ffffff;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado, #6c5ce7);
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
  }
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const Select = styled.select`
  width: 100%;
  height: 46px;
  padding: 0 12px;
  border: 1px solid #e2e0f0;
  border-radius: 10px;
  font-size: 15px;
  color: #211b38;
  background: #ffffff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--colorMorado, #6c5ce7);
  }
`;

const PillsCategorias = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
`;

const Pill = styled.button`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid ${({ $color, $activo }) => ($activo ? $color : "#e2e0f0")};
  background: ${({ $color, $activo }) => ($activo ? $color : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#6b6484")};
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $color }) => $color};
  }
`;

const GridPresentaciones = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
`;

const CardPresentacion = styled.button`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 9px 12px;
  background: ${({ $activo }) => ($activo ? "#f4efff" : "#ffffff")};
  border: 2px solid ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "#e2e0f0")};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--colorMorado, #6c5ce7);
    transform: translateY(-1px);
  }

  .nombre {
    font-size: 13px;
    font-weight: 800;
    color: ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "#211b38")};
  }

  .meta {
    font-size: 11px;
    color: #6b6484;
    display: flex;
    gap: 6px;
    align-items: center;

    strong {
      color: #2f7d54;
      font-weight: 700;
    }
  }

  .check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--colorMorado, #6c5ce7);
    color: #ffffff;
    font-size: 9px;
    display: grid;
    place-items: center;
  }
`;

const BotonNuevaPres = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  background: ${({ $activo }) => ($activo ? "#f4efff" : "#fbfbfe")};
  border: 2px dashed ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "#cbc7e2")};
  border-radius: 12px;
  color: ${({ $activo }) => ($activo ? "var(--colorMorado, #6c5ce7)" : "#6b6484")};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--colorMorado, #6c5ce7);
    color: var(--colorMorado, #6c5ce7);
  }
`;

const InfoPresentacionSeleccionada = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fbf9ff;
  border: 1px solid #e2e0f0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  color: #4a3e68;

  strong {
    color: var(--colorMorado, #6c5ce7);
    font-weight: 800;
  }
`;

const AyudaCalculo = styled.div`
  font-size: 12px;
  color: #2f7d54;
  font-weight: 600;
  background: #eafaf1;
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
`;

const BotonGuardar = styled.button`
  width: 100%;
  height: 50px;
  background: var(--colorMorado, #6c5ce7);
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.25);
  margin-top: 8px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(108, 92, 231, 0.35);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ListaSugerencias = styled.div`
  max-height: 120px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e2e0f0;
  border-radius: 8px;
  margin-top: 4px;
`;

const OpcionSugerencia = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: #f6f6fb;
    color: var(--colorMorado, #6c5ce7);
  }
`;

export const ModalEntradaRapida = ({
    abierto,
    onClose,
    onGuardar,
    catalogo,
    productoPreseleccionado,
}) => {
    const [nombreProducto, setNombreProducto] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [presentacionId, setPresentacionId] = useState(null);
    const [creandoNuevaPresentacion, setCreandoNuevaPresentacion] = useState(false);
    const [nombrePresentacion, setNombrePresentacion] = useState("");
    const [cantidad, setCantidad] = useState("1");
    const [unidad, setUnidad] = useState("pz");
    const [costoTotal, setCostoTotal] = useState("");
    const [buenPrecio, setBuenPrecio] = useState("");
    const [area, setArea] = useState("Despensa");
    const [categoria, setCategoria] = useState("Abarrotes y Despensa seca");
    const [icono, setIcono] = useState("/despensa/iconos/atun.jpg");
    const [tienda, setTienda] = useState("");
    const [modalIconoAbierto, setModalIconoAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [costoModificadoManualmente, setCostoModificadoManualmente] = useState(false);

    // Lista de productos para autocompletar
    const productosExistentes = useMemo(() => {
        return Object.values(catalogo?.productos || {}).filter((p) => p.activo);
    }, [catalogo]);

    const presentacionesDisponibles = useMemo(() => {
        if (!productoSeleccionado?.presentaciones) return [];
        return Object.values(productoSeleccionado.presentaciones).filter((p) => p.activa !== false);
    }, [productoSeleccionado]);

    const presActual = useMemo(() => {
        if (creandoNuevaPresentacion || !presentacionId) return null;
        return presentacionesDisponibles.find((p) => p.id === presentacionId) || null;
    }, [creandoNuevaPresentacion, presentacionId, presentacionesDisponibles]);

    useEffect(() => {
        if (!abierto) return;
        setCostoModificadoManualmente(false);

        if (productoPreseleccionado) {
            setProductoSeleccionado(productoPreseleccionado);
            setNombreProducto(productoPreseleccionado.nombre || "");
            const resolved = resolverAreaYCategoria(productoPreseleccionado);
            setArea(resolved.area);
            setCategoria(resolved.categoria);
            setIcono(resolverImagenProducto(productoPreseleccionado));

            const pres = Object.values(productoPreseleccionado.presentaciones || {}).filter((p) => p.activa !== false);
            if (pres.length > 0) {
                setCreandoNuevaPresentacion(false);
                setPresentacionId(pres[0].id);
                setNombrePresentacion(pres[0].nombre || "");
                setUnidad(pres[0].unidad || "pz");
                setBuenPrecio(pres[0].buenPrecio ? String(pres[0].buenPrecio) : "");
                if (pres[0].buenPrecio) {
                    setCostoTotal((1 * Number(pres[0].buenPrecio)).toFixed(2));
                } else {
                    setCostoTotal("");
                }
            } else {
                setCreandoNuevaPresentacion(true);
                setPresentacionId(null);
                setNombrePresentacion("");
                setUnidad("pz");
                setCostoTotal("");
                setBuenPrecio("");
            }
        } else {
            setProductoSeleccionado(null);
            setPresentacionId(null);
            setCreandoNuevaPresentacion(false);
            setNombreProducto("");
            setNombrePresentacion("");
            setCantidad("1");
            setUnidad("pz");
            setCostoTotal("");
            setBuenPrecio("");
            setArea("Despensa");
            setCategoria("Abarrotes y Despensa seca");
            setIcono("/despensa/iconos/atun.jpg");
            setTienda("");
        }
    }, [abierto, productoPreseleccionado]);

    // Al teclear el nombre del producto, auto-detectar ícono y categoría si es nuevo
    const handleNombreChange = (e) => {
        const valor = e.target.value;
        setNombreProducto(valor);

        // Si coincide con uno existente, preseleccionar categoría, avatar y presentaciones
        const encontrado = productosExistentes.find(
            (p) => p.nombre.toLowerCase() === valor.trim().toLowerCase(),
        );

        if (encontrado) {
            seleccionarProducto(encontrado);
        } else {
            setProductoSeleccionado(null);
            setPresentacionId(null);
            setCreandoNuevaPresentacion(true);
            if (valor.length >= 3) {
                const iconoDetectado = detectarIconoProducto(valor, categoria);
                setIcono(iconoDetectado);
                const resolved = resolverAreaYCategoria({ nombre: valor, categoria });
                setArea(resolved.area);
                setCategoria(resolved.categoria);
            }
        }
    };

    const sugerenciasFiltradas = useMemo(() => {
        if (!nombreProducto || nombreProducto.length < 2) return [];
        return productosExistentes
            .filter((p) => p.nombre.toLowerCase().includes(nombreProducto.toLowerCase()))
            .slice(0, 5);
    }, [nombreProducto, productosExistentes]);

    const seleccionarProducto = (prod) => {
        setProductoSeleccionado(prod);
        setNombreProducto(prod.nombre);
        const resolved = resolverAreaYCategoria(prod);
        setArea(resolved.area);
        setCategoria(resolved.categoria);
        setIcono(resolverImagenProducto(prod));
        setCostoModificadoManualmente(false);

        const pres = Object.values(prod.presentaciones || {}).filter((p) => p.activa !== false);
        if (pres.length > 0) {
            setCreandoNuevaPresentacion(false);
            setPresentacionId(pres[0].id);
            setNombrePresentacion(pres[0].nombre || "");
            setUnidad(pres[0].unidad || "pz");
            setBuenPrecio(pres[0].buenPrecio ? String(pres[0].buenPrecio) : "");
            if (pres[0].buenPrecio) {
                setCostoTotal((Number(cantidad || 1) * Number(pres[0].buenPrecio)).toFixed(2));
            }
        } else {
            setCreandoNuevaPresentacion(true);
            setPresentacionId(null);
        }
    };

    const handleCantidadChange = (val) => {
        setCantidad(val);
        const cantNum = Number(val || 0);
        if (!costoModificadoManualmente && presActual?.buenPrecio && cantNum > 0) {
            setCostoTotal((cantNum * Number(presActual.buenPrecio)).toFixed(2));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nombreProducto.trim()) return;

        setGuardando(true);
        try {
            const presFinal = !creandoNuevaPresentacion && presActual ? presActual : null;
            await onGuardar({
                nombreProducto: nombreProducto.trim(),
                presentacionId: presFinal?.id || null,
                nombrePresentacion: presFinal?.nombre || nombrePresentacion.trim() || `${cantidad} ${unidad}`,
                cantidadComprada: Number(cantidad || 1),
                unidad: presFinal?.unidad || unidad,
                costoTotal: Number(costoTotal || 0),
                buenPrecio: presFinal?.buenPrecio || Number(buenPrecio || 0),
                area,
                categoria,
                icono,
                tienda: tienda.trim(),
                fecha: new Date(),
            });
            onClose();
        } catch (error) {
            console.error("Error al guardar entrada rápida:", error);
        } finally {
            setGuardando(false);
        }
    };

    const precioUnitarioEstimado = useMemo(() => {
        const total = Number(costoTotal || 0);
        const cant = Number(cantidad || 1);
        if (total <= 0 || cant <= 0) return 0;
        return (total / cant).toFixed(2);
    }, [costoTotal, cantidad]);

    if (!abierto) return null;

    return (
        <>
            <ModalGenerico
                isOpen={abierto}
                abierto={abierto}
                onClose={onClose}
                maxAncho="500px"
                encabezado={(
                    <ModalEncabezado
                        icon={<FaCartPlus />}
                        title="Entrada Rápida a Despensa"
                        description="Registra lo que compraste con solo 3 datos indispensables"
                    />
                )}
            >
                <Form onSubmit={handleSubmit}>
                    {/* Sticker y Selector de Categoría */}
                    <FilaAvatar>
                        <AvatarBoton
                            type="button"
                            onClick={() => setModalIconoAbierto(true)}
                            title="Toca para cambiar el sticker"
                        >
                            <img
                                src={icono}
                                alt="Sticker"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                }}
                            />
                        </AvatarBoton>
                        <AvatarTexto>
                            <strong>Sticker</strong>
                            <span>Toca la imagen para cambiar el sticker ilustrado</span>
                        </AvatarTexto>
                    </FilaAvatar>

                    {/* Área Principal */}
                    <Campo>
                        <label>Área principal</label>
                        <PillsCategorias>
                            {AREAS_DESPENSA.map((ar) => (
                                <Pill
                                    key={ar}
                                    type="button"
                                    $color={colorArea(ar)}
                                    $activo={area === ar}
                                    onClick={() => {
                                        setArea(ar);
                                        const primerCat = ESTRUCTURA_AREAS[ar]?.categorias?.[0]?.nombre || categoria;
                                        setCategoria(primerCat);
                                    }}
                                >
                                    {ar}
                                </Pill>
                            ))}
                        </PillsCategorias>
                    </Campo>

                    {/* Categoría interna */}
                    <Campo>
                        <label>Categoría en {area}</label>
                        <PillsCategorias>
                            {(ESTRUCTURA_AREAS[area]?.categorias || []).map((cat) => (
                                <Pill
                                    key={cat.nombre}
                                    type="button"
                                    $color={cat.color}
                                    $activo={categoria === cat.nombre}
                                    onClick={() => setCategoria(cat.nombre)}
                                >
                                    {cat.nombre}
                                </Pill>
                            ))}
                        </PillsCategorias>
                    </Campo>

                    {/* 1. Producto */}
                    <Campo>
                        <label>
                            <FaBox /> ¿Qué producto compraste?
                        </label>
                        <Input
                            type="text"
                            placeholder="Ej. Atún Dolores, Leche Lala, Huevos..."
                            value={nombreProducto}
                            onChange={handleNombreChange}
                            required
                            autoFocus
                        />
                        {sugerenciasFiltradas.length > 0 && (
                            <ListaSugerencias>
                                {sugerenciasFiltradas.map((prod) => (
                                    <OpcionSugerencia
                                        key={prod.id}
                                        onClick={() => {
                                            seleccionarProducto(prod);
                                        }}
                                    >
                                        <span>{prod.nombre}</span>
                                        <small style={{ color: "#6b6484" }}>{prod.categoria}</small>
                                    </OpcionSugerencia>
                                ))}
                            </ListaSugerencias>
                        )}
                    </Campo>

                    {/* 2. Selector de Presentaciones Existentes (prioritario) */}
                    {presentacionesDisponibles.length > 0 && (
                        <Campo>
                            <label>
                                <FaLayerGroup /> Elige la presentación a surtir
                            </label>
                            <GridPresentaciones>
                                {presentacionesDisponibles.map((pres) => {
                                    const esActivo = !creandoNuevaPresentacion && presentacionId === pres.id;
                                    return (
                                        <CardPresentacion
                                            key={pres.id}
                                            type="button"
                                            $activo={esActivo}
                                            onClick={() => {
                                                setCreandoNuevaPresentacion(false);
                                                setPresentacionId(pres.id);
                                                setUnidad(pres.unidad || "pz");
                                                if (pres.buenPrecio) {
                                                    setBuenPrecio(String(pres.buenPrecio));
                                                    if (Number(cantidad) > 0) {
                                                        setCostoTotal((Number(cantidad) * Number(pres.buenPrecio)).toFixed(2));
                                                    }
                                                }
                                            }}
                                        >
                                            <div className="nombre">{pres.nombre}</div>
                                            <div className="meta">
                                                <span>Stock: {pres.stockActual || 0} {pres.unidad}</span>
                                                {pres.buenPrecio > 0 && <strong>${pres.buenPrecio}</strong>}
                                            </div>
                                            {esActivo && (
                                                <div className="check">
                                                    <FaCheck />
                                                </div>
                                            )}
                                        </CardPresentacion>
                                    );
                                })}

                                <BotonNuevaPres
                                    type="button"
                                    $activo={creandoNuevaPresentacion}
                                    onClick={() => {
                                        setCreandoNuevaPresentacion(true);
                                        setPresentacionId(null);
                                        setNombrePresentacion("");
                                        setBuenPrecio("");
                                    }}
                                >
                                    <FaPlus /> Nueva presentación
                                </BotonNuevaPres>
                            </GridPresentaciones>
                        </Campo>
                    )}

                    {/* Si seleccionó una existente, mostramos pill informativo */}
                    {!creandoNuevaPresentacion && presActual && (
                        <InfoPresentacionSeleccionada>
                            <div>
                                Surtir a: <strong>{presActual.nombre}</strong> ({presActual.unidad})
                            </div>
                            <div>
                                {presActual.buenPrecio > 0 ? (
                                    <>Costo preferente: <strong style={{ color: "#2f7d54" }}>${presActual.buenPrecio}</strong></>
                                ) : (
                                    <>Stock actual: <strong>{presActual.stockActual || 0} {presActual.unidad}</strong></>
                                )}
                            </div>
                        </InfoPresentacionSeleccionada>
                    )}

                    {/* Si eligió crear nueva presentación (o el producto no tiene existentes), mostrar campos */}
                    {(creandoNuevaPresentacion || presentacionesDisponibles.length === 0) && (
                        <Grid2>
                            <Campo>
                                <label>Nueva Presentación / Empaque</label>
                                <Input
                                    type="text"
                                    placeholder="Ej. Lata 140g, Sobre, 1L..."
                                    value={nombrePresentacion}
                                    onChange={(e) => setNombrePresentacion(e.target.value)}
                                    required={creandoNuevaPresentacion}
                                />
                            </Campo>

                            <Campo>
                                <label>Unidad de medida</label>
                                <Select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                                    <option value="pz">Piezas (pz)</option>
                                    <option value="kg">Kilogramos (kg)</option>
                                    <option value="g">Gramos (g)</option>
                                    <option value="L">Litros (L)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="paq">Paquete (paq)</option>
                                    <option value="lata">Lata</option>
                                    <option value="sobre">Sobre</option>
                                    <option value="caja">Caja</option>
                                    <option value="botella">Botella</option>
                                </Select>
                            </Campo>
                        </Grid2>
                    )}

                    {/* 3. Cantidad y Costo Total */}
                    <Grid2>
                        <Campo>
                            <label>¿Cuántos compraste?</label>
                            <Input
                                type="number"
                                step="any"
                                min="0.1"
                                placeholder="1"
                                value={cantidad}
                                onChange={(e) => handleCantidadChange(e.target.value)}
                                required
                            />
                        </Campo>

                        <Campo>
                            <label>
                                <FaDollarSign /> Costo total pagado
                            </label>
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="$0.00"
                                value={costoTotal}
                                onChange={(e) => {
                                    setCostoModificadoManualmente(true);
                                    setCostoTotal(e.target.value);
                                }}
                                required
                            />
                        </Campo>
                    </Grid2>

                    {!creandoNuevaPresentacion && presActual?.buenPrecio > 0 && (
                        <div style={{ fontSize: "11px", color: "#6b6484", background: "#f8f7fc", padding: "6px 10px", borderRadius: "8px", border: "1px solid #ece8f8" }}>
                            💡 Puedes ingresar un costo diferente si este lote costó distinto; tu costo preferente (${presActual.buenPrecio}) se mantendrá guardado.
                        </div>
                    )}

                    {precioUnitarioEstimado > 0 && (
                        <AyudaCalculo>
                            <span>Costo unitario calculado:</span>
                            <strong>${precioUnitarioEstimado} MXN cada {presActual?.unidad || unidad}</strong>
                        </AyudaCalculo>
                    )}

                    {/* Buen Precio Estándar para el Súper (solo si es nueva presentación o si quiere ajustarlo) */}
                    {(creandoNuevaPresentacion || presentacionesDisponibles.length === 0) && (
                        <Campo>
                            <label>
                                <FaTag style={{ color: "#2f7d54" }} /> Buen precio estándar (para comparar en el súper)
                            </label>
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="Ej. $18.50 (lo que consideras buen precio)"
                                value={buenPrecio}
                                onChange={(e) => setBuenPrecio(e.target.value)}
                            />
                        </Campo>
                    )}

                    {/* Tienda (Opcional) */}
                    <Campo>
                        <label>
                            <FaStore /> Tienda / Supermercado (opcional)
                        </label>
                        <Input
                            type="text"
                            placeholder="Ej. Walmart, Bodega Aurrera, Chedraui..."
                            value={tienda}
                            onChange={(e) => setTienda(e.target.value)}
                        />
                    </Campo>

                    <BotonGuardar type="submit" disabled={guardando || !nombreProducto.trim()}>
                        <FaPlus /> {guardando ? "Guardando en despensa..." : "Guardar en Despensa"}
                    </BotonGuardar>
                </Form>
            </ModalGenerico>

            {/* Modal para cambiar sticker Paper Mario */}
            <SelectorIconoModal
                abierto={modalIconoAbierto}
                onClose={() => setModalIconoAbierto(false)}
                onSelect={(nuevaRuta) => setIcono(nuevaRuta)}
                iconoSeleccionado={icono}
            />
        </>
    );
};

