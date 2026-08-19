import { ResumenCuentas } from "./assets/paginas/cuentas";
import { Home } from "./assets/paginas/home";
import { Login } from "./assets/paginas/login";
import { PaginaMovimientos } from "./assets/paginas/movimientos";
import { PaginaPrestamos, PaginaCobranza } from "./assets/paginas/prestamos";
import { PaginaAhorros } from "./assets/paginas/ahorros";
import { PaginaDespensa } from "./assets/paginas/despensa";
import { PaginaIngresos } from "./assets/paginas/ingresos";
import { PaginaPerfil } from "./assets/paginas/perfil";

export const rutasConMenu = [
  {
    path: '/home',
    element: <Home />,
    name: 'inicio'
  },
  {
    path: '/ingresos',
    element: <PaginaIngresos />,
    name: 'ingresos'
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
    path: '/cobranza',
    element: <PaginaCobranza />,
    name: 'cobranza'
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
  },
  {
    path: '/perfil',
    element: <PaginaPerfil />,
    name: 'perfil'
  }
];

export const rutasSinMenu = [
  {
    path: '/',
    element: <Login />,
    name: 'login'
  }
];
