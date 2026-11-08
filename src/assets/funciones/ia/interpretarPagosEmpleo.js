import {
  LIMITE_PAGOS_EMPLEO_POR_MENSAJE,
  TIPOS_PERCEPCION_IA,
} from "./contratoIngresos.js";
import {
  cuentaDePercepcion,
  pagoEsperadoEmpresa,
  percepcionesDeEmpresa,
  percepcionesQueAplican,
} from "../ingresosPercepciones";

/*
 * Valida los pagos de empleo que propone la IA. Lo que no cuadra se descarta o
 * se deja para preguntar; nada se adivina:
 *   - El empleo debe existir. Si la IA no lo dijo y solo hay uno activo, es ese.
 *   - La cuenta es la que el usuario nombró o, si no, la configurada del
 *     empleo. Nunca la de otra operación del mensaje.
 *   - Sin monto se usa el esperado según el esquema; si el esquema no da uno
 *     (honorarios), se pregunta.
 *   - Las percepciones configuradas que tocan en esa fecha se agregan solas,
 *     marcadas como sugeridas, para que el usuario las quite si no llegaron.
 *
 * Devuelve propuestas { accion: "pagoEmpleo", empresa, monto, horas, fecha,
 * cuenta, cuentaExplicita, percepciones: [{ percepcion, monto, cuentaId, sugerida }],
 * soloPercepciones, nota, advertencias }.
 */

const LIMITE_NOTA = 200;
const LIMITE_HORAS = 168;
const MONTO_MAXIMO = 10_000_000;

const normalizar = (valor) => String(valor || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const limpiar = (valor, limite) => String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, limite);

const leerMonto = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const monto = Number(valor);
  if (!Number.isFinite(monto) || monto <= 0 || monto > MONTO_MAXIMO) return null;
  return Math.round(monto * 100) / 100;
};

export const empleosActivos = (empresas = []) => (Array.isArray(empresas) ? empresas : [])
  .filter((empresa) => empresa?.id && empresa.activo !== false);

/* Por id; si la IA mandó el nombre, solo con una coincidencia única. */
export const resolverEmpleo = (referencia, empleos) => {
  if (referencia) {
    const porId = empleos.find((empleo) => empleo.id === referencia);
    if (porId) return porId;
    const buscado = normalizar(referencia);
    const porNombre = empleos.filter((empleo) => normalizar(empleo.nombre) === buscado);
    if (porNombre.length === 1) return porNombre[0];
  }
  return empleos.length === 1 ? empleos[0] : null;
};

const resolverPercepcion = (mencion, empresa) => {
  const configuradas = percepcionesDeEmpresa(empresa);
  const porId = configuradas.find((percepcion) => percepcion.id === mencion?.percepcionId);
  if (porId) return porId;
  const tipo = TIPOS_PERCEPCION_IA.includes(mencion?.tipo) ? mencion.tipo : "otro";
  const nombre = limpiar(mencion?.nombre, 60);
  const porNombre = configuradas.filter((percepcion) => normalizar(percepcion.nombre) === normalizar(nombre));
  if (porNombre.length === 1) return porNombre[0];
  const delTipo = configuradas.filter((percepcion) => percepcion.tipo === tipo);
  if (delTipo.length === 1 && tipo !== "otro") return delTipo[0];
  return {
    id: `perc_ia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: nombre || (tipo === "vales" ? "Vales de despensa" : tipo === "bono" ? "Bono" : "Percepción"),
    tipo,
    monto: 0,
    esManual: true,
  };
};

/**
 * @param pagos         `respuesta.pagosEmpleo` de la IA.
 * @param empresas      Empleos del año (documento de Ingresos).
 * @param cuentas       Cuentas activas.
 * @param registros     Registros del año, para no repetir percepciones mensuales.
 * @param resolverFecha (valor, advertencias) => YYYY-MM-DD válida.
 */
export const interpretarPagosEmpleo = (pagos, { empresas = [], cuentas = [], registros = [], resolverFecha }) => {
  const resultado = { propuestas: [], descartadas: [] };
  if (!Array.isArray(pagos) || pagos.length === 0) return resultado;

  const empleos = empleosActivos(empresas);
  const cuentaPorId = (id) => cuentas.find((cuenta) => cuenta.id === id) || null;

  pagos.slice(0, LIMITE_PAGOS_EMPLEO_POR_MENSAJE).forEach((pago) => {
    if (!pago || typeof pago !== "object") return;
    const advertencias = (Array.isArray(pago.dudas) ? pago.dudas : [])
      .map((duda) => limpiar(duda, LIMITE_NOTA))
      .filter(Boolean)
      .slice(0, 4);

    const empresa = resolverEmpleo(pago.empleoId, empleos);
    const fecha = resolverFecha(pago.fecha, advertencias);
    const soloPercepciones = pago.soloPercepciones === true;

    const cuentaExplicita = cuentaPorId(pago.cuentaId);
    const cuenta = cuentaExplicita || (empresa ? cuentaPorId(empresa.cuentaPorDefectoId) : null);

    const horas = Number(pago.horas);
    const horasValidas = Number.isFinite(horas) && horas > 0 && horas <= LIMITE_HORAS ? horas : null;
    let monto = leerMonto(pago.monto);
    if (monto === null && empresa && !soloPercepciones) {
      const esperado = pagoEsperadoEmpresa(empresa);
      const porHoras = empresa.tipoEsquema === "por_horas";
      const calculado = porHoras && horasValidas ? horasValidas * esperado.precio + esperado.extra : esperado.total;
      if (calculado > 0) {
        monto = Math.round(calculado * 100) / 100;
        advertencias.push("No dijiste el monto: usé lo que normalmente cobras en este empleo.");
      }
    }

    const percepciones = [];
    const mencionadas = Array.isArray(pago.percepciones) ? pago.percepciones : [];
    mencionadas.slice(0, 6).forEach((mencion) => {
      if (!empresa) return;
      const percepcion = resolverPercepcion(mencion, empresa);
      if (percepciones.some((fila) => fila.percepcion.id === percepcion.id)) return;
      const montoPercepcion = leerMonto(mencion?.monto) ?? leerMonto(percepcion.monto);
      if (montoPercepcion === null) {
        advertencias.push(`No dijiste cuánto fue de ${percepcion.nombre}; no lo incluí.`);
        return;
      }
      percepciones.push({
        percepcion,
        monto: montoPercepcion,
        cuentaId: cuentaDePercepcion(percepcion, empresa),
        sugerida: false,
      });
    });

    // Las configuradas que tocan en esta fecha, si el usuario reportó su sueldo.
    if (empresa && !soloPercepciones) {
      percepcionesQueAplican(empresa, fecha, registros).forEach((percepcion) => {
        if (percepciones.some((fila) => fila.percepcion.id === percepcion.id) || !(Number(percepcion.monto) > 0)) return;
        percepciones.push({ percepcion, monto: Number(percepcion.monto), cuentaId: cuentaDePercepcion(percepcion, empresa), sugerida: true });
      });
    }

    if (soloPercepciones && percepciones.length === 0) {
      resultado.descartadas.push({ indice: -1, motivo: "No quedó claro qué bono o vales recibiste." });
      return;
    }

    resultado.propuestas.push({
      accion: "pagoEmpleo",
      empresa,
      monto,
      horas: horasValidas,
      fecha,
      cuenta,
      cuentaExplicita: Boolean(cuentaExplicita),
      percepciones,
      soloPercepciones,
      nota: limpiar(pago.nota, LIMITE_NOTA),
      advertencias,
    });
  });

  return resultado;
};

/*
 * Respaldo para un Worker anterior (o un modelo que se equivoque): un
 * "ingreso" cuyo texto habla de sueldo, quincena, nómina o nombra un empleo es
 * en realidad un pago de empleo.
 */
const PALABRAS_PAGO_EMPLEO = /\b(sueldo|salario|quincena|nomina|raya|aguinaldo|vales de despensa|pago de mi (trabajo|empleo|chamba)|me pagaron|me depositaron)\b/;

/* @returns {{ empresa }} (empresa null = sí es pago de empleo pero hay que preguntar cuál) o null. */
export const empleoDeIngresoSuelto = (textoUsuario, nota, empresas = []) => {
  const empleos = empleosActivos(empresas);
  if (empleos.length === 0) return null;
  const texto = normalizar(`${textoUsuario} ${nota}`);
  const nombrados = empleos.filter((empleo) => {
    const nombre = normalizar(empleo.nombre);
    return nombre.length >= 3 && texto.includes(nombre);
  });
  if (nombrados.length === 1) return { empresa: nombrados[0] };
  if (nombrados.length > 1 || PALABRAS_PAGO_EMPLEO.test(texto)) {
    return { empresa: empleos.length === 1 ? empleos[0] : null };
  }
  return null;
};
