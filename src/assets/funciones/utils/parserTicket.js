import {
    buscarEnCatalogo,
    normalizarCodigoBarras,
} from "../firebase/despensa";

/*
 * Parser de captura rápida de tickets.
 *
 * Convierte texto libre (una línea por producto) en renglones listos para
 * `registrarTicketDespensa`, resolviendo cada uno contra el catálogo que ya está
 * en memoria. No hace ninguna lectura a Firestore.
 *
 * Formatos que entiende, en una misma pegada:
 *   Atún Herdez 140g\t3\t114.00     ← pegado desde Excel (TAB)
 *   Atún Herdez 140g   114.00       ← nombre + precio
 *   3 Leche Lala 1L 75.00           ← cantidad al inicio
 *   Leche Lala 1L x2 $50.00         ← cantidad con "x"
 *   7501055310401 2 38.50           ← código de barras al inicio
 */

/**
 * Interpreta un número escrito en formato mexicano o europeo.
 * "1,234.56" -> 1234.56    "38,50" -> 38.5    "$1 234" -> 1234
 */
export const parsearNumero = (texto) => {
    let limpio = String(texto ?? "").replace(/[^\d.,-]/g, "");
    if (!limpio) return 0;

    const tieneComa = limpio.includes(",");
    const tienePunto = limpio.includes(".");

    if (tieneComa && tienePunto) {
        limpio = limpio.lastIndexOf(",") > limpio.lastIndexOf(".")
            ? limpio.replace(/\./g, "").replace(",", ".")   // 1.234,56
            : limpio.replace(/,/g, "");                     // 1,234.56
    } else if (tieneComa) {
        // "38,50" es decimal; "1,234" son miles
        limpio = /,\d{1,2}$/.test(limpio) ? limpio.replace(",", ".") : limpio.replace(/,/g, "");
    }

    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : 0;
};

export const inferirCategoriaDespensa = (texto = "") => {
    const normalizado = texto.toLowerCase();
    if (/leche|yogur|queso|crema/.test(normalizado)) return "Lácteos";
    if (/jab[oó]n|detergente|limpiador|cloro|suavizante|fabuloso|pinol/.test(normalizado)) return "Limpieza";
    if (/shampoo|papel|pasta dental|higiene|desodorante|cepillo/.test(normalizado)) return "Higiene";
    if (/at[uú]n|sardina|lata|enlat|chiles|elote/.test(normalizado)) return "Enlatados";
    if (/agua|jugo|refresco|bebida|coca|cerveza|caf[eé]/.test(normalizado)) return "Bebidas";
    if (/helado|congel|nugget/.test(normalizado)) return "Congelados";
    if (/papas|botana|galleta|sabritas|churro/.test(normalizado)) return "Botanas";
    return "Abarrotes";
};

export const inferirGrupoProducto = (texto = "") => {
    const normalizado = texto.toLowerCase();
    if (/at[uú]n/.test(normalizado)) return "Atún";
    if (/frijol/.test(normalizado)) return "Frijoles";
    if (/cereal|avena|granola/.test(normalizado)) return "Cereal";
    if (/arroz/.test(normalizado)) return "Arroz";
    if (/pasta|spaghetti|espagueti/.test(normalizado)) return "Pasta";
    if (/leche/.test(normalizado)) return "Leche";
    if (/aceite/.test(normalizado)) return "Aceite";
    if (/az[uú]car/.test(normalizado)) return "Azúcar";
    if (/huevo/.test(normalizado)) return "Huevo";
    if (/papel higi[eé]nico|higi[eé]nico/.test(normalizado)) return "Papel higiénico";
    return texto.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
};

const UNIDAD_A_BASE = {
    ml: { unidad: "ml", unidadBase: "L" },
    l: { unidad: "L", unidadBase: "L" },
    lt: { unidad: "L", unidadBase: "L" },
    lts: { unidad: "L", unidadBase: "L" },
    g: { unidad: "g", unidadBase: "kg" },
    gr: { unidad: "g", unidadBase: "kg" },
    grs: { unidad: "g", unidadBase: "kg" },
    kg: { unidad: "kg", unidadBase: "kg" },
    kgs: { unidad: "kg", unidadBase: "kg" },
    pz: { unidad: "pz", unidadBase: "pz" },
    pza: { unidad: "pz", unidadBase: "pz" },
    pzas: { unidad: "pz", unidadBase: "pz" },
    pieza: { unidad: "pz", unidadBase: "pz" },
    piezas: { unidad: "pz", unidadBase: "pz" },
};

/**
 * Detecta el tamaño de la presentación dentro del nombre.
 * "Atún Herdez 140g" -> { cantidad: 140, unidad: "g", unidadBase: "kg" }
 */
export const detectarMedida = (texto = "") => {
    const match = String(texto).match(/([\d]+(?:[.,][\d]+)?)\s*(ml|lts|lt|l|kgs|kg|grs|gr|g|pzas|pza|pz|piezas|pieza)\b/i);
    if (!match) return { cantidad: 1, unidad: "pz", unidadBase: "pz", encontrada: false };

    const cantidad = parsearNumero(match[1]) || 1;
    const mapa = UNIDAD_A_BASE[match[2].toLowerCase()] || { unidad: "pz", unidadBase: "pz" };
    return { cantidad, ...mapa, encontrada: true };
};

/**
 * Quita la medida del nombre para quedarte con el producto "puro".
 * "Atún Herdez 140g" -> "Atún Herdez"
 */
export const quitarMedida = (texto = "") => String(texto)
    .replace(/([\d]+(?:[.,][\d]+)?)\s*(ml|lts|lt|l|kgs|kg|grs|gr|g|pzas|pza|pz|piezas|pieza)\b/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * Descompone una línea suelta en { codigoBarras, nombre, cantidad, precio }.
 */
export const parsearLinea = (lineaOriginal) => {
    const linea = String(lineaOriginal || "").trim();
    if (!linea) return null;

    // 1) Pegado desde Excel: las columnas vienen separadas por TAB
    if (linea.includes("\t")) {
        const partes = linea.split("\t").map((parte) => parte.trim()).filter(Boolean);
        if (partes.length >= 3) {
            return {
                codigoBarras: normalizarCodigoBarras(partes[0]).length >= 8 ? normalizarCodigoBarras(partes[0]) : "",
                nombre: /^\d{8,}$/.test(partes[0].replace(/\D/g, "")) ? partes[1] : partes[0],
                cantidad: parsearNumero(partes[partes.length - 2]) || 1,
                precio: parsearNumero(partes[partes.length - 1]),
            };
        }
        if (partes.length === 2) {
            return {
                codigoBarras: "",
                nombre: partes[0],
                cantidad: 1,
                precio: parsearNumero(partes[1]),
            };
        }
    }

    let resto = linea;
    let codigoBarras = "";
    let cantidad = 0;
    let precio = 0;

    // 2) Código de barras al inicio (8 dígitos o más, aislado)
    const matchCodigo = resto.match(/^(\d{8,14})\s+/);
    if (matchCodigo) {
        codigoBarras = matchCodigo[1];
        resto = resto.slice(matchCodigo[0].length);
    }

    // 3) Precio: último número de la línea, opcionalmente con $
    const matchPrecio = resto.match(/\$?\s*([\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{1,2})?|[\d]+(?:[.,][\d]{1,2})?)\s*$/);
    if (matchPrecio) {
        precio = parsearNumero(matchPrecio[1]);
        resto = resto.slice(0, matchPrecio.index).trim();
    }

    // 4) Cantidad explícita con "x": "x3", "3x", "x 3"
    const matchPorX = resto.match(/(?:^|\s)(?:x\s*(\d+)|(\d+)\s*x)(?:\s|$)/i);
    if (matchPorX) {
        cantidad = Number(matchPorX[1] || matchPorX[2]) || 1;
        resto = (resto.slice(0, matchPorX.index) + " " + resto.slice(matchPorX.index + matchPorX[0].length)).trim();
    }

    // 5) Cantidad al inicio: "3 Leche Lala". Solo si lo que sigue es texto,
    //    para no confundirla con el tamaño de la presentación ("140 g Atún").
    if (!cantidad) {
        const matchInicio = resto.match(/^(\d{1,3})\s+(?=[^\d\s])/);
        if (matchInicio) {
            const posible = Number(matchInicio[1]);
            const siguiente = resto.slice(matchInicio[0].length);
            // "500 ml de leche" no es cantidad 500: si lo que sigue es una unidad, se ignora
            const esUnidad = /^(ml|lts?|l|kgs?|gr?s?|g|pzas?|pz|piezas?)\b/i.test(siguiente);
            if (!esUnidad) {
                cantidad = posible;
                resto = siguiente.trim();
            }
        }
    }

    // 6) Si tras quitar código y precio solo queda un número, era la cantidad.
    //    Caso típico: "7501055310401 2 38.50" -> código, cantidad 2, precio 38.50
    if (!cantidad && /^\d{1,3}$/.test(resto.trim())) {
        cantidad = Number(resto.trim());
        resto = "";
    }

    // 7) Cantidad al final: "Leche Lala 1L 4 100.00" -> ya se quitó el precio,
    //    queda "Leche Lala 1L 4". Se limita a 2 dígitos para no confundirla con
    //    el tamaño de la presentación ("Coca Cola 600").
    if (!cantidad) {
        const matchFinal = resto.match(/\s(\d{1,2})$/);
        if (matchFinal) {
            cantidad = Number(matchFinal[1]);
            resto = resto.slice(0, matchFinal.index).trim();
        }
    }

    const nombre = resto.replace(/\s{2,}/g, " ").trim();
    if (!nombre && !codigoBarras) return null;

    return {
        codigoBarras,
        nombre,
        cantidad: cantidad || 1,
        precio,
    };
};

/**
 * Convierte el texto pegado en renglones resueltos contra el catálogo.
 *
 * Cada renglón sale listo para `registrarTicketDespensa`: los que ya existen
 * traen productoId/presentacionId; los nuevos traen `productoNuevo: true` más
 * los campos necesarios para darlos de alta en la misma operación.
 */
export const parsearTicket = (texto, catalogo) => {
    const lineas = String(texto || "").split("\n");
    const renglones = [];

    lineas.forEach((lineaOriginal, indice) => {
        const parseado = parsearLinea(lineaOriginal);
        if (!parseado) return;

        const { codigoBarras, nombre, cantidad, precio } = parseado;
        // La medida del texto ("Atún 295g") sirve para dos cosas: elegir la
        // presentación correcta si el producto ya existe, y crearla si no.
        const medida = detectarMedida(nombre);
        // Para buscar el PRODUCTO se quita la medida del nombre: "Atún Herdez 140g"
        // y "Atún Herdez 295g" son el mismo producto en dos presentaciones.
        const nombreBase = quitarMedida(nombre);
        const encontrado = buscarEnCatalogo(catalogo, { codigoBarras, nombre: nombreBase, medida })
            || buscarEnCatalogo(catalogo, { codigoBarras, nombre, medida });

        if (encontrado?.producto && encontrado?.presentacion) {
            renglones.push({
                clave: `linea_${indice}`,
                lineaOriginal: lineaOriginal.trim(),
                estado: encontrado.motivo === "nombre_parcial" ? "probable" : "existente",
                motivo: encontrado.motivo,
                productoNuevo: false,
                productoId: encontrado.producto.id,
                presentacionId: encontrado.presentacion.id,
                nombre: encontrado.producto.nombre,
                presentacionNombre: encontrado.presentacion.nombre,
                codigoBarras: codigoBarras || encontrado.presentacion.codigoBarras || "",
                cantidadComprada: String(cantidad),
                precioTotalItem: precio ? String(precio) : "",
                nota: "",
            });
            return;
        }

        // No existe: se prepara el alta inline
        renglones.push({
            clave: `linea_${indice}`,
            lineaOriginal: lineaOriginal.trim(),
            estado: "nuevo",
            motivo: "sin_coincidencia",
            productoNuevo: true,
            productoId: "",
            presentacionId: "",
            nombre,
            presentacionNombre: medida.encontrada ? `${medida.cantidad} ${medida.unidad}` : "",
            codigoBarras,
            cantidadComprada: String(cantidad),
            precioTotalItem: precio ? String(precio) : "",
            nota: "",

            // Campos para crear el producto junto con el ticket
            categoria: inferirCategoriaDespensa(nombre),
            grupo: inferirGrupoProducto(nombre),
            marca: "",
            unidadBase: medida.unidadBase,
            presentacionCantidad: String(medida.cantidad),
            presentacionUnidad: medida.unidad,
            stockMinimo: "",
            medible: "true",
            unidadesPermitidas: medida.unidadBase,
            origen: "captura_rapida",
        });
    });

    return renglones;
};

/**
 * Resumen para la vista previa del modal.
 */
export const resumirRenglones = (renglones = []) => ({
    total: renglones.length,
    existentes: renglones.filter((renglon) => renglon.estado === "existente").length,
    probables: renglones.filter((renglon) => renglon.estado === "probable").length,
    nuevos: renglones.filter((renglon) => renglon.estado === "nuevo").length,
    importe: renglones.reduce((suma, renglon) => suma + (Number(renglon.precioTotalItem) || 0), 0),
});
