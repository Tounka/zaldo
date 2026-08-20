import { guardarIngresosDocumento, obtenerIngresosAnio } from "./firebase/ingresos";

export const DATA_HISTORICA_2025 = {
    year: 2025,
    configuracion: {
        incluirPrestamosEnResumen: true,
    },
    empresas: [
        {
            id: "emp_sitio_random",
            nombre: "Sitio Random",
            activo: false,
            color: "#533B8F",
            tipoEsquema: "quincenal",
            salarioDiario: 200,
            quincenaBase: 3000,
            notas: "Empleo anterior / Finiquitado",
        },
        {
            id: "emp_innci",
            nombre: "iNNCi",
            activo: true,
            color: "#0088FE",
            tipoEsquema: "por_horas",
            precioHora: 52,
            horasSemanales: 11,
            bonoInternet: 200,
            aplicarResico: false,
            liquidarCortesMensualmente: true,
            notas: "Reporte semanal con pago mensual / Por Horas",
        },
        {
            id: "emp_cslp_mex",
            nombre: "CSLP-mex",
            activo: true,
            color: "#00C49F",
            tipoEsquema: "quincenal",
            quincenaBase: 7500,
            ajustarViernesHabil: true,
            notas: "Pago cada 15 y fin de mes (o último viernes si cae fin de semana)",
        },
        {
            id: "emp_otros",
            nombre: "Otros",
            activo: true,
            color: "#FFBB28",
            tipoEsquema: "libre",
            notas: "Ingresos extras",
        },
    ],
    registros: [
        {
            id: "reg_2025_07_innci",
            empresaId: "emp_innci",
            empresaNombre: "iNNCi",
            fecha: "2025-07-31",
            mes: 7,
            numeroPeriodo: 1,
            montoTeorico: 2778,
            montoExtra: 0,
            tipo: "Mensual",
            estado: "Pagado",
            montoReal: 2778,
            notas: "Cierre Julio",
        },
        {
            id: "reg_2025_08_innci",
            empresaId: "emp_innci",
            empresaNombre: "iNNCi",
            fecha: "2025-08-31",
            mes: 8,
            numeroPeriodo: 1,
            montoTeorico: 5375,
            montoExtra: 0,
            tipo: "Mensual",
            estado: "Pagado",
            montoReal: 5375,
            notas: "Cierre Agosto",
        },
        {
            id: "reg_2025_08_29_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-08-29",
            mes: 8,
            numeroPeriodo: 2,
            diasTrabajados: 5,
            montoTeorico: 1000,
            montoExtra: 200,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 1000,
            notas: "5 días trabajados",
        },
        {
            id: "reg_2025_09_05_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-09-05",
            mes: 9,
            numeroPeriodo: 3,
            diasTrabajados: 5,
            montoTeorico: 1354,
            montoExtra: 0,
            tipo: "Bono",
            estado: "Pagado",
            montoReal: 1354,
        },
        {
            id: "reg_2025_09_15_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-09-15",
            mes: 9,
            numeroPeriodo: 1,
            diasTrabajados: 11,
            montoTeorico: 2200,
            montoExtra: 440,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 3000,
        },
        {
            id: "reg_2025_09_30_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-09-30",
            mes: 9,
            numeroPeriodo: 2,
            diasTrabajados: 15,
            montoTeorico: 3000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 3000,
        },
        {
            id: "reg_2025_09_innci",
            empresaId: "emp_innci",
            empresaNombre: "iNNCi",
            fecha: "2025-09-30",
            mes: 9,
            numeroPeriodo: 1,
            montoTeorico: 2825,
            montoExtra: 0,
            tipo: "Mensual",
            estado: "Pagado",
            montoReal: 2825,
            notas: "Cierre Septiembre",
        },
        {
            id: "reg_2025_10_05_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-10-05",
            mes: 10,
            numeroPeriodo: 3,
            diasTrabajados: 30,
            montoTeorico: 6000,
            montoExtra: 0,
            tipo: "Bono",
            estado: "Pagado",
            montoReal: 6000,
        },
        {
            id: "reg_2025_10_15_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-10-15",
            mes: 10,
            numeroPeriodo: 1,
            diasTrabajados: 15,
            montoTeorico: 3000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 3000,
        },
        {
            id: "reg_2025_10_30_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-10-30",
            mes: 10,
            numeroPeriodo: 2,
            diasTrabajados: 15,
            montoTeorico: 3000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 3000,
        },
        {
            id: "reg_2025_10_innci",
            empresaId: "emp_innci",
            empresaNombre: "iNNCi",
            fecha: "2025-10-31",
            mes: 10,
            numeroPeriodo: 1,
            montoTeorico: 3350,
            montoExtra: 0,
            tipo: "Mensual",
            estado: "Pagado",
            montoReal: 3350,
            notas: "Cierre Octubre",
        },
        {
            id: "reg_2025_10_otros",
            empresaId: "emp_otros",
            empresaNombre: "Otros",
            fecha: "2025-10-31",
            mes: 10,
            numeroPeriodo: 1,
            montoTeorico: 500,
            montoExtra: 0,
            tipo: "Extra",
            estado: "Pagado",
            montoReal: 500,
        },
        {
            id: "reg_2025_11_05_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-11-05",
            mes: 11,
            numeroPeriodo: 3,
            diasTrabajados: 30,
            montoTeorico: 6000,
            montoExtra: 0,
            tipo: "Bono",
            estado: "Pagado",
            montoReal: 6000,
        },
        {
            id: "reg_2025_11_15_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-11-15",
            mes: 11,
            numeroPeriodo: 1,
            diasTrabajados: 15,
            montoTeorico: 3000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 3000,
        },
        {
            id: "reg_2025_11_30_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-11-30",
            mes: 11,
            numeroPeriodo: 2,
            diasTrabajados: 15,
            montoTeorico: 3000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 3000,
        },
        {
            id: "reg_2025_11_innci",
            empresaId: "emp_innci",
            empresaNombre: "iNNCi",
            fecha: "2025-11-30",
            mes: 11,
            numeroPeriodo: 1,
            montoTeorico: 2900,
            montoExtra: 0,
            tipo: "Mensual",
            estado: "Pagado",
            montoReal: 2900,
            notas: "Cierre Noviembre",
        },
        {
            id: "reg_2025_12_05_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-12-05",
            mes: 12,
            numeroPeriodo: 3,
            diasTrabajados: 30,
            montoTeorico: 6000,
            montoExtra: 0,
            tipo: "Bono",
            estado: "Pagado",
            montoReal: 6000,
        },
        {
            id: "reg_2025_12_15_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-12-15",
            mes: 12,
            numeroPeriodo: 1,
            diasTrabajados: 15,
            montoTeorico: 4000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 4000,
        },
        {
            id: "reg_2025_12_30_sr",
            empresaId: "emp_sitio_random",
            empresaNombre: "Sitio Random",
            fecha: "2025-12-30",
            mes: 12,
            numeroPeriodo: 2,
            diasTrabajados: 15,
            montoTeorico: 4000,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 4000,
        },
        {
            id: "reg_2025_12_innci",
            empresaId: "emp_innci",
            empresaNombre: "iNNCi",
            fecha: "2025-12-31",
            mes: 12,
            numeroPeriodo: 1,
            montoTeorico: 3100,
            montoExtra: 0,
            tipo: "Mensual",
            estado: "Pagado",
            montoReal: 3100,
            notas: "Cierre Diciembre",
        },
    ],
};

export const DATA_HISTORICA_2026 = {
    year: 2026,
    configuracion: {
        incluirPrestamosEnResumen: true,
    },
    empresas: [
        {
            id: "emp_cslp_mex",
            nombre: "CSLP-mex",
            activo: true,
            color: "#00C49F",
            tipoEsquema: "quincenal",
            quincenaBase: 7500,
            ajustarViernesHabil: true,
            notas: "Pago cada 15 y fin de mes (o último viernes si cae fin de semana)",
        },
        {
            id: "emp_innci",
            nombre: "iNNCi",
            activo: true,
            color: "#0088FE",
            tipoEsquema: "por_horas",
            precioHora: 52,
            horasSemanales: 11,
            bonoInternet: 200,
            aplicarResico: false,
            liquidarCortesMensualmente: true,
            notas: "Reporte semanal con pago mensual / Por Horas",
        },
        {
            id: "emp_sitio_random",
            nombre: "Sitio Random",
            activo: false,
            color: "#533B8F",
            tipoEsquema: "quincenal",
            salarioDiario: 200,
            quincenaBase: 5000,
            notas: "Empleo anterior / Finiquitado Julio 2026",
        },
        {
            id: "emp_otros",
            nombre: "Otros",
            activo: true,
            color: "#FFBB28",
            tipoEsquema: "libre",
            notas: "Ingresos extras",
        },
    ],
    registros: [
        // CSLP-mex
        {
            id: "reg_26_cslp_01",
            empresaId: "emp_cslp_mex",
            empresaNombre: "CSLP-mex",
            fecha: "2026-07-31",
            mes: 7,
            numeroPeriodo: 2,
            diasTrabajados: 4,
            montoTeorico: 2244,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 2244,
            notas: "Primer pago proporcional julio",
        },
        {
            id: "reg_26_cslp_02",
            empresaId: "emp_cslp_mex",
            empresaNombre: "CSLP-mex",
            fecha: "2026-08-14",
            mes: 8,
            numeroPeriodo: 1,
            diasTrabajados: 15,
            montoTeorico: 7500,
            montoExtra: 0,
            tipo: "Quincena",
            estado: "Pagado",
            montoReal: 7500,
            notas: "Pago 1ra quincena agosto (viernes 14)",
        },

        // Sitio Random
        { id: "reg_26_sr_01", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-01-05", mes: 1, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 4000, montoExtra: 0, tipo: "Bono", estado: "Pagado", montoReal: 4000 },
        { id: "reg_26_sr_02", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-01-15", mes: 1, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_03", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-01-30", mes: 1, numeroPeriodo: 2, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        
        // iNNCi
        { id: "reg_26_innci_01", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-01-10", mes: 1, numeroPeriodo: 1, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_02", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-01-17", mes: 1, numeroPeriodo: 2, horasReportadas: 11.5, precioHora: 52, diasTrabajados: 3, montoTeorico: 598, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 798 },
        { id: "reg_26_innci_03", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-01-24", mes: 1, numeroPeriodo: 3, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_04", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-01-31", mes: 1, numeroPeriodo: 4, horasReportadas: 11.5, precioHora: 52, diasTrabajados: 3, montoTeorico: 598, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 3222, notas: "Liquidación mes enero" },
        
        // Feb
        { id: "reg_26_sr_04", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-02-05", mes: 2, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 6400, montoExtra: 0, tipo: "Bono", estado: "Pagado", montoReal: 2000 },
        { id: "reg_26_sr_05", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-02-15", mes: 2, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_06", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-02-28", mes: 2, numeroPeriodo: 2, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_innci_05", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-02-07", mes: 2, numeroPeriodo: 5, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_06", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-02-14", mes: 2, numeroPeriodo: 6, horasReportadas: 5, precioHora: 52, diasTrabajados: 1, montoTeorico: 260, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 460 },
        { id: "reg_26_innci_07", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-02-21", mes: 2, numeroPeriodo: 7, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_08", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-02-28", mes: 2, numeroPeriodo: 8, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 2900, notas: "Liquidación mes febrero" },
        
        // Mar
        { id: "reg_26_sr_07", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-03-02", mes: 3, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 2000, montoExtra: 0, tipo: "Bono", estado: "Pagado", montoReal: 2000 },
        { id: "reg_26_sr_08", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-03-15", mes: 3, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_09", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-03-30", mes: 3, numeroPeriodo: 2, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_innci_09", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-03-07", mes: 3, numeroPeriodo: 9, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_10", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-03-14", mes: 3, numeroPeriodo: 10, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_11", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-03-21", mes: 3, numeroPeriodo: 11, horasReportadas: 10, precioHora: 52, diasTrabajados: 3, montoTeorico: 520, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 720 },
        { id: "reg_26_innci_12", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-03-28", mes: 3, numeroPeriodo: 12, horasReportadas: 10, precioHora: 52, diasTrabajados: 3, montoTeorico: 520, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 3000, notas: "Liquidación mes marzo" },
        
        // Abr
        { id: "reg_26_sr_10", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-04-05", mes: 4, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 2000, montoExtra: 5100, tipo: "Bono", estado: "Pagado", montoReal: 7100 },
        { id: "reg_26_sr_11", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-04-15", mes: 4, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_12", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-04-30", mes: 4, numeroPeriodo: 2, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_innci_13", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-04-04", mes: 4, numeroPeriodo: 13, horasReportadas: 3, precioHora: 52, diasTrabajados: 1, montoTeorico: 156, montoExtra: 70, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 226 },
        { id: "reg_26_innci_14", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-04-11", mes: 4, numeroPeriodo: 14, horasReportadas: 9, precioHora: 52, diasTrabajados: 2, montoTeorico: 468, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 668 },
        { id: "reg_26_innci_15", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-04-18", mes: 4, numeroPeriodo: 15, horasReportadas: 9, precioHora: 52, diasTrabajados: 2, montoTeorico: 468, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 668 },
        { id: "reg_26_innci_16", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-04-25", mes: 4, numeroPeriodo: 16, horasReportadas: 9, precioHora: 52, diasTrabajados: 2, montoTeorico: 468, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 2200, notas: "Liquidación mes abril" },
        
        // May
        { id: "reg_26_sr_13", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-05-05", mes: 5, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 2000, montoExtra: 0, tipo: "Bono", estado: "Pagado", montoReal: 2000 },
        { id: "reg_26_sr_14", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-05-15", mes: 5, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_15", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-05-30", mes: 5, numeroPeriodo: 2, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_innci_17", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-05-02", mes: 5, numeroPeriodo: 17, horasReportadas: 9, precioHora: 52, diasTrabajados: 2, montoTeorico: 468, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 668 },
        { id: "reg_26_innci_18", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-05-09", mes: 5, numeroPeriodo: 18, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_19", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-05-16", mes: 5, numeroPeriodo: 19, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_20", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-05-23", mes: 5, numeroPeriodo: 20, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_21", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-05-30", mes: 5, numeroPeriodo: 21, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 3300, notas: "Liquidación mes mayo" },
        
        // Jun
        { id: "reg_26_sr_16", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-06-05", mes: 6, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 2000, montoExtra: 0, tipo: "Bono", estado: "Pagado", montoReal: 2000 },
        { id: "reg_26_sr_17", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-06-15", mes: 6, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_18", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-06-30", mes: 6, numeroPeriodo: 2, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_innci_22", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-06-06", mes: 6, numeroPeriodo: 22, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_23", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-06-13", mes: 6, numeroPeriodo: 23, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 772 },
        { id: "reg_26_innci_24", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-06-20", mes: 6, numeroPeriodo: 24, horasReportadas: 10, precioHora: 52, diasTrabajados: 3, montoTeorico: 520, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 720 },
        { id: "reg_26_innci_25", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-06-27", mes: 6, numeroPeriodo: 25, horasReportadas: 11, precioHora: 52, diasTrabajados: 3, montoTeorico: 572, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pagado", montoReal: 3200, notas: "Liquidación mes junio" },
        
        // Jul
        { id: "reg_26_sr_19", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-07-05", mes: 7, numeroPeriodo: 3, diasTrabajados: 30, montoTeorico: 2000, montoExtra: 0, tipo: "Bono", estado: "Pagado", montoReal: 2000 },
        { id: "reg_26_sr_20", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-07-15", mes: 7, numeroPeriodo: 1, diasTrabajados: 15, montoTeorico: 5000, montoExtra: 0, tipo: "Quincena", estado: "Pagado", montoReal: 5000 },
        { id: "reg_26_sr_21", empresaId: "emp_sitio_random", empresaNombre: "Sitio Random", fecha: "2026-07-27", mes: 7, numeroPeriodo: 2, diasTrabajados: 28, montoTeorico: 15000, montoExtra: 0, tipo: "Finiquito", estado: "Pagado", montoReal: 15000, notas: "Finiquito, adeudos" },
        { id: "reg_26_innci_26", empresaId: "emp_innci", empresaNombre: "iNNCi", fecha: "2026-07-04", mes: 7, numeroPeriodo: 26, horasReportadas: 10, precioHora: 52, diasTrabajados: 3, montoTeorico: 520, montoExtra: 200, tipo: "Semana (Horas)", estado: "Pendiente", montoReal: 720 },
    ],
};

/**
 * Carga o fusiona los históricos 2025 y 2026 en Firestore para el usuario autenticado sin borrar ningún dato previo
 */
export const cargarHistoricosEnFirestore = async (uid) => {
    if (!uid) return false;

    // 1. Guardar o fusionar 2025
    const doc2025Actual = await obtenerIngresosAnio(uid, 2025);
    const data2025 = doc2025Actual
        ? {
            ...doc2025Actual,
            empresas: combinarEmpresasSinDuplicados(doc2025Actual.empresas, DATA_HISTORICA_2025.empresas),
            registros: combinarRegistrosSinDuplicados(doc2025Actual.registros, DATA_HISTORICA_2025.registros),
        }
        : DATA_HISTORICA_2025;
    await guardarIngresosDocumento(uid, 2025, data2025);

    // 2. Guardar o fusionar 2026
    const doc2026Actual = await obtenerIngresosAnio(uid, 2026);
    const data2026 = doc2026Actual
        ? {
            ...doc2026Actual,
            empresas: combinarEmpresasSinDuplicados(doc2026Actual.empresas, DATA_HISTORICA_2026.empresas),
            registros: combinarRegistrosSinDuplicados(doc2026Actual.registros, DATA_HISTORICA_2026.registros),
        }
        : DATA_HISTORICA_2026;
    await guardarIngresosDocumento(uid, 2026, data2026);

    return true;
};

const AJUSTE_INNCI_AGOSTO_2026 = "innciAgosto2026";

export const aplicarAjusteInnciAgosto2026 = async (uid, dataIngresos) => {
    if (
        !uid
        || Number(dataIngresos?.year) !== 2026
        || dataIngresos?.configuracion?.migraciones?.[AJUSTE_INNCI_AGOSTO_2026]
    ) {
        return dataIngresos;
    }

    const empresas = dataIngresos?.empresas || [];
    const indiceInnci = empresas.findIndex((empresa) => empresa.id === "emp_innci" || empresa.nombre?.toLowerCase().includes("innci"));
    if (indiceInnci < 0) return dataIngresos;

    const empresaInnci = {
        ...empresas[indiceInnci],
        precioHora: 137,
        liquidarCortesMensualmente: true,
    };
    const empresasActualizadas = [...empresas];
    empresasActualizadas[indiceInnci] = empresaInnci;

    const pagosNuevos = [
        {
            id: "reg_26_innci_liquidacion_julio",
            empresaId: empresaInnci.id,
            empresaNombre: empresaInnci.nombre || "iNNCi",
            fecha: "2026-07-31",
            mes: 7,
            numeroPeriodo: 27,
            diasTrabajados: null,
            horasReportadas: null,
            precioHora: null,
            montoTeorico: 3500,
            montoExtra: 0,
            tipo: "Liquidación",
            clasificacionCobro: "liquidacion",
            estado: "Pagado",
            montoReal: 3500,
            notas: "Liquidación iNNCi de julio",
        },
        {
            id: "reg_26_innci_quincena_agosto",
            empresaId: empresaInnci.id,
            empresaNombre: empresaInnci.nombre || "iNNCi",
            fecha: "2026-08-18",
            mes: 8,
            numeroPeriodo: 1,
            diasTrabajados: 15,
            horasReportadas: null,
            precioHora: null,
            precioUnitario: 3000,
            montoTeorico: 3000,
            montoExtra: 0,
            tipo: "Quincena",
            clasificacionCobro: "pago",
            estado: "Pagado",
            montoReal: 3000,
            notas: "Pago fijo iNNCi por 15 días",
        },
    ];

    const registrosExistentes = dataIngresos?.registros || [];
    const idsExistentes = new Set(registrosExistentes.map((registro) => registro.id));
    const yaExistePagoEquivalente = (pago) => registrosExistentes.some((registro) => (
        registro.empresaId === pago.empresaId
        && registro.fecha === pago.fecha
        && Number(registro.montoReal) === Number(pago.montoReal)
        && registro.tipo === pago.tipo
    ));
    const registros = [
        ...registrosExistentes,
        ...pagosNuevos.filter((registro) => !idsExistentes.has(registro.id) && !yaExistePagoEquivalente(registro)),
    ].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

    const dataActualizada = {
        ...dataIngresos,
        empresas: empresasActualizadas,
        registros,
        configuracion: {
            ...(dataIngresos?.configuracion || {}),
            migraciones: {
                ...(dataIngresos?.configuracion?.migraciones || {}),
                [AJUSTE_INNCI_AGOSTO_2026]: true,
            },
        },
    };

    await guardarIngresosDocumento(uid, 2026, dataActualizada);
    return dataActualizada;
};

const combinarEmpresasSinDuplicados = (existentes = [], nuevos = []) => {
    // Migrar 'emp_empleo_actual' o 'Empleo Actual' a 'CSLP-mex' si existe en Firestore
    const saneados = (existentes || []).map((item) => {
        if (item.id === "emp_empleo_actual" || item.nombre?.toLowerCase().includes("empleo actual")) {
            return {
                ...item,
                id: "emp_cslp_mex",
                nombre: "CSLP-mex",
                activo: true,
                color: "#00C49F",
                tipoEsquema: "quincenal",
                quincenaBase: 7500,
                ajustarViernesHabil: true,
                notas: "Pago cada 15 y fin de mes (o último viernes si cae fin de semana)",
            };
        }
        return item;
    });

    const map = new Map();
    saneados.forEach((item) => map.set(item.id || item.nombre, item));
    (nuevos || []).forEach((item) => {
        if (!map.has(item.id || item.nombre)) {
            map.set(item.id || item.nombre, item);
        } else {
            map.set(item.id || item.nombre, { ...map.get(item.id || item.nombre), ...item });
        }
    });
    return Array.from(map.values());
};

const combinarRegistrosSinDuplicados = (existentes = [], nuevos = []) => {
    const saneadosExistentes = (existentes || []).map((r) => {
        if (r.empresaId === "emp_empleo_actual" || r.empresaNombre?.toLowerCase().includes("empleo actual")) {
            return { ...r, empresaId: "emp_cslp_mex", empresaNombre: "CSLP-mex" };
        }
        return r;
    });

    const map = new Map();
    saneadosExistentes.forEach((item) => {
        const key = `${item.fecha}_${item.empresaId}_${item.numeroPeriodo}_${item.tipo}`;
        map.set(key, item);
    });
    (nuevos || []).forEach((item) => {
        const key = `${item.fecha}_${item.empresaId}_${item.numeroPeriodo}_${item.tipo}`;
        map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
};
