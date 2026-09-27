/**
 * Utilidades para generar y descargar archivos CSV que Excel abre con acentos correctos.
 */

const escaparCelda = (valor) => {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor);
    return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/** Convierte encabezados + filas (arrays) a texto CSV. */
export const construirCSV = (encabezados, filas) =>
    [encabezados, ...filas].map((fila) => fila.map(escaparCelda).join(",")).join("\n");

/** Descarga el texto como archivo .csv (con BOM para que Excel detecte UTF-8). */
export const descargarCSV = (nombreArchivo, contenido) => {
    const blob = new Blob(["﻿", contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
