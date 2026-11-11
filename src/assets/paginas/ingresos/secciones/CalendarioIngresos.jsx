import styled from "styled-components";
import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaChartLine,
    FaShoppingBasket,
} from "react-icons/fa";
import { MESES_ANIO, fnFormatMoney } from "../../../funciones/ingresosCalculos";
import {
    COLOR_OTROS_INGRESOS,
    agruparEventosPorDia,
    construirEventosIngresos,
    promedioMensualProyectado,
    resumirEventosPorMes,
} from "../../../funciones/ingresosProyeccion";
import {
    MESES_PARA_PROMEDIO,
    calcularGastoPersonalPromedio,
    clavesUltimosMeses,
} from "../../../funciones/gastoPersonalPromedio";
import { obtenerMovimientosPorAnioMes } from "../../../funciones/firebase/movimientos";
import { useAppStore } from "../../../stores/useAppStore";
import { fechaLocalISO } from "../../../funciones/utils/fechas";

const COLORES = {
    cobrado: "#533b8f",
    esperado: "#f0a43a",
    proyectado: "#bfaee8",
    gasto: "#d94f5c",
};

const ETIQUETA_TIPO = {
    cobrado: "Cobrado",
    esperado: "Pendiente",
    proyectado: "Proyectado",
};

const STORAGE_EXTRAORDINARIOS = "zaldo_ingresos_incluir_extraordinarios";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 3px 12px rgba(83, 59, 143, 0.05);

  @media (max-width: 600px) {
    padding: 12px 10px;
  }
`;

const Encabezado = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const TituloPanel = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;

  svg {
    flex: 0 0 auto;
    margin-top: 3px;
    color: var(--colorMorado);
  }

  h3 {
    margin: 0;
    color: #1a1a2e;
    font-size: 16px;
    font-weight: 800;
  }

  p {
    margin: 3px 0 0;
    color: #777;
    font-size: 12px;
    line-height: 1.45;
  }
`;

const NavMes = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BtnNav = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 9px;
  background: #fff;
  color: var(--colorMorado);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(83, 59, 143, 0.07);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const NombreMes = styled.span`
  min-width: 118px;
  text-align: center;
  color: #1a1a2e;
  font-size: 15px;
  font-weight: 800;
  text-transform: capitalize;
`;

const BtnHoy = styled.button`
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 9px;
  background: #fff;
  color: var(--colorMorado);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.07);
  }
`;

const FilaChips = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: thin;
  padding-bottom: 2px;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  height: 30px;
  padding: 0 11px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.18)")};
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.09)" : "#fff")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#555")};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    border-color: var(--colorMorado);
  }
`;

const Punto = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color || "var(--colorMorado)"};
  flex: 0 0 auto;
`;

const ResumenMes = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const DatoResumen = styled.div`
  padding: 9px 11px;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-left: 4px solid ${({ $color }) => $color || "var(--colorMorado)"};
  border-radius: 10px;
  background: #fbfaff;

  span {
    display: block;
    color: #777;
    font-size: 11px;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: #1a1a2e;
    font-size: 15px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

const Leyenda = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #666;
  font-size: 11px;
  font-weight: 600;

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  i {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    border: 1px solid ${COLORES.cobrado};
    background: ${COLORES.cobrado};
  }

  i.esperado { background: #fffbeb; border-color: ${COLORES.esperado}; }
  i.proyectado { background: #faf8ff; border: 1px dashed ${COLORES.proyectado}; }
`;

const Cuadricula = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
`;

const CabeceraDia = styled.div`
  padding: 4px 0;
  color: #8b849e;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;

  @media (max-width: 600px) {
    font-size: 10px;
  }
`;

const Celda = styled.button`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  min-height: 92px;
  padding: 5px;
  border: 1px solid ${({ $sel, $hoy }) => ($sel ? "var(--colorMorado)" : $hoy ? "rgba(83, 59, 143, 0.45)" : "rgba(83, 59, 143, 0.09)")};
  border-radius: 10px;
  background: ${({ $vacia, $fin }) => ($vacia ? "transparent" : $fin ? "#faf9fd" : "#fff")};
  box-shadow: ${({ $sel }) => ($sel ? "0 0 0 2px rgba(83, 59, 143, 0.18)" : "none")};
  font: inherit;
  text-align: left;
  cursor: ${({ $vacia }) => ($vacia ? "default" : "pointer")};
  visibility: ${({ $vacia }) => ($vacia ? "hidden" : "visible")};
  overflow: hidden;

  &:hover {
    border-color: var(--colorMorado);
  }

  @media (max-width: 600px) {
    min-height: 62px;
    padding: 3px;
    gap: 2px;
  }
`;

const NumeroDia = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ $hoy }) => ($hoy ? "var(--colorMorado)" : "transparent")};
  color: ${({ $hoy }) => ($hoy ? "#fff" : "#3b3155")};
  font-size: 11px;
  font-weight: 800;
`;

const ChipEvento = styled.span`
  display: block;
  padding: 2px 5px;
  border: 1px ${({ $tipo }) => ($tipo === "proyectado" ? "dashed" : "solid")} ${({ $tipo }) => COLORES[$tipo === "cobrado" ? "cobrado" : $tipo === "esperado" ? "esperado" : "proyectado"]}55;
  border-left: 3px solid ${({ $color }) => $color || "var(--colorMorado)"};
  border-radius: 6px;
  background: ${({ $tipo }) => ($tipo === "cobrado" ? "#f3f0fb" : $tipo === "esperado" ? "#fffbeb" : "#faf8ff")};
  color: ${({ $tipo }) => ($tipo === "proyectado" ? "#7a6aa8" : "#2c2c3e")};
  font-size: 11px;
  font-weight: 800;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 600px) {
    padding: 1px 3px;
    font-size: 9px;
  }
`;

const MasEventos = styled.span`
  color: #8b849e;
  font-size: 10px;
  font-weight: 700;
`;

const Agenda = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(83, 59, 143, 0.1);
`;

const TituloAgenda = styled.h4`
  margin: 8px 0 2px;
  color: #3b3155;
  font-size: 13px;
  font-weight: 800;
  text-transform: capitalize;
`;

const FilaEvento = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 10px;
  background: #fff;

  .quien {
    min-width: 0;
  }

  .quien strong {
    display: block;
    overflow: hidden;
    color: #1a1a2e;
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quien small {
    display: block;
    color: #777;
    font-size: 11px;
    line-height: 1.35;
  }

  .monto {
    text-align: right;
    font-size: 13px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

const Etiqueta = styled.span`
  display: inline-block;
  margin-top: 2px;
  padding: 1px 7px;
  border-radius: 999px;
  background: ${({ $tipo }) => ($tipo === "cobrado" ? "#ede9fb" : $tipo === "esperado" ? "#fef3c7" : "#f3effc")};
  color: ${({ $tipo }) => ($tipo === "cobrado" ? "#533b8f" : $tipo === "esperado" ? "#92600a" : "#7a6aa8")};
  font-size: 10px;
  font-weight: 800;
`;

const Vacio = styled.p`
  margin: 6px 0;
  color: #8b849e;
  font-size: 12px;
  font-weight: 600;
`;

const GridKpis = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Kpi = styled.article`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 12px;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
  background: ${({ $tono }) => ($tono === "positivo" ? "#ecfdf5" : $tono === "negativo" ? "#fef2f2" : "#fbfaff")};

  span {
    color: #777;
    font-size: 11px;
    font-weight: 700;
  }

  strong {
    color: ${({ $tono }) => ($tono === "positivo" ? "#047857" : $tono === "negativo" ? "#b91c1c" : "#1a1a2e")};
    font-size: 17px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  small {
    color: #8b849e;
    font-size: 11px;
    line-height: 1.35;
  }
`;

const Interruptor = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.2)")};
  border-radius: 12px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.08)" : "#fff")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#555")};
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--colorMorado);
  }

  .pista {
    position: relative;
    display: inline-block;
    flex: 0 0 auto;
    width: 28px;
    height: 16px;
    border-radius: 999px;
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#cbd5e1")};
    transition: background 0.2s ease;
  }

  .pista::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $activo }) => ($activo ? "14px" : "2px")};
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.2s ease;
  }
`;

const GraficaWrap = styled.div`
  width: 100%;
  height: 300px;

  @media (max-width: 600px) {
    height: 260px;
    margin-inline: -6px;
    width: calc(100% + 12px);
  }
`;

const Nota = styled.p`
  margin: 0;
  color: #8b849e;
  font-size: 11px;
  line-height: 1.5;
`;

const compacto = (monto) => {
    const n = Number(monto || 0);
    if (Math.abs(n) >= 10000) return `$${Math.round(n / 1000)}k`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return `$${Math.round(n)}`;
};

const leerPreferenciaExtraordinarios = () => {
    try {
        return localStorage.getItem(STORAGE_EXTRAORDINARIOS) === "true";
    } catch {
        return false;
    }
};

const etiquetaDia = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
});

const subtituloEvento = (evento) => {
    const partes = [evento.etiqueta];
    if (evento.porLiquidar) partes.push("se cobra al liquidar");
    if (evento.detallePercepciones?.length) partes.push(`incluye ${evento.detallePercepciones.join(", ")}`);
    return partes.filter(Boolean).join(" · ");
};

export const CalendarioIngresos = ({ empresas = [], dataIngresos, year, uid }) => {
    const hoy = new Date();
    const hoyISO = fechaLocalISO(hoy);
    const esAnioActual = Number(year) === hoy.getFullYear();

    const [mes, setMes] = useState(esAnioActual ? hoy.getMonth() + 1 : 1);
    const [diaSeleccionado, setDiaSeleccionado] = useState(null);
    const [filtroEmpresa, setFiltroEmpresa] = useState("todas");
    const [incluirExtraordinarios, setIncluirExtraordinarios] = useState(leerPreferenciaExtraordinarios);
    const [cargandoGasto, setCargandoGasto] = useState(false);

    const movimientosCache = useAppStore((state) => state.movimientos);
    const setMovimientos = useAppStore((state) => state.setMovimientos);

    useEffect(() => {
        setMes(esAnioActual ? new Date().getMonth() + 1 : 1);
        setDiaSeleccionado(null);
    }, [year, esAnioActual]);

    useEffect(() => {
        if (!uid) return undefined;
        const cache = useAppStore.getState().movimientos;
        const base = cache && !Array.isArray(cache) ? cache : {};
        const faltantes = clavesUltimosMeses().filter((clave) => !Array.isArray(base[clave]));
        if (!faltantes.length) return undefined;

        let activo = true;
        setCargandoGasto(true);
        Promise.all(faltantes.map(async (clave) => {
            const resultado = await obtenerMovimientosPorAnioMes(uid, clave);
            return [clave, resultado?.movimientos || []];
        }))
            .then((pares) => {
                if (!activo) return;
                setMovimientos((previo) => ({ ...(Array.isArray(previo) ? {} : previo), ...Object.fromEntries(pares) }));
            })
            .catch((error) => console.error("Error al cargar el gasto del último año:", error))
            .finally(() => {
                if (activo) setCargandoGasto(false);
            });

        return () => {
            activo = false;
        };
    }, [uid, setMovimientos]);

    const alternarExtraordinarios = () => {
        setIncluirExtraordinarios((actual) => {
            const siguiente = !actual;
            try {
                localStorage.setItem(STORAGE_EXTRAORDINARIOS, String(siguiente));
            } catch {
                // La preferencia solo es una comodidad.
            }
            return siguiente;
        });
    };

    const gasto = useMemo(
        () => calcularGastoPersonalPromedio(Array.isArray(movimientosCache) ? {} : movimientosCache, clavesUltimosMeses()),
        [movimientosCache]
    );
    const gastoMensual = incluirExtraordinarios ? gasto.mensualTotal : gasto.mensualBase;
    const gastoDiario = incluirExtraordinarios ? gasto.diarioTotal : gasto.diarioBase;

    const eventosTodos = useMemo(() => construirEventosIngresos({
        empresas,
        registros: dataIngresos?.registros || [],
        ingresosExtra: dataIngresos?.ingresosExtra || [],
        year,
    }), [empresas, dataIngresos?.registros, dataIngresos?.ingresosExtra, year]);

    const opcionesFiltro = useMemo(() => {
        const ids = new Set(eventosTodos.map((evento) => evento.empresaId));
        const lista = empresas
            .filter((empresa) => ids.has(empresa.id))
            .map((empresa) => ({ id: empresa.id, nombre: empresa.nombre, color: empresa.color }));
        if (ids.has("extra")) lista.push({ id: "extra", nombre: "Otros ingresos", color: COLOR_OTROS_INGRESOS });
        return lista;
    }, [eventosTodos, empresas]);

    useEffect(() => {
        if (filtroEmpresa !== "todas" && !opcionesFiltro.some((opcion) => opcion.id === filtroEmpresa)) {
            setFiltroEmpresa("todas");
        }
    }, [opcionesFiltro, filtroEmpresa]);

    const eventos = useMemo(
        () => (filtroEmpresa === "todas" ? eventosTodos : eventosTodos.filter((evento) => evento.empresaId === filtroEmpresa)),
        [eventosTodos, filtroEmpresa]
    );
    const eventosPorDia = useMemo(() => agruparEventosPorDia(eventos), [eventos]);
    const resumenMeses = useMemo(() => resumirEventosPorMes(eventos), [eventos]);
    const resumenMes = resumenMeses[mes - 1];
    const promedioIngreso = promedioMensualProyectado(resumenMeses);
    const totalAnio = resumenMeses.reduce((suma, item) => suma + item.total, 0);
    const margen = promedioIngreso - gastoMensual;

    const prefijoMes = `${year}-${String(mes).padStart(2, "0")}`;
    const diasEnMes = new Date(Number(year), mes, 0).getDate();
    const huecosInicio = (new Date(Number(year), mes - 1, 1).getDay() + 6) % 7;
    const eventosDelMes = eventos.filter((evento) => evento.fecha.startsWith(prefijoMes));

    const datosGrafica = resumenMeses.map((item) => ({
        mes: MESES_ANIO[item.mesNum - 1].corto,
        Cobrado: Math.round(item.cobrado),
        Pendiente: Math.round(item.esperado),
        Proyectado: Math.round(item.proyectado),
    }));

    const nombreMes = new Date(Number(year), mes - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    const listaAgenda = diaSeleccionado ? (eventosPorDia.get(diaSeleccionado) || []) : eventosDelMes;
    const hayProyeccion = eventosTodos.some((evento) => evento.tipo === "proyectado");

    const cambiarMes = (delta) => {
        setMes((actual) => Math.min(12, Math.max(1, actual + delta)));
        setDiaSeleccionado(null);
    };

    return (
        <Contenedor>
            <Panel>
                <Encabezado>
                    <TituloPanel>
                        <FaCalendarAlt aria-hidden="true" />
                        <div>
                            <h3>Calendario de ingresos</h3>
                            <p>Lo cobrado, lo pendiente y lo que se espera cobrar de todos tus empleos.</p>
                        </div>
                    </TituloPanel>
                    <NavMes>
                        <BtnNav type="button" onClick={() => cambiarMes(-1)} disabled={mes === 1} aria-label="Mes anterior">
                            <FaChevronLeft />
                        </BtnNav>
                        <NombreMes>{nombreMes}</NombreMes>
                        <BtnNav type="button" onClick={() => cambiarMes(1)} disabled={mes === 12} aria-label="Mes siguiente">
                            <FaChevronRight />
                        </BtnNav>
                        {esAnioActual && (
                            <BtnHoy type="button" onClick={() => { setMes(hoy.getMonth() + 1); setDiaSeleccionado(hoyISO); }}>
                                Hoy
                            </BtnHoy>
                        )}
                    </NavMes>
                </Encabezado>

                <FilaChips role="group" aria-label="Empleo a mostrar">
                    <Chip type="button" $activo={filtroEmpresa === "todas"} onClick={() => setFiltroEmpresa("todas")}>
                        Consolidado
                    </Chip>
                    {opcionesFiltro.map((opcion) => (
                        <Chip
                            key={opcion.id}
                            type="button"
                            $activo={filtroEmpresa === opcion.id}
                            onClick={() => setFiltroEmpresa(opcion.id)}
                        >
                            <Punto $color={opcion.color} /> {opcion.nombre}
                        </Chip>
                    ))}
                </FilaChips>

                <ResumenMes>
                    <DatoResumen $color={COLORES.cobrado}>
                        <span>Cobrado</span>
                        <strong>{fnFormatMoney(resumenMes.cobrado)}</strong>
                    </DatoResumen>
                    <DatoResumen $color={COLORES.esperado}>
                        <span>Pendiente</span>
                        <strong>{fnFormatMoney(resumenMes.esperado)}</strong>
                    </DatoResumen>
                    <DatoResumen $color={COLORES.proyectado}>
                        <span>Proyectado</span>
                        <strong>{fnFormatMoney(resumenMes.proyectado)}</strong>
                    </DatoResumen>
                    <DatoResumen $color="#1a1a2e">
                        <span>Total del mes</span>
                        <strong>{fnFormatMoney(resumenMes.total)}</strong>
                    </DatoResumen>
                </ResumenMes>

                <Leyenda>
                    <span><i /> Cobrado</span>
                    <span><i className="esperado" /> Pendiente</span>
                    <span><i className="proyectado" /> Proyectado</span>
                </Leyenda>

                <Cuadricula>
                    {DIAS_SEMANA.map((dia) => <CabeceraDia key={dia}>{dia}</CabeceraDia>)}
                    {Array.from({ length: huecosInicio }, (_, indice) => <Celda key={`h${indice}`} $vacia as="div" aria-hidden="true" />)}
                    {Array.from({ length: diasEnMes }, (_, indice) => {
                        const dia = indice + 1;
                        const iso = `${prefijoMes}-${String(dia).padStart(2, "0")}`;
                        const delDia = eventosPorDia.get(iso) || [];
                        const diaSemana = (huecosInicio + indice) % 7;
                        return (
                            <Celda
                                key={iso}
                                type="button"
                                $hoy={iso === hoyISO}
                                $sel={iso === diaSeleccionado}
                                $fin={diaSemana >= 5}
                                onClick={() => setDiaSeleccionado((actual) => (actual === iso ? null : iso))}
                                aria-label={`${etiquetaDia(iso)}${delDia.length ? `, ${delDia.length} ingresos` : ""}`}
                            >
                                <NumeroDia $hoy={iso === hoyISO}>{dia}</NumeroDia>
                                {delDia.slice(0, 2).map((evento) => (
                                    <ChipEvento key={evento.id} $tipo={evento.tipo} $color={evento.color} title={`${evento.empresaNombre}: ${fnFormatMoney(evento.monto)}`}>
                                        {compacto(evento.monto)}
                                    </ChipEvento>
                                ))}
                                {delDia.length > 2 && <MasEventos>+{delDia.length - 2} más</MasEventos>}
                            </Celda>
                        );
                    })}
                </Cuadricula>

                <Agenda>
                    <TituloAgenda>{diaSeleccionado ? etiquetaDia(diaSeleccionado) : `Agenda de ${nombreMes}`}</TituloAgenda>
                    {listaAgenda.length === 0 ? (
                        <Vacio>{diaSeleccionado ? "Sin ingresos este día." : "Sin ingresos registrados ni esperados este mes."}</Vacio>
                    ) : listaAgenda.map((evento) => (
                        <FilaEvento key={evento.id}>
                            <Punto $color={evento.color} />
                            <div className="quien">
                                <strong>{evento.empresaNombre}</strong>
                                <small>
                                    {!diaSeleccionado && `${Number(evento.fecha.slice(8, 10))} de ${new Date(`${evento.fecha}T12:00:00`).toLocaleDateString("es-MX", { month: "short" })} · `}
                                    {subtituloEvento(evento)}
                                </small>
                                <Etiqueta $tipo={evento.tipo}>{ETIQUETA_TIPO[evento.tipo]}</Etiqueta>
                            </div>
                            <span className="monto">{fnFormatMoney(evento.monto)}</span>
                        </FilaEvento>
                    ))}
                </Agenda>
            </Panel>

            <Panel>
                <Encabezado>
                    <TituloPanel>
                        <FaChartLine aria-hidden="true" />
                        <div>
                            <h3>Proyección de salario {year}</h3>
                            <p>Cobrado hasta hoy más lo que sigue según la configuración de cada empleo.</p>
                        </div>
                    </TituloPanel>
                    <Interruptor
                        type="button"
                        role="switch"
                        aria-checked={incluirExtraordinarios}
                        $activo={incluirExtraordinarios}
                        onClick={alternarExtraordinarios}
                        title="Suma los gastos marcados como extraordinarios al promedio de gasto personal"
                    >
                        <span className="pista" />
                        <span>Incluir extraordinarios</span>
                    </Interruptor>
                </Encabezado>

                <GridKpis>
                    <Kpi>
                        <span>Ingreso proyectado {year}</span>
                        <strong>{fnFormatMoney(totalAnio)}</strong>
                        <small>Cobrado, pendiente y por cobrar</small>
                    </Kpi>
                    <Kpi>
                        <span>Ingreso mensual promedio</span>
                        <strong>{fnFormatMoney(promedioIngreso)}</strong>
                        <small>Meses con ingresos</small>
                    </Kpi>
                    <Kpi>
                        <span>Gasto personal promedio</span>
                        <strong>{cargandoGasto && !gasto.mesesConDatos ? "Calculando…" : fnFormatMoney(gastoMensual)}</strong>
                        <small>
                            {gasto.mesesConDatos
                                ? `${fnFormatMoney(gastoDiario)} al día · ${gasto.mesesConDatos} de ${MESES_PARA_PROMEDIO} meses con datos`
                                : "Sin gastos personales en el último año"}
                        </small>
                    </Kpi>
                    <Kpi $tono={gasto.mesesConDatos ? (margen >= 0 ? "positivo" : "negativo") : undefined}>
                        <span>Margen mensual estimado</span>
                        <strong>{gasto.mesesConDatos ? fnFormatMoney(margen) : "—"}</strong>
                        <small>{gasto.mesesConDatos ? "Ingreso promedio menos gasto personal" : "Marca tus gastos como personales"}</small>
                    </Kpi>
                </GridKpis>

                <GraficaWrap>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={datosGrafica} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ece8f6" vertical={false} />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#777" }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#777" }} tickLine={false} axisLine={false} width={46} tickFormatter={compacto} />
                            <Tooltip formatter={(valor) => fnFormatMoney(valor)} cursor={{ fill: "rgba(83, 59, 143, 0.06)" }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Cobrado" stackId="ingreso" fill={COLORES.cobrado} />
                            <Bar dataKey="Pendiente" stackId="ingreso" fill={COLORES.esperado} />
                            <Bar dataKey="Proyectado" stackId="ingreso" fill={COLORES.proyectado} radius={[4, 4, 0, 0]} />
                            {gasto.mesesConDatos > 0 && (
                                <ReferenceLine
                                    y={Math.round(gastoMensual)}
                                    stroke={COLORES.gasto}
                                    strokeDasharray="5 4"
                                    strokeWidth={2}
                                    label={{ value: "Gasto personal", position: "insideTopRight", fill: COLORES.gasto, fontSize: 11, fontWeight: 700 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </GraficaWrap>

                <Kpi style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <FaShoppingBasket aria-hidden="true" style={{ color: COLORES.gasto, marginTop: 3, flex: "0 0 auto" }} />
                    <div>
                        <span>Cómo se calcula el gasto</span>
                        <small style={{ display: "block" }}>
                            Promedio de tus gastos marcados como personales en los últimos {MESES_PARA_PROMEDIO} meses completos
                            {gasto.mesesConDatos > 0 && (
                                <>
                                    {" "}({fnFormatMoney(gasto.mensualBase)} habituales
                                    {gasto.mensualExtraordinario > 0 && ` + ${fnFormatMoney(gasto.mensualExtraordinario)} extraordinarios al mes`})
                                </>
                            )}
                            . Los meses sin movimientos no entran al promedio.
                        </small>
                    </div>
                </Kpi>

                {!hayProyeccion && (
                    <Nota>
                        No hay periodos por proyectar: activa un empleo con su esquema de pago configurado
                        (quincenal, semanal o por horas) y aparecerán aquí hacia adelante.
                    </Nota>
                )}
            </Panel>
        </Contenedor>
    );
};
