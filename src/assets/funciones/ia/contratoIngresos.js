/*
 * Parte del contrato de captura para registrar el pago de un empleo ("ya me
 * pagaron la quincena", "me depositaron 4,500 de Acme y 1,200 de vales").
 *
 * Un pago de empleo NO es un ingreso suelto en una cuenta: va al módulo de
 * Ingresos (con su empresa, periodo y percepciones) y de ahí se deposita en la
 * cuenta configurada del empleo. Por eso tiene su propio bloque y la IA ve la
 * lista de empleos del usuario, con su cuenta de depósito.
 *
 * Como el resto del contrato: la IA solo propone; interpretarPagosEmpleo.js
 * valida y el usuario confirma en el chat. El Worker empaqueta este archivo:
 * sin React, imágenes ni Firebase.
 */

export const LIMITE_EMPLEOS_CONTEXTO = 15;
export const LIMITE_PERCEPCIONES_CONTEXTO = 10;
export const LIMITE_PAGOS_EMPLEO_POR_MENSAJE = 4;
export const LIMITE_NOMBRE_EMPLEO = 60;
export const TIPOS_PERCEPCION_IA = ["bono", "vales", "otro"];
export const ESQUEMAS_EMPLEO_IA = ["por_horas", "diario_sexto_dia", "quincenal", "mensual", "libre", ""];

/* strict de Structured Outputs: todo en `required`, opcionales como null. */
export const ESQUEMA_PAGOS_EMPLEO = {
  type: "array",
  description: "Pagos recibidos de un empleo de la lista \"Empleos\" (sueldo, quincena, semana, bono, vales). Vacío si no hay.",
  items: {
    type: "object",
    properties: {
      empleoId: {
        type: ["string", "null"],
        description: "id del empleo. Si solo hay uno y no dice cuál, ese. null si hay duda.",
      },
      monto: {
        type: ["number", "null"],
        description: "Lo que recibió de sueldo, sin bonos ni vales. null si no lo dice (la app usa lo esperado).",
      },
      horas: { type: ["number", "null"], description: "Solo si dice cuántas horas trabajó." },
      fecha: { type: ["string", "null"], description: "YYYY-MM-DD. null = hoy." },
      cuentaId: {
        type: ["string", "null"],
        description: "Solo si el usuario dice en qué cuenta le cayó. null = la cuenta del empleo.",
      },
      soloPercepciones: {
        type: "boolean",
        description: "true si solo reporta un bono, vales u otra percepción, sin sueldo.",
      },
      percepciones: {
        type: "array",
        description: "Bonos, vales de despensa, aguinaldo, etc. que el usuario menciona en este pago.",
        items: {
          type: "object",
          properties: {
            percepcionId: { type: ["string", "null"], description: "id de la percepción del empleo si coincide; si no, null." },
            tipo: { type: "string", enum: TIPOS_PERCEPCION_IA },
            nombre: { type: "string", description: "Concepto corto: \"Vales de despensa\", \"Bono de puntualidad\"." },
            monto: { type: ["number", "null"], description: "null si no lo dice (la app usa el configurado)." },
          },
          required: ["percepcionId", "tipo", "nombre", "monto"],
          additionalProperties: false,
        },
      },
      nota: { type: "string", description: "Detalle corto, o vacío." },
      dudas: { type: "array", items: { type: "string" } },
    },
    required: ["empleoId", "monto", "horas", "fecha", "cuentaId", "soloPercepciones", "percepciones", "nota", "dudas"],
    additionalProperties: false,
  },
};

/*
 * Lo mínimo de cada empleo para que la IA lo ubique: nombre, forma de pago,
 * la cuenta donde se deposita y los nombres de sus percepciones. Sin montos.
 */
export const construirEmpleosParaIA = (empresas = []) => (Array.isArray(empresas) ? empresas : [])
  .filter((empresa) => empresa?.id && empresa.activo !== false)
  .slice(0, LIMITE_EMPLEOS_CONTEXTO)
  .map((empresa) => ({
    id: String(empresa.id),
    nombre: String(empresa.nombre || "").slice(0, LIMITE_NOMBRE_EMPLEO),
    esquema: ESQUEMAS_EMPLEO_IA.includes(empresa.tipoEsquema) ? empresa.tipoEsquema : "",
    cuentaId: empresa.cuentaPorDefectoId ? String(empresa.cuentaPorDefectoId) : null,
    percepciones: (Array.isArray(empresa.percepciones) ? empresa.percepciones : [])
      .filter((percepcion) => percepcion?.id && percepcion.activo !== false)
      .slice(0, LIMITE_PERCEPCIONES_CONTEXTO)
      .map((percepcion) => ({
        id: String(percepcion.id),
        nombre: String(percepcion.nombre || "").slice(0, LIMITE_NOMBRE_EMPLEO),
        tipo: TIPOS_PERCEPCION_IA.includes(percepcion.tipo) ? percepcion.tipo : "otro",
      })),
  }));

export const instruccionesPagosEmpleo = (empleos = []) => `Pagos de su empleo:
31. Si el usuario dice que le pagaron, le depositaron, le cayó o cobró su sueldo, quincena, semana, nómina, pago de su trabajo/empleo, o un pago de alguno de sus "Empleos", llénalo en "pagosEmpleo" (uno por pago, máximo ${LIMITE_PAGOS_EMPLEO_POR_MENSAJE}) y NO lo pongas en "capturas": la app lo registra en Ingresos y deposita en la cuenta del empleo.
32. "empleoId" solo de la lista "Empleos". Si hay un solo empleo y no dice cuál, usa ese. Si hay varios y no queda claro, null y explícalo en "dudas".
33. "cuentaId" del pago: solo si el usuario dice en qué cuenta le cayó; si no, null (la app usa la cuenta configurada del empleo). Nunca tomes la cuenta de otra operación del mensaje ni adivines.
34. "monto" = lo que recibió de sueldo (sin bonos ni vales); null si no lo dice. "horas" solo si dice cuántas horas trabajó.
35. Bonos, vales de despensa, aguinaldo, fondo de ahorro, etc. van en "percepciones" del pago (con "percepcionId" si coincide con una del empleo). Si solo habla de eso ("ya me cayeron los vales"), "soloPercepciones" = true.
36. Si la lista de empleos está vacía, un pago de su trabajo es una captura de "ingreso" normal.

Empleos del usuario (JSON):
${JSON.stringify(empleos)}`;
