import styled from "styled-components";
import { CardCuentaTarjeta } from "../../componentes/cards/cardCuentaTarjeta";
import { VisorTarjetas } from "../../componentes/cuentas/VisorTarjetas";
import { useAppStore } from "../../stores/useAppStore"
import { useCallback, useMemo, useState } from "react";
import { FaCreditCard, FaMoneyBillWave, FaPiggyBank, FaUniversity } from "react-icons/fa";
import { DesplegableMovil } from "../../componentes/genericos/responsivo";
import { ocultarEnMovil } from "../../componentes/genericos/responsivoEstilos";

const ContenedorResumenCuentas = styled.div`
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    padding-bottom: 8px;

    @media (max-width: 680px) {
        gap: 10px;
    }
`
const ContenedorCuentas = styled.div`
    width: 100%;
    max-width: 1200px;
    height: auto;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin: 0 auto;
`

const ContenedorTitular = styled.div`
    width: 100%;
    max-width: 1200px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    line-height: 1.1;

    color: var(--colorPrincipal);
    font-size: 34px;
    
    font-weight: bold;

    /* En celular el título lo pone el desplegable del grupo. */
    ${ocultarEnMovil}
`

const Grupo = styled(DesplegableMovil)`
    width: 100%;
    max-width: 1200px;

    /* Mismo acomodo que antes en escritorio: título arriba y tarjetas centradas. */
    @media (min-width: 681px) {
        > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 18px;
        }
    }
`

const TIPOS = [
    { tipo: "credito", titulo: "Crédito", icono: <FaCreditCard /> },
    { tipo: "debito", titulo: "Débito", icono: <FaUniversity /> },
    { tipo: "efectivo", titulo: "Efectivo", icono: <FaMoneyBillWave /> },
    { tipo: "inversion", titulo: "Inversión", icono: <FaPiggyBank /> },
];

const ordenarCuentas = (cuentas) => [...(cuentas || [])].sort((a, b) => {
    const preferidaA = Number(Boolean(a?.preferida));
    const preferidaB = Number(Boolean(b?.preferida));
    const totalA = (a?.saldoALaFecha ?? 0) + (a?.saldoALaFechaMSI ?? 0)
    const totalB = (b?.saldoALaFecha ?? 0) + (b?.saldoALaFechaMSI ?? 0)

    return preferidaB - preferidaA || Math.abs(totalB) - Math.abs(totalA)
})

/*
 * En celular cada tarjeta ocupa todo el ancho, así que cada tipo de cuenta se
 * pliega para no recorrer todas las tarjetas antes de llegar a la siguiente.
 * Tocar una tarjeta la abre en el visor (VisorTarjetas); mientras tanto se
 * oculta en la cuadrícula para que parezca que "salta" al frente.
 */
const CuentasPorTipo = ({ tipoDeCuenta, titulo, icono, inicialAbierto, onAbrir, idEnVisor }) => {
    return (
        <Grupo
            titulo={titulo}
            icono={icono}
            resumen={tipoDeCuenta.length}
            inicialAbierto={inicialAbierto}
        >
            <ContenedorTitular > {titulo} </ContenedorTitular>

            <ContenedorCuentas data-tour={tipoDeCuenta.length ? "cuentas-grupo" : undefined}>
                {tipoDeCuenta.map((cuenta) => (
                    <CardCuentaTarjeta
                        key={cuenta.id}
                        cuenta={cuenta}
                        onAbrir={onAbrir}
                        oculta={cuenta.id === idEnVisor}
                    />
                ))}
            </ContenedorCuentas>
        </Grupo>
    )
}

export const ResumenCuentasUx = () => {
    const { cuentas } = useAppStore();
    /* { indice, origen } mientras el visor está abierto. */
    const [visor, setVisor] = useState(null);
    const [idEnVisor, setIdEnVisor] = useState(null);

    const grupos = useMemo(() => {
        const ordenadas = ordenarCuentas(cuentas);
        return TIPOS.map((tipo) => ({
            ...tipo,
            cuentas: ordenadas.filter((cuenta) => cuenta.tipoDeCuenta === tipo.tipo),
        }));
    }, [cuentas]);
    const primerGrupoConCuentas = grupos.find((grupo) => grupo.cuentas.length > 0);

    // El visor navega en el mismo orden en que se ven las tarjetas.
    const ids = useMemo(() => grupos.flatMap((grupo) => grupo.cuentas.map((cuenta) => cuenta.id)), [grupos]);

    const abrirVisor = useCallback((cuenta, origen) => {
        setVisor({ indice: Math.max(0, ids.indexOf(cuenta.id)), origen });
        setIdEnVisor(cuenta.id);
    }, [ids]);

    const cerrarVisor = useCallback(() => {
        setVisor(null);
        setIdEnVisor(null);
    }, []);

    return (
        <ContenedorResumenCuentas>

            {grupos.map((grupo) => (
                <CuentasPorTipo
                    key={grupo.tipo}
                    tipoDeCuenta={grupo.cuentas}
                    titulo={grupo.titulo}
                    icono={grupo.icono}
                    inicialAbierto={grupo === primerGrupoConCuentas}
                    onAbrir={abrirVisor}
                    idEnVisor={idEnVisor}
                />
            ))}

            {visor && (
                <VisorTarjetas
                    ids={ids}
                    indiceInicial={visor.indice}
                    origen={visor.origen}
                    onCambio={setIdEnVisor}
                    onCerrar={cerrarVisor}
                />
            )}
        </ContenedorResumenCuentas>
    )
}
