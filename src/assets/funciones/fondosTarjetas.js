import fondo01 from "../imagenes/fondosTarjetas/fondo-tarjeta-01.png";
import fondo02 from "../imagenes/fondosTarjetas/fondo-tarjeta-02.png";
import fondo03 from "../imagenes/fondosTarjetas/fondo-tarjeta-03.png";
import fondo04 from "../imagenes/fondosTarjetas/fondo-tarjeta-04.png";
import fondo05 from "../imagenes/fondosTarjetas/fondo-tarjeta-05.png";
import fondo06 from "../imagenes/fondosTarjetas/fondo-tarjeta-06.png";
import fondo07 from "../imagenes/fondosTarjetas/fondo-tarjeta-07.png";
import fondo08 from "../imagenes/fondosTarjetas/fondo-tarjeta-08.png";
import fondo09 from "../imagenes/fondosTarjetas/fondo-tarjeta-09.png";
import fondo10 from "../imagenes/fondosTarjetas/fondo-tarjeta-10.png";
import fondo11 from "../imagenes/fondosTarjetas/fondo-tarjeta-11.png";
import fondo12 from "../imagenes/fondosTarjetas/fondo-tarjeta-12.png";
import fondo13 from "../imagenes/fondosTarjetas/fondo-tarjeta-13.png";
import fondo14 from "../imagenes/fondosTarjetas/fondo-tarjeta-14.png";
import fondo15 from "../imagenes/fondosTarjetas/fondo-tarjeta-15.png";

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
