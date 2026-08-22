import styled from "styled-components"
import { CardResumenCuenta } from "../../../componentes/cards/cardResumenCuentaHome";
import { useAppStore } from "../../../stores/useAppStore";
import { useMemo } from "react";
import { obtenerEsLiquida, obtenerSaldoTotalCuenta } from "../../../funciones/utils/cuentas";

const ContenedorSeccionResumenes = styled.div`
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    width: 100%;
    height: auto;
    max-width: 1200px;
    gap: 10px;

    @media (max-width: 800px) {
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr);
    }

    @media (max-width: 500px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

export const SeccionResumenes = () => {
    const { cuentas } = useAppStore();

    const resumenes = useMemo(() => {
        const resumen = {
            activos: 0,
            pasivos: 0,
            msi: 0,
            revolvente: 0,
            activosLiquidos: 0,
        };

        cuentas.forEach(cuenta => {
            const saldo = Number(cuenta.saldoALaFecha || 0);
            const saldoMSI = Number(cuenta.saldoALaFechaMSI || 0);
            const saldoTotal = obtenerSaldoTotalCuenta(cuenta);
            const esLiquida = obtenerEsLiquida(cuenta);

            switch (cuenta.tipoDeCuenta) {
                case "debito":
                case "efectivo":
                    resumen.activos += saldo;
                    if (esLiquida) resumen.activosLiquidos += saldoTotal;
                    break;

                case "credito":
                    if (saldo > 0) {
                        resumen.activos += saldo;
                        if (esLiquida) resumen.activosLiquidos += saldo;
                    }
                    resumen.pasivos += saldo;
                    resumen.pasivos += saldoMSI;
                    resumen.revolvente += saldo;

                    resumen.msi += saldoMSI || 0;
                    break;

                case "inversion":
                    resumen.activos += saldo;
                    if (esLiquida) resumen.activosLiquidos += saldoTotal;
                    break;
            }

        });

        return {
            ...resumen,
            balance: resumen.activos + resumen.pasivos,
            liquidoReal: resumen.activosLiquidos + resumen.revolvente,
        };
    }, [cuentas]);

    return (
        <ContenedorSeccionResumenes>
            <CardResumenCuenta titulo="Activos" cantidad={resumenes.activos} />
            <CardResumenCuenta titulo="Pasivos" cantidad={resumenes.pasivos} />
            <CardResumenCuenta
                titulo="Balance"
                cantidad={resumenes.balance}
                detalleTitulo="Líquido real"
                detalleCantidad={resumenes.liquidoReal}
            />
            <CardResumenCuenta titulo="Saldo Msi" cantidad={resumenes.msi} />
            <CardResumenCuenta titulo="Saldo Revolvente" cantidad={resumenes.revolvente} />
        </ContenedorSeccionResumenes>
    );
}
