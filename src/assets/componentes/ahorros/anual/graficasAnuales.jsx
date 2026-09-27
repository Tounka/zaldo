import { useMemo } from "react";
import styled from "styled-components";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    CATEGORIAS_ORIGEN,
    kpisGlobales,
    rankingCategorias,
    serieAvanceAcumulado,
    serieCategoriasPorAnio,
    serieEstacionalidad,
    serieIncrementoAnual,
    serieIncrementoMensual,
    serieTrayectoria,
} from "../../../funciones/ahorrosAnualCalculos";
import { FiltroAnios, useAniosExcluidos } from "./filtroAnios";

/* ───────── Paleta (validada con el validador de dataviz) ───────── */

const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const GRIS = "#898781";
const NEGATIVO = "#d03b3b";
const CHROME = { grid: "#e1e0d9", eje: "#c3c2b7", texto: "#898781" };

const COLORES_ORIGEN = {
    rendimientos: SERIES[0],
    aumentoCapital: SERIES[1],
    cashback: SERIES[2],
    prestamos: SERIES[3],
    otros: GRIS,
};

/*
 * El color sigue al año, no a su posición en la gráfica: se asigna sobre
 * TODOS los años (el más reciente primero), así ignorar un año no repinta
 * a los demás. Más allá de 8 años los más viejos quedan en gris.
 */
export const coloresPorAnio = (anios) =>
    Object.fromEntries(
        [...anios].sort((a, b) => b - a).map((anio, i) => [anio, SERIES[i] ?? GRIS])
    );

/* ───────── Formato ───────── */

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const formatCorto = (v) => {
    const n = Number(v || 0);
    const a = Math.abs(n);
    const s = n < 0 ? "-" : "";
    if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}k`;
    return `${s}$${a.toFixed(0)}`;
};

const formatPct = (v) => (v === null || v === undefined ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);

/* ───────── Estructura ───────── */

const Tarjeta = styled.section`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  grid-column: ${({ $ancho }) => ($ancho ? "1 / -1" : "auto")};

  @media (max-width: 600px) {
    padding: 16px 12px;
  }
`;

const Cabecera = styled.header`
  display: flex;
  flex-direction: column;
  gap: 4px;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: #6b6484;
  }
`;

const Vacio = styled.div`
  display: grid;
  place-items: center;
  min-height: 160px;
  font-size: 13px;
  color: #8a8a9a;
  text-align: center;
`;

/**
 * Tarjeta con su propio filtro de años. El contenido es una función que recibe
 * los resúmenes incluidos y el set de excluidos.
 */
const TarjetaGrafica = ({ id, titulo, descripcion, resumenes, colores, ancho, minimo = 1, children }) => {
    const [excluidos, alternar] = useAniosExcluidos(id);
    const incluidos = useMemo(
        () => resumenes.filter((r) => !excluidos.has(r.anio)),
        [resumenes, excluidos]
    );

    return (
        <Tarjeta $ancho={ancho} aria-labelledby={`titulo-${id}`}>
            <Cabecera>
                <h3 id={`titulo-${id}`}>{titulo}</h3>
                {descripcion && <p>{descripcion}</p>}
            </Cabecera>
            <FiltroAnios
                anios={resumenes.map((r) => r.anio)}
                excluidos={excluidos}
                onAlternar={alternar}
                colores={colores}
            />
            {incluidos.length < minimo
                ? <Vacio>Incluye al menos {minimo === 1 ? "un año" : `${minimo} años`} para ver esta gráfica.</Vacio>
                : children(incluidos, excluidos)}
        </Tarjeta>
    );
};

/* ───────── Piezas comunes de Recharts ───────── */

const CajaTooltip = styled.div`
  background: white;
  border: 1px solid rgba(11, 11, 11, 0.1);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(26, 26, 46, 0.12);
  font-size: 12px;
  min-width: 160px;

  .titulo {
    font-weight: 800;
    color: #1a1a2e;
    margin-bottom: 6px;
  }

  .fila {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #52514e;
    padding: 2px 0;
  }

  .marca {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .valor {
    margin-left: auto;
    font-weight: 700;
    color: #1a1a2e;
    font-variant-numeric: tabular-nums;
  }

  .extra {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #e1e0d9;
    color: #6b6484;
  }
`;

const TooltipDinero = ({ active, payload, label, extra }) => {
    if (!active || !payload?.length) return null;
    const filas = payload.filter((p) => p.value !== null && p.value !== undefined);
    if (!filas.length) return null;
    return (
        <CajaTooltip>
            <div className="titulo">{label}</div>
            {filas.map((p) => (
                <div className="fila" key={p.dataKey}>
                    <span className="marca" style={{ background: p.color || p.payload?.fill }} />
                    <span>{p.name}</span>
                    <span className="valor">{formatMoney(p.value)}</span>
                </div>
            ))}
            {extra && <div className="extra">{extra(payload[0].payload)}</div>}
        </CajaTooltip>
    );
};

const ejeX = (dataKey, extra = {}) => (
    <XAxis
        dataKey={dataKey}
        tick={{ fontSize: 11, fill: CHROME.texto }}
        axisLine={{ stroke: CHROME.eje }}
        tickLine={false}
        {...extra}
    />
);

const ejeY = (extra = {}) => (
    <YAxis
        tickFormatter={formatCorto}
        tick={{ fontSize: 11, fill: CHROME.texto }}
        axisLine={false}
        tickLine={false}
        width={56}
        {...extra}
    />
);

const rejilla = <CartesianGrid stroke={CHROME.grid} vertical={false} />;
const cursorBarra = { fill: "rgba(83, 59, 143, 0.06)" };
const cursorLinea = { stroke: CHROME.eje, strokeWidth: 1 };
const leyenda = <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />;

/* ───────── KPIs ───────── */

const GridKpis = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (min-width: 820px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Kpi = styled.div`
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .etiqueta {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8a8a9a;
  }

  .valor {
    font-size: 22px;
    font-weight: 800;
    color: #1a1a2e;
  }

  .sub {
    font-size: 11.5px;
    color: #6b6484;
  }
`;

export const ResumenKpis = ({ resumenes }) => (
    <TarjetaGrafica
        id="kpis"
        titulo="Panorama general"
        descripcion="Cifras clave de los años incluidos. El * marca el año en curso."
        resumenes={resumenes}
        ancho
    >
        {(incluidos) => {
            const k = kpisGlobales(incluidos);
            return (
                <GridKpis>
                    <Kpi>
                        <span className="etiqueta">Capital actual</span>
                        <span className="valor">{formatMoney(k.capitalActual)}</span>
                        <span className="sub">
                            Cierre de {k.anioActual} · {formatPct(k.crecimiento)} desde {k.desde}
                        </span>
                    </Kpi>
                    <Kpi>
                        <span className="etiqueta">Ahorro acumulado</span>
                        <span className="valor">{formatMoney(k.ahorroTotal)}</span>
                        <span className="sub">Suma del incremento de {incluidos.length} año{incluidos.length === 1 ? "" : "s"}</span>
                    </Kpi>
                    <Kpi>
                        <span className="etiqueta">Promedio anual</span>
                        <span className="valor">{formatMoney(k.promedioAnual)}</span>
                        <span className="sub">
                            {k.aniosPromedio === incluidos.length ? "Todos los años incluidos" : `Solo ${k.aniosPromedio} año(s) cerrado(s)`}
                        </span>
                    </Kpi>
                    <Kpi>
                        <span className="etiqueta">Mejor año</span>
                        <span className="valor">{k.mejor.anio}</span>
                        <span className="sub">
                            {formatMoney(k.mejor.incremento)} · {formatPct(k.mejor.porcentaje)}
                        </span>
                    </Kpi>
                </GridKpis>
            );
        }}
    </TarjetaGrafica>
);

/* ───────── Incremento por año ───────── */

export const GraficaIncrementoAnual = ({ resumenes }) => (
    <TarjetaGrafica
        id="incremento-anual"
        titulo="Incremento por año"
        descripcion="Cuánto creció tu capital en cada año de ahorro (cierre − cantidad inicial). La etiqueta indica el % de aumento."
        resumenes={resumenes}
    >
        {(incluidos) => {
            const datos = serieIncrementoAnual(incluidos);
            return (
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datos} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                    {rejilla}
                    {ejeX("anio")}
                    {ejeY()}
                    <ReferenceLine y={0} stroke={CHROME.eje} />
                    <Tooltip
                        cursor={cursorBarra}
                        content={<TooltipDinero extra={(d) => `${formatPct(d.porcentaje)} sobre la cantidad inicial${d.enCurso ? " · año en curso" : ""}`} />}
                    />
                    <Bar dataKey="incremento" name="Incremento" radius={[4, 4, 0, 0]} maxBarSize={56}>
                        {datos.map((d) => (
                            <Cell key={d.anio} fill={d.incremento >= 0 ? SERIES[0] : NEGATIVO} />
                        ))}
                        <LabelList
                            dataKey="porcentaje"
                            position="top"
                            formatter={formatPct}
                            style={{ fontSize: 11, fontWeight: 700, fill: "#52514e" }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            );
        }}
    </TarjetaGrafica>
);

/* ───────── Trayectoria histórica ───────── */

export const GraficaTrayectoria = ({ resumenes }) => (
    <TarjetaGrafica
        id="trayectoria"
        titulo="Trayectoria del capital"
        descripcion="Capital total al cierre de cada mes, de corrido entre años. Un año ignorado deja un hueco en la línea."
        resumenes={resumenes}
        ancho
    >
        {(_, excluidos) => (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={serieTrayectoria(resumenes, excluidos)} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    {rejilla}
                    {ejeX("etiqueta", { interval: "preserveStartEnd", minTickGap: 24 })}
                    {ejeY({ domain: ["auto", "auto"] })}
                    <Tooltip cursor={cursorLinea} content={<TooltipDinero />} />
                    <Line
                        type="monotone"
                        dataKey="capital"
                        name="Capital total"
                        stroke={SERIES[6]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                        connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        )}
    </TarjetaGrafica>
);

/* ───────── Series por año (líneas y barras por mes) ───────── */

export const GraficaAvanceAcumulado = ({ resumenes, colores }) => (
    <TarjetaGrafica
        id="avance-acumulado"
        titulo="Avance acumulado del año"
        descripcion="Lo ahorrado desde el inicio de cada año, mes a mes. Sirve para ver si vas por delante o por detrás de años anteriores en la misma fecha."
        resumenes={resumenes}
        colores={colores}
    >
        {(incluidos) => (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={serieAvanceAcumulado(incluidos)} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    {rejilla}
                    {ejeX("mes")}
                    {ejeY()}
                    <ReferenceLine y={0} stroke={CHROME.eje} />
                    <Tooltip cursor={cursorLinea} content={<TooltipDinero />} />
                    {leyenda}
                    {incluidos.map((r) => (
                        <Line
                            key={r.anio}
                            type="monotone"
                            dataKey={`a${r.anio}`}
                            name={r.enCurso ? `${r.anio} (en curso)` : String(r.anio)}
                            stroke={colores[r.anio]}
                            strokeWidth={2}
                            dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: colores[r.anio] }}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        )}
    </TarjetaGrafica>
);

export const GraficaIncrementoMensual = ({ resumenes, colores }) => (
    <TarjetaGrafica
        id="incremento-mensual"
        titulo="Incremento mensual"
        descripcion="Cuánto sumó (o restó) cada mes contra el cierre del mes anterior, comparando años lado a lado."
        resumenes={resumenes}
        colores={colores}
        ancho
    >
        {(incluidos) => (
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={serieIncrementoMensual(incluidos)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
                    {rejilla}
                    {ejeX("mes")}
                    {ejeY()}
                    <ReferenceLine y={0} stroke={CHROME.eje} />
                    <Tooltip cursor={cursorBarra} content={<TooltipDinero />} />
                    {leyenda}
                    {incluidos.map((r) => (
                        <Bar
                            key={r.anio}
                            dataKey={`a${r.anio}`}
                            name={r.enCurso ? `${r.anio} (en curso)` : String(r.anio)}
                            fill={colores[r.anio]}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={22}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        )}
    </TarjetaGrafica>
);

export const GraficaEstacionalidad = ({ resumenes }) => (
    <TarjetaGrafica
        id="estacionalidad"
        titulo="¿Qué meses ahorras más?"
        descripcion="Incremento promedio de cada mes entre los años incluidos. El mes más fuerte va resaltado."
        resumenes={resumenes}
        ancho
    >
        {(incluidos) => {
            const datos = serieEstacionalidad(incluidos);
            const mejor = Math.max(...datos.map((d) => d.promedio ?? -Infinity));
            return (
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datos} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                        {rejilla}
                        {ejeX("mes")}
                        {ejeY()}
                        <ReferenceLine y={0} stroke={CHROME.eje} />
                        <Tooltip
                            cursor={cursorBarra}
                            content={<TooltipDinero extra={(d) => `Promedio de ${d.muestras} año${d.muestras === 1 ? "" : "s"}`} />}
                        />
                        <Bar dataKey="promedio" name="Promedio" radius={[4, 4, 0, 0]} maxBarSize={32}>
                            {datos.map((d) => (
                                <Cell
                                    key={d.mes}
                                    fill={d.promedio !== null && d.promedio < 0 ? NEGATIVO : SERIES[0]}
                                    fillOpacity={d.promedio === mejor ? 1 : 0.55}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }}
    </TarjetaGrafica>
);

/* ───────── Categorías ───────── */

export const GraficaCategoriasPorAnio = ({ resumenes }) => (
    <TarjetaGrafica
        id="categorias-anio"
        titulo="Origen de los incrementos por año"
        descripcion="Suma de los incrementos positivos desglosados, por categoría. Los registros importados sin desglose no aparecen aquí."
        resumenes={resumenes}
    >
        {(incluidos) => (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serieCategoriasPorAnio(incluidos)} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    {rejilla}
                    {ejeX("anio")}
                    {ejeY()}
                    <Tooltip
                        cursor={cursorBarra}
                        content={<TooltipDinero extra={(d) => `Total desglosado: ${formatMoney(d.total)}`} />}
                    />
                    {leyenda}
                    {CATEGORIAS_ORIGEN.map((c) => (
                        <Bar
                            key={c.key}
                            dataKey={c.key}
                            name={c.label}
                            stackId="origen"
                            fill={COLORES_ORIGEN[c.key]}
                            stroke="#fff"
                            strokeWidth={2}
                            maxBarSize={56}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        )}
    </TarjetaGrafica>
);

export const GraficaRankingCategorias = ({ resumenes }) => (
    <TarjetaGrafica
        id="ranking-categorias"
        titulo="Categorías que más generan"
        descripcion="Total acumulado por categoría en los años incluidos y su peso sobre lo desglosado."
        resumenes={resumenes}
    >
        {(incluidos) => {
            const ranking = rankingCategorias(incluidos);
            if (!ranking.length) return <Vacio>No hay incrementos desglosados en los años incluidos.</Vacio>;
            return (
                <ResponsiveContainer width="100%" height={Math.max(180, ranking.length * 52)}>
                    <BarChart data={ranking} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={CHROME.grid} horizontal={false} />
                        <XAxis type="number" tickFormatter={formatCorto} tick={{ fontSize: 11, fill: CHROME.texto }} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={150}
                            tick={{ fontSize: 12, fill: "#52514e" }}
                            axisLine={{ stroke: CHROME.eje }}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={cursorBarra}
                            content={<TooltipDinero extra={(d) => `${d.porcentaje.toFixed(1)}% de lo desglosado`} />}
                        />
                        <Bar dataKey="monto" name="Total" radius={[0, 4, 4, 0]} maxBarSize={26}>
                            {ranking.map((c) => (
                                <Cell key={c.key} fill={COLORES_ORIGEN[c.key]} />
                            ))}
                            <LabelList
                                dataKey="porcentaje"
                                position="right"
                                formatter={(v) => `${Number(v).toFixed(0)}%`}
                                style={{ fontSize: 11, fontWeight: 700, fill: "#52514e" }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }}
    </TarjetaGrafica>
);

/* ───────── Tabla (vista accesible de los datos) ───────── */

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;

  th {
    text-align: right;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8a8a9a;
    padding: 8px 10px;
    border-bottom: 1px solid #e1e0d9;
    white-space: nowrap;
  }

  td {
    text-align: right;
    padding: 10px;
    border-bottom: 1px solid #f0efec;
    color: #1a1a2e;
    white-space: nowrap;
  }

  th:first-child,
  td:first-child {
    text-align: left;
    font-weight: 800;
  }

  .neg { color: ${NEGATIVO}; }
  .pos { color: #006300; }
`;

const ScrollTabla = styled.div`
  overflow-x: auto;
`;

export const TablaResumenAnual = ({ resumenes }) => (
    <TarjetaGrafica
        id="tabla"
        titulo="Detalle por año"
        descripcion="Los números detrás de las gráficas."
        resumenes={resumenes}
        ancho
    >
        {(incluidos) => (
            <ScrollTabla>
                <Tabla>
                    <thead>
                        <tr>
                            <th>Año</th>
                            <th>Inicial</th>
                            <th>Cierre</th>
                            <th>Incremento</th>
                            <th>%</th>
                            <th>Meta</th>
                            <th>Cumplimiento</th>
                            <th>Desglosado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...incluidos].reverse().map((r) => (
                            <tr key={r.anio}>
                                <td>{r.anio}{r.enCurso ? " (en curso)" : ""}</td>
                                <td>{formatMoney(r.capitalInicial)}</td>
                                <td>{formatMoney(r.capitalFinal)}</td>
                                <td className={r.incremento < 0 ? "neg" : "pos"}>{formatMoney(r.incremento)}</td>
                                <td>{formatPct(r.porcentaje)}</td>
                                <td>{r.meta > 0 ? formatMoney(r.meta) : "—"}</td>
                                <td>{r.meta > 0 ? `${((r.capitalFinal / r.meta) * 100).toFixed(0)}%` : "—"}</td>
                                <td>{formatMoney(r.totalDesglosado)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Tabla>
            </ScrollTabla>
        )}
    </TarjetaGrafica>
);
