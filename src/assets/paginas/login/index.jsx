import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { LoginUx } from "./loginUx";
import { auth } from "../../funciones/firebase/dbFirebase";
import { obtenerUsuario } from "../../funciones/firebase/usuario";
import { useEffect, useState } from "react";
import { CrearUsuarioUx } from "./crearUsuarioUx";
import { useNavigate } from "react-router-dom";
import { useContextoGeneral } from "../../contextos/general";
import styled from "styled-components";

const ContenedorLoginUx = styled.div`
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
`;

export const Login = () => {
    const [userAuth, setUserAuth] = useState(null);
    const { setUsuario } = useContextoGeneral();
    const [seccionLoginSeleccionada, setSeccionLoginSeleccionada] = useState("login");
    const navigate = useNavigate();

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const usuario = result.user;

            setUserAuth(usuario);
            const miUsuario = await obtenerUsuario(usuario.uid);
            setUsuario(miUsuario);

            if (miUsuario) {
                navigate("/home");
            } else {
                setSeccionLoginSeleccionada("crearUsuario");
            }
        } catch (error) {
            console.error("Error al iniciar sesión con Google:", error);
        }
    };

    // Detectar si ya hay sesión activa
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
            if (usuario) {
                setUserAuth(usuario);
                const miUsuario = await obtenerUsuario(usuario.uid);
                setUsuario(miUsuario);

                if (miUsuario) {
                    navigate("/home");
                } else {
                    setSeccionLoginSeleccionada("crearUsuario");
                }
            }
        });

        return () => unsubscribe(); // Limpieza del listener
    }, []);

    const seccionesARenderizar = {
        login: <LoginUx handleLogin={handleLogin} />,
        crearUsuario: <CrearUsuarioUx userAuth={userAuth} />,
    };

    return (
        <ContenedorLoginUx>
            {seccionesARenderizar[seccionLoginSeleccionada]}
        </ContenedorLoginUx>
    );
};
