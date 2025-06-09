
import { createContext, useContext, useEffect, useState } from "react";
import { obtenerInstituciones } from "../funciones/firebase/instituciones";
import { obtenerCuentas } from "../funciones/firebase/cuentas";

const ContextoGeneral = createContext();



export const ContextoGeneralProvider = ({ children }) => {
    const [isOpenAgregarInstituciones, setIsOpenAgregarInstituciones] = useState(false);
    const [isOpenAgregarCuenta, setIsOpenAgregarCuenta] = useState(false);

    const [usuario, setUsuario] = useState(undefined);
    const [instituciones, setInstituciones] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState({});

    useEffect(() =>{
        const fetchData = async () =>{
            const instituciones = await obtenerInstituciones(usuario?.uid);
            const cuentas = await obtenerCuentas(usuario?.uid);
            setInstituciones(instituciones);
            setCuentas(cuentas);
        }

        if(usuario){
            fetchData();
        }
    },[usuario])
    return (
        <ContextoGeneral.Provider value={{ usuario, setUsuario,instituciones, isOpenAgregarInstituciones, setIsOpenAgregarInstituciones,isOpenAgregarCuenta, setIsOpenAgregarCuenta, cuentas, setCuentas,cuentaSeleccionada, setCuentaSeleccionada }}>
            {children}
        </ContextoGeneral.Provider>
    );
};

export const useContextoGeneral = () => {
    return useContext(ContextoGeneral);
};
