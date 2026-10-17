/*
 * Calcula, a partir de un respaldo de Firestore, las métricas que recibe el
 * proveedor (IA o local). Todo número que aparezca en una presentación debe
 * salir de aquí: el modelo redacta, no calcula.
 *
 * Reglas que replican la app (no se importan porque los módulos de src/ usan
 * rutas sin extensión que Node no resuelve):
 *   - Cobro confirmado = estado "Pagado" y clasificación distinta de "corte"
 *     (esCobroConfirmado en src/assets/funciones/ingresosCalculos.js).
 *   - Incremento del día = suma de historial[].incrementos (firebase/ahorros.js).
 *   - Deuda de tarjeta = saldoALaFecha + saldoALaFechaMSI (CardCuenta.jsx).
 */

import { readFileSync } from "node:fs";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const etiquetaMes = (clave) => {
    const [anio, mes] = clave.split("-");
    return `${MESES[Number(mes) - 1]}-${anio.slice(2)}`;
};
const redondear = (n) => Math.round(Number(n) || 0);
const sumar = (lista) => lista.reduce((a, b) => a + b, 0);

export const leerRespaldo = (ruta) => {
    const respaldo = JSON.parse(readFileSync(ruta, "utf8"));
    const { uid } = respaldo.metadatos || {};
    const c = respaldo.contenido || {};
    const ruta_ = (sufijo) => c[`usuarios/${uid}/${sufijo}`] || [];
    const raiz = (prefijo) => Object.entries(c).find(([k]) => k.startsWith(`${prefijo}/${uid}/`))?.[1] || [];
    return {
        metadatos: respaldo.metadatos,
        usuario: c.usuarios?.datos || {},
        cuentas: ruta_("cuentas").map((d) => ({ id: d.id, ...d.datos })),
        movimientos: ruta_("movimientos").flatMap((d) => d.datos.movimientos || []),
        ingresos: ruta_("ingresos").map((d) => d.datos),
        ahorros: raiz("ahorros").map((d) => d.datos),
        prestamos: raiz("prestamos").map((d) => d.datos),
    };
};

/* ─────────── Ingresos ─────────── */

const NOTA_LIQUIDACION = /liquidaci[oó]n|pago\s+(?:del\s+)?mes/i;
const clasificacionCobro = (registro, empresa = {}) => {
    if (["pago", "corte", "liquidacion"].includes(registro.clasificacionCobro)) return registro.clasificacionCobro;
    if (NOTA_LIQUIDACION.test(registro.notas || "")) return "liquidacion";
    const liquidaCortes = empresa.liquidarCortesMensualmente ?? (empresa.nombre || "").toLowerCase().includes("innci");
    if (liquidaCortes && registro.tipo === "Semana (Horas)") return "corte";
    return "pago";
};

export const metricasIngresos = (datos) => {
    const porMes = {};
    let pendiente = 0;
    datos.ingresos.forEach((anio) => {
        const empresas = Object.fromEntries((anio.empresas || []).map((e) => [e.id, e]));
        (anio.registros || []).forEach((r) => {
            const empresa = empresas[r.empresaId] || {};
            const fuente = r.tipo === "Finiquito" ? `Finiquito ${empresa.nombre || ""}`.trim() : (empresa.nombre || "Otros");
            if (r.estado !== "Pagado") {
                pendiente += Number(r.montoReal || 0);
                return;
            }
            if (clasificacionCobro(r, empresa) === "corte") return;
            const mes = String(r.fecha).slice(0, 7);
            porMes[mes] ||= {};
            porMes[mes][fuente] = (porMes[mes][fuente] || 0) + Number(r.montoReal || 0);
        });
    });

    const meses = Object.keys(porMes).sort();
    const fuentes = [...new Set(meses.flatMap((m) => Object.keys(porMes[m])))];
    const totalPorFuente = Object.fromEntries(fuentes.map((f) => [f, redondear(sumar(meses.map((m) => porMes[m][f] || 0)))]));
    const total = sumar(Object.values(totalPorFuente));
    const totalesMensuales = meses.map((m) => redondear(sumar(Object.values(porMes[m]))));

    return {
        periodo: { desde: meses[0], hasta: meses.at(-1) },
        total,
        promedioMensual: redondear(total / meses.length),
        pendienteNoCobrado: redondear(pendiente),
        fuentes: fuentes
            .map((f) => ({ fuente: f, total: totalPorFuente[f], porcentaje: +(totalPorFuente[f] / total * 100).toFixed(1) }))
            .sort((a, b) => b.total - a.total),
        mensual: { meses, etiquetas: meses.map(etiquetaMes), totales: totalesMensuales, porFuente: Object.fromEntries(fuentes.map((f) => [f, meses.map((m) => redondear(porMes[m][f] || 0))])) },
    };
};

/* ─────────── Ahorros ─────────── */

const CATEGORIA = { interesesGenerales: "Intereses", rendimientos: "Intereses", aumentoCapital: "Aumento a capital", cashback: "Cashback", prestamos: "Préstamos" };

export const metricasAhorros = (datos) => {
    const anios = [...datos.ahorros].sort((a, b) => Number(a.year) - Number(b.year));
    const cierres = {};
    const porMes = {};
    const estimado = {};
    anios.forEach((anio) => {
        (anio.historial || []).forEach((h) => {
            const mes = String(h.fechaKey).slice(0, 7);
            cierres[mes] = Number(h.capitalTotal || 0);
            estimado[mes] = Boolean(h.estimado);
            (h.incrementos || []).forEach((p) => {
                if (Number(p.monto) <= 0) return;
                porMes[mes] ||= {};
                const cat = CATEGORIA[p.categoria] || "Otros";
                porMes[mes][cat] = (porMes[mes][cat] || 0) + Number(p.monto);
            });
        });
    });
    const mesesCapital = Object.keys(cierres).sort();
    const actual = anios.at(-1);
    const cuentas = actual?.cuentas || {};
    const sumaGrupo = (g) => redondear(sumar((cuentas[g] || []).map((c) => Number(c.monto || 0))));
    const mesesReales = mesesCapital.filter((m) => !estimado[m]);
    const mesesIncremento = Object.keys(porMes).filter((m) => !estimado[m]).sort();
    const categorias = [...new Set(mesesIncremento.flatMap((m) => Object.keys(porMes[m])))];
    const capitalActual = cierres[mesesCapital.at(-1)];
    const inicioReal = cierres[mesesReales[0]];

    return {
        capitalActual: redondear(capitalActual),
        fechaCorte: actual?.historial?.at(-1)?.fechaKey,
        metaAnual: Number(actual?.kpis?.metaAnual || 0),
        crecimientoReal: { desde: mesesReales[0], monto: redondear(capitalActual - inicioReal), promedioMensual: redondear((capitalActual - inicioReal) / Math.max(mesesReales.length - 1, 1)) },
        composicion: { liquido: sumaGrupo("liquido"), prestamos: sumaGrupo("inversiones"), largoPlazo: sumaGrupo("inversionesLargo"), responsabilidades: sumaGrupo("responsabilidades") },
        capitalMensual: { meses: mesesCapital, etiquetas: mesesCapital.map(etiquetaMes), valores: mesesCapital.map((m) => redondear(cierres[m])), estimado: mesesCapital.map((m) => estimado[m]) },
        origenMensual: {
            meses: mesesIncremento,
            etiquetas: mesesIncremento.map(etiquetaMes),
            porCategoria: Object.fromEntries(categorias.map((c) => [c, mesesIncremento.map((m) => redondear(porMes[m][c] || 0))])),
        },
        totalPorCategoria: Object.fromEntries(categorias.map((c) => [c, redondear(sumar(mesesIncremento.map((m) => porMes[m][c] || 0)))])),
    };
};

/* ─────────── Gastos ─────────── */

const esCuentaFamiliar = (nombre = "") => {
    const n = nombre.trim();
    return (n.startsWith("D") && !n.startsWith("Didi")) || /^(deuda|t[ií]o)/i.test(n);
};
const NOTA_FAMILIAR = /mam[aá]|abue|t[ií]a\b|tia |diego|angy|erika|mara\b|marisa|adri[aá]n|lupita|gerardo|\bgera\b|itzel|eduardo|novio/i;
const NO_ES_GASTO = new Set(["ajusteDeSaldo", "ajusteDeSaldoMSI", "pagoTarjeta", "transferencia"]);

export const metricasGastos = (datos) => {
    const fecha = (m) => m.fechaMovimiento?.iso?.slice(0, 10) || "";
    const adeudos = datos.movimientos
        .filter((m) => esCuentaFamiliar(m.nombreCuenta) && m.monto > 0)
        .map((m) => [fecha(m), Math.round(m.monto)]);

    const porMes = {};
    const porCategoria = { propio: {}, familia: {} };
    datos.movimientos.forEach((m) => {
        const cat = m.categoria || "sinCategoria";
        const nota = m.nota || "";
        if (NO_ES_GASTO.has(cat) || m.esTransferencia || nota.startsWith("Movimiento ") || /liquidez|inyecci/i.test(nota)) return;
        if (esCuentaFamiliar(m.nombreCuenta) || m.monto >= 0) return;
        const monto = -m.monto;
        const f = fecha(m);
        const espejo = adeudos.some(([fd, v]) => Math.abs(v - Math.round(monto)) <= 1 && Math.abs(new Date(fd) - new Date(f)) <= 2 * 864e5);
        const tipo = m.esPersonal ? "propio" : (espejo || NOTA_FAMILIAR.test(nota)) ? "familia" : "propio";
        const mes = f.slice(0, 7);
        porMes[mes] ||= { propio: 0, familia: 0 };
        porMes[mes][tipo] += monto;
        porCategoria[tipo][cat] = (porCategoria[tipo][cat] || 0) + monto;
    });

    const meses = Object.keys(porMes).sort();
    const tarjetas = datos.cuentas
        .filter((c) => c.tipoDeCuenta === "credito" && Number(c.limiteDeCredito) > 0)
        .map((c) => {
            const deuda = -Math.min(0, Number(c.saldoALaFecha || 0)) - Math.min(0, Number(c.saldoALaFechaMSI || 0));
            return { tarjeta: c.nombre, deuda: redondear(deuda), limite: Number(c.limiteDeCredito), uso: +(deuda / Number(c.limiteDeCredito) * 100).toFixed(1) };
        })
        .sort((a, b) => b.uso - a.uso);
    const porCobrar = datos.cuentas
        .filter((c) => esCuentaFamiliar(c.nombre) && Number(c.saldoALaFecha) > 0)
        .map((c) => ({ cuenta: c.nombre, monto: redondear(c.saldoALaFecha) }))
        .sort((a, b) => b.monto - a.monto);
    const totalPropio = sumar(meses.map((m) => porMes[m].propio));
    const totalFamilia = sumar(meses.map((m) => porMes[m].familia));
    const ordenar = (o) => Object.entries(o).map(([k, v]) => ({ categoria: k, monto: redondear(v) })).sort((a, b) => b.monto - a.monto);

    return {
        mesesConDatos: meses,
        totalPropio: redondear(totalPropio),
        totalFamilia: redondear(totalFamilia),
        porcentajeFamilia: +(totalFamilia / (totalPropio + totalFamilia) * 100).toFixed(1),
        mensual: { meses, etiquetas: meses.map(etiquetaMes), propio: meses.map((m) => redondear(porMes[m].propio)), familia: meses.map((m) => redondear(porMes[m].familia)) },
        categoriasPropias: ordenar(porCategoria.propio),
        categoriasFamilia: ordenar(porCategoria.familia),
        tarjetas,
        deudaTarjetas: sumar(tarjetas.map((t) => t.deuda)),
        limiteTotal: sumar(tarjetas.map((t) => t.limite)),
        porCobrarFamilia: porCobrar,
        totalPorCobrar: sumar(porCobrar.map((p) => p.monto)),
    };
};

export const CALCULADORES = { ingresos: metricasIngresos, ahorros: metricasAhorros, gastos: metricasGastos };
