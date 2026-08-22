import fondo01 from "../imagenes/fondosTarjetas/fondo-tarjeta-01.webp";
import fondo02 from "../imagenes/fondosTarjetas/fondo-tarjeta-02.webp";
import fondo03 from "../imagenes/fondosTarjetas/fondo-tarjeta-03.webp";
import fondo04 from "../imagenes/fondosTarjetas/fondo-tarjeta-04.webp";
import fondo05 from "../imagenes/fondosTarjetas/fondo-tarjeta-05.webp";
import fondo06 from "../imagenes/fondosTarjetas/fondo-tarjeta-06.webp";
import fondo07 from "../imagenes/fondosTarjetas/fondo-tarjeta-07.webp";
import fondo08 from "../imagenes/fondosTarjetas/fondo-tarjeta-08.webp";
import fondo09 from "../imagenes/fondosTarjetas/fondo-tarjeta-09.webp";
import fondo10 from "../imagenes/fondosTarjetas/fondo-tarjeta-10.webp";
import fondo11 from "../imagenes/fondosTarjetas/fondo-tarjeta-11.webp";
import fondo12 from "../imagenes/fondosTarjetas/fondo-tarjeta-12.webp";
import fondo13 from "../imagenes/fondosTarjetas/fondo-tarjeta-13.webp";
import fondo14 from "../imagenes/fondosTarjetas/fondo-tarjeta-14.webp";
import fondo15 from "../imagenes/fondosTarjetas/fondo-tarjeta-15.webp";

export const FONDOS_TARJETAS = [
    fondo01, fondo02, fondo03, fondo04, fondo05,
    fondo06, fondo07, fondo08, fondo09, fondo10,
    fondo11, fondo12, fondo13, fondo14, fondo15,
];

const indiceEstable = (valor = "") => Array.from(String(valor)).reduce(
    (acumulado, caracter) => ((acumulado * 31) + caracter.charCodeAt(0)) >>> 0,
    0,
);

export const obtenerFondoTarjeta = (cuenta = {}) => {
    const indiceGuardado = Number(cuenta.fondoTarjeta);
    const indice = Number.isInteger(indiceGuardado) && indiceGuardado >= 0 && indiceGuardado < FONDOS_TARJETAS.length
        ? indiceGuardado
        : indiceEstable(cuenta.id || cuenta.nombre) % FONDOS_TARJETAS.length;

    return FONDOS_TARJETAS[indice];
};
