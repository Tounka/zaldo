import { onAuthStateChanged } from "firebase/auth";
import { LoginUx } from "./loginUx";
import { auth } from "../../funciones/firebase/dbFirebase";
import { obtenerUsuario } from "../../funciones/firebase/usuario";
import { useCallback, useEffect, useState } from "react";
import { CrearUsuarioUx } from "./crearUsuarioUx";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../stores/useAppStore";
import styled from "styled-components";
import {
    crearCuentaConCorreo,
    enviarRestablecimientoContrasena,
    iniciarSesionConCorreo,
    iniciarSesionConGoogle,
    mensajeErrorAutenticacion,
} from "../../funciones/firebase/autenticacion";

const ContenedorLoginUx = styled.div`
    width: 100%;
    height: 100vh;
    height: 100dvh;
    display: flex;
    justify-content: center;
    overflow: hidden;
`;

export const Login = () => {
    const [userAuth, setUserAuth] = useState(null);
    const { setUsuario } = useAppStore();
    const [seccionLoginSeleccionada, setSeccionLoginSeleccionada] = useState("login");
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState("");
    const [errorAuth, setErrorAuth] = useState("");
    const navigate = useNavigate();

    const perfilConAuth = (perfil, usuarioAuth) => perfil
        ? {
            ...perfil,
            uid: usuarioAuth.uid,
            email: usuarioAuth.email || perfil.email || perfil.correo || "",
            correo: usuarioAuth.email || perfil.correo || perfil.email || "",
        }
        : null;

    const procesarUsuarioAutenticado = useCallback(async (usuario) => {
        setUserAuth(usuario);
        const miUsuario = perfilConAuth(await obtenerUsuario(usuario.uid), usuario);
        setUsuario(miUsuario);

        if (miUsuario) {
            navigate("/home");
        } else {
            setSeccionLoginSeleccionada("crearUsuario");
        }
    }, [navigate, setUsuario]);

    const handleLoginGoogle = async () => {
        setErrorAuth("");
        setLoadingAction("google");
        try {
            const result = await iniciarSesionConGoogle();
            await procesarUsuarioAutenticado(result.user);
        } catch (error) {
            console.error("Error al iniciar sesión con Google:", error);
            setErrorAuth(mensajeErrorAutenticacion(error));
        } finally {
            setLoadingAction("");
        }
    };

    const handleLoginCorreo = async (correo, contrasena) => {
        setErrorAuth("");
        setLoadingAction("correo");
        try {
            const result = await iniciarSesionConCorreo(correo, contrasena);
            await procesarUsuarioAutenticado(result.user);
        } catch (error) {
            console.error("Error al iniciar sesión con correo:", error);
            setErrorAuth(mensajeErrorAutenticacion(error));
        } finally {
            setLoadingAction("");
        }
    };

    const handleCrearCuentaCorreo = async (correo, contrasena) => {
        setErrorAuth("");
        setLoadingAction("registro");
        try {
            const result = await crearCuentaConCorreo(correo, contrasena);
            await procesarUsuarioAutenticado(result.user);
        } catch (error) {
            console.error("Error al crear cuenta con correo:", error);
            setErrorAuth(mensajeErrorAutenticacion(error));
        } finally {
            setLoadingAction("");
        }
    };

    const handleRecuperarContrasena = async (correo) => {
        setErrorAuth("");
        setLoadingAction("recuperacion");
        try {
            await enviarRestablecimientoContrasena(correo);
            setErrorAuth("Te enviamos un enlace para restablecer tu contraseña.");
        } catch (error) {
            console.error("Error al enviar restablecimiento:", error);
            setErrorAuth(mensajeErrorAutenticacion(error));
        } finally {
            setLoadingAction("");
        }
    };

    // Detectar si ya hay sesión activa
    useEffect(() => {
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
            if (usuario) {
                await procesarUsuarioAutenticado(usuario);
            } else {
                // Si no hay usuario logueado
                setUserAuth(null);
                setUsuario(null);
                setSeccionLoginSeleccionada("login");
            }

            setLoading(false); // Ahora se ejecuta cuando ya se procesó la sesión
        });

        return () => unsubscribe();
    }, [procesarUsuarioAutenticado, setUsuario]);


    const seccionesARenderizar = {

        login: (
            <LoginUx
                loading={loading}
                loadingAction={loadingAction}
                error={errorAuth}
                handleLoginGoogle={handleLoginGoogle}
                handleLoginCorreo={handleLoginCorreo}
                handleCrearCuentaCorreo={handleCrearCuentaCorreo}
                handleRecuperarContrasena={handleRecuperarContrasena}
            />
        ),
        crearUsuario: <CrearUsuarioUx userAuth={userAuth} />,
    };

    return (
        <ContenedorLoginUx>
            {seccionesARenderizar[seccionLoginSeleccionada]}
        </ContenedorLoginUx>
    );
};
