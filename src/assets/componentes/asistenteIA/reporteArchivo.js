/*
 * Descargas de un reporte del asistente (HTML autocontenido de render.js).
 *
 * El HTML siempre se abre en un iframe aislado (sandbox sin same-origin):
 * aunque lo generamos nosotros, así su JavaScript no puede tocar la sesión
 * ni los datos de la app.
 */

const MENSAJE_IMPRESO = "zaldo-reporte-impreso";
const ESPERA_MAXIMA_IMPRESION_MS = 120000;

/* Descarga el HTML tal cual (respaldo para cuando imprimir a PDF no está a la mano). */
export const descargarHTMLReporte = (reporte) => {
  const url = URL.createObjectURL(new Blob([reporte.html], { type: "text/html;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = reporte.archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/*
 * Al cargar, el reporte espera sus fuentes y abre el diálogo de impresión
 * ("Guardar como PDF"). Al cerrarlo avisa a la app para quitar el iframe.
 */
const SCRIPT_IMPRIMIR = `<script>
addEventListener("load", () => {
  const listas = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  listas.then(() => setTimeout(() => print(), 300));
});
addEventListener("afterprint", () => parent.postMessage("${MENSAJE_IMPRESO}", "*"));
</script>`;

/**
 * Abre el diálogo de impresión del reporte en un iframe fuera de la vista.
 * El @media print de deck.css deja cada diapositiva en una hoja A4 horizontal.
 */
export const imprimirReporte = (reporte) => {
  const marco = document.createElement("iframe");
  marco.setAttribute("sandbox", "allow-scripts allow-modals");
  marco.setAttribute("aria-hidden", "true");
  marco.title = "Impresión del reporte";
  // Con tamaño real (no display:none) para que las gráficas se puedan dibujar.
  Object.assign(marco.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1280px",
    height: "720px",
    border: "0",
  });

  let temporizador = null;
  const quitar = () => {
    clearTimeout(temporizador);
    window.removeEventListener("message", alRecibir);
    marco.remove();
  };
  function alRecibir(evento) {
    if (evento.source === marco.contentWindow && evento.data === MENSAJE_IMPRESO) quitar();
  }

  window.addEventListener("message", alRecibir);
  temporizador = setTimeout(quitar, ESPERA_MAXIMA_IMPRESION_MS);
  const cierre = reporte.html.lastIndexOf("</body>");
  marco.srcdoc = `${reporte.html.slice(0, cierre)}${SCRIPT_IMPRIMIR}${reporte.html.slice(cierre)}`;
  document.body.appendChild(marco);
};
