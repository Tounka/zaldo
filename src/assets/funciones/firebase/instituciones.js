import { collection, getDocs, query, doc, setDoc, addDoc, where, updateDoc } from "firebase/firestore";
import { db } from "./dbFirebase";
export const altaDeInstitucion = async (values, uid) => {
  const ref = collection(db, "usuarios", uid, "instituciones");
  try {
    const valuesAEnviar = {
      nombre: values.nombreInstitucion, 
      activo: true
    };
    const docRef = await addDoc(ref, valuesAEnviar);
    return { id: docRef.id, ...valuesAEnviar };
  } catch (error) {
    alert("Error al agregar institución, trate de nuevo");
    return null;
  }
}
export const eliminarInstitucion = async (uid, institucionId) => {
  try {
    const ref = doc(db, "usuarios", uid, "instituciones", institucionId);

    await updateDoc(ref, {
      activo: false
    });

    return true;
  } catch (error) {
    alert("Error al eliminar la institución");
    return false;
  }
};

export const obtenerInstituciones = async (uid) => {
  const ref = collection(db, "usuarios", uid, "instituciones");

  try {
    const q = query(ref, where("activo", "==", true));
    const querySnapshot = await getDocs(q);

    const instituciones = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return instituciones;

  } catch (error) {
    alert("Error al obtener instituciones");
    return [];
  }
};

