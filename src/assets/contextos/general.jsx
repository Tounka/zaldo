
import { createContext, useContext, useEffect, useState } from "react";
import { obtenerInstituciones } from "../funciones/firebase/instituciones";

const ContextoGeneral = createContext();



export const ContextoGeneralProvider = ({ children }) => {
    const [isOpenAgregarInstituciones, setIsOpenAgregarInstituciones] = useState(false);
    const [isOpenAgregarCuenta, setIsOpenAgregarCuenta] = useState(false);

    const [usuario, setUsuario] = useState(undefined);
    const [instituciones, setInstituciones] = useState([]);

    useEffect(() =>{
        const fetchData = async () =>{
            const cuentas = await obtenerInstituciones();
            setInstituciones(cuentas);
        }
        if(usuario){
            fetchData();
        }
    },[usuario])
    return (
        <ContextoGeneral.Provider value={{ usuario, setUsuario,instituciones, isOpenAgregarInstituciones, setIsOpenAgregarInstituciones,isOpenAgregarCuenta, setIsOpenAgregarCuenta }}>
            {children}
        </ContextoGeneral.Provider>
    );
};

export const useContextoGeneral = () => {
    return useContext(ContextoGeneral);
};
