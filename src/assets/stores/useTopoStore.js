import { create } from "zustand";

/*
 * Apariciones del topo fuera de su lugar fijo: cuando algo se guarda, sale de
 * la tierra en una esquina, reacciona y se vuelve a meter (TopoFestejo).
 *
 * Cualquier función puede pedirlo con `festejarTopo(...)` sin depender de
 * React. Cada aparición lleva un id para que dos seguidas reinicien la
 * animación en vez de encimarse.
 */
export const useTopoStore = create((set) => ({
    aparicion: null,
    mostrar: (estado, texto) => set({ aparicion: { id: Date.now(), estado, texto } }),
    ocultar: (id) => set((state) => (state.aparicion?.id === id ? { aparicion: null } : state)),
}));

export const festejarTopo = (estado = "feliz", texto = "") => useTopoStore.getState().mostrar(estado, texto);
