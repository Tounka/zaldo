/**
 * Sistema de Áreas y Categorías internas de la Despensa de Zaldo.
 *
 * Estructura jerárquica:
 * - Áreas: "Despensa", "Hogar", "Baño", "Aseo Personal"
 * - Cada área contiene categorías internas diseñadas para albergar más de 5 productos.
 */

export const AREAS_DESPENSA = [
    "Despensa",
    "Hogar",
    "Baño",
    "Aseo Personal",
];

export const ESTRUCTURA_AREAS = {
    Despensa: {
        id: "despensa",
        nombre: "Despensa",
        icono: "",
        color: "#c79a2e",
        categorias: [
            {
                id: "abarrotes_despensa_seca",
                nombre: "Abarrotes y Despensa seca",
                descripcion: "Harinas, arroz, frijol, lentejas, garbanzos, pastas, sopa instantánea, cereales, maizena, avena.",
                color: "#c79a2e",
                keywords: ["arroz", "frijol", "frijoles", "lenteja", "lentejas", "garbanzo", "garbanzos", "harina", "trigo", "precis", "sopa", "pasta", "espagueti", "maruchan", "fideo", "maizena", "cereal", "avena"],
            },
            {
                id: "enlatados_conservas",
                nombre: "Enlatados y Conservas",
                descripcion: "Atún en lata o sobre, champiñones, elote dorado, ensalada campesina, legumbres y verduras enlatadas.",
                color: "#d1662b",
                keywords: ["atun", "atún", "champinon", "champiñon", "champiñones", "elote", "ensalada", "campesina", "legumbre", "legumbres", "conserva", "sardina"],
            },
            {
                id: "salsas_aceites_condimentos",
                nombre: "Salsas, Aceites y Condimentos",
                descripcion: "Puré de tomate, salsas caseras, mole, papelitos sazonadores, aceite vegetal, aceite canola, mayonesa.",
                color: "#e67e22",
                keywords: ["salsa", "pure", "puré", "tomate", "mole", "sazonador", "maggi", "aceite", "canola", "comestible", "mayonesa", "costeña", "cond de", "aderezo", "vinagre", "especias"],
            },
            {
                id: "perecederos_refrigerados",
                nombre: "Perecederos y Refrigerados",
                descripcion: "Leche, crema, huevo, quesos, pollo entero, carnes, taquitos de pollo, hamburguesas de atún.",
                color: "#2f7fc4",
                keywords: ["leche", "uht", "crema", "media crema", "queso", "huevo", "huevos", "pollo", "carne", "taquitos", "hamburguesa", "res", "cerdo", "jamon", "salchicha", "yogurt"],
            },
            {
                id: "bebidas_reposteria",
                nombre: "Bebidas y Repostería",
                descripcion: "Café, té, pan blanco y artesano de caja, gelatinas, galletas, botanas.",
                color: "#16a085",
                keywords: ["cafe", "café", "nescafe", "pan", "bimbo", "artesano", "gelatina", "te", "té", "galleta", "galletas", "botana", "dulce", "azucar"],
            },
        ],
    },
    Hogar: {
        id: "hogar",
        nombre: "Hogar",
        icono: "",
        color: "#2f9b8f",
        categorias: [
            {
                id: "limpieza_hogar",
                nombre: "Limpieza del Hogar",
                descripcion: "Detergentes para ropa (alta higiene y regular), limpiador Brasso antigrasa, cloro, limpiapisos, lavavajillas.",
                color: "#2f9b8f",
                keywords: ["detergente", "brasso", "antigrasa", "alta hig", "regular", "cloro", "suavitel", "suavizante", "fabuloso", "pinalen", "limpiador", "jabon", "jabón", "roma", "foca", "lavavajillas"],
            },
            {
                id: "cocina_mantenimiento",
                nombre: "Cocina y Mantenimiento",
                descripcion: "Servilletas de cocina, papel aluminio, bolsas para basura, fibras, esponjas, cerillos.",
                color: "#d35400",
                keywords: ["bolsa", "basura", "aluminio", "servilleta", "servilletas", "esponja", "fibra", "cerillos", "foco", "pilas"],
            },
        ],
    },
    "Baño": {
        id: "bano",
        nombre: "Baño",
        icono: "",
        color: "#8a63c9",
        categorias: [
            {
                id: "papel_cuidado_bano",
                nombre: "Papel y Cuidado del Baño",
                descripcion: "Papel higiénico, toallitas húmedas, pastillas sanitarias, limpiador de baño/inodoro.",
                color: "#8a63c9",
                keywords: ["papel", "higienico", "higiénico", "toallita", "toallitas", "inodoro", "wc", "sanitario", "pastilla sanitaria"],
            },
        ],
    },
    "Aseo Personal": {
        id: "aseo_personal",
        nombre: "Aseo Personal",
        icono: "",
        color: "#9b59b6",
        categorias: [
            {
                id: "higiene_cuidado_personal",
                nombre: "Higiene y Cuidado Personal",
                descripcion: "Jabón corporal, shampoo, pasta dental, cepillos de dientes, desodorante, rastrillos, crema corporal.",
                color: "#9b59b6",
                keywords: ["shampoo", "jabon corporal", "jabón", "pasta dental", "dientes", "cepillo", "desodorante", "rastrillo", "crema corporal", "higiene"],
            },
        ],
    },
};

/**
 * Lista plana de todas las categorías internas registradas.
 */
export const TODAS_LAS_CATEGORIAS_INTERNAS = Object.values(ESTRUCTURA_AREAS).flatMap(
    (area) => area.categorias.map((cat) => cat.nombre)
);

/**
 * Obtiene el color correspondiente a un área.
 */
export const colorArea = (area = "") => {
    return ESTRUCTURA_AREAS[area]?.color || "#6c5ce7";
};

/**
 * Obtiene el color correspondiente a una categoría interna.
 */
export const colorCategoriaInterna = (catNombre = "", areaNombre = "") => {
    if (areaNombre && ESTRUCTURA_AREAS[areaNombre]) {
        const encontrada = ESTRUCTURA_AREAS[areaNombre].categorias.find((c) => c.nombre === catNombre);
        if (encontrada?.color) return encontrada.color;
    }
    for (const area of Object.values(ESTRUCTURA_AREAS)) {
        const encontrada = area.categorias.find((c) => c.nombre === catNombre);
        if (encontrada?.color) return encontrada.color;
    }
    return "#8b88a0";
};

/**
 * Resuelve y normaliza el Área y Categoría de un producto.
 * Valida si ya cuenta con una asignación válida o la deduce inteligentemente.
 */
export const resolverAreaYCategoria = (prod = {}) => {
    const areaActual = prod?.area;
    const catActual = prod?.categoria;

    // 1. Si ya tiene área y categoría reconocidas dentro de nuestra estructura
    if (areaActual && ESTRUCTURA_AREAS[areaActual]) {
        const existeCat = ESTRUCTURA_AREAS[areaActual].categorias.some((c) => c.nombre === catActual);
        if (existeCat) {
            return { area: areaActual, categoria: catActual };
        }
    }

    // 2. Deducción inteligente a partir del nombre, categoría vieja y keywords
    const texto = `${prod?.nombre || ""} ${prod?.categoria || ""} ${prod?.grupo || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // Prioridad Baño
    if (texto.includes("papel") || texto.includes("higienico") || texto.includes("inodoro") || prod?.categoria === "Baño") {
        return { area: "Baño", categoria: "Papel y Cuidado del Baño" };
    }

    // Prioridad Aseo Personal
    if (
        texto.includes("shampoo") ||
        texto.includes("pasta dental") ||
        texto.includes("dientes") ||
        texto.includes("desodorante") ||
        texto.includes("rastrillo") ||
        prod?.categoria === "Higiene"
    ) {
        return { area: "Aseo Personal", categoria: "Higiene y Cuidado Personal" };
    }

    // Prioridad Hogar - Limpieza
    if (
        texto.includes("detergente") ||
        texto.includes("brasso") ||
        texto.includes("antigrasa") ||
        texto.includes("alta hig") ||
        texto.includes("regular") ||
        texto.includes("cloro") ||
        texto.includes("suavitel") ||
        texto.includes("limpiador") ||
        prod?.categoria === "Limpieza"
    ) {
        return { area: "Hogar", categoria: "Limpieza del Hogar" };
    }

    // Prioridad Hogar - Cocina y Mantenimiento
    if (
        texto.includes("aluminio") ||
        texto.includes("servilleta") ||
        (texto.includes("bolsa") && texto.includes("basura")) ||
        texto.includes("esponja") ||
        prod?.categoria === "Hogar"
    ) {
        return { area: "Hogar", categoria: "Cocina y Mantenimiento" };
    }

    // Despensa - Perecederos y Refrigerados
    if (
        texto.includes("leche") ||
        texto.includes("crema") ||
        texto.includes("queso") ||
        texto.includes("huevo") ||
        texto.includes("pollo") ||
        texto.includes("carne") ||
        texto.includes("taquitos") ||
        texto.includes("hamburguesa") ||
        prod?.categoria === "Refrigerados" ||
        prod?.categoria === "Lácteos"
    ) {
        return { area: "Despensa", categoria: "Perecederos y Refrigerados" };
    }

    // Despensa - Enlatados y Conservas
    if (
        texto.includes("atun") ||
        texto.includes("champinon") ||
        texto.includes("elote") ||
        texto.includes("campesina") ||
        texto.includes("vegetales") ||
        (texto.includes("garbanzo") && texto.includes("lata")) ||
        (texto.includes("legumbre") && texto.includes("lata")) ||
        (texto.includes("salsa") && texto.includes("lata")) ||
        texto.includes("conserva") ||
        texto.includes("sardina")
    ) {
        return { area: "Despensa", categoria: "Enlatados y Conservas" };
    }

    // Despensa - Salsas, Aceites y Condimentos
    if (
        texto.includes("salsa") ||
        texto.includes("pure") ||
        texto.includes("tomate") ||
        texto.includes("cond de") ||
        texto.includes("mole") ||
        texto.includes("sazonador") ||
        texto.includes("maggi") ||
        texto.includes("aceite") ||
        texto.includes("mayonesa")
    ) {
        return { area: "Despensa", categoria: "Salsas, Aceites y Condimentos" };
    }

    // Despensa - Bebidas y Repostería
    if (
        texto.includes("cafe") ||
        texto.includes("pan") ||
        texto.includes("bimbo") ||
        texto.includes("artesano") ||
        texto.includes("gelatina") ||
        texto.includes("te") ||
        prod?.categoria === "Bebidas" ||
        prod?.categoria === "Botanas"
    ) {
        return { area: "Despensa", categoria: "Bebidas y Repostería" };
    }

    // Por defecto: Despensa -> Abarrotes y Despensa seca
    return { area: "Despensa", categoria: "Abarrotes y Despensa seca" };
};
