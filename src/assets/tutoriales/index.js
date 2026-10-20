import { pasosHome } from "./home";
import { pasosMovimientos } from "./movimientos";
import { pasosIngresos } from "./ingresos";
import { pasosCuentas } from "./cuentas";
import { pasosAhorros, pasosAhorrosAnual } from "./ahorros";
import { pasosPrestamos } from "./prestamos";
import { pasosDespensa } from "./despensa";
import { pasosPerfil } from "./perfil";

/*
 * Tutoriales por ruta. Para agregar uno:
 *   1. Crea `tutoriales/<pagina>.js` con sus pasos (ver home.js).
 *   2. Marca los elementos de la página con `data-tour="..."`.
 *   3. Regístralo aquí con una `clave` única; es la que se guarda en
 *      `preferencias.tutorialesVistos` para no repetirlo.
 *
 * /cobranza no lleva tutorial: redirige a /prestamos.
 */
export const TUTORIALES_POR_RUTA = {
    "/home": { clave: "home", pasos: pasosHome },
    "/movimientos": { clave: "movimientos", pasos: pasosMovimientos },
    "/ingresos": { clave: "ingresos", pasos: pasosIngresos },
    "/cuentas": { clave: "cuentas", pasos: pasosCuentas },
    "/ahorros": { clave: "ahorros", pasos: pasosAhorros },
    "/ahorros/anual": { clave: "ahorrosAnual", pasos: pasosAhorrosAnual },
    "/prestamos": { clave: "prestamos", pasos: pasosPrestamos },
    "/despensa": { clave: "despensa", pasos: pasosDespensa },
    "/perfil": { clave: "perfil", pasos: pasosPerfil },
};

export const obtenerTutorial = (ruta) => TUTORIALES_POR_RUTA[ruta] || null;
