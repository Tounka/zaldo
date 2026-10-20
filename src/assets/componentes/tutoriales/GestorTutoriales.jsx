import { createElement, useCallback, useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useLocation } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tutoriales.css";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { guardarPreferencias } from "../../funciones/firebase/preferencias";
import { obtenerTutorial } from "../../tutoriales";
import { rutaTopo } from "../topo/topoAssets";

/*
 * Lanza el tutorial de cada página. Vive en LayoutConMenu y no pinta nada.
 *
 * - La primera vez que se entra a una ruta con tutorial, se muestra solo.
 *   Cerrarlo o terminarlo cuenta como visto (`preferencias.tutorialesVistos`),
 *   así que no vuelve a salir en ningún dispositivo.
 * - El botón "?" del menú lo repite cuando se quiera (`pedirTutorial`).
 */

/* La página entra con una animación de 0.3 s tras la salida de la anterior. */
const ESPERA_TRAS_NAVEGAR_MS = 700;

/*
 * Muchas páginas cargan sus datos después de montarse (tablas, indicadores).
 * La primera vez se espera hasta que aparezcan todos los pasos, o hasta que
 * pase este tiempo, para no mostrar un tutorial a medias y darlo por visto.
 */
const INTERVALO_REVISION_MS = 400;
const ESPERA_MAXIMA_CONTENIDO_MS = 6000;

/*
 * Primer elemento visible para el selector. Escritorio y móvil a veces tienen
 * botones gemelos con la misma marca y uno está oculto con CSS.
 */
const elementoVisible = (selector) => Array.from(document.querySelectorAll(selector))
    .find((elemento) => elemento.getClientRects().length > 0) || null;

/* Pasos con su elemento ya resuelto; se saltan los que no están en pantalla. */
const resolverPasos = (tutorial, esTactil) => tutorial.pasos({ esTactil })
    .map((paso) => (paso.element ? { ...paso, element: elementoVisible(paso.element) } : paso))
    .filter((paso) => paso.element !== null);

/*
 * driver.js recibe HTML, así que los iconos de react-icons se pintan a SVG
 * aquí. El título queda con el icono en una insignia a su izquierda.
 */
const svg = (Icono) => renderToStaticMarkup(createElement(Icono, { "aria-hidden": true }));
const SVG_CERRAR = svg(FiX);

const conIcono = ({ icono, ...paso }) => (icono
    ? {
        ...paso,
        popover: {
            ...paso.popover,
            title: `<span class="zaldo-tour-icono">${svg(icono)}</span><span>${paso.popover.title}</span>`,
        },
    }
    : paso);

const marcarVisto = async (clave) => {
    const { usuario, preferencias, setPreferencias } = useAppStore.getState();
    if (!usuario?.uid || preferencias.tutorialesVistos?.[clave]) return;

    // setPreferencias solo mezcla el primer nivel: hay que conservar los demás.
    setPreferencias({
        tutorialesVistos: { ...preferencias.tutorialesVistos, [clave]: true },
    });

    try {
        await guardarPreferencias(usuario.uid, { tutorialesVistos: { [clave]: true } });
    } catch (error) {
        // Si falla, en el peor caso el tutorial se vuelve a ofrecer otro día.
        console.warn("No se pudo guardar el tutorial como visto.", error);
    }
};

/* Un modal abierto (p. ej. el acceso directo de la PWA) tiene prioridad. */
const seleccionarModalAbierto = (state) => (
    state.isOpenAgregarMovimiento
    || state.isOpenMovimientoEntreCuentas
    || state.isOpenAgregarCuenta
    || state.isOpenModificarTarjeta
    || state.isOpenModificarMontoCuenta
    || state.isOpenInstituciones
    || state.isOpenAgregarInstituciones
);

export const GestorTutoriales = () => {
    const { pathname } = useLocation();
    const usuarioUid = useAppStore((state) => state.usuario?.uid);
    const preferenciasCargadas = useAppStore((state) => state.preferenciasCargadas);
    const tutorialesVistos = useAppStore((state) => state.preferencias.tutorialesVistos);
    const hayModalAbierto = useModalStore(seleccionarModalAbierto);
    const pedido = useTutorialStore((state) => state.pedido);
    const setActivo = useTutorialStore((state) => state.setActivo);

    const instanciaRef = useRef(null);
    const ultimoPedidoRef = useRef(pedido);

    const lanzar = useCallback((tutorial) => {
        const esTactil = window.matchMedia?.("(pointer: coarse)").matches ?? false;

        const pasos = resolverPasos(tutorial, esTactil).map(conIcono);
        if (!pasos.length) return;

        instanciaRef.current?.destroy();

        const instancia = driver({
            steps: pasos,
            showProgress: true,
            progressText: "{{current}} de {{total}}",
            nextBtnText: "Siguiente",
            prevBtnText: "Atrás",
            doneBtnText: "Listo",
            popoverClass: "zaldo-tour",
            overlayColor: "#18161f",
            overlayOpacity: 0.55,
            stagePadding: 6,
            stageRadius: 12,
            // El botón de cerrar trae una "×" de texto; se cambia por el icono.
            onPopoverRender: (popover, { state }) => {
                popover.closeButton.innerHTML = SVG_CERRAR;
                popover.closeButton.setAttribute("aria-label", "Cerrar tutorial");
                // El topo se asoma por encima del globo: saluda al inicio,
                // señala en cada paso y festeja en el último.
                const indice = state.activeIndex ?? 0;
                const estado = indice === 0 ? "saludando" : indice === pasos.length - 1 ? "celebrando" : "senalando";
                const topo = document.createElement("img");
                topo.className = "zaldo-tour-topo";
                topo.src = rutaTopo(estado, 256);
                topo.alt = "";
                topo.setAttribute("aria-hidden", "true");
                popover.wrapper.prepend(topo);
            },
            onDestroyed: () => {
                instanciaRef.current = null;
                setActivo(false);
                marcarVisto(tutorial.clave);
            },
        });

        instanciaRef.current = instancia;
        setActivo(true);
        instancia.drive();
    }, [setActivo]);

    // Primera visita a la ruta.
    useEffect(() => {
        // Sin las preferencias reales aún, `tutorialesVistos` sería el valor por defecto.
        if (!usuarioUid || !preferenciasCargadas || hayModalAbierto) return;

        const tutorial = obtenerTutorial(pathname);
        if (!tutorial || tutorialesVistos?.[tutorial.clave]) return;

        const esTactil = window.matchMedia?.("(pointer: coarse)").matches ?? false;
        const totalPasos = tutorial.pasos({ esTactil }).length;
        const limite = Date.now() + ESPERA_TRAS_NAVEGAR_MS + ESPERA_MAXIMA_CONTENIDO_MS;
        let temporizador;

        const intentar = () => {
            if (instanciaRef.current) return;
            const listos = resolverPasos(tutorial, esTactil).length;
            if (listos < totalPasos && Date.now() < limite) {
                temporizador = setTimeout(intentar, INTERVALO_REVISION_MS);
                return;
            }
            lanzar(tutorial);
        };

        temporizador = setTimeout(intentar, ESPERA_TRAS_NAVEGAR_MS);
        return () => clearTimeout(temporizador);
    }, [usuarioUid, preferenciasCargadas, hayModalAbierto, pathname, tutorialesVistos, lanzar]);

    // Botón "?" del menú.
    useEffect(() => {
        if (pedido === ultimoPedidoRef.current) return;
        ultimoPedidoRef.current = pedido;

        const tutorial = obtenerTutorial(pathname);
        if (tutorial) lanzar(tutorial);
    }, [pedido, pathname, lanzar]);

    // Al cambiar de página, el tutorial anterior ya no apunta a nada.
    useEffect(() => () => instanciaRef.current?.destroy(), [pathname]);

    return null;
};
