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
    writeBatch,
} from "firebase/firestore";
import { db } from "./dbFirebase";
import { calcularDiasAtraso } from "../prestamosCalculos";

const getRef = (uid) => collection(db, "prestamos", uid, "prestamos");

export const PRESTAMOS_INICIALES = [
    {
        idClave: "prestamo_80k_30ago",
        nombre: "Préstamo $80k (30 Ago)",
        montoPrestado: 80000,
        interesEstimado: 10000,
        tipoPeriodicidad: "fechas_especificas",
        fechasEspecificas: ["2026-08-30"],
        diasMes: [30],
        diasDePago: 30,
        abonoTeorico: 90000,
        numPagos: 1,
        fechaInicio: "2026-08-01",
        notas: "A pagar el 30 de agosto: $80,000 capital + $10,000 de interés",
        estado: "pendiente",
        activo: true,
        pagos: [],
    },
    {
        idClave: "prestamo_20k_mama",
        nombre: "Amigo de mi mamá (20k)",
        montoPrestado: 20000,
        interesEstimado: 1000,
        tipoPeriodicidad: "fechas_especificas",
        fechasEspecificas: ["2026-08-22"],
        diasMes: [22],
        diasDePago: 22,
        abonoTeorico: 21000,
        numPagos: 1,
        fechaInicio: "2026-08-01",
        notas: "A pagar el 22 de agosto: $20,000 capital + $1,000 de interés",
        estado: "pendiente",
        activo: true,
        pagos: [],
    },
    {
        idClave: "prestamo_10k_tianorma",
        nombre: "Tía Norma (10k)",
        montoPrestado: 10000,
        interesEstimado: 0,
        tipoPeriodicidad: "dias_mes",
        diasMes: [15, 30],
        diasDePago: 15,
        abonoTeorico: 500,
        numPagos: 20,
        fechaInicio: "2026-08-15",
        notas: "A pagar cada quincena $500 (15 y 30/fin de mes). Seguimiento de pagos acumulados.",
        estado: "pendiente",
        activo: true,
        pagos: [],
    },
    {
        idClave: "prestamo_13k_amigotianorma",
        nombre: "Amigo de tía Norma (13k)",
        montoPrestado: 13000,
        interesEstimado: 0,
        tipoPeriodicidad: "dias_mes",
        diasMes: [15, 30],
        diasDePago: 15,
        abonoTeorico: 1000,
        numPagos: 13,
        fechaInicio: "2026-08-15",
        notas: "Préstamo de $13,000 a amigo de tía Norma",
        estado: "pendiente",
        activo: true,
        pagos: [],
    },
];

/**
 * Sincroniza y crea los préstamos iniciales si no existen aún en la cuenta del usuario.
 */
export const sincronizarPrestamosIniciales = async (uid) => {
    if (!uid) return [];
    try {
        const ref = getRef(uid);
        const snap = await getDocs(ref);
        const existentes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const creados = [];
        for (const p of PRESTAMOS_INICIALES) {
            const yaExiste = existentes.some((ex) => {
                const nomEx = (ex.nombre || "").toLowerCase();
                const nomP = p.nombre.toLowerCase();
                if (nomP.includes("80k") && nomEx.includes("80k")) return true;
                if (nomP.includes("mam") && nomEx.includes("mam")) return true;
                if (nomP.includes("amigo de tía") && nomEx.includes("amigo") && nomEx.includes("norma")) return true;
                if (nomP.includes("tía norma") && !nomP.includes("amigo") && nomEx.includes("norma") && !nomEx.includes("amigo")) return true;
                return nomEx === nomP;
            });

            if (!yaExiste) {
                const creado = await crearPrestamo({
                    nombre: p.nombre,
                    montoPrestado: p.montoPrestado,
                    interesEstimado: p.interesEstimado,
                    diasDePago: p.diasDePago,
                    tipoPeriodicidad: p.tipoPeriodicidad,
                    diasMes: p.diasMes,
                    fechasEspecificas: p.fechasEspecificas,
                    abonoTeorico: p.abonoTeorico,
                    numPagos: p.numPagos,
                    fechaInicio: p.fechaInicio,
                    notas: p.notas,
                    estado: p.estado,
                }, uid);
                creados.push(creado);
            }
        }
        return creados;
    } catch (e) {
        console.error("Error al sincronizar préstamos iniciales:", e);
        return [];
    }
};

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
        const esAdmin = usuarioActual?.admin === true;
        const esPropietario = usuarioActual?.uid === uid;
        let snapshots = [];

        if (esAdmin || esPropietario || !usuarioActual) {
            snapshots = [await getDocs(ref)];
        } else {
            const criterios = [
                query(ref, where("creadoPor", "==", usuarioActual.uid)),
                query(ref, where("asignadoA", "==", usuarioActual.uid)),
                query(ref, where("cobradoresAsignados", "array-contains", usuarioActual.uid)),
            ];
            const email = (usuarioActual.correo || usuarioActual.email || "").toLowerCase();
            if (email) {
                criterios.push(query(ref, where("asignadoA", "==", email)));
                criterios.push(query(ref, where("cobradoresAsignados", "array-contains", email)));
            }
            snapshots = await Promise.all(criterios.map((criterio) => getDocs(criterio)));
        }

        const documentos = new Map();
        snapshots.forEach((snap) => snap.docs.forEach((d) => documentos.set(d.id, { id: d.id, ...d.data() })));
        let lista = [...documentos.values()];

        if (!incluirInactivos) {
            lista = lista.filter((p) => p.activo !== false);
        }

        // Filtro por cobrador asignado si el usuario no es admin
        if (usuarioActual && !esAdmin && !esPropietario) {
            const userUid = usuarioActual.uid;
            const userEmail = (usuarioActual.correo || usuarioActual.email || "").toLowerCase();
            lista = lista.filter((p) => {
                const asignado = p.asignadoA === userUid || p.asignadoA === userEmail;
                const enLista = Array.isArray(p.cobradoresAsignados) && (
                    p.cobradoresAsignados.includes(userUid) || p.cobradoresAsignados.includes(userEmail)
                );
                const creadoPorEl = p.creadoPor === userUid;
                // Si el préstamo no tiene asignación explícita, se permite ver por defecto
                return asignado || enLista || creadoPorEl;
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
    if (data.cobradoresAsignados !== undefined) {
        const cobradores = Array.from(new Set((data.cobradoresAsignados || []).filter(Boolean)));
        dataActualizada.cobradoresAsignados = cobradores;
        dataActualizada.asignadoA = data.asignadoA !== undefined
            ? data.asignadoA
            : (cobradores[0] || null);
    } else if (data.asignadoA !== undefined) {
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
 * Asigna uno o varios colaboradores a muchos préstamos en una sola operación.
 * Firestore limita los batches a 500 escrituras, por eso se divide en lotes.
 */
export const asignarPrestamosEnBloque = async (uid, prestamoIds, cobradoresAsignados = []) => {
    const ids = Array.from(new Set((prestamoIds || []).filter(Boolean)));
    const cobradores = Array.from(new Set((cobradoresAsignados || []).filter(Boolean)));
    if (!uid || ids.length === 0) return [];

    const ahora = Timestamp.now();
    const actualizados = [];
    for (let inicio = 0; inicio < ids.length; inicio += 450) {
        const batch = writeBatch(db);
        const bloque = ids.slice(inicio, inicio + 450);
        bloque.forEach((prestamoId) => {
            const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
            batch.update(ref, {
                asignadoA: cobradores[0] || null,
                cobradoresAsignados: cobradores,
                fechaModificacion: ahora,
            });
            actualizados.push(prestamoId);
        });
        await batch.commit();
    }
    return actualizados;
};

/** Edita un abono y recalcula los saldos derivados de toda la nota. */
export const editarPagoDePrestamo = async (uid, prestamoId, pagoId, cambios) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const ahora = Timestamp.now();
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Préstamo no encontrado");

    const prestamo = snap.data();
    const totalDeuda = Number(prestamo.montoPrestado || 0) + Number(prestamo.interesEstimado || 0);
    const pagos = (prestamo.pagos || []).map((pago) => {
        if (pago.id !== pagoId) return pago;
        return {
            ...pago,
            monto: Number(cambios.monto),
            fecha: cambios.fecha instanceof Date ? Timestamp.fromDate(cambios.fecha) : (cambios.fecha || pago.fecha),
            notas: (cambios.notas || "").trim(),
        };
    });

    if (!pagos.some((pago) => pago.id === pagoId)) throw new Error("Abono no encontrado");

    let acumulado = 0;
    const pagosRecalculados = pagos.map((pago) => {
        const monto = Number(pago.monto || 0);
        const saldoAnterior = Math.max(0, totalDeuda - acumulado);
        acumulado += monto;
        return {
            ...pago,
            monto,
            saldoAnterior,
            saldoRestante: Math.max(0, totalDeuda - acumulado),
        };
    });
    const estado = totalDeuda > 0 && acumulado >= totalDeuda ? "pagado" : "pendiente";

    await updateDoc(ref, {
        pagos: pagosRecalculados,
        estado,
        fechaModificacion: ahora,
    });

    return { id: prestamoId, ...prestamo, pagos: pagosRecalculados, estado, fechaModificacion: ahora };
};

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
 * Elimina un abono/pago individual de un préstamo y recalcula el estado.
 */
export const eliminarPagoDePrestamo = async (uid, prestamoId, pagoId) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const ahora = Timestamp.now();

    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Préstamo no encontrado");

        const prestamo = snap.data();
        const pagosRestantes = (prestamo.pagos || []).filter((p) => p.id !== pagoId);

        const totalPagado = pagosRestantes.reduce((acc, p) => acc + Number(p.monto || 0), 0);
        const totalConInteres = Number(prestamo.montoPrestado || 0) + Number(prestamo.interesEstimado || 0);
        const nuevoEstado = (totalConInteres > 0 && totalPagado >= totalConInteres) ? "pagado" : "pendiente";

        await updateDoc(ref, {
            pagos: pagosRestantes,
            estado: nuevoEstado,
            fechaModificacion: ahora,
        });

        return { id: prestamoId, ...prestamo, pagos: pagosRestantes, estado: nuevoEstado };
    } catch (e) {
        console.error("Error al eliminar pago:", e);
        throw e;
    }
};

/**
 * Elimina definitivamente un préstamo o nota de cobranza.
 */
export const eliminarPrestamoPermanente = async (uid, prestamoId) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    try {
        await updateDoc(ref, {
            activo: false,
            eliminado: true,
            fechaModificacion: Timestamp.now(),
        });
        return true;
    } catch (e) {
        console.error("Error al eliminar préstamo:", e);
        throw e;
    }
};
