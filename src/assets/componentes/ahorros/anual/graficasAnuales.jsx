import styled from "styled-components";
import {
    Area,
    AreaChart,
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
    MESES_ANIO_AHORRO,
    comparacionMismaFecha,
    extremosEstacionales,
    kpisGlobales,
    serieAvanceAcumulado,
    serieCategoriasPorAnio,
    serieEstacionalidad,
    serieIncrementoAnual,
    serieTrayectoria,
} from "../../../funciones/ahorrosAnualCalculos";
import { TarjetaResumen } from "../../cards/CardResumenCuentaHome";
import { GridTarjetasAhorro } from "../kpisAnuales";

/* ───────── Paleta (validada con el validador de dataviz) ───────── */

const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const GRIS = "#898781";
const NEGATIVO = "#d03b3b";
const CHROME = { grid: "#ecebe5", eje: "#c3c2b7", texto: "#898781" };
const TINTA = { primaria: "#1a1a2e", secundaria: "#52514e", tenue: "#6b6484" };

/* Divergente para el mapa de calor: azul ganó, rojo perdió, gris = sin cambio. */
const DIVERGENTE = { positivo: [42, 120, 214], negativo: [227, 73, 72], centro: [240, 239, 236] };

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
    if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
    return `${s}$${a.toFixed(0)}`;
};

const formatPct = (v) => (v === null || v === undefined ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);

const conSigno = (n) => `${n >= 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`;

/* ───────── Estructura ───────── */

const Tarjeta = styled.section`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 14px;
  padding: 20px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  box-shadow: 0 4px 14px rgba(83, 59, 143, 0.04);
  grid-column: ${({ $ancho }) => ($ancho ? "1 / -1" : "auto")};

  @media (max-width: 600px) {
    padding: 16px 12px 12px;
  }
`;

const Cabecera = styled.header`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .eyebrow {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--colorMorado);
  }

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.3;
    color: ${TINTA.primaria};
    text-wrap: balance;
  }

  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: ${TINTA.tenue};
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

/*
 * Cada tarjeta lleva su conclusión como titular (la "lectura") y el nombre de
 * la gráfica como antetítulo: primero se cuenta qué pasó y luego cómo se mide.
 */
const TarjetaGrafica = ({ id, titulo, lectura, descripcion, ancho, children }) => (
    <Tarjeta $ancho={ancho} aria-labelledby={`titulo-${id}`}>
        <Cabecera>
            <span className="eyebrow">{titulo}</span>
            <h3 id={`titulo-${id}`}>{lectura || titulo}</h3>
            {descripcion && <p>{descripcion}</p>}
        </Cabecera>
        {children}
    </Tarjeta>
);

/* ───────── Piezas comunes de Recharts ───────── */

const CajaTooltip = styled.div`
  background: white;
  border: 1px solid rgba(11, 11, 11, 0.1);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(26, 26, 46, 0.12);
  font-size: 12px;
  min-width: 170px;

  .titulo {
    font-weight: 800;
    color: ${TINTA.primaria};
    margin-bottom: 6px;
  }

  .fila {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${TINTA.secundaria};
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
    color: ${TINTA.primaria};
    font-variant-numeric: tabular-nums;
  }

  .extra {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #e1e0d9;
    color: ${TINTA.tenue};
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
const etiquetaReferencia = (valor, extra = {}) => ({
    value: valor, position: "insideTopRight", fontSize: 11, fontWeight: 700, fill: TINTA.secundaria, ...extra,
});

/* ───────── Tarjetas resumen (las mismas de /ahorros) ───────── */

export const ResumenKpis = ({ resumenes }) => {
    const k = kpisGlobales(resumenes);
    const ultimo = resumenes.at(-1);
    const verde = "#1f8a52";
    const rojo = "#c2303c";
    return (
        <GridTarjetasAhorro style={{ gridColumn: "1 / -1" }}>
            <TarjetaResumen
                titulo="Capital actual"
                valor={formatMoney(k.capitalActual)}
                detalle={<><span>Desde {k.desde}</span><strong style={{ color: (k.crecimiento ?? 0) >= 0 ? verde : rojo }}>{formatPct(k.crecimiento)}</strong></>}
            />
            <TarjetaResumen
                titulo="Ahorro acumulado"
                valor={formatMoney(k.ahorroTotal)}
                detalle={<span>{resumenes.length} año{resumenes.length === 1 ? "" : "s"}</span>}
            />
            <TarjetaResumen
                titulo="Promedio anual"
                valor={formatMoney(k.promedioAnual)}
                title="Solo cuenta años cerrados cuando los hay; el año en curso lo bajaría."
                detalle={<span>{k.aniosPromedio === resumenes.length ? "Todos los años" : `${k.aniosPromedio} año(s) cerrado(s)`}</span>}
            />
            <TarjetaResumen
                titulo="Mejor año"
                valor={k.mejor.anio}
                detalle={<><span>{formatCorto(k.mejor.incremento)}</span><strong style={{ color: verde }}>{formatPct(k.mejor.porcentaje)}</strong></>}
            />
            <TarjetaResumen
                titulo="Rendimientos"
                valor={formatMoney(k.rendimientoTotal)}
                title="Lo que generaron tus cuentas (rendimientos e intereses), sin contar aportes ni cashback."
                detalle={ultimo?.tasaAnual === null || ultimo?.tasaAnual === undefined
                    ? <span>Acumulado</span>
                    : <><span>{ultimo.anio}</span><strong>{formatPct(ultimo.tasaAnual)} anual</strong></>}
            />
        </GridTarjetasAhorro>
    );
};

/* ───────── ¿Voy mejor que el año pasado? ───────── */

export const GraficaAvanceAcumulado = ({ resumenes, colores }) => {
    const actual = resumenes.at(-1);
    const datos = serieAvanceAcumulado(resumenes);
    const comparacion = comparacionMismaFecha(resumenes);

    // Proyección del año en curso: recta desde su último mes hasta julio.
    const indiceUltimo = actual?.enCurso ? actual.meses.findLastIndex((m) => m.acumulado !== null) : -1;
    const proyecta = actual?.proyeccion !== null && actual?.proyeccion !== undefined && indiceUltimo >= 0 && indiceUltimo < 11;
    if (proyecta) {
        datos[indiceUltimo].proyeccion = actual.meses[indiceUltimo].acumulado;
        datos[11].proyeccion = actual.proyeccion - actual.capitalInicial;
    }

    let lectura = actual ? `En ${actual.anio} llevas ${conSigno(actual.incremento)}` : "";
    if (comparacion) {
        const delante = comparacion.diferencia >= 0;
        lectura = `A ${comparacion.mes} vas ${formatMoney(Math.abs(comparacion.diferencia))} ${delante ? "por delante" : "por detrás"} de ${comparacion.anterior}`;
    }

    const notas = [];
    if (proyecta) notas.push(`Al ritmo actual cerrarías julio con ${conSigno(actual.proyeccion - actual.capitalInicial)}`);
    if (actual?.metaIncremento) {
        const falta = actual.metaIncremento - actual.incremento;
        notas.push(falta > 0 ? `te faltan ${formatMoney(falta)} para la meta` : "ya alcanzaste la meta");
    }

    return (
        <TarjetaGrafica
            id="avance-acumulado"
            titulo="Avance del año contra años anteriores"
            lectura={lectura}
            descripcion={`${notas.length ? `${notas.join("; ")}. ` : ""}Lo ahorrado desde el inicio de cada año, mes a mes.`}
            ancho
        >
            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={datos} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    {rejilla}
                    {ejeX("mes")}
                    {ejeY()}
                    <ReferenceLine y={0} stroke={CHROME.eje} />
                    {actual?.metaIncremento > 0 && (
                        <ReferenceLine
                            y={actual.metaIncremento}
                            stroke={TINTA.secundaria}
                            strokeDasharray="4 4"
                            ifOverflow="extendDomain"
                            label={etiquetaReferencia(`Meta ${actual.anio}`)}
                        />
                    )}
                    <Tooltip cursor={cursorLinea} content={<TooltipDinero />} />
                    {leyenda}
                    {resumenes.map((r) => {
                        const esActual = r === actual;
                        return (
                            <Line
                                key={r.anio}
                                type="monotone"
                                dataKey={`a${r.anio}`}
                                name={r.enCurso ? `${r.anio} (en curso)` : String(r.anio)}
                                stroke={colores[r.anio]}
                                strokeWidth={esActual ? 3 : 2}
                                strokeOpacity={esActual ? 1 : 0.55}
                                dot={esActual ? { r: 4, strokeWidth: 2, stroke: "#fff", fill: colores[r.anio] } : false}
                                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                                connectNulls
                            />
                        );
                    })}
                    {proyecta && (
                        <Line
                            type="linear"
                            dataKey="proyeccion"
                            name="Proyección"
                            stroke={colores[actual.anio]}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={false}
                            connectNulls
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </TarjetaGrafica>
    );
};

/* ───────── Trayectoria histórica ───────── */

export const GraficaTrayectoria = ({ todos, excluidos }) => {
    const datos = serieTrayectoria(todos, excluidos);
    const conValor = datos.filter((p) => p.capital !== null);
    const primero = conValor[0];
    const ultimo = conValor.at(-1);
    const cambio = primero && ultimo ? ultimo.capital - primero.capital : 0;
    const pct = primero?.capital > 0 ? (cambio / primero.capital) * 100 : null;
    // Una línea vertical en cada agosto: ahí empieza un año de ahorro.
    const inicios = datos.filter((p) => p.clave.endsWith("-0") && p !== datos[0]);

    return (
        <TarjetaGrafica
            id="trayectoria"
            titulo="Trayectoria del capital"
            lectura={primero && ultimo
                ? `Tu capital pasó de ${formatMoney(primero.capital)} a ${formatMoney(ultimo.capital)} (${formatPct(pct)})`
                : "Trayectoria del capital"}
            descripcion="Capital total al cierre de cada mes, de corrido. Las líneas verticales marcan el inicio de cada año de ahorro."
            ancho
        >
            {conValor.length < 2 ? <Vacio>Necesitas al menos dos meses con registros.</Vacio> : (
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={datos} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="relleno-trayectoria" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={SERIES[6]} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={SERIES[6]} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        {rejilla}
                        {ejeX("etiqueta", { interval: "preserveStartEnd", minTickGap: 24 })}
                        {ejeY({ domain: ["auto", "auto"] })}
                        {inicios.map((p) => (
                            <ReferenceLine
                                key={p.clave}
                                x={p.etiqueta}
                                stroke={CHROME.eje}
                                strokeDasharray="3 3"
                                label={etiquetaReferencia(String(p.anio), { position: "insideTopLeft", fill: CHROME.texto })}
                            />
                        ))}
                        <Tooltip cursor={cursorLinea} content={<TooltipDinero />} />
                        <Area
                            type="monotone"
                            dataKey="capital"
                            name="Capital total"
                            stroke={SERIES[6]}
                            strokeWidth={2}
                            fill="url(#relleno-trayectoria)"
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                            connectNulls={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </TarjetaGrafica>
    );
};

/* ───────── Incremento por año ───────── */

export const GraficaIncrementoAnual = ({ resumenes }) => {
    const datos = serieIncrementoAnual(resumenes).map((d, i) => ({
        ...d,
        proyeccion: resumenes[i].proyeccion !== null ? resumenes[i].proyeccion - resumenes[i].capitalInicial : null,
    }));
    const k = kpisGlobales(resumenes);
    return (
        <TarjetaGrafica
            id="incremento-anual"
            titulo="Incremento por año"
            lectura={resumenes.length > 1
                ? `Tu mejor año fue ${k.mejor.anio}, con ${conSigno(k.mejor.incremento)}`
                : `En ${k.mejor.anio} llevas ${conSigno(k.mejor.incremento)}`}
            descripcion="Cierre menos cantidad inicial. La etiqueta es el % de aumento; el año en curso va más claro porque sigue abierto."
        >
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datos} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                    {rejilla}
                    {ejeX("anio")}
                    {ejeY()}
                    <ReferenceLine y={0} stroke={CHROME.eje} />
                    <Tooltip
                        cursor={cursorBarra}
                        content={<TooltipDinero extra={(d) => [
                            `${formatPct(d.porcentaje)} sobre la cantidad inicial`,
                            d.proyeccion !== null ? `Proyección al cierre: ${conSigno(d.proyeccion)}` : null,
                        ].filter(Boolean).join(" · ")} />}
                    />
                    <Bar dataKey="incremento" name="Incremento" radius={[4, 4, 0, 0]} maxBarSize={56}>
                        {datos.map((d) => (
                            <Cell
                                key={d.anio}
                                fill={d.incremento >= 0 ? SERIES[0] : NEGATIVO}
                                // El año en curso va más claro: su barra sigue creciendo.
                                fillOpacity={d.enCurso ? 0.5 : 1}
                            />
                        ))}
                        <LabelList
                            dataKey="porcentaje"
                            position="top"
                            formatter={formatPct}
                            style={{ fontSize: 11, fontWeight: 700, fill: TINTA.secundaria }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </TarjetaGrafica>
    );
};

/* ───────── Rendimiento: el dinero trabajando ───────── */

export const GraficaRendimientoAnual = ({ resumenes }) => {
    const datos = resumenes.map((r) => ({
        anio: r.enCurso ? `${r.anio}*` : String(r.anio),
        rendimiento: r.rendimiento || 0,
        tasa: r.tasaAnual,
        etiqueta: r.tasaAnual === null || r.tasaAnual === undefined ? "" : `${r.tasaAnual.toFixed(1)}%`,
    }));
    const conTasa = resumenes.filter((r) => r.tasaAnual !== null && r.tasaAnual !== undefined);
    const ultima = conTasa.at(-1);
    const previa = conTasa.at(-2);
    let lectura = "Aún no hay rendimientos marcados";
    if (ultima && previa) {
        const mejora = ultima.tasaAnual >= previa.tasaAnual;
        lectura = `Tus cuentas pagan ${ultima.tasaAnual.toFixed(1)}% anual en ${ultima.anio}, ${mejora ? "arriba" : "abajo"} del ${previa.tasaAnual.toFixed(1)}% de ${previa.anio}`;
    } else if (ultima) {
        lectura = `Tus cuentas pagan ${ultima.tasaAnual.toFixed(1)}% anual en ${ultima.anio}`;
    }

    return (
        <TarjetaGrafica
            id="rendimiento-anual"
            titulo="Rendimiento de tus cuentas"
            lectura={lectura}
            descripcion="Lo que generaron tus cuentas por sí solas (rendimientos e intereses). La etiqueta es la tasa anual aproximada: los aportes y retiros no la mueven."
        >
            {!datos.some((d) => d.rendimiento) ? <Vacio>No hay partes marcadas como rendimiento en estos años.</Vacio> : (
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datos} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                        {rejilla}
                        {ejeX("anio")}
                        {ejeY()}
                        <ReferenceLine y={0} stroke={CHROME.eje} />
                        <Tooltip
                            cursor={cursorBarra}
                            content={<TooltipDinero extra={(d) => (d.etiqueta ? `${d.etiqueta} anual aprox.` : "Sin tasa (pocos días)")} />}
                        />
                        <Bar dataKey="rendimiento" name="Rendimiento" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={56}>
                            <LabelList dataKey="etiqueta" position="top" style={{ fontSize: 11, fontWeight: 700, fill: TINTA.secundaria }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </TarjetaGrafica>
    );
};

/* ───────── De dónde viene el crecimiento ───────── */

export const GraficaCategoriasPorAnio = ({ resumenes }) => {
    const datos = serieCategoriasPorAnio(resumenes);
    const ultimo = resumenes.at(-1);
    const total = ultimo?.totalDesglosado || 0;
    // Lo que generó el dinero por sí solo, frente a lo que tú aportaste.
    const generado = ultimo ? ultimo.categorias.rendimientos + ultimo.categorias.cashback : 0;
    const lectura = total > 0
        ? `En ${ultimo.anio}, ${Math.round((generado / total) * 100)}% de lo que entró vino de rendimientos y cashback`
        : "Aún no hay incrementos desglosados";
    return (
        <TarjetaGrafica
            id="categorias-anio"
            titulo="De dónde viene el crecimiento"
            lectura={lectura}
            descripcion="Incrementos positivos por origen. Aumento a capital es dinero que tú metiste; lo demás lo generaron tus cuentas, cashback o préstamos cobrados."
            ancho
        >
            {!datos.some((d) => d.total > 0) ? <Vacio>No hay incrementos desglosados en estos años.</Vacio> : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datos} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
                                maxBarSize={64}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            )}
        </TarjetaGrafica>
    );
};

/* ───────── Mapa de calor: cada mes de cada año ───────── */

const MapaScroll = styled.div`
  overflow-x: auto;
`;

const Mapa = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 3px;
  font-variant-numeric: tabular-nums;

  th {
    font-size: 11px;
    font-weight: 700;
    color: ${CHROME.texto};
    padding: 2px 4px;
  }

  th[scope="row"] {
    text-align: left;
    color: ${TINTA.secundaria};
    font-weight: 800;
    white-space: nowrap;
    padding-right: 8px;
  }

  td {
    height: 40px;
    border-radius: 6px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    cursor: default;
    transition: box-shadow 0.12s ease;

    &:hover {
      box-shadow: inset 0 0 0 2px ${TINTA.primaria};
    }
  }

  tr.promedio th[scope="row"],
  tr.promedio td {
    border-top: 1px solid ${CHROME.grid};
  }

  tr.promedio td {
    font-style: italic;
  }
`;

const LeyendaMapa = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 11px;
  color: ${TINTA.tenue};

  .barra {
    width: 140px;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(90deg, rgb(${DIVERGENTE.negativo}), rgb(${DIVERGENTE.centro}), rgb(${DIVERGENTE.positivo}));
  }
`;

const mezclar = (desde, hacia, t) => desde.map((c, i) => Math.round(c + (hacia[i] - c) * t));

const colorCelda = (valor, maximo) => {
    if (valor === null || valor === undefined) return { background: "#fafaf8", color: "#c3c2b7" };
    const t = maximo > 0 ? Math.min(1, Math.abs(valor) / maximo) : 0;
    const polo = valor >= 0 ? DIVERGENTE.positivo : DIVERGENTE.negativo;
    const [r, g, b] = mezclar(DIVERGENTE.centro, polo, t);
    return { background: `rgb(${r}, ${g}, ${b})`, color: t > 0.55 ? "#fff" : TINTA.primaria };
};

export const MapaCalorMensual = ({ resumenes }) => {
    const promedios = serieEstacionalidad(resumenes);
    const valores = resumenes.flatMap((r) => r.meses.map((m) => m.incremento)).filter((v) => v !== null);
    // La escala se corta en el percentil 90 para que un mes atípico no deje
    // a todos los demás casi en gris.
    const ordenados = valores.map(Math.abs).sort((a, b) => a - b);
    const maximo = ordenados[Math.floor(ordenados.length * 0.9)] || ordenados.at(-1) || 0;
    const extremos = extremosEstacionales(resumenes);
    const lectura = extremos
        ? `${extremos.mejor.mes} suele ser tu mejor mes y ${extremos.peor.mes} el más flojo`
        : "Cada mes de cada año";

    const fila = (clave, etiqueta, celdas, clase) => (
        <tr key={clave} className={clase}>
            <th scope="row">{etiqueta}</th>
            {celdas.map((valor, i) => (
                <td
                    key={MESES_ANIO_AHORRO[i]}
                    style={colorCelda(valor, maximo)}
                    title={valor === null ? `${etiqueta} · ${MESES_ANIO_AHORRO[i]}: sin datos` : `${etiqueta} · ${MESES_ANIO_AHORRO[i]}: ${conSigno(valor)}`}
                >
                    {valor === null ? "·" : formatCorto(valor)}
                </td>
            ))}
        </tr>
    );

    return (
        <TarjetaGrafica
            id="mapa-mensual"
            titulo="Incremento mes a mes"
            lectura={lectura}
            descripcion="Cuánto sumó o restó cada mes contra el cierre del anterior. Azul es ganancia, rojo es pérdida; entre más intenso, mayor el monto."
            ancho
        >
            <MapaScroll>
                <Mapa>
                    <thead>
                        <tr>
                            <th aria-label="Año" />
                            {MESES_ANIO_AHORRO.map((m) => <th key={m} scope="col">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {[...resumenes].reverse().map((r) =>
                            fila(r.anio, r.enCurso ? `${r.anio}*` : String(r.anio), r.meses.map((m) => m.incremento)))}
                        {resumenes.length > 1 && fila("promedio", "Promedio", promedios.map((p) => p.promedio), "promedio")}
                    </tbody>
                </Mapa>
            </MapaScroll>
            <LeyendaMapa aria-hidden="true">
                <span>Pérdida</span><span className="barra" /><span>Ganancia</span>
            </LeyendaMapa>
        </TarjetaGrafica>
    );
};

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
    color: ${TINTA.primaria};
    white-space: nowrap;
  }

  th:first-child,
  td:first-child {
    text-align: left;
    font-weight: 800;
  }

  tbody tr:hover td { background: #fbfaff; }

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
        lectura="Los números detrás de las gráficas"
        ancho
    >
        <ScrollTabla>
            <Tabla>
                <thead>
                    <tr>
                        <th>Año</th>
                        <th>Inicial</th>
                        <th>Cierre</th>
                        <th>Incremento</th>
                        <th>%</th>
                        <th>Rendimiento</th>
                        <th>Tasa anual</th>
                        <th>Meta</th>
                        <th>Cumplimiento</th>
                    </tr>
                </thead>
                <tbody>
                    {[...resumenes].reverse().map((r) => (
                        <tr key={r.anio}>
                            <td>{r.anio}{r.enCurso ? " (en curso)" : ""}</td>
                            <td>{formatMoney(r.capitalInicial)}</td>
                            <td>{formatMoney(r.capitalFinal)}</td>
                            <td className={r.incremento < 0 ? "neg" : "pos"}>{formatMoney(r.incremento)}</td>
                            <td>{formatPct(r.porcentaje)}</td>
                            <td>{formatMoney(r.rendimiento)}</td>
                            <td>{r.tasaAnual === null || r.tasaAnual === undefined ? "—" : `${r.tasaAnual.toFixed(1)}%`}</td>
                            <td>{r.meta > 0 ? formatMoney(r.meta) : "—"}</td>
                            <td>{r.meta > 0 ? `${((r.capitalFinal / r.meta) * 100).toFixed(0)}%` : "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </Tabla>
        </ScrollTabla>
    </TarjetaGrafica>
);
