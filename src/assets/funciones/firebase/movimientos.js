import { doc, setDoc, Timestamp, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
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

/*
 * Resuelve la fecha del movimiento. Si el formulario mandó una fecha (YYYY-MM-DD)
 * se respeta; si no, se usa el momento actual. Se conserva la hora real cuando la
 * fecha elegida es hoy, para que el orden dentro del día siga siendo el de captura.
 */
const _resolverFechaMovimiento = (fechaElegida) => {
  if (!fechaElegida) return Timestamp.now();

  const [anio, mes, dia] = String(fechaElegida).split("-").map(Number);
  if (!anio || !mes || !dia) return Timestamp.now();

  const ahora = new Date();
  const esHoy = anio === ahora.getFullYear()
    && mes === ahora.getMonth() + 1
    && dia === ahora.getDate();

  if (esHoy) return Timestamp.now();

  // Mediodía: evita que el cambio de huso mueva el movimiento al día vecino.
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 12, 0, 0));
};

export const agregarMovimiento = async (values, uid) => {
  const fechaActual = _resolverFechaMovimiento(values?.fechaMovimiento);
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
      esPersonal: values.tipoDeMovimiento === "gasto" && Boolean(values?.esPersonal),
    };

    await _upsertMovimiento(ref, movimientoAEnviar);
    return { ...movimientoAEnviar };
  } catch (error) {
    console.error("Error al agregar movimiento:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Error al agregar movimiento, trate de nuevo." });
    return null;
  }
};

const mismoTimestamp = (a, b) => Boolean(
  a && b
  && Number(a.seconds) === Number(b.seconds)
  && Number(a.nanoseconds || 0) === Number(b.nanoseconds || 0)
);

// Los documentos anteriores al cambio no siempre traen `esTransferencia`,
// pero sí la cuenta de destino o la categoría. Mantener esta inferencia aquí
// evita que al editar uno de esos registros vuelva a quedar como gasto real.
const movimientoEsInterno = (movimiento = {}) => Boolean(
  movimiento.esTransferencia
  || movimiento.cuentaDestino
  || movimiento.cuentaDestinoNombre
  || movimiento.tipoOperacion === "transferencia"
  || movimiento.tipoOperacion === "pago_tarjeta"
  || movimiento.esAjusteSaldo === true
  || ["transferencia", "pagoTarjeta", "ajusteDeSaldo", "ajusteDeSaldoMSI"].includes(movimiento.categoria)
);

export const editarMovimiento = async (movimientoOriginal, values, uid) => {
  try {
    const fecha = convertirTimestampADatosFecha(movimientoOriginal.fechaMovimiento);
    const ref = _refMensual(uid, fecha);
    const docSnap = await getDoc(ref);

    if (!docSnap.exists()) return null;

    const movimientos = docSnap.data().movimientos;

    const movimientosActualizados = movimientos.map(m => {
      if (mismoTimestamp(m.fechaMovimiento, movimientoOriginal.fechaMovimiento)) {
        let montoNuevo = Number(values.monto);
        if (montoNuevo && m.monto < 0) montoNuevo *= -1;

        return {
          ...m,
          monto: montoNuevo,
          categoria: values.categoria,
          nota: values.nota,
          esPersonal: movimientoEsInterno(m)
            ? false
            : values.esPersonal !== undefined
            ? Boolean(values.esPersonal)
            : Boolean(m.esPersonal || (m.categoria === "personal" && m.monto < 0)),
          ignorarEnResumen: values.ignorarEnResumen !== undefined
            ? Boolean(values.ignorarEnResumen)
            : Boolean(m.ignorarEnResumen),
        };
      }
      return m;
    });

    await updateDoc(ref, { movimientos: movimientosActualizados });

    return movimientosActualizados.find((m) => (
      mismoTimestamp(m.fechaMovimiento, movimientoOriginal.fechaMovimiento)
    ));

  } catch (error) {
    console.error("Error al editar movimiento:", error);
    return null;
  }
};

export const actualizarEsPersonalMovimiento = async (movimientoOriginal, esPersonal, uid) => {
  try {
    const fecha = convertirTimestampADatosFecha(movimientoOriginal.fechaMovimiento);
    const ref = _refMensual(uid, fecha);
    const docSnap = await getDoc(ref);

    if (!docSnap.exists()) return null;

    const movimientosActualizados = (docSnap.data().movimientos || []).map((movimiento) => (
      mismoTimestamp(movimiento.fechaMovimiento, movimientoOriginal.fechaMovimiento)
        ? { ...movimiento, esPersonal: movimientoEsInterno(movimiento) ? false : Boolean(esPersonal) }
        : movimiento
    ));

    await updateDoc(ref, { movimientos: movimientosActualizados });

    return movimientosActualizados.find((movimiento) => (
      mismoTimestamp(movimiento.fechaMovimiento, movimientoOriginal.fechaMovimiento)
    )) || null;
  } catch (error) {
    console.error("Error al actualizar la clasificación del movimiento:", error);
    Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar la clasificación del movimiento." });
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
      nota: `Movimiento ${cuentaOrigen?.nombre} a ${cuentaDestino?.nombre} - ${movimiento?.nota || ""}`,
      cuentaDestino: cuentaDestino.id,
      cuentaDestinoNombre: cuentaDestino.nombre,
      // Es una salida de una cuenta y entrada a otra del mismo usuario: nunca
      // debe participar como gasto/ingreso en los reportes personales.
      esTransferencia: true,
      tipoOperacion: movimiento?.categoria === "pagoTarjeta" ? "pago_tarjeta" : "transferencia",
      esPersonal: false,
    };

    let cuentaOrigenModificada = {
      ...cuentaOrigen,
      saldoALaFecha: Number(cuentaOrigen.saldoALaFecha || 0) + movimientoAEnviar.monto
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
      cuentaDestinoModificada.saldoALaFecha = Number(cuentaDestino.saldoALaFecha || 0) + montoRecibido;
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
      esAjusteSaldo: true,
      esPersonal: false,
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

/**
 * Carga los doce documentos mensuales de un año para los paneles analíticos.
 * Los meses sin movimientos se omiten para mantener el resultado compacto.
 */
export const obtenerMovimientosPorAnio = async (uid, anio) => {
  const meses = Array.from({ length: 12 }, (_, index) => `${anio}${String(index + 1).padStart(2, "0")}`);

  try {
    const documentos = await Promise.all(
      meses.map((mes) => getDoc(doc(db, "usuarios", uid, "movimientos", mes)))
    );

    return documentos.flatMap((snapshot) => snapshot.exists() ? (snapshot.data().movimientos || []) : []);
  } catch (error) {
    console.error("Error al obtener movimientos del año:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Ha sucedido un error al obtener el resumen anual." });
    return [];
  }
};
