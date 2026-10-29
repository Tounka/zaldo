/*
 * Catálogo de charla: saludos, gracias, despedidas y "¿qué puedes hacer?".
 *
 * Solo se contesta aquí cuando el mensaje entero es charla ("hola", "buenos
 * días, ¿cómo estás?"). Si trae algo más ("hola, gasté 200 en uber") se
 * devuelve null y sigue a la IA. La app lo revisa antes de llamar al Worker
 * y el Worker lo revisa otra vez antes de llamar a OpenAI.
 */

const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  // Emojis, signos y todo lo que no sea letra o número.
  .replace(/[^a-z0-9ñ\s]/g, " ")
  // "holaaa" → "hola", "graciasss" → "gracias".
  .replace(/([a-z])\1{2,}/g, "$1")
  .replace(/\s+/g, " ")
  .trim();

/*
 * Cada intención con sus frases (ya normalizadas). Van de más larga a más
 * corta dentro del catálogo para que "buenos dias" se quite antes que "buenos".
 */
const INTENCIONES = {
  ayuda: [
    "que puedes hacer", "que sabes hacer", "en que me puedes ayudar", "en que me ayudas",
    "como te uso", "como funcionas", "como funciona esto", "para que sirves", "ayuda", "ayudame",
  ],
  quien: ["quien eres", "que eres", "como te llamas", "eres un bot", "eres una ia"],
  comoEstas: [
    "como estas", "como te va", "como vas", "como andas", "que tal estas", "que tal", "todo bien",
    "que onda", "que hubo", "quiubo",
  ],
  gracias: ["muchas gracias", "mil gracias", "muy amable", "gracias", "thanks", "thank you"],
  despedida: [
    "hasta luego", "hasta manana", "nos vemos", "adios", "bye", "chao", "chau",
  ],
  // "buenas noches" va aquí: casi siempre abre la plática ("buenas noches, gasté...").
  saludo: [
    "buenos dias", "buen dia", "buenas tardes", "buenas noches", "buenas", "hola", "holi", "hello", "hi", "hey",
    "saludos", "que hay",
  ],
  asentir: ["de acuerdo", "esta bien", "ok", "okay", "oki", "vale", "perfecto", "listo", "va", "sale", "genial", "excelente"],
};

// Palabras que acompañan a la charla sin cambiar su sentido.
const RELLENO = new Set(["y", "tu", "usted", "zaldo", "asistente", "amigo", "oye", "pues", "bien", "muy", "por", "favor", "jaja", "jeje"]);

// Si hay varias intenciones, contesta la más útil.
const PRIORIDAD = ["ayuda", "quien", "comoEstas", "gracias", "despedida", "saludo", "asentir"];

const QUE_PUEDO_HACER = "Puedo registrar lo que gastas, recibes o mueves entre cuentas (“gasté 150 en tacos con efectivo”), leer la foto de un ticket, crear cuentas y contestarte sobre tus gastos, saldos, ahorros o despensa.";

const RESPUESTAS = {
  ayuda: [QUE_PUEDO_HACER],
  quien: [`Soy Elliot, el asistente de Zaldo. ${QUE_PUEDO_HACER}`],
  comoEstas: [
    "¡Muy bien, gracias! ¿Registramos algo o quieres revisar cómo vas este mes?",
    "Todo en orden por aquí. Cuéntame qué gastaste hoy o pregúntame por tus cuentas.",
  ],
  gracias: [
    "¡Con gusto! Aquí sigo si necesitas registrar algo más.",
    "¡Para eso estoy! Cuando quieras anotamos otro movimiento.",
  ],
  despedida: [
    "¡Hasta luego! Cuando gastes algo, aquí te espero para anotarlo.",
    "¡Nos vemos! Tus cuentas quedan en orden.",
  ],
  saludo: [
    "¿En qué te ayudo? Puedes contarme un gasto, mandarme un ticket o preguntarme por tus cuentas.",
    "¿Qué registramos hoy? También puedo contarte cómo vas con tus gastos.",
  ],
  asentir: ["Perfecto. Cuando quieras, cuéntame qué registramos."],
};

// Saludos que se devuelven igual, para no tener que adivinar la hora del usuario.
const ESPEJO_SALUDO = [
  ["buenos dias", "¡Buenos días!"],
  ["buen dia", "¡Buen día!"],
  ["buenas tardes", "¡Buenas tardes!"],
  ["buenas noches", "¡Buenas noches!"],
];

const FRASES = Object.entries(INTENCIONES)
  .flatMap(([intencion, frases]) => frases.map((frase) => ({ intencion, frase })))
  .sort((a, b) => b.frase.length - a.frase.length);

// Ningún saludo pasa de esto; algo más largo casi seguro trae una captura.
const LIMITE_CARACTERES = 60;

const detectarIntenciones = (texto) => {
  let resto = ` ${texto} `;
  const encontradas = new Set();

  FRASES.forEach(({ intencion, frase }) => {
    const buscada = ` ${frase} `;
    while (resto.includes(buscada)) {
      encontradas.add(intencion);
      resto = resto.replace(buscada, " ");
    }
  });

  const sobrante = resto.split(" ").filter((palabra) => palabra && !RELLENO.has(palabra));
  return sobrante.length ? null : encontradas;
};

/**
 * Respuesta del catálogo, o null si el mensaje no es solo charla.
 * @param {string} mensaje
 * @param {{ azar?: () => number }} [opciones] para fijar la variante en pruebas
 * @returns {string | null}
 */
export const responderCharla = (mensaje, { azar = Math.random } = {}) => {
  const texto = normalizar(mensaje);
  if (!texto || texto.length > LIMITE_CARACTERES) return null;

  const intenciones = detectarIntenciones(texto);
  if (!intenciones?.size) return null;

  const intencion = PRIORIDAD.find((clave) => intenciones.has(clave));
  const opciones = RESPUESTAS[intencion];
  const respuesta = opciones[Math.floor(azar() * opciones.length) % opciones.length];

  if (intencion === "despedida") return respuesta;

  const espejo = ESPEJO_SALUDO.find(([frase]) => ` ${texto} `.includes(` ${frase} `));
  const saludo = espejo ? espejo[1] : intenciones.has("saludo") ? "¡Hola!" : "";
  return saludo ? `${saludo} ${respuesta}` : respuesta;
};
