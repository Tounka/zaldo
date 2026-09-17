import { useState, useMemo } from "react";
import styled from "styled-components";
import { FaClipboardCheck, FaCheckCircle, FaSearch, FaTimes, FaUndo } from "react-icons/fa";
import { resolverImagenProducto } from "../iconosDespensa";
import { colorCategoria } from "../estilos";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding-bottom: 90px;
`;

const TarjetaExplicacion = styled.div`
  background: rgba(83, 59, 143, 0.04);
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    font-size: 24px;
    color: var(--colorMorado);
    flex-shrink: 0;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 14px;
      color: #1a1a2e;
      font-weight: 700;
    }

    span {
      font-size: 12px;
      color: #6b6484;
    }
  }
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

const ListaAuditoria = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FilaAuditoria = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.03);
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(83, 59, 143, 0.25);
  }

  img {
    width: 46px;
    height: 46px;
    object-fit: contain;
    flex-shrink: 0;
  }
`;

const InfoAuditoria = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 2px;

  strong {
    font-size: 14px;
    color: #1a1a2e;
    font-weight: 700;
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

const CajaConteo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const InputConteo = styled.input`
  width: 60px;
  height: 38px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1a1a2e;
  text-align: center;
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 2px rgba(83, 59, 143, 0.1);
  }
`;

const BadgeDiferencia = styled.div`
  width: 44px;
  padding: 4px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  border-radius: 6px;
  background: ${({ $tipo }) => ($tipo === "positivo" ? "rgba(47, 125, 84, 0.1)" : $tipo === "negativo" ? "rgba(192, 57, 43, 0.1)" : "rgba(83, 59, 143, 0.05)")};
  color: ${({ $tipo }) => ($tipo === "positivo" ? "#2f7d54" : $tipo === "negativo" ? "#c0392b" : "#8c84a8")};
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

const BotonAplicar = styled.button`
  height: 44px;
  padding: 0 20px;
  background: #2f7d54;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(47, 125, 84, 0.25);
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: #256644;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(47, 125, 84, 0.35);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const TabConciliacion = ({ catalogo, onAplicarConciliacion }) => {
    const [busqueda, setBusqueda] = useState("");
    const [conteos, setConteos] = useState({}); // { [key]: nuevoStock }
    const [guardando, setGuardando] = useState(false);

    // Obtener lista plana de productos y presentaciones
    const items = useMemo(() => {
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
                    nombreCompleto: `${prod.nombre} (${pres.nombre})`,
                    categoria: prod.categoria || "Despensa",
                    imagen: resolverImagenProducto({ ...prod, imagen: pres.imagen || prod.imagen }),
                    stockSistema: Number(pres.stockActual || 0),
                    unidad: pres.unidad || "pz",
                });
            });
        });

        return lista;
    }, [catalogo]);

    const itemsFiltrados = useMemo(() => {
        if (!busqueda) return items;
        return items.filter((it) => it.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()));
    }, [items, busqueda]);

    const handleConteoChange = (key, valor) => {
        setConteos((prev) => ({ ...prev, [key]: valor }));
    };

    // Calcular cuántos productos tienen cambios
    const ajustesPendientes = useMemo(() => {
        const resultado = [];
        items.forEach((it) => {
            if (conteos[it.key] !== undefined && conteos[it.key] !== "") {
                const stockReal = Number(conteos[it.key]);
                if (stockReal !== it.stockSistema) {
                    resultado.push({
                        productoId: it.productoId,
                        presentacionId: it.presentacionId,
                        stockReal,
                        stockCalculado: it.stockSistema,
                    });
                }
            }
        });
        return resultado;
    }, [items, conteos]);

    const handleGuardar = async () => {
        if (!ajustesPendientes.length) return;
        setGuardando(true);
        try {
            await onAplicarConciliacion(ajustesPendientes);
            setConteos({});
        } catch (error) {
            console.error("Error al aplicar conciliación:", error);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Contenedor>
            <TarjetaExplicacion>
                <FaClipboardCheck />
                <div>
                    <strong>Auditoría y Conciliación Física</strong>
                    <span>Cuenta lo que realmente tienes en casa y actualiza el stock de golpe</span>
                </div>
            </TarjetaExplicacion>

            <BarraBusqueda>
                <FaSearch className="lupa" />
                <InputBuscador
                    type="text"
                    placeholder="Filtrar producto a conciliar..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && <FaTimes className="borrar" onClick={() => setBusqueda("")} />}
            </BarraBusqueda>

            <ListaAuditoria>
                {itemsFiltrados.map((item) => {
                    const valorActual = conteos[item.key] !== undefined ? conteos[item.key] : item.stockSistema;
                    const numReal = Number(valorActual || 0);
                    const diff = Math.round((numReal - item.stockSistema) * 10) / 10;
                    const tipoDiff = diff > 0 ? "positivo" : diff < 0 ? "negativo" : "cero";

                    return (
                        <FilaAuditoria key={item.key}>
                            <img
                                src={item.imagen}
                                alt={item.nombreCompleto}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                }}
                            />
                            <InfoAuditoria>
                                <strong>{item.nombreCompleto}</strong>
                                <span>En sistema: {item.stockSistema} {item.unidad}</span>
                            </InfoAuditoria>

                            <CajaConteo>
                                <InputConteo
                                    type="number"
                                    step="any"
                                    value={valorActual}
                                    onChange={(e) => handleConteoChange(item.key, e.target.value)}
                                />
                                <BadgeDiferencia $tipo={tipoDiff}>
                                    {diff > 0 ? `+${diff}` : diff === 0 ? "OK" : diff}
                                </BadgeDiferencia>
                            </CajaConteo>
                        </FilaAuditoria>
                    );
                })}
            </ListaAuditoria>

            <BarraFlotanteInferior>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: "14px", color: "#211b38" }}>
                        {ajustesPendientes.length} {ajustesPendientes.length === 1 ? "cambio" : "cambios"} por aplicar
                    </strong>
                    <span style={{ fontSize: "12px", color: "#6b6484" }}>
                        {ajustesPendientes.length > 0 ? "Diferencias listas para conciliar" : "Tu despensa está al día"}
                    </span>
                </div>
                <BotonAplicar
                    type="button"
                    disabled={ajustesPendientes.length === 0 || guardando}
                    onClick={handleGuardar}
                >
                    <FaCheckCircle /> {guardando ? "Conciliando..." : "Aplicar Conciliación"}
                </BotonAplicar>
            </BarraFlotanteInferior>
        </Contenedor>
    );
};
