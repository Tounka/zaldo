import { TEMAS_CONSULTA } from "./contratoConsulta.js";
import { finDelMesPasado, haceMeses, primeroDelMes } from "./reglasConsulta.js";

/*
 * Preguntas de seguimiento que se ofrecen como botones después de una
 * respuesta ("¿Y el mes pasado?", "Por categoría"). Cada una es una consulta
 * ya armada: la app la responde sin volver a llamar a la IA.
 */

const MAXIMO = 3;
const MESES_TENDENCIA = 6;
const T = TEMAS_CONSULTA;

const BASE = { desde: null, hasta: null, categoria: "", cuenta: null, texto: "", marca: "", orden: "mayor", reporte: "", pregunta: "" };

/**
 * @param consulta  Consulta ya interpretada (la que se acaba de responder).
 * @returns {{ etiqueta: string, consulta: object }[]}
 */
export const seguimientosDeConsulta = (consulta, hoyISO) => {
  if (!consulta?.tema) return [];

  const esEsteMes = (consulta.desde || primeroDelMes(hoyISO)) === primeroDelMes(hoyISO)
    && (consulta.hasta || hoyISO) === hoyISO;
  const filtros = { ...BASE, categoria: consulta.categoria || "", cuenta: consulta.cuenta || null, marca: consulta.marca || "" };
  const periodo = { desde: consulta.desde || null, hasta: consulta.hasta || null };

  const mesPasado = esEsteMes && {
    etiqueta: "¿Y el mes pasado?",
    consulta: { ...BASE, ...consulta, desde: haceMeses(hoyISO, 1), hasta: finDelMesPasado(hoyISO) },
  };
  const porCategoria = !consulta.categoria && {
    etiqueta: "Por categoría",
    consulta: { ...filtros, ...periodo, tema: T.GASTOS_POR_CATEGORIA },
  };
  const porCuenta = !consulta.cuenta && {
    etiqueta: "Por cuenta",
    consulta: { ...filtros, ...periodo, tema: T.GASTOS_POR_CUENTA },
  };
  const comparar = esEsteMes && {
    etiqueta: "Comparar con el mes pasado",
    consulta: { ...filtros, tema: T.COMPARAR_GASTOS },
  };
  const mesPorMes = {
    etiqueta: "Mes por mes",
    consulta: { ...filtros, tema: T.GASTOS_POR_MES, desde: haceMeses(hoyISO, MESES_TENDENCIA), hasta: finDelMesPasado(hoyISO) },
  };

  const porTema = {
    [T.GASTOS_TOTAL]: [mesPasado, porCategoria, comparar],
    [T.GASTOS_POR_CATEGORIA]: [mesPasado, porCuenta, mesPorMes],
    [T.GASTOS_POR_CUENTA]: [mesPasado, porCategoria, comparar],
    [T.COMPARAR_GASTOS]: [
      !consulta.categoria && { etiqueta: "Por categoría", consulta: { ...filtros, tema: T.GASTOS_POR_CATEGORIA } },
      mesPorMes,
    ],
    [T.GASTOS_POR_MES]: [
      !consulta.categoria && { etiqueta: "Por categoría este mes", consulta: { ...filtros, tema: T.GASTOS_POR_CATEGORIA } },
      { etiqueta: "Comparar con el mes pasado", consulta: { ...filtros, tema: T.COMPARAR_GASTOS } },
    ],
    [T.BALANCE]: [
      mesPasado,
      { etiqueta: "Gastos por categoría", consulta: { ...BASE, ...periodo, tema: T.GASTOS_POR_CATEGORIA } },
      { etiqueta: "Mis ingresos", consulta: { ...BASE, ...periodo, tema: T.INGRESOS } },
    ],
    [T.INGRESOS]: [mesPasado, { etiqueta: "¿Cuánto me sobró?", consulta: { ...BASE, ...periodo, tema: T.BALANCE } }],
    [T.SALDOS]: [{ etiqueta: "Mis tarjetas", consulta: { ...BASE, tema: T.TARJETAS } }],
    [T.TARJETAS]: [{ etiqueta: "Mis saldos", consulta: { ...BASE, tema: T.SALDOS } }],
    [T.DESPENSA_FALTANTES]: [{ etiqueta: "Gasto en despensa", consulta: { ...BASE, tema: T.DESPENSA_GASTO } }],
    [T.GASTOS_RECURRENTES]: [{ etiqueta: "¿Cuánto me sobró este mes?", consulta: { ...BASE, tema: T.BALANCE } }],
  };

  return (porTema[consulta.tema] || []).filter(Boolean).slice(0, MAXIMO);
};
