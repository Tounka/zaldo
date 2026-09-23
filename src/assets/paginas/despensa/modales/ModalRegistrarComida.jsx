import { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import {
    FaUtensils,
    FaCheck,
    FaBoxes,
} from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/ModalGenerico";
import { toFechaKey } from "../../../funciones/firebase/despensa";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 20px;
  max-width: 520px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 0 10px 16px;
    gap: 12px;
  }
`;

const CarruselChipsConstantes = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ChipConstante = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${({ $seleccionado }) => ($seleccionado ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.18)")};
  background: ${({ $seleccionado }) => ($seleccionado ? "rgba(83, 59, 143, 0.12)" : "#ffffff")};
  color: ${({ $seleccionado }) => ($seleccionado ? "var(--colorMorado)" : "#211b38")};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.08);
  }
`;

const GrupoMomentos = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;

  @media (max-width: 400px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const BotonMomento = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  border: 1.5px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.14)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#211b38")};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  span.icono {
    font-size: 16px;
  }

  &:hover {
    border-color: var(--colorMorado);
  }
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
    height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1.5px solid rgba(83, 59, 143, 0.2);
    background: #ffffff;
    font-size: 14.5px;
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
    padding: 10px 14px;
    resize: none;
  }
`;

const WrapperCosto = styled.div`
  position: relative;
  width: 100%;

  span.moneda {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    font-weight: 800;
    color: #2f7d54;
  }

  input {
    width: 100%;
    padding-left: 32px !important;
    font-size: 18px !important;
    font-weight: 800 !important;
    font-family: 'SF Mono', 'Fira Code', monospace !important;
    color: #1a1a2e;
  }
`;

const FilaDescuento = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: ${({ $activo }) => ($activo ? "rgba(47, 125, 84, 0.06)" : "#f8f8fb")};
  border: 1.5px solid ${({ $activo }) => ($activo ? "#2f7d54" : "rgba(83, 59, 143, 0.15)")};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  .texto-descuento {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 13px;
      color: #1a1a2e;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    span {
      font-size: 11.5px;
      color: #6b6484;
    }
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #2f7d54;
  }
`;

const BotonPrincipal = styled.button`
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(83, 59, 143, 0.25);
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--colorMoradoOscuro, #533b8f);
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(83, 59, 143, 0.35);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const MOMENTOS = [
    { id: "desayuno", nombre: "Desayuno", icono: "☀️" },
    { id: "comida", nombre: "Comida", icono: "🍲" },
    { id: "cena", nombre: "Cena", icono: "🌙" },
    { id: "snack", nombre: "Snack", icono: "🍎" },
];

export const ModalRegistrarComida = ({
    isOpen,
    onClose,
    fechaPorDefecto,
    catalogo,
    alimentoPreseleccionado,
    onGuardarComida,
}) => {
    const [nombre, setNombre] = useState("");
    const [momento, setMomento] = useState(() => {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return "desayuno";
        if (hora >= 12 && hora < 18) return "comida";
        if (hora >= 18 && hora < 23) return "cena";
        return "snack";
    });
    const [fecha, setFecha] = useState(fechaPorDefecto || toFechaKey(new Date()));
    const [costoAprox, setCostoAprox] = useState("");
    const [notas, setNotas] = useState("");
    const [alimentoConstanteId, setAlimentoConstanteId] = useState(null);
    const [ingredientes, setIngredientes] = useState([]);
    const [descontarInventario, setDescontarInventario] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Opciones de alimentos constantes
    const alimentosConstantes = useMemo(() => {
        if (!catalogo?.alimentosConstantes) return [];
        return Object.values(catalogo.alimentosConstantes)
            .filter((a) => a.activo !== false)
            .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
    }, [catalogo]);

    // Inicializar o pre-cargar alimento
    useEffect(() => {
        if (alimentoPreseleccionado) {
            setNombre(alimentoPreseleccionado.nombre || "");
            setMomento(alimentoPreseleccionado.momento || "desayuno");
            setCostoAprox(alimentoPreseleccionado.costoAprox ? String(alimentoPreseleccionado.costoAprox) : "");
            setNotas(alimentoPreseleccionado.notas || "");
            setAlimentoConstanteId(alimentoPreseleccionado.id || null);
            setIngredientes(alimentoPreseleccionado.ingredientes || []);
            setDescontarInventario(Boolean(alimentoPreseleccionado.ingredientes?.length));
        } else if (isOpen) {
            setNombre("");
            setCostoAprox("");
            setNotas("");
            setAlimentoConstanteId(null);
            setIngredientes([]);
            setDescontarInventario(false);
            setFecha(fechaPorDefecto || toFechaKey(new Date()));
        }
    }, [alimentoPreseleccionado, isOpen, fechaPorDefecto]);

    const seleccionarConstante = (alim) => {
        if (alimentoConstanteId === alim.id) {
            // Deseleccionar
            setAlimentoConstanteId(null);
            setNombre("");
            setCostoAprox("");
            setIngredientes([]);
            setDescontarInventario(false);
        } else {
            setAlimentoConstanteId(alim.id);
            setNombre(alim.nombre || "");
            if (alim.momento) setMomento(alim.momento);
            setCostoAprox(alim.costoAprox ? String(alim.costoAprox) : "");
            setIngredientes(alim.ingredientes || []);
            setDescontarInventario(Boolean(alim.ingredientes?.length));
        }
    };

    const handleGuardar = async () => {
        if (!nombre.trim()) return;
        setGuardando(true);
        try {
            await onGuardarComida({
                nombre: nombre.trim(),
                momento,
                fecha,
                costoAprox: Number(costoAprox || 0),
                descontarInventario,
                ingredientes,
                alimentoConstanteId,
                notas,
            });
            onClose();
        } catch (error) {
            console.error("Error al registrar comida:", error);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <Contenedor>
                <ModalEncabezado
                    icon={<FaUtensils />}
                    title="Anotar Comida del Día"
                    description="Registra qué comiste y cuánto costó aprox para llevar tu historial diario."
                />

                {/* Acceso rápido a alimentos constantes */}
                {alimentosConstantes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b6484", textTransform: "uppercase" }}>
                            Alimentos frecuentes (1 toque):
                        </span>
                        <CarruselChipsConstantes>
                            {alimentosConstantes.map((alim) => {
                                const seleccionado = alimentoConstanteId === alim.id;
                                return (
                                    <ChipConstante
                                        key={alim.id}
                                        type="button"
                                        $seleccionado={seleccionado}
                                        onClick={() => seleccionarConstante(alim)}
                                    >
                                        <span>{alim.nombre}</span>
                                        <span style={{ opacity: 0.7 }}>(${Number(alim.costoAprox || 0).toFixed(0)})</span>
                                    </ChipConstante>
                                );
                            })}
                        </CarruselChipsConstantes>
                    </div>
                )}

                {/* Selector de momento */}
                <Campo>
                    <label>Momento del día</label>
                    <GrupoMomentos>
                        {MOMENTOS.map((m) => (
                            <BotonMomento
                                key={m.id}
                                type="button"
                                $activo={momento === m.id}
                                onClick={() => setMomento(m.id)}
                            >
                                <span className="icono">{m.icono}</span>
                                <span>{m.nombre}</span>
                            </BotonMomento>
                        ))}
                    </GrupoMomentos>
                </Campo>

                {/* Qué comiste */}
                <Campo>
                    <label>¿Qué comiste? *</label>
                    <input
                        type="text"
                        placeholder="Ej: Chilaquiles con huevo, Tacos al pastor, Atún con ensalada..."
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        autoFocus
                    />
                </Campo>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                    {/* Costo aproximado */}
                    <Campo>
                        <label>Costo aproximado ($)</label>
                        <WrapperCosto>
                            <span className="moneda">$</span>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                value={costoAprox}
                                onChange={(e) => setCostoAprox(e.target.value)}
                            />
                        </WrapperCosto>
                    </Campo>

                    {/* Fecha */}
                    <Campo>
                        <label>Fecha</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </Campo>
                </div>

                {/* Descuento de inventario */}
                {ingredientes.length > 0 && (
                    <FilaDescuento $activo={descontarInventario}>
                        <div className="texto-descuento">
                            <strong>
                                <FaBoxes /> Descontar de mi despensa
                            </strong>
                            <span>
                                {ingredientes.map((i) => `${i.cantidad} ${i.unidad} ${i.nombreProducto}`).join(", ")}
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={descontarInventario}
                            onChange={(e) => setDescontarInventario(e.target.checked)}
                        />
                    </FilaDescuento>
                )}

                {/* Notas */}
                <Campo>
                    <label>Notas (opcional)</label>
                    <textarea
                        placeholder="Detalles adicionales sobre la comida..."
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                    />
                </Campo>

                <BotonPrincipal
                    type="button"
                    onClick={handleGuardar}
                    disabled={!nombre.trim() || guardando}
                >
                    <FaCheck /> {guardando ? "Registrando..." : "Guardar Comida"}
                </BotonPrincipal>
            </Contenedor>
        </ModalGenerico>
    );
};
