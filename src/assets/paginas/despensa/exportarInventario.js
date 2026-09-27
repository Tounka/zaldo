import { derivarProductos } from "../../funciones/firebase/despensa";
import { construirCSV, descargarCSV } from "../../funciones/utils/csv";
import { fechaLocalISO } from "../../funciones/utils/fechas";
import { resolverAreaYCategoria } from "./areasYCategorias";

const ENCABEZADOS = [
    "Área",
    "Categoría",
    "Producto",
    "Presentación",
    "Unidad",
    "Existencias",
    "Stock mínimo (producto)",
    "Último precio pagado",
    "Buen precio",
    "Valor en inventario",
    "Necesario",
];

const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor).toFixed(2) : "");

/** Descarga el inventario activo de la despensa: una fila por presentación. */
export const exportarInventarioCSV = (catalogo) => {
    const filas = [];
    derivarProductos(catalogo).forEach((prod) => {
        const { area, categoria } = resolverAreaYCategoria(prod);
        const presentaciones = prod.presentaciones.length > 0 ? prod.presentaciones : [{}];
        presentaciones.forEach((pres) => {
            const stock = Number(pres.stockActual || 0);
            const precio = Number(pres.ultimoPrecioPagado || pres.precioAproximado || pres.buenPrecio || 0);
            filas.push([
                area,
                categoria,
                prod.nombre,
                pres.nombre || "",
                pres.unidad || prod.unidadBase || "",
                stock,
                prod.stockMinimo ?? "",
                pres.ultimoPrecioPagado ? numero(pres.ultimoPrecioPagado) : "",
                pres.buenPrecio ? numero(pres.buenPrecio) : "",
                numero(stock * precio),
                prod.necesario ? "Sí" : "No",
            ]);
        });
    });

    filas.sort((a, b) => `${a[0]}|${a[1]}|${a[2]}`.localeCompare(`${b[0]}|${b[1]}|${b[2]}`, "es"));
    descargarCSV(`Inventario_Despensa_${fechaLocalISO()}.csv`, construirCSV(ENCABEZADOS, filas));
};
