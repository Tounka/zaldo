import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
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

/**
 * Lista los perfiles disponibles para asignar cobranza.
 * La regla de Firestore permite que usuarios autenticados lean estos perfiles,
 * pero los cambios de rol siguen estando fuera de este flujo.
 */
export const obtenerUsuarios = async () => {
  try {
    const snapshot = await getDocs(collection(db, "usuarios"));
    return snapshot.docs.map((documento) => ({
      uid: documento.id,
      ...documento.data(),
    }));
  } catch (error) {
    console.error("No se pudieron cargar los colaboradores:", error);
    return [];
  }
};

export const crearUsuario = async (values, user) => {
  try {
    const ref = doc(db, "usuarios", user.uid);

    await setDoc(ref, {
      nombres: values.nombres,
      apellidos: values.apellidos,
      email: user.email || "",
      correo: user.email || "",
      imgPerfil: "imgPerfil1",
    }, { merge: true });

    const usuario = await obtenerUsuario(user.uid);
    const institucion = await altaDeInstitucion({ nombreInstitucion: "Efectivo" }, user.uid)
    await altaDeCuenta({ nombreCuenta: "Efectivo", institucionAsociada: institucion?.id, tipoDeCuenta: "efectivo" }, user.uid)

    return usuario;

  } catch (error) {
    console.error("Error al crear usuario:", error);
    Swal.fire({ icon: "error", title: "Error", text: "Ha sucedido un problema, trata de nuevo en 10 minutos." });
  }
}

/**
 * Mantiene el perfil de Firestore alineado con la cuenta de Authentication.
 *
 * Al vincular un método de acceso nuevo el correo de la cuenta puede cambiar,
 * y el documento de `usuarios` se quedaría con el anterior. Escribe con merge:
 * solo toca los campos indicados y nunca elimina el resto del perfil.
 */
export const sincronizarPerfilConAuth = async (uid, datosAuth = {}) => {
  if (!uid) return null;

  const cambios = {};
  if (datosAuth.email) {
    cambios.email = datosAuth.email;
    cambios.correo = datosAuth.email;
  }
  if (datosAuth.proveedores) cambios.proveedores = datosAuth.proveedores;
  if (typeof datosAuth.emailVerificado === "boolean") {
    cambios.emailVerificado = datosAuth.emailVerificado;
  }

  if (!Object.keys(cambios).length) return null;

  try {
    await setDoc(doc(db, "usuarios", uid), cambios, { merge: true });
    return cambios;
  } catch (error) {
    console.error("No se pudo sincronizar el perfil con Authentication:", error);
    return null;
  }
};
