import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp, updateDoc, FieldValue, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "./dbFirebase";
import { convertirTimestampADatosFecha } from "../utils/fechas";
import { modificarCuenta } from "./cuentas";

export const agregarMovimiento = async (values, uid) => {
  const fechaActual = Timestamp.now(); // Usamos Timestamp.now() para obtener un valor real
  const fechaConvertida = convertirTimestampADatosFecha(fechaActual);

  const documentoAEscribir = `${fechaConvertida.anio}${String(fechaConvertida.mes).padStart(2, '0')}`;
  const ref = doc(db, "usuarios", uid, "movimientos", documentoAEscribir);

  try {
    let montoAEnviar = Number(values.monto);
    if (values.tipoDeMovimiento === "gasto") {
      montoAEnviar *= -1;
    }

    const movimientoAEnviar = {
      fechaMovimiento: fechaActual,
      monto: montoAEnviar,
      cuentaAsociada: values.cuentaAsociada,
      nombreCuenta: values.nombreCuenta,
      categoria: values?.categoria || "",
      nota: values?.nota || "",
    };

    const docSnap = await getDoc(ref);

    if (docSnap.exists()) {
      // Si ya existe, agregamos el nuevo movimiento al arreglo
      await updateDoc(ref, {
        movimientos: arrayUnion(movimientoAEnviar),
      });
    } else {
      // Si no existe, creamos el documento con el primer movimiento
      await setDoc(ref, {
        movimientos: [movimientoAEnviar],
      });
    }

    return { ...movimientoAEnviar };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    alert("Error al agregar movimiento, trate de nuevo");
    return null;
  }
};
export const movimientoEntreCuentas = async (cuentaOrigen, cuentaDestino, movimiento, uid) => {
  const fechaActual = Timestamp.now(); // Usamos Timestamp.now() para obtener un valor real
  const fechaConvertida = convertirTimestampADatosFecha(fechaActual);

  const documentoAEscribir = `${fechaConvertida.anio}${String(fechaConvertida.mes).padStart(2, '0')}`;
  const ref = doc(db, "usuarios", uid, "movimientos", documentoAEscribir);

  try {
    let montoAEnviar = Number(movimiento.monto);
    if (movimiento.tipoDeMovimiento === "gasto") {
      montoAEnviar *= -1;
    }

    const movimientoAEnviar = {
      fechaMovimiento: fechaActual,
      monto: montoAEnviar,
      cuentaAsociada: cuentaOrigen.id,
      nombreCuenta: cuentaOrigen.nombre,
      categoria: movimiento?.categoria || "",
      nota: `Movimiento ${cuentaOrigen?.nombre} a ${cuentaDestino?.nombre} - ${movimiento?.nota}` || "",
      cuentaDestino: cuentaDestino.id,
      cuentaDestinoNombre: cuentaDestino.nombre,
    };

    let cuentaOrigenModificada = {
      ...cuentaOrigen,
      saldoALaFecha: cuentaOrigen.saldoALaFecha + movimientoAEnviar.monto
    }
    let cuentaDestinoModificada = {
      ...cuentaDestino,
      saldoALaFecha: cuentaDestino.saldoALaFecha - movimientoAEnviar.monto
    }




    const docSnap = await getDoc(ref);

    if (docSnap.exists()) {
      // Si ya existe, agregamos el nuevo movimiento al arreglo
      await updateDoc(ref, {
        movimientos: arrayUnion(movimientoAEnviar),
      });
    } else {
      // Si no existe, creamos el documento con el primer movimiento
      await setDoc(ref, {
        movimientos: [movimientoAEnviar],
      });
    }

    

    return { cuentaOrigen: cuentaOrigenModificada, movimiento: movimientoAEnviar, cuentaDestinoModificada: cuentaDestinoModificada };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    alert("Error al agregar movimiento, trate de nuevo");
    return null;
  }

};
export const agregarMovimientoDesdeCambioDeMonto = async (values, uid) => {
  const fechaActual = Timestamp.now(); // Usamos Timestamp.now() para obtener un valor real
  const fechaConvertida = convertirTimestampADatosFecha(fechaActual);

  const documentoAEscribir = `${fechaConvertida.anio}${String(fechaConvertida.mes).padStart(2, '0')}`;
  const ref = doc(db, "usuarios", uid, "movimientos", documentoAEscribir);

  try {

    let montoAEnviar = Number(values.monto);


    const movimientoAEnviar = {
      fechaMovimiento: fechaActual,
      monto: montoAEnviar,
      cuentaAsociada: values.cuentaAsociada,
      nombreCuenta: values.nombreCuenta,
      categoria: values?.categoria || "",
      nota: values?.nota || "",
    };

    const docSnap = await getDoc(ref);

    if (docSnap.exists()) {
      // Si ya existe, agregamos el nuevo movimiento al arreglo
      await updateDoc(ref, {
        movimientos: arrayUnion(movimientoAEnviar),
      });
    } else {
      // Si no existe, creamos el documento con el primer movimiento
      await setDoc(ref, {
        movimientos: [movimientoAEnviar],
      });
    }

    return { ...movimientoAEnviar };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    alert("Error al agregar movimiento, trate de nuevo");
    return null;
  }
};

export const obtenerMovimientosPorAnioMes = async (uid, fecha) => {
  const ref = doc(db, "usuarios", uid, "movimientos", fecha);

  try {
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener movimientos:", error);
    alert("Ha sucedido un error al obtener los movimientos");
    return null;
  }
};
