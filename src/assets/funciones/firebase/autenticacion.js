import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    GoogleAuthProvider,
    linkWithCredential,
    linkWithPopup,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    unlink,
    updatePassword,
} from "firebase/auth";
import { auth } from "./dbFirebase";

export const PROVEEDOR_GOOGLE = "google.com";
export const PROVEEDOR_CORREO = "password";

const proveedorGoogle = () => new GoogleAuthProvider();

const sesionActiva = (accion) => {
    if (!auth.currentUser) {
        throw new Error(`No hay una sesión activa para ${accion}.`);
    }
    return auth.currentUser;
};

export const iniciarSesionConGoogle = () => (
    signInWithPopup(auth, proveedorGoogle())
);

export const iniciarSesionConCorreo = (correo, contrasena) => (
    signInWithEmailAndPassword(auth, correo.trim(), contrasena)
);

export const crearCuentaConCorreo = (correo, contrasena) => (
    createUserWithEmailAndPassword(auth, correo.trim(), contrasena)
);

export const enviarRestablecimientoContrasena = (correo) => (
    sendPasswordResetEmail(auth, correo.trim())
);

/** Lista los métodos de acceso vinculados al usuario en sesión. */
export const proveedoresVinculados = () => (
    auth.currentUser?.providerData?.map((proveedor) => proveedor.providerId) || []
);

export const tieneProveedor = (providerId) => proveedoresVinculados().includes(providerId);

export const vincularCorreoConCuenta = (correo, contrasena) => {
    const usuario = sesionActiva("vincular el correo");
    const credential = EmailAuthProvider.credential(correo.trim(), contrasena);
    return linkWithCredential(usuario, credential);
};

export const vincularGoogleConCuenta = () => {
    const usuario = sesionActiva("vincular Google");
    return linkWithPopup(usuario, proveedorGoogle());
};

/*
 * Vincular, cambiar contraseña o desvincular son operaciones sensibles: Firebase
 * exige que el inicio de sesión sea reciente (auth/requires-recent-login). Estas
 * dos funciones permiten reautenticar sin cerrar la sesión ni perder el uid, que
 * es justamente lo que mantiene intacta toda la información del usuario.
 */
export const reautenticarConGoogle = () => {
    const usuario = sesionActiva("reautenticar con Google");
    return reauthenticateWithPopup(usuario, proveedorGoogle());
};

export const reautenticarConCorreo = (contrasena) => {
    const usuario = sesionActiva("reautenticar con contraseña");

    if (!usuario.email) {
        throw new Error("La cuenta no tiene un correo asociado para reautenticar.");
    }

    const credential = EmailAuthProvider.credential(usuario.email, contrasena);
    return reauthenticateWithCredential(usuario, credential);
};

/** Reautentica con el método disponible antes de reintentar una operación sensible. */
export const reautenticarAutomatico = async (contrasena = "") => {
    if (tieneProveedor(PROVEEDOR_GOOGLE)) return reautenticarConGoogle();
    if (tieneProveedor(PROVEEDOR_CORREO) && contrasena) return reautenticarConCorreo(contrasena);
    throw new Error("Vuelve a iniciar sesión para completar esta operación.");
};

export const actualizarContrasena = (nuevaContrasena) => {
    const usuario = sesionActiva("cambiar la contraseña");
    return updatePassword(usuario, nuevaContrasena);
};

export const enviarVerificacionCorreo = () => {
    const usuario = sesionActiva("verificar el correo");
    return sendEmailVerification(usuario);
};

/**
 * Quita un método de acceso. Nunca permite eliminar el último que queda: dejar
 * la cuenta sin proveedores la volvería inaccesible y con ella toda la
 * información asociada al uid.
 */
export const desvincularProveedor = (providerId) => {
    const usuario = sesionActiva("desvincular un método de acceso");
    const vinculados = proveedoresVinculados();

    if (!vinculados.includes(providerId)) {
        throw new Error("Ese método de acceso no está vinculado a tu cuenta.");
    }

    if (vinculados.length <= 1) {
        throw new Error(
            "Es el único método de acceso de tu cuenta. Vincula otro antes de quitar este.",
        );
    }

    return unlink(usuario, providerId);
};

export const mensajeErrorAutenticacion = (error) => {
    const mensajes = {
        "auth/invalid-email": "El correo no tiene un formato válido.",
        "auth/user-not-found": "No existe una cuenta con ese correo.",
        "auth/wrong-password": "La contraseña no es correcta.",
        "auth/invalid-credential": "El correo o la contraseña no son correctos. Si creaste la cuenta con Google, entra con Google y agrega tu contraseña desde Mi perfil.",
        "auth/email-already-in-use": "Ese correo ya está registrado. Inicia sesión con Google y vincula la contraseña desde Mi perfil para conservar tu información.",
        "auth/credential-already-in-use": "Ese acceso ya pertenece a otra cuenta de Firebase.",
        "auth/provider-already-linked": "Este método de acceso ya está vinculado.",
        "auth/account-exists-with-different-credential": "Ya existe una cuenta con ese correo usando otro método. Entra con el método original y vincula este desde Mi perfil.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/password-does-not-meet-requirements": "La contraseña no cumple la política configurada.",
        "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
        "auth/popup-closed-by-user": "La ventana de Google se cerró antes de completar el acceso.",
        "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para continuar.",
        "auth/cancelled-popup-request": "Se canceló la ventana anterior. Inténtalo de nuevo.",
        "auth/operation-not-allowed": "Este método aún no está habilitado en Firebase Authentication. Actívalo en Console → Authentication → Sign-in method.",
        "auth/requires-recent-login": "Por seguridad, vuelve a confirmar tu identidad y repite la operación.",
        "auth/no-such-provider": "Ese método de acceso no está vinculado a tu cuenta.",
        "auth/network-request-failed": "No hay conexión con Firebase. Revisa tu internet e inténtalo de nuevo.",
    };

    return mensajes[error?.code] || error?.message || "No se pudo completar la operación de autenticación.";
};

/** True cuando la operación solo necesita una reautenticación para completarse. */
export const requiereReautenticacion = (error) => error?.code === "auth/requires-recent-login";
