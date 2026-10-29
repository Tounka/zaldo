import styled, { keyframes } from "styled-components";
import { ComprasPlaneadas } from "../movimientos/comprasPlaneadas";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Contenedor = styled.main`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 40px;
  animation: ${fadeUp} 0.35s ease;
`;

const Titulo = styled.h1`
  margin: 0;
  color: var(--colorMorado);
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;

  @media (max-width: 500px) {
    font-size: 21px;
  }
`;

const Subtitulo = styled.p`
  margin: 4px 0 0;
  color: #666;
  font-size: 13px;

  @media (max-width: 680px) {
    display: none;
  }
`;

export const PaginaPlanearCompras = () => (
  <Contenedor>
    <header>
      <Titulo>Planear compras</Titulo>
      <Subtitulo>Aparta presupuesto para lo que quieres comprar y compáralo con lo que terminaste gastando</Subtitulo>
    </header>
    <ComprasPlaneadas />
  </Contenedor>
);
