import styled from "styled-components";
import { SeccionResumenes } from "./secciones/seccionResumenes";
import { SeccionCuentas } from "./secciones/seccionCuentas";
import { ModalForjadorMovimiento } from "../../componentes/modales/ModalForjadorMovimiento";

const ContenedorHomeUx = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
`;

export const HomeUx = () => {
    return (
        <ContenedorHomeUx>
            <SeccionResumenes />
            <SeccionCuentas />
            <ModalForjadorMovimiento />
        </ContenedorHomeUx>
    );
};