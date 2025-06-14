import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp, where } from "firebase/firestore";
import { db } from "./dbFirebase";
export const agregarMovimiento = async (values, uid) => {
    const ref = collection(db, "usuarios", uid, "movimientos");
    try {
        const fechaActual = Timestamp.now();
        let montoAEnviar  = values.monto;
        if(values.tipoDeMovimiento === "gasto"){
            montoAEnviar * -1;
        }
        const movimientoAEnviar = {
            fechaMovimiento: fechaActual,
            monto: Number(montoAEnviar),
            cuentaAsociada: values.cuentaAsociada,
            nombreCuenta: values.nombreCuenta,
            categoria: values?.categoria,
            nota: values?.nota,

        }


        const docRef = await addDoc(ref, { ...movimientoAEnviar, });
        return { id: docRef.id, ...values, fechaMovimiento: fechaActual };
    } catch (error) {
        alert("Error al agregar movimiento, trate de nuevo");
        return null;
    }

}