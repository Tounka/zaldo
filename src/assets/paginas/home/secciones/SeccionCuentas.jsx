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
    // Preparar datos en el formato que PieChart de @mui/x-charts espera:
    // series: [{ data: [{ id, value, label }, ...] }]
    const datosParaGrafica = cuentas
        .filter(cuenta => Math.abs(cuenta.saldoALaFecha) > 0)
        .map(cuenta => ({
            id: cuenta.id || cuenta.nombre,  // usa un id único, o nombre si no tienes id
            value: Math.abs(cuenta.saldoALaFecha),
            label: cuenta.nombre,
        }));

    return (
        <ContenedorCards>
            <TxtGenerico size="24px" color="var(--colorPrincipal)">{titulo}</TxtGenerico>
            <ContenedorSeccionCuenta>
                <ContenedorCards>
                    {cuentas.map((cuenta, index) => (
                        <CardCuenta cuenta={cuenta} id={`cuenta${index}`} key={`cuenta${index}`} />
                    ))}
                </ContenedorCards>

                <ContenedorCards>
                    <Box sx={{ maxWidth: 400, margin: '0', mt: 0 }}>
                        {datosParaGrafica.length > 0 ? (
                            <PieChart
                                series={[{ data: datosParaGrafica, cornerRadius: 5, innerRadius: 30, paddingAngle: 5, }]}
                                width={300}
                                height={200}
                                legend
                                tooltip
                            />
                        ) : (
                            <Typography align="center" color="text.secondary">No hay datos para mostrar</Typography>
                        )}
                    </Box>
                </ContenedorCards>
            </ContenedorSeccionCuenta>
        </ContenedorCards>
    );
}

export const SeccionCuentas = () => {
    const { cuentas } = useContextoGeneral();

    const cuentasConActivos = cuentas.filter((cuenta) => cuenta.saldoALaFecha > 0);
    let cuentasConPasivos = cuentas.filter((cuenta) => cuenta.saldoALaFecha < 0);
    cuentasConPasivos = cuentasConPasivos.sort((a,b) => a.saldoALaFecha - b.saldoALaFecha) 
    
    const cuentasConSinSaldo = cuentas.filter((cuenta) => cuenta.saldoALaFecha == 0);



    // Podrías usar también cuentasConPasivos y cuentasEnCeros según convenga

    return (
        <ContenedorSeccionCuentas>
            <SeccionCuenta titulo="Activos" cuentas={cuentasConActivos} />
            <SeccionCuenta titulo="Pasivos" cuentas={cuentasConPasivos} />
            <SeccionCuenta titulo="Sin Saldo" cuentas={cuentasConSinSaldo} />
        </ContenedorSeccionCuentas>
    )
}
