/*
 * Sugerencias del asistente para completar la cuenta poco a poco.
 *
 * Todo se decide con los datos que ya tiene la app, sin IA: qué falta
 * (cuentas, un trabajo, registrar seguido) y qué dijo la persona antes
 * ("Después" pospone unos días, "No me interesa" no vuelve a preguntar).
 * Se ofrece una como máximo al día, al abrir el asistente.
 *
 * El estado vive en preferencias.sugerenciasAsistente:
 *   { ultimaOfrecida: "2026-10-25", trabajo: { pospuestaHasta: "2026-10-28" }, registro: { descartada: true } }
 */

export const SUGERENCIAS = {
  CUENTAS: "cuentas",
  TRABAJO: "trabajo",
  REGISTRO: "registro",
};

export const DIAS_POSPONER = 3;
// Desde cuántos días sin movimientos se pregunta si hubo gastos.
export const DIAS_SIN_REGISTRO = 3;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Fechas "AAAA-MM-DD" en hora local; a mediodía para que el horario de verano no mueva el día.
const aFecha = (fechaISO) => new Date(`${fechaISO}T12:00:00`);

export const diasEntre = (desdeISO, hastaISO) => Math.round((aFecha(hastaISO) - aFecha(desdeISO)) / UN_DIA_MS);

export const sumarDiasISO = (fechaISO, dias) => {
  const fecha = aFecha(fechaISO);
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const disponible = (estado, clave, hoy) => {
  const guardado = estado?.[clave];
  if (guardado?.descartada) return false;
  return !guardado?.pospuestaHasta || guardado.pospuestaHasta <= hoy;
};

const textoRegistro = (ultimoMovimiento, hoy) => {
  if (!ultimoMovimiento) {
    return "Todavía no veo movimientos este mes ni el pasado. ¿Gastaste o recibiste algo estos días? Lo anotamos en un momento.";
  }
  const dias = diasEntre(ultimoMovimiento, hoy);
  return `Llevas ${dias} días sin registrar movimientos. ¿Gastaste o recibiste algo? Con tus datos al día los reportes salen más precisos.`;
};

/*
 * En orden de prioridad. Sin cuentas no se puede anotar nada, así que van
 * antes que el trabajo; con una sola cuenta, el trabajo es más útil primero.
 */
const CANDIDATAS = [
  {
    clave: SUGERENCIAS.CUENTAS,
    aplica: ({ cuentas }) => cuentas.length === 0,
    texto: () => "Para empezar a llevar tus finanzas necesito al menos una cuenta: tu efectivo, una tarjeta de débito o de crédito. ¿La creamos ahora?",
  },
  {
    clave: SUGERENCIAS.TRABAJO,
    aplica: ({ empresas }) => empresas.length === 0,
    texto: () => "Todavía no tienes un trabajo registrado en Ingresos. Si me dices cómo te pagan, puedo calcular lo que te toca y recordarte registrarlo. ¿Lo anotamos? Son 4 preguntas.",
  },
  {
    clave: SUGERENCIAS.CUENTAS,
    aplica: ({ cuentas }) => cuentas.length === 1,
    texto: () => "Solo tienes una cuenta registrada. Si también usas efectivo u otra tarjeta, agrégala para que tus saldos cuadren. ¿Agregamos otra?",
  },
  {
    clave: SUGERENCIAS.REGISTRO,
    aplica: ({ cuentas, ultimoMovimiento, hoy }) => cuentas.length > 0
      && (!ultimoMovimiento || diasEntre(ultimoMovimiento, hoy) >= DIAS_SIN_REGISTRO),
    texto: ({ ultimoMovimiento, hoy }) => textoRegistro(ultimoMovimiento, hoy),
  },
];

/**
 * La sugerencia que toca hoy, o null.
 * @param {{ hoy: string, cuentas: object[], empresas: object[], ultimoMovimiento: string|null, estado: object }} datos
 *   ultimoMovimiento en "AAAA-MM-DD"; null si no hay en los meses revisados.
 * @returns {{ clave: string, texto: string } | null}
 */
export const elegirSugerencia = ({ hoy, cuentas = [], empresas = [], ultimoMovimiento = null, estado = {} }) => {
  if (estado?.ultimaOfrecida === hoy) return null;

  const datos = { hoy, cuentas, empresas, ultimoMovimiento };
  const elegida = CANDIDATAS.find((candidata) => disponible(estado, candidata.clave, hoy) && candidata.aplica(datos));
  return elegida ? { clave: elegida.clave, texto: elegida.texto(datos) } : null;
};

/* ── Trabajo ── */

// Mismos esquemas que ModalEmpresa (paginas/ingresos/modales/modalEmpresa.jsx).
export const ESQUEMAS_TRABAJO = [
  { valor: "quincenal", etiqueta: "Sueldo fijo por quincena", campoMonto: "quincenaBase", unidad: "por quincena", preguntaMonto: "¿Cuánto te pagan cada quincena?" },
  { valor: "mensual", etiqueta: "Sueldo fijo mensual", campoMonto: null },
  { valor: "por_horas", etiqueta: "Por horas", campoMonto: "precioHora", unidad: "por hora", preguntaMonto: "¿Cuánto te pagan por hora?" },
  { valor: "diario_sexto_dia", etiqueta: "Por día trabajado", campoMonto: "salarioDiario", unidad: "por día", preguntaMonto: "¿Cuánto te pagan por día?" },
  { valor: "libre", etiqueta: "Honorarios o variable", campoMonto: null },
];

export const esquemaTrabajo = (valor) => ESQUEMAS_TRABAJO.find((esquema) => esquema.valor === valor) || null;

/* "$4,500.50", "4500 pesos", "4 500" → 4500.5. Null si no es un monto positivo. */
export const leerMonto = (texto) => {
  const limpio = String(texto || "").replace(/[$\s,]|pesos|mxn/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const monto = Number(limpio);
  return monto > 0 ? monto : null;
};

export const leerHoras = (texto) => {
  const horas = leerMonto(String(texto || "").replace(/horas?|hrs?/gi, ""));
  return horas && horas <= 168 ? horas : null;
};

/* Lo siguiente que hay que preguntar para dar de alta el trabajo. */
export const siguienteDatoTrabajo = (trabajo) => {
  if (!trabajo.nombre) return "nombre";
  const esquema = esquemaTrabajo(trabajo.tipoEsquema);
  if (!esquema) return "esquema";
  if (esquema.campoMonto && !trabajo[esquema.campoMonto]) return "monto";
  if (esquema.valor === "por_horas" && !trabajo.horasSemanales) return "horas";
  if (!trabajo.cuentaRespondida) return "cuenta";
  return "confirmar";
};

/* Empresa con la forma que espera guardarEmpresa; lo no preguntado va con los valores del modal. */
export const construirEmpresa = (trabajo) => {
  const porHoras = trabajo.tipoEsquema === "por_horas";
  return {
    nombre: String(trabajo.nombre).trim().slice(0, 60),
    tipoEsquema: trabajo.tipoEsquema,
    salarioDiario: Number(trabajo.salarioDiario || 0),
    precioHora: Number(trabajo.precioHora || 0),
    horasSemanales: Number(trabajo.horasSemanales || 0),
    bonoInternet: 0,
    quincenaBase: Number(trabajo.quincenaBase || 0),
    color: "#533B8F",
    activo: true,
    aplicarResico: false,
    liquidarCortesMensualmente: false,
    // Igual que el modal: a quien cobra por horas se le recuerda registrarlas cada semana.
    recordatorioRecurrenteActivo: porHoras,
    diaRecordatorio: "sabado",
    notas: "Registrado desde el asistente.",
    cuentaPorDefectoId: trabajo.cuentaId || "",
  };
};
