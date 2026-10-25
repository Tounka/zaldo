import { obtenerMovimientosPorAnioMes } from "../firebase/movimientos";
import { fechaISODeMovimiento, mesesDelPeriodo } from "./reglasConsulta.js";

/*
 * Lecturas de Firestore que comparten las consultas del asistente y los
 * reportes. Usan las mismas funciones que las páginas, así que las cifras
 * cuadran con lo que el usuario ve en Movimientos.
 */

/* Un documento por mes (YYYYMM); se recorta al periodo exacto por fecha. */
export const cargarMovimientos = async (uid, periodo) => {
  const documentos = await Promise.all(
    mesesDelPeriodo(periodo).map((clave) => obtenerMovimientosPorAnioMes(uid, clave)),
  );
  return documentos
    .flatMap((documento) => documento?.movimientos || [])
    .map((movimiento) => ({ ...movimiento, fechaISO: fechaISODeMovimiento(movimiento.fechaMovimiento) }))
    .filter((movimiento) => movimiento.fechaISO >= periodo.desde && movimiento.fechaISO <= periodo.hasta);
};
