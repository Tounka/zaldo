import { useState } from 'react'
import './App.css'
import { routesConfig } from './routes'
import { Route, Routes } from 'react-router-dom'




function App() {

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
