/*
 * Tutorial de Préstamos: notas de deuda, abonos y recordatorios de cobro.
 */
import { FiAlertCircle, FiFilePlus, FiFilter, FiList, FiPieChart } from "react-icons/fi";

export const pasosPrestamos = () => [
    {
        element: '[data-tour="pres-nueva"]',
        icono: FiFilePlus,
        popover: {
            title: "Nueva nota de deuda",
            description: "Registra a quién le prestaste, cuánto, el interés y cada cuándo te paga.",
        },
    },
    {
        element: '[data-tour="pres-kpis"]',
        icono: FiPieChart,
        popover: {
            title: "Cómo va tu cartera",
            description: "Total prestado, lo ya cobrado, el saldo pendiente y cuántas notas siguen activas.",
        },
    },
    {
        element: '[data-tour="pres-recordatorios"]',
        icono: FiAlertCircle,
        popover: {
            title: "Próximos cobros",
            description: "Aquí aparecen los pagos que tocan o están vencidos, con el monto sugerido para cobrarlos en un toque.",
        },
    },
    {
        element: '[data-tour="pres-filtros"]',
        icono: FiFilter,
        popover: {
            title: "Encuentra una nota",
            description: "Filtra por estado o busca por deudor o notas.",
        },
    },
    {
        element: '[data-tour="pres-tabla"]',
        icono: FiList,
        popover: {
            title: "Abonos e historial",
            description: "En cada nota registras abonos, ves el historial con su comprobante y editas o archivas la nota.",
            side: "top",
        },
    },
];
