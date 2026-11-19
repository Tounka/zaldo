/*
 * Deshacer desde el chat. Lo simple ("deshaz", "bórralo", "borra los dos
 * últimos", "deshaz todo") se reconoce aquí, sin IA; lo demás ("quita lo del
 * uber") lo trae la IA en `deshacer`. Solo aplica a lo guardado en la
 * conversación, que el chat lleva en una pila.
 *
 * El Worker también empaqueta este archivo: sin React ni Firebase.
 */

export const LIMITE_DESHACER = 10;
const LIMITE_TEXTO_DESHACER = 60;

const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const INICIO = "(?:(?:me equivoque|perdon|ups|no|oye|mejor)\\s+)*";
const OBJETO = "(?:(?:eso|esto|el|la|lo|ese|este)\\s+)?(?:(?:ultimo|ultima|anterior)\\s*)?(?:gasto|ingreso|movimiento|registro|pago|transferencia)?";
const COLA = "(?:\\s*(?:que|de)\\s+(?:guarde|registre|hice|guardaste|registraste|hiciste|hace rato|ahorita))?(?:\\s*por favor)?";
const VERBO = "(?:deshaz|deshacer|borra|elimina|quita|regresa|revierte)";
const NUMEROS = { dos: 2, tres: 3, cuatro: 4, cinco: 5 };

// Solos bastan: "deshaz", "bórralo". Los demás piden decir qué: "borra el último".
const SOLOS = new RegExp(`^${INICIO}(?:deshaz|deshazlo|deshacer|borralo|eliminalo|quitalo|regresalo|reviertelo)(?:\\s+${OBJETO})?${COLA}$`);
const CON_OBJETO = new RegExp(`^${INICIO}${VERBO}\\s+${OBJETO}${COLA}$`);
const TIENE_OBJETO = /\b(eso|esto|ese|este|ultimo|ultima|anterior)\b/;
const TODO = new RegExp(`^${INICIO}(?:${VERBO}|deshazlo|borralo|eliminalo|quitalo|regresalo|reviertelo)\\s+todo(?:\\s+(?:eso|lo anterior|lo))?${COLA}$`);
const VARIOS = new RegExp(`^${INICIO}${VERBO}\\s+(?:los|las)\\s+(dos|tres|cuatro|cinco|\\d)\\s+(?:ultimos|ultimas|anteriores)(?:\\s+(?:gastos|ingresos|movimientos|registros))?${COLA}$`);

export const pideDeshacer = (mensaje) => {
  const texto = normalizar(mensaje);
  if (!texto || texto.length > LIMITE_TEXTO_DESHACER) return false;
  return SOLOS.test(texto) || (CON_OBJETO.test(texto) && TIENE_OBJETO.test(texto));
};

/**
 * Pedido de deshacer que se entiende sin IA.
 * @returns {{ todo: boolean, cuantos: number|null, texto: string } | null}
 */
export const leerDeshacer = (mensaje) => {
  const texto = normalizar(mensaje);
  if (!texto || texto.length > LIMITE_TEXTO_DESHACER) return null;
  if (TODO.test(texto)) return { todo: true, cuantos: null, texto: "" };
  const varios = VARIOS.exec(texto);
  if (varios) {
    const cuantos = NUMEROS[varios[1]] || Number(varios[1]);
    return cuantos > 0 ? { todo: false, cuantos, texto: "" } : null;
  }
  return pideDeshacer(mensaje) ? { todo: false, cuantos: 1, texto: "" } : null;
};

/* strict de Structured Outputs: objeto o null, todo en `required`. */
export const ESQUEMA_DESHACER = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      description: "Solo si pide borrar o deshacer algo que se guardó en esta conversación.",
      properties: {
        todo: { type: "boolean", description: "true si pide deshacer todo lo guardado en la conversación." },
        cuantos: { type: ["integer", "null"], description: "Cuántos de los últimos registros (\"el último\" = 1); null si usa \"todo\" o \"texto\"." },
        texto: { type: "string", description: "Palabra que identifica el registro (\"uber\", \"súper\"); vacío si no nombra uno." },
      },
      required: ["todo", "cuantos", "texto"],
      additionalProperties: false,
    },
  ],
};

/** Valida el `deshacer` que devuelve la IA; null si no pide nada. */
export const interpretarDeshacer = (deshacer) => {
  if (!deshacer || typeof deshacer !== "object") return null;
  const todo = deshacer.todo === true;
  const texto = todo ? "" : String(deshacer.texto || "").replace(/\s+/g, " ").trim().slice(0, LIMITE_TEXTO_DESHACER);
  const cuantos = Math.min(Math.max(Math.trunc(Number(deshacer.cuantos)) || 1, 1), LIMITE_DESHACER);
  return { todo, cuantos: todo || texto ? null : cuantos, texto };
};

/*
 * Qué entradas de la pila toca un pedido. Cada entrada es
 * { id, grupo, reversible, busqueda }; lo guardado de un jalón comparte `grupo`
 * y cuenta como un solo "último".
 * @param pedido { ids } | { texto } | { todo } | { cuantos }
 * @returns {{ entradas: object[], bloqueadas: object[] }} bloqueadas = lo elegido que no se puede revertir.
 */
export const elegirParaDeshacer = (pila = [], pedido = {}) => {
  let elegidas;
  if (Array.isArray(pedido.ids)) {
    elegidas = pila.filter((entrada) => pedido.ids.includes(entrada.id));
  } else if (pedido.texto) {
    const buscado = normalizar(pedido.texto);
    elegidas = buscado ? pila.filter((entrada) => normalizar(entrada.busqueda).includes(buscado)) : [];
  } else if (pedido.todo) {
    elegidas = pila;
  } else {
    const cuantos = Math.min(Math.max(Number(pedido.cuantos) || 1, 1), LIMITE_DESHACER);
    const grupos = [];
    for (let indice = pila.length - 1; indice >= 0 && grupos.length <= cuantos; indice -= 1) {
      const { grupo } = pila[indice];
      if (grupos.includes(grupo)) continue;
      if (grupos.length === cuantos) break;
      grupos.push(grupo);
    }
    elegidas = pila.filter((entrada) => grupos.includes(entrada.grupo));
  }

  return {
    entradas: elegidas.filter((entrada) => entrada.reversible),
    bloqueadas: elegidas.filter((entrada) => !entrada.reversible),
  };
};
