import { useAppStore } from "../../../stores/useAppStore";
import { cargarMovimientos } from "../cargarDatosConsulta.js";
import { CALCULOS_REPORTE } from "../reportes/calculos.js";
import { CARGADORES, cargarIngresosModulo, cargarPrestamos } from "../reportes/cargarReporte.js";
import { PLANTILLAS_REPORTE } from "../reportes/plantillas.js";
import { LIMITE_BYTES_PANORAMA } from "../respuestaAbierta.js";
import {
  claveMesDeFecha,
  esGasto,
  haceMeses,
  mesesDelPeriodo,
  nombreMes,
  normalizar,
  sumaGastos,
} from "../reglasConsulta.js";

/*
 * Panorama de TODOS los módulos para la respuesta amplia. Se usa solo cuando
 * la lista fija de temas no alcanzó y la persona insiste: lee lo que la app
 * no tiene en memoria (los movimientos de 12 meses, ingresos, préstamos) y
 * reutiliza lo que sí (cuentas, despensa y el año de ahorro vigente).
 *
 * Cada módulo pasa por el cálculo y el `metricasParaIA` de su reporte, así que
 * las cifras son las mismas que en los reportes y no viajan nombres de
 * personas. Lo único extra son los conceptos de gasto que coinciden con
 * palabras de la pregunta ("uber", "renta"), para poder contestar sobre algo
 * puntual sin mandar todas las notas.
 */

const MESES_PANORAMA = 12;
const MAXIMO_CONCEPTOS = 10;
const LARGO_MINIMO_PALABRA = 4;
const PALABRAS_VACIAS = new Set([
  "cuanto", "cuantos", "cuanta", "donde", "cuando", "gasto", "gaste", "gastos", "tengo", "tiene", "mucho",
  "como", "para", "pero", "este", "esta", "estos", "mismo", "meses", "dinero", "puedo", "debo", "quiero",
  "sobre", "entre", "desde", "hasta", "todos", "todo", "mejor", "bien", "algo", "porque", "datos",
]);

const palabrasDe = (texto) => [...new Set(normalizar(texto).split(/[^a-z0-9]+/))]
  .filter((palabra) => palabra.length >= LARGO_MINIMO_PALABRA && !PALABRAS_VACIAS.has(palabra));

/* Gasto agrupado por nota, solo de las notas que mencionan algo de la pregunta. */
const conceptosDeLaPregunta = (gastos, pregunta) => {
  const palabras = palabrasDe(pregunta);
  if (!palabras.length) return [];

  const grupos = new Map();
  gastos.forEach((movimiento) => {
    const nota = normalizar(movimiento.nota);
    if (!nota || !palabras.some((palabra) => nota.includes(palabra))) return;
    const grupo = grupos.get(nota) || { concepto: String(movimiento.nota).trim().slice(0, 60), veces: 0, lista: [] };
    grupo.veces += 1;
    grupo.lista.push(movimiento);
    grupos.set(nota, grupo);
  });

  return [...grupos.values()]
    .map(({ concepto, veces, lista }) => ({ concepto, veces, total: sumaGastos(lista) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, MAXIMO_CONCEPTOS);
};

/* Meses del periodo sin un solo movimiento: avisa huecos en vez de leerlos como gasto cero. */
const calidadDeDatos = (movimientos, periodo) => {
  const conDatos = new Set(movimientos.map((movimiento) => claveMesDeFecha(movimiento.fechaISO)));
  const sinDatos = mesesDelPeriodo(periodo).filter((clave) => !conDatos.has(clave));
  return {
    movimientos: movimientos.length,
    mesesSinMovimientos: sinDatos.map(nombreMes),
    gastosSinCategoria: movimientos.filter((movimiento) => esGasto(movimiento) && !movimiento.categoria).length,
  };
};

/* Un módulo vacío o que falla no tumba el panorama: se omite y se dice. */
const resumirModulo = (reporte, datos, extra, omitidos) => {
  try {
    const metricas = CALCULOS_REPORTE[reporte]({ ...datos, ...extra });
    if (metricas.vacio) {
      omitidos.push(reporte);
      return undefined;
    }
    return PLANTILLAS_REPORTE[reporte].metricasParaIA(metricas);
  } catch (error) {
    console.info(`Panorama sin ${reporte}: ${error.message}`);
    omitidos.push(reporte);
    return undefined;
  }
};

const tamano = (objeto) => new TextEncoder().encode(JSON.stringify(objeto)).length;

/* Si no cabe, se quitan primero las secciones menos generales. */
const ORDEN_PARA_RECORTAR = ["despensa", "prestamos", "categorias", "conceptos", "ahorro"];

/**
 * @param pregunta  Lo que preguntó (y su intento anterior), para elegir conceptos.
 * @returns {Promise<object>} agregados listos para POST /respuesta.
 */
export const construirPanorama = async ({ uid, pregunta, hoyISO }) => {
  const periodo = { desde: haceMeses(hoyISO, MESES_PANORAMA - 1), hasta: hoyISO };
  const comun = { periodo, hoyISO, consulta: {} };
  const omitidos = [];

  // Cuentas, despensa y ahorro salen de la memoria de la app cuando ya están ahí.
  const [movimientos, ingresosModulo, prestamos, ahorro, despensa] = await Promise.all([
    cargarMovimientos(uid, periodo),
    cargarIngresosModulo(uid, periodo).catch(() => []),
    cargarPrestamos(uid).catch(() => []),
    CARGADORES.ahorro({ uid }).catch(() => ({})),
    CARGADORES.despensa({ uid }).catch(() => ({})),
  ]);
  const cuentas = useAppStore.getState().cuentas.filter((cuenta) => cuenta?.id && cuenta.activo !== false);

  const panorama = {
    periodo: { desde: periodo.desde, hasta: periodo.hasta, meses: MESES_PANORAMA },
    calidad: calidadDeDatos(movimientos, periodo),
    gastos: resumirModulo("gasto_personal", { movimientos }, comun, omitidos),
    categorias: resumirModulo("categorias", { movimientos }, comun, omitidos),
    ingresos: resumirModulo("ingresos", { ingresosModulo, movimientos }, comun, omitidos),
    tarjetas: resumirModulo("tarjetas", { cuentas }, comun, omitidos),
    ahorro: resumirModulo("ahorro", ahorro, comun, omitidos),
    prestamos: resumirModulo("prestamos", { prestamos }, comun, omitidos),
    despensa: resumirModulo("despensa", despensa, comun, omitidos),
    conceptos: conceptosDeLaPregunta(movimientos.filter(esGasto), pregunta),
  };
  panorama.calidad.modulosSinDatos = omitidos;

  // Palanca: cuántos meses de gasto aguanta lo que hay disponible en cuentas.
  const disponible = cuentas
    .filter((cuenta) => ["debito", "efectivo"].includes(cuenta.tipoDeCuenta) && cuenta.esLiquida !== false)
    .reduce((suma, cuenta) => suma + Math.max(0, Number(cuenta.saldoALaFecha) || 0), 0);
  const gastoMensual = panorama.gastos?.promedioMensualTotal || 0;
  panorama.liquidez = {
    disponibleEnCuentas: Math.round(disponible),
    mesesDeGastoCubiertos: gastoMensual ? Math.round((disponible / gastoMensual) * 10) / 10 : null,
  };

  for (const seccion of ORDEN_PARA_RECORTAR) {
    if (tamano(panorama) <= LIMITE_BYTES_PANORAMA) break;
    delete panorama[seccion];
  }

  return JSON.parse(JSON.stringify(panorama));
};
