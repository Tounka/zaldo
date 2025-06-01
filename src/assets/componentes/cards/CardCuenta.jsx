import styled from "styled-components"

const ContenedorCardCuenta = styled.div`
    width: 100%;
    max-width: 600px;
    height: 50px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    overflow: hidden;
    gap: 15px;
`;

const ContenedorIzquierdo = styled.div`
    width: 100%;
    height: 100%;
    background-color: var(--colorMorado);
    color: var(--colorBlanco);
    display: flex;
    align-items: center;
    font-size: var(--fontLg);
    font-weight: bold;
    line-height: 1;
    padding-left: 10px;
`;

const ContenedorDerecho = styled(ContenedorIzquierdo)`
  position: relative;
  padding-left: 30px;
  clip-path: polygon(0 0, 20px 50%, 0 100%, 100% 100%, 100% 0);
`;
export const CardCuenta = ({cuenta="Nu", valor="55", id="das314asd"})=>{
    return(
        <ContenedorCardCuenta>
            <ContenedorIzquierdo>
                {cuenta}
            </ContenedorIzquierdo>
            <ContenedorDerecho>
                ${valor}
            </ContenedorDerecho>

        </ContenedorCardCuenta>
    )
}