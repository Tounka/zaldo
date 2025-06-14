import { useEffect, useState } from 'react'
import './App.css'
import { routesConfig } from './routes'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useContextoGeneral } from './assets/contextos/general'




function App() {
  const { usuario } = useContextoGeneral();
  const navigate = useNavigate();
  useEffect(() => {
    if (!usuario) {
      navigate("/")
    }
  }, [])
  return (
    <Routes>
      {routesConfig.map((ruta, index) => (
        <Route
          key={index}
          path={ruta.path}
          element={ruta.element}
        />
      ))}
    </Routes>
  )
}

export default App
