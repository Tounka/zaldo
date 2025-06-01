import { useState } from 'react'
import './App.css'
import styled from 'styled-components';
import { MenuTop } from './assets/componentes/menuTop';
import { Home } from './assets/paginas/home';


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

function App() {

  return (
    <ContenedorApp>
      <MenuTop />
      <ContenedorRutas>
        <Home />
      </ContenedorRutas>
    </ContenedorApp>
  )
}

export default App
