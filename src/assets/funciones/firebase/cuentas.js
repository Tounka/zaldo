import { collection, getDocs, getDoc, query, doc, addDoc, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "./dbFirebase";
import Swal from "sweetalert2";
import { convertirValorLiquidez } from "../utils/cuentas";

export const altaDeCuenta = async (values, uid) => {
  const ref = collection(db, "usuarios", uid, "cuentas");
  try {
    const fechaActual = Timestamp.now();
    const esLiquida = convertirValorLiquidez(
      values.esLiquida,
      values.tipoDeCuenta !== "credito" && values.tipoDeCuenta !== "inversion"
    );
    let cuentaAEnviar = {
      nombre: values.nombreCuenta,
      tipoDeCuenta: values.tipoDeCuenta,
      institucionAsociada: values.institucionAsociada,
      fechaDeCreacion: fechaActual,
      fechaDeModificacion: fechaActual,
      activo: true,
      saldoALaFecha: 0,
      esLiquida,
    }
    if (values.tipoDeCuenta === "credito") {
      cuentaAEnviar.saldoALaFecha = 0
    }
    if (values.tipoDeCuenta === "debito") {
      cuentaAEnviar.tipoDeDebito = esLiquida ? "liquido" : "noLiquido"
    }
    const docRef = await addDoc(ref, cuentaAEnviar);

    return { id: docRef.id, ...cuentaAEnviar };
  } catch {
    Swal.fire({ icon: "error", title: "Error", text: "Error al agregar cuenta, trate de nuevo." });
    return null;
  }

}



export const obtenerCuentas = async (uid) => {
  const ref = collection(db, "usuarios", uid, "cuentas");

  try {
    const q = query(ref, where("activo", "==", true));
    const querySnapshot = await getDocs(q);

    const cuentas = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return cuentas;

  } catch (error) {
    console.error(error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al obtener cuentas." });
    return [];
  }
};


export const modificarCuentaDesdeMovimientoEntreCuentas = async (
  cuenta,
  uid,
  cuentaId
) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();

  const dataActualizada = {
    saldoALaFecha: Number(cuenta.saldoALaFecha),
    fechaDeModificacion: fechaActual,
  };

  if (cuenta.saldoALaFechaMSI !== undefined) {
    dataActualizada.saldoALaFechaMSI = Number(cuenta.saldoALaFechaMSI);
  }

  try {
    await updateDoc(ref, dataActualizada);
    return dataActualizada;
  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Ha sucedido un error al actualizar." });
    return false;
  }
};


export const modificarCuenta = async (values, uid, cuentaId) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();

  const dataActualizada = {
    fechaDeModificacion: fechaActual,
  };

  if (values.esLiquida !== undefined) {
    dataActualizada.esLiquida = convertirValorLiquidez(values.esLiquida);
  }

  if (values.saldoALaFecha !== undefined) {
    dataActualizada.saldoALaFecha = Number(values.saldoALaFecha);
  }

  if (values.saldoALaFechaMSI !== undefined) {
    dataActualizada.saldoALaFechaMSI = Number(values.saldoALaFechaMSI);
  }

  try {
    await updateDoc(ref, dataActualizada);
    return dataActualizada;
  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    return false;
  }
};


/*
 * Aplica al saldo la diferencia entre el monto viejo y el nuevo de un movimiento
 * ya registrado. Se usa al editar: antes, corregir un error de dedo dejaba la
 * cuenta descuadrada y había que ajustarla aparte.
 *
 * Solo mueve la diferencia, no recalcula el saldo entero, así que no depende de
 * que la cuenta en memoria esté fresca. El signo ya viene incluido en los montos
 * (los gastos son negativos), por eso basta con sumar la diferencia.
 */
export const ajustarSaldoPorEdicionDeMovimiento = async ({
  uid,
  cuentaId,
  montoAnterior,
  montoNuevo,
  afectaMSI = false,
}) => {
  const diferencia = Number(montoNuevo) - Number(montoAnterior);
  if (!cuentaId || !Number.isFinite(diferencia) || diferencia === 0) return null;

  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const cuenta = snap.data();
    const campo = afectaMSI ? "saldoALaFechaMSI" : "saldoALaFecha";
    const saldoActualizado = Number(cuenta[campo] || 0) + diferencia;

    const dataActualizada = {
      [campo]: saldoActualizado,
      fechaDeModificacion: Timestamp.now(),
    };

    await updateDoc(ref, dataActualizada);
    return dataActualizada;
  } catch (error) {
    console.error("Error al ajustar el saldo tras editar el movimiento:", error);
    return null;
  }
};

export const modificarInformacionCuenta = async (values, uid, cuentaId) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();

  let dataActualizada = {
    nombre: String(values.nombre),
    fechaDeModificacion: fechaActual,
  };

  if (values.esLiquida !== undefined) {
    dataActualizada.esLiquida = convertirValorLiquidez(values.esLiquida);
  }

  if (values.fondoTarjeta !== undefined) {
    dataActualizada.fondoTarjeta = Number(values.fondoTarjeta);
  }

  if (values.preferida !== undefined) {
    dataActualizada.preferida = Boolean(values.preferida);
  }

  if (values.beneficiosMarkdown !== undefined) {
    dataActualizada.beneficiosMarkdown = String(values.beneficiosMarkdown);
  }

  // Crédito
  if (values.tipoDeCuenta === "credito") {
    if (values.fechaDeCorte !== undefined) {
      dataActualizada.fechaDeCorte = Number(values.fechaDeCorte);
    }
    if (values.limiteDeCredito !== undefined) {
      dataActualizada.limiteDeCredito = Number(values.limiteDeCredito);
    }
  }
  // Débito
  if (values.tipoDeCuenta === "debito") {
    if (values.tipoDeDebito !== undefined) {
      dataActualizada.tipoDeDebito = String(values.tipoDeDebito);
    }
    if (values.metaDeAhorro !== undefined) {
      dataActualizada.metaDeAhorro = Number(values.metaDeAhorro);
    }
  }
  // Efectivo
  if (values.tipoDeCuenta === "efectivo") {
    if (values.tipoDeEfectivo !== undefined) {
      dataActualizada.tipoDeEfectivo = String(values.tipoDeEfectivo);
    }
    if (values.metaDeAhorro !== undefined) {
      dataActualizada.metaDeAhorro = Number(values.metaDeAhorro);
    }
  }
  // Inversión
  if (values.tipoDeCuenta === "inversion") {
    if (values.saldoALaFecha !== undefined) {
      dataActualizada.saldoALaFecha = Number(values.saldoALaFecha);
    }
    if (values.saldoFinalInversion !== undefined) {
      dataActualizada.saldoFinalInversion = Number(values.saldoFinalInversion);
    }
    if (values.saldoInicialInversion !== undefined) {
      dataActualizada.saldoInicialInversion = Number(values.saldoInicialInversion);
    }
    if (values.fechaInicioInversion !== undefined) {
      dataActualizada.fechaInicioInversion = Timestamp.fromDate(new Date(values.fechaInicioInversion));
    }

    if (values.fechaFinalInversion !== undefined) {
      dataActualizada.fechaFinalInversion = Timestamp.fromDate(new Date(values.fechaFinalInversion));
    }
  }


  try {
    await updateDoc(ref, dataActualizada);
    return {
      ...dataActualizada,
      id: cuentaId,
    };
  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Ha sucedido un error al actualizar." });
    return false;
  }
};


export const modificarMontoDesdeMovimiento = async (
  movimiento,
  uid,
  cuenta
) => {
  const ref = doc(db, "usuarios", uid, "cuentas", movimiento.cuentaAsociada);
  const fechaActual = Timestamp.now();

  const monto = Number(movimiento.monto);
  const esCredito = cuenta.tipoDeCuenta === "credito";
  const esGasto = movimiento.tipoDeMovimiento === "gasto";
  const esIngreso = movimiento.tipoDeMovimiento === "ingreso";
  const esMSI = movimiento.pagoAMeses === "msi";

  let saldoNormal = Number(cuenta.saldoALaFecha || 0);
  let saldoMSI = Number(cuenta.saldoALaFechaMSI || 0);

  /* =======================
     GASTOS
     ======================= */
  if (esGasto) {
    if (esCredito && esMSI) {
      saldoMSI -= monto;
    } else {
      saldoNormal -= monto;
    }
  }

  /* =======================
     INGRESOS (CRÉDITO)
     Prioridad:
     1. saldoNormal
     2. saldoMSI
     3. excedente
     ======================= */
  if (esIngreso && esCredito) {
    let restante = monto;

    if (saldoNormal < 0) {
      const pago = Math.min(restante, Math.abs(saldoNormal));
      saldoNormal += pago;
      restante -= pago;
    }

    if (restante > 0 && saldoMSI < 0) {
      const pago = Math.min(restante, Math.abs(saldoMSI));
      saldoMSI += pago;
      restante -= pago;
    }

    if (restante > 0) {
      saldoNormal += restante;
    }
  }

  /* =======================
     INGRESOS NO CRÉDITO
     ======================= */
  if (esIngreso && !esCredito) {
    saldoNormal += monto;
  }

  const dataActualizada = {
    saldoALaFecha: saldoNormal,
    saldoALaFechaMSI: saldoMSI,
    fechaDeModificacion: fechaActual,
  };

  try {
    await updateDoc(ref, dataActualizada);
    return { ...dataActualizada, id: cuenta.id };
  } catch (error) {
    console.error("Error al actualizar cuenta:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al actualizar la información." });
    return false;
  }
};
