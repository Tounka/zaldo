import { Home } from "./assets/paginas/home";
import { Login } from "./assets/paginas/login";
import { PaginaMovimientos } from "./assets/paginas/movimientos";

export const rutasConMenu = [
  {
    path: '/home',
    element: <Home />,
    name: 'inicio'
  },
  {
    path: '/movimientos',
    element: <PaginaMovimientos />,
    name: 'movimientos'
  }
];

export const rutasSinMenu = [
  {
    path: '/',
    element: <Login />,
    name: 'login'
  }
];
