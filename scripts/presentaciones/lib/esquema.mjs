/*
 * Contrato entre el proveedor (IA o local) y el renderizador.
 *
 * Un proveedor nunca escribe HTML: devuelve una ESPECIFICACIÓN de diapositivas
 * con este formato. Así la IA solo decide qué decir y con qué datos, y el
 * diseño (16:9, gráficas, tema claro/oscuro) queda siempre igual.
 *
 * Texto: se admite **negritas** en cualquier campo de texto; nada más de
 * Markdown. Montos: la IA debe usar los números que recibe, no inventarlos.
 */

export const TIPOS_DIAPOSITIVA = ["portada", "kpis", "grafica", "tabla", "lista", "tarjetas"];
export const TIPOS_GRAFICA = ["barras", "barras-apiladas", "linea"];
export const FORMATOS = ["moneda", "numero", "porcentaje"];
export const TONOS = ["neutro", "bueno", "alerta", "malo", "info"];

const texto = { type: "string" };
const tarjeta = {
    type: "object",
    properties: { titulo: texto, texto, tono: { type: "string", enum: TONOS } },
    required: ["titulo", "texto"],
};

// JSON Schema que se envía al modelo (salida estructurada).
export const ESQUEMA_PRESENTACION = {
    type: "object",
    properties: {
        titulo: texto,
        pie: texto,
        diapositivas: {
            type: "array",
            minItems: 3,
            maxItems: 18,
            items: {
                type: "object",
                properties: {
                    tipo: { type: "string", enum: TIPOS_DIAPOSITIVA },
                    kicker: texto,
                    titulo: texto,
                    lead: texto,
                    subtitulo: texto,
                    kpiPortada: { type: "object", properties: { valor: texto, etiqueta: texto }, required: ["valor", "etiqueta"] },
                    meta: { type: "array", items: texto },
                    kpis: {
                        type: "array",
                        maxItems: 4,
                        items: {
                            type: "object",
                            properties: { valor: texto, etiqueta: texto, tono: { type: "string", enum: TONOS } },
                            required: ["valor", "etiqueta"],
                        },
                    },
                    puntos: {
                        type: "array",
                        maxItems: 8,
                        items: { type: "object", properties: { titulo: texto, texto }, required: ["texto"] },
                    },
                    grafica: {
                        type: "object",
                        properties: {
                            tipo: { type: "string", enum: TIPOS_GRAFICA },
                            formato: { type: "string", enum: FORMATOS },
                            etiquetas: { type: "array", items: texto },
                            series: {
                                type: "array",
                                maxItems: 8,
                                items: {
                                    type: "object",
                                    properties: { nombre: texto, valores: { type: "array", items: { type: "number" } } },
                                    required: ["nombre", "valores"],
                                },
                            },
                            referencia: { type: "object", properties: { valor: { type: "number" }, etiqueta: texto }, required: ["valor", "etiqueta"] },
                        },
                        required: ["tipo", "etiquetas", "series"],
                    },
                    columnas: { type: "array", items: texto },
                    filas: { type: "array", items: { type: "array", items: texto } },
                    tarjetas: { type: "array", maxItems: 6, items: tarjeta },
                    nota: texto,
                },
                required: ["tipo", "titulo"],
            },
        },
    },
    required: ["titulo", "diapositivas"],
};

// Validación propia: no depende de que el modelo respete el schema.
export const validarPresentacion = (spec) => {
    const errores = [];
    if (!spec || typeof spec !== "object") return ["La especificación no es un objeto."];
    if (!spec.titulo) errores.push("Falta el título de la presentación.");
    if (!Array.isArray(spec.diapositivas) || spec.diapositivas.length === 0) {
        errores.push("No hay diapositivas.");
        return errores;
    }

    spec.diapositivas.forEach((d, i) => {
        const donde = `Diapositiva ${i + 1} (${d?.tipo})`;
        if (!TIPOS_DIAPOSITIVA.includes(d?.tipo)) errores.push(`${donde}: tipo desconocido.`);
        if (!d?.titulo) errores.push(`${donde}: falta el título.`);
        if (d?.tipo === "kpis" && !(d.kpis?.length)) errores.push(`${donde}: sin KPIs.`);
        if (d?.tipo === "lista" && !(d.puntos?.length)) errores.push(`${donde}: sin puntos.`);
        if (d?.tipo === "tarjetas" && !(d.tarjetas?.length)) errores.push(`${donde}: sin tarjetas.`);
        if (d?.tipo === "tabla") {
            if (!d.columnas?.length) errores.push(`${donde}: sin columnas.`);
            (d.filas || []).forEach((f, j) => {
                if (f.length !== d.columnas?.length) errores.push(`${donde}: la fila ${j + 1} no tiene ${d.columnas?.length} celdas.`);
            });
        }
        if (d?.tipo === "grafica") {
            const g = d.grafica;
            if (!g || !TIPOS_GRAFICA.includes(g.tipo)) errores.push(`${donde}: gráfica sin tipo válido.`);
            else {
                if (!g.series?.length) errores.push(`${donde}: gráfica sin series.`);
                g.series?.forEach((s) => {
                    if (s.valores?.length !== g.etiquetas?.length) errores.push(`${donde}: la serie "${s.nombre}" no tiene un valor por etiqueta.`);
                    if (s.valores?.some((v) => !Number.isFinite(v))) errores.push(`${donde}: la serie "${s.nombre}" tiene valores no numéricos.`);
                });
            }
        }
    });
    return errores;
};
