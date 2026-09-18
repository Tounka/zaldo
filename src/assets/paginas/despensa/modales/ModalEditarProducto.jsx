import { useState, useEffect } from "react";
import styled from "styled-components";
import { FaPen, FaPlus, FaTrash, FaCheck, FaImages, FaBox, FaLayerGroup, FaUtensils, FaMinus, FaBell } from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/ModalGenerico";
import {
  AREAS_DESPENSA,
  ESTRUCTURA_AREAS,
  resolverAreaYCategoria,
  colorArea,
  colorCategoriaInterna,
} from "../areasYCategorias";
import { resolverImagenProducto } from "../iconosDespensa";
import { SelectorIconoModal } from "./SelectorIconoModal";
import { colorCategoria } from "../estilos";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
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
  height: 44px;
  padding: 0 14px;
  border: 1px solid #e2e0f0;
  border-radius: 10px;
  font-size: 15px;
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

const Select = styled.select`
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #e2e0f0;
  border-radius: 10px;
  font-size: 14px;
  color: #211b38;
  background: #ffffff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--colorMorado, #6c5ce7);
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

const SeccionPresentaciones = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fbfbfe;
  border: 1px solid #e2e0f0;
  border-radius: 14px;
  padding: 14px;
`;

const HeaderSeccion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h5 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: #211b38;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const BotonAgregarPres = styled.button`
  background: #f0ebff;
  border: none;
  color: var(--colorMorado, #6c5ce7);
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMorado, #6c5ce7);
    color: #ffffff;
  }
`;

const CardEdicionPres = styled.div`
  background: #ffffff;
  border: 1px solid #e2e0f0;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FilaPresTop = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;

  @media (max-width: 480px) {
    grid-template-columns: 1fr auto;

    select {
      grid-column: 1 / -1;
    }
  }
`;

const FilaPresBottom = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const FilaToggleNecesario = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: ${({ $activo }) => ($activo ? "rgba(243, 156, 18, 0.08)" : "#fbfbfe")};
  border: 1px solid ${({ $activo }) => ($activo ? "#f39c12" : "#e2e0f0")};
  border-radius: 12px;
  padding: 12px 14px;
  transition: all 0.2s ease;
  cursor: pointer;

  div.info {
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
      font-size: 16px;
      color: ${({ $activo }) => ($activo ? "#f39c12" : "#a29db8")};
    }

    div.textos {
      display: flex;
      flex-direction: column;
      gap: 2px;

      strong {
        font-size: 13px;
        color: #211b38;
      }

      span {
        font-size: 11.5px;
        color: #6b6484;
      }
    }
  }
`;

const SwitchNecesario = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #f39c12;
`;

const GrupoAccionesStock = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const BtnSeTerminoPres = styled.button`
  flex: 1;
  min-width: 140px;
  height: 32px;
  background: rgba(192, 57, 43, 0.08);
  border: 1px dashed rgba(192, 57, 43, 0.35);
  border-radius: 8px;
  color: #c0392b;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: #c0392b;
    color: #ffffff;
    border-color: #c0392b;
    border-style: solid;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(192, 57, 43, 0.2);
  }
`;

const BtnGastarUnoPres = styled.button`
  height: 32px;
  padding: 0 10px;
  background: #fbfbfe;
  border: 1px solid #e2e0f0;
  border-radius: 8px;
  color: #6b6484;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado, #6c5ce7);
    color: var(--colorMorado, #6c5ce7);
    background: rgba(108, 92, 231, 0.05);
  }
`;

const BotonBorrarPres = styled.button`
  width: 36px;
  height: 44px;
  background: #fdedec;
  border: none;
  border-radius: 8px;
  color: #c0392b;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;

  &:hover {
    background: #c0392b;
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const BotonGuardar = styled.button`
  width: 100%;
  height: 48px;
  background: var(--colorMorado, #6c5ce7);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.25);
  margin-top: 6px;
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

export const ModalEditarProducto = ({
  abierto,
  onClose,
  onGuardar,
  producto,
}) => {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("Despensa");
  const [categoria, setCategoria] = useState("Abarrotes y Despensa seca");
  const [imagen, setImagen] = useState("/despensa/iconos/atun.jpg");
  const [stockMinimo, setStockMinimo] = useState("1");
  const [presentaciones, setPresentaciones] = useState([]);
  const [modalIconoAbierto, setModalIconoAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [necesario, setNecesario] = useState(false);

  useEffect(() => {
    if (!abierto || !producto) return;

    setNombre(producto.nombre || "");
    const resolved = resolverAreaYCategoria(producto);
    setArea(resolved.area);
    setCategoria(resolved.categoria);
    setImagen(resolverImagenProducto(producto));
    setStockMinimo(String(producto.stockMinimo || 1));
    setNecesario(Boolean(producto.necesario));

    const presList = Object.values(producto.presentaciones || {})
      .filter((p) => p.activa !== false)
      .map((p) => ({
        id: p.id,
        nombre: p.nombre || "",
        unidad: p.unidad || "pz",
        cantidad: p.cantidad || 1,
        stockActual: String(p.stockActual ?? 0),
        buenPrecio: p.buenPrecio ? String(p.buenPrecio) : "",
      }));

    if (presList.length === 0) {
      presList.push({
        id: "",
        nombre: "Pieza",
        unidad: "pz",
        cantidad: 1,
        stockActual: "0",
        buenPrecio: "",
      });
    }

    setPresentaciones(presList);
  }, [abierto, producto]);

  const handlePresChange = (index, campo, valor) => {
    setPresentaciones((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const agregarPresentacion = () => {
    setPresentaciones((prev) => [
      ...prev,
      {
        id: "",
        nombre: "",
        unidad: "pz",
        cantidad: 1,
        stockActual: "0",
        buenPrecio: "",
      },
    ]);
  };

  const eliminarPresentacion = (index) => {
    if (presentaciones.length <= 1) return;
    setPresentaciones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !producto?.id) return;

    setGuardando(true);
    try {
      await onGuardar(producto.id, {
        nombre: nombre.trim(),
        area,
        categoria,
        imagen,
        stockMinimo: Number(stockMinimo || 1),
        necesario,
        presentaciones: presentaciones.map((p) => ({
          id: p.id || undefined,
          nombre: p.nombre.trim() || "Pieza",
          unidad: p.unidad || "pz",
          cantidad: Number(p.cantidad || 1),
          stockActual: Number(p.stockActual || 0),
          buenPrecio: Number(p.buenPrecio || 0),
          activa: true,
        })),
      });
      onClose();
    } catch (error) {
      console.error("Error al guardar edición de producto:", error);
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto || !producto) return null;

  return (
    <>
      <ModalGenerico
        isOpen={abierto}
        abierto={abierto}
        onClose={onClose}
        maxAncho="520px"
        encabezado={(
          <ModalEncabezado
            icon={<FaPen />}
            title="Editar Producto"
            description="Actualiza el nombre, sticker, área, categoría y ajusta las presentaciones."
            bleed={0}
            onCerrar={onClose}
          />
        )}
      >
        <Form onSubmit={handleSubmit}>
          {/* Avatar / Sticker */}
          <FilaAvatar>
            <AvatarBoton
              type="button"
              onClick={() => setModalIconoAbierto(true)}
              title="Toca para cambiar el sticker"
            >
              <img
                src={imagen}
                alt="Sticker"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/despensa/iconos/atun.jpg";
                }}
              />
            </AvatarBoton>
            <AvatarTexto>
              <strong>Sticker del producto</strong>
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

          {/* Nombre y Stock Mínimo */}
          <Grid2>
            <Campo>
              <label><FaBox /> Nombre del producto</label>
              <Input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej. Atún, Leche, Champiñones..."
              />
            </Campo>

            <Campo>
              <label>Stock Mínimo</label>
              <Input
                type="number"
                min="0"
                step="any"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                required
                placeholder="Ej. 1"
              />
            </Campo>
          </Grid2>

          {/* Toggle de Comprar en el Súper */}
          <FilaToggleNecesario
            $activo={necesario}
            onClick={() => setNecesario((prev) => !prev)}
          >
            <div className="info">
              <FaBell />
              <div className="textos">
                <strong>¿Comprar en el próximo súper?</strong>
                <span>
                  {necesario
                    ? "Marcado para la lista de compras del súper."
                    : "No está marcado. Se marcará automáticamente si el stock llega a 0."}
                </span>
              </div>
            </div>
            <SwitchNecesario
              type="checkbox"
              checked={necesario}
              onChange={(e) => setNecesario(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </FilaToggleNecesario>

          {/* Presentaciones y Stock Actual */}
          <SeccionPresentaciones>
            <HeaderSeccion>
              <h5><FaLayerGroup /> Presentaciones & Costo Preferente</h5>
              <BotonAgregarPres type="button" onClick={agregarPresentacion}>
                <FaPlus /> Agregar
              </BotonAgregarPres>
            </HeaderSeccion>

            {presentaciones.map((pres, idx) => (
              <CardEdicionPres key={pres.id || idx}>
                <FilaPresTop>
                  <Input
                    type="text"
                    placeholder="Nombre (ej. Lata, Sobre, 1L)"
                    value={pres.nombre}
                    onChange={(e) => handlePresChange(idx, "nombre", e.target.value)}
                    required
                  />

                  <Select
                    value={pres.unidad}
                    onChange={(e) => handlePresChange(idx, "unidad", e.target.value)}
                  >
                    <option value="pz">Piezas (pz)</option>
                    <option value="lata">Lata</option>
                    <option value="sobre">Sobre</option>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="L">Litros (L)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="paq">Paquete (paq)</option>
                    <option value="caja">Caja</option>
                    <option value="botella">Botella</option>
                  </Select>

                  <BotonBorrarPres
                    type="button"
                    title="Eliminar presentación"
                    disabled={presentaciones.length <= 1}
                    onClick={() => eliminarPresentacion(idx)}
                  >
                    <FaTrash />
                  </BotonBorrarPres>
                </FilaPresTop>

                <FilaPresBottom>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#6b6484", display: "block", marginBottom: 3 }}>
                      Stock actual ({pres.unidad})
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={pres.stockActual}
                      onChange={(e) => handlePresChange(idx, "stockActual", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#2f7d54", display: "block", marginBottom: 3 }}>
                      Costo preferente ($)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={pres.buenPrecio}
                      onChange={(e) => handlePresChange(idx, "buenPrecio", e.target.value)}
                      placeholder="Ej. $18.50"
                    />
                  </div>
                </FilaPresBottom>

                <GrupoAccionesStock>
                  <BtnSeTerminoPres
                    type="button"
                    title="Poner stock en 0 y marcar para comprar en el súper"
                    onClick={() => {
                      handlePresChange(idx, "stockActual", "0");
                      setNecesario(true);
                    }}
                  >
                    <FaUtensils /> ¡Se me terminó! (Stock 0)
                  </BtnSeTerminoPres>

                  {Number(pres.stockActual || 0) > 0 && (
                    <BtnGastarUnoPres
                      type="button"
                      title="Restar 1 unidad al stock"
                      onClick={() => {
                        const nuevoVal = Math.max(0, Number(pres.stockActual || 0) - 1);
                        handlePresChange(idx, "stockActual", String(nuevoVal));
                        if (nuevoVal === 0) setNecesario(true);
                      }}
                    >
                      <FaMinus /> -1 {pres.unidad}
                    </BtnGastarUnoPres>
                  )}
                </GrupoAccionesStock>
              </CardEdicionPres>
            ))}
          </SeccionPresentaciones>

          <BotonGuardar type="submit" disabled={guardando || !nombre.trim()}>
            <FaCheck /> {guardando ? "Guardando cambios..." : "Guardar Cambios"}
          </BotonGuardar>
        </Form>
      </ModalGenerico>

      {/* Modal selector de ícono Paper Mario */}
      <SelectorIconoModal
        abierto={modalIconoAbierto}
        onClose={() => setModalIconoAbierto(false)}
        onSelect={(nuevaRuta) => setImagen(nuevaRuta)}
        iconoSeleccionado={imagen}
      />
    </>
  );
};
