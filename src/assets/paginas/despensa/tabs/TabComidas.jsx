import { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import {
    FaUtensils,
    FaPlus,
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaTrash,
    FaBoxes,
    FaCog,
    FaFire,
    FaCheck,
} from "react-icons/fa";
import { toFechaKey, obtenerMesKey } from "../../../funciones/firebase/despensa";
import { ModalRegistrarComida } from "../modales/ModalRegistrarComida";
import { ModalGestionAlimentosConstantes } from "../modales/ModalGestionAlimentosConstantes";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  padding-bottom: 90px;
`;

/* ─── Navegación de Fecha ─── */
const BarraNavegacionFecha = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.03);
  flex-wrap: wrap;

  @media (max-width: 480px) {
    padding: 6px 10px;
  }
`;

const GrupoBotonesFecha = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BotonFechaRapida = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.16)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#211b38")};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.06)")};
  }
`;

const BotonFlecha = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(83, 59, 143, 0.16);
  background: #ffffff;
  color: var(--colorMorado);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }
`;

const InputFechaWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8f8fc;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 8px;
  padding: 4px 10px;

  svg {
    font-size: 13px;
    color: var(--colorMorado);
  }

  input[type="date"] {
    border: none;
    background: transparent;
    font-size: 12.5px;
    font-weight: 700;
    color: #1a1a2e;
    cursor: pointer;

    &:focus {
      outline: none;
    }
  }
`;

/* ─── Hero Card del Día ─── */
const HeroCard = styled.div`
  background: linear-gradient(135deg, #2b1f4a 0%, #463475 60%, #5d4699 100%);
  border-radius: 16px;
  padding: 20px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 18px rgba(43, 31, 74, 0.22);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -50px;
    right: -50px;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }
`;

const HeroTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeroTextos = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  span.label-dia {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: rgba(255, 255, 255, 0.7);
  }

  h2.total-monto {
    margin: 0;
    font-size: 32px;
    font-weight: 900;
    font-family: 'SF Mono', 'Fira Code', monospace;
    letter-spacing: -0.5px;
  }
`;

const HeroBadgeMes = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 8px 12px;
  backdrop-filter: blur(8px);

  span.mes-tit {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }

  strong.mes-monto {
    font-size: 16px;
    font-weight: 800;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  span.mes-prom {
    font-size: 10.5px;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const HeroDesglose = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ItemDesglose = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span.nom {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.75);
    font-weight: 600;
  }

  strong.val {
    font-size: 14px;
    font-weight: 800;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
`;

/* ─── Sección de Alimentos Constantes ─── */
const SeccionConstantes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const HeaderSeccion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: #211b38;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
      color: var(--colorMorado);
    }
  }

  button.btn-gestionar {
    background: transparent;
    border: none;
    color: var(--colorMorado);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const CarruselCardsConstantes = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const CardConstanteRapida = styled.div`
  flex-shrink: 0;
  width: 170px;
  background: #ffffff;
  border: 1.5px solid rgba(83, 59, 143, 0.14);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.04);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--colorMorado);
    box-shadow: 0 4px 12px rgba(83, 59, 143, 0.12);
  }

  .top-card {
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong.nombre {
      font-size: 13px;
      color: #1a1a2e;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.25;
    }

    span.momento {
      font-size: 10.5px;
      font-weight: 700;
      color: #6b6484;
      text-transform: capitalize;
    }
  }

  .bottom-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;

    span.precio {
      font-size: 14px;
      font-weight: 800;
      color: #2f7d54;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    button.btn-comer {
      padding: 5px 9px;
      border: none;
      border-radius: 7px;
      background: var(--colorMorado);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s ease;

      &:hover {
        background: var(--colorMoradoOscuro, #533b8f);
      }
    }
  }
`;

const CardAgregarConstante = styled.button`
  flex-shrink: 0;
  width: 140px;
  background: rgba(83, 59, 143, 0.04);
  border: 1.5px dashed rgba(83, 59, 143, 0.25);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--colorMorado);
  cursor: pointer;
  transition: all 0.15s ease;

  span {
    font-size: 11.5px;
    font-weight: 700;
    text-align: center;
  }

  &:hover {
    background: rgba(83, 59, 143, 0.08);
    border-color: var(--colorMorado);
  }
`;

/* ─── Botón Principal "Anotar Comida" ─── */
const BotonAnotarComida = styled.button`
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(83, 59, 143, 0.25);
  transition: all 0.2s ease;

  &:hover {
    background: var(--colorMoradoOscuro, #533b8f);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(83, 59, 143, 0.35);
  }
`;

/* ─── Listado de Comidas del Día ─── */
const BloqueMomento = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TituloMomento = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;

  span.tit {
    font-size: 13px;
    font-weight: 800;
    color: #211b38;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  span.subtotal {
    font-size: 12.5px;
    font-weight: 800;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #2f7d54;
  }
`;

const TarjetaComidaItem = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.03);
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(83, 59, 143, 0.3);
  }

  .info-ppal {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;

    strong.nombre {
      font-size: 14px;
      color: #1a1a2e;
    }

    .detalles {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      span.badge-despensa {
        font-size: 10.5px;
        font-weight: 700;
        color: #2f7d54;
        background: rgba(47, 125, 84, 0.09);
        padding: 2px 7px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      span.notas {
        font-size: 11.5px;
        color: #6b6484;
        font-style: italic;
      }
    }
  }

  .costo-accion {
    display: flex;
    align-items: center;
    gap: 12px;

    strong.costo {
      font-size: 16px;
      font-weight: 800;
      color: #2f7d54;
      font-family: 'SF Mono', 'Fira Code', monospace;
      white-space: nowrap;
    }

    button.btn-borrar {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid rgba(220, 53, 69, 0.2);
      background: #ffffff;
      color: #dc3545;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s ease;

      &:hover {
        background: #dc3545;
        color: #ffffff;
      }
    }
  }
`;

const EstadoVacio = styled.div`
  background: #ffffff;
  border: 1.5px dashed rgba(83, 59, 143, 0.15);
  border-radius: 14px;
  padding: 36px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #6b6484;

  svg {
    font-size: 32px;
    color: var(--colorMorado);
    opacity: 0.6;
  }

  strong {
    font-size: 14px;
    color: #211b38;
  }

  p {
    margin: 0;
    font-size: 12.5px;
    max-width: 320px;
  }
`;

/* ─── Historial del Mes (Acordeón de días) ─── */
const SeccionHistorialMes = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ListaDiasMes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
`;

const FilaDiaHistorial = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.09)" : "#f9f9fd")};
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.08)")};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }

  .dia-info {
    display: flex;
    align-items: center;
    gap: 8px;

    strong {
      font-size: 13px;
      color: #1a1a2e;
    }

    span.conteo {
      font-size: 11px;
      color: #6b6484;
    }
  }

  .dia-total {
    font-size: 13.5px;
    font-weight: 800;
    color: #2f7d54;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
`;

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export const TabComidas = ({
    catalogo,
    onRegistrarComida,
    onEliminarComida,
    onGuardarAlimentoConstante,
    onEliminarAlimentoConstante,
    onCargarComidasMes,
}) => {
    const hoyKey = useMemo(() => toFechaKey(new Date()), []);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyKey);
    const [comidasDelMes, setComidasDelMes] = useState([]);
    const [cargandoComidas, setCargandoComidas] = useState(false);

    // Modales
    const [modalComidaAbierto, setModalComidaAbierto] = useState(false);
    const [modalConstantesAbierto, setModalConstantesAbierto] = useState(false);
    const [alimentoAComer, setAlimentoAComer] = useState(null);

    // Calcular mesKey de la fecha seleccionada
    const mesKeySeleccionado = useMemo(() => {
        const partes = fechaSeleccionada.split("-");
        if (partes.length < 2) return obtenerMesKey(new Date());
        return `${partes[0]}${partes[1]}`;
    }, [fechaSeleccionada]);

    // Cargar comidas del mes actual
    const cargarComidas = useCallback(async () => {
        if (!onCargarComidasMes) return;
        setCargandoComidas(true);
        try {
            const data = await onCargarComidasMes(mesKeySeleccionado);
            setComidasDelMes(data || []);
        } catch (error) {
            console.error("Error al cargar comidas:", error);
        } finally {
            setCargandoComidas(false);
        }
    }, [mesKeySeleccionado, onCargarComidasMes]);

    useEffect(() => {
        cargarComidas();
    }, [cargarComidas]);

    // Comidas filtradas para el día seleccionado
    const comidasDelDia = useMemo(() => {
        return comidasDelMes.filter((c) => c.fechaKey === fechaSeleccionada);
    }, [comidasDelMes, fechaSeleccionada]);

    // Total gastado en comida hoy
    const totalDelDia = useMemo(() => {
        return comidasDelDia.reduce((sum, c) => sum + (Number(c.costoAprox) || 0), 0);
    }, [comidasDelDia]);

    // Desglose del día por momentos
    const desgloseMomentos = useMemo(() => {
        const base = { desayuno: 0, comida: 0, cena: 0, snack: 0 };
        comidasDelDia.forEach((c) => {
            const m = c.momento || "comida";
            if (base[m] !== undefined) base[m] += (Number(c.costoAprox) || 0);
            else base.comida += (Number(c.costoAprox) || 0);
        });
        return base;
    }, [comidasDelDia]);

    // Métricas del mes
    const metricasMes = useMemo(() => {
        const total = comidasDelMes.reduce((sum, c) => sum + (Number(c.costoAprox) || 0), 0);
        // Contar días únicos con comidas
        const diasSet = new Set(comidasDelMes.map((c) => c.fechaKey));
        const numDias = diasSet.size || 1;
        const promedio = total / numDias;
        return {
            total,
            promedio,
            diasRegistrados: diasSet.size,
        };
    }, [comidasDelMes]);

    // Resumen de todos los días del mes para el historial
    const diasAgrupados = useMemo(() => {
        const grupos = {};
        comidasDelMes.forEach((c) => {
            if (!grupos[c.fechaKey]) {
                grupos[c.fechaKey] = { fechaKey: c.fechaKey, total: 0, count: 0 };
            }
            grupos[c.fechaKey].total += (Number(c.costoAprox) || 0);
            grupos[c.fechaKey].count += 1;
        });
        return Object.values(grupos).sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));
    }, [comidasDelMes]);

    // Alimentos constantes disponibles en catálogo
    const alimentosConstantes = useMemo(() => {
        if (!catalogo?.alimentosConstantes) return [];
        return Object.values(catalogo.alimentosConstantes)
            .filter((a) => a.activo !== false)
            .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));
    }, [catalogo]);

    // Cambiar día con flechas
    const cambiarDia = (delta) => {
        const [y, m, d] = fechaSeleccionada.split("-").map(Number);
        const actual = new Date(y, m - 1, d);
        actual.setDate(actual.getDate() + delta);
        setFechaSeleccionada(toFechaKey(actual));
    };

    // Registrar directamente desde un alimento constante
    const handleComerAlimentoConstante = (alim) => {
        setAlimentoAComer(alim);
        setModalComidaAbierto(true);
    };

    const handleGuardarComidaFinal = async (datos) => {
        await onRegistrarComida(datos);
        await cargarComidas();
    };

    const handleEliminarComida = async (comida) => {
        const revertir = comida.descontoInventario
            ? window.confirm("¿Deseas reponer el inventario de despensa que se descontó en esta comida?")
            : false;

        await onEliminarComida({
            comidaId: comida.id,
            mesKey: mesKeySeleccionado,
            revertirInventario: revertir,
        });
        await cargarComidas();
    };

    // Formato amigable de fecha seleccionada
    const textoFechaSeleccionada = useMemo(() => {
        if (fechaSeleccionada === hoyKey) return "Hoy";
        const [y, m, d] = fechaSeleccionada.split("-").map(Number);
        const fecha = new Date(y, m - 1, d);
        return fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    }, [fechaSeleccionada, hoyKey]);

    return (
        <Contenedor>
            {/* Barra de Navegación de Fecha */}
            <BarraNavegacionFecha>
                <GrupoBotonesFecha>
                    <BotonFechaRapida
                        type="button"
                        $activo={fechaSeleccionada === hoyKey}
                        onClick={() => setFechaSeleccionada(hoyKey)}
                    >
                        Hoy
                    </BotonFechaRapida>
                    <BotonFechaRapida
                        type="button"
                        $activo={(() => {
                            const ayer = new Date();
                            ayer.setDate(ayer.getDate() - 1);
                            return fechaSeleccionada === toFechaKey(ayer);
                        })()}
                        onClick={() => {
                            const ayer = new Date();
                            ayer.setDate(ayer.getDate() - 1);
                            setFechaSeleccionada(toFechaKey(ayer));
                        }}
                    >
                        Ayer
                    </BotonFechaRapida>
                    <BotonFlecha type="button" onClick={() => cambiarDia(-1)} title="Día anterior">
                        <FaChevronLeft />
                    </BotonFlecha>
                    <BotonFlecha type="button" onClick={() => cambiarDia(1)} title="Día siguiente">
                        <FaChevronRight />
                    </BotonFlecha>
                </GrupoBotonesFecha>

                <InputFechaWrap>
                    <FaCalendarAlt />
                    <input
                        type="date"
                        value={fechaSeleccionada}
                        onChange={(e) => setFechaSeleccionada(e.target.value)}
                    />
                </InputFechaWrap>
            </BarraNavegacionFecha>

            {/* Hero Card del Día */}
            <HeroCard>
                <HeroTop>
                    <HeroTextos>
                        <span className="label-dia">Comida de {textoFechaSeleccionada}</span>
                        <h2 className="total-monto">{formatMoney(totalDelDia)}</h2>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                            {comidasDelDia.length} {comidasDelDia.length === 1 ? "comida registrada" : "comidas registradas"}
                        </span>
                    </HeroTextos>

                    <HeroBadgeMes>
                        <span className="mes-tit">Mes actual ({metricasMes.diasRegistrados} días)</span>
                        <strong className="mes-monto">{formatMoney(metricasMes.total)}</strong>
                        <span className="mes-prom">~{formatMoney(metricasMes.promedio)} / día</span>
                    </HeroBadgeMes>
                </HeroTop>

                <HeroDesglose>
                    <ItemDesglose>
                        <span className="nom">Desayuno ☀️</span>
                        <strong className="val">{formatMoney(desgloseMomentos.desayuno)}</strong>
                    </ItemDesglose>
                    <ItemDesglose>
                        <span className="nom">Comida 🍲</span>
                        <strong className="val">{formatMoney(desgloseMomentos.comida)}</strong>
                    </ItemDesglose>
                    <ItemDesglose>
                        <span className="nom">Cena 🌙</span>
                        <strong className="val">{formatMoney(desgloseMomentos.cena)}</strong>
                    </ItemDesglose>
                    <ItemDesglose>
                        <span className="nom">Snacks 🍎</span>
                        <strong className="val">{formatMoney(desgloseMomentos.snack)}</strong>
                    </ItemDesglose>
                </HeroDesglose>
            </HeroCard>

            {/* Carrusel de Alimentos Constantes */}
            <SeccionConstantes>
                <HeaderSeccion>
                    <h3>
                        <FaFire /> Mis Alimentos Frecuentes
                    </h3>
                    <button
                        type="button"
                        className="btn-gestionar"
                        onClick={() => setModalConstantesAbierto(true)}
                    >
                        <FaCog /> Gestionar
                    </button>
                </HeaderSeccion>

                <CarruselCardsConstantes>
                    {alimentosConstantes.map((alim) => (
                        <CardConstanteRapida key={alim.id}>
                            <div className="top-card">
                                <strong className="nombre" title={alim.nombre}>
                                    {alim.nombre}
                                </strong>
                                <span className="momento">{alim.momento}</span>
                            </div>
                            <div className="bottom-card">
                                <span className="precio">{formatMoney(alim.costoAprox)}</span>
                                <button
                                    type="button"
                                    className="btn-comer"
                                    onClick={() => handleComerAlimentoConstante(alim)}
                                    title="Registrar que comí esto hoy"
                                >
                                    <FaCheck /> Comer
                                </button>
                            </div>
                        </CardConstanteRapida>
                    ))}

                    <CardAgregarConstante
                        type="button"
                        onClick={() => setModalConstantesAbierto(true)}
                    >
                        <FaPlus style={{ fontSize: 16 }} />
                        <span>Nuevo Alimento Frecuente</span>
                    </CardAgregarConstante>
                </CarruselCardsConstantes>
            </SeccionConstantes>

            {/* Botón Principal Prominente */}
            <BotonAnotarComida
                type="button"
                onClick={() => {
                    setAlimentoAComer(null);
                    setModalComidaAbierto(true);
                }}
            >
                <FaPlus /> + Anotar lo que comí hoy
            </BotonAnotarComida>

            {/* Comidas Registradas del Día */}
            {comidasDelDia.length === 0 ? (
                <EstadoVacio>
                    <FaUtensils />
                    <strong>No has registrado comidas para {textoFechaSeleccionada}</strong>
                    <p>
                        Anota qué comiste y cuánto costó aprox, o toca uno de tus alimentos frecuentes arriba.
                    </p>
                </EstadoVacio>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {["desayuno", "comida", "cena", "snack"].map((momentoId) => {
                        const items = comidasDelDia.filter((c) => (c.momento || "comida") === momentoId);
                        if (!items.length) return null;

                        const nombresMomentos = {
                            desayuno: "Desayuno ☀️",
                            comida: "Comida / Almuerzo 🍲",
                            cena: "Cena 🌙",
                            snack: "Snacks / Antojos 🍎",
                        };

                        const subtotal = items.reduce((s, it) => s + (Number(it.costoAprox) || 0), 0);

                        return (
                            <BloqueMomento key={momentoId}>
                                <TituloMomento>
                                    <span className="tit">{nombresMomentos[momentoId]}</span>
                                    <span className="subtotal">{formatMoney(subtotal)}</span>
                                </TituloMomento>

                                {items.map((comida) => (
                                    <TarjetaComidaItem key={comida.id}>
                                        <div className="info-ppal">
                                            <strong className="nombre">{comida.nombre}</strong>
                                            <div className="detalles">
                                                {comida.descontoInventario && (
                                                    <span className="badge-despensa">
                                                        <FaBoxes /> Descontó despensa
                                                    </span>
                                                )}
                                                {comida.notas && (
                                                    <span className="notas">"{comida.notas}"</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="costo-accion">
                                            <strong className="costo">{formatMoney(comida.costoAprox)}</strong>
                                            <button
                                                type="button"
                                                className="btn-borrar"
                                                onClick={() => handleEliminarComida(comida)}
                                                title="Eliminar registro"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </TarjetaComidaItem>
                                ))}
                            </BloqueMomento>
                        );
                    })}
                </div>
            )}

            {/* Historial del Mes (Acordeón de días) */}
            {diasAgrupados.length > 0 && (
                <SeccionHistorialMes>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#211b38" }}>
                            Historial de días de este mes
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#6b6484" }}>
                            {cargandoComidas ? "Cargando..." : `${diasAgrupados.length} días con registro`}
                        </span>
                    </div>

                    <ListaDiasMes>
                        {diasAgrupados.map((dia) => (
                            <FilaDiaHistorial
                                key={dia.fechaKey}
                                $activo={dia.fechaKey === fechaSeleccionada}
                                onClick={() => setFechaSeleccionada(dia.fechaKey)}
                            >
                                <div className="dia-info">
                                    <strong>{dia.fechaKey === hoyKey ? "Hoy" : dia.fechaKey}</strong>
                                    <span className="conteo">({dia.count} {dia.count === 1 ? "comida" : "comidas"})</span>
                                </div>
                                <span className="dia-total">{formatMoney(dia.total)}</span>
                            </FilaDiaHistorial>
                        ))}
                    </ListaDiasMes>
                </SeccionHistorialMes>
            )}

            {/* Modal para Registrar Comida */}
            <ModalRegistrarComida
                isOpen={modalComidaAbierto}
                onClose={() => {
                    setModalComidaAbierto(false);
                    setAlimentoAComer(null);
                }}
                fechaPorDefecto={fechaSeleccionada}
                catalogo={catalogo}
                alimentoPreseleccionado={alimentoAComer}
                onGuardarComida={handleGuardarComidaFinal}
            />

            {/* Modal para Gestionar Alimentos Constantes */}
            <ModalGestionAlimentosConstantes
                isOpen={modalConstantesAbierto}
                onClose={() => setModalConstantesAbierto(false)}
                catalogo={catalogo}
                onGuardarAlimento={onGuardarAlimentoConstante}
                onEliminarAlimento={onEliminarAlimentoConstante}
            />
        </Contenedor>
    );
};
