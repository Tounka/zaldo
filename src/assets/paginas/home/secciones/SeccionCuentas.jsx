import styled from "styled-components";
import { CardCuenta } from "../../../componentes/cards/cardCuenta";
import { useAppStore } from "../../../stores/useAppStore";
import { TxtGenerico } from "../../../componentes/genericos/titulos";
import { obtenerFondoTarjeta } from "../../../funciones/fondosTarjetas";
import { obtenerEsLiquida } from "../../../funciones/utils/cuentas";
import { ResponsiveContainer, Treemap } from "recharts";

const ContenedorSeccionCuentas = styled.div`
    width: 100%;
    height:auto;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SeccionCuentaCard = styled.section`
    width: 100%;
    height: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px 16px;
    border: 1px solid rgba(83, 59, 143, 0.2);
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 6px 18px rgba(83, 59, 143, 0.06);
`;

const ContenedorSeccionCuenta = styled.div`
    width: 100%;
    height:auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.9fr);
    gap: 14px;
    align-items: start;

   @media (max-width: 700px ) {
        grid-template-columns: 1fr ;
        grid-template-rows: auto auto;
    }
`;

const PanelGrafica = styled.div`
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 7px;
    border-left: 1px solid rgba(83, 59, 143, 0.16);

    .treemap-node {
        cursor: pointer;
        transition: filter 0.2s ease;
    }

    .treemap-node:hover {
        filter: brightness(1.12);
    }

    @media (max-width: 700px) {
        border-left: 0;
        border-top: 1px solid rgba(83, 59, 143, 0.16);
    }
`;

const TreemapLeyenda = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    padding: 0 8px 2px;
`;

const TreemapLeyendaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: 190px;
    padding: 4px 7px 4px 4px;
    border-left: 3px solid ${({ $color }) => $color};
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.42);
    box-shadow: 0 2px 7px rgba(43, 27, 78, 0.06);
`;

const TreemapLeyendaImagen = styled.span`
    flex: 0 0 auto;
    width: 27px;
    height: 19px;
    border-radius: 3px;
    background-image: linear-gradient(
        110deg,
        ${({ $color }) => `${$color}55`},
        rgba(20, 12, 39, 0.34)
    ), url(${({ $imagen }) => $imagen});
    background-position: center;
    background-size: cover;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34);
`;

const TreemapLeyendaNombre = styled.span`
    min-width: 0;
    overflow: hidden;
    color: var(--colorPrincipal);
    font-size: 10px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const TreemapLeyendaPorcentaje = styled.span`
    flex: 0 0 auto;
    color: ${({ $color }) => $color};
    font-size: 10px;
    font-weight: 800;
`;

const ContenedorLista = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 7px;
    overflow: hidden;
`;

const EstadoVacio = styled.div`
    padding: 17px;
    border: 1px dashed rgba(83, 59, 143, 0.3);
    border-radius: 4px;
    color: var(--colorPrincipal);
    font-size: 12px;
    text-align: center;
`;

const obtenerSaldoTotal = (cuenta) =>
    (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0);

const coloresHeatmapMorado = [
    "#b494f1",
    "#8c70cd",
    "#6749a2",
    "#432d79",
];

const coloresHeatmapRojo = [
    "#f29aa2",
    "#ef6a74",
    "#db2b39",
    "#a91f2a",
];

const obtenerPorcentajeTotal = (cuenta, totalSeccion) => {
    const saldo = Math.abs(obtenerSaldoTotal(cuenta));
    return totalSeccion > 0 ? (saldo / totalSeccion) * 100 : undefined;
};

const obtenerColorTreemap = (porcentaje, esPasivo) => {
    const colores = esPasivo ? coloresHeatmapRojo : coloresHeatmapMorado;
    if (porcentaje >= 50) return colores[3];
    if (porcentaje >= 25) return colores[2];
    if (porcentaje >= 10) return colores[1];
    return colores[0];
};

const TreemapContenido = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    depth = 0,
    children,
    name,
    percentage,
    fill,
    backgroundImage,
    treemapId,
    index = 0,
}) => {
    const esCuenta = depth > 0 || !children?.length;
    const mostrarTexto = esCuenta && width > 48 && height > 35;
    const color = fill || "rgba(83, 59, 143, 0.12)";
    const idBase = String(treemapId || name || "cuenta").replace(/[^a-zA-Z0-9_-]/g, "-");
    const idSufijo = `${Math.round(x)}-${Math.round(y)}-${index}`;
    const clipId = `treemap-clip-${idBase}-${idSufijo}`;
    const overlayId = `treemap-overlay-${idBase}-${idSufijo}`;

    return (
        <g className="treemap-node">
            {backgroundImage && (
                <defs>
                    <clipPath id={clipId}>
                        <rect x={x} y={y} width={width} height={height} rx={4} ry={4} />
                    </clipPath>
                    <linearGradient id={overlayId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity={0.14} />
                        <stop offset="48%" stopColor={color} stopOpacity={0.26} />
                        <stop offset="100%" stopColor="#160d2d" stopOpacity={0.78} />
                    </linearGradient>
                </defs>
            )}
            {backgroundImage && (
                <image
                    href={backgroundImage}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipId})`}
                />
            )}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={4}
                ry={4}
                fill={backgroundImage ? `url(#${overlayId})` : color}
                stroke="rgba(255, 255, 255, 0.78)"
                strokeWidth={2}
            />
            {mostrarTexto && (
                <>
                    <text
                        x={x + 9}
                        y={y + 17}
                        fill="#fff"
                        fontSize={10}
                        fontWeight={700}
                    >
                        {String(name || "").slice(0, 18)}
                    </text>
                    <text
                        x={x + 9}
                        y={y + height - 10}
                        fill="#fff"
                        fontSize={16}
                        fontWeight={800}
                    >
                        {`${Number(percentage || 0).toFixed(1)}%`}
                    </text>
                </>
            )}
        </g>
    );
};

const CuentaEnCard = ({ cuenta, totalSeccion, esPasivo }) => {
    return (
        <CardCuenta
            cuenta={cuenta}
            porcentaje={obtenerPorcentajeTotal(cuenta, totalSeccion)}
            esPasivo={esPasivo}
            esLiquida={obtenerEsLiquida(cuenta)}
        />
    );
};

const SeccionCuenta = ({ titulo, cuentas }) => {
    const esPasivo = titulo === "Pasivos";
    const totalSeccion = cuentas.reduce(
        (total, cuenta) => total + Math.abs(obtenerSaldoTotal(cuenta)),
        0
    );

    const datosParaTreemap = [{
        name: titulo,
        children: cuentas
            .filter(cuenta => Math.abs(obtenerSaldoTotal(cuenta)) > 0)
            .map((cuenta, index) => {
                const porcentaje = obtenerPorcentajeTotal(cuenta, totalSeccion) || 0;

                return {
                    name: cuenta.nombre,
                    treemapId: cuenta.id ?? `${titulo}-${index}`,
                    size: Math.abs(obtenerSaldoTotal(cuenta)),
                    percentage: porcentaje,
                    fill: obtenerColorTreemap(porcentaje, esPasivo),
                    backgroundImage: obtenerFondoTarjeta(cuenta),
                };
            }),
    }];

    return (
        <SeccionCuentaCard>
            <TxtGenerico size="18px" color="var(--colorPrincipal)">
                {titulo}
            </TxtGenerico>

            <ContenedorSeccionCuenta>
                <ContenedorLista>
                    {cuentas.length > 0 ? cuentas.map((cuenta, index) => (
                        <CuentaEnCard
                            cuenta={cuenta}
                            totalSeccion={totalSeccion}
                            esPasivo={esPasivo}
                            key={cuenta.id ?? `cuenta${index}`}
                        />
                    )) : (
                        <EstadoVacio>No hay cuentas en esta sección.</EstadoVacio>
                    )}
                </ContenedorLista>

                <PanelGrafica>
                    {datosParaTreemap[0].children.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={190}>
                                <Treemap
                                    data={datosParaTreemap[0].children}
                                    dataKey="size"
                                    nameKey="name"
                                    type="flat"
                                    aspectRatio={1.55}
                                    content={<TreemapContenido />}
                                    isAnimationActive
                                    animationDuration={450}
                                />
                            </ResponsiveContainer>
                            <TreemapLeyenda aria-label={`Cuentas de ${titulo}`} role="list">
                                {datosParaTreemap[0].children.map((dato) => (
                                    <TreemapLeyendaItem
                                        key={`leyenda-${dato.treemapId}`}
                                        title={`${dato.name}: ${dato.percentage.toFixed(1)}%`}
                                        $color={dato.fill}
                                        role="listitem"
                                    >
                                        <TreemapLeyendaImagen
                                            $color={dato.fill}
                                            $imagen={dato.backgroundImage}
                                            aria-hidden="true"
                                        />
                                        <TreemapLeyendaNombre>{dato.name}</TreemapLeyendaNombre>
                                        <TreemapLeyendaPorcentaje $color={dato.fill}>
                                            {`${dato.percentage.toFixed(1)}%`}
                                        </TreemapLeyendaPorcentaje>
                                    </TreemapLeyendaItem>
                                ))}
                            </TreemapLeyenda>
                        </>
                    ) : (
                        <span style={{ color: "var(--colorPrincipal)", fontSize: "12px" }}>
                            No hay datos para mostrar
                        </span>
                    )}
                </PanelGrafica>
            </ContenedorSeccionCuenta>
        </SeccionCuentaCard>
    )
}


export const SeccionCuentas = () => {
    const { cuentas } = useAppStore()

    const cuentasConActivos = cuentas.filter(
        (cuenta) => obtenerSaldoTotal(cuenta) > 0
    )

    let cuentasConPasivos = cuentas.filter(
        (cuenta) => obtenerSaldoTotal(cuenta) < 0
    )

    cuentasConPasivos = [...cuentasConPasivos].sort(
        (a, b) => obtenerSaldoTotal(a) - obtenerSaldoTotal(b)
    )

    const cuentasConSinSaldo = cuentas.filter(
        (cuenta) => obtenerSaldoTotal(cuenta) === 0
    )

    return (
        <ContenedorSeccionCuentas>
            <SeccionCuenta titulo="Activos" cuentas={cuentasConActivos} />
            <SeccionCuenta titulo="Pasivos" cuentas={cuentasConPasivos} />
            <SeccionCuenta titulo="Sin Saldo" cuentas={cuentasConSinSaldo} />
        </ContenedorSeccionCuentas>
    )
}

