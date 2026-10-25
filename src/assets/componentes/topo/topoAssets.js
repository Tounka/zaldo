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
export const precargarTopo = (estados = ESTADOS_TOPO, ancho) => {
    if (typeof window === "undefined") return;
    // En pantallas de alta densidad el srcset de <Topo> elige la de 512 en
    // cuanto el topo pasa de ~128 px: precargar solo la de 256 no evitaba el brinco.
    const anchos = ancho ? [ancho] : window.devicePixelRatio > 1 ? [256, 512] : [256];
    estados.forEach((estado) => anchos.forEach((cadaAncho) => {
        const img = new Image();
        img.decoding = "async";
        img.src = rutaTopo(estado, cadaAncho);
    }));
};
