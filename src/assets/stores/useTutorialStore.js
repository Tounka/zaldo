import { create } from "zustand";

/*
 * Estado del tutorial guiado. Vive aparte de useModalStore porque no es un
 * modal: es una capa que se pone encima de todo y que otros avisos (como el de
 * gastos recurrentes) deben respetar mientras está abierta.
 */
export const useTutorialStore = create((set) => ({
    /* `true` mientras hay un tutorial en pantalla. */
    activo: false,
    setActivo: (activo) => set({ activo }),

    /*
     * Contador de peticiones manuales (botón "?"). El gestor reacciona a cada
     * cambio y lanza el tutorial de la ruta actual, aunque ya se haya visto.
     */
    pedido: 0,
    pedirTutorial: () => set((state) => ({ pedido: state.pedido + 1 })),
}));
