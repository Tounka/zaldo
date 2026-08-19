import { formatFechaLegible } from "./prestamosCalculos";

export const obtenerTipoPrestamo = (prestamo) => {
    if (prestamo.tipoPeriodicidad === "fechas_especificas") return "Fecha única";
    if (prestamo.tipoPeriodicidad === "dias_mes") return "Quincenal";
    if (prestamo.tipoPeriodicidad === "frecuencia_dias") return `Cada ${prestamo.diasDePago || 7} días`;
    return "Abonos libres";
};

const parseFechaLocal = (valor) => {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [anio, mes, dia] = valor.split("-").map(Number);
        return new Date(anio, mes - 1, dia, 12, 0, 0);
    }
    const fecha = valor.seconds ? new Date(valor.seconds * 1000) : new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
};

export const obtenerProximoPago = (prestamo) => {
    const fechaGuardada = prestamo.proximaFechaPago || prestamo.fechaProximoPago || prestamo.fechaSiguientePago;
    if (fechaGuardada) return formatFechaLegible(fechaGuardada);

    if (prestamo.tipoPeriodicidad === "fechas_especificas" && prestamo.fechasEspecificas?.[0]) {
        return formatFechaLegible(parseFechaLocal(prestamo.fechasEspecificas[0]));
    }

    if (prestamo.tipoPeriodicidad === "dias_mes") {
        const dias = (Array.isArray(prestamo.diasMes) && prestamo.diasMes.length > 0 ? prestamo.diasMes : [15, 30])
            .map(Number)
            .filter((dia) => dia > 0);
        const hoy = new Date();
        for (let offset = 0; offset < 3; offset += 1) {
            const mes = hoy.getMonth() + offset;
            const ultimoDia = new Date(hoy.getFullYear(), mes + 1, 0).getDate();
            const candidato = dias
                .map((dia) => new Date(hoy.getFullYear(), mes, Math.min(dia, ultimoDia), 12, 0, 0))
                .find((fecha) => fecha >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0));
            if (candidato) return formatFechaLegible(candidato);
        }
    }

    if (prestamo.tipoPeriodicidad === "frecuencia_dias" || (!prestamo.tipoPeriodicidad && prestamo.diasDePago)) {
        const intervalo = Math.max(1, Number(prestamo.diasDePago || 15));
        const inicio = parseFechaLocal(prestamo.fechaInicio || prestamo.fechaCreacion) || new Date();
        const hoy = new Date();
        const diasTranscurridos = Math.max(0, Math.ceil((hoy - inicio) / 86400000));
        const siguiente = new Date(inicio);
        siguiente.setDate(inicio.getDate() + Math.ceil(diasTranscurridos / intervalo) * intervalo);
        return formatFechaLegible(siguiente);
    }

    return "Por acordar";
};
