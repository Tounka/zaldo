/*
 * Los 8 reportes con diseño fijo que el asistente sabe armar.
 *
 * Aquí solo vive lo que comparten la app, el Worker y la CLI: el id, para qué
 * sirve cada uno y qué diapositivas lleva. El cálculo está en calculos.js y el
 * diseño en plantillas.js. Por eso este archivo no importa nada: el Worker lo
 * empaqueta y lo usa para armar el esquema strict de POST /reporte.
 *
 * `diapositivas`: id → qué conclusión debe dar su título. La IA solo puede
 * escribir esos títulos, los puntos de resumen y las recomendaciones; las
 * cifras, gráficas, tablas y el orden de las diapositivas son siempre los
 * nuestros.
 *
 * `periodo`: "mes" (un mes), "meses" (varios) o null (foto de hoy).
 */

export const REPORTES = {
  cierre_mes: {
    nombre: "Cierre de mes",
    descripcion: "resumen de un mes: ingresos, gastos, balance, categorías principales, gasto más grande y comparación con los 3 meses anteriores",
    periodo: "mes",
    diapositivas: {
      resumen: "cómo cerró el mes (balance positivo o negativo y por qué)",
      categorias: "en qué se fue la mayor parte del gasto",
      comparacion: "si el gasto del mes fue mayor o menor que el promedio de los 3 meses anteriores",
    },
  },
  gasto_personal: {
    nombre: "Gasto personal",
    descripcion: "gasto marcado como personal frente al resto, mes a mes, con su promedio mensual, sus categorías y la tendencia",
    periodo: "meses",
    diapositivas: {
      resumen: "cuánto pesa el gasto personal en el gasto total",
      evolucion: "cómo se movió el gasto personal mes a mes frente al resto",
      categorias: "en qué categorías se va el gasto personal",
    },
  },
  categorias: {
    nombre: "Categorías de gasto",
    descripcion: "ranking de categorías de gasto y su evolución mes a mes, con la que más subió y la que más bajó",
    periodo: "meses",
    diapositivas: {
      resumen: "cuál categoría domina el gasto",
      ranking: "qué tan concentrado está el gasto en pocas categorías",
      evolucion: "cómo cambió la mezcla de categorías mes a mes",
      cambios: "qué categoría subió más y cuál bajó más",
    },
  },
  tarjetas: {
    nombre: "Tarjetas de crédito",
    descripcion: "deuda por tarjeta, uso del límite (alerta arriba de 30 %), saldo a meses sin intereses y revolvente",
    periodo: null,
    diapositivas: {
      resumen: "qué tan endeudadas están las tarjetas en conjunto",
      uso: "qué tarjetas pasan del 30 % de uso de su límite",
      detalle: "cuánto de la deuda es a meses sin intereses y cuánto revolvente",
    },
  },
  ingresos: {
    nombre: "Ingresos",
    descripcion: "ingreso mensual, fuentes, qué tan concentrado está en una sola fuente y lo pendiente de cobro",
    periodo: "meses",
    diapositivas: {
      resumen: "de qué tamaño y qué tan estable es el ingreso mensual",
      evolucion: "cómo se movió el ingreso mes a mes y de qué fuentes vino",
      concentracion: "qué tanto depende el ingreso de una sola fuente",
    },
  },
  ahorro: {
    nombre: "Ahorro",
    descripcion: "capital ahorrado, su composición, avance de la meta anual y rendimiento por cuenta",
    periodo: null,
    diapositivas: {
      resumen: "cómo va el capital frente a la meta del año",
      evolucion: "cómo creció el capital en el año de ahorro",
      composicion: "cuánto del capital es líquido y cuánto está invertido o prestado",
      cuentas: "qué cuentas rinden más y cuáles menos",
    },
  },
  prestamos: {
    nombre: "Préstamos por cobrar",
    descripcion: "cuánto le deben al usuario, cuántos préstamos y desde cuándo",
    periodo: null,
    diapositivas: {
      resumen: "cuánto dinero está prestado y cuánto se ha recuperado",
      antiguedad: "qué tan viejos son los préstamos pendientes",
      detalle: "qué préstamos concentran la mayor parte del saldo",
    },
  },
  despensa: {
    nombre: "Despensa",
    descripcion: "gasto mensual en despensa, productos que faltan y en qué productos se va más dinero",
    periodo: "meses",
    diapositivas: {
      resumen: "cuánto se gasta al mes en despensa",
      evolucion: "cómo se movió el gasto en despensa mes a mes",
      productos: "en qué productos se va más dinero",
      faltantes: "qué falta comprar",
    },
  },
};

export const IDS_REPORTE = Object.keys(REPORTES);

/* Límites de los textos que redacta la IA (también los valida la app). */
export const LIMITE_TITULO_REPORTE = 110;
export const LIMITE_PUNTO_REPORTE = 220;
export const MAXIMO_PUNTOS_REPORTE = 4;
export const MAXIMO_RECOMENDACIONES_REPORTE = 4;
