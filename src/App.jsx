import { useEffect } from "react";
import "./App.css";
import { rutasConMenu, rutasSinMenu } from "./routes";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "./assets/stores/useAppStore";
import { LayoutConMenu } from "./assets/componentes/genericos/layouts";
import { AnimatePresence, motion } from "framer-motion";

function App() {
  const { usuario, cargarDatos } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (usuario?.uid) {
      cargarDatos(usuario.uid);
    } else if (!usuario) {
      navigate("/");
    }
  }, [usuario, cargarDatos, navigate]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {rutasSinMenu.map((ruta, index) => (
          <Route
            key={index}
            path={ruta.path}
            element={ruta.element}
          />
        ))}

        <Route element={<LayoutConMenu />}>
          {rutasConMenu.map((ruta, index) => (
            <Route
              key={index}
              path={ruta.path}
              element={
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {ruta.element}
                </motion.div>
              }
            />
          ))}
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;