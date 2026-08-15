/**
 * Utilidades matemáticas, fórmulas salariales, generadores de matriz mensual y exportación/importación CSV para el módulo de Ingresos.
 */

export const MESES_ANIO = [
    { num: 1, nombre: "Enero", corto: "Ene" },
    { num: 2, nombre: "Febrero", corto: "Feb" },
    { num: 3, nombre: "Marzo", corto: "Mar" },
    { num: 4, nombre: "Abril", corto: "Abr" },
    { num: 5, nombre: "Mayo", corto: "May" },
    { num: 6, nombre: "Junio", corto: "Jun" },
    { num: 7, nombre: "Julio", corto: "Jul" },
    { num: 8, nombre: "Agosto", corto: "Ago" },
    { num: 9, nombre: "Septiembre", corto: "Sep" },
    { num: 10, nombre: "Octubre", corto: "Oct" },
    { num: 11, nombre: "Noviembre", corto: "Nov" },
    { num: 12, nombre: "Diciembre", corto: "Dic" },
];

export const fnFormatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

export const formatFechaLegible = (fechaStr) => {
    if (!fechaStr) return "—";
    const d = new Date(fechaStr + "T12:00:00");
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

/**
 * Fórmulas de cálculo teórico según el esquema de la empresa
 */
export const calcularTeoricoPorHoras = ({
    horas = 0,
    precioHora = 52,
    bonoInternet = 240,
    aplicarResico = false,
    tasaIsrResico = 0.0125, // 1.25%
    tasaIva = 0.16,
    retencionIva = 0.106667, // 2/3 de IVA
}) => {
    const subtotalHoras = Number(horas || 0) * Number(precioHora || 0);
    const bruto = subtotalHoras + Number(bonoInternet || 0);

    if (!aplicarResico) {
        return {
            subtotalHoras,
            bonoInternet,
            bruto,
            retencionIsr: 0,
            retencionIva: 0,
            neto: bruto,
        };
    }

    const iva = bruto * tasaIva;
    const retIsr = bruto * tasaIsrResico;
    const retIva = bruto * retencionIva;
    const neto = bruto + iva - retIsr - retIva;

    return {
        subtotalHoras,
        bonoInternet,
        bruto,
        retencionIsr: retIsr,
        retencionIva: retIva,
        neto: Number(neto.toFixed(2)),
    };
};

export const calcularTeoricoDiarioSextoDia = ({
    diasTrabajados = 5,
    salarioDiario = 577,
    incluirSextoDia = true,
    bonosExtra = 0,
}) => {
    const d = Number(diasTrabajados || 0);
    const baseDiaria = d * Number(salarioDiario || 0);
    // 6to día por ley: proporcional (1/5 del salario por día trabajado)
    const sextoDia = incluirSextoDia && d > 0 ? (d / 5) * Number(salarioDiario || 0) : 0;
    const total = baseDiaria + sextoDia + Number(bonosExtra || 0);

    return {
        baseDiaria,
        sextoDia: Number(sextoDia.toFixed(2)),
        total: Number(total.toFixed(2)),
    };
};

/**
 * Calcula la Matriz de Resumen Mensual (Enero a Diciembre) agrupando por empresas y préstamos.
 */
export const calcularMatrizResumenMensual = (
    empresas = [],
    registros = [],
    ingresosExtra = [],
    prestamosPagos = [],
    incluirPrestamos = true,
    yearFiltro = null
) => {
    const matriz = MESES_ANIO.map((mes) => {
        const fila = {
            mesNum: mes.num,
            mesNombre: mes.nombre,
            mesCorto: mes.corto,
            numPagos: 0,
            porEmpresa: {},
            otros: 0,
            prestamos: 0,
            totalMes: 0,
        };

        // Inicializar columnas de empresas
        empresas.forEach((emp) => {
            fila.porEmpresa[emp.id] = 0;
        });

        // 1. Sumar registros de la empresa correspondientes a este mes y año
        registros.forEach((reg) => {
            const fechaD = new Date(reg.fecha + "T12:00:00");
            const regMes = !isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : Number(reg.mes);
            const regAnio = !isNaN(fechaD.getTime()) ? fechaD.getFullYear() : (yearFiltro || null);

            if (regMes === mes.num && (!yearFiltro || !regAnio || regAnio === Number(yearFiltro))) {
                // Usar monto real si está pagado, o teórico si está pendiente
                const montoAUsar = reg.montoReal !== undefined && reg.montoReal !== null && reg.montoReal !== ""
                    ? Number(reg.montoReal)
                    : Number(reg.montoTeorico || 0) + Number(reg.montoExtra || 0);

                if (fila.porEmpresa[reg.empresaId] !== undefined) {
                    fila.porEmpresa[reg.empresaId] += montoAUsar;
                } else {
                    fila.otros += montoAUsar;
                }

                fila.numPagos += 1;
                fila.totalMes += montoAUsar;
            }
        });

        // 2. Sumar ingresos extra
        ingresosExtra.forEach((ext) => {
            const extD = new Date(ext.fecha + "T12:00:00");
            const extMes = !isNaN(extD.getTime()) ? extD.getMonth() + 1 : Number(ext.mes);
            if (extMes === mes.num) {
                const montoExt = Number(ext.monto || 0);
                fila.otros += montoExt;
                fila.totalMes += montoExt;
                fila.numPagos += 1;
            }
        });

        // 3. Sumar cobros de préstamos si aplica
        if (Array.isArray(prestamosPagos)) {
            prestamosPagos.forEach((pago) => {
                const pagoFecha = pago.fecha?.seconds
                    ? new Date(pago.fecha.seconds * 1000)
                    : new Date(pago.fecha);
                if (!isNaN(pagoFecha.getTime()) && pagoFecha.getMonth() + 1 === mes.num) {
                    const montoPrestamo = Number(pago.monto || 0);
                    fila.prestamos += montoPrestamo;
                    if (incluirPrestamos) {
                        fila.totalMes += montoPrestamo;
                    }
                }
            });
        }

        return fila;
    });

    // Fila de Totales Anuales
    const totalAnual = {
        mesNombre: "TOTAL ANUAL",
        numPagos: matriz.reduce((acc, m) => acc + m.numPagos, 0),
        porEmpresa: {},
        otros: matriz.reduce((acc, m) => acc + m.otros, 0),
        prestamos: matriz.reduce((acc, m) => acc + m.prestamos, 0),
        totalMes: matriz.reduce((acc, m) => acc + m.totalMes, 0),
    };

    empresas.forEach((emp) => {
        totalAnual.porEmpresa[emp.id] = matriz.reduce((acc, m) => acc + (m.porEmpresa[emp.id] || 0), 0);
    });

    return { matriz, totalAnual };
};

/**
 * Genera y descarga un archivo CSV con la Matriz Resumen Mensual
 */
export const exportarMatrizACSV = (empresas, matriz, totalAnual, year, incluirPrestamos) => {
    const headers = ["Mes", "# Pagos", ...empresas.map((e) => `"${e.nombre}"`), "Otros"];
    if (incluirPrestamos) headers.push("Préstamos");
    headers.push("Total");

    const filasCSV = [headers.join(",")];

    matriz.forEach((m) => {
        const fila = [
            m.mesNombre,
            m.numPagos,
            ...empresas.map((e) => (m.porEmpresa[e.id] || 0).toFixed(2)),
            (m.otros || 0).toFixed(2),
        ];
        if (incluirPrestamos) fila.push((m.prestamos || 0).toFixed(2));
        fila.push((m.totalMes || 0).toFixed(2));
        filasCSV.push(fila.join(","));
    });

    // Fila Total
    const filaTot = [
        "TOTAL ANUAL",
        totalAnual.numPagos,
        ...empresas.map((e) => (totalAnual.porEmpresa[e.id] || 0).toFixed(2)),
        (totalAnual.otros || 0).toFixed(2),
    ];
    if (incluirPrestamos) filaTot.push((totalAnual.prestamos || 0).toFixed(2));
    filaTot.push((totalAnual.totalMes || 0).toFixed(2));
    filasCSV.push(filaTot.join(","));

    const blob = new Blob([filasCSV.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Resumen_Ingresos_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Genera y descarga un archivo CSV con todos los pagos detallados de una empresa o generales
 */
export const exportarRegistrosEmpresaACSV = (empresaNombre, registros, year) => {
    const headers = [
        "Fecha",
        "Periodo / Semana",
        "Días Trabajados",
        "Horas",
        "Precio Hora",
        "Monto Teórico",
        "Monto Extra",
        "Tipo",
        "Estado",
        "Monto Real Pagado",
        "Notas",
    ];

    const filasCSV = [headers.join(",")];

    registros.forEach((r) => {
        filasCSV.push([
            r.fecha || "",
            r.numeroPeriodo || "",
            r.diasTrabajados || "",
            r.horasReportadas || "",
            r.precioHora || "",
            r.montoTeorico || 0,
            r.montoExtra || 0,
            `"${r.tipo || ""}"`,
            `"${r.estado || ""}"`,
            r.montoReal !== undefined ? r.montoReal : "",
            `"${(r.notas || "").replace(/"/g, '""')}"`,
        ].join(","));
    });

    const blob = new Blob([filasCSV.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Detalle_Ingresos_${empresaNombre.replace(/\s+/g, "_")}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Parsea texto pegado de la tabla de Sitio Random (formato quincenal)
 */
export const parsearTablaSitioRandom = (texto, empresaId, empresaNombre) => {
    const lineas = texto.trim().split("\n").filter((l) => l.trim());
    const registros = [];

    lineas.forEach((linea) => {
        const cols = linea.split("\t").map((c) => c.trim());
        if (cols.length < 4) return;

        // Si es cabecera, ignorar
        if (cols[0].toLowerCase().includes("pago") || cols[0].toLowerCase().includes("fecha") || cols[0].toLowerCase().includes("dias")) return;

        const fechaRaw = cols[0]; // ej. 29/08/2025
        const fechaIso = normalizarFecha(fechaRaw);
        const numeroPeriodo = parseInt(cols[1]) || 1;
        const diasTrabajados = parseFloat(cols[2]) || 15;
        const montoTeorico = parseFloat(cols[3].replace(/[$,]/g, "")) || 0;
        const totalMasSexto = parseFloat(cols[4]?.replace(/[$,]/g, "")) || montoTeorico;
        const montoExtra = Math.max(0, totalMasSexto - montoTeorico);
        const tipo = cols[5] || "Quincena";
        const estado = cols[6] || "Pagado";
        const pagoReal = cols[7] ? parseFloat(cols[7].replace(/[$,]/g, "")) : (totalMasSexto || montoTeorico);
        const notas = cols[8] || "";

        registros.push({
            id: "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            empresaId,
            empresaNombre,
            fecha: fechaIso,
            numeroPeriodo,
            diasTrabajados,
            horasReportadas: null,
            precioHora: null,
            montoTeorico,
            montoExtra,
            tipo,
            estado,
            montoReal: isNaN(pagoReal) ? (totalMasSexto || montoTeorico) : pagoReal,
            notas,
        });
    });

    return registros;
};

/**
 * Parsea texto pegado de la tabla de iNNCi (formato semanal por horas)
 */
export const parsearTablaiNNCi = (texto, empresaId, empresaNombre) => {
    const lineas = texto.trim().split("\n").filter((l) => l.trim());
    const registros = [];

    lineas.forEach((linea) => {
        const cols = linea.split("\t").map((c) => c.trim());
        if (cols.length < 5) return;

        if (cols[0].toLowerCase().includes("semana") || cols[1].toLowerCase().includes("horas") || cols[2].toLowerCase().includes("fecha")) return;

        // Formato: #, #mes, Fecha, Horas, $Horas, Dias, Bono Internet, Neto, Bruto, Estado, T.Neto, Pago Bruto, Pagado
        const numeroSemana = parseInt(cols[0]) || 1;
        const fechaRaw = cols[2]; // ej. 10/1/2026
        const fechaIso = normalizarFecha(fechaRaw);
        const horas = parseFloat(cols[3]) || 0;
        const subtotalHoras = parseFloat(cols[4]?.replace(/[$,]/g, "")) || horas * 52;
        const precioHora = horas > 0 ? Number((subtotalHoras / horas).toFixed(2)) : 52;
        const diasTrabajados = parseFloat(cols[5]) || 3;
        const bonoInternet = parseFloat(cols[6]?.replace(/[$,]/g, "")) || 200;
        const netoTeorico = parseFloat(cols[7]?.replace(/[$,]/g, "")) || subtotalHoras + bonoInternet;
        const estado = cols[9] || "Pagado";
        const pagoReal = cols[12] ? parseFloat(cols[12].replace(/[$,]/g, "")) : (cols[11] ? parseFloat(cols[11].replace(/[$,]/g, "")) : netoTeorico);

        registros.push({
            id: "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            empresaId,
            empresaNombre,
            fecha: fechaIso,
            numeroPeriodo: numeroSemana,
            diasTrabajados,
            horasReportadas: horas,
            precioHora,
            montoTeorico: subtotalHoras,
            montoExtra: bonoInternet,
            tipo: "Semana (Horas)",
            estado: estado.toLowerCase().includes("pendiente") ? "Pendiente" : "Pagado",
            montoReal: isNaN(pagoReal) || pagoReal === 0 ? netoTeorico : pagoReal,
            notas: cols[10] && cols[10] !== "0" ? `Total Neto: ${cols[10]}` : "",
        });
    });

    return registros;
};

/**
 * Parsea una matriz mensual pegada directamente (Mes | # pagos | Empresa1 | Empresa2... | Total)
 */
export const parsearMatrizMensualPegada = (texto) => {
    const lineas = texto.trim().split("\n").filter((l) => l.trim());
    if (lineas.length < 2) return null;

    const encabezados = lineas[0].split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
    const empresasNombres = [];

    for (let i = 2; i < encabezados.length; i++) {
        const nom = encabezados[i];
        if (nom && !nom.toLowerCase().includes("total") && !nom.toLowerCase().includes("otros")) {
            empresasNombres.push(nom);
        }
    }

    const registrosMeses = [];

    for (let r = 1; r < lineas.length; r++) {
        const cols = lineas[r].split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
        const mesNombre = cols[0]?.toLowerCase();
        if (!mesNombre || mesNombre.includes("total") || mesNombre.includes("mes")) continue;

        const mesObj = MESES_ANIO.find((m) => m.nombre.toLowerCase().startsWith(mesNombre.substring(0, 3)));
        if (!mesObj) continue;

        const numPagos = parseInt(cols[1]) || 0;
        const valoresEmpresas = {};

        empresasNombres.forEach((empNom, idx) => {
            const colIdx = 2 + idx;
            const valStr = cols[colIdx]?.replace(/[$,]/g, "").trim() || "0";
            valoresEmpresas[empNom] = parseFloat(valStr) || 0;
        });

        registrosMeses.push({
            mesNum: mesObj.num,
            mesNombre: mesObj.nombre,
            numPagos,
            valoresEmpresas,
        });
    }

    return { empresasNombres, registrosMeses };
};

/**
 * Normaliza fechas 'DD/MM/YYYY' o 'D/M/YYYY' a 'YYYY-MM-DD'
 */
const normalizarFecha = (str) => {
    if (!str) return new Date().toISOString().split("T")[0];
    const partes = str.split("/");
    if (partes.length === 3) {
        const dia = partes[0].padStart(2, "0");
        const mes = partes[1].padStart(2, "0");
        const anio = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
        return `${anio}-${mes}-${dia}`;
    }
    return str;
};
