/*
 * Prepara una foto (ticket, productos) para mandarla al asistente: la reduce
 * a LADO_MAXIMO px y la recomprime en JPEG. Una foto de celular de 4 MB queda
 * en ~250 KB, suficiente para leer un ticket y muy por debajo del tope del
 * Worker. Además se pierden los metadatos EXIF (ubicación, modelo del equipo).
 */

const LADO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.82;
const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export class ErrorImagenIA extends Error {}

const cargarImagen = (archivo) => new Promise((resolver, rechazar) => {
  const url = URL.createObjectURL(archivo);
  const imagen = new Image();
  imagen.onload = () => {
    URL.revokeObjectURL(url);
    resolver(imagen);
  };
  imagen.onerror = () => {
    URL.revokeObjectURL(url);
    rechazar(new ErrorImagenIA("No pude abrir esa imagen. Prueba con una foto JPG o PNG."));
  };
  imagen.src = url;
});

/**
 * @param archivo File elegido por el usuario.
 * @returns data URL JPEG lista para solicitarCaptura({ imagen }).
 */
export const prepararImagenParaIA = async (archivo) => {
  if (!archivo || (archivo.type && !TIPOS_ACEPTADOS.includes(archivo.type))) {
    throw new ErrorImagenIA("Solo puedo leer fotos (JPG, PNG o WebP).");
  }

  const imagen = await cargarImagen(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.naturalWidth, imagen.naturalHeight));
  const ancho = Math.round(imagen.naturalWidth * escala);
  const alto = Math.round(imagen.naturalHeight * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d");
  // Fondo blanco: un PNG transparente en JPEG quedaría negro.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(imagen, 0, 0, ancho, alto);

  return lienzo.toDataURL("image/jpeg", CALIDAD_JPEG);
};
