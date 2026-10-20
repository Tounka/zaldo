import styled from "styled-components";
import { CardCuentaTarjeta } from "../../componentes/cards/cardCuentaTarjeta";
import { useAppStore } from "../../stores/useAppStore"
import { useEffect, useState } from "react";
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

/*
 * En celular cada tarjeta ocupa todo el ancho, así que cada tipo de cuenta se
 * pliega para no recorrer todas las tarjetas antes de llegar a la siguiente.
 */
const CuentasPorTipo = ({ tipoDeCuenta, titulo, icono, inicialAbierto }) => {
    return (
        <Grupo
            titulo={titulo}
            icono={icono}
            resumen={tipoDeCuenta.length}
            inicialAbierto={inicialAbierto}
        >
            <ContenedorTitular > {titulo} </ContenedorTitular>

            <ContenedorCuentas data-tour={tipoDeCuenta.length ? "cuentas-grupo" : undefined}>
                {tipoDeCuenta.map((cuenta, index) => (
                    <CardCuentaTarjeta key={`cuentaTarjeta${index}`} cuenta={cuenta} />
                ))}
            </ContenedorCuentas>
        </Grupo>
    )
}
export const ResumenCuentasUx = () => {
    const { cuentas } = useAppStore();
    const [cuentasOrdenadas, setCuentasOrdenadas] = useState(cuentas)
    useEffect(() => {
        const cuentasOrdenadasRam = [...(cuentas || [])].sort((a, b) => {
            const preferidaA = Number(Boolean(a?.preferida));
            const preferidaB = Number(Boolean(b?.preferida));
            const totalA = (a?.saldoALaFecha ?? 0) + (a?.saldoALaFechaMSI ?? 0)
            const totalB = (b?.saldoALaFecha ?? 0) + (b?.saldoALaFechaMSI ?? 0)

            return preferidaB - preferidaA || Math.abs(totalB) - Math.abs(totalA)
        })

        setCuentasOrdenadas(cuentasOrdenadasRam)
    }, [cuentas])

    const cuentasCredito = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "credito");
    const cuentasDebito = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "debito");
    const cuentasEfectivo = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "efectivo");
    const cuentasInversion = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "inversion");
    const grupos = [
        { titulo: "Crédito", cuentas: cuentasCredito, icono: <FaCreditCard /> },
        { titulo: "Débito", cuentas: cuentasDebito, icono: <FaUniversity /> },
        { titulo: "Efectivo", cuentas: cuentasEfectivo, icono: <FaMoneyBillWave /> },
        { titulo: "Inversión", cuentas: cuentasInversion, icono: <FaPiggyBank /> },
    ];
    const primerGrupoConCuentas = grupos.find((grupo) => grupo.cuentas.length > 0);
    return (
        <ContenedorResumenCuentas>

            {grupos.map((grupo) => (
                <CuentasPorTipo
                    key={grupo.titulo}
                    tipoDeCuenta={grupo.cuentas}
                    titulo={grupo.titulo}
                    icono={grupo.icono}
                    inicialAbierto={grupo === primerGrupoConCuentas}
                />
            ))}

        </ContenedorResumenCuentas>
    )
}
