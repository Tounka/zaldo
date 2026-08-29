import { useEffect } from "react";
import "./App.css";
import { rutasConMenu, rutasSinMenu } from "./routes";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "./assets/stores/useAppStore";
import { useModalStore } from "./assets/stores/useModalStore";
import { LayoutConMenu } from "./assets/componentes/genericos/layouts";
import { AnimatePresence, motion as Motion } from "framer-motion";

function App() {
  const { usuario, cargarDatos } = useAppStore();
  const { abrirAgregarMovimiento } = useModalStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (usuario?.uid) {
      cargarDatos(usuario.uid);
    } else if (!usuario) {
      navigate("/");
    }
  }, [usuario, cargarDatos, navigate]);

  /*
   * Acceso directo de la PWA (?nuevoMovimiento=1): abre el modal de captura y
   * limpia el parámetro, para que recargar no lo vuelva a disparar.
   */
  useEffect(() => {
    if (!usuario?.uid) return;

    const parametros = new URLSearchParams(location.search);
    if (parametros.get("nuevoMovimiento") !== "1") return;

    abrirAgregarMovimiento({});
    navigate(location.pathname, { replace: true });
  }, [usuario, location.search, location.pathname, abrirAgregarMovimiento, navigate]);

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
                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {ruta.element}
                </Motion.div>
              }
            />
          ))}
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
