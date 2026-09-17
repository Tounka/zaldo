import { useState, useMemo } from "react";
import styled from "styled-components";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from "recharts";
import {
    FaChartLine,
    FaCalendarAlt,
    FaShoppingCart,
    FaHistory,
    FaArrowDown,
    FaChartPie,
    FaChartBar,
    FaWarehouse,
    FaBoxes,
    FaStore,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
} from "react-icons/fa";
import { obtenerMesKey } from "../../../funciones/firebase/despensa";
import {
    AREAS_DESPENSA,
    colorArea,
    resolverAreaYCategoria,
    colorCategoriaInterna,
} from "../areasYCategorias";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
`;

const TarjetasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
`;

const TarjetaMetrica = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

  small {
    font-size: 11px;
    font-weight: 700;
    color: #8a8a9a;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  strong {
    font-size: 20px;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: ${({ $color }) => ($color || "#1a1a2e")};
  }

  span.subinfo {
    font-size: 11px;
    color: #718096;
    margin-top: 2px;
  }
`;

const GridGraficas = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Seccion = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 1px 4px rgba(83, 59, 143, 0.04);
  min-width: 0;
`;

const TituloSeccion = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--colorMorado, #6c5ce7);
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    font-size: 14px;
  }
`;

const ContenedorGrafica = styled.div`
  width: 100%;
  height: 260px;
  min-width: 0;
  position: relative;
`;

const CustomTooltipBox = styled.div`
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 4px 14px rgba(83, 59, 143, 0.1);
  font-size: 12px;

  .tooltip-titulo {
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 4px;
  }

  .tooltip-valor {
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: ${({ $color }) => ($color || "var(--colorMorado, #6c5ce7)")};
  }

  .tooltip-extra {
    font-size: 11px;
    color: #718096;
    margin-top: 2px;
  }
`;

const ListaMovimientos = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilaMov = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.08);
  border-radius: 8px;

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 13px;
      color: #1a1a2e;
      font-weight: 600;
    }

    small {
      font-size: 11px;
      color: #8a8a9a;
    }
  }

  span.gasto {
    font-size: 13px;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: ${({ $salida }) => ($salida ? "#c0392b" : "#2f7d54")};
  }
`;

const MensajeVacio = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #8c84a8;
  font-size: 13px;
  text-align: center;
`;

// Helper para formatear dinero
const formatearMoneda = (val) =>
    `$${Number(val || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} MXN`;

const formatoCorto = (val) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val}`;
};

export const TabMetricas = ({
    catalogo,
    historialCompras = [],
    historialMovimientos = [],
    cargandoMovimientos,
}) => {
    // Mes actual en formato YYYYMM
    const mesActualKey = useMemo(() => obtenerMesKey(new Date()), []);
    const gastoMesActual = Number(catalogo?.gastoPorMes?.[mesActualKey] || 0);

    // 1. Datos históricos de gasto mensual ordenados cronológicamente
    const datosGastoMensual = useMemo(() => {
        const mapa = catalogo?.gastoPorMes || {};
        return Object.entries(mapa)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([mes, monto]) => {
                const anio = mes.slice(0, 4);
                const mesNum = mes.slice(4);
                const fecha = new Date(Number(anio), Number(mesNum) - 1, 1);
                const nombreMes = fecha.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
                const nombreLargo = fecha.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
                return {
                    key: mes,
                    mes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
                    mesCompleto: nombreLargo.charAt(0).toUpperCase() + nombreLargo.slice(1),
                    monto: Number(monto || 0),
                };
            });
    }, [catalogo]);

    const totalHistorico = useMemo(() => {
        return datosGastoMensual.reduce((acc, m) => acc + m.monto, 0);
    }, [datosGastoMensual]);

    const promedioMensual = useMemo(() => {
        if (!datosGastoMensual.length) return 0;
        return totalHistorico / datosGastoMensual.length;
    }, [datosGastoMensual, totalHistorico]);

    // 2. Datos de distribución por Área (Pie / Donut)
    const datosDistribucionArea = useMemo(() => {
        if (!catalogo?.productos) return [];
        const mapa = {};
        AREAS_DESPENSA.forEach((area) => {
            mapa[area] = {
                nombre: area,
                cantidadProductos: 0,
                stockTotal: 0,
                valorEstimado: 0,
                color: colorArea(area),
            };
        });

        Object.values(catalogo.productos).forEach((prod) => {
            if (!prod.activo) return;
            const { area } = resolverAreaYCategoria(prod);
            if (!mapa[area]) {
                mapa[area] = {
                    nombre: area,
                    cantidadProductos: 0,
                    stockTotal: 0,
                    valorEstimado: 0,
                    color: colorArea(area),
                };
            }
            mapa[area].cantidadProductos += 1;
            const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa);
            presentaciones.forEach((pr) => {
                const stock = Number(pr.stockActual || 0);
                const precio = Number(pr.buenPrecio || pr.ultimoPrecioPagado || pr.precioAproximado || 0);
                mapa[area].stockTotal += Math.max(0, stock);
                mapa[area].valorEstimado += Math.max(0, stock) * precio;
            });
        });

        return Object.values(mapa)
            .filter((d) => d.cantidadProductos > 0)
            .map((d) => ({
                ...d,
                valorEstimado: Math.round(d.valorEstimado * 100) / 100,
            }));
    }, [catalogo]);

    // 3. Diagnóstico de Salud de Stock
    const datosSaludStock = useMemo(() => {
        if (!catalogo?.productos) return [];
        let optimo = 0;
        let bajo = 0;
        let agotado = 0;
        let necesario = 0;

        Object.values(catalogo.productos).forEach((prod) => {
            if (!prod.activo) return;
            const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa);
            const stockTotal = presentaciones.reduce((acc, pr) => acc + (Number(pr.stockActual) || 0), 0);
            const stockMin = Number(prod.stockMinimo || 1);

            if (prod.necesario) {
                necesario += 1;
            }

            if (stockTotal <= 0) {
                agotado += 1;
            } else if (stockTotal <= stockMin) {
                bajo += 1;
            } else {
                optimo += 1;
            }
        });

        return [
            { estado: "En Stock", cantidad: optimo, color: "#22a06b" },
            { estado: "Por Agotar", cantidad: bajo, color: "#e67e22" },
            { estado: "Agotados", cantidad: agotado, color: "#e74c3c" },
            { estado: "Necesarios", cantidad: necesario, color: "#6c5ce7" },
        ];
    }, [catalogo]);

    // 4. Top 5 Categorías con mayor inversión o stock
    const datosTopCategorias = useMemo(() => {
        if (!catalogo?.productos) return [];
        const mapa = {};
        Object.values(catalogo.productos).forEach((prod) => {
            if (!prod.activo) return;
            const { area, categoria } = resolverAreaYCategoria(prod);
            if (!mapa[categoria]) {
                mapa[categoria] = {
                    categoria,
                    area,
                    gastoTotal: 0,
                    productosCount: 0,
                    color: colorCategoriaInterna(categoria, area),
                };
            }
            mapa[categoria].productosCount += 1;
            const gastado = Number(prod.totalGastado || 0);
            mapa[categoria].gastoTotal += gastado;
        });

        return Object.values(mapa)
            .filter((c) => c.gastoTotal > 0 || c.productosCount > 0)
            .sort((a, b) => b.gastoTotal - a.gastoTotal)
            .slice(0, 5)
            .map((c) => ({
                ...c,
                gastoTotal: Math.round(c.gastoTotal * 100) / 100,
            }));
    }, [catalogo]);

    // 5. KPIs calculados
    const valorTotalInventario = useMemo(() => {
        return datosDistribucionArea.reduce((acc, d) => acc + (d.valorEstimado || 0), 0);
    }, [datosDistribucionArea]);

    const totalProductosActivos = useMemo(() => {
        if (!catalogo?.productos) return 0;
        return Object.values(catalogo.productos).filter((p) => p.activo).length;
    }, [catalogo]);

    const tasaAbasto = useMemo(() => {
        if (!totalProductosActivos) return 100;
        const enStock = (datosSaludStock.find((s) => s.estado === "En Stock")?.cantidad || 0) +
            (datosSaludStock.find((s) => s.estado === "Por Agotar")?.cantidad || 0);
        return Math.round((enStock / totalProductosActivos) * 100);
    }, [totalProductosActivos, datosSaludStock]);

    return (
        <Contenedor>
            {/* KPIs Principales */}
            <TarjetasGrid>
                <TarjetaMetrica $color="#2f7d54">
                    <small><FaCalendarAlt /> Gasto este mes</small>
                    <strong>${gastoMesActual.toFixed(2)}</strong>
                    <span className="subinfo">Mes en curso</span>
                </TarjetaMetrica>

                <TarjetaMetrica $color="var(--colorMorado, #6c5ce7)">
                    <small><FaShoppingCart /> Inversión Histórica</small>
                    <strong>${totalHistorico.toFixed(2)}</strong>
                    <span className="subinfo">
                        {datosGastoMensual.length} {datosGastoMensual.length === 1 ? "mes registrado" : "meses registrados"}
                    </span>
                </TarjetaMetrica>

                <TarjetaMetrica $color="#2980b9">
                    <small><FaWarehouse /> Valor de Despensa</small>
                    <strong>${valorTotalInventario.toFixed(2)}</strong>
                    <span className="subinfo">Inventario actual estimado</span>
                </TarjetaMetrica>

                <TarjetaMetrica $color={tasaAbasto >= 80 ? "#22a06b" : tasaAbasto >= 50 ? "#e67e22" : "#e74c3c"}>
                    <small><FaBoxes /> Nivel de Abasto</small>
                    <strong>{tasaAbasto}%</strong>
                    <span className="subinfo">
                        {totalProductosActivos} productos en catálogo
                    </span>
                </TarjetaMetrica>
            </TarjetasGrid>

            {/* Gráfica 1: Historial de Gasto Mensual (AreaChart) */}
            <Seccion>
                <TituloSeccion>
                    <FaChartLine /> Historial de Gasto Mensual
                </TituloSeccion>
                {datosGastoMensual.length === 0 ? (
                    <MensajeVacio>No hay registros de compras mensuales todavía.</MensajeVacio>
                ) : (
                    <ContenedorGrafica>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={datosGastoMensual}
                                margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf6" vertical={false} />
                                <XAxis
                                    dataKey="mes"
                                    tick={{ fontSize: 11, fill: "#777" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tickFormatter={formatoCorto}
                                    tick={{ fontSize: 11, fill: "#777" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={55}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const item = payload[0].payload;
                                            return (
                                                <CustomTooltipBox $color="#6c5ce7">
                                                    <div className="tooltip-titulo">{item.mesCompleto}</div>
                                                    <div className="tooltip-valor">{formatearMoneda(item.monto)}</div>
                                                    {promedioMensual > 0 && (
                                                        <div className="tooltip-extra">
                                                            Promedio mensual: {formatearMoneda(promedioMensual)}
                                                        </div>
                                                    )}
                                                </CustomTooltipBox>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                {promedioMensual > 0 && (
                                    <ReferenceLine
                                        y={promedioMensual}
                                        stroke="#e07a5f"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: `Promedio: ${formatoCorto(promedioMensual)}`,
                                            fill: "#e07a5f",
                                            fontSize: 10,
                                            position: "insideTopRight",
                                        }}
                                    />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="monto"
                                    name="Gasto Mensual"
                                    stroke="#6c5ce7"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorGasto)"
                                    dot={{ r: 4, fill: "#6c5ce7", stroke: "#ffffff", strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: "#6c5ce7" }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ContenedorGrafica>
                )}
            </Seccion>

            {/* Fila 2 de Gráficas: Distribución por Área (Donut) y Salud de Stock (Bar) */}
            <GridGraficas>
                {/* Gráfica 2: Distribución por Área (PieChart / Donut) */}
                <Seccion>
                    <TituloSeccion>
                        <FaChartPie /> Distribución por Área
                    </TituloSeccion>
                    {datosDistribucionArea.length === 0 ? (
                        <MensajeVacio>No hay productos activos en las áreas.</MensajeVacio>
                    ) : (
                        <ContenedorGrafica>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={datosDistribucionArea}
                                        dataKey="cantidadProductos"
                                        nameKey="nombre"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={4}
                                    >
                                        {datosDistribucionArea.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <CustomTooltipBox $color={d.color}>
                                                        <div className="tooltip-titulo">{d.nombre}</div>
                                                        <div className="tooltip-valor">{d.cantidadProductos} productos</div>
                                                        <div className="tooltip-extra">
                                                            Valor estimado: {formatearMoneda(d.valorEstimado)}
                                                        </div>
                                                    </CustomTooltipBox>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(val, entry) => (
                                            <span style={{ color: "#333", fontSize: "11px", fontWeight: 600 }}>
                                                {val} ({entry.payload.cantidadProductos})
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </ContenedorGrafica>
                    )}
                </Seccion>

                {/* Gráfica 3: Estado y Salud del Inventario */}
                <Seccion>
                    <TituloSeccion>
                        <FaChartBar /> Salud y Estado del Abasto
                    </TituloSeccion>
                    {datosSaludStock.length === 0 ? (
                        <MensajeVacio>No hay productos para analizar inventario.</MensajeVacio>
                    ) : (
                        <ContenedorGrafica>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={datosSaludStock}
                                    margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf6" vertical={false} />
                                    <XAxis
                                        dataKey="estado"
                                        tick={{ fontSize: 11, fill: "#555", fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: "#777" }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={35}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <CustomTooltipBox $color={d.color}>
                                                        <div className="tooltip-titulo">{d.estado}</div>
                                                        <div className="tooltip-valor">{d.cantidad} productos</div>
                                                    </CustomTooltipBox>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                                        {datosSaludStock.map((entry, index) => (
                                            <Cell key={`salud-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ContenedorGrafica>
                    )}
                </Seccion>
            </GridGraficas>

            {/* Gráfica 4: Top Categorías con Mayor Gasto Acumulado */}
            {datosTopCategorias.length > 0 && (
                <Seccion>
                    <TituloSeccion>
                        <FaBoxes /> Top Categorías por Inversión Acumulada
                    </TituloSeccion>
                    <ContenedorGrafica style={{ height: 230 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={datosTopCategorias}
                                margin={{ top: 8, right: 24, left: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf6" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tickFormatter={formatoCorto}
                                    tick={{ fontSize: 10, fill: "#777" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="categoria"
                                    width={140}
                                    tick={{ fontSize: 11, fill: "#2d3748" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <CustomTooltipBox $color={d.color}>
                                                    <div className="tooltip-titulo">{d.categoria}</div>
                                                    <div className="tooltip-valor">{formatearMoneda(d.gastoTotal)}</div>
                                                    <div className="tooltip-extra">
                                                        {d.productosCount} productos en catálogo
                                                    </div>
                                                </CustomTooltipBox>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="gastoTotal" name="Gasto Total" radius={[0, 6, 6, 0]}>
                                    {datosTopCategorias.map((entry, index) => (
                                        <Cell key={`cat-${index}`} fill={entry.color || "#6c5ce7"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ContenedorGrafica>
                </Seccion>
            )}

            {/* Consumos y Salidas Recientes del Mes */}
            <Seccion>
                <TituloSeccion>
                    <FaHistory /> Salidas y Consumos Recientes del Mes
                </TituloSeccion>
                {cargandoMovimientos ? (
                    <small style={{ color: "#8c84a8" }}>Cargando consumo del mes...</small>
                ) : historialMovimientos.length === 0 ? (
                    <small style={{ color: "#8c84a8" }}>No se han registrado consumos en este mes.</small>
                ) : (
                    <ListaMovimientos>
                        {historialMovimientos.slice(0, 10).map((mov) => {
                            const fechaObj = mov.fecha?.toDate?.() || new Date(mov.fecha || 0);
                            const fechaTxt = fechaObj.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
                            const esSalida = mov.tipo === "salida" || mov.tipo === "ajuste_negativo";

                            return (
                                <FilaMov key={mov.id}>
                                    <div>
                                        <strong>{mov.nombreSnapshot || "Producto"}</strong>
                                        <small>{mov.motivo || "Consumo"} • {fechaTxt}</small>
                                    </div>
                                    <span className="gasto" $salida={esSalida}>
                                        {esSalida ? "-" : "+"}{Math.abs(mov.cantidadFirmada || mov.cantidad)}
                                    </span>
                                </FilaMov>
                            );
                        })}
                    </ListaMovimientos>
                )}
            </Seccion>
        </Contenedor>
    );
};
