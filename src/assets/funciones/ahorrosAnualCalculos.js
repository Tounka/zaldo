/*
 * Cálculos de la vista anual de ahorros.
 *
 * Todo es puro: recibe los documentos de cada año tal como vienen de Firestore
 * y devuelve series listas para graficar. El año de ahorro corre de agosto a
 * julio, así que los meses se indexan desde agosto (0 = Ago … 11 = Jul).
 */
import { MES_CORTE, getAnioAhorro, rangoAnioAhorro, toFechaKey } from "./firebase/ahorros";

export const MESES_ANIO_AHORRO = ["Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];

// Rendimientos e intereses generales se unifican, igual que en la gráfica del año.
export const CATEGORIAS_ORIGEN = [
    { key: "rendimientos", label: "Rendimientos / Intereses" },
    { key: "aumentoCapital", label: "Aumento a capital" },
    { key: "cashback", label: "Cashback" },
    { key: "prestamos", label: "Préstamos" },
    { key: "otros", label: "Otros" },
];

const categoriaOrigen = (categoria) => {
    if (categoria === "interesesGenerales" || categoria === "rendimientos") return "rendimientos";
    if (CATEGORIAS_ORIGEN.some((c) => c.key === categoria)) return categoria;
    return "otros";
};

const indiceMes = (fechaKey) => {
    const mes = Number(String(fechaKey).split("-")[1]);
    return (mes - MES_CORTE + 12) % 12;
};

/**
 * Resume un documento de año. Devuelve null si el año no tiene ningún registro
 * dentro de su periodo (p. ej. el año siguiente, que solo trae la apertura).
 */
export const resumirAnio = (documento) => {
    const anio = Number(documento?.year ?? documento?.id);
    if (!anio) return null;

    const { inicio, fin } = rangoAnioAhorro(anio);
    const desde = toFechaKey(inicio);
    const hasta = toFechaKey(fin);

    // La apertura va fechada el 31/jul del año anterior: queda fuera del
    // periodo y su valor ya está en kpis.capitalInicial.
    const registros = (documento.historial || [])
        .filter((h) => h?.fechaKey && h.fechaKey >= desde && h.fechaKey < hasta)
        .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)));

    if (registros.length === 0) return null;

    const base = documento.kpis?.capitalInicial;
    const capitalInicial = base !== undefined && base !== null
        ? Number(base)
        : Number(registros[0].capitalTotal || 0);
    const capitalFinal = Number(registros.at(-1).capitalTotal || 0);
    const incremento = capitalFinal - capitalInicial;

    // Cierre de cada mes = último registro del mes.
    const cierres = Array(12).fill(null);
    registros.forEach((r) => {
        cierres[indiceMes(r.fechaKey)] = Number(r.capitalTotal || 0);
    });

    // El incremento de un mes se mide contra el cierre del último mes con datos;
    // si hubo meses sin registros, su movimiento cae en el siguiente que sí tiene.
    let previo = capitalInicial;
    const meses = cierres.map((cierre, i) => {
        if (cierre === null) return { indice: i, cierre: null, incremento: null, acumulado: null };
        const inc = cierre - previo;
        previo = cierre;
        return { indice: i, cierre, incremento: inc, acumulado: cierre - capitalInicial };
    });

    const categorias = Object.fromEntries(CATEGORIAS_ORIGEN.map((c) => [c.key, 0]));
    registros.forEach((r) => {
        (r.incrementos || []).forEach((parte) => {
            const monto = Number(parte?.monto || 0);
            if (monto <= 0) return;
            categorias[categoriaOrigen(parte.categoria)] += monto;
        });
    });

    return {
        anio,
        enCurso: anio === getAnioAhorro(),
        capitalInicial,
        capitalFinal,
        incremento,
        porcentaje: capitalInicial > 0 ? (incremento / capitalInicial) * 100 : null,
        meta: Number(documento.kpis?.metaAnual || 0),
        meses,
        categorias,
        totalDesglosado: Object.values(categorias).reduce((a, b) => a + b, 0),
        registros: registros.length,
        ultimaFecha: registros.at(-1).fechaKey,
    };
};

export const resumirAnios = (documentos) =>
    (documentos || []).map(resumirAnio).filter(Boolean).sort((a, b) => a.anio - b.anio);

const etiquetaAnio = (r) => (r.enCurso ? `${r.anio}*` : String(r.anio));

/* ───────── Series por gráfica (reciben solo los años incluidos) ───────── */

export const serieIncrementoAnual = (resumenes) =>
    resumenes.map((r) => ({
        anio: etiquetaAnio(r),
        incremento: r.incremento,
        porcentaje: r.porcentaje,
        enCurso: r.enCurso,
    }));

/**
 * Trayectoria continua del capital al cierre de cada mes. Recibe todos los
 * años y los excluidos: estos quedan como hueco (null) para no unir con una
 * recta periodos que se decidieron ignorar.
 */
export const serieTrayectoria = (todos, excluidos) => {
    const puntos = todos.flatMap((r) =>
        r.meses.map((m) => {
            // Ago–Dic pertenecen al año de calendario anterior.
            const anioCalendario = m.indice < 12 - (MES_CORTE - 1) ? r.anio - 1 : r.anio;
            return {
                clave: `${r.anio}-${m.indice}`,
                etiqueta: `${MESES_ANIO_AHORRO[m.indice]} ${String(anioCalendario).slice(-2)}`,
                anio: r.anio,
                capital: excluidos.has(r.anio) ? null : m.cierre,
            };
        })
    );
    // Se recortan los huecos de los extremos (inicio de año y meses por venir).
    const primero = puntos.findIndex((p) => p.capital !== null);
    const ultimo = puntos.findLastIndex((p) => p.capital !== null);
    return primero < 0 ? [] : puntos.slice(primero, ultimo + 1);
};

// Una fila por mes (Ago…Jul) con una columna por año: `a2025`, `a2026`…
const seriePorMes = (resumenes, campo) =>
    MESES_ANIO_AHORRO.map((mes, i) => {
        const fila = { mes };
        resumenes.forEach((r) => {
            fila[`a${r.anio}`] = r.meses[i][campo];
        });
        return fila;
    });

export const serieAvanceAcumulado = (resumenes) => seriePorMes(resumenes, "acumulado");

export const serieIncrementoMensual = (resumenes) => seriePorMes(resumenes, "incremento");

export const serieEstacionalidad = (resumenes) =>
    MESES_ANIO_AHORRO.map((mes, i) => {
        const valores = resumenes.map((r) => r.meses[i].incremento).filter((v) => v !== null);
        return {
            mes,
            promedio: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null,
            muestras: valores.length,
        };
    });

export const serieCategoriasPorAnio = (resumenes) =>
    resumenes.map((r) => ({ anio: etiquetaAnio(r), ...r.categorias, total: r.totalDesglosado }));

export const rankingCategorias = (resumenes) => {
    const totales = CATEGORIAS_ORIGEN.map((c) => ({
        key: c.key,
        label: c.label,
        monto: resumenes.reduce((suma, r) => suma + r.categorias[c.key], 0),
    }));
    const total = totales.reduce((a, b) => a + b.monto, 0);
    return totales
        .filter((c) => c.monto > 0)
        .map((c) => ({ ...c, porcentaje: total > 0 ? (c.monto / total) * 100 : 0 }))
        .sort((a, b) => b.monto - a.monto);
};

export const kpisGlobales = (resumenes) => {
    if (resumenes.length === 0) return null;
    const ultimo = resumenes.at(-1);
    const ahorroTotal = resumenes.reduce((a, r) => a + r.incremento, 0);
    const cerrados = resumenes.filter((r) => !r.enCurso);
    const baseProm = cerrados.length ? cerrados : resumenes;
    const mejor = [...resumenes].sort((a, b) => b.incremento - a.incremento)[0];
    const primero = resumenes[0];
    return {
        capitalActual: ultimo.capitalFinal,
        anioActual: ultimo.anio,
        ahorroTotal,
        promedioAnual: baseProm.reduce((a, r) => a + r.incremento, 0) / baseProm.length,
        aniosPromedio: baseProm.length,
        mejor,
        crecimiento: primero.capitalInicial > 0
            ? ((ultimo.capitalFinal - primero.capitalInicial) / primero.capitalInicial) * 100
            : null,
        desde: primero.anio,
    };
};
