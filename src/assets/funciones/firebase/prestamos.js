import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    arrayUnion,
} from "firebase/firestore";
import { db } from "./dbFirebase";
import { calcularDiasAtraso, parseYYYYMMDD } from "../prestamosCalculos";

const getRef = (uid) => collection(db, "prestamos", uid, "prestamos");

/**
 * Crea un nuevo préstamo en Firestore.
 * Compatible con asignación de cobradores, periodicidad y soft-delete.
 */
export const crearPrestamo = async (values, uid) => {
    const ref = getRef(uid);
    const ahora = Timestamp.now();

    const prestamo = {
        nombre: values.nombre,
        montoPrestado: Number(values.montoPrestado),
        interesEstimado: Number(values.interesEstimado || 0),
        diasDePago: values.diasDePago ? Number(values.diasDePago) : 15,
        tipoPeriodicidad: values.tipoPeriodicidad || "dias_mes",
        diasMes: Array.isArray(values.diasMes)
            ? values.diasMes.map(Number)
            : values.diasDePago
                ? [Number(values.diasDePago)]
                : [15, 30],
        fechasEspecificas: Array.isArray(values.fechasEspecificas)
            ? values.fechasEspecificas
            : [],
        abonoTeorico: values.abonoTeorico ? Number(values.abonoTeorico) : null,
        numPagos: values.numPagos ? Number(values.numPagos) : null,
        estado: values.estado || "pendiente",
        activo: true, // Soft delete flag
        creadoPor: uid,
        asignadoA: values.asignadoA || null, // UID o email del cobrador asignado
        asignadoANombre: values.asignadoANombre || null,
        cobradoresAsignados: values.asignadoA ? [values.asignadoA] : [],
        fechaInicio: values.fechaInicio
            ? Timestamp.fromDate(new Date(values.fechaInicio + "T12:00:00"))
            : ahora,
        fechaCreacion: ahora,
        fechaModificacion: ahora,
        pagos: [],
    };

    try {
        const docRef = await addDoc(ref, prestamo);
        return { id: docRef.id, ...prestamo };
    } catch (error) {
        console.error("Error al crear préstamo:", error);
        throw error;
    }
};

/**
 * Obtiene todos los préstamos pendientes del usuario (excluyendo soft-deleted).
 */
export const obtenerPrestamosPendientes = async (uid) => {
    const ref = getRef(uid);
    try {
        const q = query(ref, where("estado", "==", "pendiente"));
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => p.activo !== false);
    } catch (error) {
        console.error("Error al obtener préstamos:", error);
        return [];
    }
};

/**
 * Obtiene todos los préstamos para la vista de cobranza/admin con soporte de filtrado de asignación.
 * Si usuarioActual no es admin, se devuelven sólo los préstamos asignados a su UID/email o creados por él.
 */
export const obtenerTodosPrestamos = async (uid, incluirInactivos = false, usuarioActual = null) => {
    const ref = getRef(uid);
    try {
        const snap = await getDocs(ref);
        let lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (!incluirInactivos) {
            lista = lista.filter((p) => p.activo !== false);
        }

        // Filtro por cobrador asignado si el usuario no es admin
        if (usuarioActual && usuarioActual.admin !== true && !usuarioActual.nombres?.includes("Luis Ramon")) {
            const userUid = usuarioActual.uid;
            const userEmail = usuarioActual.email;
            lista = lista.filter((p) => {
                const asignado = p.asignadoA === userUid || p.asignadoA === userEmail;
                const enLista = Array.isArray(p.cobradoresAsignados) && (
                    p.cobradoresAsignados.includes(userUid) || p.cobradoresAsignados.includes(userEmail)
                );
                const creadoPorEl = p.creadoPor === userUid;
                // Si el préstamo no tiene asignación explícita, se permite ver por defecto
                const sinAsignar = !p.asignadoA && (!p.cobradoresAsignados || p.cobradoresAsignados.length === 0);
                return asignado || enLista || creadoPorEl || sinAsignar;
            });
        }

        return lista;
    } catch (error) {
        console.error("Error al obtener todos los préstamos:", error);
        return [];
    }
};

/**
 * Agrega un pago al array de pagos del préstamo (compatibilidad hacia atrás).
 */
export const agregarPago = async (uid, prestamoId, nuevoPago) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const ahora = Timestamp.now();
    const pagoId = "pago_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

    const pago = {
        id: pagoId,
        numeroPago: Number(nuevoPago.numeroPago || 1),
        fecha: nuevoPago.fecha instanceof Date
            ? Timestamp.fromDate(nuevoPago.fecha)
            : nuevoPago.fecha || ahora,
        monto: Number(nuevoPago.monto),
        imagenUrl: nuevoPago.imagenUrl || null,
        ordenFecha: nuevoPago.ordenFecha || null,
        diasAtraso: Number(nuevoPago.diasAtraso || 0),
        atrasado: Boolean(nuevoPago.diasAtraso > 0),
        saldoAnterior: Number(nuevoPago.saldoAnterior || 0),
        saldoRestante: Number(nuevoPago.saldoRestante || 0),
        pagado: true,
        transferidoAlAdmin: nuevoPago.transferidoAlAdmin !== undefined ? nuevoPago.transferidoAlAdmin : false,
        fechaTransferencia: nuevoPago.transferidoAlAdmin ? ahora : null,
        registradoPor: nuevoPago.registradoPor || uid,
    };

    try {
        await updateDoc(ref, {
            pagos: arrayUnion(pago),
            fechaModificacion: ahora,
        });
        return pago;
    } catch (error) {
        console.error("Error al agregar pago:", error);
        throw error;
    }
};

/**
 * Registra o actualiza el cobro de una orden de pago específica calculando número de pago, atrasos y saldo restante.
 */
export const registrarCobroOrden = async (uid, prestamoId, datosCobro) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const ahora = Timestamp.now();

    try {
        const docSnap = await getDoc(ref);
        if (!docSnap.exists()) throw new Error("Préstamo no encontrado");

        const prestamo = docSnap.data();
        const pagosExistentes = [...(prestamo.pagos || [])];
        const ordenFecha = datosCobro.ordenFecha;

        // Buscar si ya existía un pago registrado para esta fecha de orden
        const indexExistente = pagosExistentes.findIndex(
            (p) => p.ordenFecha === ordenFecha || (p.id && p.id === datosCobro.pagoId)
        );

        if (datosCobro.yaPago === false) {
            // Desmarcar pago
            if (indexExistente >= 0) {
                pagosExistentes.splice(indexExistente, 1);
            }
        } else {
            // Calcular número de pago
            const numPago = datosCobro.numeroPago || (indexExistente >= 0
                ? (pagosExistentes[indexExistente].numeroPago || indexExistente + 1)
                : pagosExistentes.length + 1);

            // Calcular días de atraso
            const fechaCobroDate = datosCobro.fecha ? new Date(datosCobro.fecha + "T12:00:00") : new Date();
            const diasAtraso = calcularDiasAtraso(ordenFecha, fechaCobroDate);

            // Calcular saldo previo de otros pagos
            const totalOtrosPagos = pagosExistentes
                .filter((_, idx) => idx !== indexExistente)
                .reduce((acc, p) => acc + Number(p.monto || 0), 0);

            const saldoAnterior = Math.max(0, Number(prestamo.montoPrestado || 0) - totalOtrosPagos);
            const saldoRestante = Math.max(0, saldoAnterior - Number(datosCobro.monto || 0));

            const nuevoPagoObj = {
                id: indexExistente >= 0
                    ? pagosExistentes[indexExistente].id
                    : "pago_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                numeroPago: numPago,
                fecha: Timestamp.fromDate(fechaCobroDate),
                monto: Number(datosCobro.monto || 0),
                ordenFecha: ordenFecha,
                diasAtraso: diasAtraso,
                atrasado: diasAtraso > 0,
                saldoAnterior: saldoAnterior,
                saldoRestante: saldoRestante,
                pagado: true,
                transferidoAlAdmin: Boolean(datosCobro.transferidoAlAdmin),
                fechaTransferencia: datosCobro.transferidoAlAdmin ? ahora : null,
                registradoPor: datosCobro.registradoPor || uid,
                imagenUrl: datosCobro.imagenUrl || null,
            };

            if (indexExistente >= 0) {
                pagosExistentes[indexExistente] = {
                    ...pagosExistentes[indexExistente],
                    ...nuevoPagoObj,
                };
            } else {
                pagosExistentes.push(nuevoPagoObj);
            }
        }

        // Calcular nuevo estado del préstamo
        const totalPagado = pagosExistentes.reduce((acc, p) => acc + Number(p.monto || 0), 0);
        let nuevoEstado = prestamo.estado;
        if (prestamo.montoPrestado && totalPagado >= Number(prestamo.montoPrestado)) {
            nuevoEstado = "pagado";
        } else {
            nuevoEstado = "pendiente";
        }

        await updateDoc(ref, {
            pagos: pagosExistentes,
            estado: nuevoEstado,
            fechaModificacion: ahora,
        });

        return { pagos: pagosExistentes, estado: nuevoEstado };
    } catch (error) {
        console.error("Error al registrar cobro de orden:", error);
        throw error;
    }
};

/**
 * Actualiza el estado de transferencia al admin de un pago.
 */
export const actualizarTransferenciaPago = async (uid, prestamoId, pagoId, transferidoAlAdmin) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const ahora = Timestamp.now();

    try {
        const docSnap = await getDoc(ref);
        if (!docSnap.exists()) throw new Error("Préstamo no encontrado");

        const prestamo = docSnap.data();
        const pagosActualizados = (prestamo.pagos || []).map((p) => {
            if (p.id === pagoId || (p.ordenFecha && p.ordenFecha === pagoId)) {
                return {
                    ...p,
                    transferidoAlAdmin: Boolean(transferidoAlAdmin),
                    fechaTransferencia: transferidoAlAdmin ? ahora : null,
                };
            }
            return p;
        });

        await updateDoc(ref, {
            pagos: pagosActualizados,
            fechaModificacion: ahora,
        });

        return pagosActualizados;
    } catch (error) {
        console.error("Error al actualizar estado de transferencia:", error);
        throw error;
    }
};

/**
 * Modifica los datos de un préstamo existente (edición por Admin/Cobrador).
 */
export const modificarPrestamo = async (uid, prestamoId, data) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const ahora = Timestamp.now();

    const dataActualizada = {
        ...data,
        fechaModificacion: ahora,
    };

    if (data.montoPrestado !== undefined) dataActualizada.montoPrestado = Number(data.montoPrestado);
    if (data.interesEstimado !== undefined) dataActualizada.interesEstimado = Number(data.interesEstimado);
    if (data.abonoTeorico !== undefined) dataActualizada.abonoTeorico = data.abonoTeorico ? Number(data.abonoTeorico) : null;
    if (data.numPagos !== undefined) dataActualizada.numPagos = data.numPagos ? Number(data.numPagos) : null;
    if (data.diasDePago !== undefined) dataActualizada.diasDePago = Number(data.diasDePago);
    if (data.asignadoA !== undefined) {
        dataActualizada.asignadoA = data.asignadoA;
        dataActualizada.cobradoresAsignados = data.asignadoA ? [data.asignadoA] : [];
    }

    try {
        await updateDoc(ref, dataActualizada);
        return { id: prestamoId, ...dataActualizada };
    } catch (error) {
        console.error("Error al modificar préstamo:", error);
        throw error;
    }
};

/**
 * Soft Delete: Oculta el préstamo para que no figure en cobros ni cálculos activos.
 */
export const softDeletePrestamo = async (uid, prestamoId) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    try {
        await updateDoc(ref, {
            activo: false,
            fechaModificacion: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error("Error al ocultar préstamo:", error);
        return false;
    }
};

/**
 * Reactiva un préstamo previamente oculto.
 */
export const reactivarPrestamo = async (uid, prestamoId) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    try {
        await updateDoc(ref, {
            activo: true,
            fechaModificacion: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error("Error al reactivar préstamo:", error);
        return false;
    }
};

/**
 * Marca un préstamo como pagado.
 */
export const marcarPrestamoPagado = async (uid, prestamoId) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    try {
        await updateDoc(ref, {
            estado: "pagado",
            fechaModificacion: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error("Error al marcar préstamo como pagado:", error);
        return false;
    }
};
