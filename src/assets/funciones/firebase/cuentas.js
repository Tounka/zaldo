import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "./dbFirebase";
export const altaDeCuenta = async (values, uid) => {
  const ref = collection(db, "usuarios", uid, "cuentas");
  try {
    const fechaActual = Timestamp.now();
    const cuentaAEnviar = {
      nombre: values.nombreCuenta,
      tipoDeCuenta: values.tipoDeCuenta,
      institucionAsociada: values.institucionAsociada,
      fechaDeCreacion: fechaActual,
      fechaDeModificacion: fechaActual,
      activo: true,
      saldoALaFecha: 0,

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

  let dataActualizada = {
    nombre: String(values.nombre),
    fechaDeModificacion: fechaActual,
  };

  // Solo agrega fechaLimiteDePago si está definida
  if (values.fechaLimiteDePago !== undefined) {
    dataActualizada.fechaLimiteDePago = Number(values.fechaLimiteDePago);
  }

  try {
    await updateDoc(ref, dataActualizada);
    
    return {
      ...dataActualizada,
      id: cuentaId, // útil si necesitas mantener el ID
    };
  } catch (error) {
    console.error("Error al actualizar la cuenta:", error);
    alert("Ha sucedido un error al actualizar");
    return false;
  }
};