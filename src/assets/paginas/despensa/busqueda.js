/*
 * Búsqueda de la despensa sin distinguir mayúsculas ni acentos: "jabon"
 * encuentra "Jabón" y "champinon" encuentra "Champiñones".
 */
export const normalizarTexto = (texto) => String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/* true si la búsqueda está vacía o aparece en alguno de los campos. */
export const coincideBusqueda = (busqueda, ...campos) => {
    const texto = normalizarTexto(busqueda);
    if (!texto) return true;
    return campos.some((campo) => normalizarTexto(campo).includes(texto));
};
