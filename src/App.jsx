import { useEffect } from "react";
import "./App.css";
import { rutasConMenu, rutasSinMenu } from "./routes";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "./assets/stores/useAppStore";
import { useModalStore } from "./assets/stores/useModalStore";
import { LayoutConMenu } from "./assets/componentes/genericos/layouts";
import { auth } from "./assets/funciones/firebase/dbFirebase";
import { onAuthStateChanged } from "firebase/auth";
import { obtenerPerfilAutenticado } from "./assets/funciones/firebase/usuario";
import { precargarTopo } from "./assets/componentes/topo/topoAssets";
import { FONDOS_TARJETAS } from "./assets/funciones/fondosTarjetas";

function App() {
  const { usuario, cargarDatos, setUsuario } = useAppStore();
  const { abrirAgregarMovimiento } = useModalStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Rehidrata la sesión al refrescar en cualquier ruta; en "/" el login lleva su propio flujo.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioAuth) => {
      if (!usuarioAuth) {
        setUsuario(null);
        return;
      }
      if (window.location.pathname === "/") return;
      if (useAppStore.getState().usuario?.uid === usuarioAuth.uid) return;
      setUsuario(await obtenerPerfilAutenticado(usuarioAuth));
    });
    return unsubscribe;
  }, [setUsuario]);

  /*
   * Precarga lo que aparece al navegar o al cambiar de estado: los estados del
   * topo y los fondos de tarjeta (son backgrounds CSS, el navegador no los pide
   * hasta que la tarjeta se pinta). Sin esto se ven en blanco un instante y
   * luego "brincan". Los avisos usan al topo, así que esos van primero.
   */
  useEffect(() => {
    precargarTopo(["feliz", "preocupado", "celebrando"]);

    const precargarResto = () => {
      precargarTopo();
      FONDOS_TARJETAS.forEach((src) => {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      });
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(precargarResto, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(precargarResto, 1200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (usuario?.uid) {
      if (auth.currentUser?.uid === usuario.uid) {
        cargarDatos(usuario.uid);
      }
    } else if (usuario === null) {
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

  /*
   * Sin `key` en <Routes>: el layout (menú, modales, asistente) se monta una
   * sola vez y solo la página anima al navegar (ver LayoutConMenu). Antes todo
   * se desmontaba en cada cambio de ruta y las imágenes volvían a aparecer de golpe.
   */
  return (
    <Routes>
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
            element={ruta.element}
          />
        ))}
      </Route>
    </Routes>
  );
}

export default App;
