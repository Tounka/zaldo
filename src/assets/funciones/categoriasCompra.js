import gastosFijos from "../imagenes/categoriasCompra/gastosFijos.webp";
import hogar from "../imagenes/categoriasCompra/hogar.webp";
import comida from "../imagenes/categoriasCompra/comida.webp";
import despensa from "../imagenes/categoriasCompra/despensa.webp";
import transporte from "../imagenes/categoriasCompra/transporte.webp";
import entretenimiento from "../imagenes/categoriasCompra/entretenimiento.webp";
import salud from "../imagenes/categoriasCompra/salud.webp";
import personal from "../imagenes/categoriasCompra/personal.webp";
import educacion from "../imagenes/categoriasCompra/educacion.webp";
import servicios from "../imagenes/categoriasCompra/servicios.webp";
import ahorro from "../imagenes/categoriasCompra/ahorro.webp";
import deudas from "../imagenes/categoriasCompra/deudas.webp";
import pagoTarjeta from "../imagenes/categoriasCompra/pagoTarjeta.webp";
import transferencia from "../imagenes/categoriasCompra/transferencia.webp";
import { categoriasEsqueleto } from "./utils/esqueletos";

export const IMAGENES_CATEGORIAS_COMPRA = {
  gastosFijos,
  hogar,
  comida,
  despensa,
  transporte,
  entretenimiento,
  salud,
  personal,
  educacion,
  servicios,
  ahorro,
  deudas,
  pagoTarjeta,
  transferencia,
};

export const CATEGORIAS_COMPRA = categoriasEsqueleto.map((categoria) => ({
  ...categoria,
  imagen: IMAGENES_CATEGORIAS_COMPRA[categoria.value] || gastosFijos,
}));

export const obtenerImagenCategoriaCompra = (categoria) => (
  IMAGENES_CATEGORIAS_COMPRA[categoria] || gastosFijos
);
