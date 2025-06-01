import styled from "styled-components"
import { SeccionResumenes } from "./secciones/SeccionResumenes"
import { SeccionCuentas } from "./secciones/SeccionCuentas";

const ContenedorHomeUx = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
`;

export const HomeUx = () =>{
    return(
        <ContenedorHomeUx>
            <SeccionResumenes />
            <SeccionCuentas />
        </ContenedorHomeUx>
    )
}