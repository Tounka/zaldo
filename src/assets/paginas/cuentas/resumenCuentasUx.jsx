import styled from "styled-components";
import { CardCuentaTarjeta } from "../../componentes/cards/cardCuentaTarjeta";
import { useContextoGeneral } from "../../contextos/general"
import { TxtGenerico } from "../../componentes/genericos/titulos";

const ContenedorResumenCuentas = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
`
const ContenedorCuentas = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
`

const ContenedorTitular = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;

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
    const { cuentas } = useContextoGeneral();
    const cuentasCredito = cuentas.filter((cuenta) => cuenta.tipoDeCuenta === "credito");
    const cuentasDebito = cuentas.filter((cuenta) => cuenta.tipoDeCuenta === "debito");
    const cuentasEfectivo = cuentas.filter((cuenta) => cuenta.tipoDeCuenta === "efectivo");
    const cuentasInversion = cuentas.filter((cuenta) => cuenta.tipoDeCuenta === "inversion");
    return (
        <ContenedorResumenCuentas>

            <CuentasPorTipo tipoDeCuenta={cuentasCredito} titulo={"Crédito"} />
            <CuentasPorTipo tipoDeCuenta={cuentasDebito} titulo={"Débito"} />
            <CuentasPorTipo tipoDeCuenta={cuentasEfectivo} titulo={"Efectivo"} />
            <CuentasPorTipo tipoDeCuenta={cuentasInversion} titulo={"Inversion"} />

        </ContenedorResumenCuentas>
    )
}  