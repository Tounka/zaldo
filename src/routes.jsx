import { Home } from "./assets/paginas/home";
import { Login } from "./assets/paginas/login";



export const routesConfig = [
  {
    path: '/',
    element: <Login />,
    name: 'login'
  },
  {
    path: '/home',
    element: <Home />,
    name: 'inicio'
  },

];
