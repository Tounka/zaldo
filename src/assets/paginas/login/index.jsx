import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { LoginUx } from "./loginUx";
import { auth } from "../../funciones/firebase/dbFirebase";
import { obtenerUsuario } from "../../funciones/firebase/usuario";
import { useEffect, useState } from "react";
import { CrearUsuarioUx } from "./crearUsuarioUx";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../stores/useAppStore";
import styled from "styled-components";

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
        setLoading(true);
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
            } else {
                // Si no hay usuario logueado
                setSeccionLoginSeleccionada("login");
            }

            setLoading(false); // Ahora se ejecuta cuando ya se procesó la sesión
        });

        return () => unsubscribe();
    }, []);


    const seccionesARenderizar = {

        login: <LoginUx loading={loading} handleLogin={handleLogin} />,
        crearUsuario: <CrearUsuarioUx userAuth={userAuth} />,
    };

    return (
        <ContenedorLoginUx>
            {seccionesARenderizar[seccionLoginSeleccionada]}
        </ContenedorLoginUx>
    );
};
