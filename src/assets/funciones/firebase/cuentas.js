import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "./dbFirebase";
export const altaDeCuenta = async (values, uid) => {
  const ref = collection(db, "usuarios", uid, "cuentas");
  try {
    const fechaActual = Timestamp.now();
    let cuentaAEnviar = {
      nombre: values.nombreCuenta,
      tipoDeCuenta: values.tipoDeCuenta,
      institucionAsociada: values.institucionAsociada,
      fechaDeCreacion: fechaActual,
      fechaDeModificacion: fechaActual,
      activo: true,
      saldoALaFecha: 0,
    }
    if (values.tipoDeCuenta === "credito") {
      cuentaAEnviar.saldoALaFecha = 0
    }
    if (values.tipoDeCuenta === "debito") {
      cuentaAEnviar.tipoDeDebito = "liquido"
    }
    const docRef = await addDoc(ref, cuentaAEnviar);

    return { id: docRef.id, ...cuentaAEnviar };
  } catch (error) {
    alert("Error al agregar cuenta, trate de nuevo");
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
    alert("Error al obtener cuentas");
    console.log(error)
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
    saldoMSI: cuenta.saldoMSI ?? 0,
    fechaDeModificacion: fechaActual,
  };

  try {
    await updateDoc(ref, dataActualizada);
    return dataActualizada;
  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    alert("Ha sucedido un error al actualizar");
    return false;
  }
};


export const modificarCuenta = async (values, uid, cuentaId) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();

  const dataActualizada = {
    fechaDeModificacion: fechaActual,
  };

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


export const modificarInformacionCuenta = async (values, uid, cuentaId) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();
  console.log(values, "values")

  let dataActualizada = {
    nombre: String(values.nombre),
    fechaDeModificacion: fechaActual,
  };

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
    alert("Ha sucedido un error al actualizar");
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
     CUENTAS NO CRÉDITO
  ======================= */
  if (!esCredito) {
    saldoNormal += esGasto ? -monto : monto;
  }

  /* =======================
     CRÉDITO - GASTOS
  ======================= */
  if (esCredito && esGasto) {
    if (esMSI) {
      saldoMSI += monto;
    } else {
      saldoNormal += monto;
    }
  }

  /* =======================
     CRÉDITO - INGRESOS (PAGOS)
     Prioridad:
     1. Normal
     2. MSI
     3. Normal (a favor)
  ======================= */
  if (esCredito && esIngreso) {
    let restante = monto;

    // 1️⃣ Pagar saldo normal
    if (saldoNormal > 0) {
      const pago = Math.min(restante, saldoNormal);
      saldoNormal -= pago;
      restante -= pago;
    }

    // 2️⃣ Pagar MSI
    if (restante > 0 && saldoMSI > 0) {
      const pago = Math.min(restante, saldoMSI);
      saldoMSI -= pago;
      restante -= pago;
    }

    // 3️⃣ Excedente → saldo a favor
    if (restante > 0) {
      saldoNormal -= restante;
    }
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
    alert("Error al actualizar la información");
    return false;
  }
};

