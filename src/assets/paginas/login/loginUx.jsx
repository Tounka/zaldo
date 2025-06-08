import styled from "styled-components";

import { FaGoogle } from "react-icons/fa";

const ContenedorLogin = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
`;

const TarjetaLogin = styled.div`
  background: white;
  border-radius: 10px;
  padding: 40px;
  box-shadow: 0px 10px 20px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
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

export const LoginUx = ({handleLogin}) => {


  return (
    <ContenedorLogin>
      <TarjetaLogin>
        <Titulo>Inicia sesión</Titulo>
        <BotonGoogle onClick={() => handleLogin()}>
          <FaGoogle />
          Continuar con Google
        </BotonGoogle>
      </TarjetaLogin>
    </ContenedorLogin>
  );
};
