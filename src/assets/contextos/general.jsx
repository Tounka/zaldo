
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

    const [movimientos, setMovimientos] = useState([]);
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState({});

    const [actualizador, setActualizador] = useState(0);

    useEffect(() =>{
        const fetchData = async () =>{
            const instituciones = await obtenerInstituciones(usuario?.uid);
            const cuentas = await obtenerCuentas(usuario?.uid);
            setInstituciones(instituciones);
            let cuentasOrdendas = cuentas.sort((a,b) =>   b.saldoALaFecha -a.saldoALaFecha )
            setCuentas(cuentasOrdendas);
        }
        if(usuario){
            fetchData();
        }
    },[usuario]);

    

    useEffect(() =>{
        let prevCuentas = cuentas;
        let prevInstituciones = instituciones;

        setCuentas([]);
        setInstituciones([]);
        
        setCuentas(prevCuentas);
        setInstituciones(prevInstituciones);


    },[actualizador]);


    return (
        <ContextoGeneral.Provider value={{ usuario, setUsuario,instituciones, isOpenAgregarInstituciones, setIsOpenAgregarInstituciones,isOpenAgregarCuenta, setIsOpenAgregarCuenta, cuentas, setCuentas,cuentaSeleccionada, setCuentaSeleccionada, setInstituciones, setMovimientos, movimientos}}>
            {children}
        </ContextoGeneral.Provider>
    );
};

export const useContextoGeneral = () => {
    return useContext(ContextoGeneral);
};
