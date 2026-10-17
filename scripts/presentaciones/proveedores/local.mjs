/*
 * Proveedor sin IA: arma la especificación con plantillas fijas a partir de
 * las métricas. Sirve para probar el flujo completo hoy y como respaldo si la
 * API no responde. La redacción es deliberadamente sobria: los hallazgos
 * finos son trabajo del proveedor de IA.
 */

const $ = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-MX");
const pct = (n) => `${Number(n).toFixed(1)}%`;

const portada = (titulo, subtitulo, kpi, datos) => ({
    tipo: "portada",
    kicker: "Zaldo",
    titulo,
    subtitulo,
    kpiPortada: kpi,
    meta: [
        [datos.usuario.nombres, datos.usuario.apellidos].filter(Boolean).join(" ") || datos.metadatos.correo,
        `Respaldo del ${String(datos.metadatos.generadoEn).slice(0, 10)}`,
    ],
});

const ingresos = (m, datos) => {
    const principal = m.fuentes[0];
    return {
        titulo: "Fuentes de ingreso",
        pie: `Fuentes de ingreso · respaldo ${String(datos.metadatos.generadoEn).slice(0, 10)}`,
        diapositivas: [
            portada("Fuentes de ingreso", "De qué se compone el ingreso y qué tan concentrado está.", { valor: $(m.total), etiqueta: "cobrado y confirmado" }, datos),
            {
                tipo: "kpis", kicker: "Resumen", titulo: `${principal.fuente} explica el ${pct(principal.porcentaje)} de lo cobrado`,
                kpis: [
                    { valor: $(m.total), etiqueta: `cobrado de ${m.mensual.etiquetas[0]} a ${m.mensual.etiquetas.at(-1)}` },
                    { valor: $(m.promedioMensual), etiqueta: "promedio mensual" },
                    { valor: pct(principal.porcentaje), etiqueta: `depende de ${principal.fuente}` },
                    { valor: $(m.pendienteNoCobrado), etiqueta: "registrado como pendiente", tono: m.pendienteNoCobrado ? "alerta" : "neutro" },
                ],
            },
            {
                tipo: "grafica", kicker: "Evolución mensual", titulo: "Ingreso cobrado por mes y fuente",
                grafica: {
                    tipo: "barras-apiladas", formato: "moneda", etiquetas: m.mensual.etiquetas,
                    series: m.fuentes.slice(0, 8).map((f) => ({ nombre: f.fuente, valores: m.mensual.porFuente[f.fuente] })),
                    referencia: { valor: m.promedioMensual, etiqueta: `promedio ${$(m.promedioMensual)}` },
                },
            },
            {
                tipo: "tabla", kicker: "Inventario", titulo: "Fuentes registradas",
                columnas: ["Fuente", "Total cobrado", "% del total"],
                filas: m.fuentes.map((f) => [f.fuente, $(f.total), pct(f.porcentaje)]),
            },
        ],
    };
};

const ahorros = (m, datos) => {
    const cats = Object.entries(m.totalPorCategoria).sort((a, b) => b[1] - a[1]);
    const total = cats.reduce((a, [, v]) => a + v, 0) || 1;
    return {
        titulo: "Ahorros",
        pie: `Ahorros · respaldo ${String(datos.metadatos.generadoEn).slice(0, 10)}`,
        diapositivas: [
            portada("Ahorros", "Origen del capital y su evolución.", { valor: $(m.capitalActual), etiqueta: `capital al ${m.fechaCorte}` }, datos),
            {
                tipo: "kpis", kicker: "Resumen", titulo: `El capital creció ${$(m.crecimientoReal.monto)} desde que hay registro real`,
                kpis: [
                    { valor: $(m.capitalActual), etiqueta: "capital actual" },
                    { valor: $(m.crecimientoReal.promedioMensual), etiqueta: "crecimiento promedio al mes" },
                    { valor: $(m.composicion.liquido), etiqueta: "en cuentas líquidas" },
                    { valor: $(m.composicion.prestamos + m.composicion.largoPlazo), etiqueta: "prestado o a largo plazo", tono: "alerta" },
                ],
            },
            {
                tipo: "grafica", kicker: "Historia", titulo: "Capital al cierre de cada mes",
                grafica: { tipo: "linea", formato: "moneda", etiquetas: m.capitalMensual.etiquetas, series: [{ nombre: "Capital", valores: m.capitalMensual.valores }], ...(m.metaAnual ? { referencia: { valor: m.metaAnual, etiqueta: `meta ${$(m.metaAnual)}` } } : {}) },
            },
            {
                tipo: "grafica", kicker: "Origen", titulo: "De dónde salió cada incremento",
                grafica: { tipo: "barras-apiladas", formato: "moneda", etiquetas: m.origenMensual.etiquetas, series: Object.entries(m.origenMensual.porCategoria).map(([nombre, valores]) => ({ nombre, valores })) },
                tarjetas: cats.slice(0, 3).map(([c, v]) => ({ titulo: `${c} · ${$(v)}`, texto: `${pct(v / total * 100)} de los incrementos con desglose.` })),
            },
        ],
    };
};

const gastos = (m, datos) => ({
    titulo: "Gastos",
    pie: `Gastos · respaldo ${String(datos.metadatos.generadoEn).slice(0, 10)}`,
    diapositivas: [
        portada("Gastos", "Gasto propio, gasto por familiares y tarjetas.", { valor: pct(m.porcentajeFamilia), etiqueta: "del gasto registrado es para familiares" }, datos),
        {
            tipo: "kpis", kicker: "Resumen", titulo: `${pct(m.porcentajeFamilia)} de lo que pagas con tus cuentas es para familiares`,
            kpis: [
                { valor: $(m.totalPropio), etiqueta: "gasto propio registrado" },
                { valor: $(m.totalFamilia), etiqueta: "gasto por familiares" },
                { valor: $(m.totalPorCobrar), etiqueta: "te deben en cuentas D-", tono: "alerta" },
                { valor: $(m.deudaTarjetas), etiqueta: `en tarjetas (${pct(m.deudaTarjetas / m.limiteTotal * 100)} del límite)`, tono: "malo" },
            ],
        },
        {
            tipo: "grafica", kicker: "Por mes", titulo: "Gasto propio y para familiares",
            grafica: { tipo: "barras-apiladas", formato: "moneda", etiquetas: m.mensual.etiquetas, series: [{ nombre: "Propio", valores: m.mensual.propio }, { nombre: "Familiares", valores: m.mensual.familia }] },
        },
        {
            tipo: "grafica", kicker: "Tarjetas", titulo: "Uso del límite por tarjeta",
            grafica: { tipo: "barras", formato: "porcentaje", etiquetas: m.tarjetas.map((t) => t.tarjeta), series: [{ nombre: "Uso del límite", valores: m.tarjetas.map((t) => t.uso) }], referencia: { valor: 30, etiqueta: "30% recomendado" } },
        },
    ],
});

const PLANTILLAS = { ingresos, ahorros, gastos };

export const generarConPlantilla = async ({ tema, metricas, datos }) => PLANTILLAS[tema](metricas, datos);
