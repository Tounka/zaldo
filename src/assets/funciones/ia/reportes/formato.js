/*
 * Formato de cifras en los reportes. Sin centavos (un reporte se lee de
 * lejos) y sin depender del store: lo usan también Node y las pruebas.
 */

const formateador = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/* "$12,345"; los negativos como "-$1,200". */
export const dinero = (valor) => formateador.format(Math.round(Number(valor) || 0) || 0);

/* "+$1,200" / "-$1,200": para diferencias. */
export const dineroConSigno = (valor) => `${Number(valor) > 0 ? "+" : ""}${dinero(valor)}`;

/* 0.234 → "23%"; con decimales = 1 → "23.4%". */
export const porcentaje = (fraccion, decimales = 0) => (Number.isFinite(fraccion)
  ? `${(fraccion * 100).toFixed(decimales).replace(/\.0$/, "")}%`
  : "—");

export const plural = (n, singular, varios = `${singular}s`) => `${n} ${n === 1 ? singular : varios}`;

/* Primera letra en mayúscula ("octubre de 2026" → "Octubre de 2026"). */
export const capitalizar = (texto) => (texto ? `${texto[0].toUpperCase()}${texto.slice(1)}` : "");
