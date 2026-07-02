import { ResumenCuentas } from "./assets/paginas/cuentas";
import { Home } from "./assets/paginas/home";
import { Login } from "./assets/paginas/login";
import { PaginaMovimientos } from "./assets/paginas/movimientos";
import { PaginaPrestamos } from "./assets/paginas/prestamos";
import { PaginaAhorros } from "./assets/paginas/ahorros";
import { PaginaDespensa } from "./assets/paginas/despensa";

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
  },
  {
    path: '/cuentas',
    element: <ResumenCuentas />,
    name: 'cuentas'
  },
  {
    path: '/prestamos',
    element: <PaginaPrestamos />,
    name: 'prestamos'
  },
  {
    path: '/ahorros',
    element: <PaginaAhorros />,
    name: 'ahorros'
  },
  {
    path: '/despensa',
    element: <PaginaDespensa />,
    name: 'despensa'
  }
];

export const rutasSinMenu = [
  {
    path: '/',
    element: <Login />,
    name: 'login'
  }
];
