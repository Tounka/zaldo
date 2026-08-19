import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    GoogleAuthProvider,
    linkWithCredential,
    linkWithPopup,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";
import { auth } from "./dbFirebase";

const proveedorGoogle = () => new GoogleAuthProvider();

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

export const vincularCorreoConCuenta = (correo, contrasena) => {
    if (!auth.currentUser) {
        throw new Error("No hay una sesión activa para vincular el correo.");
    }

    const credential = EmailAuthProvider.credential(correo.trim(), contrasena);
    return linkWithCredential(auth.currentUser, credential);
};

export const vincularGoogleConCuenta = () => {
    if (!auth.currentUser) {
        throw new Error("No hay una sesión activa para vincular Google.");
    }

    return linkWithPopup(auth.currentUser, proveedorGoogle());
};

export const mensajeErrorAutenticacion = (error) => {
    const mensajes = {
        "auth/invalid-email": "El correo no tiene un formato válido.",
        "auth/user-not-found": "No existe una cuenta con ese correo.",
        "auth/wrong-password": "La contraseña no es correcta.",
        "auth/invalid-credential": "El correo o la contraseña no son correctos.",
        "auth/email-already-in-use": "Ese correo ya está registrado en otra cuenta.",
        "auth/credential-already-in-use": "Ese acceso ya pertenece a otra cuenta de Firebase.",
        "auth/provider-already-linked": "Este método de acceso ya está vinculado.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/password-does-not-meet-requirements": "La contraseña no cumple la política configurada.",
        "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
        "auth/popup-closed-by-user": "La ventana de Google se cerró antes de completar el acceso.",
        "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para continuar.",
        "auth/operation-not-allowed": "Este método aún no está habilitado en Firebase Authentication.",
        "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión y repite la operación.",
    };

    return mensajes[error?.code] || error?.message || "No se pudo completar la operación de autenticación.";
};
