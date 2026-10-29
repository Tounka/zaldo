/*
 * Tutoriales de Ahorros: la vista del año y la vista anual comparada.
 */
import { FiArrowLeft, FiBarChart2, FiCalendar, FiGrid, FiTarget, FiTrendingUp } from "react-icons/fi";

export const pasosAhorros = () => [
    {
        element: '[data-tour="ahorros-anios"]',
        icono: FiCalendar,
        popover: {
            title: "Años de ahorro",
            description: "Tu año de ahorro va de <b>agosto a julio</b>. Usa las flechas para ir a años anteriores o al siguiente.",
        },
    },
    {
        element: '[data-tour="ahorros-kpis"]',
        icono: FiTarget,
        popover: {
            title: "Capital y meta",
            description: "Con cuánto empezaste, cuánto llevas y qué tan cerca vas de tu meta anual. Puedes editar la meta y el capital inicial.",
        },
    },
    {
        element: '[data-tour="ahorros-tabla"]',
        icono: FiGrid,
        popover: {
            title: "Dónde está tu dinero",
            description: "Líquido, inversiones, largo plazo y responsabilidades. Edita montos y nombres directo en la tabla; cada cambio queda en el historial.",
            side: "top",
        },
    },
    {
        element: '[data-tour="ahorros-grafica"]',
        icono: FiTrendingUp,
        popover: {
            title: "Cómo ha crecido",
            description: "Elige la gráfica: evolución, incrementos y su origen (intereses, cashback, aumentos a capital).",
            side: "top",
        },
    },
    {
        element: '[data-tour="ahorros-vista-anual"]',
        icono: FiBarChart2,
        popover: {
            title: "Compara años",
            description: "La vista anual pone tus años de ahorro lado a lado.",
        },
    },
];

export const pasosAhorrosAnual = () => [
    {
        element: '[data-tour="anual-graficas"]',
        icono: FiBarChart2,
        popover: {
            title: "Tus años, comparados",
            description: "Cada gráfica abre con su conclusión: si vas mejor que el año pasado, cuánto pagan tus cuentas, tus mejores meses y de dónde vino cada peso. Arriba eliges qué años incluir.",
            side: "top",
        },
    },
    {
        element: '[data-tour="anual-volver"]',
        icono: FiArrowLeft,
        popover: {
            title: "Regresa al año actual",
            description: "Vuelve a Mis Ahorros para editar tus cuentas.",
        },
    },
];
