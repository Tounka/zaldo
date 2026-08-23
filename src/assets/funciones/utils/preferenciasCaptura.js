/*
 * Preferencias de captura guardadas en el navegador.
 *
 * Son ayudas para escribir menos (última cuenta usada, categorías más
 * frecuentes), no datos del usuario: si el navegador las borra o el modo
 * privado las bloquea, la app sigue funcionando igual, solo sin los atajos.
 * Por eso toda lectura y escritura va envuelta en try/catch.
 */

const CLAVE_ULTIMA_CUENTA = "zaldo-ultima-cuenta";
const CLAVE_USO_CATEGORIAS = "zaldo-uso-categorias";

const leerJSON = (clave, valorPorDefecto) => {
    try {
        const crudo = localStorage.getItem(clave);
        return crudo ? JSON.parse(crudo) : valorPorDefecto;
    } catch {
        return valorPorDefecto;
    }
};

const escribirJSON = (clave, valor) => {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
        /* Sin almacenamiento disponible: el atajo simplemente no se recuerda. */
    }
};

/* ── Última cuenta usada ── */

export const obtenerUltimaCuentaUsada = () => {
    try {
        return localStorage.getItem(CLAVE_ULTIMA_CUENTA) || null;
    } catch {
        return null;
    }
};

export const recordarUltimaCuentaUsada = (cuentaId) => {
    if (!cuentaId) return;
    try {
        localStorage.setItem(CLAVE_ULTIMA_CUENTA, String(cuentaId));
    } catch {
        /* Ver nota de arriba. */
    }
};

/* ── Categorías más usadas ── */

export const registrarUsoCategoria = (categoria) => {
    if (!categoria) return;
    const conteos = leerJSON(CLAVE_USO_CATEGORIAS, {});
    conteos[categoria] = (Number(conteos[categoria]) || 0) + 1;
    escribirJSON(CLAVE_USO_CATEGORIAS, conteos);
};

export const obtenerConteosCategorias = () => leerJSON(CLAVE_USO_CATEGORIAS, {});

/*
 * Sube al frente las categorías más usadas y deja el resto en su orden original.
 * Solo se reordenan las que ya se han usado: sin historial, la lista se ve
 * exactamente como estaba definida.
 */
export const ordenarCategoriasPorUso = (categorias = [], cuantasAlFrente = 4) => {
    const conteos = obtenerConteosCategorias();

    const usadas = categorias
        .filter((categoria) => Number(conteos[categoria.value]) > 0)
        .sort((a, b) => Number(conteos[b.value]) - Number(conteos[a.value]))
        .slice(0, cuantasAlFrente);

    if (usadas.length === 0) return [...categorias];

    const valoresAlFrente = new Set(usadas.map((categoria) => categoria.value));

    return [
        ...usadas,
        ...categorias.filter((categoria) => !valoresAlFrente.has(categoria.value)),
    ];
};
