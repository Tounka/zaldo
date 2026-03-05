import { create } from "zustand";

export const useModalStore = create((set) => ({
    // Barra lateral / menú
    isOpenInstituciones: false,
    setIsOpenInstituciones: (v) => set({ isOpenInstituciones: v }),

    isOpenAgregarInstituciones: false,
    setIsOpenAgregarInstituciones: (v) => set({ isOpenAgregarInstituciones: v }),

    isOpenAgregarCuenta: false,
    setIsOpenAgregarCuenta: (v) => set({ isOpenAgregarCuenta: v }),

    // Modales de movimientos
    isOpenAgregarMovimiento: false,
    setIsOpenAgregarMovimiento: (v) => set({ isOpenAgregarMovimiento: v }),

    isOpenMovimientoEntreCuentas: false,
    setIsOpenMovimientoEntreCuentas: (v) => set({ isOpenMovimientoEntreCuentas: v }),

    // Modales de cuenta
    isOpenModificarTarjeta: false,
    setIsOpenModificarTarjeta: (v) => set({ isOpenModificarTarjeta: v }),

    isOpenModificarMontoCuenta: false,
    setIsOpenModificarMontoCuenta: (v) => set({ isOpenModificarMontoCuenta: v }),
}));
