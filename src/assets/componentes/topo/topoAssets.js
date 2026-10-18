/*
 * Rutas de las ilustraciones del topo (public/topo). Cada estado tiene un WebP
 * de 256 px y otro de 512 px, ambos con transparencia; el navegador elige el
 * que corresponda al tamaño en pantalla y a la densidad del monitor.
 */
export const ESTADOS_TOPO = [
    "reposo",
    "saludando",
    "pensando",
    "feliz",
    "celebrando",
    "senalando",
    "excavando",
    "preocupado",
    "moneda",
    "durmiendo",
];

export const rutaTopo = (estado, ancho = 256) => {
    const nombre = ESTADOS_TOPO.includes(estado) ? estado : "reposo";
    return `/topo/${nombre}-${ancho >= 512 ? 512 : 256}.webp`;
};

/*
 * Descarga de antemano los estados que una pantalla va a mostrar después
 * (por ejemplo, "celebrando" al confirmar una compra) para que no aparezcan
 * en blanco el primer instante.
 */
export const precargarTopo = (estados = ESTADOS_TOPO, ancho = 256) => {
    if (typeof window === "undefined") return;
    estados.forEach((estado) => {
        const img = new Image();
        img.decoding = "async";
        img.src = rutaTopo(estado, ancho);
    });
};
