import styled from "styled-components";
import { CardCuenta } from "../../../componentes/cards/cardCuenta";
import { useContextoGeneral } from "../../../contextos/general";
import { TxtGenerico } from "../../../componentes/genericos/titulos";

import { PieChart } from '@mui/x-charts';
import { Box, Typography } from '@mui/material';

const ContenedorSeccionCuentas = styled.div`
    width: 100%;
    height:auto;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    gap: 10px;


`;

const ContenedorCards = styled.div`
    width: 100%;
    height: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
   overflow: hidden;
`;

const ContenedorSeccionCuenta = styled.div`
    width: 100%;
    height:auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

   @media (max-width: 700px ) {
        grid-template-columns: 1fr ;
        grid-template-rows: auto 200px;
    }
`;

const SeccionCuenta = ({ titulo, cuentas }) => {

    const obtenerSaldoTotal = (cuenta) =>
        (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0)

    const datosParaGrafica = cuentas
        .filter(cuenta => Math.abs(obtenerSaldoTotal(cuenta)) > 0)
        .map(cuenta => ({
            id: cuenta.id ?? cuenta.nombre,
            value: Math.abs(obtenerSaldoTotal(cuenta)),
            label: cuenta.nombre,
        }))

    return (
        <ContenedorCards>
            <TxtGenerico size="24px" color="var(--colorPrincipal)">
                {titulo}
            </TxtGenerico>

            <ContenedorSeccionCuenta>
                <ContenedorCards>
                    {cuentas.map((cuenta, index) => (
                        <CardCuenta
                            cuenta={cuenta}
                            id={`cuenta${index}`}
                            key={cuenta.id ?? `cuenta${index}`}
                        />
                    ))}
                </ContenedorCards>

                <ContenedorCards>
                    <Box sx={{ maxWidth: 400, mt: 0 }}>
                        {datosParaGrafica.length > 0 ? (
                            <PieChart
                                series={[
                                    {
                                        data: datosParaGrafica,
                                        cornerRadius: 5,
                                        innerRadius: 30,
                                        paddingAngle: 5,
                                    },
                                ]}
                                width={300}
                                height={200}
                            />
                        ) : (
                            <Typography align="center" color="text.secondary">
                                No hay datos para mostrar
                            </Typography>
                        )}
                    </Box>
                </ContenedorCards>
            </ContenedorSeccionCuenta>
        </ContenedorCards>
    )
}


export const SeccionCuentas = () => {
    const { cuentas } = useContextoGeneral()

    const obtenerSaldoTotal = (cuenta) =>
        (cuenta?.saldoALaFecha ?? 0) + (cuenta?.saldoALaFechaMSI ?? 0)

    const cuentasConActivos = cuentas.filter(
        (cuenta) => obtenerSaldoTotal(cuenta) > 0
    )

    let cuentasConPasivos = cuentas.filter(
        (cuenta) => obtenerSaldoTotal(cuenta) < 0
    )

    cuentasConPasivos = [...cuentasConPasivos].sort(
        (a, b) => obtenerSaldoTotal(a) - obtenerSaldoTotal(b)
    )

    const cuentasConSinSaldo = cuentas.filter(
        (cuenta) => obtenerSaldoTotal(cuenta) === 0
    )

    return (
        <ContenedorSeccionCuentas>
            <SeccionCuenta titulo="Activos" cuentas={cuentasConActivos} />
            <SeccionCuenta titulo="Pasivos" cuentas={cuentasConPasivos} />
            <SeccionCuenta titulo="Sin Saldo" cuentas={cuentasConSinSaldo} />
        </ContenedorSeccionCuentas>
    )
}

