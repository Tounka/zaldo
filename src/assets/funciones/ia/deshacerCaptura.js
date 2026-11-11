/*
 * "Deshaz", "bórralo", "borra el último gasto": se reconoce aquí, sin IA. Solo
 * aplica al último gasto o ingreso guardado en la conversación.
 */

const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const INICIO = "(?:(?:me equivoque|perdon|ups|no|oye|mejor)\\s+)*";
const OBJETO = "(?:(?:eso|esto|el|la|lo|ese|este)\\s+)?(?:(?:ultimo|ultima|anterior)\\s*)?(?:gasto|ingreso|movimiento|registro)?";
const COLA = "(?:\\s*(?:que|de)\\s+(?:guarde|registre|hice|guardaste|registraste|hace rato|ahorita))?(?:\\s*por favor)?";

// Solos bastan: "deshaz", "bórralo". Los demás piden decir qué: "borra el último".
const SOLOS = new RegExp(`^${INICIO}(?:deshaz|deshazlo|deshacer|borralo|eliminalo|quitalo)(?:\\s+${OBJETO})?${COLA}$`);
const CON_OBJETO = new RegExp(`^${INICIO}(?:borra|elimina|quita)\\s+${OBJETO}${COLA}$`);
const TIENE_OBJETO = /\b(eso|esto|ese|este|ultimo|ultima|anterior)\b/;

export const pideDeshacer = (mensaje) => {
  const texto = normalizar(mensaje);
  if (!texto || texto.length > 60) return false;
  return SOLOS.test(texto) || (CON_OBJETO.test(texto) && TIENE_OBJETO.test(texto));
};
