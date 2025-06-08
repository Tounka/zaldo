import styled from "styled-components";
import { MenuTop } from "../../componentes/menuTop";
import { HomeUx } from "./homeUx"

export const ContenedorApp = styled.div`
  display: flex;
  padding-top: var(--alturaTopMenu);
  width: 100%;
  height: 100%;   
  max-height: auto;
`;
const ContenedorRutas = styled.div`
  width: 100%;
  padding: 20px;
  height: auto;
`;;

export const Home = () => {
    return (
        <ContenedorApp>
            <MenuTop />
            <ContenedorRutas>
                <HomeUx />
            </ContenedorRutas>
        </ContenedorApp>
    )
}