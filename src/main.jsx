import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { StyleSheetManager } from 'styled-components'
import isPropValid from '@emotion/is-prop-valid'

// El filtro solo aplica a etiquetas HTML: a un componente React (styled(SelectVisual))
// hay que pasarle todas sus props, o pierde `options` y abre vacío.
const reenviarProp = (prop, target) =>
  typeof target === 'string' ? isPropValid(prop) : true

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyleSheetManager shouldForwardProp={reenviarProp}>
      {/* Adopta ya el comportamiento de v7 y quita los avisos de la consola */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </StyleSheetManager>
  </StrictMode>
)
