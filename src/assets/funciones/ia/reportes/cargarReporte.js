import { useAppStore } from "../../../stores/useAppStore";
import { obtenerIngresosAnio } from "../../firebase/ingresos";
import { getAnioAhorro, obtenerAhorrosAnio } from "../../firebase/ahorros";
import { obtenerTodosPrestamos } from "../../firebase/prestamos";
import { derivarInventario } from "../../firebase/despensa";
import { obtenerCatalogoDespensa } from "../../registrarCompraDespensa";
import { esCobroConfirmado, obtenerMontoRegistro } from "../../ingresosCalculos";
import { calcularTotalPagado } from "../../prestamosCalculos";
import { cargarMovimientos } from "../cargarDatosConsulta.js";
import { fechaISODeMovimiento, haceMeses } from "../reglasConsulta.js";
import { periodoDelReporte } from "./calculos.js";

/*
 * Lee de Firestore lo que necesita cada reporte, con las mismas funciones que
 * las páginas y las consultas del asistente, y lo deja en la forma simple que
 * esperan los cálculos puros (calculos.js). La respuesta amplia
 * (panorama/construirPanorama.js) reutiliza estos mismos cargadores.
 */

const cuentasActivas = () => useAppStore.getState().cuentas.filter((cuenta) => cuenta?.id && cuenta.activo !== false);

/* Registros del módulo de ingresos en la forma de calculos.js. */
export const cargarIngresosModulo = async (uid, periodo) => {
  const anios = [...new Set([periodo.desde.slice(0, 4), periodo.hasta.slice(0, 4)])];
  const documentos = (await Promise.all(anios.map((anio) => obtenerIngresosAnio(uid, Number(anio))))).filter(Boolean);
  return documentos.flatMap((documento) => {
    const empresas = Object.fromEntries((documento.empresas || []).map((empresa) => [empresa.id, empresa]));
    return (documento.registros || []).map((registro) => {
      const empresa = empresas[registro.empresaId] || {};
      return {
        fecha: String(registro.fecha || "").slice(0, 10),
        monto: obtenerMontoRegistro(registro),
        fuente: empresa.nombre || "Otros",
        // Igual que la consulta de ingresos: los cortes semanales no son cobros.
        estado: registro.estado !== "Pagado" ? "pendiente" : esCobroConfirmado(registro, empresa) ? "cobrado" : "omitido",
      };
    });
  });
};

export const cargarPrestamos = async (uid) => (await obtenerTodosPrestamos(uid))
  .filter((prestamo) => prestamo.activo !== false && prestamo.estado !== "pagado" && prestamo.estado !== "liquidado")
  .map((prestamo) => ({
    nombre: prestamo.nombre || "Sin nombre",
    montoPrestado: Number(prestamo.montoPrestado || 0),
    interes: Number(prestamo.interesEstimado || 0),
    pagado: calcularTotalPagado(prestamo.pagos || []),
    fechaInicio: fechaISODeMovimiento(prestamo.fechaInicio || prestamo.fechaCreacion),
  }));

export const CARGADORES = {
  cierre_mes: async ({ uid, periodo }) => {
    // El mes y los 3 anteriores, para comparar contra su promedio.
    const [movimientos, ingresosModulo] = await Promise.all([
      cargarMovimientos(uid, { desde: haceMeses(periodo.desde, 3), hasta: periodo.hasta }),
      cargarIngresosModulo(uid, periodo),
    ]);
    return { movimientos, ingresosModulo };
  },
  gasto_personal: async ({ uid, periodo }) => ({ movimientos: await cargarMovimientos(uid, periodo) }),
  categorias: async ({ uid, periodo }) => ({ movimientos: await cargarMovimientos(uid, periodo) }),
  tarjetas: async () => ({ cuentas: cuentasActivas() }),
  ingresos: async ({ uid, periodo }) => {
    const ingresosModulo = await cargarIngresosModulo(uid, periodo);
    const hayCobros = ingresosModulo.some((registro) => registro.estado === "cobrado"
      && registro.fecha >= periodo.desde && registro.fecha <= periodo.hasta);
    // Los movimientos solo se leen si el módulo de ingresos no tiene cobros en el periodo.
    return { ingresosModulo, movimientos: hayCobros ? [] : await cargarMovimientos(uid, periodo) };
  },
  ahorro: async ({ uid }) => {
    const anio = getAnioAhorro();
    const data = useAppStore.getState().ahorrosPorAnio?.[`${uid}_${anio}`] || await obtenerAhorrosAnio(uid, anio);
    return { data, anio };
  },
  prestamos: async ({ uid }) => ({ prestamos: await cargarPrestamos(uid) }),
  despensa: async ({ uid }) => {
    const catalogo = await obtenerCatalogoDespensa(uid);
    return { gastoPorMes: catalogo?.gastoPorMes || {}, inventario: derivarInventario(catalogo) };
  },
};

/**
 * @returns {Promise<{ periodo, advertencias, datos }>} `datos` va directo al cálculo del reporte.
 */
export const cargarReporte = async (reporte, consulta, { uid, hoyISO }) => {
  const advertencias = [];
  const periodo = periodoDelReporte(reporte, consulta, hoyISO, advertencias);
  const datos = await CARGADORES[reporte]({ uid, periodo, consulta });
  return { periodo, advertencias, datos };
};
