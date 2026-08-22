import styled from "styled-components";
import { CardCuentaTarjeta } from "../../componentes/cards/cardCuentaTarjeta";
import { useAppStore } from "../../stores/useAppStore"
import { TxtGenerico } from "../../componentes/genericos/titulos";
import { useEffect, useState } from "react";

const ContenedorResumenCuentas = styled.div`
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    padding-bottom: 8px;
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
`
const CuentasPorTipo = ({ tipoDeCuenta, titulo }) => {
    return (
        <>
            <ContenedorTitular > {titulo} </ContenedorTitular>

            <ContenedorCuentas>
                {tipoDeCuenta.map((cuenta, index) => (
                    <CardCuentaTarjeta key={`cuentaTarjeta${index}`} cuenta={cuenta} />
                ))}
            </ContenedorCuentas>
        </>
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

            return preferidaB - preferidaA || totalB - totalA
        })

        setCuentasOrdenadas(cuentasOrdenadasRam)
    }, [cuentas])

    const cuentasCredito = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "credito");
    const cuentasDebito = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "debito");
    const cuentasEfectivo = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "efectivo");
    const cuentasInversion = cuentasOrdenadas.filter((cuenta) => cuenta.tipoDeCuenta === "inversion");
    return (
        <ContenedorResumenCuentas>

            <CuentasPorTipo tipoDeCuenta={cuentasCredito} titulo={"Crédito"} />
            <CuentasPorTipo tipoDeCuenta={cuentasDebito} titulo={"Débito"} />
            <CuentasPorTipo tipoDeCuenta={cuentasEfectivo} titulo={"Efectivo"} />
            <CuentasPorTipo tipoDeCuenta={cuentasInversion} titulo={"Inversion"} />

        </ContenedorResumenCuentas>
    )
}
