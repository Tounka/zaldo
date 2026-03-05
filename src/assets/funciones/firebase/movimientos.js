import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "./dbFirebase";
import { convertirTimestampADatosFecha } from "../utils/fechas";
import Swal from "sweetalert2";

/* ──────────────────────────────────────────────
   Helper interno: crea o actualiza el doc mensual
   ────────────────────────────────────────────── */
const _upsertMovimiento = async (ref, movimiento) => {
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    await updateDoc(ref, { movimientos: arrayUnion(movimiento) });
  } else {
    await setDoc(ref, { movimientos: [movimiento] });
  }
};

/* Helper: referencia al doc mensual */
const _refMensual = (uid, fecha) => {
  const doc_ = `${fecha.anio}${String(fecha.mes).padStart(2, "0")}`;
  return doc(db, "usuarios", uid, "movimientos", doc_);
};

export const agregarMovimiento = async (values, uid) => {
  const fechaActual = Timestamp.now();
  const fechaConvertida = convertirTimestampADatosFecha(fechaActual);
  const ref = _refMensual(uid, fechaConvertida);

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

    await _upsertMovimiento(ref, movimientoAEnviar);
    return { ...movimientoAEnviar };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al agregar movimiento, trate de nuevo." });
    return null;
  }
};

export const editarMovimiento = async (movimientoOriginal, values, uid) => {
  try {
    const fecha = convertirTimestampADatosFecha(movimientoOriginal.fechaMovimiento);
    const ref = _refMensual(uid, fecha);
    const docSnap = await getDoc(ref);

    if (!docSnap.exists()) return null;

    const movimientos = docSnap.data().movimientos;

    const movimientosActualizados = movimientos.map(m => {
      if (m.fechaMovimiento.seconds === movimientoOriginal.fechaMovimiento.seconds) {
        let montoNuevo = Number(values.monto);
        if (montoNuevo && m.monto < 0) montoNuevo *= -1;

        return {
          ...m,
          monto: montoNuevo,
          categoria: values.categoria,
          nota: values.nota,
        };
      }
      return m;
    });

    await updateDoc(ref, { movimientos: movimientosActualizados });

    return movimientosActualizados.find(
      m => m.fechaMovimiento.seconds === movimientoOriginal.fechaMovimiento.seconds
    );

  } catch (error) {
    console.error("Error al editar movimiento:", error);
    return null;
  }
};

export const movimientoEntreCuentas = async (cuentaOrigen, cuentaDestino, movimiento, uid) => {
  const fechaActual = Timestamp.now();
  const fechaConvertida = convertirTimestampADatosFecha(fechaActual);
  const ref = _refMensual(uid, fechaConvertida);

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
    };

    let cuentaDestinoModificada = { ...cuentaDestino };
    let montoRecibido = Math.abs(movimientoAEnviar.monto);

    if (cuentaDestino.tipoDeCuenta === "credito") {
      let saldoNormal = Number(cuentaDestino.saldoALaFecha || 0);
      let saldoMSI = Number(cuentaDestino.saldoALaFechaMSI || 0);
      let restante = montoRecibido;

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

      cuentaDestinoModificada.saldoALaFecha = saldoNormal;
      cuentaDestinoModificada.saldoALaFechaMSI = saldoMSI;
    } else {
      cuentaDestinoModificada.saldoALaFecha = cuentaDestino.saldoALaFecha + montoRecibido;
    }

    await _upsertMovimiento(ref, movimientoAEnviar);

    return { cuentaOrigen: cuentaOrigenModificada, movimiento: movimientoAEnviar, cuentaDestinoModificada };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al agregar movimiento, trate de nuevo." });
    return null;
  }
};

export const agregarMovimientoDesdeCambioDeMonto = async (values, uid) => {
  const fechaActual = Timestamp.now();
  const fechaConvertida = convertirTimestampADatosFecha(fechaActual);
  const ref = _refMensual(uid, fechaConvertida);

  try {
    const movimientoAEnviar = {
      fechaMovimiento: fechaActual,
      monto: Number(values.monto),
      cuentaAsociada: values.cuentaAsociada,
      nombreCuenta: values.nombreCuenta,
      categoria: values?.categoria || "",
      nota: values?.nota || "",
    };

    await _upsertMovimiento(ref, movimientoAEnviar);
    return { ...movimientoAEnviar };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al agregar movimiento, trate de nuevo." });
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
    Swal.fire({ icon: "error", title: "Error", text: "Ha sucedido un error al obtener los movimientos." });
    return null;
  }
};
