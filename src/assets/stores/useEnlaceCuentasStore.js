import { create } from "zustand";

/*
 * Estado del enlace visual entre cuentas del home.
 *
 * Flujo: el usuario mantiene Shift (o hace long press en móvil) y las cards se
 * arman con un borde dorado vibrante. El primer clic fija el origen, el segundo
 * fija el destino y dispara `onCompletar`, que abre el modal de movimiento
 * entre cuentas directamente en el paso 2.
 */
export const useEnlaceCuentasStore = create((set, get) => ({
    // Shift presionado: las cards se resaltan e invitan a seleccionar.
    armado: false,

    // Cuenta de salida ya elegida; mientras sea null estamos en el paso 1.
    cuentaOrigen: null,

    // Cuenta sobre la que está el puntero, para previsualizar la flecha.
    cuentaHover: null,

    /*
     * Rects de las cards en coordenadas de viewport, indexados por id de
     * cuenta. Los registra cada CardCuenta para que el lienzo de React Flow
     * pueda dibujar la flecha encuadrada sobre ellas.
     */
    rects: {},

    armar: () => {
        if (get().armado) return;
        set({ armado: true });
    },

    desarmar: () => {
        // Si ya hay un origen elegido el enlace sigue vivo aunque suelten Shift.
        if (get().cuentaOrigen) {
            set({ armado: false });
            return;
        }
        set({ armado: false, cuentaHover: null });
    },

    setCuentaHover: (cuenta) => set({ cuentaHover: cuenta }),

    seleccionarOrigen: (cuenta) => set({ cuentaOrigen: cuenta, cuentaHover: cuenta }),

    cancelar: () => set({ armado: false, cuentaOrigen: null, cuentaHover: null }),

    registrarRect: (id, rect) => {
        if (!id) return;
        set((prev) => ({ rects: { ...prev.rects, [String(id)]: rect } }));
    },

    olvidarRect: (id) => {
        if (!id) return;
        set((prev) => {
            const rects = { ...prev.rects };
            delete rects[String(id)];
            return { rects };
        });
    },
}));
