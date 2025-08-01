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


export const modificarCuentaDesdeMovimientoEntreCuentas = async (values, uid, cuentaId) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();
  let saldoALaFechaAEnviar = Number(values.saldoALaFecha);

  // Define la base de dataActualizada una sola vez
  let dataActualizada = {
    saldoALaFecha: saldoALaFechaAEnviar,
    fechaDeModificacion: fechaActual,
  };

  try {
    await updateDoc(ref, dataActualizada);

    return dataActualizada

  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    alert("Ha sucedido un error al actualizar");
    return false;
  }
};
export const modificarCuenta = async (values, uid, cuentaId) => {
  const ref = doc(db, "usuarios", uid, "cuentas", cuentaId);
  const fechaActual = Timestamp.now();
  let saldoALaFechaAEnviar = Number(values.saldoALaFecha);

  // Define la base de dataActualizada una sola vez
  let dataActualizada = {
    saldoALaFecha: saldoALaFechaAEnviar,
    fechaDeModificacion: fechaActual,
  };

  // Ajusta el saldo solo si es una cuenta de crédito
  if (values.tipoDeCuenta === "credito") {
    // Multiplica por -1, incluso si es 0, para mantener la consistencia
    dataActualizada.saldoALaFecha = saldoALaFechaAEnviar * -1;
  }

  if (values.tipoDeCuenta === "debito") {
    dataActualizada.tipoDeDebito = values.tipoDeDebito || "liquido";
  }

  try {
    await updateDoc(ref, dataActualizada);

    return dataActualizada

  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    alert("Ha sucedido un error al actualizar");
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


export const modificarMontoDesdeMovimiento = async (movimiento, uid, cuentaSeleccioanada) => {
  const ref = doc(db, "usuarios", uid, "cuentas", movimiento.cuentaAsociada);
  console.log(movimiento, cuentaSeleccioanada)

  console.log("----")
  console.log(movimiento.cuentaAsociada, cuentaSeleccioanada.id)
  const fechaActual = Timestamp.now();
  let montoDelMovimiento = movimiento.monto;
  if (movimiento.tipoDeMovimiento === "gasto") {
    montoDelMovimiento = montoDelMovimiento * -1;
  }
  let dataActualizada = {
    saldoALaFecha: Number(cuentaSeleccioanada.saldoALaFecha) + Number(montoDelMovimiento),
    fechaDeModificacion: fechaActual,
  };
  try {
    await updateDoc(ref, dataActualizada);

    return {
      ...dataActualizada,
      id: movimiento.cuentaAsociada,
    };
  } catch (error) {

    alert("Ha sucedido un error al actualizar la información");
    return false;
  }
}