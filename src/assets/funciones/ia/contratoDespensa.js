import { TODAS_LAS_CATEGORIAS_INTERNAS } from "../../paginas/despensa/areasYCategorias.js";

/*
 * Parte del contrato de captura para compras de despensa descritas en el chat
 * ("compré 2 leches, un kilo de tortillas y detergente en el Walmart").
 *
 * Igual que el resto del contrato: la IA solo propone. La app valida cada
 * producto (interpretarDespensa.js), el usuario confirma en el chat y el
 * guardado pasa por registrarEntradaLoteIADespensa, el mismo de los tickets.
 *
 * El Worker también empaqueta este archivo: sin React, imágenes ni Firebase.
 */

export const UNIDADES_DESPENSA_IA = ["pz", "kg", "g", "L", "ml", "paq"];
export const CATEGORIAS_DESPENSA_IA = TODAS_LAS_CATEGORIAS_INTERNAS;

export const LIMITE_PRODUCTOS_DESPENSA = 40;
export const LIMITE_PRODUCTOS_CATALOGO = 150;
export const LIMITE_NOMBRE_PRODUCTO = 60;
export const LIMITE_PRESENTACIONES_CATALOGO = 4;

/* strict de Structured Outputs: objeto o null, todo en `required`. */
export const ESQUEMA_DESPENSA = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      description: "Solo si el mensaje describe una compra de súper/despensa con productos.",
      properties: {
        tienda: { type: "string", description: "Tienda; vacío si no se menciona." },
        fecha: { type: ["string", "null"], description: "YYYY-MM-DD; null = hoy." },
        totalTicket: {
          type: ["number", "null"],
          description: "Total pagado por toda la compra si el usuario lo dice; si no, null.",
        },
        cuentaId: {
          type: ["string", "null"],
          description: "id de la cuenta con la que pagó; null si no lo dice.",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              producto: { type: "string", description: "Nombre limpio; el del catálogo si ya existe." },
              presentacion: { type: "string", description: "Empaque o tamaño (\"1 L\", \"Bolsa 900 g\"); vacío si no se sabe." },
              cantidad: { type: "number", description: "Cuántos empaques/unidades se compraron." },
              unidad: { type: "string", enum: UNIDADES_DESPENSA_IA },
              costoTotal: {
                type: ["number", "null"],
                description: "Lo pagado por ese renglón si se dice; si no, null.",
              },
              categoria: { type: "string", enum: ["", ...CATEGORIAS_DESPENSA_IA] },
            },
            required: ["producto", "presentacion", "cantidad", "unidad", "costoTotal", "categoria"],
            additionalProperties: false,
          },
        },
      },
      required: ["tienda", "fecha", "totalTicket", "cuentaId", "items"],
      additionalProperties: false,
    },
  ],
};

/*
 * Catálogo mínimo para que la IA reutilice los nombres que ya existen y no
 * duplique productos. Sin stock ni precios.
 */
export const construirCatalogoParaIA = (catalogo) => Object.values(catalogo?.productos || {})
  .filter((producto) => producto?.activo !== false && producto?.nombre)
  .slice(0, LIMITE_PRODUCTOS_CATALOGO)
  .map((producto) => ({
    nombre: String(producto.nombre).slice(0, LIMITE_NOMBRE_PRODUCTO),
    presentaciones: Object.values(producto.presentaciones || {})
      .filter((presentacion) => presentacion?.activa !== false && presentacion?.nombre)
      .slice(0, LIMITE_PRESENTACIONES_CATALOGO)
      .map((presentacion) => String(presentacion.nombre).slice(0, LIMITE_NOMBRE_PRODUCTO)),
  }));
