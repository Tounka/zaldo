import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ContextoGeneralProvider } from './assets/contextos/general.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ContextoModalesProvider } from './assets/contextos/modales.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ContextoGeneralProvider>
        <ContextoModalesProvider>
          <App />
        </ContextoModalesProvider>
      </ContextoGeneralProvider>
    </BrowserRouter>
  </StrictMode>
)
