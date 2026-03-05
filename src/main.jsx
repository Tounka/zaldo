import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { StyleSheetManager } from 'styled-components'
import isPropValid from '@emotion/is-prop-valid'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StyleSheetManager>
  </StrictMode>
)
