
import { createContext, useContext, useEffect, useState } from "react";


const ContextoModales = createContext();
export const ContextoModalesProvider = ({ children }) => {
    const [isOpenAgregarMovimiento, setIsOpenAgregarMovimiento] = useState(false);
    const [isOpenModificarTarjeta, setIsOpenModificarTarjeta] = useState(false);
    const [isOpenModificarMontoCuenta, setIsOpenModificarMontoCuenta] = useState(false);
    const [isOpenMovimientoEntreCuentas, setIsOpenMovimientoEntreCuentas] = useState(false);


    
    
    return (
        <ContextoModales.Provider value={{ isOpenAgregarMovimiento, setIsOpenAgregarMovimiento,isOpenModificarTarjeta, setIsOpenModificarTarjeta, isOpenModificarMontoCuenta, setIsOpenModificarMontoCuenta, isOpenMovimientoEntreCuentas, setIsOpenMovimientoEntreCuentas }}>
            {children}
        </ContextoModales.Provider>
    );
};
export const useContextoModales = () => {
    return useContext(ContextoModales);
};
