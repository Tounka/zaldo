import { claveMesDeFecha, esGasto, esIngreso, normalizar, redondear } from "./reglasConsulta.js";

/*
 * Hábitos de captura: lo que la IA dejó vacío (categoría o cuenta) se llena
 * con lo que la persona ya hizo en movimientos con el mismo concepto. Todo se
 * calcula en el navegador con su historial; a la IA no viaja nada.
 */

const LARGO_MINIMO = 3;
const MINIMO_CATEGORIA = 2;
const MINIMO_CUENTA = 3;
const MAYORIA = 0.6;

const clave = (nota) => normalizar(nota).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const contiene = (larga, corta) => corta.length >= LARGO_MINIMO && ` ${larga} `.includes(` ${corta} `);

const mayoritario = (valores, minimo) => {
  const conteo = new Map();
  valores.filter(Boolean).forEach((valor) => conteo.set(valor, (conteo.get(valor) || 0) + 1));
  const total = [...conteo.values()].reduce((suma, veces) => suma + veces, 0);
  const [valor, veces] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  return veces >= minimo && veces / total >= MAYORIA ? valor : null;
};

/**
 * @param tipo "gasto" | "ingreso"
 * @returns {{ categoria: string|null, cuentaId: string|null }}
 */
export const sugerirPorHabito = ({ nota, tipo, movimientos = [] }) => {
  const buscada = clave(nota);
  if (buscada.length < LARGO_MINIMO) return { categoria: null, cuentaId: null };

  const delTipo = movimientos.filter(tipo === "ingreso" ? esIngreso : esGasto);
  const exactos = delTipo.filter((movimiento) => clave(movimiento.nota) === buscada);
  // "uber" y "uber eats" solo se juntan si no hay suficientes iguales.
  const parecidos = exactos.length >= MINIMO_CATEGORIA
    ? exactos
    : delTipo.filter((movimiento) => {
      const otra = clave(movimiento.nota);
      return otra === buscada || contiene(otra, buscada) || contiene(buscada, otra);
    });

  return {
    categoria: mayoritario(parecidos.map((movimiento) => movimiento.categoria), MINIMO_CATEGORIA),
    cuentaId: mayoritario(parecidos.map((movimiento) => movimiento.cuentaAsociada), MINIMO_CUENTA),
  };
};

/**
 * Cuánto lleva en una categoría este mes y cuánto llevaba el mes pasado al mismo día.
 * @returns {{ total: number, mesPasado: number } | null} null si la fecha no es del mes en curso.
 */
export const avanceDeCategoria = ({ categoria, fechaISO, hoyISO, movimientos = [] }) => {
  if (!categoria || claveMesDeFecha(fechaISO) !== claveMesDeFecha(hoyISO)) return null;

  const anterior = new Date(Number(hoyISO.slice(0, 4)), Number(hoyISO.slice(5, 7)) - 2, 1);
  const claveAnterior = `${anterior.getFullYear()}${String(anterior.getMonth() + 1).padStart(2, "0")}`;
  const dia = hoyISO.slice(8, 10);

  const suma = (filtro) => redondear(movimientos
    .filter((movimiento) => esGasto(movimiento) && movimiento.categoria === categoria && filtro(movimiento.fechaISO || ""))
    .reduce((total, movimiento) => total - Number(movimiento.monto), 0));

  return {
    total: suma((fecha) => claveMesDeFecha(fecha) === claveMesDeFecha(hoyISO)),
    mesPasado: suma((fecha) => claveMesDeFecha(fecha) === claveAnterior && fecha.slice(8, 10) <= dia),
  };
};
