import styled from "styled-components";

import { FaGoogle, FaRegUser } from "react-icons/fa";
import { ContenedorCentradoGenerico } from "../../componentes/genericos/contenedores";
import imgBg from "../../media/img/bgPattern.jpg"
const ContenedorLogin = styled.div`
  width: 100%;
  height: 100%;
  display: grid;

  grid-template-columns: 1fr 1fr;

  @media (max-width: 600px) {
     grid-template-columns: 1fr;
    position: relative;

  }
`;

const ContenedorBurbujaImg = styled.div`
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
  color: var(--colorPrincipal);
  border: 2px solid var(--colorPrincipal);
  font-size: 34px;
  position: absolute;
  top: -50px;
  border-radius: 50%;
  

`

const TarjetaLogin = styled.div`
  background: white;
  border-radius: 10px;
  padding: 50px 40px 40px 40px;
  box-shadow: 0px 10px 20px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  border: solid 2px var(--colorPrincipal);
  position: relative;

  @media (max-width: 600px) {
     grid-template-columns: 1fr;
    position: absolute;
      top: 40%;
  }
`;

const Titulo = styled.h2`
  color: var(--colorPrincipal);
  margin: 0;
`;

const BotonGoogle = styled.button`
  background-color: white;
  color: var(--colorPrincipal);
  border: 2px solid var(--colorPrincipal);
  padding: 12px 20px;
  border-radius: 5px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;
const ContenedorDerecho = styled(ContenedorCentradoGenerico)`
  background-image: url(${imgBg});
  background-position: center;
`;
export const LoginUx = ({ handleLogin }) => {


  return (
    <ContenedorLogin>
      <ContenedorCentradoGenerico bgColor="#f5f5f5">
        <TarjetaLogin>
          <ContenedorBurbujaImg> <FaRegUser /> </ContenedorBurbujaImg>
          <Titulo>Inicia sesión</Titulo>
          <BotonGoogle onClick={() => handleLogin()}>
            <FaGoogle />
            Continuar con Google
          </BotonGoogle>
        </TarjetaLogin>
      </ContenedorCentradoGenerico>


      <ContenedorDerecho bgColor="var(--colorMorado)">

      </ContenedorDerecho>

    </ContenedorLogin>
  );
};
