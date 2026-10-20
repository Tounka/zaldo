/*
 * Tutorial de Movimientos. Los pasos del registro (periodo, métricas, tabla)
 * solo existen en la pestaña "Registro"; en las demás se saltan solos.
 */
import {
    FiCalendar, FiFilter, FiLayers, FiList, FiPieChart, FiPlusCircle, FiSearch,
} from "react-icons/fi";

export const pasosMovimientos = ({ esTactil }) => [
    {
        element: '[data-tour="mov-secciones"]',
        icono: FiLayers,
        popover: {
            title: "Cuatro vistas en una",
            description: "<b>Registro</b> es tu historial, <b>Gasto personal</b> lo analiza, <b>Compras</b> guarda lo que planeas comprar y <b>Recurrentes</b> tus gastos fijos (renta, suscripciones).",
        },
    },
    {
        element: '[data-tour="mov-periodo"]',
        icono: FiCalendar,
        popover: {
            title: "Cambia de mes",
            description: "Usa las flechas para ver meses anteriores. Las métricas y la tabla se ajustan al periodo.",
        },
    },
    {
        element: '[data-tour="mov-nuevo"]',
        icono: FiPlusCircle,
        popover: {
            title: "Nuevo movimiento",
            description: "Registra un gasto o ingreso a mano. También puedes pedírselo al asistente.",
        },
    },
    {
        element: '[data-tour="mov-buscador"]',
        icono: FiSearch,
        popover: {
            title: "Búscalo rápido",
            description: "Filtra por cuenta, nota o categoría mientras escribes.",
        },
    },
    {
        element: '[data-tour="mov-metricas"]',
        icono: FiPieChart,
        popover: {
            title: "Tu mes en números",
            description: "Gastos, lo personal, lo que pagaste por terceros, ingresos y tu promedio diario. El <b>promedio base</b> deja fuera los gastos extraordinarios.",
        },
    },
    {
        element: '[data-tour="mov-filtros"]',
        icono: FiFilter,
        popover: {
            title: "Filtra la tabla",
            description: "Separa lo personal, lo de terceros y los movimientos internos (transferencias y ajustes de saldo), que no cuentan como gasto.",
        },
    },
    {
        element: '[data-tour="mov-tabla"]',
        icono: FiList,
        popover: {
            title: "Corrige lo que haga falta",
            description: `${esTactil ? "Toca" : "Haz clic en"} un movimiento para editarlo: monto, categoría, fecha o si fue personal o extraordinario.`,
            side: "top",
        },
    },
];
