import { useAppStore } from "../../../stores/useAppStore";
import { fechaCortaLegible, fechaLocalISO } from "../../utils/fechas";
import { limpiarPreguntas } from "../metodoAnalisis.js";
import { validarPresentacion } from "../analisis/esquema.js";
import { renderizarPresentacion } from "../analisis/render.js";
import cssDeck from "../analisis/plantilla/deck.css?raw";
import jsDeck from "../analisis/plantilla/deck.js?raw";
import jsGraficas from "../analisis/plantilla/graficas.js?raw";
import { REPORTES } from "./catalogo.js";
import { CALCULOS_REPORTE } from "./calculos.js";
import { cargarReporte } from "./cargarReporte.js";
import { capitalizar } from "./formato.js";
import { PLANTILLAS_REPORTE, armarPresentacion, combinarTextos } from "./plantillas.js";
import { validarTextosReporte } from "./redaccion.js";
import { solicitarRedaccionReporte } from "./solicitarRedaccion.js";

/*
 * Reporte con diseño fijo pedido desde el asistente:
 *
 *   Firestore ─► cargarReporte ─► calculos (cifras exactas, en el navegador)
 *             ─► plantilla (diapositivas y textos por defecto)
 *             ─► Worker /reporte (opcional: la IA reescribe solo los textos)
 *             ─► render.js (HTML 16:9 autocontenido)
 *
 * Si la IA falla o tarda, el reporte sale igual con nuestros textos.
 * Devuelve la forma de responderConsulta: { texto, reporte? }.
 */

const PLANTILLA_HTML = { css: cssDeck, deck: jsDeck, graficas: jsGraficas };

const listaDeReportes = () => Object.values(REPORTES).map((reporte) => reporte.nombre.toLowerCase()).join(", ");

/* Pide los textos a la IA; ante cualquier falla regresa null y se usan los nuestros. */
const redactarConIA = async (reporte, paraIA, preguntas) => {
  try {
    const respuesta = await solicitarRedaccionReporte({ reporte, metricas: paraIA, preguntas });
    const textos = validarTextosReporte(respuesta, { reporte, metricas: paraIA, preguntas });
    if (textos.descartados) console.info(`Reporte ${reporte}: ${textos.descartados} textos de la IA traían cifras que no están en las métricas; se usaron los textos por defecto.`);
    return textos;
  } catch (error) {
    console.info(`Reporte ${reporte} sin redacción de IA: ${error.message}`);
    return null;
  }
};

/*
 * La pregunta del mensaje va primero; luego las que la persona guardó en su
 * perfil. Solo aparecen en el reporte las que la IA pudo contestar con sus cifras.
 */
const preguntasDelReporte = (consulta) => limpiarPreguntas([
  consulta?.pregunta,
  ...(useAppStore.getState().preferencias?.preguntasIA || []),
]);

const diapositivaPreguntas = (respuestas) => ({
  id: "preguntas",
  tipo: "tarjetas",
  kicker: "Tus preguntas",
  titulo: "Lo que preguntaste",
  tarjetas: respuestas.map(({ pregunta, respuesta }) => ({ titulo: pregunta, texto: respuesta, tono: "info" })),
});

/* Antes de "Siguientes pasos": primero las respuestas, luego qué hacer. */
const insertarAntesDeRecomendaciones = (diapositivas, nueva) => {
  const indice = diapositivas.findIndex((diapositiva) => diapositiva.id === "recomendaciones");
  return indice < 0 ? [...diapositivas, nueva] : [...diapositivas.slice(0, indice), nueva, ...diapositivas.slice(indice)];
};

const huboRedaccion = (textos) => Boolean(textos && (Object.keys(textos.titulos).length || textos.puntos.length >= 2));

/**
 * @param consulta  Consulta validada (interpretarCaptura) con tema "reporte".
 * @returns {Promise<{ texto: string, reporte?: object }>}
 *   reporte = { id, nombre, titulo, periodo, cifras: [[etiqueta, valor]], html, archivo, redactadoPorIA, advertencias }
 */
export const generarReporte = async (consulta, { uid, hoy = new Date() } = {}) => {
  const reporte = consulta?.reporte;
  if (!REPORTES[reporte]) {
    return { texto: `¿De qué quieres el reporte? Puedo armar: ${listaDeReportes()}.` };
  }

  const hoyISO = fechaLocalISO(hoy);
  const { periodo, advertencias, datos } = await cargarReporte(reporte, consulta, { uid, hoyISO });
  const metricas = CALCULOS_REPORTE[reporte]({ ...datos, consulta, periodo, hoyISO });
  metricas.advertencias.unshift(...advertencias);

  const plantilla = PLANTILLAS_REPORTE[reporte];
  if (metricas.vacio) return { texto: plantilla.sinDatos(metricas) };

  const preguntas = preguntasDelReporte(consulta);
  const deIA = await redactarConIA(reporte, plantilla.metricasParaIA(metricas), preguntas);
  const textos = combinarTextos(plantilla.textosPorDefecto(metricas), deIA);
  const fecha = fechaCortaLegible(hoyISO);
  const spec = armarPresentacion(reporte, metricas, textos, { fecha });
  const respuestas = deIA?.respuestas || [];
  if (respuestas.length) spec.diapositivas = insertarAntesDeRecomendaciones(spec.diapositivas, diapositivaPreguntas(respuestas));

  // La pregunta del mensaje se contesta también en el chat; si no se pudo, se dice.
  const respuestaDirecta = consulta.pregunta
    ? respuestas.find((item) => item.pregunta.toLowerCase() === preguntas[0].toLowerCase())
    : null;
  const notaPregunta = !consulta.pregunta
    ? ""
    : respuestaDirecta
      ? ` ${respuestaDirecta.respuesta}`
      : ` Tu pregunta no se alcanza a contestar con este reporte; hazmela aparte y reviso todos tus datos.`;

  // Las plantillas son nuestras: si no validan es un error de código, no de datos.
  const errores = validarPresentacion(spec);
  if (errores.length) {
    console.error(`El reporte ${reporte} no es válido`, errores);
    return { texto: "No pude armar ese reporte. Intenta de nuevo o pide otro." };
  }

  const nombre = REPORTES[reporte].nombre;
  const periodoTexto = periodo ? capitalizar(metricas.nombrePeriodo) : `Al ${fecha}`;
  return {
    texto: `Listo, aquí está tu reporte de ${nombre.toLowerCase()}${periodo ? ` (${metricas.nombrePeriodo})` : ""}.${notaPregunta}`,
    reporte: {
      id: reporte,
      nombre,
      titulo: spec.titulo,
      periodo: periodoTexto,
      cifras: plantilla.tarjeta(metricas),
      html: renderizarPresentacion(spec, PLANTILLA_HTML),
      archivo: `zaldo-reporte-${reporte.replace(/_/g, "-")}-${hoyISO}.html`,
      redactadoPorIA: huboRedaccion(deIA),
      advertencias: metricas.advertencias,
    },
  };
};
