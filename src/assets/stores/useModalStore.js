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

    /*
     * Acota el selector de cuentas del modal de movimiento a un subconjunto
     * (los ids del grupo desde el que se abrió: Activos, Pasivos, Sin Saldo).
     * `null` = sin acotar, se ofrecen todas las cuentas.
     */
    cuentasParaMovimiento: null,
    /*
     * Preselecciona una cuenta y salta el paso de selección. Se usa desde el
     * botón de "nuevo movimiento" de una cuenta concreta.
     */
    cuentaParaMovimiento: null,

    /*
     * Valores con los que arranca el formulario. Se usa al repetir un movimiento
     * y al confirmar un gasto recurrente; `null` = formulario en blanco.
     */
    valoresParaMovimiento: null,

    abrirAgregarMovimiento: ({ cuentas = null, cuenta = null, valores = null } = {}) => set({
        isOpenAgregarMovimiento: true,
        cuentasParaMovimiento: cuentas,
        cuentaParaMovimiento: cuenta,
        valoresParaMovimiento: valores,
    }),

    cerrarAgregarMovimiento: () => set({
        isOpenAgregarMovimiento: false,
        cuentasParaMovimiento: null,
        cuentaParaMovimiento: null,
        valoresParaMovimiento: null,
    }),

    isOpenMovimientoEntreCuentas: false,
    setIsOpenMovimientoEntreCuentas: (v) => set({ isOpenMovimientoEntreCuentas: v }),

    // Modales de cuenta
    isOpenModificarTarjeta: false,
    setIsOpenModificarTarjeta: (v) => set({ isOpenModificarTarjeta: v }),

    isOpenModificarMontoCuenta: false,
    setIsOpenModificarMontoCuenta: (v) => set({ isOpenModificarMontoCuenta: v }),
}));
