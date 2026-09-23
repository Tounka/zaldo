import { useState, useMemo } from "react";
import styled from "styled-components";
import {
    FaUtensils,
    FaPlus,
    FaTrash,
    FaPen,
    FaCheck,
    FaSearch,
    FaTimes,
    FaBoxes,
} from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/ModalGenerico";
import { calcularCostoPromedio } from "../../../funciones/firebase/despensa";
import { resolverImagenProducto } from "../iconosDespensa";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 20px;
  max-width: 580px;
  width: 100%;
  box-sizing: border-box;
  max-height: 85vh;
  overflow-y: auto;

  @media (max-width: 480px) {
    padding: 0 10px 16px;
    gap: 12px;
  }
`;

const ListaAlimentos = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TarjetaAlimento = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1.5px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
    box-shadow: 0 2px 8px rgba(83, 59, 143, 0.08);
  }
`;

const InfoAlimento = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;

  .titulo-linea {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  strong {
    font-size: 14px;
    color: #1a1a2e;
  }

  .badge-momento {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: capitalize;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(83, 59, 143, 0.08);
    color: var(--colorMorado);
  }

  .ingredientes-txt {
    font-size: 11.5px;
    color: #6b6484;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const CostoBadge = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: #2f7d54;
  font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: nowrap;
`;

const AccionesFila = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BotonIcono = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${({ $peligro }) => ($peligro ? "rgba(220, 53, 69, 0.2)" : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $peligro }) => ($peligro ? "#fff5f5" : "#ffffff")};
  color: ${({ $peligro }) => ($peligro ? "#dc3545" : "var(--colorMorado)")};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $peligro }) => ($peligro ? "#dc3545" : "var(--colorMorado)")};
    color: #ffffff;
    border-color: transparent;
  }
`;

const Formulario = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fbfaff;
  border: 1.5px solid rgba(83, 59, 143, 0.18);
  border-radius: 14px;
  padding: 16px;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: #211b38;
  }

  input, select, textarea {
    height: 40px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid rgba(83, 59, 143, 0.2);
    background: #ffffff;
    font-size: 14px;
    color: #1a1a2e;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--colorMorado);
      box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.08);
    }
  }

  textarea {
    height: 60px;
    padding: 8px 12px;
    resize: none;
  }
`;

const GridDosColumnas = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SeccionIngredientes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed rgba(83, 59, 143, 0.15);
`;

const HeaderIngredientes = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  strong {
    font-size: 12.5px;
    color: #211b38;
  }

  span.sugerido {
    font-size: 11px;
    color: #2f7d54;
    font-weight: 700;
  }
`;

const FilaIngrediente = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(83, 59, 143, 0.1);

  .info-ing {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;

    strong {
      font-size: 13px;
      color: #1a1a2e;
    }

    span {
      font-size: 11px;
      color: #6b6484;
    }
  }

  .costo-ing {
    font-size: 12px;
    font-weight: 700;
    color: #2f7d54;
    white-space: nowrap;
  }
`;

const BuscadorDespensa = styled.div`
  position: relative;
  width: 100%;

  svg.lupa {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b6484;
    font-size: 12px;
  }

  input {
    width: 100%;
    height: 36px;
    padding: 0 32px;
    background: #ffffff;
    border: 1px solid rgba(83, 59, 143, 0.2);
    border-radius: 8px;
    font-size: 13px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--colorMorado);
    }
  }

  svg.borrar {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    cursor: pointer;
    font-size: 12px;
  }
`;

const ResultadosBusqueda = styled.div`
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 8px;
  padding: 6px;
`;

const ItemBusqueda = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }

  .item-tit {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #1a1a2e;
  }

  .item-costo {
    color: #2f7d54;
    font-weight: 700;
  }
`;

const BotonPrincipal = styled.button`
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--colorMoradoOscuro, #533b8f);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BotonSecundario = styled.button`
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: white;
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.05);
  }
`;

const VacioTexto = styled.div`
  text-align: center;
  padding: 24px 12px;
  color: #6b6484;
  font-size: 13px;
  line-height: 1.5;
`;

export const ModalGestionAlimentosConstantes = ({
    isOpen,
    onClose,
    catalogo,
    onGuardarAlimento,
    onEliminarAlimento,
}) => {
    const [editando, setEditando] = useState(false);
    const [idActual, setIdActual] = useState(null);
    const [nombre, setNombre] = useState("");
    const [momento, setMomento] = useState("desayuno");
    const [costoAprox, setCostoAprox] = useState("");
    const [notas, setNotas] = useState("");
    const [ingredientes, setIngredientes] = useState([]);
    const [busquedaPantry, setBusquedaPantry] = useState("");
    const [guardando, setGuardando] = useState(false);

    // Lista de alimentos constantes en el catálogo
    const alimentosGuardados = useMemo(() => {
        if (!catalogo?.alimentosConstantes) return [];
        return Object.values(catalogo.alimentosConstantes)
            .filter((a) => a.activo !== false)
            .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
    }, [catalogo]);

    // Productos disponibles en catálogo para añadir a la receta
    const productosDisponibles = useMemo(() => {
        if (!catalogo?.productos) return [];
        const lista = [];
        Object.values(catalogo.productos).forEach((prod) => {
            if (prod.activo === false) return;
            Object.values(prod.presentaciones || {}).forEach((pres) => {
                if (pres.activa === false) return;
                const costoUnit = calcularCostoPromedio(pres);
                lista.push({
                    productoId: prod.id,
                    presentacionId: pres.id,
                    nombreProducto: prod.nombre,
                    nombrePresentacion: pres.nombre,
                    nombreCompleto: `${prod.nombre} (${pres.nombre})`,
                    unidad: pres.unidad || "pz",
                    costoUnit,
                    imagen: resolverImagenProducto({ ...prod, imagen: pres.imagen || prod.imagen }),
                });
            });
        });
        return lista;
    }, [catalogo]);

    const productosFiltrados = useMemo(() => {
        if (!busquedaPantry.trim()) return [];
        const q = busquedaPantry.toLowerCase();
        return productosDisponibles
            .filter((p) => p.nombreCompleto.toLowerCase().includes(q))
            .slice(0, 10);
    }, [productosDisponibles, busquedaPantry]);

    // Costo sugerido en base a ingredientes
    const costoSugeridoIngredientes = useMemo(() => {
        return ingredientes.reduce((acc, ing) => acc + (Number(ing.costoTotal) || 0), 0);
    }, [ingredientes]);

    const iniciarNuevo = () => {
        setIdActual(null);
        setNombre("");
        setMomento("desayuno");
        setCostoAprox("");
        setNotas("");
        setIngredientes([]);
        setBusquedaPantry("");
        setEditando(true);
    };

    const iniciarEditar = (alim) => {
        setIdActual(alim.id);
        setNombre(alim.nombre || "");
        setMomento(alim.momento || "desayuno");
        setCostoAprox(alim.costoAprox ? String(alim.costoAprox) : "");
        setNotas(alim.notas || "");
        setIngredientes(alim.ingredientes || []);
        setBusquedaPantry("");
        setEditando(true);
    };

    const cancelarEdicion = () => {
        setEditando(false);
        setIdActual(null);
    };

    const agregarIngrediente = (prod) => {
        const existente = ingredientes.find(
            (i) => i.productoId === prod.productoId && i.presentacionId === prod.presentacionId
        );
        if (existente) {
            // Incrementar cantidad
            setIngredientes((prev) => prev.map((i) => {
                if (i.productoId === prod.productoId && i.presentacionId === prod.presentacionId) {
                    const cant = i.cantidad + 1;
                    return { ...i, cantidad: cant, costoTotal: cant * i.costoUnitario };
                }
                return i;
            }));
        } else {
            const nuevo = {
                productoId: prod.productoId,
                presentacionId: prod.presentacionId,
                nombreProducto: prod.nombreProducto,
                nombrePresentacion: prod.nombrePresentacion,
                cantidad: 1,
                unidad: prod.unidad,
                costoUnitario: prod.costoUnit,
                costoTotal: prod.costoUnit,
            };
            setIngredientes((prev) => {
                const actual = [...prev, nuevo];
                // Si el costoAprox estaba vacío o en 0, auto-proponer
                if (!costoAprox || Number(costoAprox) === 0) {
                    const sum = actual.reduce((a, b) => a + b.costoTotal, 0);
                    setCostoAprox(String(Math.round(sum * 100) / 100));
                }
                return actual;
            });
        }
        setBusquedaPantry("");
    };

    const cambiarCantidadIngrediente = (index, delta) => {
        setIngredientes((prev) => {
            const copia = [...prev];
            const item = copia[index];
            if (!item) return prev;
            const nuevaCant = Math.max(0.1, Math.round((item.cantidad + delta) * 10) / 10);
            copia[index] = {
                ...item,
                cantidad: nuevaCant,
                costoTotal: Math.round(nuevaCant * item.costoUnitario * 100) / 100,
            };
            return copia;
        });
    };

    const eliminarIngrediente = (index) => {
        setIngredientes((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleGuardar = async () => {
        if (!nombre.trim()) return;
        setGuardando(true);
        try {
            const finalCosto = costoAprox !== "" ? Number(costoAprox) : costoSugeridoIngredientes;
            await onGuardarAlimento({
                id: idActual || undefined,
                nombre: nombre.trim(),
                momento,
                costoAprox: finalCosto,
                ingredientes,
                notas,
            });
            setEditando(false);
            setIdActual(null);
        } catch (error) {
            console.error("Error al guardar alimento constante:", error);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (alimId) => {
        if (window.confirm("¿Seguro que deseas eliminar este alimento frecuente?")) {
            await onEliminarAlimento(alimId);
            if (idActual === alimId) {
                setEditando(false);
                setIdActual(null);
            }
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <Contenedor>
                <ModalEncabezado
                    icon={<FaUtensils />}
                    title={editando ? (idActual ? "Editar Alimento Frecuente" : "Nuevo Alimento Frecuente") : "Mis Alimentos Constantes"}
                    description="Guarda platillos y alimentos habituales para registrarlos con 1 solo toque y descontar despensa automáticamente."
                />

                {!editando ? (
                    <>
                        <BotonPrincipal type="button" onClick={iniciarNuevo}>
                            <FaPlus /> Crear Nuevo Alimento Frecuente
                        </BotonPrincipal>

                        {alimentosGuardados.length === 0 ? (
                            <VacioTexto>
                                Aún no tienes alimentos frecuentes guardados.
                                <br />
                                Agrega tus desayunos, licuados o platillos favoritos para no tener que escribirlos cada día.
                            </VacioTexto>
                        ) : (
                            <ListaAlimentos>
                                {alimentosGuardados.map((alim) => (
                                    <TarjetaAlimento key={alim.id}>
                                        <InfoAlimento>
                                            <div className="titulo-linea">
                                                <strong>{alim.nombre}</strong>
                                                <span className="badge-momento">{alim.momento}</span>
                                            </div>
                                            {alim.ingredientes?.length > 0 && (
                                                <span className="ingredientes-txt">
                                                    <FaBoxes style={{ marginRight: 4 }} />
                                                    {alim.ingredientes.map((i) => `${i.cantidad} ${i.unidad} ${i.nombreProducto}`).join(", ")}
                                                </span>
                                            )}
                                        </InfoAlimento>

                                        <CostoBadge>${Number(alim.costoAprox || 0).toFixed(2)}</CostoBadge>

                                        <AccionesFila>
                                            <BotonIcono
                                                type="button"
                                                onClick={() => iniciarEditar(alim)}
                                                title="Editar alimento"
                                            >
                                                <FaPen />
                                            </BotonIcono>
                                            <BotonIcono
                                                type="button"
                                                $peligro
                                                onClick={() => handleEliminar(alim.id)}
                                                title="Eliminar alimento"
                                            >
                                                <FaTrash />
                                            </BotonIcono>
                                        </AccionesFila>
                                    </TarjetaAlimento>
                                ))}
                            </ListaAlimentos>
                        )}
                    </>
                ) : (
                    <Formulario>
                        <Campo>
                            <label>Nombre del alimento o platillo *</label>
                            <input
                                type="text"
                                placeholder="Ej: Huevos con atún y café, Licuado de avena..."
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                autoFocus
                            />
                        </Campo>

                        <GridDosColumnas>
                            <Campo>
                                <label>Momento habitual</label>
                                <select value={momento} onChange={(e) => setMomento(e.target.value)}>
                                    <option value="desayuno">Desayuno ☀️</option>
                                    <option value="comida">Comida / Almuerzo 🍲</option>
                                    <option value="cena">Cena 🌙</option>
                                    <option value="snack">Snack / Antojo 🍎</option>
                                </select>
                            </Campo>

                            <Campo>
                                <label>Costo aprox ($ MXN)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder={costoSugeridoIngredientes > 0 ? `$${costoSugeridoIngredientes.toFixed(2)}` : "0.00"}
                                    value={costoAprox}
                                    onChange={(e) => setCostoAprox(e.target.value)}
                                />
                            </Campo>
                        </GridDosColumnas>

                        {/* Ingredientes de la despensa */}
                        <SeccionIngredientes>
                            <HeaderIngredientes>
                                <strong>Ingredientes de la despensa (opcional)</strong>
                                {costoSugeridoIngredientes > 0 && (
                                    <span className="sugerido">
                                        Costo estimado despensa: ${costoSugeridoIngredientes.toFixed(2)}
                                    </span>
                                )}
                            </HeaderIngredientes>

                            <BuscadorDespensa>
                                <FaSearch className="lupa" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto en tu despensa para vincular..."
                                    value={busquedaPantry}
                                    onChange={(e) => setBusquedaPantry(e.target.value)}
                                />
                                {busquedaPantry && (
                                    <FaTimes className="borrar" onClick={() => setBusquedaPantry("")} />
                                )}
                            </BuscadorDespensa>

                            {productosFiltrados.length > 0 && (
                                <ResultadosBusqueda>
                                    {productosFiltrados.map((prod) => (
                                        <ItemBusqueda
                                            key={`${prod.productoId}_${prod.presentacionId}`}
                                            onClick={() => agregarIngrediente(prod)}
                                        >
                                            <span className="item-tit">
                                                <FaPlus style={{ fontSize: 10, color: "var(--colorMorado)" }} />
                                                {prod.nombreCompleto}
                                            </span>
                                            <span className="item-costo">
                                                ${prod.costoUnit.toFixed(2)} / {prod.unidad}
                                            </span>
                                        </ItemBusqueda>
                                    ))}
                                </ResultadosBusqueda>
                            )}

                            {ingredientes.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {ingredientes.map((ing, idx) => (
                                        <FilaIngrediente key={`${ing.productoId}_${ing.presentacionId}_${idx}`}>
                                            <div className="info-ing">
                                                <strong>{ing.nombreProducto}</strong>
                                                <span>{ing.nombrePresentacion} (${ing.costoUnitario.toFixed(2)} / {ing.unidad})</span>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <button
                                                    type="button"
                                                    style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ccc", background: "#f8f8f8", cursor: "pointer" }}
                                                    onClick={() => cambiarCantidadIngrediente(idx, -1)}
                                                >
                                                    -
                                                </button>
                                                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: "center" }}>
                                                    {ing.cantidad} {ing.unidad}
                                                </span>
                                                <button
                                                    type="button"
                                                    style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ccc", background: "#f8f8f8", cursor: "pointer" }}
                                                    onClick={() => cambiarCantidadIngrediente(idx, 1)}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <span className="costo-ing">${ing.costoTotal.toFixed(2)}</span>

                                            <BotonIcono
                                                type="button"
                                                $peligro
                                                onClick={() => eliminarIngrediente(idx)}
                                                title="Quitar ingrediente"
                                                style={{ width: 26, height: 26, fontSize: 10 }}
                                            >
                                                <FaTrash />
                                            </BotonIcono>
                                        </FilaIngrediente>
                                    ))}
                                </div>
                            )}
                        </SeccionIngredientes>

                        <Campo>
                            <label>Notas adicionales</label>
                            <textarea
                                placeholder="Notas opcionales sobre preparación, lugar o receta..."
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                            />
                        </Campo>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                            <BotonSecundario type="button" onClick={cancelarEdicion}>
                                Cancelar
                            </BotonSecundario>
                            <BotonPrincipal
                                type="button"
                                onClick={handleGuardar}
                                disabled={!nombre.trim() || guardando}
                            >
                                <FaCheck /> {guardando ? "Guardando..." : "Guardar Alimento"}
                            </BotonPrincipal>
                        </div>
                    </Formulario>
                )}
            </Contenedor>
        </ModalGenerico>
    );
};
