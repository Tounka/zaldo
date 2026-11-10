import { useAppStore } from "../../stores/useAppStore";
import { obtenerIngresosAnio } from "../firebase/ingresos";
import { calcularTotales, getAnioAhorro, obtenerAhorrosAnio, rangoAnioAhorro } from "../firebase/ahorros";
import { nombresDeCuentas, rendimientoTotalAnio, resumenRendimientoPorCuenta } from "../ahorrosRendimientos";
import { obtenerTodosPrestamos } from "../firebase/prestamos";
import { derivarInventario } from "../firebase/despensa";
import { obtenerGastosRecurrentes, obtenerRecurrentesPendientes } from "../firebase/gastosRecurrentes";
import { obtenerComprasPlaneadas } from "../firebase/comprasPlaneadas";
import { obtenerCatalogoDespensa } from "../registrarCompraDespensa";
import { esCobroConfirmado, obtenerMontoRegistro } from "../ingresosCalculos";
import { calcularTotalPagado } from "../prestamosCalculos";
import { formatearMonedaSegunPreferencia } from "../utils/moneda";
import { obtenerEstadoPagoTarjeta } from "../utils/tarjetasCredito";
import { fechaCortaLegible, fechaLocalISO } from "../utils/fechas";
import { TEMAS_CONSULTA } from "./contratoConsulta.js";
import { cargarMovimientos } from "./cargarDatosConsulta.js";
import {
  MARCAS,
  describirPeriodo,
  esGasto,
  esIngreso,
  esPersonal,
  etiquetaCategoria,
  filtrarPorConsulta,
  finDeMes,
  finDelMesPasado,
  haceMeses,
  mesCompleto,
  mesesDelPeriodo,
  nombreMes,
  normalizar,
  primeroDelMes,
  redondear,
  resolverPeriodo,
  sumaGastos,
} from "./reglasConsulta.js";
import { generarReporte } from "./reportes/generarReporte.js";

// Lo usaban otros módulos desde aquí; ahora vive en reglasConsulta.
export { describirPeriodo };

/*
 * Responde en el navegador las preguntas que la IA tradujo a una consulta
 * (interpretarCaptura → `consulta`). Lee Firestore con las mismas funciones
 * que las páginas y calcula aquí: la IA nunca ve los datos ni redacta cifras.
 *
 * Devuelve { texto, resumen } con la forma de la tarjeta del chat:
 *   resumen = { titulo, monto, tono, filas: [[etiqueta, valor]], advertencias }
 * o, para el tema "reporte", { texto, reporte } (ver reportes/generarReporte.js).
 */

const FILAS_RANKING = 6;
const FILAS_LISTA = 8;
const MESES_POR_DEFECTO = 3;
const DIAS_POR_MES = 30.44;

const dinero = formatearMonedaSegunPreferencia;
const porcentaje = (parte, total) => (total ? `${Math.round((parte / total) * 100)}%` : "—");
const plural = (n, singular, varios = `${singular}s`) => `${n} ${n === 1 ? singular : varios}`;

/* "este mes" → "Este mes"; "octubre de 2026" → "En octubre de 2026". */
const alInicio = (nombrePeriodo) => {
  const texto = /^(este|esta|hoy|el |del )/.test(nombrePeriodo) ? nombrePeriodo : `en ${nombrePeriodo}`;
  return `${texto[0].toUpperCase()}${texto.slice(1)}`;
};

/* ─────────── Movimientos ─────────── */

const agrupar = (movimientos, clave) => {
  const grupos = new Map();
  movimientos.forEach((movimiento) => {
    const llave = clave(movimiento);
    grupos.set(llave, (grupos.get(llave) || 0) + Math.abs(Number(movimiento.monto) || 0));
  });
  return [...grupos.entries()]
    .map(([nombre, total]) => ({ nombre, total: redondear(total) }))
    .sort((a, b) => b.total - a.total);
};

const describirFiltros = (consulta) => [
  consulta.categoria ? `en ${etiquetaCategoria(consulta.categoria)}` : "",
  consulta.cuenta ? `con ${consulta.cuenta.nombre}` : "",
  consulta.texto ? `en “${consulta.texto}”` : "",
  MARCAS[consulta.marca]?.frase || "",
].filter(Boolean).join(" ");

const conFiltros = (texto, consulta) => [texto, describirFiltros(consulta)].filter(Boolean).join(" ");

/* Título de tarjeta: "Gastos personales en Comida", no "Gastos en Comida en gastos personales". */
const tituloGastos = (consulta) => conFiltros(
  ["Gastos", MARCAS[consulta.marca]?.nombre].filter(Boolean).join(" "),
  { ...consulta, marca: "" },
);

/*
 * Respuesta especial: la persona aún no dice si "mis gastos" son solo los
 * personales o todos. El chat lo pregunta, guarda la elección en
 * `alcanceGastosAsistente` y vuelve a consultar con esa marca.
 */
export const PREGUNTAR_ALCANCE = { preguntarAlcance: true };

/*
 * "Mis gastos" sin más se resuelve con la preferencia `alcanceGastosAsistente`.
 * Si la persona no marca nada como personal no hay nada que preguntar; si con
 * el filtro personal no queda nada, cuentan todos. Devuelve los gastos y la
 * consulta con la marca aplicada, o null si hay que preguntar.
 */
const gastosDeLaConsulta = (movimientos, consulta, advertencias) => {
  const gastos = movimientos.filter(esGasto);
  if (consulta.marca) return { gastos: filtrarPorConsulta(gastos, consulta), consulta };

  const todos = filtrarPorConsulta(gastos, consulta);
  const alcance = useAppStore.getState().preferencias?.alcanceGastosAsistente || "";
  if (alcance === "todos" || !gastos.some(esPersonal)) return { gastos: todos, consulta };
  if (alcance !== "personal") return null;

  const conMarca = { ...consulta, marca: "personal" };
  const personales = filtrarPorConsulta(gastos, conMarca);
  if (!personales.length) {
    if (todos.length) advertencias.push("Ninguno de estos gastos está marcado como personal; te muestro todos.");
    return { gastos: todos, consulta };
  }
  advertencias.push("Solo cuento tus gastos personales. Pide «todos mis gastos» para incluir el resto.");
  return { gastos: personales, consulta: conMarca };
};

const gastosPorGrupo = async ({ uid, consulta: pedida, hoyISO, advertencias, porCuenta }) => {
  const periodo = resolverPeriodo(pedida, hoyISO, advertencias);
  const nombrePeriodo = describirPeriodo(periodo, hoyISO);
  const filtrado = gastosDeLaConsulta(await cargarMovimientos(uid, periodo), pedida, advertencias);
  if (!filtrado) return PREGUNTAR_ALCANCE;
  const { gastos, consulta } = filtrado;

  if (!gastos.length) {
    return { texto: `No encontré gastos ${conFiltros(nombrePeriodo, consulta)}.` };
  }

  const grupos = agrupar(gastos, porCuenta
    ? (movimiento) => movimiento.nombreCuenta || "Sin cuenta"
    : (movimiento) => etiquetaCategoria(movimiento.categoria));
  const total = grupos.reduce((suma, grupo) => suma + grupo.total, 0);
  const ordenados = consulta.orden === "menor" ? [...grupos].reverse() : grupos;
  const primero = ordenados[0];
  const que = porCuenta ? "con" : "en";

  return {
    texto: consulta.orden === "menor"
      ? `${alInicio(nombrePeriodo)} donde menos gastaste fue ${que} ${primero.nombre}: ${dinero(primero.total)}.`
      : `${alInicio(nombrePeriodo)} gastaste más ${que} ${primero.nombre}: ${dinero(primero.total)}, el ${porcentaje(primero.total, total)} de ${dinero(total)}.`,
    resumen: {
      titulo: `${tituloGastos({ marca: consulta.marca })} por ${porCuenta ? "cuenta" : "categoría"}`,
      monto: dinero(total),
      tono: "gasto",
      filas: ordenados.slice(0, FILAS_RANKING).map((grupo) => [
        grupo.nombre,
        `${dinero(grupo.total)} · ${porcentaje(grupo.total, total)}`,
      ]),
      advertencias,
    },
  };
};

const gastosTotal = async ({ uid, consulta: pedida, hoyISO, advertencias }) => {
  const periodo = resolverPeriodo(pedida, hoyISO, advertencias);
  const nombrePeriodo = describirPeriodo(periodo, hoyISO);
  const filtrado = gastosDeLaConsulta(await cargarMovimientos(uid, periodo), pedida, advertencias);
  if (!filtrado) return PREGUNTAR_ALCANCE;
  const { gastos, consulta } = filtrado;

  if (!gastos.length) return { texto: `No encontré gastos ${conFiltros(nombrePeriodo, consulta)}.` };

  const total = sumaGastos(gastos);
  const mayor = gastos.reduce((maximo, movimiento) => (movimiento.monto < maximo.monto ? movimiento : maximo));
  const fin = periodo.hasta < hoyISO ? periodo.hasta : hoyISO;
  const dias = Math.max(1, Math.round((new Date(`${fin}T12:00:00`) - new Date(`${periodo.desde}T12:00:00`)) / 864e5) + 1);
  const personales = gastos.filter(esPersonal);

  return {
    texto: `${conFiltros(`${alInicio(nombrePeriodo)} gastaste ${dinero(total)}`, consulta)} en ${plural(gastos.length, "movimiento")}.`,
    resumen: {
      titulo: tituloGastos(consulta),
      monto: dinero(total),
      tono: "gasto",
      filas: [
        ["Periodo", nombrePeriodo],
        ["Promedio por día", dinero(total / dias)],
        // Un periodo de varios meses se entiende mejor en meses que en días.
        dias > 45 ? ["Promedio mensual", dinero((total / dias) * DIAS_POR_MES)] : null,
        ["Gasto más grande", `${dinero(-mayor.monto)}${mayor.nota ? ` · ${mayor.nota}` : ""}`],
        personales.length && !consulta.categoria && !MARCAS[consulta.marca]
          ? ["Personales", dinero(sumaGastos(personales))]
          : null,
      ].filter(Boolean),
      advertencias,
    },
  };
};

/*
 * Gasto mes por mes y promedio mensual. El promedio usa solo meses completos
 * (el mes en curso lo jala hacia abajo) y no cuenta los meses anteriores al
 * primer gasto registrado, que serían ceros falsos.
 */
const gastosPorMes = async ({ uid, consulta: pedida, hoyISO, advertencias }) => {
  // Sin periodo: los últimos meses completos y lo que va del actual.
  const consultaConPeriodo = pedida.desde ? pedida : { ...pedida, desde: haceMeses(hoyISO, MESES_POR_DEFECTO) };
  const periodo = resolverPeriodo(consultaConPeriodo, hoyISO, advertencias);
  const nombrePeriodo = describirPeriodo(periodo, hoyISO);
  const filtrado = gastosDeLaConsulta(await cargarMovimientos(uid, periodo), pedida, advertencias);
  if (!filtrado) return PREGUNTAR_ALCANCE;
  const { gastos, consulta } = filtrado;

  if (!gastos.length) return { texto: `No encontré gastos ${conFiltros(nombrePeriodo, consulta)}.` };

  const claveMes = (movimiento) => movimiento.fechaISO.slice(0, 7).replace("-", "");
  const claves = mesesDelPeriodo(periodo);
  const primeraConGasto = claves.find((clave) => gastos.some((movimiento) => claveMes(movimiento) === clave));
  const meses = claves
    .filter((clave) => clave >= primeraConGasto)
    .map((clave) => {
      const delMes = gastos.filter((movimiento) => claveMes(movimiento) === clave);
      const inicio = `${clave.slice(0, 4)}-${clave.slice(4, 6)}-01`;
      const fin = `${inicio.slice(0, 8)}${finDeMes(Number(clave.slice(0, 4)), Number(clave.slice(4, 6)))}`;
      return {
        clave,
        total: sumaGastos(delMes),
        personal: sumaGastos(delMes.filter(esPersonal)),
        completo: periodo.desde <= inicio && periodo.hasta >= fin && fin < hoyISO,
      };
    });

  if (primeraConGasto !== claves[0]) {
    advertencias.push(`No hay gastos registrados antes de ${nombreMes(primeraConGasto)}; esos meses no cuentan en el promedio.`);
  }

  const completos = meses.filter((mes) => mes.completo);
  const base = completos.length ? completos : meses;
  if (!completos.length) advertencias.push("Ningún mes del periodo está completo; el promedio es parcial.");
  const promediar = (campo) => base.reduce((suma, mes) => suma + mes[campo], 0) / base.length;
  const promedio = promediar("total");
  const mayor = base.reduce((maximo, mes) => (mes.total > maximo.total ? mes : maximo));
  // Sin filtro de marca ni categoría, el desglose personal responde "¿y de eso cuánto es mío?".
  const desglosarPersonal = !MARCAS[consulta.marca] && !consulta.categoria && meses.some((mes) => mes.personal > 0);

  return {
    texto: conFiltros(`En promedio gastas ${dinero(promedio)} al mes`, consulta)
      + ` (${completos.length ? plural(completos.length, "mes completo", "meses completos") : plural(meses.length, "mes")}).`
      + (base.length > 1 ? ` El mes más alto fue ${nombreMes(mayor.clave)} con ${dinero(mayor.total)}.` : ""),
    resumen: {
      titulo: `${tituloGastos(consulta)} por mes`,
      monto: dinero(promedio),
      tono: "gasto",
      filas: [
        ...meses.map((mes) => [
          `${nombreMes(mes.clave)}${mes.completo ? "" : " (incompleto)"}`,
          `${dinero(mes.total)}${desglosarPersonal ? ` · personal ${dinero(mes.personal)}` : ""}`,
        ]),
        ["Promedio mensual", dinero(promedio)],
        desglosarPersonal ? ["Promedio personal", dinero(promediar("personal"))] : null,
      ].filter(Boolean),
      advertencias,
    },
  };
};

const unDiaAntes = (fechaISO) => {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  fecha.setDate(fecha.getDate() - 1);
  return fechaLocalISO(fecha);
};

const diasEntre = (desde, hasta) => Math.round((new Date(`${hasta}T12:00:00`) - new Date(`${desde}T12:00:00`)) / 864e5) + 1;

/* El periodo de la misma duración justo antes: meses enteros contra meses enteros. */
const periodoAnterior = ({ desde, hasta }) => {
  const [anio, mes] = hasta.split("-").map(Number);
  const cierraMes = hasta.slice(8, 10) === String(finDeMes(anio, mes)).padStart(2, "0");
  if (desde.endsWith("-01") && cierraMes) {
    return { desde: haceMeses(desde, mesesDelPeriodo({ desde, hasta }).length), hasta: unDiaAntes(desde) };
  }
  const fin = unDiaAntes(desde);
  const inicio = new Date(`${fin}T12:00:00`);
  inicio.setDate(inicio.getDate() - (diasEntre(desde, hasta) - 1));
  return { desde: fechaLocalISO(inicio), hasta: fin };
};

const variacion = (actual, anterior) => (anterior > 0 ? `${actual >= anterior ? "+" : "−"}${porcentaje(Math.abs(actual - anterior), anterior)}` : "");

/*
 * "¿Gasté más que el mes pasado?", "¿cómo voy este mes?". Sin periodo, el mes
 * en curso contra el mismo tramo del mes pasado (comparar contra el mes
 * completo haría ver cualquier mes a medias como un ahorro), más la
 * proyección a fin de mes con el ritmo actual y los fijos que faltan.
 */
const compararGastos = async ({ uid, consulta: pedida, hoyISO, advertencias }) => {
  const enCurso = !pedida.desde;
  let actual;
  let anterior;
  if (enCurso) {
    actual = { desde: primeroDelMes(hoyISO), hasta: hoyISO };
    const inicioPasado = haceMeses(hoyISO, 1);
    const [anioP, mesP] = inicioPasado.split("-").map(Number);
    const dia = Math.min(Number(hoyISO.slice(8, 10)), finDeMes(anioP, mesP));
    anterior = { desde: inicioPasado, hasta: `${inicioPasado.slice(0, 8)}${String(dia).padStart(2, "0")}` };
  } else {
    actual = resolverPeriodo(pedida, hoyISO, advertencias);
    anterior = periodoAnterior(actual);
  }

  const finCarga = enCurso ? hoyISO : actual.hasta;
  const filtrado = gastosDeLaConsulta(await cargarMovimientos(uid, { desde: anterior.desde, hasta: finCarga }), pedida, advertencias);
  if (!filtrado) return PREGUNTAR_ALCANCE;
  const { gastos, consulta } = filtrado;
  const dentro = ({ desde, hasta }) => gastos.filter((movimiento) => movimiento.fechaISO >= desde && movimiento.fechaISO <= hasta);

  const delActual = dentro(actual);
  const delAnterior = dentro(anterior);
  if (!delActual.length && !delAnterior.length) return { texto: `No encontré gastos ${conFiltros("en esos periodos", consulta)}.` };

  const totalActual = sumaGastos(delActual);
  const totalAnterior = sumaGastos(delAnterior);
  const diferencia = redondear(totalActual - totalAnterior);
  const nombreActual = enCurso ? "este mes" : describirPeriodo(actual, hoyISO);
  const nombreAnterior = enCurso ? "a esta altura del mes pasado" : describirPeriodo(anterior, hoyISO);

  // Qué categorías explican la diferencia.
  const porCategoria = (lista) => new Map(agrupar(lista, (movimiento) => etiquetaCategoria(movimiento.categoria)).map((g) => [g.nombre, g.total]));
  const catActual = porCategoria(delActual);
  const catAnterior = porCategoria(delAnterior);
  const cambios = [...new Set([...catActual.keys(), ...catAnterior.keys()])]
    .map((nombre) => ({ nombre, cambio: redondear((catActual.get(nombre) || 0) - (catAnterior.get(nombre) || 0)) }))
    .filter((item) => Math.abs(item.cambio) >= 1)
    .sort((a, b) => Math.abs(b.cambio) - Math.abs(a.cambio))
    .slice(0, 3);

  const filas = [
    [nombreActual[0].toUpperCase() + nombreActual.slice(1), dinero(totalActual)],
    [nombreAnterior[0].toUpperCase() + nombreAnterior.slice(1), dinero(totalAnterior)],
    ...cambios.map((item) => [item.nombre, `${item.cambio >= 0 ? "+" : "−"}${dinero(Math.abs(item.cambio))}`]),
  ];

  let proyeccionTexto = "";
  if (enCurso) {
    const [anio, mes] = hoyISO.split("-").map(Number);
    const diasMes = finDeMes(anio, mes);
    const diaHoy = Number(hoyISO.slice(8, 10));
    const ritmo = diaHoy > 0 ? (totalActual / diaHoy) * diasMes : totalActual;
    const mesPasadoCompleto = sumaGastos(dentro({ desde: anterior.desde, hasta: finDelMesPasado(hoyISO) }));
    const periodoHoy = hoyISO.slice(0, 7);
    const fijosPendientes = consulta.categoria || consulta.texto
      ? 0
      : (await obtenerGastosRecurrentes(uid).catch(() => []))
        .filter((recurrente) => recurrente.activo && recurrente.ultimoMesConfirmado !== periodoHoy && Number(recurrente.diaDelMes) > diaHoy)
        .filter((recurrente) => consulta.marca !== "personal" || recurrente.esPersonal)
        .reduce((suma, recurrente) => suma + Number(recurrente.monto || 0), 0);
    const proyeccion = redondear(Math.max(ritmo, totalActual + fijosPendientes));
    filas.push(["Proyección a fin de mes", `~${dinero(proyeccion)}`]);
    if (fijosPendientes > 0) filas.push(["Fijos que faltan este mes", dinero(fijosPendientes)]);
    if (mesPasadoCompleto > 0) filas.push(["Mes pasado completo", dinero(mesPasadoCompleto)]);
    if (diaHoy < 7) advertencias.push("Va muy poco del mes: la proyección todavía es poco confiable.");
    proyeccionTexto = ` A este ritmo cerrarías el mes en unos ${dinero(proyeccion)}${mesPasadoCompleto > 0 ? ` (el mes pasado fueron ${dinero(mesPasadoCompleto)})` : ""}.`;
  }

  const principal = cambios.find((item) => (diferencia >= 0 ? item.cambio > 0 : item.cambio < 0));
  return {
    texto: conFiltros(`${alInicio(nombreActual)} llevas ${dinero(totalActual)}`, consulta)
      + (totalAnterior > 0
        ? `, ${dinero(Math.abs(diferencia))} ${diferencia >= 0 ? "más" : "menos"} (${variacion(totalActual, totalAnterior)}) que ${nombreAnterior}.`
        : `; ${nombreAnterior} no hubo gastos con qué comparar.`)
      + (principal ? ` Lo que más ${principal.cambio > 0 ? "subió" : "bajó"} fue ${principal.nombre}.` : "")
      + proyeccionTexto,
    resumen: {
      titulo: `${tituloGastos(consulta)}: comparación`,
      monto: `${diferencia >= 0 ? "+" : "−"}${dinero(Math.abs(diferencia))}`,
      tono: diferencia > 0 ? "gasto" : "ingreso",
      filas,
      advertencias,
    },
  };
};

const listarMovimientos = async ({ uid, consulta, hoyISO, advertencias }) => {
  // Buscar un concepto sin periodo explícito: mejor mirar los últimos 3 meses.
  const consultaConPeriodo = consulta.texto && !consulta.desde
    ? { ...consulta, desde: haceMeses(hoyISO, 2) }
    : consulta;
  const periodo = resolverPeriodo(consultaConPeriodo, hoyISO, advertencias);
  const nombrePeriodo = describirPeriodo(periodo, hoyISO);
  const movimientos = filtrarPorConsulta(await cargarMovimientos(uid, periodo), consulta)
    .sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));

  if (!movimientos.length) return { texto: `No encontré movimientos ${conFiltros(nombrePeriodo, consulta)}.` };

  const neto = redondear(movimientos.reduce((suma, movimiento) => suma + Number(movimiento.monto || 0), 0));

  return {
    texto: `Encontré ${plural(movimientos.length, "movimiento")} ${conFiltros(nombrePeriodo, consulta)}.${movimientos.length > FILAS_LISTA ? ` Te muestro los ${FILAS_LISTA} más recientes.` : ""}`,
    resumen: {
      titulo: "Movimientos",
      monto: `${neto >= 0 ? "+" : "-"}${dinero(Math.abs(neto))}`,
      tono: neto >= 0 ? "ingreso" : "gasto",
      filas: movimientos.slice(0, FILAS_LISTA).map((movimiento) => [
        `${fechaCortaLegible(movimiento.fechaISO)} · ${movimiento.nota || etiquetaCategoria(movimiento.categoria)}`,
        `${movimiento.monto >= 0 ? "+" : "-"}${dinero(Math.abs(movimiento.monto))}`,
      ]),
      advertencias,
    },
  };
};

/* ─────────── Ingresos ─────────── */

/*
 * Cobros del periodo: los del módulo de Ingresos o, si no se usa, los
 * ingresos registrados como movimientos (nunca ambos: el módulo ya deposita
 * en las cuentas y contaría doble).
 */
const leerIngresos = async (uid, periodo, movimientosPrevios = null) => {
  const anios = [...new Set([periodo.desde.slice(0, 4), periodo.hasta.slice(0, 4)])];
  const documentos = (await Promise.all(anios.map((anio) => obtenerIngresosAnio(uid, Number(anio))))).filter(Boolean);

  const cobros = [];
  let pendiente = 0;
  documentos.forEach((documento) => {
    const empresas = Object.fromEntries((documento.empresas || []).map((empresa) => [empresa.id, empresa]));
    (documento.registros || []).forEach((registro) => {
      const fecha = String(registro.fecha || "").slice(0, 10);
      if (fecha < periodo.desde || fecha > periodo.hasta) return;
      const empresa = empresas[registro.empresaId] || {};
      if (registro.estado !== "Pagado") {
        pendiente += obtenerMontoRegistro(registro);
        return;
      }
      if (!esCobroConfirmado(registro, empresa)) return;
      cobros.push({ fecha, monto: obtenerMontoRegistro(registro), fuente: empresa.nombre || "Otros", tipo: registro.percepcionTipo || "" });
    });
  });

  if (cobros.length) return { cobros, pendiente: redondear(pendiente) };

  const movimientos = movimientosPrevios || await cargarMovimientos(uid, periodo);
  movimientos.filter(esIngreso).forEach((movimiento) => cobros.push({
    fecha: movimiento.fechaISO,
    monto: Number(movimiento.monto),
    fuente: movimiento.nota || etiquetaCategoria(movimiento.categoria),
    tipo: "",
  }));
  return { cobros, pendiente: redondear(pendiente) };
};

const sumar = (lista) => redondear(lista.reduce((suma, item) => suma + Number(item.monto || 0), 0));

const ingresos = async ({ uid, consulta, hoyISO, advertencias }) => {
  const periodo = resolverPeriodo(consulta, hoyISO, advertencias);
  const nombrePeriodo = describirPeriodo(periodo, hoyISO);
  const { cobros, pendiente } = await leerIngresos(uid, periodo);

  if (!cobros.length) {
    return { texto: `No encontré ingresos cobrados ${nombrePeriodo}.${pendiente > 0 ? ` Tienes ${dinero(pendiente)} pendientes de cobro.` : ""}` };
  }

  const porFuente = new Map();
  cobros.forEach((cobro) => porFuente.set(cobro.fuente, (porFuente.get(cobro.fuente) || 0) + cobro.monto));
  const fuentes = [...porFuente.entries()]
    .map(([nombre, total]) => ({ nombre, total: redondear(total) }))
    .sort((a, b) => b.total - a.total);
  const total = sumar(cobros);
  const vales = sumar(cobros.filter((cobro) => cobro.tipo === "vales"));
  const bonos = sumar(cobros.filter((cobro) => cobro.tipo === "bono"));

  // Varios meses: promedio de los completos, que es lo que la persona quiere saber al preguntar "¿cuánto gano?".
  const claves = mesesDelPeriodo(periodo);
  const meses = claves.map((clave) => ({
    clave,
    total: sumar(cobros.filter((cobro) => cobro.fecha.slice(0, 7).replace("-", "") === clave)),
    completo: mesCompleto(clave, periodo, hoyISO),
  }));
  const completos = meses.filter((mes) => mes.completo);
  const promedio = completos.length ? completos.reduce((suma, mes) => suma + mes.total, 0) / completos.length : null;
  const variosMeses = claves.length > 1;

  return {
    texto: `${alInicio(nombrePeriodo)} recibiste ${dinero(total)}`
      + (fuentes.length > 1 ? `; la fuente principal fue ${fuentes[0].nombre} (${porcentaje(fuentes[0].total, total)})` : "")
      + (variosMeses && promedio !== null ? `. En promedio entran ${dinero(promedio)} al mes` : "")
      + ".",
    resumen: {
      titulo: "Ingresos",
      monto: `+${dinero(total)}`,
      tono: "ingreso",
      filas: [
        ...fuentes.slice(0, FILAS_RANKING).map((fuente) => [fuente.nombre, dinero(fuente.total)]),
        ...(variosMeses ? meses.map((mes) => [`${nombreMes(mes.clave)}${mes.completo ? "" : " (en curso)"}`, dinero(mes.total)]) : []),
        variosMeses && promedio !== null ? ["Promedio mensual", dinero(promedio)] : null,
        bonos > 0 ? ["De eso, bonos", dinero(bonos)] : null,
        vales > 0 ? ["De eso, vales de despensa", dinero(vales)] : null,
        pendiente > 0 ? ["Pendiente de cobro", dinero(pendiente)] : null,
      ].filter(Boolean),
      advertencias: [
        ...advertencias,
        vales > 0 ? "Los vales solo sirven para despensa: no son dinero libre." : "",
      ].filter(Boolean),
    },
  };
};

/*
 * Lo que entró contra lo que salió: "¿cuánto me sobró?", "¿gasto más de lo
 * que gano?". Cuenta TODOS los gastos (es dinero que salió aunque no sea
 * personal) y nada de lo interno (transferencias, pagos de tarjeta).
 */
const balance = async ({ uid, consulta, hoyISO, advertencias }) => {
  const periodo = resolverPeriodo(consulta, hoyISO, advertencias);
  const nombrePeriodo = describirPeriodo(periodo, hoyISO);
  const movimientos = await cargarMovimientos(uid, periodo);
  const { cobros, pendiente } = await leerIngresos(uid, periodo, movimientos);
  const gastos = movimientos.filter(esGasto);

  if (!cobros.length && !gastos.length) return { texto: `No encontré ingresos ni gastos ${nombrePeriodo}.` };

  const totalIngresos = sumar(cobros);
  const totalGastos = sumaGastos(gastos);
  const sobrante = redondear(totalIngresos - totalGastos);
  const tasa = totalIngresos > 0 ? sobrante / totalIngresos : null;

  const claves = mesesDelPeriodo(periodo);
  const porMes = claves.length > 1 ? claves.map((clave) => {
    const entra = sumar(cobros.filter((cobro) => cobro.fecha.slice(0, 7).replace("-", "") === clave));
    const sale = sumaGastos(gastos.filter((movimiento) => movimiento.fechaISO.slice(0, 7).replace("-", "") === clave));
    return [`${nombreMes(clave)}${mesCompleto(clave, periodo, hoyISO) ? "" : " (en curso)"}`, `${dinero(entra)} − ${dinero(sale)} = ${dinero(entra - sale)}`];
  }) : [];

  if (!cobros.length) advertencias.push("No hay ingresos registrados en este periodo: registra tu sueldo en Ingresos para que el balance sea real.");
  if (periodo.hasta >= hoyISO && periodo.desde >= primeroDelMes(hoyISO)) advertencias.push("El mes va en curso: aún pueden entrar o salir cosas.");
  const personales = sumaGastos(gastos.filter(esPersonal));

  return {
    texto: sobrante >= 0
      ? `${alInicio(nombrePeriodo)} entraron ${dinero(totalIngresos)} y gastaste ${dinero(totalGastos)}: te sobraron ${dinero(sobrante)}${tasa !== null ? ` (el ${porcentaje(sobrante, totalIngresos)} de lo que entró)` : ""}.`
      : `${alInicio(nombrePeriodo)} gastaste ${dinero(-sobrante)} más de lo que entró: ${dinero(totalGastos)} de gasto contra ${dinero(totalIngresos)} de ingreso.`,
    resumen: {
      titulo: "Balance: ingresos − gastos",
      monto: `${sobrante >= 0 ? "+" : "-"}${dinero(Math.abs(sobrante))}`,
      tono: sobrante >= 0 ? "ingreso" : "gasto",
      filas: [
        ["Entró", dinero(totalIngresos)],
        ["Salió en gastos", dinero(totalGastos)],
        personales > 0 && personales < totalGastos ? ["De eso, personal", dinero(personales)] : null,
        tasa !== null ? ["Tasa de ahorro", porcentaje(Math.max(0, sobrante), totalIngresos)] : null,
        ...porMes,
        pendiente > 0 ? ["Ingresos pendientes de cobro", dinero(pendiente)] : null,
      ].filter(Boolean),
      advertencias,
    },
  };
};

/* ─────────── Cuentas y tarjetas ─────────── */

const cuentasActivas = () => useAppStore.getState().cuentas.filter((cuenta) => cuenta?.id && cuenta.activo !== false);
const saldoCuenta = (cuenta) => Number(cuenta.saldoALaFecha || 0) + (cuenta.tipoDeCuenta === "credito" ? Number(cuenta.saldoALaFechaMSI || 0) : 0);

const saldos = ({ consulta, advertencias }) => {
  if (consulta.cuenta) {
    const cuenta = cuentasActivas().find((actual) => actual.id === consulta.cuenta.id) || consulta.cuenta;
    const saldo = saldoCuenta(cuenta);
    const esCredito = cuenta.tipoDeCuenta === "credito";
    return {
      texto: esCredito && saldo < 0
        ? `Debes ${dinero(-saldo)} en ${cuenta.nombre}.`
        : `${cuenta.nombre} tiene ${dinero(saldo)}.`,
      resumen: {
        titulo: cuenta.nombre,
        monto: dinero(saldo),
        tono: saldo < 0 ? "gasto" : "ingreso",
        filas: [
          ["Tipo", { debito: "Débito", credito: "Crédito", inversion: "Inversión", efectivo: "Efectivo" }[cuenta.tipoDeCuenta] || "—"],
          esCredito && Number(cuenta.saldoALaFechaMSI) ? ["A meses", dinero(cuenta.saldoALaFechaMSI)] : null,
          esCredito && Number(cuenta.limiteDeCredito) ? ["Límite", dinero(cuenta.limiteDeCredito)] : null,
        ].filter(Boolean),
        advertencias,
      },
    };
  }

  const cuentas = cuentasActivas();
  if (!cuentas.length) return { texto: "Todavía no tienes cuentas registradas." };

  const activos = cuentas.filter((cuenta) => saldoCuenta(cuenta) > 0);
  const totalActivos = activos.reduce((suma, cuenta) => suma + saldoCuenta(cuenta), 0);
  const totalPasivos = cuentas.filter((cuenta) => saldoCuenta(cuenta) < 0).reduce((suma, cuenta) => suma - saldoCuenta(cuenta), 0);

  return {
    texto: `Tienes ${dinero(totalActivos)} en cuentas con saldo y debes ${dinero(totalPasivos)}. Balance: ${dinero(totalActivos - totalPasivos)}.`,
    resumen: {
      titulo: "Saldos",
      monto: dinero(totalActivos - totalPasivos),
      tono: "transferencia",
      filas: [...cuentas]
        .sort((a, b) => Math.abs(saldoCuenta(b)) - Math.abs(saldoCuenta(a)))
        .slice(0, FILAS_LISTA)
        .map((cuenta) => [cuenta.nombre, dinero(saldoCuenta(cuenta))]),
      advertencias,
    },
  };
};

const tarjetas = ({ hoyISO, advertencias }) => {
  const credito = cuentasActivas()
    .filter((cuenta) => cuenta.tipoDeCuenta === "credito")
    .map((cuenta) => {
      const deuda = Math.max(0, -saldoCuenta(cuenta));
      const limite = Number(cuenta.limiteDeCredito || 0);
      const estado = obtenerEstadoPagoTarjeta(cuenta, new Date(`${hoyISO}T12:00:00`));
      return { nombre: cuenta.nombre, deuda, limite, uso: limite ? deuda / limite : null, estado };
    })
    .sort((a, b) => b.deuda - a.deuda);

  if (!credito.length) return { texto: "No tienes tarjetas de crédito registradas." };

  const deudaTotal = credito.reduce((suma, tarjeta) => suma + tarjeta.deuda, 0);
  const limiteTotal = credito.reduce((suma, tarjeta) => suma + tarjeta.limite, 0);
  const urgentes = credito.filter((tarjeta) => ["vencida", "por-vencer"].includes(tarjeta.estado.tono));
  const altoUso = credito.filter((tarjeta) => tarjeta.uso !== null && tarjeta.uso > 0.3);

  return {
    texto: (deudaTotal
      ? `Debes ${dinero(deudaTotal)} en ${plural(credito.filter((tarjeta) => tarjeta.deuda).length, "tarjeta")}${limiteTotal ? `, el ${porcentaje(deudaTotal, limiteTotal)} de tu límite total` : ""}.`
      : "Tus tarjetas no tienen deuda. ¡Bien!")
      + (urgentes.length ? ` Ojo: ${urgentes.map((tarjeta) => `${tarjeta.nombre} (${tarjeta.estado.etiqueta.toLowerCase()})`).join(", ")}.` : ""),
    resumen: {
      titulo: "Tarjetas de crédito",
      monto: dinero(deudaTotal),
      tono: "gasto",
      filas: credito.map((tarjeta) => [
        tarjeta.nombre,
        `${dinero(tarjeta.deuda)}${tarjeta.uso !== null ? ` · ${porcentaje(tarjeta.deuda, tarjeta.limite)} de uso` : ""}${tarjeta.deuda > 0 ? ` · ${tarjeta.estado.etiqueta}` : ""}`,
      ]),
      advertencias: [
        ...advertencias,
        altoUso.length ? `Arriba de 30 % de uso: ${altoUso.map((tarjeta) => tarjeta.nombre).join(", ")}. Bajarlo ayuda a tu historial crediticio.` : "",
      ].filter(Boolean),
    },
  };
};

/* ─────────── Ahorros y préstamos ─────────── */

const ahorros = async ({ uid, advertencias }) => {
  const anio = getAnioAhorro();
  const data = useAppStore.getState().ahorrosPorAnio[`${uid}_${anio}`] || await obtenerAhorrosAnio(uid, anio);
  if (!data?.cuentas) return { texto: "Todavía no tienes registros de ahorro este año." };

  const totales = calcularTotales(data.cuentas);
  const capitalInicial = Number(data.kpis?.capitalInicial);
  const meta = Number(data.kpis?.metaAnual || 0);
  const crecimiento = Number.isFinite(capitalInicial) ? totales.capitalTotal - capitalInicial : null;
  const rendimiento = rendimientoTotalAnio(data.historial, Number.isFinite(capitalInicial) ? capitalInicial : null);
  // La cuenta que más ha rendido en el año, con su tasa aproximada si ya hay datos.
  const nombres = nombresDeCuentas(data.cuentas);
  const falta = meta && crecimiento !== null ? Math.max(0, meta - crecimiento) : 0;
  const finAnio = rangoAnioAhorro(anio).fin;
  const hoy = new Date();
  const mesesRestantes = Math.max(1, (finAnio.getFullYear() - hoy.getFullYear()) * 12 + finAnio.getMonth() - hoy.getMonth());
  const [idMejor, mejor] = Object.entries(resumenRendimientoPorCuenta(data.historial))
    .filter(([id, item]) => nombres[id] && item.rendimiento > 0)
    .sort(([, a], [, b]) => b.rendimiento - a.rendimiento)[0] || [];

  return {
    texto: `Tu capital ahorrado es de ${dinero(totales.capitalTotal)}${crecimiento !== null ? `; ${crecimiento >= 0 ? "creció" : "bajó"} ${dinero(Math.abs(crecimiento))} en el año de ahorro` : ""}.`
      + (meta ? (falta > 0
        ? ` Te faltan ${dinero(falta)} para tu meta: unos ${dinero(falta / mesesRestantes)} al mes hasta el cierre del año de ahorro.`
        : " Ya alcanzaste tu meta anual.") : ""),
    resumen: {
      titulo: "Ahorros",
      monto: dinero(totales.capitalTotal),
      tono: "ingreso",
      filas: [
        ["Líquido", dinero(totales.liquido)],
        ["Inversiones", dinero(totales.inversiones)],
        ["Largo plazo", dinero(totales.inversionesLargo)],
        totales.responsabilidades ? ["Responsabilidades", `-${dinero(totales.responsabilidades)}`] : null,
        meta ? ["Meta anual", `${dinero(meta)} · ${porcentaje(Math.max(0, crecimiento || 0), meta)} lograda`] : null,
        falta > 0 ? ["Para la meta, al mes", `${dinero(falta / mesesRestantes)} · ${plural(mesesRestantes, "mes", "meses")}`] : null,
        rendimiento ? ["Rendimientos del año", dinero(rendimiento)] : null,
        mejor ? ["Rinde más", `${nombres[idMejor]} · ${dinero(mejor.rendimiento)}${mejor.tasaAnual !== null ? ` (~${mejor.tasaAnual}% anual)` : ""}`] : null,
      ].filter(Boolean),
      advertencias,
    },
  };
};

const prestamos = async ({ uid, advertencias }) => {
  const lista = (await obtenerTodosPrestamos(uid))
    .filter((prestamo) => prestamo.activo !== false && prestamo.estado !== "pagado" && prestamo.estado !== "liquidado")
    .map((prestamo) => {
      const total = Number(prestamo.montoPrestado || 0) + Number(prestamo.interesEstimado || 0);
      return { nombre: prestamo.nombre || "Sin nombre", restante: redondear(total - calcularTotalPagado(prestamo.pagos || [])) };
    })
    .filter((prestamo) => prestamo.restante > 0)
    .sort((a, b) => b.restante - a.restante);

  if (!lista.length) return { texto: "No tienes préstamos pendientes de cobro." };

  const total = lista.reduce((suma, prestamo) => suma + prestamo.restante, 0);
  return {
    texto: `Te deben ${dinero(total)} en ${plural(lista.length, "préstamo")}.`,
    resumen: {
      titulo: "Por cobrar",
      monto: dinero(total),
      tono: "transferencia",
      filas: lista.slice(0, FILAS_LISTA).map((prestamo) => [prestamo.nombre, dinero(prestamo.restante)]),
      advertencias,
    },
  };
};

/* ─────────── Despensa ─────────── */

const despensaFaltantes = async ({ uid, advertencias }) => {
  const inventario = derivarInventario(await obtenerCatalogoDespensa(uid));
  if (!inventario.totalProductos) return { texto: "Tu despensa todavía no tiene productos." };
  if (!inventario.faltantes.length) return { texto: "No te falta nada: todo está arriba de su mínimo." };

  return {
    texto: `Te faltan o se están acabando ${plural(inventario.faltantes.length, "producto")}.`,
    resumen: {
      titulo: "Lista del súper",
      monto: "",
      tono: "despensa",
      filas: inventario.faltantes.slice(0, 12).map((producto) => [producto.nombre, producto.resumenStock]),
      advertencias: inventario.faltantes.length > 12 ? [`Y ${inventario.faltantes.length - 12} más en la despensa.`] : advertencias,
    },
  };
};

const ESTADO_STOCK = { agotado: "Agotado", bajo: "Por acabarse", ok: "Suficiente" };

const despensaProducto = async ({ uid, consulta, advertencias }) => {
  const buscado = normalizar(consulta.texto);
  if (!buscado) return despensaFaltantes({ uid, advertencias });

  const inventario = derivarInventario(await obtenerCatalogoDespensa(uid));
  const encontrados = Object.values(inventario.productos)
    .filter((producto) => normalizar(producto.nombre).includes(buscado) || buscado.includes(normalizar(producto.nombre)));

  if (!encontrados.length) return { texto: `No tienes “${consulta.texto}” registrado en la despensa.` };

  const [primero] = encontrados;
  return {
    texto: encontrados.length === 1
      ? `Te queda ${primero.resumenStock} de ${primero.nombre} (${ESTADO_STOCK[primero.estadoStock].toLowerCase()}).`
      : `Encontré ${plural(encontrados.length, "producto")} parecidos a “${consulta.texto}”.`,
    resumen: {
      titulo: "Despensa",
      monto: "",
      tono: "despensa",
      filas: encontrados.slice(0, FILAS_LISTA).map((producto) => [
        producto.nombre,
        `${producto.resumenStock} · ${ESTADO_STOCK[producto.estadoStock]}`,
      ]),
      advertencias,
    },
  };
};

const despensaGasto = async ({ uid, advertencias }) => {
  const catalogo = await obtenerCatalogoDespensa(uid);
  const meses = Object.entries(catalogo?.gastoPorMes || {})
    .filter(([, monto]) => Number(monto) > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, FILAS_RANKING);

  if (!meses.length) return { texto: "Todavía no hay compras de despensa registradas." };

  const promedio = meses.reduce((suma, [, monto]) => suma + Number(monto), 0) / meses.length;

  return {
    texto: `En ${nombreMes(meses[0][0])} llevas ${dinero(meses[0][1])} en despensa; tu promedio reciente es ${dinero(promedio)} al mes.`,
    resumen: {
      titulo: "Gasto en despensa",
      monto: dinero(meses[0][1]),
      tono: "despensa",
      filas: meses.map(([clave, monto]) => [nombreMes(clave), dinero(monto)]),
      advertencias,
    },
  };
};

/* ─────────── Gastos fijos y compras planeadas ─────────── */

const gastosRecurrentes = async ({ uid, advertencias }) => {
  const recurrentes = (await obtenerGastosRecurrentes(uid)).filter((recurrente) => recurrente.activo);
  if (!recurrentes.length) return { texto: "No tienes gastos recurrentes registrados." };

  const pendientes = new Set(obtenerRecurrentesPendientes(recurrentes).map((recurrente) => recurrente.id));
  const total = recurrentes.reduce((suma, recurrente) => suma + recurrente.monto, 0);

  return {
    texto: `Tus gastos fijos suman ${dinero(total)} al mes${pendientes.size ? `; ${plural(pendientes.size, "sigue", "siguen")} sin confirmar este mes` : ""}.`,
    resumen: {
      titulo: "Gastos recurrentes",
      monto: dinero(total),
      tono: "gasto",
      filas: recurrentes.slice(0, 10).map((recurrente) => [
        `Día ${recurrente.diaDelMes} · ${recurrente.nombre}`,
        `${dinero(recurrente.monto)}${pendientes.has(recurrente.id) ? " · pendiente" : ""}`,
      ]),
      advertencias,
    },
  };
};

const comprasPlaneadas = async ({ uid, advertencias }) => {
  const pendientes = (await obtenerComprasPlaneadas(uid)).filter((compra) => !compra.comprada);
  if (!pendientes.length) return { texto: "No tienes compras planeadas pendientes." };

  const total = pendientes.reduce((suma, compra) => suma + Number(compra.presupuesto || 0), 0);
  return {
    texto: `Tienes ${plural(pendientes.length, "compra planeada", "compras planeadas")} por ${dinero(total)}.`,
    resumen: {
      titulo: "Compras planeadas",
      monto: dinero(total),
      tono: "transferencia",
      filas: pendientes.slice(0, FILAS_LISTA).map((compra) => [
        `${compra.nombre}${compra.fechaLimite ? ` · ${fechaCortaLegible(compra.fechaLimite)}` : ""}`,
        dinero(compra.presupuesto),
      ]),
      advertencias,
    },
  };
};

const RESOLVEDORES = {
  [TEMAS_CONSULTA.GASTOS_POR_CATEGORIA]: (args) => gastosPorGrupo({ ...args, porCuenta: false }),
  [TEMAS_CONSULTA.GASTOS_POR_CUENTA]: (args) => gastosPorGrupo({ ...args, porCuenta: true }),
  [TEMAS_CONSULTA.GASTOS_TOTAL]: gastosTotal,
  [TEMAS_CONSULTA.GASTOS_POR_MES]: gastosPorMes,
  [TEMAS_CONSULTA.COMPARAR_GASTOS]: compararGastos,
  [TEMAS_CONSULTA.BALANCE]: balance,
  [TEMAS_CONSULTA.MOVIMIENTOS]: listarMovimientos,
  [TEMAS_CONSULTA.INGRESOS]: ingresos,
  [TEMAS_CONSULTA.SALDOS]: saldos,
  [TEMAS_CONSULTA.TARJETAS]: tarjetas,
  [TEMAS_CONSULTA.AHORROS]: ahorros,
  [TEMAS_CONSULTA.PRESTAMOS]: prestamos,
  [TEMAS_CONSULTA.DESPENSA_FALTANTES]: despensaFaltantes,
  [TEMAS_CONSULTA.DESPENSA_PRODUCTO]: despensaProducto,
  [TEMAS_CONSULTA.DESPENSA_GASTO]: despensaGasto,
  [TEMAS_CONSULTA.GASTOS_RECURRENTES]: gastosRecurrentes,
  [TEMAS_CONSULTA.COMPRAS_PLANEADAS]: comprasPlaneadas,
  // El reporte trae además el HTML para verlo o descargarlo (reportes/generarReporte.js).
  [TEMAS_CONSULTA.REPORTE]: ({ uid, consulta, hoyISO }) => generarReporte(consulta, { uid, hoy: new Date(`${hoyISO}T12:00:00`) }),
};

/* Qué sección abrir para ver el detalle de cada tema. */
export const RUTA_POR_TEMA = {
  [TEMAS_CONSULTA.GASTOS_POR_CATEGORIA]: "/movimientos",
  [TEMAS_CONSULTA.GASTOS_POR_CUENTA]: "/movimientos",
  [TEMAS_CONSULTA.GASTOS_TOTAL]: "/movimientos",
  [TEMAS_CONSULTA.GASTOS_POR_MES]: "/movimientos",
  [TEMAS_CONSULTA.COMPARAR_GASTOS]: "/movimientos",
  [TEMAS_CONSULTA.BALANCE]: "/ingresos",
  [TEMAS_CONSULTA.MOVIMIENTOS]: "/movimientos",
  [TEMAS_CONSULTA.INGRESOS]: "/ingresos",
  [TEMAS_CONSULTA.SALDOS]: "/home",
  [TEMAS_CONSULTA.TARJETAS]: "/home",
  [TEMAS_CONSULTA.AHORROS]: "/ahorros",
  [TEMAS_CONSULTA.PRESTAMOS]: "/prestamos",
  [TEMAS_CONSULTA.DESPENSA_FALTANTES]: "/despensa",
  [TEMAS_CONSULTA.DESPENSA_PRODUCTO]: "/despensa",
  [TEMAS_CONSULTA.DESPENSA_GASTO]: "/despensa",
  [TEMAS_CONSULTA.GASTOS_RECURRENTES]: "/movimientos",
  [TEMAS_CONSULTA.COMPRAS_PLANEADAS]: "/movimientos",
  [TEMAS_CONSULTA.REPORTE]: "/home",
};

/**
 * @param consulta  Resultado de interpretarCaptura (`consulta`), ya validado.
 * @returns {Promise<{ texto: string, resumen?: object, reporte?: object }>}
 */
export const responderConsulta = async (consulta, { uid, hoy = new Date() } = {}) => {
  const resolver = RESOLVEDORES[consulta?.tema];
  if (!resolver || !uid) return { texto: "No supe cómo responder eso. Intenta preguntarlo de otra forma." };
  return resolver({ uid, consulta, hoyISO: fechaLocalISO(hoy), advertencias: [] });
};
