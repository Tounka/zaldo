/*
 * Tutorial de Ingresos: el año, los indicadores y las empresas o fuentes de
 * las que cobras.
 */
import { FiBarChart2, FiBriefcase, FiCalendar, FiPlusCircle, FiTrendingUp } from "react-icons/fi";

export const pasosIngresos = () => [
    {
        element: '[data-tour="ing-anio"]',
        icono: FiCalendar,
        popover: {
            title: "Un año a la vez",
            description: "Cambia de año con las flechas. Cada año guarda sus empresas y cobros.",
        },
    },
    {
        element: '[data-tour="ing-acciones"]',
        icono: FiPlusCircle,
        popover: {
            title: "Registra un cobro",
            description: "Agrega un pago recibido. Con el botón de datos puedes importar desde Excel o descargar tus registros.",
        },
    },
    {
        element: '[data-tour="ing-kpis"]',
        icono: FiTrendingUp,
        popover: {
            title: "Lo que llevas cobrado",
            description: "Total percibido, tu promedio mensual y lo que está <b>pendiente por cobrar</b>.",
        },
    },
    {
        element: '[data-tour="ing-empresas"]',
        icono: FiBriefcase,
        popover: {
            title: "Tus fuentes de ingreso",
            description: "El <b>resumen mensual</b> junta todo; cada pestaña es una empresa o cliente con sus pagos. Arrastra para reordenarlas y usa su menú para editarlas o generar periodos.",
        },
    },
    {
        element: '[data-tour="ing-analitica"]',
        icono: FiBarChart2,
        popover: {
            title: "Análisis",
            description: "Despliega gráficas de cómo se reparten y evolucionan tus ingresos.",
            side: "top",
        },
    },
];
