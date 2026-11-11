import { useAppStore } from "../stores/useAppStore";
import { agregarMovimiento, eliminarMovimiento, movimientoEntreCuentas } from "./firebase/movimientos";
import {
  ajustarSaldoPorEdicionDeMovimiento,
  modificarCuentaDesdeMovimientoEntreCuentas,
  modificarMontoDesdeMovimiento,
} from "./firebase/cuentas";
import { convertirADatosFecha } from "./utils/fechas";
import { recordarUltimaCuentaUsada, registrarUsoCategoria } from "./utils/preferenciasCaptura";
import { festejarTopo } from "../stores/useTopoStore";

/*
 * Único camino para registrar un movimiento y mover el saldo de su cuenta.
 * Lo usan el modal de captura y el asistente de IA, así que cualquier regla
 * nueva sobre saldos va aquí y no en cada pantalla.
 *
 * Las funciones de Firebase ya avisan al usuario si fallan; aquí solo se corta
 * el flujo para no mover un saldo cuyo movimiento no quedó guardado.
 */

/*
 * La caché local se indexa por el mes del movimiento, no por el mes actual:
 * un gasto fechado en el mes pasado debe caer en el bloque que le toca.
 */
const agregarACacheMovimientos = (movimiento) => {
  const { movimientos, setMovimientos } = useAppStore.getState();
  // Si aún no se cargó ningún mes, la pantalla de movimientos lo traerá completo.
  if (Object.keys(movimientos).length === 0) return;

  const fecha = movimiento?.fechaMovimiento?.toDate
    ? convertirADatosFecha(movimiento.fechaMovimiento.toDate())
    : convertirADatosFecha(new Date());
  const key = `${fecha.anio}${fecha.mes}`;

  setMovimientos((prev) => ({
    ...prev,
    [key]: [...(prev[key] || []), movimiento],
  }));
};

const actualizarCuentasEnStore = (cambiosPorId) => {
  useAppStore.getState().setCuentas((prev) => prev.map((cuenta) => (
    cambiosPorId[cuenta.id] ? { ...cuenta, ...cambiosPorId[cuenta.id] } : cuenta
  )));
};

/**
 * @param valores  Valores del formulario de movimiento (monto como texto o número).
 * @param cuenta   Cuenta completa donde se registra.
 * @param festejar false si quien llama festeja por su cuenta (p. ej. un abono).
 * @returns {{ movimiento, cuenta } | null} cuenta = cuenta con el saldo nuevo.
 */
export const registrarMovimiento = async ({ valores, cuenta, uid, festejar = true }) => {
  const values = {
    ...valores,
    cuentaAsociada: cuenta.id,
    nombreCuenta: cuenta.nombre,
    pagoAMeses: valores.tipoDeMovimiento === "gasto" ? valores.pagoAMeses ?? null : null,
  };

  const movimiento = await agregarMovimiento(values, uid);
  if (!movimiento) return null;

  const cambiosCuenta = await modificarMontoDesdeMovimiento(values, uid, cuenta);
  if (!cambiosCuenta) return null;

  agregarACacheMovimientos(movimiento);
  actualizarCuentasEnStore({ [cuenta.id]: cambiosCuenta });

  // Atajos para la próxima captura: cuenta usada y frecuencia de categoría.
  recordarUltimaCuentaUsada(cuenta.id);
  registrarUsoCategoria(values.categoria);

  if (festejar) {
    festejarTopo(...(values.tipoDeMovimiento === "ingreso"
      ? ["celebrando", "¡Entró dinero!"]
      : ["feliz", "¡Gasto anotado!"]));
  }

  return { movimiento, cuenta: { ...cuenta, ...cambiosCuenta } };
};

/*
 * Un ingreso en una tarjeta de crédito se reparte entre el saldo normal y el de
 * meses sin intereses, y ese reparto no se puede revertir con certeza.
 */
export const puedeDeshacerse = ({ valores, cuenta }) => Boolean(cuenta)
  && !(valores.tipoDeMovimiento === "ingreso" && cuenta.tipoDeCuenta === "credito");

/**
 * Deshace un gasto o ingreso recién guardado con registrarMovimiento: borra el
 * movimiento y regresa su monto al saldo de la cuenta.
 * @param movimiento  El que devolvió registrarMovimiento.
 * @param valores     Los valores con que se guardó (tipo y pago a meses).
 * @returns {{ cuenta } | { sinSaldo: true } | null} null si no se borró nada;
 *          sinSaldo si se borró pero el saldo no se pudo ajustar.
 */
export const deshacerMovimiento = async ({ movimiento, valores, cuenta, uid }) => {
  if (!puedeDeshacerse({ valores, cuenta })) return null;
  if (!(await eliminarMovimiento(movimiento, uid))) return null;

  const { movimientos, setMovimientos } = useAppStore.getState();
  const fecha = convertirADatosFecha(movimiento.fechaMovimiento.toDate());
  const key = `${fecha.anio}${fecha.mes}`;
  if (movimientos[key]) {
    // La sincronización en vivo puede haber cambiado el objeto: se busca también por sus datos.
    const esElMismo = (actual) => actual === movimiento || (
      actual.fechaMovimiento?.seconds === movimiento.fechaMovimiento.seconds
      && actual.fechaMovimiento?.nanoseconds === movimiento.fechaMovimiento.nanoseconds
      && Number(actual.monto) === Number(movimiento.monto)
      && (actual.nota || "") === (movimiento.nota || "")
    );
    setMovimientos((prev) => {
      const indice = (prev[key] || []).findIndex(esElMismo);
      return indice === -1 ? prev : { ...prev, [key]: prev[key].filter((_, posicion) => posicion !== indice) };
    });
  }

  const cambios = await ajustarSaldoPorEdicionDeMovimiento({
    uid,
    cuentaId: cuenta.id,
    montoAnterior: movimiento.monto,
    montoNuevo: 0,
    afectaMSI: cuenta.tipoDeCuenta === "credito" && valores.pagoAMeses === "msi",
  });
  if (!cambios) return { sinSaldo: true };

  actualizarCuentasEnStore({ [cuenta.id]: cambios });
  return { cuenta: { ...cuenta, ...cambios } };
};

/**
 * Transferencia o pago de tarjeta entre dos cuentas del usuario. La categoría
 * se deduce del destino si no se indica: pagar un crédito es "pagoTarjeta".
 * @returns {{ cuentaOrigen, cuentaDestino } | null} ambas con el saldo nuevo.
 */
export const registrarMovimientoEntreCuentas = async ({
  cuentaOrigen,
  cuentaDestino,
  monto,
  nota = "",
  categoria = null,
  uid,
}) => {
  const resultado = await movimientoEntreCuentas(
    cuentaOrigen,
    cuentaDestino,
    {
      monto: Number(monto),
      tipoDeMovimiento: "gasto",
      categoria: categoria || (cuentaDestino.tipoDeCuenta === "credito" ? "pagoTarjeta" : "transferencia"),
      nota,
    },
    uid,
  );
  if (!resultado) return null;

  const [cambiosOrigen, cambiosDestino] = await Promise.all([
    modificarCuentaDesdeMovimientoEntreCuentas(resultado.cuentaOrigen, uid, resultado.cuentaOrigen.id),
    modificarCuentaDesdeMovimientoEntreCuentas(resultado.cuentaDestinoModificada, uid, resultado.cuentaDestinoModificada.id),
  ]);
  if (!cambiosOrigen || !cambiosDestino) return null;

  actualizarCuentasEnStore({
    [cuentaOrigen.id]: cambiosOrigen,
    [cuentaDestino.id]: cambiosDestino,
  });

  festejarTopo(...(cuentaDestino.tipoDeCuenta === "credito"
    ? ["celebrando", "¡Tarjeta pagada!"]
    : ["moneda", "Dinero movido"]));

  return {
    cuentaOrigen: { ...cuentaOrigen, ...cambiosOrigen },
    cuentaDestino: { ...cuentaDestino, ...cambiosDestino },
  };
};
