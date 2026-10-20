/*
 * Tutorial de Home. Cada paso apunta a un elemento marcado con `data-tour`;
 * si el elemento no está en pantalla (p. ej. no hay cuentas), el paso se salta.
 * Un paso sin `element` se muestra centrado.
 *
 * `icono` es un componente de react-icons que se pinta junto al título.
 *
 * Recibe `esTactil` porque varios gestos cambian entre ratón y dedo.
 */
import {
    FiCompass, FiCreditCard, FiHelpCircle, FiLayers, FiMenu, FiMic, FiPieChart, FiPlusCircle, FiZap,
} from "react-icons/fi";

export const pasosHome = ({ esTactil }) => [
    {
        icono: FiCompass,
        popover: {
            title: "Bienvenido a Zaldo",
            description: "Te muestro lo básico en menos de un minuto. Puedes salir con Esc o con el botón de cerrar cuando quieras.",
        },
    },
    {
        element: '[data-tour="resumenes"]',
        icono: FiPieChart,
        popover: {
            title: "Tu panorama en un vistazo",
            description: "Activos es lo que tienes, Pasivos lo que debes y Balance la diferencia. <b>Líquido real</b> es lo que puedes gastar hoy.",
        },
    },
    {
        element: '[data-tour="tarjeta-cuenta"]',
        icono: FiCreditCard,
        popover: {
            title: "Cada cuenta tiene dos lados",
            description: esTactil
                ? "Toca el <b>nombre</b> para editar la cuenta y el <b>monto</b> para ajustar su saldo. <b>Mantén presionada</b> una cuenta y luego toca otra para pasar dinero entre ellas."
                : "Haz clic en el <b>nombre</b> para editar la cuenta y en el <b>monto</b> para ajustar su saldo. Con <b>Shift + clic</b> en una cuenta y luego en otra pasas dinero entre ellas.",
        },
    },
    {
        element: '[data-tour="secciones-cuentas"]',
        icono: FiLayers,
        popover: {
            title: "Agrupadas por saldo",
            description: "Las cuentas se ordenan solas en Activos, Pasivos y Sin saldo. El <b>+</b> de cada grupo registra un movimiento en una de sus cuentas.",
            side: "top",
        },
    },
    {
        element: '[data-tour="menu-nuevo-movimiento"]',
        icono: FiPlusCircle,
        popover: {
            title: "Registra un movimiento",
            description: "Desde cualquier pantalla, este botón abre la captura de gastos e ingresos.",
        },
    },
    {
        element: '[data-tour="menu-titulo"]',
        icono: FiZap,
        popover: {
            title: "Atajo escondido",
            description: esTactil
                ? "Toca el saludo para ir a <b>Ahorros</b>. Mantenlo presionado para ir a <b>Cuentas</b>."
                : "Haz clic en el saludo para ir a <b>Ahorros</b>. Mantenlo presionado para ir a <b>Cuentas</b>.",
        },
    },
    {
        element: '[data-tour="menu-lateral"]',
        icono: FiMenu,
        popover: {
            title: "Todas las secciones",
            description: "Ingresos, movimientos, préstamos, despensa y tu perfil están en este menú.",
        },
    },
    {
        element: '[data-tour="asistente"]',
        icono: FiMic,
        popover: {
            title: "O simplemente díctalo",
            description: `Escríbele al asistente <i>“gasté 250 en comida con la tarjeta”</i>, mándale la foto de un ticket o pregúntale <i>“¿en qué gasté más este mes?”</i>. ${esTactil ? "Mantén presionado este botón" : "Mantén presionado el clic en este botón"} para dictarle directo.`,
            side: "top",
            align: "end",
        },
    },
    {
        element: '[data-tour="menu-ayuda"]',
        icono: FiHelpCircle,
        popover: {
            title: "¿Lo quieres repetir?",
            description: "Este botón vuelve a mostrar el tutorial de la pantalla en la que estés.",
        },
    },
];
