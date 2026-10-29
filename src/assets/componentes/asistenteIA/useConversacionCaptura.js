import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { interpretarCaptura } from "../../funciones/ia/interpretarCaptura";
import { CATEGORIAS_CAPTURA, TIPOS_CAPTURA } from "../../funciones/ia/contratoCaptura";
import { ErrorCapturaIA, solicitarCaptura } from "../../funciones/ia/solicitarCaptura";
import { RUTAS_ASISTENTE, TEMAS_CONSULTA } from "../../funciones/ia/contratoConsulta";
import { construirPanorama } from "../../funciones/ia/panorama/construirPanorama";
import {
  ErrorRespuestaAbierta,
  solicitarRespuestaAbierta,
} from "../../funciones/ia/panorama/solicitarRespuestaAbierta";
import { responderConsulta } from "../../funciones/ia/responderConsulta";
import { guardarPreferencias } from "../../funciones/firebase/preferencias";
import { responderCharla } from "../../funciones/ia/charlaGeneral";
import {
  construirEmpresa,
  ESQUEMAS_TRABAJO,
  esquemaTrabajo,
  leerHoras,
  leerMonto,
  siguienteDatoTrabajo,
  SUGERENCIAS,
} from "../../funciones/ia/sugerencias/elegirSugerencia";
import {
  cargarSugerencia,
  descartarSugerencia,
  marcarSugerenciaOfrecida,
  posponerSugerencia,
} from "../../funciones/ia/sugerencias/cargarSugerencia";
import { guardarEmpresa, obtenerOAInicializarIngresosAnio } from "../../funciones/firebase/ingresos";
import {
  registrarMovimiento,
  registrarMovimientoEntreCuentas,
} from "../../funciones/registrarMovimientos";
import {
  obtenerCatalogoDespensa,
  registrarCompraDespensa,
  registrarSalidaDespensa,
} from "../../funciones/registrarCompraDespensa";
import { obtenerUltimaCuentaUsada, ordenarCategoriasPorUso } from "../../funciones/utils/preferenciasCaptura";
import { normalizarNombre } from "../../funciones/ia/interpretarAltas";
import { altaDeCuenta } from "../../funciones/firebase/cuentas";
import { altaDeInstitucion } from "../../funciones/firebase/instituciones";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { fechaCortaLegible, fechaLocalISO } from "../../funciones/utils/fechas";

/*
 * Conversación del asistente de captura.
 *
 * La IA solo propone (interpretarCaptura ya validó cuentas, montos y fechas).
 * Lo que falte se pregunta aquí, una cosa a la vez, con opciones que se
 * pueden tocar o escribir. Nada se guarda sin un "Guardar" explícito, y el
 * guardado pasa por registrarMovimientos, el mismo camino que los modales.
 *
 * Una compra del súper ("compré 2 leches y detergente") llega como propuesta
 * "despensa": primero se confirman los productos y luego se propone el gasto
 * en la cuenta, que el usuario puede cancelar.
 *
 * Las preguntas ("¿en qué gasté más este mes?") llegan como `consulta`: la
 * IA solo dice qué se pregunta y responderConsulta calcula la respuesta con
 * los datos reales, en el navegador. Un reporte ("hazme un reporte de…")
 * llega igual, como consulta con tema "reporte", y se responde con una
 * tarjeta para verlo o descargarlo (reportes/generarReporte.js).
 *
 * Una foto (ticket o productos) viaja reducida junto al mensaje y se trata
 * igual que un texto: la IA propone y el usuario confirma.
 *
 * Las altas ("abre una cuenta Nómina en BBVA") llegan como propuestas
 * "institucion" y "cuenta", instituciones primero. Si a una cuenta le falta
 * institución, se pregunta antes de confirmar. Se guardan con altaDeInstitucion
 * y altaDeCuenta, las mismas funciones de los modales.
 *
 * Con acceso a la IA, al abrir el chat se puede ofrecer una sugerencia del día
 * (ia/sugerencias/): registrar el trabajo, agregar cuentas o anotar lo que
 * faltó. El trabajo se pregunta aquí mismo, paso a paso, y se guarda con
 * guardarEmpresa; una cuenta nueva se le pide a la IA como cualquier alta.
 *
 * La conversación vive solo en memoria: contiene datos financieros y no se
 * guarda en localStorage.
 */

const PASOS = {
  CUENTA: "cuenta",
  ORIGEN: "origen",
  DESTINO: "destino",
  CATEGORIA: "categoria",
  INSTITUCION: "institucion",
  CONFIRMAR: "confirmar",
  /* Respuesta escrita (nombre, monto, horas): no hay opciones que tocar salvo cancelar. */
  TEXTO: "texto",
  ESQUEMA: "esquema",
  CUENTA_PAGO: "cuentaPago",
  TIPO_CUENTA: "tipoCuenta",
};

const OPCION = {
  GUARDAR: "__guardar",
  EDITAR: "__editar",
  CANCELAR: "__cancelar",
  CREAR_INSTITUCION: "__crearInstitucion",
  POSPONER: "__posponer",
  DESCARTAR: "__descartar",
  NINGUNA: "__ninguna",
};

const PALABRAS_SI = ["si", "sí", "ok", "va", "dale", "guardar", "guarda", "guardalo", "confirmar", "listo", "correcto"];
const PALABRAS_NO = ["no", "cancelar", "cancela", "olvidalo", "nada"];

const CATEGORIAS_POR_PREGUNTA = 8;

let contadorMensajes = 0;
const nuevoId = () => `m${Date.now()}-${++contadorMensajes}`;

const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[¡!¿?.,]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const mensajeBienvenida = () => ({
  id: nuevoId(),
  autor: "bot",
  /* El panel la dibuja como tarjeta (BienvenidaAsistente); el texto sigue en el historial. */
  tipo: "bienvenida",
  texto: "Hola, soy tu asistente de Zaldo. Cuéntame qué gastaste, recibiste o moviste entre cuentas, mándame la foto de un ticket, pídeme crear una cuenta o pregúntame por tus gastos, saldos, ahorros o despensa.",
});

const cuentasActivas = () => useAppStore.getState().cuentas
  .filter((cuenta) => cuenta?.id && cuenta.activo !== false);

// Siempre la versión del store: otro guardado pudo cambiar el saldo.
const cuentaVigente = (cuenta) => (cuenta
  ? useAppStore.getState().cuentas.find((actual) => actual.id === cuenta.id) || cuenta
  : null);

const etiquetaCategoria = (valor) => CATEGORIAS_CAPTURA
  .find((categoria) => categoria.value === valor)?.label || "Sin categoría";

const NOMBRE_TIPO = {
  [TIPOS_CAPTURA.GASTO]: "gasto",
  [TIPOS_CAPTURA.INGRESO]: "ingreso",
};

const institucionesActivas = () => (useAppStore.getState().instituciones || [])
  .filter((institucion) => institucion?.id && institucion.activo !== false);

/*
 * Institución de una cuenta por crear: la elegida en el chat o, si no, la que
 * se llame como dijo la IA. Se busca en el store en cada paso porque puede
 * haberse creado unos mensajes antes.
 */
const institucionDeCuenta = (propuesta) => {
  const instituciones = institucionesActivas();
  if (propuesta.institucionId) return instituciones.find((item) => item.id === propuesta.institucionId) || null;
  const buscado = normalizarNombre(propuesta.institucionNombre);
  return buscado ? instituciones.find((item) => normalizarNombre(item.nombre) === buscado) || null : null;
};

const NOMBRE_TIPO_CUENTA = Object.fromEntries(tipoDeCuentaInput.map(({ value, label }) => [value, label]));

const resumenInstitucion = (propuesta) => ({
  titulo: "Nueva institución",
  monto: "",
  tono: "transferencia",
  filas: [["Nombre", propuesta.nombre]],
  advertencias: propuesta.advertencias || [],
});

const resumenCuenta = (propuesta) => {
  const esCredito = propuesta.tipoDeCuenta === "credito";
  return {
    titulo: "Nueva cuenta",
    monto: "",
    tono: "transferencia",
    filas: [
      ["Nombre", propuesta.nombre],
      ["Tipo", NOMBRE_TIPO_CUENTA[propuesta.tipoDeCuenta]],
      ["Institución", institucionDeCuenta(propuesta)?.nombre || `${propuesta.institucionNombre} (nueva)`],
      ["Dinero disponible al momento", propuesta.esLiquida ? "Sí" : "No"],
      esCredito && propuesta.limiteDeCredito ? ["Límite", formatearMonedaSegunPreferencia(propuesta.limiteDeCredito)] : null,
      esCredito && propuesta.fechaDeCorte ? ["Día de corte", String(propuesta.fechaDeCorte)] : null,
      esCredito && propuesta.fechaLimiteDePago ? ["Día límite de pago", String(propuesta.fechaLimiteDePago)] : null,
    ].filter(Boolean),
    advertencias: [
      ...(propuesta.advertencias || []),
      "Empieza con saldo en $0; ajústalo desde Cuentas si ya tiene dinero.",
    ],
  };
};

/* Qué falta para poder confirmar. */
const PASO_POR_DATO_TRABAJO = {
  nombre: PASOS.TEXTO,
  esquema: PASOS.ESQUEMA,
  monto: PASOS.TEXTO,
  horas: PASOS.TEXTO,
  cuenta: PASOS.CUENTA_PAGO,
  confirmar: PASOS.CONFIRMAR,
};

const siguientePaso = (propuesta) => {
  if (["despensa", "salidaDespensa", "lecturaAmplia", "institucion", "sugerencia", "alcanceGastos"].includes(propuesta.accion)) return PASOS.CONFIRMAR;
  if (propuesta.accion === "trabajo") return PASO_POR_DATO_TRABAJO[siguienteDatoTrabajo(propuesta.trabajo)];
  // Ya con el tipo (y el nombre, si no es efectivo) se le pasa a la IA como un alta normal.
  if (propuesta.accion === "nuevaCuenta") return propuesta.tipo ? PASOS.TEXTO : PASOS.TIPO_CUENTA;
  if (propuesta.accion === "cuenta") {
    return institucionDeCuenta(propuesta) || propuesta.crearInstitucion ? PASOS.CONFIRMAR : PASOS.INSTITUCION;
  }

  if (propuesta.accion === "transferencia") {
    if (!propuesta.cuentaOrigen) return PASOS.ORIGEN;
    if (!propuesta.cuentaDestino) return PASOS.DESTINO;
    return PASOS.CONFIRMAR;
  }

  if (!propuesta.cuenta) return PASOS.CUENTA;
  if (!propuesta.valores.categoria && !propuesta.categoriaRespondida) return PASOS.CATEGORIA;
  return PASOS.CONFIRMAR;
};

/*
 * Valores finales para guardar: el pago a meses solo aplica a gastos con
 * crédito, y si la IA no lo dijo se usa la preferencia del usuario.
 */
const valoresFinales = (propuesta) => {
  const { valores } = propuesta;
  const cuenta = cuentaVigente(propuesta.cuenta);
  const esGastoCredito = valores.tipoDeMovimiento === TIPOS_CAPTURA.GASTO && cuenta?.tipoDeCuenta === "credito";
  const msiPorDefecto = useAppStore.getState().preferencias?.msiPorDefectoEnCredito;

  return {
    ...valores,
    pagoAMeses: esGastoCredito ? valores.pagoAMeses || (msiPorDefecto ? "msi" : "revolvente") : null,
  };
};

/*
 * Las advertencias sobre algo que se va a preguntar (cuenta, categoría) sobran
 * en el resumen: para entonces el usuario ya lo eligió.
 */
const advertenciasVigentes = (propuesta) => (propuesta.advertencias || [])
  .filter((texto) => !(propuesta.cuentaPreguntada && /cuenta|origen|destino/i.test(texto)))
  .filter((texto) => !(propuesta.categoriaRespondida && /categor/i.test(texto)));

const describirProducto = ({ cantidad, unidad, producto, presentacion }) => {
  const medida = unidad === "pz" ? `${cantidad} ×` : `${cantidad} ${unidad}`;
  return `${medida} ${producto}${presentacion ? ` (${presentacion})` : ""}`;
};

/* Lo que se va a crear se distingue de lo que entra a productos que ya tienes. */
const ETIQUETA_ESTADO_PRODUCTO = {
  nuevo: " · nuevo",
  presentacion_nueva: " · presentación nueva",
};

const cantidadLegible = (numero) => String(Math.round(Number(numero) * 100) / 100);

const resumenSalidaDespensa = (propuesta) => ({
  titulo: `Salida de despensa · ${propuesta.items.length} producto${propuesta.items.length === 1 ? "" : "s"}`,
  monto: "",
  tono: "despensa",
  filas: [
    ...propuesta.items.map((item) => [
      `−${cantidadLegible(item.cantidad)} ${item.producto} (${item.presentacion})`,
      `quedan ${cantidadLegible(item.stockAntes - item.cantidad)}`,
    ]),
    ["Motivo", propuesta.motivo],
  ],
  advertencias: propuesta.advertencias || [],
});

const resumenDespensa = (propuesta) => ({
  titulo: `Despensa · ${propuesta.items.length} producto${propuesta.items.length === 1 ? "" : "s"}`,
  monto: propuesta.totalTicket ? formatearMonedaSegunPreferencia(propuesta.totalTicket) : "",
  tono: "despensa",
  filas: [
    ...propuesta.items.map((item) => [
      `${describirProducto(item)}${ETIQUETA_ESTADO_PRODUCTO[item.estado] || ""}`,
      item.costoTotal ? formatearMonedaSegunPreferencia(item.costoTotal) : "",
    ]),
    propuesta.tienda ? ["Tienda", propuesta.tienda] : null,
    ["Fecha", propuesta.fecha === fechaLocalISO() ? "Hoy" : fechaCortaLegible(propuesta.fecha)],
  ].filter(Boolean),
  advertencias: propuesta.advertencias || [],
});

/*
 * Gasto que acompaña a una compra de despensa. Ya va con su categoría, así
 * que solo se pregunta la cuenta si la IA no la identificó.
 */
const gastoDeDespensa = (compra) => ({
  accion: "movimiento",
  cuenta: compra.cuenta,
  valores: {
    tipoDeMovimiento: TIPOS_CAPTURA.GASTO,
    monto: String(compra.totalTicket),
    categoria: "despensa",
    nota: compra.tienda ? `Súper ${compra.tienda}` : "Compra de despensa",
    fechaMovimiento: compra.fecha,
    esPersonal: false,
    esExtraordinario: false,
  },
  advertencias: [],
  categoriaRespondida: true,
});

const resumenTrabajo = ({ trabajo }) => {
  const esquema = esquemaTrabajo(trabajo.tipoEsquema);
  const cuenta = cuentasActivas().find((actual) => actual.id === trabajo.cuentaId);
  return {
    titulo: "Nuevo trabajo",
    monto: esquema.campoMonto ? `${formatearMonedaSegunPreferencia(trabajo[esquema.campoMonto])} ${esquema.unidad}` : "",
    tono: "ingreso",
    filas: [
      ["Nombre", trabajo.nombre],
      ["Forma de pago", esquema.etiqueta],
      trabajo.horasSemanales ? ["Horas por semana", String(trabajo.horasSemanales)] : null,
      ["Te depositan en", cuenta?.nombre || "Ninguna en especial"],
    ].filter(Boolean),
    advertencias: ["Bonos, RESICO y el color los puedes ajustar después en Ingresos."],
  };
};

const construirResumen = (propuesta) => {
  if (propuesta.accion === "trabajo") return resumenTrabajo(propuesta);
  if (propuesta.accion === "despensa") return resumenDespensa(propuesta);
  if (propuesta.accion === "salidaDespensa") return resumenSalidaDespensa(propuesta);
  if (propuesta.accion === "institucion") return resumenInstitucion(propuesta);
  if (propuesta.accion === "cuenta") return resumenCuenta(propuesta);

  if (propuesta.accion === "transferencia") {
    const destino = cuentaVigente(propuesta.cuentaDestino);
    return {
      titulo: destino?.tipoDeCuenta === "credito" ? "Pago de tarjeta" : "Transferencia",
      monto: formatearMonedaSegunPreferencia(propuesta.monto),
      tono: "transferencia",
      filas: [
        ["De", cuentaVigente(propuesta.cuentaOrigen)?.nombre],
        ["A", destino?.nombre],
        ["Fecha", "Hoy"],
        propuesta.nota ? ["Nota", propuesta.nota] : null,
      ].filter(Boolean),
      advertencias: advertenciasVigentes(propuesta),
    };
  }

  const valores = valoresFinales(propuesta);
  const esGasto = valores.tipoDeMovimiento === TIPOS_CAPTURA.GASTO;
  const fecha = valores.fechaMovimiento === fechaLocalISO() ? "Hoy" : fechaCortaLegible(valores.fechaMovimiento);
  const etiquetas = [
    valores.pagoAMeses === "msi" ? "A meses sin intereses" : null,
    valores.esPersonal ? "Personal" : null,
    valores.esExtraordinario ? "Extraordinario" : null,
  ].filter(Boolean);

  return {
    titulo: esGasto ? "Gasto" : "Ingreso",
    monto: `${esGasto ? "-" : "+"}${formatearMonedaSegunPreferencia(valores.monto)}`,
    tono: esGasto ? "gasto" : "ingreso",
    filas: [
      ["Cuenta", cuentaVigente(propuesta.cuenta)?.nombre],
      ["Categoría", etiquetaCategoria(valores.categoria)],
      ["Fecha", fecha],
      valores.nota ? ["Nota", valores.nota] : null,
      etiquetas.length ? ["Detalle", etiquetas.join(" · ")] : null,
    ].filter(Boolean),
    advertencias: advertenciasVigentes(propuesta),
  };
};

const preferencias = () => useAppStore.getState().preferencias || {};

/* La última cuenta usada va primero: casi siempre es la que sigue. */
const opcionesCuentas = (excluirId) => [
  ...cuentasActivas()
    .filter((cuenta) => cuenta.id !== excluirId)
    .sort((a, b) => Number(b.id === obtenerUltimaCuentaUsada()) - Number(a.id === obtenerUltimaCuentaUsada()))
    .map((cuenta) => ({ valor: cuenta.id, etiqueta: cuenta.nombre })),
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

const categoriasPara = (propuesta) => CATEGORIAS_CAPTURA.filter((categoria) => (
  propuesta.valores.tipoDeMovimiento === TIPOS_CAPTURA.INGRESO || categoria.value !== "ingreso"
));

const opcionesCategorias = (propuesta) => [
  ...(preferencias().ordenarCategoriasPorUso === false
    ? categoriasPara(propuesta)
    : ordenarCategoriasPorUso(categoriasPara(propuesta)))
    .slice(0, CATEGORIAS_POR_PREGUNTA)
    .map((categoria) => ({ valor: categoria.value, etiqueta: categoria.label })),
  { valor: "", etiqueta: "Sin categoría", tono: "neutro" },
];

const OPCIONES_CONFIRMAR = [
  { valor: OPCION.GUARDAR, etiqueta: "Guardar", tono: "principal" },
  { valor: OPCION.EDITAR, etiqueta: "Editar en formulario", tono: "editar" },
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

/*
 * Lo que el usuario configuró en /perfil, igual que en el formulario de alta
 * (agregaMovimiento.jsx): gasto personal por defecto, categoría por defecto y
 * abrir en la última cuenta. Lo que la IA entendió explícitamente manda.
 */
const aplicarPreferencias = (propuesta) => {
  if (propuesta.accion !== "movimiento") return;
  const prefs = preferencias();
  const { valores } = propuesta;
  const esGasto = valores.tipoDeMovimiento === TIPOS_CAPTURA.GASTO;

  if (esGasto && !propuesta.personalIndicado && prefs.gastoPersonalPorDefecto) valores.esPersonal = true;

  if (esGasto && !valores.categoria && !propuesta.categoriaRespondida
    && CATEGORIAS_CAPTURA.some((categoria) => categoria.value === prefs.categoriaPorDefecto)) {
    valores.categoria = prefs.categoriaPorDefecto;
  }

  if (!propuesta.cuenta && prefs.recordarUltimaCuenta) {
    const ultima = cuentasActivas().find((cuenta) => cuenta.id === obtenerUltimaCuentaUsada());
    if (ultima) {
      propuesta.cuenta = ultima;
      propuesta.advertencias = [
        ...(propuesta.advertencias || []).filter((texto) => !/cuenta/i.test(texto)),
        `Usé tu última cuenta (${ultima.nombre}), como indica tu perfil.`,
      ];
    }
  }
};

/*
 * Lectura amplia: cuando la lista fija de temas no alcanzó, se ofrece revisar
 * todos los módulos (panorama/construirPanorama.js). Si el siguiente mensaje
 * tampoco se pudo contestar, se revisa sin preguntar.
 */
const OPCIONES_LECTURA_AMPLIA = [
  { valor: OPCION.GUARDAR, etiqueta: "Revisa todos mis datos", tono: "principal" },
  { valor: OPCION.CANCELAR, etiqueta: "No, así está bien", tono: "cancelar" },
];

const CONFIANZA = { alta: "Alta", media: "Media", baja: "Baja" };

const resumenRespuestaAmplia = (resultado) => ({
  titulo: "Revisé todos tus datos",
  monto: "",
  tono: "transferencia",
  filas: [["Qué tan seguro estoy", CONFIANZA[resultado.confianza]]],
  puntos: resultado.hallazgos,
  advertencias: [
    ...resultado.faltantes,
    resultado.cifrasCalculadas ? "La respuesta incluye cálculos hechos a partir de tus cifras; revísalos." : "",
  ].filter(Boolean),
});

const OPCIONES_CONFIRMAR_ALTA = [
  { valor: OPCION.GUARDAR, etiqueta: "Crear", tono: "principal" },
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

/* Instituciones para una cuenta nueva; si la IA nombró una que no existe, se ofrece crearla. */
const opcionesInstituciones = (propuesta) => [
  ...(propuesta.institucionNombre && !institucionDeCuenta(propuesta)
    ? [{ valor: OPCION.CREAR_INSTITUCION, etiqueta: `Crear ${propuesta.institucionNombre}`, tono: "principal" }]
    : []),
  ...institucionesActivas().map((institucion) => ({ valor: institucion.id, etiqueta: institucion.nombre })),
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

const OPCIONES_CONFIRMAR_SALIDA = [
  { valor: OPCION.GUARDAR, etiqueta: "Descontar de la despensa", tono: "principal" },
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

const OPCIONES_CONFIRMAR_DESPENSA = [
  { valor: OPCION.GUARDAR, etiqueta: "Agregar a la despensa", tono: "principal" },
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

/* ── Sugerencias del día ── */

/* "Mis gastos": solo lo personal o todo. El valor es el de `alcanceGastosAsistente`. */
const OPCIONES_ALCANCE_GASTOS = [
  { valor: "personal", etiqueta: "Solo personales", tono: "principal" },
  { valor: "todos", etiqueta: "Todos mis gastos", tono: "neutro" },
];

const OPCIONES_SUGERENCIA = [
  { valor: OPCION.GUARDAR, etiqueta: "Sí, hagámoslo", tono: "principal" },
  { valor: OPCION.POSPONER, etiqueta: "Después", tono: "neutro" },
  { valor: OPCION.DESCARTAR, etiqueta: "No me interesa", tono: "cancelar" },
];

const OPCIONES_SUGERENCIA_REGISTRO = [
  { valor: OPCION.GUARDAR, etiqueta: "Sí, te cuento", tono: "principal" },
  { valor: OPCION.POSPONER, etiqueta: "No gasté nada", tono: "neutro" },
  { valor: OPCION.DESCARTAR, etiqueta: "No me lo preguntes", tono: "cancelar" },
];

const OPCION_CANCELAR = { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" };

const OPCIONES_ESQUEMA = [
  ...ESQUEMAS_TRABAJO.map(({ valor, etiqueta }) => ({ valor, etiqueta })),
  OPCION_CANCELAR,
];

const OPCIONES_CONFIRMAR_TRABAJO = [
  { valor: OPCION.GUARDAR, etiqueta: "Guardar", tono: "principal" },
  OPCION_CANCELAR,
];

const TIPOS_CUENTA_NUEVA = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "debito", etiqueta: "Tarjeta de débito" },
  { valor: "credito", etiqueta: "Tarjeta de crédito" },
];

const OPCIONES_TIPO_CUENTA = [...TIPOS_CUENTA_NUEVA, OPCION_CANCELAR];

const PREGUNTA_TEXTO_TRABAJO = {
  nombre: () => "¿Cómo se llama la empresa o el trabajo?",
  monto: (trabajo) => `${esquemaTrabajo(trabajo.tipoEsquema).preguntaMonto} Escribe solo la cantidad, por ejemplo 4500.`,
  horas: () => "¿Cuántas horas trabajas a la semana, más o menos?",
};

const textoPregunta = (propuesta) => (propuesta.accion === "trabajo"
  ? PREGUNTA_TEXTO_TRABAJO[siguienteDatoTrabajo(propuesta.trabajo)](propuesta.trabajo)
  : "¿Cómo se llama y de qué banco es? Por ejemplo “Nómina BBVA” o “Oro Banamex”.");

/*
 * Guarda lo que se escribió en el paso de texto. Devuelve un aviso si no
 * sirve (un monto que no es número), o null si se aceptó.
 */
const aplicarTexto = (propuesta, texto) => {
  if (propuesta.accion === "nuevaCuenta") {
    propuesta.detalle = texto.slice(0, 80);
    return null;
  }

  const { trabajo } = propuesta;
  const dato = siguienteDatoTrabajo(trabajo);
  if (dato === "nombre") {
    if (texto.length < 2) return "Escribe el nombre de la empresa o el trabajo.";
    trabajo.nombre = texto.slice(0, 60);
    return null;
  }
  if (dato === "monto") {
    const monto = leerMonto(texto);
    if (!monto) return "No entendí la cantidad. Escribe solo el número, por ejemplo 4500.";
    trabajo[esquemaTrabajo(trabajo.tipoEsquema).campoMonto] = monto;
    return null;
  }
  const horas = leerHoras(texto);
  if (!horas) return "Escribe las horas como número, por ejemplo 40.";
  trabajo.horasSemanales = horas;
  return null;
};

/* Lo que se le pide a la IA para dar de alta la cuenta; ella propone y el usuario confirma. */
const mensajeAltaCuenta = ({ tipo, detalle }) => (tipo === "efectivo"
  ? "Crea una cuenta de efectivo llamada Efectivo"
  : `Crea una cuenta de ${tipo === "credito" ? "crédito" : "débito"}: ${detalle}`);

/*
 * Busca lo que el usuario escribió entre las opciones de la pregunta. Para
 * categorías se buscan todas, no solo las que se mostraron como botón.
 */
const buscarOpcionEscrita = (texto, pregunta, propuesta) => {
  const buscado = normalizar(texto);
  if (!buscado) return null;

  if (PALABRAS_NO.includes(buscado)) return { valor: OPCION.CANCELAR, etiqueta: texto };

  if (pregunta.paso === PASOS.CONFIRMAR && propuesta.accion !== "alcanceGastos") {
    if (PALABRAS_SI.includes(buscado)) return { valor: OPCION.GUARDAR, etiqueta: texto };
    if (buscado.startsWith("editar") && ["movimiento", "transferencia"].includes(propuesta.accion)) {
      return { valor: OPCION.EDITAR, etiqueta: texto };
    }
    return null;
  }

  const candidatas = pregunta.paso === PASOS.CATEGORIA
    ? [
      ...categoriasPara(propuesta).map((categoria) => ({ valor: categoria.value, etiqueta: categoria.label })),
      { valor: "", etiqueta: "Sin categoría" },
    ]
    : pregunta.opciones.filter((opcion) => !opcion.valor.startsWith("__"));

  const exactas = candidatas.filter((opcion) => normalizar(opcion.etiqueta) === buscado);
  if (exactas.length === 1) return exactas[0];

  // "la bbva" → "BBVA Oro": se acepta solo si hay una única coincidencia.
  const parciales = candidatas.filter((opcion) => {
    const etiqueta = normalizar(opcion.etiqueta);
    return etiqueta && (etiqueta.includes(buscado) || buscado.includes(etiqueta));
  });
  return parciales.length === 1 ? parciales[0] : null;
};

export const useConversacionCaptura = () => {
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState(() => [mensajeBienvenida()]);
  const [pensando, setPensando] = useState(false);
  const [estadoAvatar, setEstadoAvatar] = useState("reposo");
  /* Pregunta activa: { paso, mensajeId, opciones }. Solo esa acepta respuesta. */
  const [pregunta, setPregunta] = useState(null);

  const colaRef = useRef([]);
  const actualRef = useRef(null);
  const temporizadorFelizRef = useRef(null);
  // Última pregunta respondida ({ mensaje, consulta }): da contexto a "no, mejor…".
  const consultaAnteriorRef = useRef(null);
  // Pregunta que no se pudo contestar con la lista fija ({ pregunta }); habilita la lectura amplia.
  const fallaRef = useRef(null);
  // consultarIA se declara más abajo; el alta de cuenta guiada la necesita antes.
  const consultarIARef = useRef(null);
  // La sugerencia del día se busca una vez por sesión.
  const sugerenciaRevisadaRef = useRef(false);

  const agregar = useCallback((mensaje) => {
    const completo = { id: nuevoId(), ...mensaje };
    setMensajes((previos) => [...previos, completo]);
    return completo.id;
  }, []);

  const decirBot = useCallback((texto, extra = {}) => agregar({ autor: "bot", texto, ...extra }), [agregar]);

  const celebrar = useCallback(() => {
    clearTimeout(temporizadorFelizRef.current);
    setEstadoAvatar("feliz");
    temporizadorFelizRef.current = setTimeout(() => setEstadoAvatar("reposo"), 2500);
  }, []);

  const preguntar = useCallback((propuesta) => {
    const paso = siguientePaso(propuesta);
    let texto;
    let opciones;
    let resumen;

    switch (paso) {
      case PASOS.CUENTA:
        propuesta.cuentaPreguntada = true;
        texto = `¿Con qué cuenta fue este ${NOMBRE_TIPO[propuesta.valores.tipoDeMovimiento]} de ${formatearMonedaSegunPreferencia(propuesta.valores.monto)}?`;
        opciones = opcionesCuentas();
        break;
      case PASOS.ORIGEN:
        propuesta.cuentaPreguntada = true;
        texto = `¿De qué cuenta salen los ${formatearMonedaSegunPreferencia(propuesta.monto)}?`;
        opciones = opcionesCuentas(propuesta.cuentaDestino?.id);
        break;
      case PASOS.DESTINO:
        propuesta.cuentaPreguntada = true;
        texto = `¿A qué cuenta van los ${formatearMonedaSegunPreferencia(propuesta.monto)}?`;
        opciones = opcionesCuentas(propuesta.cuentaOrigen?.id);
        break;
      case PASOS.INSTITUCION:
        texto = `¿En qué institución va la cuenta “${propuesta.nombre}”?`;
        opciones = opcionesInstituciones(propuesta);
        break;
      case PASOS.CATEGORIA:
        texto = `¿En qué categoría lo pongo?${propuesta.valores.nota ? ` (${propuesta.valores.nota})` : ""}`;
        opciones = opcionesCategorias(propuesta);
        break;
      case PASOS.TEXTO:
        texto = textoPregunta(propuesta);
        opciones = [OPCION_CANCELAR];
        break;
      case PASOS.ESQUEMA:
        texto = `¿Cómo te pagan en ${propuesta.trabajo.nombre}?`;
        opciones = OPCIONES_ESQUEMA;
        break;
      case PASOS.CUENTA_PAGO: {
        texto = "¿A qué cuenta te depositan?";
        const cuentas = opcionesCuentas();
        opciones = [
          ...cuentas.slice(0, -1),
          { valor: OPCION.NINGUNA, etiqueta: "Ninguna en especial", tono: "neutro" },
          cuentas[cuentas.length - 1],
        ];
        break;
      }
      case PASOS.TIPO_CUENTA:
        texto = "¿Qué cuenta agregamos?";
        opciones = OPCIONES_TIPO_CUENTA;
        break;
      default:
        texto = {
          despensa: "¿Agrego esto a tu despensa?",
          salidaDespensa: "¿Lo descuento de tu despensa?",
          lecturaAmplia: propuesta.motivo,
          institucion: "¿Creo esta institución?",
          cuenta: "¿Creo esta cuenta?",
          sugerencia: propuesta.texto,
          alcanceGastos: "Cuando me preguntas por tus gastos, ¿cuento solo los que marcaste como personales o todos? Lo recuerdo para la próxima.",
          trabajo: "¿Lo guardo así?",
        }[propuesta.accion] || (propuesta.esGastoDeDespensa ? "¿Registro también el gasto en tu cuenta?" : "¿Lo guardo así?");
        opciones = {
          despensa: OPCIONES_CONFIRMAR_DESPENSA,
          salidaDespensa: OPCIONES_CONFIRMAR_SALIDA,
          lecturaAmplia: OPCIONES_LECTURA_AMPLIA,
          institucion: OPCIONES_CONFIRMAR_ALTA,
          cuenta: OPCIONES_CONFIRMAR_ALTA,
          sugerencia: propuesta.clave === SUGERENCIAS.REGISTRO ? OPCIONES_SUGERENCIA_REGISTRO : OPCIONES_SUGERENCIA,
          alcanceGastos: OPCIONES_ALCANCE_GASTOS,
          trabajo: OPCIONES_CONFIRMAR_TRABAJO,
        }[propuesta.accion] || OPCIONES_CONFIRMAR;
        resumen = ["sugerencia", "alcanceGastos"].includes(propuesta.accion) ? undefined : construirResumen(propuesta);
    }

    const mensajeId = decirBot(texto, { opciones, resumen });
    setPregunta({ paso, mensajeId, opciones });
  }, [decirBot]);

  /* Pasa a la siguiente propuesta de la cola, o termina. */
  const continuar = useCallback(() => {
    if (!actualRef.current) actualRef.current = colaRef.current.shift() || null;

    if (actualRef.current) {
      preguntar(actualRef.current);
      return;
    }

    setPregunta(null);
  }, [preguntar]);

  const terminarActual = useCallback(() => {
    actualRef.current = null;
    continuar();
  }, [continuar]);

  /* Lee todos los módulos y deja que la IA conteste con conclusiones (POST /respuesta). */
  const revisarTodo = useCallback(async (preguntaCompleta) => {
    const uid = useAppStore.getState().usuario?.uid;
    fallaRef.current = null;
    setPensando(true);
    setEstadoAvatar("pensando");
    decirBot("Reviso todos tus datos de los últimos 12 meses. Dame unos segundos.");

    try {
      const panorama = await construirPanorama({ uid, pregunta: preguntaCompleta, hoyISO: fechaLocalISO() });
      const resultado = await solicitarRespuestaAbierta({ pregunta: preguntaCompleta, panorama });
      setEstadoAvatar("reposo");
      decirBot(resultado.respuesta, { resumen: resumenRespuestaAmplia(resultado) });
    } catch (error) {
      setEstadoAvatar("reposo");
      if (!(error instanceof ErrorRespuestaAbierta)) console.error("Error al revisar todos los datos", error);
      decirBot(error instanceof ErrorRespuestaAbierta ? error.message : "No pude revisar todos tus datos. Intenta de nuevo.");
    } finally {
      setPensando(false);
    }
  }, [decirBot]);

  const guardar = useCallback(async (propuesta) => {
    const uid = useAppStore.getState().usuario?.uid;
    setPregunta(null);

    if (propuesta.accion === "lecturaAmplia") {
      await revisarTodo(propuesta.pregunta);
      terminarActual();
      return;
    }

    setPensando(true);
    setEstadoAvatar("pensando");

    try {
      if (propuesta.accion === "despensa") {
        const resultado = await registrarCompraDespensa({ uid, compra: propuesta });
        celebrar();
        const cuantos = resultado.totalImportados ?? propuesta.items.length;
        decirBot(`Agregué ${cuantos} producto${cuantos === 1 ? "" : "s"} a tu despensa.`, { estado: "exito" });

        if (propuesta.totalTicket > 0) {
          // Va al frente de la cola: es parte de la misma compra.
          const gasto = { ...gastoDeDespensa(propuesta), esGastoDeDespensa: true };
          aplicarPreferencias(gasto);
          colaRef.current.unshift(gasto);
        } else {
          decirBot("No me dijiste cuánto pagaste, así que no registré el gasto. Si quieres, dime algo como “pagué 380 del súper con la BBVA”.");
        }
      } else if (propuesta.accion === "trabajo") {
        // Mismo camino que ModalEmpresa: el año en curso, creado si todavía no existe.
        const year = new Date().getFullYear();
        const ingresos = await obtenerOAInicializarIngresosAnio(uid, year);
        const empresa = construirEmpresa(propuesta.trabajo);
        await guardarEmpresa(uid, year, ingresos, empresa);
        celebrar();
        decirBot(`Listo. Registré ${empresa.nombre} en Ingresos.${empresa.recordatorioRecurrenteActivo
          ? " Cada sábado te recordaré registrar tus horas."
          : ""}`, { estado: "exito" });
      } else if (propuesta.accion === "institucion") {
        const nueva = await altaDeInstitucion({ nombreInstitucion: propuesta.nombre }, uid);
        if (!nueva) throw new Error("No se creó la institución");
        useAppStore.getState().setInstituciones((previas) => [...previas, nueva]);
        celebrar();
        decirBot(`Listo. Creé la institución ${nueva.nombre}.`, { estado: "exito" });
      } else if (propuesta.accion === "cuenta") {
        // Si se eligió "Crear …" en la pregunta de institución, va primero.
        let institucion = institucionDeCuenta(propuesta);
        if (!institucion && propuesta.crearInstitucion) {
          institucion = await altaDeInstitucion({ nombreInstitucion: propuesta.institucionNombre }, uid);
          if (!institucion) throw new Error("No se creó la institución");
          useAppStore.getState().setInstituciones((previas) => [...previas, institucion]);
        }
        const nueva = await altaDeCuenta({
          nombreCuenta: propuesta.nombre,
          tipoDeCuenta: propuesta.tipoDeCuenta,
          institucionAsociada: institucion.id,
          esLiquida: propuesta.esLiquida,
          fechaDeCorte: propuesta.fechaDeCorte ?? "",
          fechaLimiteDePago: propuesta.fechaLimiteDePago ?? "",
          limiteDeCredito: propuesta.limiteDeCredito ?? "",
        }, uid);
        if (!nueva) throw new Error("No se creó la cuenta");
        useAppStore.getState().setCuentas((previas) => [...previas, nueva]);
        celebrar();
        decirBot(`Listo. Creé la cuenta ${nueva.nombre} en ${institucion.nombre}. Ya puedes registrar movimientos en ella.`, { estado: "exito" });
      } else if (propuesta.accion === "salidaDespensa") {
        await registrarSalidaDespensa({ uid, salida: propuesta });
        celebrar();
        const cuantos = propuesta.items.length;
        decirBot(`Desconté ${cuantos} producto${cuantos === 1 ? "" : "s"} de tu despensa.`, { estado: "exito" });
      } else if (propuesta.accion === "transferencia") {
        const resultado = await registrarMovimientoEntreCuentas({
          cuentaOrigen: cuentaVigente(propuesta.cuentaOrigen),
          cuentaDestino: cuentaVigente(propuesta.cuentaDestino),
          monto: propuesta.monto,
          nota: propuesta.nota,
          uid,
        });

        if (resultado) {
          celebrar();
          decirBot(`Listo. Moví ${formatearMonedaSegunPreferencia(propuesta.monto)} de ${resultado.cuentaOrigen.nombre} a ${resultado.cuentaDestino.nombre}.`, { estado: "exito" });
        } else {
          setEstadoAvatar("reposo");
          decirBot("No pude guardar la transferencia. Inténtalo de nuevo en un momento.");
        }
      } else {
        const resultado = await registrarMovimiento({
          valores: valoresFinales(propuesta),
          cuenta: cuentaVigente(propuesta.cuenta),
          uid,
        });

        if (resultado) {
          celebrar();
          const tipo = NOMBRE_TIPO[propuesta.valores.tipoDeMovimiento];
          decirBot(`Listo. Guardé el ${tipo} de ${formatearMonedaSegunPreferencia(propuesta.valores.monto)}. Saldo de ${resultado.cuenta.nombre}: ${formatearMonedaSegunPreferencia(resultado.cuenta.saldoALaFecha)}.`, { estado: "exito" });
        } else {
          setEstadoAvatar("reposo");
          decirBot("No pude guardar el movimiento. Inténtalo de nuevo en un momento.");
        }
      }
    } catch (error) {
      console.error("Error al guardar desde el asistente", error);
      setEstadoAvatar("reposo");
      decirBot("Algo falló al guardar. Inténtalo de nuevo.");
    } finally {
      setPensando(false);
    }

    terminarActual();
  }, [celebrar, decirBot, revisarTodo, terminarActual]);

  const editarEnFormulario = useCallback((propuesta) => {
    const modales = useModalStore.getState();

    if (propuesta.accion === "transferencia") {
      modales.abrirMovimientoEntreCuentas({
        cuentaOrigen: cuentaVigente(propuesta.cuentaOrigen),
        cuentaDestino: cuentaVigente(propuesta.cuentaDestino),
        valores: { monto: propuesta.monto, nota: propuesta.nota },
      });
    } else {
      modales.abrirAgregarMovimiento({
        cuenta: cuentaVigente(propuesta.cuenta),
        valores: valoresFinales(propuesta),
      });
    }

    decirBot("Te abrí el formulario con los datos. Ajusta lo que necesites y guárdalo desde ahí.");
    terminarActual();
  }, [decirBot, terminarActual]);

  /* La cuenta nueva la propone la IA como cualquier alta; aquí solo se arma el pedido. */
  const pedirAltaCuenta = useCallback((propuesta) => {
    setPregunta(null);
    actualRef.current = null;
    consultarIARef.current?.(mensajeAltaCuenta(propuesta));
  }, []);

  /* Sí, Después o No me interesa sobre la sugerencia del día. */
  const responderSugerencia = useCallback((propuesta, opcion) => {
    setPregunta(null);
    actualRef.current = null;

    if (opcion.valor === OPCION.DESCARTAR) {
      descartarSugerencia(propuesta.clave);
      decirBot("Va, no te lo vuelvo a sugerir. Puedes apagar todas las sugerencias en Perfil → Preferencias.");
      continuar();
      return;
    }

    if (opcion.valor !== OPCION.GUARDAR) {
      posponerSugerencia(propuesta.clave);
      decirBot(propuesta.clave === SUGERENCIAS.REGISTRO
        ? "¡Bien! Te vuelvo a preguntar en unos días."
        : "Sin problema, te lo recuerdo en unos días.");
      continuar();
      return;
    }

    if (propuesta.clave === SUGERENCIAS.REGISTRO) {
      decirBot("Cuéntame qué fue, por ejemplo “ayer gasté 120 en comida con efectivo”. Puedes poner varios en un mismo mensaje o mandarme la foto del ticket.");
      continuar();
      return;
    }

    actualRef.current = propuesta.clave === SUGERENCIAS.TRABAJO
      ? { accion: "trabajo", trabajo: {} }
      : { accion: "nuevaCuenta" };
    preguntar(actualRef.current);
  }, [continuar, decirBot, preguntar]);

  /*
   * Solo personales o todos: se guarda en Preferencias (sigue a cualquier
   * dispositivo) y la pregunta pendiente se contesta con esa elección.
   */
  const responderAlcance = useCallback(async (propuesta, opcion) => {
    setPregunta(null);
    actualRef.current = null;
    const { usuario, setPreferencias } = useAppStore.getState();
    setPreferencias({ alcanceGastosAsistente: opcion.valor });
    guardarPreferencias(usuario?.uid, { alcanceGastosAsistente: opcion.valor })
      .catch((error) => console.error("No se guardó el alcance de gastos", error));
    decirBot("Listo, lo recuerdo. Puedes cambiarlo en Perfil → Preferencias.");

    setPensando(true);
    setEstadoAvatar("pensando");
    try {
      const respuesta = await responderConsulta({ ...propuesta.consulta, marca: opcion.valor }, { uid: usuario?.uid });
      decirBot(respuesta.texto, { resumen: respuesta.resumen, reporte: respuesta.reporte });
    } catch (error) {
      console.error("Error del asistente", error);
      decirBot("Algo falló. Inténtalo de nuevo.");
    } finally {
      setPensando(false);
      setEstadoAvatar("reposo");
    }
    continuar();
  }, [continuar, decirBot]);

  const aplicarRespuesta = useCallback((opcion) => {
    const propuesta = actualRef.current;
    if (!propuesta || !pregunta) return;

    agregar({ autor: "usuario", texto: opcion.etiqueta });

    if (propuesta.accion === "sugerencia") {
      responderSugerencia(propuesta, opcion);
      return;
    }

    if (propuesta.accion === "alcanceGastos" && opcion.valor !== OPCION.CANCELAR) {
      responderAlcance(propuesta, opcion);
      return;
    }

    if (opcion.valor === OPCION.CANCELAR) {
      setPregunta(null);
      if (propuesta.accion === "lecturaAmplia") fallaRef.current = null;
      decirBot({
        lecturaAmplia: "Va. Si quieres, pregúntamelo de otra forma.",
        alcanceGastos: "Va. Te lo vuelvo a preguntar la próxima vez.",
      }[propuesta.accion] || "Va, no guardé nada de eso.");
      terminarActual();
      return;
    }

    if (opcion.valor === OPCION.GUARDAR) {
      guardar(propuesta);
      return;
    }

    if (opcion.valor === OPCION.EDITAR) {
      setPregunta(null);
      editarEnFormulario(propuesta);
      return;
    }

    const cuenta = cuentasActivas().find((actual) => actual.id === opcion.valor);
    switch (pregunta.paso) {
      case PASOS.CUENTA:
        propuesta.cuenta = cuenta;
        break;
      case PASOS.ORIGEN:
        propuesta.cuentaOrigen = cuenta;
        break;
      case PASOS.DESTINO:
        propuesta.cuentaDestino = cuenta;
        break;
      case PASOS.INSTITUCION:
        if (opcion.valor === OPCION.CREAR_INSTITUCION) propuesta.crearInstitucion = true;
        else propuesta.institucionId = opcion.valor;
        break;
      case PASOS.CATEGORIA:
        propuesta.valores = { ...propuesta.valores, categoria: opcion.valor };
        propuesta.categoriaRespondida = true;
        break;
      case PASOS.ESQUEMA:
        propuesta.trabajo.tipoEsquema = opcion.valor;
        break;
      case PASOS.CUENTA_PAGO:
        propuesta.trabajo.cuentaId = opcion.valor === OPCION.NINGUNA ? "" : opcion.valor;
        propuesta.trabajo.cuentaRespondida = true;
        break;
      case PASOS.TIPO_CUENTA:
        propuesta.tipo = opcion.valor;
        // El efectivo no tiene banco ni nombre que preguntar.
        if (opcion.valor === "efectivo") {
          pedirAltaCuenta(propuesta);
          return;
        }
        break;
      default:
        break;
    }

    preguntar(propuesta);
  }, [agregar, decirBot, editarEnFormulario, guardar, pedirAltaCuenta, pregunta, preguntar, responderAlcance, responderSugerencia, terminarActual]);

  const consultarIA = useCallback(async (texto, imagen = null) => {
    setPensando(true);
    setEstadoAvatar("pensando");

    try {
      const cuentas = cuentasActivas();
      const uid = useAppStore.getState().usuario?.uid;
      // Sin catálogo igual se puede capturar; solo habría más riesgo de duplicar productos.
      const catalogoDespensa = uid ? await obtenerCatalogoDespensa(uid).catch(() => null) : null;
      const instituciones = institucionesActivas();
      const respuesta = await solicitarCaptura({
        mensaje: texto,
        cuentas,
        instituciones,
        catalogoDespensa,
        imagen,
        anterior: consultaAnteriorRef.current,
      });
      const {
        propuestas,
        descartadas,
        despensa,
        salidaDespensa,
        altas,
        consulta,
        respuesta: textoLibre,
        irA,
      } = interpretarCaptura(respuesta, { cuentas, instituciones, catalogoDespensa });
      // Las altas van primero: un gasto del mismo mensaje puede necesitar la cuenta nueva.
      propuestas.unshift(...altas);
      if (despensa) propuestas.unshift({ accion: "despensa", ...despensa });
      if (salidaDespensa?.items.length) propuestas.unshift({ accion: "salidaDespensa", ...salidaDespensa });
      // Una salida que no encontró nada que descontar igual explica por qué.
      if (salidaDespensa && !salidaDespensa.items.length) {
        salidaDespensa.advertencias.forEach((motivo) => descartadas.push({ indice: -1, motivo }));
      }

      // Una pregunta se responde con los datos reales; nunca con cifras de la IA.
      const esAbierta = consulta?.tema === TEMAS_CONSULTA.ABIERTA && propuestas.length === 0;
      const respuestaConsulta = consulta && !esAbierta && propuestas.length === 0
        ? await responderConsulta(consulta, { uid })
        : null;
      // Solo una pregunta sirve de contexto a la siguiente; registrar algo lo limpia.
      consultaAnteriorRef.current = respuestaConsulta
        ? { mensaje: texto, consulta: { ...consulta, cuentaId: consulta.cuenta?.id || null } }
        : null;

      // Los ingresos sin categoría van a "Ingreso": no tiene caso preguntarlo.
      propuestas.forEach((propuesta) => {
        if (propuesta.accion === "movimiento"
          && propuesta.valores.tipoDeMovimiento === TIPOS_CAPTURA.INGRESO
          && !propuesta.valores.categoria) {
          propuesta.valores.categoria = "ingreso";
        }
        aplicarPreferencias(propuesta);
      });

      setEstadoAvatar("reposo");
      setPensando(false);

      if (irA) {
        navigate(irA);
        decirBot(`Te llevé a ${RUTAS_ASISTENTE[irA]}.`, { estado: "exito" });
      }

      // Aún no elige si "mis gastos" son solo los personales o todos: se pregunta una vez.
      if (respuestaConsulta?.preguntarAlcance) {
        fallaRef.current = null;
        colaRef.current.push({ accion: "alcanceGastos", consulta });
        continuar();
        return;
      }

      /*
       * Sin respuesta útil (tema "abierta" o una consulta que no encontró nada
       * que mostrar). La primera vez se ofrece revisar todo; si el mensaje que
       * sigue tampoco se resuelve (o es un "no me contestaste"), se revisa ya.
       */
      const sinRespuesta = propuestas.length === 0 && !irA && !imagen
        && (esAbierta || (respuestaConsulta && !respuestaConsulta.resumen && !respuestaConsulta.reporte));
      const fallaAnterior = fallaRef.current;
      if (fallaAnterior && propuestas.length === 0 && !irA && !imagen && (sinRespuesta || !consulta)) {
        if (respuestaConsulta) decirBot(respuestaConsulta.texto);
        await revisarTodo(`${fallaAnterior.pregunta}\n${texto}`);
        return;
      }
      if (sinRespuesta) {
        fallaRef.current = { pregunta: texto };
        if (respuestaConsulta) decirBot(respuestaConsulta.texto);
        colaRef.current.push({
          accion: "lecturaAmplia",
          pregunta: texto,
          motivo: esAbierta
            ? "Con lo que reviso normalmente no puedo contestar eso. ¿Reviso todos tus datos de los últimos 12 meses? Tarda un poco más."
            : "Eso es lo que encontré con lo que reviso normalmente. ¿Quieres que revise todos tus datos para contestarte mejor?",
        });
        continuar();
        return;
      }
      fallaRef.current = null;

      if (respuestaConsulta) {
        decirBot(respuestaConsulta.texto, { resumen: respuestaConsulta.resumen, reporte: respuestaConsulta.reporte });
        return;
      }

      // Si se entendió algo útil, los "no es una captura" sobran.
      if (propuestas.length > 0 || !textoLibre) {
        descartadas.forEach(({ motivo }) => decirBot(motivo, { estado: "aviso" }));
      }

      if (propuestas.length === 0) {
        if (textoLibre) decirBot(textoLibre);
        else if (!irA) {
          decirBot(imagen
            ? "No encontré nada que registrar en esa imagen. Prueba con una foto más clara del ticket."
            : "No entendí si quieres registrar algo o preguntar por tus datos. Prueba con “gasté 150 en tacos con efectivo” o “¿en qué gasté más este mes?”.");
        }
        return;
      }

      if (propuestas.length > 1) {
        decirBot(`Encontré ${propuestas.length} cosas por registrar. Vamos una por una.`);
      }

      colaRef.current.push(...propuestas);
      continuar();
    } catch (error) {
      setEstadoAvatar("reposo");
      setPensando(false);
      if (!(error instanceof ErrorCapturaIA)) console.error("Error del asistente", error);
      decirBot(error instanceof ErrorCapturaIA ? error.message : "Algo falló. Inténtalo de nuevo.");
    }
  }, [continuar, decirBot, navigate, revisarTodo]);
  consultarIARef.current = consultarIA;

  const enviarTexto = useCallback((texto) => {
    const limpio = String(texto || "").trim();
    if (!limpio || pensando) return;

    // Paso de texto libre (nombre del trabajo, monto, horas, banco): lo escrito es la respuesta.
    if (pregunta?.paso === PASOS.TEXTO && actualRef.current && !PALABRAS_NO.includes(normalizar(limpio))) {
      const propuesta = actualRef.current;
      agregar({ autor: "usuario", texto: limpio });
      const aviso = aplicarTexto(propuesta, limpio);
      if (aviso) decirBot(aviso);
      else if (propuesta.accion === "nuevaCuenta") pedirAltaCuenta(propuesta);
      else preguntar(propuesta);
      return;
    }

    // Hay una pregunta abierta: lo escrito se toma como respuesta.
    if (pregunta && actualRef.current) {
      const opcion = buscarOpcionEscrita(limpio, pregunta, actualRef.current);
      if (opcion) {
        aplicarRespuesta({ ...opcion, etiqueta: limpio });
        return;
      }

      // Ignorar la sugerencia del día y escribir otra cosa la deja para otro día.
      if (actualRef.current.accion === "sugerencia") {
        setPregunta(null);
        actualRef.current = null;
        agregar({ autor: "usuario", texto: limpio });
        const charla = responderCharla(limpio);
        if (charla) decirBot(charla);
        else consultarIA(limpio);
        return;
      }

      // Con la oferta de revisar todo (o la de solo personales/todos) abierta, escribir otra cosa es otra pregunta.
      if (["lecturaAmplia", "alcanceGastos"].includes(actualRef.current.accion)) {
        setPregunta(null);
        actualRef.current = null;
        agregar({ autor: "usuario", texto: limpio });
        consultarIA(limpio);
        return;
      }

      agregar({ autor: "usuario", texto: limpio });
      decirBot(pregunta.paso === PASOS.CONFIRMAR
        ? "Responde “sí” para guardarlo, “editar” para abrirlo en el formulario o “cancelar”."
        : "No encontré esa opción. Toca una de las de arriba o escribe “cancelar”.");
      return;
    }

    agregar({ autor: "usuario", texto: limpio });

    // "Hola", "gracias", "¿qué puedes hacer?": se contesta sin gastar una llamada a la IA.
    const charla = responderCharla(limpio);
    if (charla) {
      decirBot(charla);
      return;
    }

    consultarIA(limpio);
  }, [agregar, aplicarRespuesta, consultarIA, decirBot, pedirAltaCuenta, pensando, pregunta, preguntar]);

  /*
   * Al abrir el chat: si hay una sugerencia para hoy y no hay nada en curso,
   * se ofrece. Si las preferencias aún no cargan, se reintenta en la próxima
   * apertura.
   */
  const ofrecerSugerencia = useCallback(async () => {
    if (sugerenciaRevisadaRef.current || pensando || actualRef.current) return;
    if (!useAppStore.getState().preferenciasCargadas) return;
    sugerenciaRevisadaRef.current = true;

    const sugerencia = await cargarSugerencia();
    if (!sugerencia) return;
    // Mientras se buscaba, el usuario empezó otra cosa: se intenta en la siguiente apertura.
    if (actualRef.current || colaRef.current.length) {
      sugerenciaRevisadaRef.current = false;
      return;
    }

    marcarSugerenciaOfrecida();
    actualRef.current = { accion: "sugerencia", ...sugerencia };
    preguntar(actualRef.current);
  }, [pensando, preguntar]);

  /*
   * Foto de un ticket o de productos. Si había una pregunta abierta se da por
   * cancelada: la imagen empieza una captura nueva.
   */
  const enviarImagen = useCallback((imagen, texto = "") => {
    if (!imagen || pensando) return;
    const limpio = String(texto || "").trim();

    if (pregunta && actualRef.current) {
      colaRef.current = [];
      actualRef.current = null;
      setPregunta(null);
    }

    agregar({ autor: "usuario", texto: limpio, imagen });
    consultarIA(limpio, imagen);
  }, [agregar, consultarIA, pensando, pregunta]);

  const elegirOpcion = useCallback((mensajeId, opcion) => {
    if (pensando || pregunta?.mensajeId !== mensajeId) return;
    aplicarRespuesta(opcion);
  }, [aplicarRespuesta, pensando, pregunta]);

  const reiniciar = useCallback(() => {
    colaRef.current = [];
    consultaAnteriorRef.current = null;
    fallaRef.current = null;
    actualRef.current = null;
    setPregunta(null);
    setPensando(false);
    setEstadoAvatar("reposo");
    setMensajes([mensajeBienvenida()]);
  }, []);

  return {
    mensajes,
    pensando,
    estadoAvatar,
    preguntaActivaId: pregunta?.mensajeId || null,
    enviarTexto,
    enviarImagen,
    elegirOpcion,
    reiniciar,
    ofrecerSugerencia,
  };
};
