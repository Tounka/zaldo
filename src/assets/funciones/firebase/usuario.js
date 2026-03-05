import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "./dbFirebase";
import { altaDeInstitucion } from "./instituciones";
import { altaDeCuenta } from "./cuentas";
import Swal from "sweetalert2";

export const obtenerUsuario = async (uid) => {
  try {
    const refDoc = doc(db, "usuarios", uid);
    const usuarioSnap = await getDoc(refDoc);

    if (usuarioSnap.exists()) {
      return {
        ...usuarioSnap.data(),
        uid: uid
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Ha sucedido un problema al obtener el usuario:", error);
    return null;
  }
};

export const crearUsuario = async (values, user) => {
  try {
    const ref = doc(db, "usuarios", user.uid);

    await setDoc(ref, {
      nombres: values.nombres,
      apellidos: values.apellidos,
      imgPerfil: "imgPerfil1",
    });

    const usuario = await obtenerUsuario(user.uid);
    const institucion = await altaDeInstitucion({ nombreInstitucion: "Efectivo" }, user.uid)
    await altaDeCuenta({ nombreCuenta: "Efectivo", institucionAsociada: institucion?.id, tipoDeCuenta: "efectivo" }, user.uid)

    return usuario;

  } catch (error) {
    console.error("Error al crear usuario:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Ha sucedido un problema, trata de nuevo en 10 minutos." });
  }
}