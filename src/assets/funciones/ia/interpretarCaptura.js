import { fechaLocalISO } from "../utils/fechas";
import {
  CATEGORIAS_CAPTURA,
  CATEGORIAS_INTERNAS,
  LIMITE_CAPTURAS_POR_MENSAJE,
  LIMITE_NOTA_CAPTURA,
  TIPOS_CAPTURA,
  VERSION_CONTRATO_CAPTURA,
} from "./contratoCaptura";
import { interpretarDespensa } from "./interpretarDespensa.js";

/*
 * Convierte la respuesta de la IA en propuestas listas para los modales que ya
 * existen. Todo lo que llega de la IA se trata como dato no confiable: se
 * revisa campo por campo y lo que no cuadra se descarta con un aviso, en vez
 * de "arreglarlo" adivinando.
 *
 * No escribe nada. El resultado se usa así:
 *   - accion "movimiento"    → abrirAgregarMovimiento({ cuenta, valores })
 *   - accion "transferencia" → abrirMovimientoEntreCuentas({ cuentaOrigen, cuentaDestino })
 *   - `despensa` (compra del súper) → registrarEntradaLoteIADespensa
 * y el usuario confirma antes de guardar.
 */

const VALORES_CATEGORIA = new Set(CATEGORIAS_CAPTURA.map((categoria) => categoria.value));
const LIMITE_DUDAS = 5;
const DIAS_ANTIGUEDAD_SOSPECHOSA = 365;

const normalizarTexto = (valor) => String(valor || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const limpiarTexto = (valor, limite) => String(valor ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, limite);

/*
 * Los modelos a veces envuelven el JSON en ```json ... ```. Se acepta eso y
 * también un objeto ya parseado (cuando el proveedor devuelve tool_use).
 */
export const leerRespuestaIA = (respuesta) => {
  if (respuesta && typeof respuesta === "object") return respuesta;

  const texto = String(respuesta || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};

const leerMonto = (valor) => {
  const monto = Number(valor);
  if (!Number.isFinite(monto) || monto <= 0) return null;
  return Math.round(monto * 100) / 100;
};

/*
 * Primero por id exacto; si la IA mandó el nombre en lugar del id, se acepta
 * solo cuando coincide con UNA cuenta. Ante dos cuentas parecidas no se elige.
 */
const resolverCuenta = (referencia, cuentas) => {
  if (!referencia) return null;

  const porId = cuentas.find((cuenta) => cuenta.id === referencia);
  if (porId) return porId;

  const buscado = normalizarTexto(referencia);
  const porNombre = cuentas.filter((cuenta) => normalizarTexto(cuenta.nombre) === buscado);
  return porNombre.length === 1 ? porNombre[0] : null;
};

const esFechaReal = (texto) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
};

const resolverFecha = (valor, hoyISO, advertencias) => {
  if (!valor) return hoyISO;

  const texto = String(valor).trim();
  if (!esFechaReal(texto)) {
    advertencias.push(`La fecha "${texto}" no es válida; se usó hoy.`);
    return hoyISO;
  }

  // YYYY-MM-DD se compara bien como texto.
  if (texto > hoyISO) {
    advertencias.push(`La fecha ${texto} es futura; se usó hoy.`);
    return hoyISO;
  }

  const limite = new Date(`${hoyISO}T12:00:00`);
  limite.setDate(limite.getDate() - DIAS_ANTIGUEDAD_SOSPECHOSA);
  if (texto < fechaLocalISO(limite)) {
    advertencias.push(`La fecha ${texto} tiene más de un año; revísala.`);
  }

  return texto;
};

const resolverCategoria = (valor, tipo, advertencias) => {
  const categoria = String(valor || "").trim();
  if (!categoria) return "";

  if (CATEGORIAS_INTERNAS.includes(categoria)) {
    advertencias.push("Parece un movimiento entre tus cuentas; si lo es, regístralo como transferencia.");
    return "";
  }

  if (!VALORES_CATEGORIA.has(categoria)) {
    advertencias.push(`La categoría "${categoria}" no existe; elige una.`);
    return "";
  }

  // "ingreso" como categoría solo tiene sentido en un ingreso.
  if (categoria === "ingreso" && tipo !== TIPOS_CAPTURA.INGRESO) return "";

  return categoria;
};

const leerDudas = (dudas) => (Array.isArray(dudas) ? dudas : [])
  .map((duda) => limpiarTexto(duda, LIMITE_NOTA_CAPTURA))
  .filter(Boolean)
  .slice(0, LIMITE_DUDAS);

const construirMovimiento = (captura, monto, cuentas, hoyISO, advertencias) => {
  const tipo = captura.tipo;
  const cuenta = resolverCuenta(captura.cuentaId, cuentas);
  if (!cuenta) advertencias.push("No quedó clara la cuenta; elígela antes de guardar.");

  const esGasto = tipo === TIPOS_CAPTURA.GASTO;
  const valores = {
    tipoDeMovimiento: tipo,
    // El formulario trabaja el monto como texto, igual que cuando se teclea.
    monto: String(monto),
    categoria: resolverCategoria(captura.categoria, tipo, advertencias),
    nota: limpiarTexto(captura.nota, LIMITE_NOTA_CAPTURA),
    fechaMovimiento: resolverFecha(captura.fecha, hoyISO, advertencias),
    esPersonal: esGasto && captura.esPersonal === true,
    esExtraordinario: esGasto && captura.esExtraordinario === true,
  };

  // Si no se indica, se deja el valor por defecto que pone el propio modal.
  if (esGasto && cuenta?.tipoDeCuenta === "credito"
    && ["msi", "revolvente"].includes(captura.pagoAMeses)) {
    valores.pagoAMeses = captura.pagoAMeses;
  }

  return { accion: "movimiento", cuenta, valores };
};

const construirTransferencia = (captura, monto, cuentas, advertencias) => {
  const cuentaOrigen = resolverCuenta(captura.cuentaId, cuentas);
  let cuentaDestino = resolverCuenta(captura.cuentaDestinoId, cuentas);

  if (!cuentaOrigen) advertencias.push("No quedó clara la cuenta de origen.");
  if (!cuentaDestino) advertencias.push("No quedó clara la cuenta de destino.");

  if (cuentaOrigen && cuentaDestino && cuentaOrigen.id === cuentaDestino.id) {
    advertencias.push("Origen y destino son la misma cuenta; elige el destino.");
    cuentaDestino = null;
  }

  return {
    accion: "transferencia",
    cuentaOrigen,
    cuentaDestino,
    monto,
    nota: limpiarTexto(captura.nota, LIMITE_NOTA_CAPTURA),
  };
};

/**
 * @param respuesta  Texto u objeto devuelto por la IA.
 * @param cuentas    Cuentas activas del usuario (useAppStore().cuentas).
 * @param hoy        Inyectable para pruebas.
 * @returns {{ version, propuestas: object[], descartadas: {indice, motivo}[], despensa: object|null }}
 */
export const interpretarCaptura = (respuesta, { cuentas = [], hoy = new Date() } = {}) => {
  const resultado = { version: VERSION_CONTRATO_CAPTURA, propuestas: [], descartadas: [], despensa: null };
  const datos = leerRespuestaIA(respuesta);

  if (!datos || !Array.isArray(datos.capturas)) {
    resultado.descartadas.push({ indice: -1, motivo: "La respuesta de la IA no tiene el formato esperado." });
    return resultado;
  }

  const cuentasActivas = cuentas.filter((cuenta) => cuenta?.id && cuenta.activo !== false);
  const hoyISO = fechaLocalISO(hoy);

  resultado.despensa = interpretarDespensa(datos.despensa, {
    cuentas: cuentasActivas,
    resolverFecha: (valor, advertencias) => resolverFecha(valor, hoyISO, advertencias),
  });

  datos.capturas.forEach((captura, indice) => {
    if (indice >= LIMITE_CAPTURAS_POR_MENSAJE) {
      resultado.descartadas.push({ indice, motivo: "Se superó el máximo de capturas por mensaje." });
      return;
    }

    if (!captura || typeof captura !== "object") {
      resultado.descartadas.push({ indice, motivo: "Captura vacía." });
      return;
    }

    const tipo = captura.tipo;
    const tiposValidos = [TIPOS_CAPTURA.GASTO, TIPOS_CAPTURA.INGRESO, TIPOS_CAPTURA.TRANSFERENCIA];
    if (!tiposValidos.includes(tipo)) {
      const dudas = leerDudas(captura.dudas);
      resultado.descartadas.push({
        indice,
        motivo: dudas[0] || "No se identificó si es gasto, ingreso o transferencia.",
      });
      return;
    }

    const monto = leerMonto(captura.monto);
    if (monto === null) {
      resultado.descartadas.push({ indice, motivo: "El monto no es un número positivo." });
      return;
    }

    const advertencias = leerDudas(captura.dudas);
    const propuesta = tipo === TIPOS_CAPTURA.TRANSFERENCIA
      ? construirTransferencia(captura, monto, cuentasActivas, advertencias)
      : construirMovimiento(captura, monto, cuentasActivas, hoyISO, advertencias);

    resultado.propuestas.push({ ...propuesta, indice, advertencias });
  });

  return resultado;
};
