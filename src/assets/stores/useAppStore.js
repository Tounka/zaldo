import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Timestamp } from "firebase/firestore";
import { obtenerInstituciones } from "../funciones/firebase/instituciones";
import { obtenerCuentas } from "../funciones/firebase/cuentas";

/*
 * Los Timestamp de Firestore no sobreviven a JSON.stringify: se serializan como
 * { seconds, nanoseconds } y pierden sus métodos. Este reviver los reconstruye al
 * leer de localStorage, para que `fecha.toDate()` siga funcionando en la UI.
 */
const revivirTimestamps = (_clave, valor) => {
    if (
        valor
        && typeof valor === "object"
        && !Array.isArray(valor)
        && typeof valor.seconds === "number"
        && typeof valor.nanoseconds === "number"
    ) {
        return new Timestamp(valor.seconds, valor.nanoseconds);
    }
    return valor;
};

export const useAppStore = create(persist((set, get) => ({
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

    // ── Cache por módulo ──
    ahorrosPorAnio: {},
    setAhorrosAnio: (uid, year, data) => set((state) => ({
        ahorrosPorAnio: {
            ...state.ahorrosPorAnio,
            [`${uid}_${year}`]: data,
        },
    })),

    despensaPorUsuario: {},
    setDespensaUsuario: (uid, data) => set((state) => ({
        despensaPorUsuario: {
            ...state.despensaPorUsuario,
            [uid]: data,
        },
    })),
    actualizarInventarioDespensa: (uid, inventario) => set((state) => ({
        despensaPorUsuario: {
            ...state.despensaPorUsuario,
            [uid]: {
                ...(state.despensaPorUsuario[uid] || {}),
                inventario,
            },
        },
    })),
    limpiarDespensa: (uid) => set((state) => {
        const copia = { ...state.despensaPorUsuario };
        delete copia[uid];
        return { despensaPorUsuario: copia };
    }),

    // ── Acción: cargar datos iniciales desde Firestore ──
    cargarDatos: async (uid) => {
        const [instituciones, cuentas] = await Promise.all([
            obtenerInstituciones(uid),
            obtenerCuentas(uid),
        ]);
        const cuentasOrdenadas = [...cuentas].sort((a, b) => b.saldoALaFecha - a.saldoALaFecha);
        set({ instituciones, cuentas: cuentasOrdenadas });
    },
}), {
    name: "zaldo-cache",
    version: 2,
    storage: createJSONStorage(() => localStorage, { reviver: revivirTimestamps }),
    /*
     * Solo se persiste la despensa. Es el módulo cuya lectura es más cara (un
     * documento grande) y el que menos cambia desde fuera, así que servirlo desde
     * localStorage evita la mayoría de las lecturas a Firestore.
     * El resto del estado (usuario, cuentas, movimientos) se rehidrata en cada
     * arranque desde Auth y Firestore.
     */
    partialize: (state) => ({ despensaPorUsuario: state.despensaPorUsuario }),
}));
