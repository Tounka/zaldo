import { playSound, preloadSound } from "./motorSonido";
import * as recetas from "./recetas";
import { useAppStore } from "../../stores/useAppStore";

/*
 * Punto único de sonidos de la app. Los componentes piden un *momento*
 * ("consumir", "compra") y no una receta: así cambiar cómo suena algo es
 * tocar una línea aquí y no buscar cada llamada.
 *
 * El motor sintetiza cada sonido con Web Audio la primera vez y lo cachea; no
 * hay archivos de audio que descargar.
 */
const MOMENTOS = {
    /* "Usé 1" y descuentos de inventario. */
    consumir: { receta: recetas.blop },
    /* Tocar un producto para meterlo al carrito del súper. */
    agregarCarrito: { receta: recetas.pickup, tune: { volume: -4 } },
    /* Sacarlo del carrito. */
    quitarCarrito: { receta: recetas.release, tune: { volume: -6 } },
    /* "Agregar todo lo que falta" al carrito. */
    llenarCarrito: { receta: recetas.coin },
    /* Compra registrada: entrada rápida, súper o ticket con IA. */
    compra: { receta: recetas.receipt, tune: { length: 1.4 } },
    /* Campana de "necesario" encendida. */
    necesario: { receta: recetas.ping, tune: { volume: -8 } },
    /* Conciliación física aplicada. */
    conciliar: { receta: recetas.seal },
    /* Comida registrada en el diario. */
    comida: { receta: recetas.bubble },
    /* Deshacer la última acción. */
    deshacer: { receta: recetas.undo },
    /* Cambio de vista o pestaña. */
    cambioVista: { receta: recetas.tab, tune: { volume: -6 } },
    /* Cualquier otra acción que salió bien. */
    exito: { receta: recetas.check },
    /* Algo salió mal. */
    error: { receta: recetas.shrug },
    /* El topo escarbando la tierra antes de aparecer. */
    escarbar: { receta: recetas.shuffle, tune: { volume: -6 } },
    /* El topo asomándose en su burbuja. */
    aparecer: { receta: recetas.appear },
    /* Entrada a la app tras iniciar sesión. */
    bienvenida: { receta: recetas.arrive, tune: { volume: -4 } },
};

const sonidosActivos = () => useAppStore.getState().preferencias?.sonidosActivos !== false;

/*
 * Reproduce el sonido de un momento. Nunca lanza: un navegador sin Web Audio o
 * con el audio bloqueado no debe romper la acción que lo disparó.
 */
export const sonar = (momento) => {
    const definicion = MOMENTOS[momento];
    if (!definicion || typeof window === "undefined" || !sonidosActivos()) return;
    playSound(definicion.receta, definicion.tune).catch(() => {});
};

/*
 * Pre-renderiza los sonidos de una pantalla para que el primero no llegue
 * tarde. El AudioContext se crea suspendido hasta el primer gesto del usuario,
 * así que llamarlo al montar es seguro.
 */
export const precargarSonidos = (momentos = Object.keys(MOMENTOS)) => {
    if (typeof window === "undefined" || !sonidosActivos()) return;
    momentos.forEach((momento) => {
        const definicion = MOMENTOS[momento];
        if (definicion) preloadSound(definicion.receta, definicion.tune);
    });
};
