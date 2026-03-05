import { create } from "zustand";
import { obtenerInstituciones } from "../funciones/firebase/instituciones";
import { obtenerCuentas } from "../funciones/firebase/cuentas";

export const useAppStore = create((set, get) => ({
    // ── Auth ──
    usuario: undefined,
    setUsuario: (usuario) => set({ usuario }),

    // ── Data ──
    cuentas: [],
    setCuentas: (cuentas) =>
        set({ cuentas: typeof cuentas === "function" ? cuentas(get().cuentas) : cuentas }),

    instituciones: [],
    setInstituciones: (instituciones) =>
        set({ instituciones: typeof instituciones === "function" ? instituciones(get().instituciones) : instituciones }),

    movimientos: [],
    setMovimientos: (movimientos) =>
        set({ movimientos: typeof movimientos === "function" ? movimientos(get().movimientos) : movimientos }),

    cuentaSeleccionada: {},
    setCuentaSeleccionada: (cuentaSeleccionada) => set({ cuentaSeleccionada }),

    // ── Acción: cargar datos iniciales desde Firestore ──
    cargarDatos: async (uid) => {
        const [instituciones, cuentas] = await Promise.all([
            obtenerInstituciones(uid),
            obtenerCuentas(uid),
        ]);
        const cuentasOrdenadas = [...cuentas].sort((a, b) => b.saldoALaFecha - a.saldoALaFecha);
        set({ instituciones, cuentas: cuentasOrdenadas });
    },
}));
