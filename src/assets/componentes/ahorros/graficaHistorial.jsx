import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import styled from "styled-components";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    Bar,
    BarChart,
    Cell,
    Treemap,
} from "recharts";
import { FaArrowUp, FaArrowDown, FaMinus, FaChartBar, FaChartLine, FaLayerGroup } from "react-icons/fa";
import { toFechaKey } from "../../funciones/firebase/ahorros";
import { MES_CORTE } from "../../funciones/firebase/ahorros";

const Container = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
  padding: 20px;
`;

const ContenidoAhorros = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  grid-template-areas: "tabla grafica";
  align-items: start;
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      "grafica"
      "tabla";
  }
`;

const ColumnaTabla = styled.div`
  grid-area: tabla;
  min-width: 0;
`;

const ColumnaGrafica = styled.div`
  grid-area: grafica;
  min-width: 0;

  @media (min-width: 981px) {
    position: sticky;
    top: calc(var(--alturaTopMenu) + 16px);
    max-height: calc(100dvh - var(--alturaTopMenu) - 28px);
    overflow-y: auto;
    padding-right: 3px;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(83, 59, 143, 0.18);
    }
  }
`;

const GraficaLayout = styled.div`
  display: flex;
  gap: 20px;

  @media (min-width: 981px) {
    flex-direction: column;
    gap: 12px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const GraficaWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const PanelIncremento = styled.div`
  width: 240px;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(83, 59, 143, 0.03) 0%, rgba(83, 59, 143, 0.08) 100%);
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 16px;
  
  @media (max-width: 768px) {
    width: 100%;
  }

  @media (min-width: 981px) {
    width: 100%;
  }
`;

const TituloPanel = styled.h4`
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ListaMeses = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(83, 59, 143, 0.2);
    border-radius: 2px;
  }
`;

const ItemMes = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(83, 59, 143, 0.08);
  transition: all 0.15s ease;
  border-left: ${({ $esCorte }) => $esCorte ? "3px solid var(--colorMorado)" : "1px solid rgba(83, 59, 143, 0.08)"};
  
  &:hover {
    border-color: rgba(83, 59, 143, 0.2);
    box-shadow: 0 2px 8px rgba(83, 59, 143, 0.08);
  }
`;

const MesNombre = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
`;

const MesValor = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $valor }) => {
        if ($valor > 0) return "#0a7b34";
        if ($valor < 0) return "#c62828";
        return "#8a8a9a";
    }};
`;

const IconoTendencia = styled.span`
  font-size: 10px;
  display: flex;
  align-items: center;
`;

const SeccionTabla = styled.div`
  margin-top: 20px;
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  padding-top: 18px;
`;

const TablaWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 420px;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #8a8a9a;
  border-bottom: 1px solid rgba(83, 59, 143, 0.08);
`;

const Td = styled.td`
  padding: 12px;
  font-size: 13px;
  color: #1a1a2e;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  white-space: nowrap;
`;

const TdNota = styled.td`
  padding: 8px 12px;
  font-size: 13px;
  color: #1a1a2e;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  white-space: normal;
  min-width: 160px;
`;

const InputNota = styled.input`
  width: 100%;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  color: #1a1a2e;
  background: transparent;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.04);
  }

  &:hover:not(:focus) {
    border-color: rgba(83, 59, 143, 0.15);
    background: rgba(83, 59, 143, 0.02);
  }

  &::placeholder {
    color: #c0c0c0;
    font-style: italic;
  }
`;

const Diferencia = styled.span`
  font-weight: 700;
  color: ${({ $valor }) => {
        if ($valor > 0) return "#0a7b34";
        if ($valor < 0) return "#c62828";
        return "#8a8a9a";
    }};
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
`;

const TextoIntroduccion = styled.p`
  margin: 5px 0 0;
  color: #89818f;
  font-size: 11px;
  line-height: 1.45;
`;

const SelectorVistas = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;

  @media (max-width: 760px) { justify-content: flex-start; }
`;

const BotonVista = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 31px;
  padding: 0 10px;
  border: 1px solid ${({ $activo }) => $activo ? "var(--colorMorado)" : "rgba(83, 59, 143, .16)"};
  border-radius: 8px;
  background: ${({ $activo }) => $activo ? "var(--colorMorado)" : "#fff"};
  color: ${({ $activo }) => $activo ? "#fff" : "#675e70"};
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;

  &:hover { border-color: var(--colorMorado); color: ${({ $activo }) => $activo ? "#fff" : "var(--colorMorado)"}; }
  &:focus-visible { outline: 2px solid #b99ee1; outline-offset: 2px; }
`;

const EncabezadoGrafico = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 10px;
`;

const DescripcionGrafico = styled.p`
  margin: 0;
  color: #8b8392;
  font-size: 11px;
`;

const NotaComposicion = styled.p`
  margin: 2px 0 0;
  color: #938b99;
  font-size: 10px;
  text-align: center;
`;

const LeyendaPersonalizada = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const ItemLeyenda = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #8a8a9a;
  cursor: pointer;
  opacity: ${({ $oculto }) => ($oculto ? 0.4 : 1)};
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 1;
  }
`;

const PuntoColor = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const Vacio = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  font-size: 13px;
  color: #8a8a9a;
`;

const COLORES = {
    capitalTotal: "#533b8f",
    liquido: "#006c67",
    inversiones: "#b494f1",
    inversionesLargo: "#cca43b",
    responsabilidades: "#db2b39",
};

const NOMBRES = {
    capitalTotal: "Capital Total",
    liquido: "Líquido",
    inversiones: "Inversiones",
    inversionesLargo: "A Largo Plazo",
    responsabilidades: "Responsabilidades",
};

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
    });

const formatFecha = (fechaKey) => {
    if (!fechaKey) return "";
    const [, month, day] = fechaKey.split("-");
    return `${parseInt(day)} ${MESES_CORTOS[parseInt(month) - 1]}`;
};

const formatFechaTabla = (fechaKey) => {
    if (!fechaKey) return "";
    const [year, month, day] = fechaKey.split("-");
    const fecha = new Date(Number(year), Number(month) - 1, Number(day));
    return fecha.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const calcularIncrementosMensuales = (historial) => {
    if (!historial || historial.length < 2) return [];

    const meses = {};

    historial.forEach((item) => {
        if (!item.fechaKey) return;
        const [year, month] = item.fechaKey.split("-");
        const key = `${year}-${month}`;
        if (!meses[key]) {
            meses[key] = { nombre: MESES_CORTOS[parseInt(month) - 1], year, month: parseInt(month), valores: [] };
        }
        meses[key].valores.push(Number(item.capitalTotal || 0));
    });

    const resultado = [];
    const mesesOrdenados = Object.entries(meses).sort(([a], [b]) => a.localeCompare(b));

    for (let i = 0; i < mesesOrdenados.length; i++) {
        const [key, mes] = mesesOrdenados[i];
        const ultimoValor = mes.valores[mes.valores.length - 1];
        const valorBase = i > 0
            ? mesesOrdenados[i - 1][1].valores[mesesOrdenados[i - 1][1].valores.length - 1]
            : mes.valores[0];
        const incremento = ultimoValor - valorBase;

        let incrementoRelativo = null;
        if (i > 0 && valorBase > 0) {
            incrementoRelativo = ((ultimoValor - valorBase) / valorBase) * 100;
        }

        const esCorte = mes.month === MES_CORTE;

        resultado.push({
            key,
            nombre: `${mes.nombre} ${mes.year}`,
            incremento,
            incrementoRelativo,
            valorInicial: valorBase,
            valorFinal: ultimoValor,
            esCorte,
        });
    }

    return resultado.reverse();
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "white",
                border: "1px solid rgba(83, 59, 143, 0.15)",
                borderRadius: "10px",
                padding: "14px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                backdropFilter: "blur(8px)",
            }}
        >
            <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 700, color: "#1a1a2e", borderBottom: "1px solid rgba(83, 59, 143, 0.1)", paddingBottom: "8px" }}>
                {formatFecha(label)}
            </p>
            {payload.map((entry) => (
                <p
                    key={entry.name}
                    style={{
                        margin: "4px 0",
                        fontSize: "11px",
                        color: entry.color,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: entry.color, flexShrink: 0 }}></span>
                    {NOMBRES[entry.name]}: {formatMoney(entry.value)}
                </p>
            ))}
        </div>
    );
};

const GraficoEvolucion = ({ datos, lineasVisibles }) => (
    <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={datos} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <defs>
                {Object.entries(COLORES).map(([key, color]) => (
                    <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(83, 59, 143, 0.06)" vertical={false} />
            <XAxis
                dataKey="fechaKey"
                tickFormatter={formatFecha}
                tick={{ fontSize: 10, fill: "#8a8a9a" }}
                axisLine={{ stroke: "rgba(83, 59, 143, 0.1)" }}
                tickLine={false}
            />
            <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "#8a8a9a" }}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {Object.entries(COLORES).map(([key, color]) => (
                lineasVisibles[key] && (
                    <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={key === "capitalTotal" ? 3 : 2}
                        fill={`url(#gradient-${key})`}
                        dot={{ r: key === "capitalTotal" ? 4 : 3, fill: color, strokeWidth: 2, stroke: "white" }}
                        activeDot={{ r: 6, fill: color, strokeWidth: 3, stroke: "white" }}
                    />
                )
            ))}
        </AreaChart>
    </ResponsiveContainer>
);

const GraficoVariacion = ({ datos }) => (
    <ResponsiveContainer width="100%" height={320}>
        <BarChart data={datos} margin={{ top: 18, right: 12, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(83, 59, 143, .06)" vertical={false} />
            <XAxis
                dataKey="periodo"
                tick={{ fontSize: 10, fill: "#8a8a9a" }}
                axisLine={{ stroke: "rgba(83, 59, 143, .1)" }}
                tickLine={false}
            />
            <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "#8a8a9a" }}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip formatter={(valor) => formatMoney(valor)} labelStyle={{ fontWeight: 700 }} />
            <Bar dataKey="variacion" name="Variación" radius={[5, 5, 2, 2]} maxBarSize={42}>
                {datos.map((entrada) => <Cell key={entrada.periodo} fill={entrada.variacion >= 0 ? "#12805c" : "#d1454e"} />)}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

const TreemapContenidoAhorro = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    fill = "var(--colorMorado)",
    percentage = 0,
}) => {
    if (width <= 0 || height <= 0) return null;
    const etiqueta = String(name || "");
    const mostrarNombre = width > 70 && height > 42;
    const mostrarPorcentaje = width > 48 && height > 28;

    return (
        <g>
            <title>{`${etiqueta}: ${Number(percentage || 0).toFixed(1)}%`}</title>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={9}
                fill={fill}
                stroke="#ffffff"
                strokeWidth={3}
            />
            {mostrarNombre && (
                <text
                    x={x + 10}
                    y={y + 20}
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight={800}
                >
                    {etiqueta.length > 18 ? `${etiqueta.slice(0, 16)}…` : etiqueta}
                </text>
            )}
            {mostrarPorcentaje && (
                <text
                    x={x + 10}
                    y={y + (mostrarNombre ? 38 : 21)}
                    fill="rgba(255, 255, 255, 0.92)"
                    fontSize={12}
                    fontWeight={800}
                    fontFamily="monospace"
                >
                    {`${Number(percentage || 0).toFixed(1)}%`}
                </text>
            )}
        </g>
    );
};

const GraficoComposicion = ({ datos }) => (
    <>
        <ResponsiveContainer width="100%" height={300}>
            <Treemap
                data={datos}
                dataKey="size"
                nameKey="nombre"
                aspectRatio={1.25}
                content={<TreemapContenidoAhorro />}
            >
                <Tooltip formatter={(valor) => formatMoney(valor)} />
            </Treemap>
        </ResponsiveContainer>
        <NotaComposicion>Porcentaje del valor total de tu composición actual.</NotaComposicion>
    </>
);

const PanelIncrementos = ({ historial }) => {
    const incrementos = useMemo(() => calcularIncrementosMensuales(historial), [historial]);

    if (incrementos.length === 0) {
        return (
            <PanelIncremento>
                <TituloPanel>Incremento Mensual</TituloPanel>
                <div style={{ fontSize: "12px", color: "#8a8a9a", textAlign: "center", padding: "20px 0" }}>
                    Necesitas más datos para calcular incrementos
                </div>
            </PanelIncremento>
        );
    }

    return (
        <PanelIncremento>
            <TituloPanel>Incremento Mensual</TituloPanel>
            <ListaMeses>
                {incrementos.map((mes) => (
                    <ItemMes key={mes.key} $esCorte={mes.esCorte}>
                        <MesNombre>{mes.nombre}{mes.esCorte ? " ✦" : ""}</MesNombre>
                        <MesValor $valor={mes.incremento}>
                            <IconoTendencia>
                                {mes.incremento > 0 ? <FaArrowUp /> : mes.incremento < 0 ? <FaArrowDown /> : <FaMinus />}
                            </IconoTendencia>
                            {mes.incremento > 0 ? "+" : ""}{formatMoney(mes.incremento)}
                        </MesValor>
                    </ItemMes>
                ))}
            </ListaMeses>
        </PanelIncremento>
    );
};

const FilaNota = ({ fila, onActualizarNota }) => {
    const [valorLocal, setValorLocal] = useState(fila.nota || "");
    const inputRef = useRef(null);

    useEffect(() => {
        setValorLocal(fila.nota || "");
    }, [fila.nota, fila.fechaKey]);

    const handleBlur = useCallback(() => {
        if (valorLocal !== (fila.nota || "")) {
            onActualizarNota(fila.fechaKey, valorLocal);
        }
    }, [valorLocal, fila.nota, fila.fechaKey, onActualizarNota]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter") {
            e.target.blur();
        }
    }, []);

    return (
        <tr>
            <Td>{formatFechaTabla(fila.fechaKey)}</Td>
            <Td>{formatMoney(fila.valorActual)}</Td>
            <Td>
                {fila.diferencia === null ? (
                    "\u2014"
                ) : (
                    <Diferencia $valor={fila.diferencia}>
                        {fila.diferencia > 0 ? "+" : ""}
                        {formatMoney(fila.diferencia)}
                    </Diferencia>
                )}
            </Td>
            <TdNota>
                {/* El punto inicial es sintético: sale de kpis, no del historial,
                    así que no hay snapshot al que guardarle una nota. */}
                {fila.esInicial ? (
                    <span style={{ fontSize: "12px", color: "#8a8a9a" }}>{fila.nota}</span>
                ) : (
                    <InputNota
                        ref={inputRef}
                        value={valorLocal}
                        placeholder="Nota..."
                        onChange={(e) => setValorLocal(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                    />
                )}
            </TdNota>
        </tr>
    );
};

export const GraficaHistorial = ({ historial = [], kpis = {}, onActualizarNota }) => {
    const [vistaGrafica, setVistaGrafica] = useState("evolucion");
    const [lineasVisibles, setLineasVisibles] = useState({
        capitalTotal: true,
        liquido: true,
        inversiones: true,
        inversionesLargo: true,
        responsabilidades: true,
    });

    const toggleLinea = (key) => {
        setLineasVisibles((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    /*
     * La línea base del año vive en `kpis`, no en `historial`, así que hay que
     * anteponerla como punto de partida. Sin ella la gráfica arrancaba en el
     * primer movimiento y no se veía el incremento contra el inicio del año.
     * Solo se antepone si es anterior al primer snapshot: si ya coincide con él
     * (por ejemplo el año que se abre por corte anual) duplicaría el punto.
     */
    const puntoInicial = useMemo(() => {
        const base = kpis?.capitalInicial;
        if (base === undefined || base === null) return null;

        const fecha = kpis?.fechaInicio;
        const fechaKey = fecha
            ? toFechaKey(fecha.toDate ? fecha.toDate() : new Date(fecha))
            : null;
        if (!fechaKey) return null;

        const primero = historial[0];
        if (primero && String(primero.fechaKey) <= fechaKey) return null;

        return {
            fechaKey,
            capitalTotal: Number(base || 0),
            liquido: 0,
            inversiones: 0,
            inversionesLargo: 0,
            responsabilidades: 0,
            nota: "Inicio del año",
            esInicial: true,
        };
    }, [kpis?.capitalInicial, kpis?.fechaInicio, historial]);

    const serie = useMemo(
        () => (puntoInicial ? [puntoInicial, ...historial] : historial),
        [puntoInicial, historial]
    );

    const datos = useMemo(() => serie.map((h) => ({
        fechaKey: h.fechaKey,
        capitalTotal: h.capitalTotal || 0,
        liquido: h.liquido || 0,
        inversiones: h.inversiones || 0,
        inversionesLargo: h.inversionesLargo || 0,
        responsabilidades: h.responsabilidades || 0,
    })), [serie]);

    const datosVariacion = useMemo(() => calcularIncrementosMensuales(serie)
        .reverse()
        .map((mes) => ({
            periodo: mes.nombre,
            variacion: mes.incremento,
        })), [serie]);

    const datosComposicion = useMemo(() => {
        const ultimo = serie[serie.length - 1];
        if (!ultimo) return [];
        const datosBase = [
            { nombre: "Líquido", valor: Math.abs(Number(ultimo.liquido || 0)), color: COLORES.liquido },
            { nombre: "Inversiones", valor: Math.abs(Number(ultimo.inversiones || 0)), color: COLORES.inversiones },
            { nombre: "A largo plazo", valor: Math.abs(Number(ultimo.inversionesLargo || 0)), color: COLORES.inversionesLargo },
            { nombre: "Responsabilidades", valor: Math.abs(Number(ultimo.responsabilidades || 0)), color: COLORES.responsabilidades },
        ].filter((item) => item.valor > 0);
        const total = datosBase.reduce((suma, item) => suma + item.valor, 0);

        return datosBase.map((item) => ({
            ...item,
            size: item.valor,
            percentage: total > 0 ? (item.valor / total) * 100 : 0,
        }));
    }, [serie]);

    const datosTabla = useMemo(() =>
        serie
            .map((item, index) => {
                const valorActual = Number(item.capitalTotal || 0);
                const valorAnterior = index > 0 ? Number(serie[index - 1]?.capitalTotal || 0) : null;

                return {
                    fechaKey: item.fechaKey,
                    valorActual,
                    diferencia: valorAnterior === null ? null : valorActual - valorAnterior,
                    nota: item.nota || "",
                    esInicial: Boolean(item.esInicial),
                };
            })
            .reverse(),
        [serie]
    );

    return (
        <Container>
            <Header>
                <div>
                    <Titulo>Lectura del capital</Titulo>
                    <TextoIntroduccion>Elige la gráfica que necesitas consultar. La evolución queda seleccionada por defecto.</TextoIntroduccion>
                </div>
                <SelectorVistas aria-label="Gráficas de ahorro">
                    <BotonVista type="button" $activo={vistaGrafica === "evolucion"} aria-pressed={vistaGrafica === "evolucion"} onClick={() => setVistaGrafica("evolucion")}>
                        <FaChartLine /> Evolución del capital
                    </BotonVista>
                    <BotonVista type="button" $activo={vistaGrafica === "variacion"} aria-pressed={vistaGrafica === "variacion"} onClick={() => setVistaGrafica("variacion")}>
                        <FaChartBar /> Variación mensual
                    </BotonVista>
                    <BotonVista type="button" $activo={vistaGrafica === "composicion"} aria-pressed={vistaGrafica === "composicion"} onClick={() => setVistaGrafica("composicion")}>
                        <FaLayerGroup /> Composición actual
                    </BotonVista>
                </SelectorVistas>
            </Header>

            <ContenidoAhorros>
                <ColumnaGrafica>
            {vistaGrafica === "evolucion" && (
                <>
                    <EncabezadoGrafico>
                        <DescripcionGrafico>Activa o desactiva las líneas para comparar rubros.</DescripcionGrafico>
                        <LeyendaPersonalizada>
                            {Object.entries(NOMBRES).map(([key, nombre]) => (
                                <ItemLeyenda
                                    key={key}
                                    $oculto={!lineasVisibles[key]}
                                    onClick={() => toggleLinea(key)}
                                >
                                    <PuntoColor $color={COLORES[key]} />
                                    {nombre}
                                </ItemLeyenda>
                            ))}
                        </LeyendaPersonalizada>
                    </EncabezadoGrafico>
                    {serie.length < 2 ? (
                        <Vacio>Necesitas al menos 2 días de datos para ver la evolución.</Vacio>
                    ) : (
                        <GraficaLayout>
                            <GraficaWrapper><GraficoEvolucion datos={datos} lineasVisibles={lineasVisibles} /></GraficaWrapper>
                            <PanelIncrementos historial={serie} />
                        </GraficaLayout>
                    )}
                </>
            )}

            {vistaGrafica === "variacion" && (
                <>
                    <EncabezadoGrafico><DescripcionGrafico>El cambio neto del capital al cierre de cada mes.</DescripcionGrafico></EncabezadoGrafico>
                    {datosVariacion.length ? <GraficoVariacion datos={datosVariacion} /> : <Vacio>Necesitas al menos dos meses para calcular variaciones.</Vacio>}
                </>
            )}

            {vistaGrafica === "composicion" && (
                <>
                    <EncabezadoGrafico><DescripcionGrafico>Peso de cada rubro en tu último registro disponible.</DescripcionGrafico></EncabezadoGrafico>
                    {datosComposicion.length ? <GraficoComposicion datos={datosComposicion} /> : <Vacio>No hay saldos para construir la composición actual.</Vacio>}
                </>
            )}

                </ColumnaGrafica>
                <ColumnaTabla>
            <SeccionTabla>
                <Titulo>Aumento diario</Titulo>
                {datosTabla.length === 0 ? (
                    <Vacio style={{ height: 140 }}>Aún no hay historial para mostrar la tabla.</Vacio>
                ) : (
                    <TablaWrapper>
                        <Tabla>
                            <thead>
                                <tr>
                                    <Th>Día</Th>
                                    <Th>Valor actual</Th>
                                    <Th>Diferencia</Th>
                                    <Th>Nota</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosTabla.map((fila) => (
                                    <FilaNota
                                        key={fila.fechaKey}
                                        fila={fila}
                                        onActualizarNota={onActualizarNota}
                                    />
                                ))}
                            </tbody>
                        </Tabla>
                    </TablaWrapper>
                )}
            </SeccionTabla>
                </ColumnaTabla>
            </ContenidoAhorros>
        </Container>
    );
};
