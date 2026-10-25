import {
  LIMITE_ALTAS_POR_MENSAJE,
  LIMITE_NOMBRE_ALTA,
  TIPOS_CUENTA_ALTA,
} from "./contratoAltas.js";

/*
 * Valida las altas que propone la IA. Como en interpretarCaptura, todo llega
 * como dato no confiable: lo que no cuadra se descarta con un aviso y lo que
 * ya existe no se vuelve a crear.
 *
 * Devuelve propuestas para el chat:
 *   - { accion: "institucion", nombre }
 *   - { accion: "cuenta", nombre, tipoDeCuenta, institucionNombre, esLiquida,
 *       fechaDeCorte, fechaLimiteDePago, limiteDeCredito, advertencias }
 * Las instituciones van primero: así una cuenta puede usar la que se acaba de crear.
 */

const LIMITE_CREDITO_MAXIMO = 10_000_000;

const limpiar = (valor) => String(valor ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, LIMITE_NOMBRE_ALTA);

export const normalizarNombre = (valor) => String(valor || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const leerDia = (valor) => {
  const dia = Number(valor);
  return Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null;
};

/* Débito y efectivo suelen estar disponibles; crédito e inversión no. */
const liquidezPorDefecto = (tipo) => tipo === "debito" || tipo === "efectivo";

/**
 * @param altas         `respuesta.altas` de la IA (objeto o null).
 * @param cuentas       Cuentas activas del usuario.
 * @param instituciones Instituciones activas del usuario.
 * @returns {{ propuestas: object[], descartadas: { indice, motivo }[] }}
 */
export const interpretarAltas = (altas, { cuentas = [], instituciones = [] } = {}) => {
  const resultado = { propuestas: [], descartadas: [] };
  if (!altas || typeof altas !== "object") return resultado;

  const institucionesExistentes = new Set(instituciones.map((item) => normalizarNombre(item?.nombre)));
  const cuentasExistentes = new Set(cuentas.map((item) => normalizarNombre(item?.nombre)));
  const institucionesNuevas = new Set();
  let total = 0;

  const descartar = (motivo) => resultado.descartadas.push({ indice: -1, motivo });

  (Array.isArray(altas.instituciones) ? altas.instituciones : []).forEach((item) => {
    const nombre = limpiar(item?.nombre);
    const clave = normalizarNombre(nombre);
    if (!clave || institucionesNuevas.has(clave)) return;

    if (institucionesExistentes.has(clave)) {
      descartar(`La institución "${nombre}" ya existe; no la dupliqué.`);
      return;
    }
    if (total >= LIMITE_ALTAS_POR_MENSAJE) return;

    institucionesNuevas.add(clave);
    total += 1;
    resultado.propuestas.push({ accion: "institucion", nombre, advertencias: [] });
  });

  const cuentasNuevas = new Set();
  (Array.isArray(altas.cuentas) ? altas.cuentas : []).forEach((item) => {
    const nombre = limpiar(item?.nombre);
    const clave = normalizarNombre(nombre);
    if (!clave || cuentasNuevas.has(clave)) return;

    if (cuentasExistentes.has(clave)) {
      descartar(`Ya tienes una cuenta llamada "${nombre}"; no la dupliqué.`);
      return;
    }

    const tipoDeCuenta = item?.tipoDeCuenta;
    if (!TIPOS_CUENTA_ALTA.includes(tipoDeCuenta)) {
      descartar(`No quedó claro de qué tipo es la cuenta "${nombre}" (débito, crédito, inversión o efectivo).`);
      return;
    }

    if (total >= LIMITE_ALTAS_POR_MENSAJE) {
      descartar(`Solo creo ${LIMITE_ALTAS_POR_MENSAJE} cosas por mensaje; "${nombre}" quedó fuera.`);
      return;
    }

    const advertencias = [];
    const esCredito = tipoDeCuenta === "credito";
    const institucionNombre = limpiar(item?.institucion);
    const claveInstitucion = normalizarNombre(institucionNombre);

    // Si la IA nombró una institución que no existe ni viene en las altas, se propone también.
    if (claveInstitucion && !institucionesExistentes.has(claveInstitucion) && !institucionesNuevas.has(claveInstitucion)
      && total < LIMITE_ALTAS_POR_MENSAJE - 1) {
      institucionesNuevas.add(claveInstitucion);
      total += 1;
      resultado.propuestas.push({ accion: "institucion", nombre: institucionNombre, advertencias: [] });
    }

    const limite = Number(item?.limiteDeCredito);
    const limiteDeCredito = esCredito && Number.isFinite(limite) && limite > 0 && limite <= LIMITE_CREDITO_MAXIMO
      ? Math.round(limite * 100) / 100
      : null;

    cuentasNuevas.add(clave);
    total += 1;
    resultado.propuestas.push({
      accion: "cuenta",
      nombre,
      tipoDeCuenta,
      institucionNombre,
      esLiquida: typeof item?.esLiquida === "boolean" ? item.esLiquida : liquidezPorDefecto(tipoDeCuenta),
      fechaDeCorte: esCredito ? leerDia(item?.fechaDeCorte) : null,
      fechaLimiteDePago: esCredito ? leerDia(item?.fechaLimiteDePago) : null,
      limiteDeCredito,
      advertencias,
    });
  });

  // Instituciones antes que cuentas, sin importar el orden en que llegaron.
  resultado.propuestas.sort((a, b) => Number(a.accion === "cuenta") - Number(b.accion === "cuenta"));
  return resultado;
};
