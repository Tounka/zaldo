/*
 * Tutorial de Despensa. Los botones de escritorio y de móvil comparten
 * marca; el gestor usa el que esté visible.
 */
import { FiCamera, FiCoffee, FiGrid, FiLayers, FiPlusCircle } from "react-icons/fi";

export const pasosDespensa = () => [
    {
        element: '[data-tour="despensa-vistas"]',
        icono: FiLayers,
        popover: {
            title: "Vistas de la despensa",
            description: "<b>Inventario</b> (lo que tienes), <b>En el súper</b> (tu lista), <b>Gastar</b> (descontar lo que usas), <b>Conciliar</b> (contar lo real) y <b>Métricas</b>.",
        },
    },
    {
        element: '[data-tour="despensa-entrada"]',
        icono: FiPlusCircle,
        popover: {
            title: "Registra lo que compraste",
            description: "Agrega productos uno a uno, con código de barras o importando un ticket.",
        },
    },
    {
        element: '[data-tour="asistente"]',
        icono: FiCamera,
        popover: {
            title: "O mándale el ticket al asistente",
            description: "Abre el asistente y toma una foto del ticket con el botón de cámara: lee los productos, los agrega al inventario y registra el gasto cuando lo confirmas.",
            side: "top",
            align: "end",
        },
    },
    {
        element: '[data-tour="despensa-comidas"]',
        icono: FiCoffee,
        popover: {
            title: "Diario de comidas",
            description: "Registra lo que cocinas y se descuenta de la despensa con su costo.",
        },
    },
    {
        element: '[data-tour="despensa-areas"]',
        icono: FiGrid,
        popover: {
            title: "Filtra por área",
            description: "Cocina, limpieza, baño… cada área con su color.",
        },
    },
];
