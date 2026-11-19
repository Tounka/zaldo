/*
 * Memoria corta de la conversación: los últimos mensajes del usuario y una
 * nota de lo que la app hizo con cada uno ("Guardado: gasto de 230…"). Con eso
 * la IA entiende "otro igual pero de 300", "también con esa tarjeta" o "borra
 * lo del uber".
 *
 * Solo viaja lo que el usuario escribió y lo que la propia IA ya había
 * propuesto: nunca saldos ni cifras calculadas por la app.
 *
 * Lo usan la app (al mandarlo) y el Worker (al validarlo): sin React ni Firebase.
 */

export const LIMITE_TURNOS_HISTORIAL = 8;
export const LIMITE_TEXTO_HISTORIAL = 280;
export const ROLES_HISTORIAL = ["usuario", "asistente"];
/* Marca las notas que escribe la app, para que la IA no las tome como algo por registrar. */
export const PREFIJO_NOTA_APP = "[Zaldo]";

const limpiarTexto = (texto) => String(texto ?? "")
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, LIMITE_TEXTO_HISTORIAL);

/** Deja solo turnos bien formados; lo que no cuadra se ignora en vez de tumbar la solicitud. */
export const limpiarHistorial = (historial) => {
  if (!Array.isArray(historial)) return [];
  return historial
    .filter((turno) => turno && typeof turno === "object" && ROLES_HISTORIAL.includes(turno.rol))
    .map((turno) => ({ rol: turno.rol, texto: limpiarTexto(turno.texto) }))
    .filter((turno) => turno.texto)
    .slice(-LIMITE_TURNOS_HISTORIAL);
};

/*
 * Lo que se manda como historial. La pregunta anterior ya viaja aparte con su
 * consulta (limpiarTurnoAnterior), así que se corta desde ahí para no repetirla.
 */
export const historialParaIA = (memoria = [], anterior = null) => {
  let turnos = memoria;
  if (anterior?.mensaje) {
    const posicion = memoria.findLastIndex((turno) => turno.rol === "usuario" && turno.texto === anterior.mensaje);
    if (posicion !== -1) turnos = memoria.slice(0, posicion);
  }
  return limpiarHistorial(turnos);
};

export const notaDeApp = (texto) => `${PREFIJO_NOTA_APP} ${texto}`;
