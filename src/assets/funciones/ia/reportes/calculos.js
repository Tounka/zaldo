import { nombresDeCuentas, rendimientoTotalAnio, resumenRendimientoPorCuenta } from "../../ahorrosRendimientos.js";
import { REPORTES } from "./catalogo.js";
import {
  MARCAS,
  claveMesDeFecha,
  describirPeriodo,
  esGasto,
  esIngreso,
  esPersonal,
  etiquetaCategoria,
  etiquetaMesCorta,
  filtrarPorConsulta,
  finDeMes,
  finDelMesPasado,
  haceMeses,
  mesCompleto,
  mesesDelPeriodo,
  nombreMes,
  primeroDelMes,
  redondear,
  resolverPeriodo,
  sumaGastos,
} from "../reglasConsulta.js";

/*
 * Cálculo de cada reporte. Funciones puras: reciben los datos ya leídos de
 * Firestore (cargarReporte.js) y devuelven solo cifras agregadas. Todo número
 * que aparece en un reporte sale de aquí; la IA nunca calcula.
 *
 * Reglas comunes:
 *   - Gasto, ingreso y "personal" con las mismas reglas que las consultas
 *     del asistente (reglasConsulta.js).
 *   - Los promedios mensuales usan solo meses completos, y no cuentan los
 *     meses anteriores al primer registro (serían ceros falsos).
 *   - Los nombres (de cuentas, fuentes o personas) se quedan en el navegador:
 *     a la IA solo viaja lo que devuelve `metricasParaIA` de cada plantilla.
 */

const TOP_CATEGORIAS = 5;
const UMBRAL_USO_TARJETA = 0.3;
const UMBRAL_TENDENCIA = 0.1;
const DIA_MS = 24 * 60 * 60 * 1000;

const sumar = (lista, campo) => redondear(lista.reduce((suma, item) => suma + (Number(campo ? item[campo] : item) || 0), 0));
const fraccion = (parte, total) => (total ? parte / total : null);
const enPeriodo = (fechaISO, periodo) => fechaISO >= periodo.desde && fechaISO <= periodo.hasta;
const etiquetaGasto = (movimiento) => etiquetaCategoria(movimiento.categoria);

/* Suma por clave y ordena de mayor a menor: [{ nombre, total, porcentaje }]. */
const ranking = (items, clave, monto) => {
  const grupos = new Map();
  items.forEach((item) => grupos.set(clave(item), (grupos.get(clave(item)) || 0) + monto(item)));
  const total = [...grupos.values()].reduce((suma, valor) => suma + valor, 0);
  return [...grupos.entries()]
    .map(([nombre, valor]) => ({ nombre, total: redondear(valor), porcentaje: fraccion(valor, total) }))
    .sort((a, b) => b.total - a.total);
};

const montoGasto = (movimiento) => -Number(movimiento.monto) || 0;

/*
 * Meses del periodo desde el primero con datos, con su bandera de completo.
 * `conDatos(clave)` dice si ese mes tiene algún registro.
 */
const mesesConDatos = (periodo, hoyISO, conDatos, advertencias) => {
  const claves = mesesDelPeriodo(periodo);
  const primera = claves.find(conDatos);
  if (!primera) return [];
  if (primera !== claves[0]) {
    advertencias.push(`No hay registros antes de ${nombreMes(primera)}; esos meses no cuentan en el promedio.`);
  }
  return claves
    .filter((clave) => clave >= primera)
    .map((clave) => ({ clave, etiqueta: etiquetaMesCorta(clave), completo: mesCompleto(clave, periodo, hoyISO) }));
};

/* Meses que entran al promedio: los completos o, si no hay, todos (avisando). */
const baseDelPromedio = (meses, advertencias) => {
  const completos = meses.filter((mes) => mes.completo);
  if (completos.length) return completos;
  if (meses.length) advertencias.push("Ningún mes del periodo está completo; el promedio es parcial.");
  return meses;
};

const promedio = (meses, campo) => (meses.length ? redondear(sumar(meses, campo) / meses.length) : 0);

/* "sube" / "baja" / "estable" entre el primer y el último valor. */
const tendencia = (inicial, final) => {
  if (!inicial) return { direccion: final > 0 ? "sube" : "estable", variacion: null };
  const variacion = (final - inicial) / inicial;
  if (Math.abs(variacion) < UMBRAL_TENDENCIA) return { direccion: "estable", variacion };
  return { direccion: variacion > 0 ? "sube" : "baja", variacion };
};

const comunes = (periodo, hoyISO, advertencias) => ({
  periodo,
  nombrePeriodo: periodo ? describirPeriodo(periodo, hoyISO) : "hoy",
  advertencias,
});

/* ─────────── Periodo de cada reporte ─────────── */

const MESES_POR_DEFECTO = 3;

/*
 * Periodo de cada tipo de reporte:
 *   "mes"   → un mes completo (o lo que va del mes en curso); por defecto el mes pasado.
 *   "meses" → lo que pidió el usuario; por defecto los 3 meses completos anteriores.
 */
export const periodoDelReporte = (reporte, consulta, hoyISO, advertencias) => {
  const tipo = REPORTES[reporte]?.periodo;
  if (!tipo) return null;

  if (tipo === "mes") {
    // Si el rango abarca varios meses, el cierre es del último.
    const referencia = consulta.hasta || consulta.desde || finDelMesPasado(hoyISO);
    const desde = primeroDelMes(referencia > hoyISO ? hoyISO : referencia);
    const fin = `${desde.slice(0, 8)}${String(finDeMes(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)))).padStart(2, "0")}`;
    return { desde, hasta: fin < hoyISO ? fin : hoyISO };
  }

  if (!consulta.desde) return { desde: haceMeses(hoyISO, MESES_POR_DEFECTO), hasta: finDelMesPasado(hoyISO) };
  return resolverPeriodo(consulta, hoyISO, advertencias);
};

/* ─────────── 1. Cierre de mes ─────────── */

/**
 * @param movimientos  Del mes y de los 3 anteriores (con fechaISO).
 * @param ingresosModulo  Registros del módulo de ingresos ya normalizados
 *                        ({ fecha, monto, fuente, estado: "cobrado" | "pendiente" | "omitido" }).
 */
export const calcularCierreMes = ({ movimientos = [], ingresosModulo = [], consulta = {}, periodo, hoyISO }) => {
  const advertencias = [];
  const clave = claveMesDeFecha(periodo.desde);
  const previas = mesesDelPeriodo({ desde: restarMeses(periodo.desde, 3), hasta: restarMeses(periodo.desde, 1) });
  const gastos = filtrarPorConsulta(movimientos.filter(esGasto), consulta);
  const delMes = gastos.filter((movimiento) => enPeriodo(movimiento.fechaISO, periodo));

  // Ingresos: el módulo de ingresos manda; sin él, los ingresos registrados como movimientos.
  const cobradosModulo = ingresosModulo.filter((registro) => registro.estado === "cobrado" && enPeriodo(registro.fecha, periodo));
  const ingresosMovimiento = movimientos.filter((movimiento) => esIngreso(movimiento) && enPeriodo(movimiento.fechaISO, periodo));
  const origenIngresos = cobradosModulo.length ? "modulo" : "movimientos";
  const ingresos = cobradosModulo.length ? sumar(cobradosModulo, "monto") : sumar(ingresosMovimiento, "monto");

  const totalGastos = sumaGastos(delMes);
  const categorias = ranking(delMes, etiquetaGasto, montoGasto);
  const mayor = delMes.reduce((maximo, movimiento) => (!maximo || movimiento.monto < maximo.monto ? movimiento : maximo), null);

  // Meses anteriores: solo desde el primero con gastos registrados.
  const totalPorMes = (claveMes) => sumaGastos(gastos.filter((movimiento) => claveMesDeFecha(movimiento.fechaISO) === claveMes));
  const primeraPrevia = previas.find((claveMes) => totalPorMes(claveMes) > 0);
  const anteriores = previas
    .filter((claveMes) => primeraPrevia && claveMes >= primeraPrevia)
    .map((claveMes) => ({ clave: claveMes, etiqueta: etiquetaMesCorta(claveMes), total: totalPorMes(claveMes) }));
  const promedioAnterior = anteriores.length ? promedio(anteriores, "total") : null;
  if (!anteriores.length) advertencias.push("No hay gastos en los 3 meses anteriores para comparar.");

  const completo = mesCompleto(clave, periodo, hoyISO);
  if (!completo) advertencias.push(`${capitalizarMes(clave)} todavía no termina: las cifras son parciales.`);

  return {
    ...comunes(periodo, hoyISO, advertencias),
    mes: { clave, nombre: nombreMes(clave), etiqueta: etiquetaMesCorta(clave), completo },
    filtro: MARCAS[consulta.marca]?.nombre || "",
    ingresos,
    origenIngresos,
    gastos: totalGastos,
    balance: redondear(ingresos - totalGastos),
    tasaAhorro: fraccion(ingresos - totalGastos, ingresos),
    movimientos: delMes.length,
    categorias: categorias.slice(0, TOP_CATEGORIAS),
    numeroCategorias: categorias.length,
    mayor: mayor ? {
      monto: redondear(-mayor.monto),
      categoria: etiquetaGasto(mayor),
      fecha: mayor.fechaISO,
      nota: String(mayor.nota || "").slice(0, 60),
    } : null,
    anteriores,
    promedioAnterior,
    diferencia: promedioAnterior === null ? null : redondear(totalGastos - promedioAnterior),
    variacion: promedioAnterior ? (totalGastos - promedioAnterior) / promedioAnterior : null,
    vacio: delMes.length === 0 && ingresos === 0,
  };
};

/* "2026-10-01" menos N meses → "2026-07-01" (siempre día 1). */
const restarMeses = (fechaISO, meses) => {
  const fecha = new Date(Number(fechaISO.slice(0, 4)), Number(fechaISO.slice(5, 7)) - 1 - meses, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
};
const capitalizarMes = (clave) => {
  const texto = nombreMes(clave);
  return `${texto[0].toUpperCase()}${texto.slice(1)}`;
};

/* ─────────── 2. Gasto personal ─────────── */

export const calcularGastoPersonal = ({ movimientos = [], consulta = {}, periodo, hoyISO }) => {
  const advertencias = [];
  // El reporte ES sobre la marca personal: se ignora la marca que venga en la consulta.
  const gastos = filtrarPorConsulta(movimientos.filter(esGasto), { ...consulta, marca: "" })
    .filter((movimiento) => enPeriodo(movimiento.fechaISO, periodo));
  const delMes = (clave) => gastos.filter((movimiento) => claveMesDeFecha(movimiento.fechaISO) === clave);

  const meses = mesesConDatos(periodo, hoyISO, (clave) => delMes(clave).length > 0, advertencias)
    .map((mes) => {
      const lista = delMes(mes.clave);
      const personal = sumaGastos(lista.filter(esPersonal));
      const total = sumaGastos(lista);
      const extraordinario = sumaGastos(lista.filter((movimiento) => movimiento.esExtraordinario));
      return { ...mes, personal, resto: redondear(total - personal), total, extraordinario };
    });
  const baseMeses = baseDelPromedio(meses, advertencias);
  const personales = gastos.filter(esPersonal);
  const totalPersonal = sumaGastos(personales);
  const totalGeneral = sumaGastos(gastos);
  const mayor = baseMeses.reduce((maximo, mes) => (!maximo || mes.personal > maximo.personal ? mes : maximo), null);

  return {
    ...comunes(periodo, hoyISO, advertencias),
    meses,
    mesesCompletos: meses.filter((mes) => mes.completo).length,
    promedioPersonal: promedio(baseMeses, "personal"),
    promedioResto: promedio(baseMeses, "resto"),
    promedioTotal: promedio(baseMeses, "total"),
    // Palanca: lo recurrente es lo que se puede planear; lo extraordinario, no.
    promedioExtraordinario: promedio(baseMeses, "extraordinario"),
    promedioRecurrente: redondear(promedio(baseMeses, "total") - promedio(baseMeses, "extraordinario")),
    totalPersonal,
    totalGeneral,
    participacion: fraccion(sumar(baseMeses, "personal"), sumar(baseMeses, "total")),
    categorias: ranking(personales, etiquetaGasto, montoGasto).slice(0, TOP_CATEGORIAS),
    tendencia: baseMeses.length > 1 ? tendencia(baseMeses[0].personal, baseMeses.at(-1).personal) : { direccion: "estable", variacion: null },
    mesMasAlto: mayor ? { etiqueta: mayor.etiqueta, nombre: nombreMes(mayor.clave), personal: mayor.personal } : null,
    vacio: personales.length === 0,
  };
};

/* ─────────── 3. Categorías ─────────── */

export const calcularCategorias = ({ movimientos = [], consulta = {}, periodo, hoyISO }) => {
  const advertencias = [];
  const gastos = filtrarPorConsulta(movimientos.filter(esGasto), consulta)
    .filter((movimiento) => enPeriodo(movimiento.fechaISO, periodo));
  const delMes = (clave) => gastos.filter((movimiento) => claveMesDeFecha(movimiento.fechaISO) === clave);

  const meses = mesesConDatos(periodo, hoyISO, (clave) => delMes(clave).length > 0, advertencias);
  const baseMeses = baseDelPromedio(meses, advertencias);
  const todas = ranking(gastos, etiquetaGasto, montoGasto);
  const principales = todas.slice(0, TOP_CATEGORIAS).map((categoria) => categoria.nombre);
  const total = sumaGastos(gastos);

  // Por mes: las principales y el resto junto en "Otras".
  const porMes = meses.map((mes) => {
    const delMes_ = ranking(delMes(mes.clave), etiquetaGasto, montoGasto);
    const valor = (nombre) => delMes_.find((categoria) => categoria.nombre === nombre)?.total || 0;
    const otras = redondear(delMes_.filter((categoria) => !principales.includes(categoria.nombre)).reduce((suma, categoria) => suma + categoria.total, 0));
    return { ...mes, valores: Object.fromEntries([...principales.map((nombre) => [nombre, valor(nombre)]), ["Otras", otras]]), total: sumar(delMes_, "total") };
  });

  // Cambio entre el primer y el último mes de la base del promedio.
  const primero = porMes.find((mes) => mes.clave === baseMeses[0]?.clave);
  const ultimo = porMes.find((mes) => mes.clave === baseMeses.at(-1)?.clave);
  const cambios = primero && ultimo && primero !== ultimo
    ? todas.map(({ nombre }) => {
      const antes = sumaGastos(delMes(primero.clave).filter((movimiento) => etiquetaGasto(movimiento) === nombre));
      const despues = sumaGastos(delMes(ultimo.clave).filter((movimiento) => etiquetaGasto(movimiento) === nombre));
      return { nombre, antes, despues, diferencia: redondear(despues - antes) };
    }).sort((a, b) => b.diferencia - a.diferencia)
    : [];
  const subio = cambios.find((cambio) => cambio.diferencia > 0) || null;
  const bajo = [...cambios].reverse().find((cambio) => cambio.diferencia < 0) || null;

  return {
    ...comunes(periodo, hoyISO, advertencias),
    filtro: MARCAS[consulta.marca]?.nombre || "",
    total,
    promedioMensual: promedio(baseMeses.map((mes) => porMes.find((item) => item.clave === mes.clave)), "total"),
    mesesCompletos: meses.filter((mes) => mes.completo).length,
    ranking: todas.map((categoria) => ({
      ...categoria,
      promedioMensual: baseMeses.length
        ? redondear(sumaGastos(gastos.filter((movimiento) => etiquetaGasto(movimiento) === categoria.nombre
          && baseMeses.some((mes) => mes.clave === claveMesDeFecha(movimiento.fechaISO)))) / baseMeses.length)
        : 0,
    })),
    principales,
    porMes,
    concentracionTop3: fraccion(sumar(todas.slice(0, 3), "total"), total),
    comparacion: primero && ultimo && primero !== ultimo ? { desde: primero.etiqueta, hasta: ultimo.etiqueta } : null,
    subio,
    bajo,
    vacio: gastos.length === 0,
  };
};

/* ─────────── 4. Tarjetas ─────────── */

/*
 * Deuda = saldoALaFecha + saldoALaFechaMSI, como la tarjeta de la cuenta
 * (CardCuenta.jsx). El revolvente y el MSI se muestran por separado.
 */
export const calcularTarjetas = ({ cuentas = [] }) => {
  const advertencias = [];
  const tarjetas = cuentas
    .filter((cuenta) => cuenta?.id && cuenta.activo !== false && cuenta.tipoDeCuenta === "credito")
    .map((cuenta) => {
      const saldo = Number(cuenta.saldoALaFecha || 0);
      const saldoMSI = Number(cuenta.saldoALaFechaMSI || 0);
      const deuda = redondear(Math.max(0, -(saldo + saldoMSI)));
      const limite = Number(cuenta.limiteDeCredito || 0);
      return {
        nombre: cuenta.nombre || "Tarjeta",
        deuda,
        revolvente: redondear(Math.max(0, -saldo)),
        msi: redondear(Math.max(0, -saldoMSI)),
        limite,
        disponible: limite ? redondear(Math.max(0, limite - deuda)) : null,
        uso: limite ? deuda / limite : null,
        alerta: limite > 0 && deuda / limite > UMBRAL_USO_TARJETA,
        // Palanca: lo que habría que pagar para dejarla en el umbral de uso.
        paraBajarAlUmbral: limite ? redondear(Math.max(0, deuda - limite * UMBRAL_USO_TARJETA)) : null,
      };
    })
    .sort((a, b) => b.deuda - a.deuda);

  const sinLimite = tarjetas.filter((tarjeta) => !tarjeta.limite).length;
  if (sinLimite) advertencias.push(`${sinLimite === 1 ? "Una tarjeta no tiene" : `${sinLimite} tarjetas no tienen`} límite registrado; no cuentan en el uso total.`);

  const conLimite = tarjetas.filter((tarjeta) => tarjeta.limite);
  const deudaConLimite = sumar(conLimite, "deuda");
  const limite = sumar(conLimite, "limite");

  return {
    ...comunes(null, null, advertencias),
    tarjetas,
    deuda: sumar(tarjetas, "deuda"),
    revolvente: sumar(tarjetas, "revolvente"),
    msi: sumar(tarjetas, "msi"),
    limite,
    usoTotal: fraccion(deudaConLimite, limite),
    enAlerta: tarjetas.filter((tarjeta) => tarjeta.alerta).length,
    paraBajarAlUmbral: redondear(tarjetas.reduce((suma, tarjeta) => suma + (tarjeta.paraBajarAlUmbral || 0), 0)),
    umbral: UMBRAL_USO_TARJETA,
    vacio: tarjetas.length === 0,
  };
};

/* ─────────── 5. Ingresos ─────────── */

export const calcularIngresos = ({ ingresosModulo = [], movimientos = [], periodo, hoyISO }) => {
  const advertencias = [];
  const delPeriodo = ingresosModulo.filter((registro) => enPeriodo(registro.fecha, periodo));
  let cobrados = delPeriodo.filter((registro) => registro.estado === "cobrado");
  const origen = cobrados.length ? "modulo" : "movimientos";

  // Sin el módulo de ingresos, se usan los ingresos registrados como movimientos.
  if (!cobrados.length) {
    cobrados = movimientos
      .filter((movimiento) => esIngreso(movimiento) && enPeriodo(movimiento.fechaISO, periodo))
      .map((movimiento) => ({ fecha: movimiento.fechaISO, monto: Number(movimiento.monto), fuente: movimiento.nota || etiquetaCategoria(movimiento.categoria) }));
  }

  const fuentes = ranking(cobrados, (registro) => registro.fuente || "Otros", (registro) => Number(registro.monto) || 0);
  const delMes = (clave) => cobrados.filter((registro) => claveMesDeFecha(registro.fecha) === clave);
  const principales = fuentes.slice(0, 4).map((fuente) => fuente.nombre);
  const meses = mesesConDatos(periodo, hoyISO, (clave) => delMes(clave).length > 0, advertencias)
    .map((mes) => {
      const lista = delMes(mes.clave);
      const valor = (nombre) => sumar(lista.filter((registro) => (registro.fuente || "Otros") === nombre), "monto");
      return {
        ...mes,
        total: sumar(lista, "monto"),
        valores: Object.fromEntries([
          ...principales.map((nombre) => [nombre, valor(nombre)]),
          ["Otras", sumar(lista.filter((registro) => !principales.includes(registro.fuente || "Otros")), "monto")],
        ]),
      };
    });
  const baseMeses = baseDelPromedio(meses, advertencias);
  const total = sumar(cobrados, "monto");
  const concentracion = fuentes[0]?.porcentaje ?? null;
  const minimo = baseMeses.reduce((menor, mes) => (!menor || mes.total < menor.total ? mes : menor), null);
  const maximo = baseMeses.reduce((mayor, mes) => (!mayor || mes.total > mayor.total ? mes : mayor), null);

  return {
    ...comunes(periodo, hoyISO, advertencias),
    origen,
    total,
    promedioMensual: promedio(baseMeses, "total"),
    mesesCompletos: meses.filter((mes) => mes.completo).length,
    minimo: minimo ? { etiqueta: minimo.etiqueta, total: minimo.total } : null,
    maximo: maximo ? { etiqueta: maximo.etiqueta, total: maximo.total } : null,
    meses,
    principales,
    fuentes,
    concentracion,
    nivelConcentracion: concentracion === null ? "" : concentracion >= 0.7 ? "alta" : concentracion >= 0.4 ? "media" : "baja",
    pendiente: sumar(delPeriodo.filter((registro) => registro.estado === "pendiente"), "monto"),
    vacio: cobrados.length === 0,
  };
};

/* ─────────── 6. Ahorro ─────────── */

const GRUPOS_AHORRO = { liquido: "Líquido", inversiones: "Inversiones y préstamos", inversionesLargo: "Largo plazo" };

/** @param data  Documento del año de ahorro (obtenerAhorrosAnio). */
export const calcularAhorro = ({ data, anio }) => {
  const advertencias = [];
  if (!data?.cuentas) return { ...comunes(null, null, advertencias), anio, vacio: true };

  // Igual que calcularTotales (firebase/ahorros.js): las responsabilidades restan.
  const grupo = (clave) => sumar(data.cuentas[clave] || [], "monto");
  const composicion = Object.entries(GRUPOS_AHORRO).map(([clave, nombre]) => ({ clave, nombre, total: grupo(clave) }));
  const responsabilidades = grupo("responsabilidades");
  const capital = redondear(sumar(composicion, "total") - responsabilidades);

  const capitalInicial = Number(data.kpis?.capitalInicial);
  const tieneInicial = Number.isFinite(capitalInicial);
  const crecimiento = tieneInicial ? redondear(capital - capitalInicial) : null;
  const meta = Number(data.kpis?.metaAnual || 0);
  if (!tieneInicial) advertencias.push("Falta el capital inicial del año: no se puede medir el crecimiento.");

  // Capital al cierre de cada mes (el último registro del mes).
  const cierres = {};
  [...(data.historial || [])]
    .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)))
    .forEach((registro) => { cierres[String(registro.fechaKey).slice(0, 7)] = Number(registro.capitalTotal || 0); });
  const capitalMensual = Object.entries(cierres).map(([mes, valor]) => {
    const clave = mes.replace("-", "");
    return { clave, etiqueta: etiquetaMesCorta(clave), capital: redondear(valor) };
  });

  const nombres = nombresDeCuentas(data.cuentas);
  const rendimientos = resumenRendimientoPorCuenta(data.historial || []);
  const cuentas = Object.entries(data.cuentas)
    .filter(([clave]) => GRUPOS_AHORRO[clave])
    .flatMap(([clave, lista]) => (lista || [])
      .filter((cuenta) => cuenta?.id && nombres[cuenta.id])
      .map((cuenta) => ({
        nombre: nombres[cuenta.id],
        grupo: GRUPOS_AHORRO[clave],
        saldo: redondear(cuenta.monto),
        rendimiento: redondear(rendimientos[cuenta.id]?.rendimiento || 0),
        tasaAnual: rendimientos[cuenta.id]?.tasaAnual ?? null,
        tasaEsperada: Number.isFinite(Number(cuenta.rendimientoEstimado)) && cuenta.rendimientoEstimado !== null && cuenta.rendimientoEstimado !== ""
          ? Number(cuenta.rendimientoEstimado)
          : null,
      })))
    .sort((a, b) => b.saldo - a.saldo);

  return {
    ...comunes(null, null, advertencias),
    anio,
    capital,
    capitalInicial: tieneInicial ? redondear(capitalInicial) : null,
    crecimiento,
    meta,
    avanceMeta: meta && crecimiento !== null ? Math.max(0, crecimiento) / meta : null,
    faltaMeta: meta && crecimiento !== null ? redondear(Math.max(0, meta - crecimiento)) : null,
    rendimiento: rendimientoTotalAnio(data.historial || [], tieneInicial ? capitalInicial : null),
    composicion,
    responsabilidades,
    liquidez: fraccion(composicion[0].total, sumar(composicion, "total")),
    capitalMensual,
    cuentas,
    vacio: false,
  };
};

/* ─────────── 7. Préstamos ─────────── */

/**
 * @param prestamos  [{ nombre, montoPrestado, interes, pagado, fechaInicio (YYYY-MM-DD o "") }]
 *                   ya filtrados a los activos (cargarReporte.js).
 */
export const calcularPrestamos = ({ prestamos = [], hoyISO }) => {
  const advertencias = [];
  const hoy = new Date(`${hoyISO}T12:00:00`);
  const pendientes = prestamos
    .map((prestamo) => {
      const total = redondear(Number(prestamo.montoPrestado || 0) + Number(prestamo.interes || 0));
      const pagado = redondear(prestamo.pagado);
      const dias = prestamo.fechaInicio ? Math.max(0, Math.round((hoy - new Date(`${prestamo.fechaInicio}T12:00:00`)) / DIA_MS)) : null;
      return {
        nombre: prestamo.nombre || "Sin nombre",
        total,
        pagado,
        restante: redondear(total - pagado),
        fechaInicio: prestamo.fechaInicio || "",
        meses: dias === null ? null : Math.floor(dias / 30.44),
      };
    })
    .filter((prestamo) => prestamo.restante > 0)
    .sort((a, b) => b.restante - a.restante);

  const RANGOS = [
    { nombre: "Menos de 3 meses", cumple: (meses) => meses !== null && meses < 3 },
    { nombre: "De 3 a 12 meses", cumple: (meses) => meses !== null && meses >= 3 && meses <= 12 },
    { nombre: "Más de 12 meses", cumple: (meses) => meses !== null && meses > 12 },
    { nombre: "Sin fecha", cumple: (meses) => meses === null },
  ];
  const antiguedad = RANGOS
    .map((rango) => {
      const lista = pendientes.filter((prestamo) => rango.cumple(prestamo.meses));
      return { nombre: rango.nombre, cantidad: lista.length, total: sumar(lista, "restante") };
    })
    .filter((rango) => rango.cantidad > 0);
  const conFecha = pendientes.filter((prestamo) => prestamo.meses !== null);
  const masAntiguo = conFecha.reduce((viejo, prestamo) => (!viejo || prestamo.meses > viejo.meses ? prestamo : viejo), null);
  if (pendientes.length && !conFecha.length) advertencias.push("Ningún préstamo tiene fecha de inicio; no se puede medir su antigüedad.");

  const totalPrestado = sumar(pendientes, "total");
  return {
    ...comunes(null, null, advertencias),
    prestamos: pendientes,
    cantidad: pendientes.length,
    porCobrar: sumar(pendientes, "restante"),
    totalPrestado,
    recuperado: sumar(pendientes, "pagado"),
    avanceCobro: fraccion(sumar(pendientes, "pagado"), totalPrestado),
    antiguedad,
    masAntiguo: masAntiguo ? { nombre: masAntiguo.nombre, meses: masAntiguo.meses, restante: masAntiguo.restante } : null,
    concentracionPrincipal: fraccion(pendientes[0]?.restante || 0, sumar(pendientes, "restante")),
    vacio: pendientes.length === 0,
  };
};

/* ─────────── 8. Despensa ─────────── */

/**
 * @param gastoPorMes  catalogo.gastoPorMes ({ YYYYMM: monto }).
 * @param inventario   derivarInventario(catalogo).
 */
export const calcularDespensa = ({ gastoPorMes = {}, inventario = {}, periodo, hoyISO }) => {
  const advertencias = [];
  const gastoDe = (clave) => redondear(Number(gastoPorMes?.[clave] || 0));
  const meses = mesesConDatos(periodo, hoyISO, (clave) => gastoDe(clave) > 0, advertencias)
    .map((mes) => ({ ...mes, total: gastoDe(mes.clave) }));
  const baseMeses = baseDelPromedio(meses, advertencias);

  const productos = Object.values(inventario.productos || {})
    .map((producto) => {
      const presentaciones = Object.values(producto.stockPorPresentacion || {});
      return {
        nombre: producto.nombre || "Producto",
        gastado: sumar(presentaciones, "totalGastado"),
        compras: presentaciones.reduce((suma, presentacion) => suma + (Number(presentacion.vecesComprado) || 0), 0),
      };
    })
    .filter((producto) => producto.gastado > 0)
    .sort((a, b) => b.gastado - a.gastado);
  const faltantes = (inventario.faltantes || []).map((producto) => ({ nombre: producto.nombre, stock: producto.resumenStock || "" }));
  const ultimo = meses.at(-1) || null;

  return {
    ...comunes(periodo, hoyISO, advertencias),
    meses,
    total: sumar(meses, "total"),
    promedioMensual: promedio(baseMeses, "total"),
    mesesCompletos: meses.filter((mes) => mes.completo).length,
    ultimoMes: ultimo ? { etiqueta: ultimo.etiqueta, nombre: nombreMes(ultimo.clave), total: ultimo.total, completo: ultimo.completo } : null,
    productos: productos.slice(0, 8),
    gastoHistoricoProductos: sumar(productos, "gastado"),
    faltantes,
    totalProductos: Number(inventario.totalProductos || 0),
    agotados: Number(inventario.productosAgotados || 0),
    bajoMinimo: Number(inventario.productosBajoMinimo || 0),
    valorInventario: redondear(inventario.valorTotalInventario || 0),
    vacio: meses.length === 0 && !inventario.totalProductos,
  };
};

export const CALCULOS_REPORTE = {
  cierre_mes: calcularCierreMes,
  gasto_personal: calcularGastoPersonal,
  categorias: calcularCategorias,
  tarjetas: calcularTarjetas,
  ingresos: calcularIngresos,
  ahorro: calcularAhorro,
  prestamos: calcularPrestamos,
  despensa: calcularDespensa,
};
