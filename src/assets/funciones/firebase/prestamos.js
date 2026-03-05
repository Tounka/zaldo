import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    Timestamp,
    arrayUnion,
} from "firebase/firestore";
import { db } from "./dbFirebase";

const getRef = (uid) => collection(db, "prestamos", uid, "prestamos");

/**
 * Crea un nuevo préstamo en Firestore.
 * @param {Object} values - { nombre, montoPrestado, interesEstimado, diasDePago, estado }
 * @param {string} uid
 */
export const crearPrestamo = async (values, uid) => {
    const ref = getRef(uid);
    const ahora = Timestamp.now();

    const prestamo = {
        nombre: values.nombre,
        montoPrestado: Number(values.montoPrestado),
        interesEstimado: Number(values.interesEstimado),
        diasDePago: Number(values.diasDePago),
        estado: values.estado || "pendiente",
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
 * Obtiene todos los préstamos pendientes del usuario.
 * @param {string} uid
 */
export const obtenerPrestamosPendientes = async (uid) => {
    const ref = getRef(uid);
    try {
        const q = query(ref, where("estado", "==", "pendiente"));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error al obtener préstamos:", error);
        return [];
    }
};

/**
 * Agrega un pago al array de pagos del préstamo.
 * @param {string} uid
 * @param {string} prestamoId
 * @param {{ fecha: Date, monto: number, imagenUrl: string|null }} nuevoPago
 */
export const agregarPago = async (uid, prestamoId, nuevoPago) => {
    const ref = doc(db, "prestamos", uid, "prestamos", prestamoId);
    const pago = {
        fecha: Timestamp.fromDate(nuevoPago.fecha),
        monto: Number(nuevoPago.monto),
        imagenUrl: nuevoPago.imagenUrl || null,
    };

    try {
        await updateDoc(ref, {
            pagos: arrayUnion(pago),
            fechaModificacion: Timestamp.now(),
        });
        return pago;
    } catch (error) {
        console.error("Error al agregar pago:", error);
        throw error;
    }
};

/**
 * Marca un préstamo como pagado.
 * @param {string} uid
 * @param {string} prestamoId
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
