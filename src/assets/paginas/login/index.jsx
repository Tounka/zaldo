import { signInWithPopup } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { LoginUx } from "./loginUx";
import { auth } from "../../funciones/firebase/dbFirebase";
import { obtenerUsuario } from "../../funciones/firebase/usuario";
import { useState } from "react";
import { CrearUsuarioUx } from "./crearUsuarioUx";
import { useNavigate } from "react-router-dom";
import { useContextoGeneral } from "../../contextos/general";
import styled from "styled-components";

const ContenedorLoginUx = styled.div`
    width: 100%;
    height: 100%;
`
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

            console.log(usuario);
            setUserAuth(usuario);
            const miUsuario = await obtenerUsuario(usuario.uid);
            console.log(miUsuario)
            if (miUsuario) {
                setUsuario(miUsuario);
                navigate("/home");

            } else if (miUsuario === null) {
                setSeccionLoginSeleccionada("crearUsuario");
            }

        } catch (error) {
            console.error("Error al iniciar sesión con Google:");
        }
    };
    const seccionesARenderizar = {
        login: <LoginUx handleLogin={handleLogin} />,
        crearUsuario: <CrearUsuarioUx userAuth={userAuth} />,
    }
    return (
        <ContenedorLoginUx>
            {seccionesARenderizar[seccionLoginSeleccionada]}
        </ContenedorLoginUx>

    )
}