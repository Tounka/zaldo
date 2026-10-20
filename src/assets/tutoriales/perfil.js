/*
 * Tutorial de Perfil: acceso, preferencias y respaldo.
 */
import { FiDownloadCloud, FiKey, FiSliders, FiUser } from "react-icons/fi";

export const pasosPerfil = () => [
    {
        element: '[data-tour="perfil-datos"]',
        icono: FiUser,
        popover: {
            title: "Tu cuenta",
            description: "Tu nombre y correo. Si el correo no está verificado, puedes pedir el enlace aquí.",
        },
    },
    {
        element: '[data-tour="perfil-acceso"]',
        icono: FiKey,
        popover: {
            title: "Formas de entrar",
            description: "Vincula correo y contraseña o Google para entrar con cualquiera y conservar los mismos datos.",
        },
    },
    {
        element: '[data-tour="perfil-preferencias"]',
        icono: FiSliders,
        popover: {
            title: "Captura a tu medida",
            description: "Decide con qué arranca el formulario de movimientos y si ver centavos. Se guarda solo y te sigue a cualquier dispositivo.",
            side: "top",
        },
    },
    {
        element: '[data-tour="perfil-respaldo"]',
        icono: FiDownloadCloud,
        popover: {
            title: "Respalda tu información",
            description: "Descarga una copia completa en JSON o restaura un respaldo previo.",
            side: "top",
        },
    },
];
