import styled from "styled-components"
import { CardResumenCuenta } from "../../../componentes/cards/cardResumenCuentaHome";
import { useContextoGeneral } from "../../../contextos/general";
import { useEffect, useState } from "react";

const ContenedorSeccionResumenes = styled.div`
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    width: 100%;
    height: auto;
    max-width: 1200px;
    gap: 10px;

    @media (max-width: 800px) {
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr);
    }
`;

export const SeccionResumenes = () => {
    const { cuentas } = useContextoGeneral();
    const [resumenes, serResumenes] = useState({
        activos: 0,
        pasivos: 0,
        liquido: 0,
        msi: 0,
        revolvente: 0,
        ahorro: 0,
    });

    useEffect(() => {
        const resumen = {
            activos: 0,
            pasivos: 0,
            liquido: 0,
            msi: 0,
            revolvente: 0,
            ahorro: 0
        };
        
        cuentas.forEach(cuenta => {
            const saldo = cuenta.saldoALaFecha || 0;

            switch (cuenta.tipoDeCuenta) {
                case "debito":
                case "efectivo":
                    resumen.activos += saldo;
                    if (cuenta?.tipoDeDebito === "ahorro") {
                        resumen.ahorro += saldo;
                    } else {
                        resumen.liquido += saldo;
                    }
                    break;

                case "credito":
                    if (saldo > 0) {
                        resumen.activos += saldo ;
                    }
                    resumen.pasivos += saldo;
                    resumen.revolvente += saldo;

                    resumen.msi += cuenta.montoMSI || 0;
                    break;

                case "inversion":
                    resumen.activos += saldo;
                    resumen.ahorro += saldo;
                    break;
            }

        });

        resumen.liquido = resumen.activos + resumen.pasivos;

        serResumenes(resumen);
    }, [cuentas]);

    return (
        <ContenedorSeccionResumenes>
            <CardResumenCuenta titulo="Activos" cantidad={resumenes.activos} />
            <CardResumenCuenta titulo="Pasivos" cantidad={resumenes.pasivos} />
            <CardResumenCuenta titulo="Liquido" cantidad={resumenes.liquido} />
            <CardResumenCuenta titulo="Saldo Msi" cantidad={resumenes.msi} />
            <CardResumenCuenta titulo="Saldo Revolvente" cantidad={resumenes.revolvente} />
            <CardResumenCuenta titulo="Ahorro" cantidad={resumenes.ahorro} />
        </ContenedorSeccionResumenes>
    );
}
