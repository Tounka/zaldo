import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp, where } from "firebase/firestore";
import { db } from "./dbFirebase";
export const agregarMovimiento = async (values, uid) => {
    const ref = collection(db, "usuarios", uid, "movimientos");
    try {
        const fechaActual = Timestamp.now();
        const cuentaAEnviar = {
            cuentaAsociada: values.cuentaAsociada,
            nombreCuenta: values.nombreCuenta,
            monto: values.monto,
            categoria: values.categoria,
            nota: values.nota,

            fechaDeCreacion: fechaActual,
            activo: true,

        }

        const docRef = await addDoc(ref, cuentaAEnviar);
        return { id: docRef.id, ...values };
    } catch (error) {
        alert("Error al agregar cuenta, trate de nuevo");
        return null;
    }

}