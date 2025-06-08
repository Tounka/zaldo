import { collection, getDocs, query, doc, setDoc, addDoc, Timestamp } from "firebase/firestore";
export const altaDeCuenta = async (cuenta, uid) => {
    const ref = collection(db, "usuarios", uid, "cuentas");
    try {
      const fechaActual = Timestamp.now();
        const cuentaAEnviar ={
          nombre: cuenta.nombreCuenta,
          tipoCuenta: cuenta.tipoCuenta,
          saldoALaFecha: 0,
          fechaDeCreacion: fechaActual,
          fechaDeMoficacion: fechaActual,
          activo: true,
          
        }
        const docRef = await addDoc(ref, cuentaAEnviar);
        return { id: docRef.id, ...cuenta };
    } catch (error) {
        alert("Error al agregar cuenta, trate de nuevo");
        return null;
    }

}

export const obtenerInstitucionesSimulados = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const datos = [
        { label: "Instituto Nacional", value: "id1" },
        { label: "Colegio del Sur", value: "id2" },
        { label: "Escuela Técnica 5", value: "id3" },
      ];
      resolve(datos);
    }, 500); // medio segundo
  });
};
