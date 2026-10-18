import { pasosHome } from "./home";

/*
 * Tutoriales por ruta. Para agregar uno:
 *   1. Crea `tutoriales/<pagina>.js` con sus pasos (ver home.js).
 *   2. Marca los elementos de la página con `data-tour="..."`.
 *   3. Regístralo aquí con una `clave` única; es la que se guarda en
 *      `preferencias.tutorialesVistos` para no repetirlo.
 */
export const TUTORIALES_POR_RUTA = {
    "/home": { clave: "home", pasos: pasosHome },
};

export const obtenerTutorial = (ruta) => TUTORIALES_POR_RUTA[ruta] || null;
