import { fechaLocalISO } from "./utils/fechas";
import {
    CLASIFICACIONES_COBRO,
    esCobroConfirmado,
    obtenerClasificacionCobro,
    obtenerMontoRegistro,
} from "./ingresosCalculos";
import { pagoEsperadoEmpresa, percepcionesQueAplican } from "./ingresosPercepciones";

export const COLOR_OTROS_INGRESOS = "#6b7280";

const dosDigitos = (n) => String(n).padStart(2, "0");
const isoDe = (fecha) => `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
const diasEntre = (isoA, isoB) => Math.abs(
    (new Date(`${isoA}T12:00:00`).getTime() - new Date(`${isoB}T12:00:00`).getTime()) / 86400000
);

/* Fechas en que un empleo debería pagar en el año según su esquema. */
const fechasDePagoDelAnio = (empresa, year) => {
    const tipo = empresa.tipoEsquema || "diario_sexto_dia";
    const fechas = [];

    if (tipo === "quincenal") {
        for (let mes = 0; mes < 12; mes += 1) {
            const quincena = new Date(year, mes, 15);
            if (quincena.getDay() === 6) quincena.setDate(14);
            else if (quincena.getDay() === 0) quincena.setDate(13);
            const finDeMes = new Date(year, mes + 1, 0);
            if (finDeMes.getDay() === 6) finDeMes.setDate(finDeMes.getDate() - 1);
            else if (finDeMes.getDay() === 0) finDeMes.setDate(finDeMes.getDate() - 2);
            fechas.push(isoDe(quincena), isoDe(finDeMes));
        }
        return { fechas, tolerancia: 7 };
    }

    if (tipo === "por_horas" || tipo === "diario_sexto_dia") {
        const dia = new Date(year, 0, 1);
        while (dia.getDay() !== 6) dia.setDate(dia.getDate() + 1);
        while (dia.getFullYear() === year) {
            fechas.push(isoDe(dia));
            dia.setDate(dia.getDate() + 7);
        }
        return { fechas, tolerancia: 3 };
    }

    return { fechas, tolerancia: 0 };
};

const registroEsDePercepcion = (registro) => Boolean(registro.percepcionId);

const proyectarEmpresa = (empresa, year, registros, hoyISO) => {
    const esperado = pagoEsperadoEmpresa(empresa);
    if (!(esperado.total > 0)) return [];

    const { fechas, tolerancia } = fechasDePagoDelAnio(empresa, year);
    const propios = registros.filter((registro) => registro.empresaId === empresa.id);
    const pagosPropios = propios.filter((registro) => !registroEsDePercepcion(registro));
    const proyectadas = [];
    const eventos = [];

    fechas.forEach((fecha) => {
        if (fecha < hoyISO) return;
        if (pagosPropios.some((registro) => registro.fecha && diasEntre(registro.fecha, fecha) <= tolerancia)) return;

        const percepciones = percepcionesQueAplican(empresa, fecha, [...propios, ...proyectadas]);
        percepciones.forEach((percepcion) => {
            proyectadas.push({ empresaId: empresa.id, percepcionId: percepcion.id, fecha });
        });

        const monto = esperado.total + percepciones.reduce((suma, percepcion) => suma + Number(percepcion.monto || 0), 0);
        eventos.push({
            id: `proy_${empresa.id}_${fecha}`,
            fecha,
            empresaId: empresa.id,
            empresaNombre: empresa.nombre || "Empresa",
            color: empresa.color,
            monto,
            tipo: "proyectado",
            etiqueta: esperado.tipoPago,
            detallePercepciones: percepciones.map((percepcion) => percepcion.nombre).filter(Boolean),
        });
    });

    return eventos;
};

const eventoDeRegistro = (registro, empresa) => {
    const cobrado = esCobroConfirmado(registro, empresa);
    const porLiquidar = obtenerClasificacionCobro(registro, empresa) === CLASIFICACIONES_COBRO.CORTE
        && ["Pagado", "Pendiente"].includes(registro.estado);
    const pendiente = registro.estado === "Pendiente";
    if (!cobrado && !pendiente && !porLiquidar) return null;

    return {
        id: registro.id,
        fecha: registro.fecha,
        empresaId: registro.empresaId,
        empresaNombre: empresa?.nombre || registro.empresaNombre || "Empresa",
        color: empresa?.color,
        monto: obtenerMontoRegistro(registro),
        tipo: cobrado ? "cobrado" : "esperado",
        etiqueta: registro.percepcionId ? (registro.notas || registro.tipo) : (registro.tipo || "Pago"),
        porLiquidar: porLiquidar && !cobrado,
    };
};

/**
 * Une en un solo calendario lo cobrado, lo pendiente y lo que se espera cobrar
 * (periodos futuros de cada empleo activo, con sus percepciones recurrentes).
 * Los cortes ya liquidados no cuentan: su dinero está en la liquidación.
 */
export const construirEventosIngresos = ({
    empresas = [],
    registros = [],
    ingresosExtra = [],
    year,
    hoy = new Date(),
}) => {
    const anio = Number(year);
    const hoyISO = fechaLocalISO(hoy);
    const empresasPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));
    const delAnio = (fecha) => Number(String(fecha || "").slice(0, 4)) === anio;
    const eventos = [];

    registros.forEach((registro) => {
        if (!registro?.empresaId || !delAnio(registro.fecha)) return;
        const evento = eventoDeRegistro(registro, empresasPorId.get(registro.empresaId));
        if (evento) eventos.push(evento);
    });

    ingresosExtra.forEach((extra, indice) => {
        if (!delAnio(extra?.fecha) || !Number(extra.monto)) return;
        eventos.push({
            id: extra.id || `extra_${indice}`,
            fecha: extra.fecha,
            empresaId: "extra",
            empresaNombre: "Otros ingresos",
            color: COLOR_OTROS_INGRESOS,
            monto: Number(extra.monto),
            tipo: "cobrado",
            etiqueta: extra.concepto || extra.nota || "Ingreso extra",
        });
    });

    empresas
        .filter((empresa) => empresa.activo !== false)
        .forEach((empresa) => eventos.push(...proyectarEmpresa(empresa, anio, registros, hoyISO)));

    return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
};

export const agruparEventosPorDia = (eventos) => eventos.reduce((mapa, evento) => {
    if (!mapa.has(evento.fecha)) mapa.set(evento.fecha, []);
    mapa.get(evento.fecha).push(evento);
    return mapa;
}, new Map());

export const resumirEventosPorMes = (eventos) => {
    const meses = Array.from({ length: 12 }, (_, indice) => ({
        mesNum: indice + 1,
        cobrado: 0,
        esperado: 0,
        proyectado: 0,
        total: 0,
        pagos: 0,
    }));

    eventos.forEach((evento) => {
        const mes = meses[Number(evento.fecha.slice(5, 7)) - 1];
        if (!mes) return;
        mes[evento.tipo] += evento.monto;
        mes.total += evento.monto;
        mes.pagos += 1;
    });

    return meses;
};

/** Promedio mensual de lo que entra (cobrado + esperado) contando solo meses con ingresos. */
export const promedioMensualProyectado = (resumenMeses) => {
    const conIngresos = resumenMeses.filter((mes) => mes.total > 0);
    return conIngresos.length
        ? conIngresos.reduce((suma, mes) => suma + mes.total, 0) / conIngresos.length
        : 0;
};
