import { validarAnimacion } from "./tiempoAnimacion.mjs";

let registro;
const imagenes = new Map();
/* Tiras ya descargadas, por nombre. Se leen en el render para no pasar ni un
 * cuadro sin imagen al cambiar de animación (eso hacía parpadear al topo). */
const listas = new Map();

export const tiraLista = (nombre) => listas.get(nombre) || null;

export const cargarAnimacionesTopo = () => {
  if (!registro) {
    registro = fetch("/topo/anim/manifest.json")
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo del topo.");
        return respuesta.json();
      })
      .catch((error) => { registro = undefined; throw error; });
  }
  return registro;
};

export const cargarTiraTopo = async (nombre) => {
  const catalogo = await cargarAnimacionesTopo();
  const ficha = catalogo[nombre];
  if (!validarAnimacion(ficha)) throw new Error(`Animación del topo no disponible: ${nombre}`);
  const retina = ficha.retina && window.devicePixelRatio > 1;
  const src = `/topo/anim/${nombre}${retina ? "@2x" : ""}.webp`;
  if (!imagenes.has(src)) {
    const pendiente = new Promise((resolve, reject) => {
      const imagen = new Image();
      imagen.decoding = "async";
      imagen.onload = () => resolve();
      imagen.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      imagen.src = src;
    }).catch((error) => { imagenes.delete(src); throw error; });
    imagenes.set(src, pendiente);
  }
  await imagenes.get(src);
  if (!listas.has(nombre)) listas.set(nombre, { ficha, src, nombre });
  return listas.get(nombre);
};

export const precargarAnimacionesTopo = (nombres) => {
  nombres.forEach((nombre) => { cargarTiraTopo(nombre).catch(() => {}); });
};
