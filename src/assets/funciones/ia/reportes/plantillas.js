import { REPORTES } from "./catalogo.js";
import { capitalizar, dinero, dineroConSigno, plural, porcentaje } from "./formato.js";

/*
 * Diseño fijo de cada reporte: qué diapositivas lleva, con qué gráficas y
 * tablas, y los textos por defecto que escribimos nosotros (para que el
 * reporte funcione sin IA).
 *
 * Cada plantilla recibe las métricas de calculos.js y los textos ya
 * validados (redaccion.js). Las diapositivas usan los tipos de
 * analisis/esquema.js y se pintan con analisis/render.js.
 *
 *   textosPorDefecto(m) → { titulos: { [id]: texto }, puntos: [], recomendaciones: [] }
 *   diapositivas(m, t)  → diapositivas del esquema; t = textos finales
 *   metricasParaIA(m)   → lo único que viaja a OpenAI: agregados sin nombres de personas
 *   tarjeta(m)          → 2 o 3 cifras clave para la tarjeta del chat
 *   sinDatos(m)         → mensaje cuando no hay con qué armar el reporte
 */

/* 0.2345 → 23.5: los porcentajes viajan a la IA ya como se deben escribir. */
const pct = (fraccion) => (Number.isFinite(fraccion) ? Math.round(fraccion * 1000) / 10 : null);
const kpi = (valor, etiqueta, tono) => ({ valor, etiqueta, ...(tono ? { tono } : {}) });
const puntos = (lista) => lista.map((texto) => ({ texto }));
const marcarIncompleto = (mes) => `${mes.etiqueta}${mes.completo ? "" : "*"}`;
const notaIncompletos = (meses) => (meses.some((mes) => !mes.completo) ? "* Mes incompleto: no cuenta en el promedio." : "");
const unir = (...partes) => partes.filter(Boolean).join(" ");

/* Variación con signo para un KPI: +12% / -8%. */
const variacionTexto = (fraccion) => (Number.isFinite(fraccion) ? `${fraccion > 0 ? "+" : ""}${porcentaje(fraccion)}` : "—");

const portada = ({ reporte, titulo, subtitulo, valor, etiqueta, periodo, fecha }) => ({
  id: "portada",
  tipo: "portada",
  kicker: REPORTES[reporte].nombre,
  titulo,
  subtitulo,
  kpiPortada: valor ? { valor, etiqueta } : undefined,
  meta: ["Reporte de Zaldo", capitalizar(periodo), fecha ? `Generado el ${fecha}` : ""].filter(Boolean),
});

const resumen = ({ titulo, kpis, textos }) => ({
  id: "resumen",
  tipo: "kpis",
  kicker: "Resumen",
  titulo,
  kpis,
  puntos: puntos(textos.puntos.slice(0, 3)),
});

const recomendaciones = (textos, m) => ({
  id: "recomendaciones",
  tipo: "lista",
  kicker: "Siguientes pasos",
  titulo: "Qué hacer ahora",
  puntos: puntos(textos.recomendaciones),
  nota: m.advertencias.length ? `Sobre los datos: ${m.advertencias.join(" ")}` : "",
});

const grafica = ({ id, kicker, titulo, tipo = "barras", formato = "moneda", etiquetas, series, referencia, tarjetas, nota }) => ({
  id,
  tipo: "grafica",
  kicker,
  titulo,
  grafica: { tipo, formato, etiquetas, series, ...(referencia ? { referencia } : {}) },
  ...(tarjetas?.length ? { tarjetas } : {}),
  ...(nota ? { nota } : {}),
});

const tabla = ({ id, kicker, titulo, columnas, filas, nota }) => ({ id, tipo: "tabla", kicker, titulo, columnas, filas, ...(nota ? { nota } : {}) });

/* Series de barras apiladas a partir de { valores: { nombre: monto } } por mes; sin series vacías. */
const seriesApiladas = (meses, nombres) => nombres
  .map((nombre) => ({ nombre, valores: meses.map((mes) => mes.valores[nombre] || 0) }))
  .filter((serie) => serie.valores.some((valor) => valor > 0));

/* Siempre al menos dos recomendaciones: se completan con las genéricas. */
const completar = (lista, genericas) => [...new Set([...lista, ...genericas])].slice(0, 4);

/* ─────────── 1. Cierre de mes ─────────── */

const cierreMes = {
  sinDatos: (m) => `No encontré gastos ni ingresos en ${m.mes.nombre}${m.filtro ? ` (gastos ${m.filtro})` : ""}, así que no hay con qué armar el cierre.`,

  textosPorDefecto: (m) => {
    const principal = m.categorias[0];
    const titulos = {
      resumen: m.ingresos
        ? m.balance >= 0
          ? `Cerraste ${m.mes.nombre} con ${dinero(m.balance)} a favor`
          : `En ${m.mes.nombre} gastaste ${dinero(-m.balance)} más de lo que entró`
        : `En ${m.mes.nombre} gastaste ${dinero(m.gastos)}`,
      categorias: principal ? `${principal.nombre} se llevó el ${porcentaje(principal.porcentaje)} del gasto` : "Sin gastos por categoría",
      comparacion: m.variacion === null
        ? "Todavía no hay meses anteriores para comparar"
        : Math.abs(m.variacion) < 0.1
          ? "Gastaste casi lo mismo que tu promedio reciente"
          : `Gastaste ${porcentaje(Math.abs(m.variacion))} ${m.variacion > 0 ? "más" : "menos"} que tu promedio de los 3 meses anteriores`,
    };
    const puntos_ = [
      `Entraron ${dinero(m.ingresos)} y salieron ${dinero(m.gastos)} en ${plural(m.movimientos, "gasto")}.`,
      m.mayor ? `Tu gasto más grande fue de ${dinero(m.mayor.monto)} en ${m.mayor.categoria}.` : "",
      m.tasaAhorro !== null
        ? m.tasaAhorro >= 0 ? `Te quedaste con el ${porcentaje(m.tasaAhorro)} de lo que entró.` : "Este mes saliste con balance negativo."
        : "",
    ].filter(Boolean);
    const recomendaciones_ = [
      m.balance < 0 && principal ? `Revisa ${principal.nombre}: es la categoría con más peso y la primera para recortar.` : "",
      m.variacion > 0.1 && m.promedioAnterior ? `Ponte un tope mensual cercano a tu promedio de ${dinero(m.promedioAnterior)}.` : "",
      principal?.porcentaje > 0.4 ? `${principal.nombre} concentra casi la mitad del gasto; revisa si todo era necesario.` : "",
      !m.mes.completo ? "Vuelve a pedir el cierre cuando termine el mes para ver las cifras completas." : "",
    ].filter(Boolean);
    return {
      titulos,
      puntos: puntos_,
      recomendaciones: completar(recomendaciones_, [
        "Registra cada gasto el mismo día para que el siguiente cierre sea exacto.",
        "Aparta lo que quieras ahorrar al inicio del mes, antes de gastar.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => [
    portada({
      reporte: "cierre_mes",
      titulo: `Cierre de ${m.mes.nombre}`,
      subtitulo: unir(m.filtro ? `Gastos ${m.filtro}.` : "", m.mes.completo ? "" : "Mes en curso: cifras parciales."),
      valor: dinero(m.balance),
      etiqueta: "Balance del mes",
      periodo: m.nombrePeriodo,
      fecha: contexto.fecha,
    }),
    resumen({
      titulo: t.titulos.resumen,
      textos: t,
      kpis: [
        kpi(dinero(m.ingresos), "Ingresos", "info"),
        kpi(dinero(m.gastos), `Gastos${m.filtro ? ` ${m.filtro}` : ""}`),
        kpi(dinero(m.balance), "Balance", m.balance < 0 ? "malo" : "bueno"),
        kpi(variacionTexto(m.variacion), "Gasto vs. promedio de 3 meses"),
      ],
    }),
    m.categorias.length ? grafica({
      id: "categorias",
      kicker: "Categorías",
      titulo: t.titulos.categorias,
      etiquetas: m.categorias.map((categoria) => categoria.nombre),
      series: [{ nombre: "Gasto", valores: m.categorias.map((categoria) => categoria.total) }],
      tarjetas: [
        m.mayor ? { titulo: "Gasto más grande", texto: `**${dinero(m.mayor.monto)}** en ${m.mayor.categoria}${m.mayor.nota ? ` (${m.mayor.nota})` : ""}.` } : null,
        { titulo: "Categorías con gasto", texto: `${plural(m.numeroCategorias, "categoría")} en el mes; aquí ves las ${Math.min(5, m.numeroCategorias)} principales.` },
      ].filter(Boolean),
      nota: m.origenIngresos === "modulo" ? "Ingresos tomados del módulo de Ingresos (solo cobrados)." : "Ingresos tomados de tus movimientos.",
    }) : null,
    m.anteriores.length ? grafica({
      id: "comparacion",
      kicker: "Comparación",
      titulo: t.titulos.comparacion,
      etiquetas: [...m.anteriores.map((mes) => mes.etiqueta), `${m.mes.etiqueta}${m.mes.completo ? "" : "*"}`],
      series: [{ nombre: "Gasto", valores: [...m.anteriores.map((mes) => mes.total), m.gastos] }],
      referencia: { valor: m.promedioAnterior, etiqueta: `Promedio ${dinero(m.promedioAnterior)}` },
      tarjetas: [{
        titulo: "Diferencia",
        texto: `${dineroConSigno(m.diferencia)} frente al promedio de los meses anteriores.`,
        tono: m.diferencia > 0 ? "alerta" : "bueno",
      }],
      nota: m.mes.completo ? "" : "* Mes en curso.",
    }) : null,
    recomendaciones(t, m),
  ],

  metricasParaIA: (m) => ({
    mes: m.mes.etiqueta,
    mesCompleto: m.mes.completo,
    filtro: m.filtro,
    ingresos: m.ingresos,
    gastos: m.gastos,
    balance: m.balance,
    tasaAhorroPct: pct(m.tasaAhorro),
    numeroGastos: m.movimientos,
    categorias: m.categorias.map((categoria) => ({ nombre: categoria.nombre, total: categoria.total, porcentajePct: pct(categoria.porcentaje) })),
    gastoMasGrande: m.mayor ? { monto: m.mayor.monto, categoria: m.mayor.categoria } : null,
    promedio3MesesAnteriores: m.promedioAnterior,
    diferenciaVsPromedio: m.diferencia,
    variacionVsPromedioPct: pct(m.variacion),
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Ingresos", dinero(m.ingresos)], ["Gastos", dinero(m.gastos)], ["Balance", dinero(m.balance)]],
};

/* ─────────── 2. Gasto personal ─────────── */

const gastoPersonal = {
  sinDatos: (m) => `No encontré gastos marcados como personales ${m.nombrePeriodo === "este mes" ? "este mes" : `en ${m.nombrePeriodo}`}.`,

  textosPorDefecto: (m) => {
    const principal = m.categorias[0];
    const direccion = { sube: "va al alza", baja: "va a la baja", estable: "se mantiene estable" }[m.tendencia.direccion];
    return {
      titulos: {
        resumen: m.participacion !== null
          ? `Lo personal es el ${porcentaje(m.participacion)} de tu gasto`
          : `Gastas ${dinero(m.promedioPersonal)} al mes en lo personal`,
        evolucion: `Tu gasto personal ${direccion}`,
        categorias: principal ? `${principal.nombre} es lo que más pesa en tu gasto personal` : "Tu gasto personal por categoría",
      },
      puntos: [
        `En promedio gastas ${dinero(m.promedioPersonal)} al mes en lo personal y ${dinero(m.promedioResto)} en lo demás.`,
        m.mesMasAlto ? `El mes más alto fue ${m.mesMasAlto.nombre}, con ${dinero(m.mesMasAlto.personal)}.` : "",
        m.mesesCompletos ? `El promedio usa ${plural(m.mesesCompletos, "mes completo", "meses completos")}.` : "",
      ].filter(Boolean),
      recomendaciones: completar([
        m.tendencia.direccion === "sube" ? "Tu gasto personal viene subiendo: define un monto fijo al mes y revísalo cada semana." : "",
        principal?.porcentaje > 0.4 ? `Revisa ${principal.nombre}: concentra buena parte de tu gasto personal.` : "",
        m.participacion > 0.3 ? "Lo personal pesa bastante en tu gasto total; separa ese dinero en una cuenta propia." : "",
      ].filter(Boolean), [
        "Marca como personal cada gasto que sea solo para ti, para que este reporte sea exacto.",
        "Compara este reporte cada mes para ver si tu gasto personal se mantiene en tu meta.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => [
    portada({
      reporte: "gasto_personal",
      titulo: "Tu gasto personal",
      subtitulo: "Lo que marcaste como personal frente al resto de tu gasto.",
      valor: dinero(m.promedioPersonal),
      etiqueta: "Promedio mensual personal",
      periodo: m.nombrePeriodo,
      fecha: contexto.fecha,
    }),
    resumen({
      titulo: t.titulos.resumen,
      textos: t,
      kpis: [
        kpi(dinero(m.promedioPersonal), "Personal al mes", "info"),
        kpi(dinero(m.promedioResto), "Resto al mes"),
        kpi(porcentaje(m.participacion), "Parte personal del gasto"),
        kpi(variacionTexto(m.tendencia.variacion), "Tendencia del gasto personal", m.tendencia.direccion === "sube" ? "malo" : undefined),
      ],
    }),
    grafica({
      id: "evolucion",
      kicker: "Mes a mes",
      titulo: t.titulos.evolucion,
      tipo: "barras-apiladas",
      etiquetas: m.meses.map(marcarIncompleto),
      series: [
        { nombre: "Personal", valores: m.meses.map((mes) => mes.personal) },
        { nombre: "Resto", valores: m.meses.map((mes) => mes.resto) },
      ],
      referencia: { valor: m.promedioPersonal, etiqueta: `Promedio personal ${dinero(m.promedioPersonal)}` },
      nota: notaIncompletos(m.meses),
    }),
    m.categorias.length ? grafica({
      id: "categorias",
      kicker: "Categorías",
      titulo: t.titulos.categorias,
      etiquetas: m.categorias.map((categoria) => categoria.nombre),
      series: [{ nombre: "Gasto personal", valores: m.categorias.map((categoria) => categoria.total) }],
      tarjetas: m.categorias.slice(0, 3).map((categoria) => ({
        titulo: categoria.nombre,
        texto: `**${dinero(categoria.total)}**, el ${porcentaje(categoria.porcentaje)} de tu gasto personal del periodo.`,
      })),
    }) : null,
    tabla({
      id: "detalle",
      kicker: "Detalle",
      titulo: "Mes por mes",
      columnas: ["Mes", "Personal", "Resto", "Total", "% personal"],
      filas: m.meses.map((mes) => [
        marcarIncompleto(mes),
        dinero(mes.personal),
        dinero(mes.resto),
        dinero(mes.total),
        porcentaje(mes.total ? mes.personal / mes.total : null),
      ]),
      nota: notaIncompletos(m.meses),
    }),
    recomendaciones(t, m),
  ],

  metricasParaIA: (m) => ({
    periodo: m.nombrePeriodo,
    meses: m.meses.map((mes) => ({ mes: mes.etiqueta, completo: mes.completo, personal: mes.personal, resto: mes.resto })),
    promedioMensualPersonal: m.promedioPersonal,
    promedioMensualResto: m.promedioResto,
    promedioMensualTotal: m.promedioTotal,
    promedioMensualRecurrente: m.promedioRecurrente,
    promedioMensualExtraordinario: m.promedioExtraordinario,
    participacionPersonalPct: pct(m.participacion),
    tendencia: m.tendencia.direccion,
    variacionTendenciaPct: pct(m.tendencia.variacion),
    categoriasPersonales: m.categorias.map((categoria) => ({ nombre: categoria.nombre, total: categoria.total, porcentajePct: pct(categoria.porcentaje) })),
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Personal al mes", dinero(m.promedioPersonal)], ["Resto al mes", dinero(m.promedioResto)], ["Parte personal", porcentaje(m.participacion)]],
};

/* ─────────── 3. Categorías ─────────── */

const categorias = {
  sinDatos: (m) => `No encontré gastos ${m.nombrePeriodo === "este mes" ? "este mes" : `en ${m.nombrePeriodo}`}${m.filtro ? ` (${m.filtro})` : ""}.`,

  textosPorDefecto: (m) => {
    const principal = m.ranking[0];
    return {
      titulos: {
        resumen: `${principal.nombre} encabeza tu gasto con ${porcentaje(principal.porcentaje)}`,
        ranking: m.concentracionTop3 !== null
          ? `Tus 3 categorías principales suman el ${porcentaje(m.concentracionTop3)} del gasto`
          : "Así se reparte tu gasto",
        evolucion: "Así cambió la mezcla de tu gasto mes a mes",
        cambios: m.subio
          ? `${m.subio.nombre} fue la que más subió: ${dineroConSigno(m.subio.diferencia)}`
          : m.bajo ? `${m.bajo.nombre} fue la que más bajó` : "Sin cambios que comparar entre meses",
      },
      puntos: [
        `Gastaste ${dinero(m.total)} en total, en promedio ${dinero(m.promedioMensual)} al mes.`,
        `${principal.nombre} sumó ${dinero(principal.total)}.`,
        m.bajo ? `${m.bajo.nombre} bajó ${dinero(-m.bajo.diferencia)} entre ${m.comparacion.desde} y ${m.comparacion.hasta}.` : "",
      ].filter(Boolean),
      recomendaciones: completar([
        m.subio ? `Revisa por qué subió ${m.subio.nombre} y decide si es algo que se repetirá.` : "",
        principal.porcentaje > 0.35 ? `Ponle un tope mensual a ${principal.nombre}, tu categoría más grande.` : "",
        m.ranking.some((categoria) => categoria.nombre === "Sin categoría") ? "Asigna categoría a los gastos que no tienen para que el ranking sea fiel." : "",
      ].filter(Boolean), [
        "Elige una categoría para recortar este mes y mide el resultado en el siguiente reporte.",
        "Revisa las suscripciones y gastos fijos: suelen esconderse en varias categorías.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => {
    const top = m.ranking.slice(0, 8);
    const nombresApilados = [...m.principales, "Otras"];
    return [
      portada({
        reporte: "categorias",
        titulo: "Tus categorías de gasto",
        subtitulo: m.filtro ? `Gastos ${m.filtro}.` : "Ranking y evolución de en qué se va tu dinero.",
        valor: dinero(m.total),
        etiqueta: "Gasto total del periodo",
        periodo: m.nombrePeriodo,
        fecha: contexto.fecha,
      }),
      resumen({
        titulo: t.titulos.resumen,
        textos: t,
        kpis: [
          kpi(dinero(m.total), "Gasto total", "info"),
          kpi(dinero(m.promedioMensual), "Promedio mensual"),
          kpi(porcentaje(m.ranking[0].porcentaje), `Peso de ${m.ranking[0].nombre}`),
          kpi(porcentaje(m.concentracionTop3), "Top 3 categorías"),
        ],
      }),
      grafica({
        id: "ranking",
        kicker: "Ranking",
        titulo: t.titulos.ranking,
        etiquetas: top.map((categoria) => categoria.nombre),
        series: [{ nombre: "Gasto", valores: top.map((categoria) => categoria.total) }],
      }),
      m.porMes.length > 1 ? grafica({
        id: "evolucion",
        kicker: "Mes a mes",
        titulo: t.titulos.evolucion,
        tipo: "barras-apiladas",
        etiquetas: m.porMes.map(marcarIncompleto),
        series: seriesApiladas(m.porMes, nombresApilados),
        nota: notaIncompletos(m.porMes),
      }) : null,
      m.comparacion ? {
        id: "cambios",
        tipo: "tarjetas",
        kicker: "Cambios",
        titulo: t.titulos.cambios,
        tarjetas: [
          m.subio ? { titulo: `Subió: ${m.subio.nombre}`, texto: `De ${dinero(m.subio.antes)} a ${dinero(m.subio.despues)} (**${dineroConSigno(m.subio.diferencia)}**).`, tono: "alerta" } : null,
          m.bajo ? { titulo: `Bajó: ${m.bajo.nombre}`, texto: `De ${dinero(m.bajo.antes)} a ${dinero(m.bajo.despues)} (**${dineroConSigno(m.bajo.diferencia)}**).`, tono: "bueno" } : null,
          { titulo: `Principal: ${m.ranking[0].nombre}`, texto: `**${dinero(m.ranking[0].total)}** en el periodo, ${dinero(m.ranking[0].promedioMensual)} al mes.` },
        ].filter(Boolean),
        nota: `Compara ${m.comparacion.desde} contra ${m.comparacion.hasta}.`,
      } : null,
      tabla({
        id: "detalle",
        kicker: "Detalle",
        titulo: "Todas las categorías",
        columnas: ["Categoría", "Total", "% del gasto", "Promedio mensual"],
        filas: m.ranking.slice(0, 12).map((categoria) => [categoria.nombre, dinero(categoria.total), porcentaje(categoria.porcentaje), dinero(categoria.promedioMensual)]),
      }),
      recomendaciones(t, m),
    ];
  },

  metricasParaIA: (m) => ({
    periodo: m.nombrePeriodo,
    filtro: m.filtro,
    total: m.total,
    promedioMensual: m.promedioMensual,
    ranking: m.ranking.slice(0, 8).map((categoria) => ({ nombre: categoria.nombre, total: categoria.total, porcentajePct: pct(categoria.porcentaje), promedioMensual: categoria.promedioMensual })),
    top3Pct: pct(m.concentracionTop3),
    comparacion: m.comparacion,
    masSubio: m.subio,
    masBajo: m.bajo,
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Total", dinero(m.total)], ["Al mes", dinero(m.promedioMensual)], ["Principal", `${m.ranking[0].nombre} · ${porcentaje(m.ranking[0].porcentaje)}`]],
};

/* ─────────── 4. Tarjetas ─────────── */

const tarjetas = {
  sinDatos: () => "No tienes tarjetas de crédito registradas, así que no hay reporte que armar.",

  textosPorDefecto: (m) => {
    const enAlerta = m.tarjetas.filter((tarjeta) => tarjeta.alerta);
    return {
      titulos: {
        resumen: m.deuda
          ? m.usoTotal !== null
            ? `Usas el ${porcentaje(m.usoTotal)} de tu límite de crédito`
            : `Debes ${dinero(m.deuda)} en tus tarjetas`
          : "Tus tarjetas no tienen deuda",
        uso: enAlerta.length
          ? `${plural(enAlerta.length, "tarjeta pasa", "tarjetas pasan")} del 30% de uso`
          : "Ninguna tarjeta pasa del 30% de uso",
        detalle: m.deuda ? `${porcentaje(m.msi / m.deuda)} de tu deuda está a meses sin intereses` : "Sin saldo a meses ni revolvente",
      },
      puntos: [
        `Debes ${dinero(m.deuda)} en total: ${dinero(m.msi)} a meses sin intereses y ${dinero(m.revolvente)} revolvente.`,
        m.limite ? `Tu límite total es de ${dinero(m.limite)}.` : "",
        enAlerta.length ? `La tarjeta con más uso es ${enAlerta[0].nombre}.` : "",
      ].filter(Boolean),
      recomendaciones: completar([
        m.revolvente > 0 ? "Paga primero el saldo revolvente: es el que genera intereses." : "",
        enAlerta.length ? "Baja el uso de las tarjetas que pasan del 30% antes de su fecha de corte." : "",
        m.msi > 0 ? "Antes de otra compra a meses, revisa cuánto suman tus mensualidades actuales." : "",
      ].filter(Boolean), [
        "Paga el total para no generar intereses cada vez que puedas.",
        "Registra el límite de cada tarjeta para medir bien su uso.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => {
    const conLimite = m.tarjetas.filter((tarjeta) => tarjeta.limite);
    return [
      portada({
        reporte: "tarjetas",
        titulo: "Tus tarjetas de crédito",
        subtitulo: `${plural(m.tarjetas.length, "tarjeta")} activa${m.tarjetas.length === 1 ? "" : "s"}.`,
        valor: dinero(m.deuda),
        etiqueta: "Deuda total",
        periodo: contexto.fecha ? `Saldos al ${contexto.fecha}` : "Saldos de hoy",
      }),
      resumen({
        titulo: t.titulos.resumen,
        textos: t,
        kpis: [
          kpi(dinero(m.deuda), "Deuda total", "info"),
          kpi(porcentaje(m.usoTotal), "Uso del límite total", m.usoTotal > m.umbral ? "malo" : undefined),
          kpi(dinero(m.msi), "A meses sin intereses"),
          kpi(dinero(m.revolvente), "Revolvente"),
        ],
      }),
      conLimite.length ? grafica({
        id: "uso",
        kicker: "Uso del límite",
        titulo: t.titulos.uso,
        formato: "porcentaje",
        etiquetas: conLimite.map((tarjeta) => tarjeta.nombre),
        series: [{ nombre: "Uso", valores: conLimite.map((tarjeta) => Math.round(tarjeta.uso * 1000) / 10) }],
        referencia: { valor: m.umbral * 100, etiqueta: "Alerta: 30%" },
        tarjetas: conLimite.filter((tarjeta) => tarjeta.alerta).slice(0, 3).map((tarjeta) => ({
          titulo: tarjeta.nombre,
          texto: `Usa el **${porcentaje(tarjeta.uso)}** de su límite; quedan ${dinero(tarjeta.disponible)} disponibles.`,
          tono: "alerta",
        })),
      }) : null,
      tabla({
        id: "detalle",
        kicker: "Detalle",
        titulo: t.titulos.detalle,
        columnas: ["Tarjeta", "Deuda", "Límite", "Uso", "A meses", "Revolvente"],
        filas: m.tarjetas.map((tarjeta) => [
          tarjeta.nombre,
          dinero(tarjeta.deuda),
          tarjeta.limite ? dinero(tarjeta.limite) : "—",
          porcentaje(tarjeta.uso),
          dinero(tarjeta.msi),
          dinero(tarjeta.revolvente),
        ]),
        nota: "Uso = deuda total entre el límite. Alerta arriba de 30%.",
      }),
      recomendaciones(t, m),
    ];
  },

  // Los nombres de las tarjetas no viajan: "Tarjeta 1", "Tarjeta 2"…
  metricasParaIA: (m) => ({
    deudaTotal: m.deuda,
    msi: m.msi,
    revolvente: m.revolvente,
    limiteTotal: m.limite,
    usoTotalPct: pct(m.usoTotal),
    tarjetasEnAlerta: m.enAlerta,
    pagoParaDejarTodasEn30: m.paraBajarAlUmbral,
    tarjetas: m.tarjetas.map((tarjeta, indice) => ({
      tarjeta: `Tarjeta ${indice + 1}`,
      deuda: tarjeta.deuda,
      limite: tarjeta.limite,
      usoPct: pct(tarjeta.uso),
      msi: tarjeta.msi,
      revolvente: tarjeta.revolvente,
      pagoParaBajarA30: tarjeta.paraBajarAlUmbral,
    })),
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Deuda", dinero(m.deuda)], ["Uso del límite", porcentaje(m.usoTotal)], ["En alerta", String(m.enAlerta)]],
};

/* ─────────── 5. Ingresos ─────────── */

const ingresos = {
  sinDatos: (m) => `No encontré ingresos cobrados ${m.nombrePeriodo === "este mes" ? "este mes" : `en ${m.nombrePeriodo}`}.`,

  textosPorDefecto: (m) => {
    const principal = m.fuentes[0];
    return {
      titulos: {
        resumen: `Recibes en promedio ${dinero(m.promedioMensual)} al mes`,
        evolucion: m.minimo && m.maximo && m.minimo !== m.maximo
          ? `Tu ingreso mensual fue de ${dinero(m.minimo.total)} a ${dinero(m.maximo.total)}`
          : "Así se movió tu ingreso mes a mes",
        concentracion: m.fuentes.length > 1
          ? `El ${porcentaje(m.concentracion)} de tu ingreso viene de una sola fuente`
          : "Todo tu ingreso viene de una sola fuente",
      },
      puntos: [
        `Recibiste ${dinero(m.total)} en el periodo.`,
        principal ? `Tu fuente principal fue ${principal.nombre}, con ${dinero(principal.total)}.` : "",
        m.pendiente ? `Tienes ${dinero(m.pendiente)} pendientes de cobro.` : "",
      ].filter(Boolean),
      recomendaciones: completar([
        m.pendiente ? "Da seguimiento a lo pendiente de cobro antes de que se acumule." : "",
        m.nivelConcentracion === "alta" ? "Casi todo depende de una fuente: arma un fondo de emergencia de al menos 3 meses de gasto." : "",
        m.minimo && m.maximo && m.maximo.total > m.minimo.total * 1.3 ? "Tu ingreso varía bastante: planea tu gasto con base en el mes más bajo." : "",
      ].filter(Boolean), [
        "Registra cada cobro en Ingresos para que este reporte sea exacto.",
        "Separa un porcentaje fijo de cada ingreso para ahorro en cuanto lo recibas.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => [
    portada({
      reporte: "ingresos",
      titulo: "Tus ingresos",
      subtitulo: m.origen === "modulo" ? "Cobros confirmados del módulo de Ingresos." : "Ingresos registrados en tus movimientos.",
      valor: dinero(m.promedioMensual),
      etiqueta: "Ingreso mensual promedio",
      periodo: m.nombrePeriodo,
      fecha: contexto.fecha,
    }),
    resumen({
      titulo: t.titulos.resumen,
      textos: t,
      kpis: [
        kpi(dinero(m.total), "Total del periodo", "info"),
        kpi(dinero(m.promedioMensual), "Promedio mensual"),
        kpi(porcentaje(m.concentracion), "Fuente principal", m.nivelConcentracion === "alta" ? "malo" : undefined),
        kpi(dinero(m.pendiente), "Pendiente de cobro"),
      ],
    }),
    grafica({
      id: "evolucion",
      kicker: "Mes a mes",
      titulo: t.titulos.evolucion,
      tipo: "barras-apiladas",
      etiquetas: m.meses.map(marcarIncompleto),
      series: seriesApiladas(m.meses, [...m.principales, "Otras"]),
      referencia: { valor: m.promedioMensual, etiqueta: `Promedio ${dinero(m.promedioMensual)}` },
      nota: notaIncompletos(m.meses),
    }),
    grafica({
      id: "concentracion",
      kicker: "Fuentes",
      titulo: t.titulos.concentracion,
      etiquetas: m.fuentes.slice(0, 6).map((fuente) => fuente.nombre),
      series: [{ nombre: "Ingreso", valores: m.fuentes.slice(0, 6).map((fuente) => fuente.total) }],
      tarjetas: [{
        titulo: `Concentración ${m.nivelConcentracion}`,
        texto: `La fuente principal aporta el **${porcentaje(m.concentracion)}** de tu ingreso del periodo.`,
        tono: m.nivelConcentracion === "alta" ? "alerta" : m.nivelConcentracion === "baja" ? "bueno" : undefined,
      }],
    }),
    tabla({
      id: "detalle",
      kicker: "Detalle",
      titulo: "Ingreso por fuente",
      columnas: ["Fuente", "Total", "% del ingreso"],
      filas: m.fuentes.slice(0, 10).map((fuente) => [fuente.nombre, dinero(fuente.total), porcentaje(fuente.porcentaje)]),
    }),
    recomendaciones(t, m),
  ],

  // Las fuentes pueden ser nombres de personas: viajan como "Fuente 1", "Fuente 2"…
  metricasParaIA: (m) => ({
    periodo: m.nombrePeriodo,
    total: m.total,
    promedioMensual: m.promedioMensual,
    mesMasBajo: m.minimo,
    mesMasAlto: m.maximo,
    meses: m.meses.map((mes) => ({ mes: mes.etiqueta, completo: mes.completo, total: mes.total })),
    fuentes: m.fuentes.slice(0, 6).map((fuente, indice) => ({ fuente: `Fuente ${indice + 1}`, total: fuente.total, porcentajePct: pct(fuente.porcentaje) })),
    numeroFuentes: m.fuentes.length,
    concentracionPct: pct(m.concentracion),
    nivelConcentracion: m.nivelConcentracion,
    pendienteDeCobro: m.pendiente,
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Al mes", dinero(m.promedioMensual)], ["Total", dinero(m.total)], ["Fuente principal", porcentaje(m.concentracion)]],
};

/* ─────────── 6. Ahorro ─────────── */

const ahorro = {
  sinDatos: () => "Todavía no tienes registros de ahorro este año.",

  textosPorDefecto: (m) => {
    const mejor = [...m.cuentas].sort((a, b) => b.rendimiento - a.rendimiento)[0];
    return {
      titulos: {
        resumen: m.avanceMeta !== null
          ? `Llevas el ${porcentaje(m.avanceMeta)} de tu meta del año`
          : m.crecimiento !== null ? `Tu capital ${m.crecimiento >= 0 ? "creció" : "bajó"} ${dinero(Math.abs(m.crecimiento))} en el año` : `Tu capital es de ${dinero(m.capital)}`,
        evolucion: m.crecimiento !== null ? `Tu capital ${m.crecimiento >= 0 ? "creció" : "bajó"} ${dinero(Math.abs(m.crecimiento))} en el año de ahorro` : "Así se movió tu capital",
        composicion: m.liquidez !== null ? `El ${porcentaje(m.liquidez)} de tu ahorro está disponible de inmediato` : "Así está repartido tu ahorro",
        cuentas: mejor?.rendimiento > 0 ? `${mejor.nombre} es la cuenta que más te ha rendido` : "Rendimiento de tus cuentas",
      },
      puntos: [
        `Tu capital es de ${dinero(m.capital)}.`,
        m.rendimiento ? `Tus cuentas te han dado ${dinero(m.rendimiento)} de rendimientos en el año.` : "",
        m.faltaMeta ? `Te faltan ${dinero(m.faltaMeta)} para tu meta anual.` : "",
      ].filter(Boolean),
      recomendaciones: completar([
        m.faltaMeta ? "Divide lo que falta para tu meta entre los meses que quedan y prográmalo como aportación fija." : "",
        m.liquidez !== null && m.liquidez < 0.15 ? "Tienes poco ahorro líquido: deja un colchón disponible para emergencias." : "",
        m.cuentas.some((cuenta) => cuenta.tasaEsperada !== null && cuenta.tasaAnual !== null && cuenta.tasaAnual < cuenta.tasaEsperada)
          ? "Algunas cuentas rinden menos de lo que esperabas: revisa si conviene moverlas." : "",
      ].filter(Boolean), [
        "Actualiza tus saldos de ahorro cada semana para que el seguimiento sea fiel.",
        "Clasifica tus aportaciones como aumento a capital para no confundirlas con rendimiento.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => [
    portada({
      reporte: "ahorro",
      titulo: "Tu ahorro",
      subtitulo: `Año de ahorro ${m.anio} (de agosto a julio).`,
      valor: dinero(m.capital),
      etiqueta: "Capital actual",
      periodo: contexto.fecha ? `Saldos al ${contexto.fecha}` : "Saldos de hoy",
    }),
    resumen({
      titulo: t.titulos.resumen,
      textos: t,
      kpis: [
        kpi(dinero(m.capital), "Capital", "info"),
        kpi(m.crecimiento === null ? "—" : dineroConSigno(m.crecimiento), "Crecimiento del año", m.crecimiento < 0 ? "malo" : undefined),
        kpi(porcentaje(m.avanceMeta), m.meta ? `Avance de la meta (${dinero(m.meta)})` : "Sin meta anual"),
        kpi(dinero(m.rendimiento), "Rendimientos del año"),
      ],
    }),
    m.capitalMensual.length > 1 ? grafica({
      id: "evolucion",
      kicker: "Evolución",
      titulo: t.titulos.evolucion,
      tipo: "linea",
      etiquetas: m.capitalMensual.map((mes) => mes.etiqueta),
      series: [{ nombre: "Capital al cierre del mes", valores: m.capitalMensual.map((mes) => mes.capital) }],
      referencia: m.meta && m.capitalInicial !== null ? { valor: m.capitalInicial + m.meta, etiqueta: `Meta ${dinero(m.capitalInicial + m.meta)}` } : undefined,
    }) : null,
    grafica({
      id: "composicion",
      kicker: "Composición",
      titulo: t.titulos.composicion,
      etiquetas: m.composicion.filter((grupo) => grupo.total > 0).map((grupo) => grupo.nombre),
      series: [{ nombre: "Saldo", valores: m.composicion.filter((grupo) => grupo.total > 0).map((grupo) => grupo.total) }],
      tarjetas: [
        { titulo: "Disponible", texto: `**${dinero(m.composicion[0].total)}** en cuentas líquidas.` },
        m.responsabilidades ? { titulo: "Responsabilidades", texto: `${dinero(m.responsabilidades)} que restan al capital.`, tono: "alerta" } : null,
      ].filter(Boolean),
    }),
    m.cuentas.length ? tabla({
      id: "cuentas",
      kicker: "Cuentas",
      titulo: t.titulos.cuentas,
      columnas: ["Cuenta", "Grupo", "Saldo", "Rendimiento del año", "Tasa real aprox.", "Tasa esperada"],
      filas: m.cuentas.slice(0, 10).map((cuenta) => [
        cuenta.nombre,
        cuenta.grupo,
        dinero(cuenta.saldo),
        dinero(cuenta.rendimiento),
        cuenta.tasaAnual === null ? "—" : `${cuenta.tasaAnual}%`,
        cuenta.tasaEsperada === null ? "—" : `${cuenta.tasaEsperada}%`,
      ]),
      nota: "La tasa real es aproximada: rendimiento entre saldo promedio, anualizado. Se calcula con al menos una semana de datos.",
    }) : null,
    recomendaciones(t, m),
  ],

  // Las cuentas viajan como "Cuenta 1", "Cuenta 2"… con su grupo.
  metricasParaIA: (m) => ({
    anioDeAhorro: m.anio,
    capital: m.capital,
    capitalInicial: m.capitalInicial,
    crecimiento: m.crecimiento,
    metaAnual: m.meta,
    avanceMetaPct: pct(m.avanceMeta),
    faltaParaMeta: m.faltaMeta,
    rendimientosDelAnio: m.rendimiento,
    liquidezPct: pct(m.liquidez),
    composicion: m.composicion.map((grupo) => ({ grupo: grupo.nombre, total: grupo.total })),
    responsabilidades: m.responsabilidades,
    cuentas: m.cuentas.slice(0, 10).map((cuenta, indice) => ({
      cuenta: `Cuenta ${indice + 1}`,
      grupo: cuenta.grupo,
      saldo: cuenta.saldo,
      rendimiento: cuenta.rendimiento,
      tasaRealPct: cuenta.tasaAnual,
      tasaEsperadaPct: cuenta.tasaEsperada,
    })),
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Capital", dinero(m.capital)], ["Crecimiento", m.crecimiento === null ? "—" : dineroConSigno(m.crecimiento)], ["Meta", porcentaje(m.avanceMeta)]],
};

/* ─────────── 7. Préstamos ─────────── */

const prestamos = {
  sinDatos: () => "No tienes préstamos pendientes de cobro.",

  textosPorDefecto: (m) => {
    const viejos = m.antiguedad.find((rango) => rango.nombre === "Más de 12 meses");
    return {
      titulos: {
        resumen: `Te deben ${dinero(m.porCobrar)} en ${plural(m.cantidad, "préstamo")}`,
        antiguedad: viejos ? `${plural(viejos.cantidad, "préstamo lleva", "préstamos llevan")} más de un año sin liquidarse` : "Tus préstamos son recientes",
        detalle: m.cantidad > 1 ? `Un solo préstamo concentra el ${porcentaje(m.concentracionPrincipal)} de lo que te deben` : "Un solo préstamo pendiente",
      },
      puntos: [
        `Has recuperado ${dinero(m.recuperado)} de ${dinero(m.totalPrestado)} (${porcentaje(m.avanceCobro)}).`,
        m.masAntiguo ? `El préstamo más antiguo lleva ${plural(m.masAntiguo.meses, "mes", "meses")}.` : "",
      ].filter(Boolean),
      recomendaciones: completar([
        viejos ? "Acuerda un calendario de pagos para los préstamos de más de un año." : "",
        m.concentracionPrincipal > 0.5 && m.cantidad > 1 ? "Da prioridad al préstamo más grande: concentra la mayor parte del saldo." : "",
      ].filter(Boolean), [
        "Registra cada abono el día que lo recibes para tener el saldo al día.",
        "Antes de prestar de nuevo, define cuánto de tu ahorro estás dispuesto a tener prestado.",
      ]),
    };
  },

  diapositivas: (m, t, contexto) => [
    portada({
      reporte: "prestamos",
      titulo: "Préstamos por cobrar",
      subtitulo: `${plural(m.cantidad, "préstamo")} con saldo pendiente.`,
      valor: dinero(m.porCobrar),
      etiqueta: "Por cobrar",
      periodo: contexto.fecha ? `Saldos al ${contexto.fecha}` : "Saldos de hoy",
    }),
    resumen({
      titulo: t.titulos.resumen,
      textos: t,
      kpis: [
        kpi(dinero(m.porCobrar), "Por cobrar", "info"),
        kpi(String(m.cantidad), "Préstamos activos"),
        kpi(porcentaje(m.avanceCobro), "Recuperado"),
        kpi(m.masAntiguo ? plural(m.masAntiguo.meses, "mes", "meses") : "—", "El más antiguo"),
      ],
    }),
    grafica({
      id: "antiguedad",
      kicker: "Antigüedad",
      titulo: t.titulos.antiguedad,
      etiquetas: m.antiguedad.map((rango) => rango.nombre),
      series: [{ nombre: "Por cobrar", valores: m.antiguedad.map((rango) => rango.total) }],
      tarjetas: m.antiguedad.map((rango) => ({
        titulo: rango.nombre,
        texto: `${plural(rango.cantidad, "préstamo")} · **${dinero(rango.total)}**`,
        tono: rango.nombre === "Más de 12 meses" ? "alerta" : undefined,
      })),
    }),
    tabla({
      id: "detalle",
      kicker: "Detalle",
      titulo: t.titulos.detalle,
      columnas: ["Préstamo", "Desde", "Total", "Pagado", "Por cobrar"],
      filas: m.prestamos.slice(0, 10).map((prestamo) => [
        prestamo.nombre,
        prestamo.fechaInicio || "—",
        dinero(prestamo.total),
        dinero(prestamo.pagado),
        dinero(prestamo.restante),
      ]),
      nota: m.prestamos.length > 10 ? `Y ${plural(m.prestamos.length - 10, "préstamo")} más.` : "Total = monto prestado más el interés acordado.",
    }),
    recomendaciones(t, m),
  ],

  // Nunca viajan los nombres de quienes deben.
  metricasParaIA: (m) => ({
    porCobrar: m.porCobrar,
    prestamosActivos: m.cantidad,
    totalPrestadoConInteres: m.totalPrestado,
    recuperado: m.recuperado,
    recuperadoPct: pct(m.avanceCobro),
    antiguedad: m.antiguedad,
    mesesDelMasAntiguo: m.masAntiguo?.meses ?? null,
    concentracionPrincipalPct: pct(m.concentracionPrincipal),
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Por cobrar", dinero(m.porCobrar)], ["Préstamos", String(m.cantidad)], ["Recuperado", porcentaje(m.avanceCobro)]],
};

/* ─────────── 8. Despensa ─────────── */

const despensa = {
  sinDatos: () => "Todavía no hay compras ni productos en tu despensa.",

  textosPorDefecto: (m) => ({
    titulos: {
      resumen: m.promedioMensual ? `Gastas en promedio ${dinero(m.promedioMensual)} al mes en despensa` : "Tu despensa en números",
      evolucion: m.ultimoMes ? `En ${m.ultimoMes.nombre} llevas ${dinero(m.ultimoMes.total)} en despensa` : "Tu gasto en despensa mes a mes",
      productos: m.productos[0] ? `${m.productos[0].nombre} es el producto en que más has gastado` : "Tus productos con más gasto",
      faltantes: m.faltantes.length ? `Te ${m.faltantes.length === 1 ? "falta" : "faltan"} ${plural(m.faltantes.length, "producto")}` : "No te falta nada",
    },
    puntos: [
      m.total ? `Gastaste ${dinero(m.total)} en despensa en el periodo.` : "",
      m.totalProductos ? `Tienes ${plural(m.totalProductos, "producto")} en tu inventario, con un valor de ${dinero(m.valorInventario)}.` : "",
      m.agotados ? `${plural(m.agotados, "producto está agotado", "productos están agotados")}.` : "",
    ].filter(Boolean),
    recomendaciones: completar([
      m.faltantes.length ? "Arma tu lista del súper con los faltantes antes de salir." : "",
      m.ultimoMes && m.promedioMensual && m.ultimoMes.total > m.promedioMensual * 1.2 ? "Este mes vas arriba de tu promedio: revisa las compras grandes." : "",
    ].filter(Boolean), [
      "Registra cada compra con su ticket para que el gasto mensual sea exacto.",
      "Pon un mínimo a los productos que usas siempre para que aparezcan en faltantes a tiempo.",
    ]),
  }),

  diapositivas: (m, t, contexto) => [
    portada({
      reporte: "despensa",
      titulo: "Tu despensa",
      subtitulo: "Gasto mensual, productos y lo que falta comprar.",
      valor: dinero(m.promedioMensual),
      etiqueta: "Promedio mensual",
      periodo: m.nombrePeriodo,
      fecha: contexto.fecha,
    }),
    resumen({
      titulo: t.titulos.resumen,
      textos: t,
      kpis: [
        kpi(dinero(m.promedioMensual), "Promedio mensual", "info"),
        kpi(m.ultimoMes ? dinero(m.ultimoMes.total) : "—", m.ultimoMes ? `Gasto de ${m.ultimoMes.etiqueta}${m.ultimoMes.completo ? "" : " (en curso)"}` : "Último mes"),
        kpi(String(m.faltantes.length), "Productos que faltan", m.faltantes.length ? "malo" : undefined),
        kpi(dinero(m.valorInventario), "Valor del inventario"),
      ],
    }),
    m.meses.length ? grafica({
      id: "evolucion",
      kicker: "Mes a mes",
      titulo: t.titulos.evolucion,
      etiquetas: m.meses.map(marcarIncompleto),
      series: [{ nombre: "Despensa", valores: m.meses.map((mes) => mes.total) }],
      referencia: m.promedioMensual ? { valor: m.promedioMensual, etiqueta: `Promedio ${dinero(m.promedioMensual)}` } : undefined,
      nota: notaIncompletos(m.meses),
    }) : null,
    m.productos.length ? grafica({
      id: "productos",
      kicker: "Productos",
      titulo: t.titulos.productos,
      etiquetas: m.productos.map((producto) => producto.nombre),
      series: [{ nombre: "Gastado", valores: m.productos.map((producto) => producto.gastado) }],
      nota: "Gasto acumulado desde que registras cada producto.",
    }) : null,
    m.faltantes.length ? tabla({
      id: "faltantes",
      kicker: "Lista del súper",
      titulo: t.titulos.faltantes,
      columnas: ["Producto", "Te queda"],
      filas: m.faltantes.slice(0, 12).map((producto) => [producto.nombre, producto.stock || "—"]),
      nota: m.faltantes.length > 12 ? `Y ${plural(m.faltantes.length - 12, "producto")} más en la despensa.` : "",
    }) : {
      id: "faltantes",
      tipo: "tarjetas",
      kicker: "Lista del súper",
      titulo: t.titulos.faltantes,
      tarjetas: [{ titulo: "Todo en orden", texto: "Ningún producto está por debajo de su mínimo.", tono: "bueno" }],
    },
    recomendaciones(t, m),
  ],

  metricasParaIA: (m) => ({
    periodo: m.nombrePeriodo,
    meses: m.meses.map((mes) => ({ mes: mes.etiqueta, completo: mes.completo, total: mes.total })),
    totalDelPeriodo: m.total,
    promedioMensual: m.promedioMensual,
    productosConMasGasto: m.productos.slice(0, 5).map((producto) => ({ producto: producto.nombre, gastado: producto.gastado })),
    faltantes: m.faltantes.length,
    ejemplosFaltantes: m.faltantes.slice(0, 6).map((producto) => producto.nombre),
    productosEnInventario: m.totalProductos,
    agotados: m.agotados,
    valorInventario: m.valorInventario,
    advertencias: m.advertencias,
  }),

  tarjeta: (m) => [["Al mes", dinero(m.promedioMensual)], ["Faltan", String(m.faltantes.length)], ["Inventario", dinero(m.valorInventario)]],
};

export const PLANTILLAS_REPORTE = {
  cierre_mes: cierreMes,
  gasto_personal: gastoPersonal,
  categorias,
  tarjetas,
  ingresos,
  ahorro,
  prestamos,
  despensa,
};

/* Los textos de la IA reemplazan a los nuestros solo donde pasaron la validación. */
export const combinarTextos = (porDefecto, deIA) => ({
  titulos: { ...porDefecto.titulos, ...(deIA?.titulos || {}) },
  puntos: deIA?.puntos?.length >= 2 ? deIA.puntos : porDefecto.puntos,
  recomendaciones: deIA?.recomendaciones?.length >= 2 ? deIA.recomendaciones : porDefecto.recomendaciones,
});

/**
 * Especificación completa (esquema.js) de un reporte.
 * @param contexto { fecha: "24 oct 2026" } para la portada.
 */
export const armarPresentacion = (reporte, metricas, textos, contexto = {}) => {
  const plantilla = PLANTILLAS_REPORTE[reporte];
  const diapositivas = plantilla.diapositivas(metricas, textos, contexto)
    .filter(Boolean)
    // Sin `undefined` en el JSON: el render y la validación esperan campos presentes o ausentes.
    .map((diapositiva) => JSON.parse(JSON.stringify(diapositiva)));
  const periodo = REPORTES[reporte].periodo ? metricas.nombrePeriodo : "";
  return {
    titulo: unir(REPORTES[reporte].nombre, periodo ? `· ${capitalizar(periodo)}` : ""),
    pie: unir("Zaldo ·", REPORTES[reporte].nombre, periodo ? `· ${periodo}` : ""),
    diapositivas,
  };
};
