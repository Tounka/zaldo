/*
 * Valida el cuerpo que manda la app. El cliente solo aporta datos (mensaje,
 * cuentas, fecha local); las instrucciones y el esquema los arma el Worker,
 * para que la key no sirva como chatbot general a quien tenga un token.
 */

import {
  LIMITE_NOMBRE_PRODUCTO,
  LIMITE_PRESENTACIONES_CATALOGO,
  LIMITE_PRODUCTOS_CATALOGO,
} from "../../../src/assets/funciones/ia/contratoDespensa.js";

// Holgado para el catálogo de despensa (150 productos con presentaciones).
const LIMITE_BYTES_SIN_IMAGEN = 48 * 1024;
// La app reduce la foto a ~1600 px en JPEG; 1.5 MB en base64 sobra para un ticket.
export const LIMITE_CARACTERES_IMAGEN = 1536 * 1024;
export const LIMITE_BYTES_CUERPO = LIMITE_BYTES_SIN_IMAGEN + LIMITE_CARACTERES_IMAGEN;
const PATRON_IMAGEN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MENSAJE_SOLO_IMAGEN = "Registra lo que aparece en esta imagen.";
export const LIMITE_MENSAJE = 1200;
export const LIMITE_CUENTAS = 50;
const LIMITE_NOMBRE_CUENTA = 60;

const TIPOS_CUENTA = ["debito", "credito", "inversion", "efectivo", ""];
const PATRON_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Lee el cuerpo como JSON con tope de tamaño.
 * @returns {{ cuerpo } | { error }}
 */
export const leerCuerpoJSON = async (request, limiteBytes) => {
  const tipo = request.headers.get("Content-Type") || "";
  if (!tipo.toLowerCase().startsWith("application/json")) {
    return { error: "Se esperaba JSON." };
  }

  const declarado = Number(request.headers.get("Content-Length") || 0);
  if (declarado > limiteBytes) return { error: "Solicitud demasiado grande." };

  // El Content-Length puede faltar o mentir: se mide el texto real.
  const texto = await request.text();
  if (new TextEncoder().encode(texto).length > limiteBytes) {
    return { error: "Solicitud demasiado grande." };
  }

  try {
    return { cuerpo: JSON.parse(texto) };
  } catch {
    return { error: "JSON inválido." };
  }
};

// Quita caracteres de control (saltos de línea incluidos) de textos cortos.
const limpiarLinea = (texto, limite) => String(texto ?? "")
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, limite);

/*
 * La app manda su fecha local porque el Worker corre en UTC: a las 8 pm en
 * México en UTC ya es mañana. Se acepta solo si está a ±1 día del reloj del
 * servidor, para que no se pueda mover "hoy" a cualquier fecha.
 */
const leerHoy = (valor, ahora) => {
  const match = PATRON_FECHA.exec(String(valor || ""));
  if (!match) return null;

  const [, anio, mes, dia] = match.map(Number);
  const fechaUTC = Date.UTC(anio, mes - 1, dia);
  const fecha = new Date(fechaUTC);
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;

  const hoyServidor = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  if (Math.abs(fechaUTC - hoyServidor) > UN_DIA_MS) return null;

  // Mediodía: el Worker interpreta la fecha en UTC y así no cambia de día.
  return new Date(anio, mes - 1, dia, 12, 0, 0);
};

const leerCuentas = (cuentas) => {
  if (!Array.isArray(cuentas) || cuentas.length > LIMITE_CUENTAS) return null;

  const resultado = [];
  for (const cuenta of cuentas) {
    if (!cuenta || typeof cuenta !== "object") return null;
    if (!PATRON_ID.test(String(cuenta.id || ""))) return null;

    const tipoDeCuenta = String(cuenta.tipoDeCuenta || "");
    if (!TIPOS_CUENTA.includes(tipoDeCuenta)) return null;

    resultado.push({
      id: cuenta.id,
      nombre: limpiarLinea(cuenta.nombre, LIMITE_NOMBRE_CUENTA),
      tipoDeCuenta,
    });
  }
  return resultado;
};

/*
 * Catálogo de despensa: opcional (la app lo manda solo si ya lo tiene). Solo
 * nombres; cualquier otra cosa invalida la solicitud.
 */
const leerProductos = (productos) => {
  if (productos === undefined) return [];
  if (!Array.isArray(productos) || productos.length > LIMITE_PRODUCTOS_CATALOGO) return null;

  const resultado = [];
  for (const producto of productos) {
    if (!producto || typeof producto !== "object") return null;
    const nombre = limpiarLinea(producto.nombre, LIMITE_NOMBRE_PRODUCTO);
    if (!nombre) return null;

    const presentaciones = Array.isArray(producto.presentaciones) ? producto.presentaciones : [];
    if (presentaciones.length > LIMITE_PRESENTACIONES_CATALOGO) return null;

    resultado.push({
      nombre,
      presentaciones: presentaciones
        .map((presentacion) => limpiarLinea(presentacion, LIMITE_NOMBRE_PRODUCTO))
        .filter(Boolean),
    });
  }
  return resultado;
};

/*
 * Imagen opcional (foto de un ticket o de productos) como data URL. Solo
 * formatos de imagen y base64 limpio: así no se puede colar otra cosa.
 */
const leerImagen = (imagen) => {
  if (imagen === undefined || imagen === null || imagen === "") return { imagen: null };
  if (typeof imagen !== "string" || imagen.length > LIMITE_CARACTERES_IMAGEN) return { error: "La imagen es demasiado grande." };
  if (!PATRON_IMAGEN.test(imagen)) return { error: "La imagen no es válida." };
  return { imagen };
};

/**
 * @returns {{ datos } | { error }} datos = { mensaje, cuentas, productos, hoy: Date, imagen }
 */
export const leerSolicitud = async (request, ahora = new Date()) => {
  const { cuerpo, error } = await leerCuerpoJSON(request, LIMITE_BYTES_CUERPO);
  if (error) return { error };

  const { imagen, error: errorImagen } = leerImagen(cuerpo?.imagen);
  if (errorImagen) return { error: errorImagen };

  // Sin imagen, el catálogo y las cuentas no pueden ocupar el espacio de la foto.
  if (!imagen && JSON.stringify(cuerpo).length > LIMITE_BYTES_SIN_IMAGEN) {
    return { error: "Solicitud demasiado grande." };
  }

  const mensaje = String(cuerpo?.mensaje ?? "").trim() || (imagen ? MENSAJE_SOLO_IMAGEN : "");
  if (!mensaje) return { error: "Falta el mensaje." };
  if (mensaje.length > LIMITE_MENSAJE) {
    return { error: `El mensaje supera ${LIMITE_MENSAJE} caracteres.` };
  }

  const cuentas = leerCuentas(cuerpo?.cuentas);
  if (!cuentas) return { error: "La lista de cuentas no es válida." };

  const productos = leerProductos(cuerpo?.productos);
  if (!productos) return { error: "El catálogo de despensa no es válido." };

  const hoy = leerHoy(cuerpo?.hoy, ahora);
  if (!hoy) return { error: "La fecha de hoy no es válida." };

  return { datos: { mensaje, cuentas, productos, hoy, imagen } };
};
