import styled from "styled-components";
import { CardCuenta } from "../../../componentes/cards/cardCuenta";
import { useContextoGeneral } from "../../../contextos/general";
const ContenedorSeccionCuentas = styled.div`
    width: 100%;
    height:auto;
    max-width: 1200px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    @media (max-width: 700px ) {
        grid-template-columns: 1fr ;
        grid-template-rows: 1fr 1fr;
    }
`;
const ContenedorCards = styled.div`
    width: 100%;
    height: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    @media (max-width: 700px ) {
        align-items: center;
    }
`
export const SeccionCuentas = () => {
    const { cuentas } = useContextoGeneral();
    return (
        <ContenedorSeccionCuentas>
            <ContenedorCards>
                {cuentas.map((cuenta, index) => (
                    <CardCuenta cuenta={cuenta} id={`cuenta${index}`} key={`cuenta${index}`} />

                ))}
            </ContenedorCards>
        </ContenedorSeccionCuentas>
    )
}