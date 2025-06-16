import { useEffect } from 'react';
import './App.css';
import { rutasConMenu, rutasSinMenu } from './routes';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useContextoGeneral } from './assets/contextos/general';
import { LayoutConMenu } from './assets/componentes/genericos/layouts';

function App() {
  const { usuario } = useContextoGeneral();
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuario) {
      navigate("/");
    }
  }, [usuario]);

  return (
    <Routes>
    
      {rutasSinMenu.map((ruta, index) => (
        <Route key={index} path={ruta.path} element={ruta.element} />
      ))}

     
      <Route element={<LayoutConMenu />}>
        {rutasConMenu.map((ruta, index) => (
          <Route key={index} path={ruta.path} element={ruta.element} />
        ))}
      </Route>
    </Routes>
  );
}

export default App;
