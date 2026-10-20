/*
 * Tutorial de Cuentas: las tarjetas agrupadas por tipo.
 */
import { FiCreditCard, FiRepeat } from "react-icons/fi";

export const pasosCuentas = ({ esTactil }) => [
    {
        element: '[data-tour="cuentas-grupo"]',
        icono: FiCreditCard,
        popover: {
            title: "Tus cuentas por tipo",
            description: "Crédito, débito, efectivo e inversión. En crédito ves deuda contra límite y fechas de corte; en débito, el avance hacia tu meta de ahorro.",
        },
    },
    {
        element: '[data-tour="cuenta-tarjeta"]',
        icono: FiRepeat,
        popover: {
            title: "Edita o mueve dinero",
            description: esTactil
                ? "Toca una tarjeta para editar sus datos: límite, fechas, beneficios y diseño."
                : "Haz clic en una tarjeta para editar sus datos. Con <b>Shift + clic</b> abres una transferencia: hacia una tarjeta de crédito, como pago; desde las demás, como origen.",
        },
    },
];
