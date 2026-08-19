import styled from "styled-components";
import { useEffect, useMemo, useState } from "react";
import { reload } from "firebase/auth";
import { FaCheckCircle, FaGoogle, FaKey, FaLink, FaUserCircle } from "react-icons/fa";
import { auth } from "../../funciones/firebase/dbFirebase";
import {
    mensajeErrorAutenticacion,
    vincularCorreoConCuenta,
    vincularGoogleConCuenta,
} from "../../funciones/firebase/autenticacion";
import { useAppStore } from "../../stores/useAppStore";

const Pagina = styled.main`
    width: 100%;
    max-width: 920px;
    margin: 0 auto;
    padding: 8px 0 36px;
    color: #25212d;
`;

const Encabezado = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 16px;
    margin-bottom: 18px;

    @media (max-width: 600px) {
        align-items: start;
        flex-direction: column;
    }
`;

const Eyebrow = styled.span`
    color: var(--colorMorado);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
`;

const Titulo = styled.h1`
    margin: 4px 0 0;
    color: #282132;
    font-size: clamp(24px, 4vw, 34px);
    line-height: 1.08;
    letter-spacing: -0.04em;
`;

const Subtitulo = styled.p`
    margin: 8px 0 0;
    color: #6c6675;
    font-size: 13px;
    line-height: 1.5;
`;

const Aviso = styled.div`
    margin-bottom: 16px;
    border: 1px solid ${({ $error }) => ($error ? "rgba(180, 35, 24, 0.2)" : "rgba(40, 122, 71, 0.2)")};
    border-radius: 10px;
    background: ${({ $error }) => ($error ? "rgba(180, 35, 24, 0.06)" : "rgba(40, 122, 71, 0.06)")};
    color: ${({ $error }) => ($error ? "#a42318" : "#287a47")};
    padding: 11px 13px;
    font-size: 12px;
    line-height: 1.45;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: minmax(250px, 0.8fr) minmax(0, 1.2fr);
    gap: 16px;

    @media (max-width: 760px) {
        grid-template-columns: 1fr;
    }
`;

const Panel = styled.section`
    border: 1px solid rgba(83, 59, 143, 0.12);
    border-radius: 16px;
    background: white;
    box-shadow: 0 12px 30px rgba(37, 24, 62, 0.06);
    padding: 20px;
`;

const PerfilPrincipal = styled(Panel)`
    background: linear-gradient(145deg, #fbfafd 0%, #f4f0fb 100%);
    border-color: rgba(83, 59, 143, 0.2);
`;

const Avatar = styled.div`
    width: 58px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 16px;
    background: var(--colorMorado);
    color: white;
    font-size: 22px;
    font-weight: 900;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const Nombre = styled.h2`
    margin: 16px 0 4px;
    color: #2e2639;
    font-size: 20px;
`;

const Correo = styled.p`
    margin: 0;
    color: #6c6675;
    font-size: 12px;
    overflow-wrap: anywhere;
`;

const UID = styled.div`
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid rgba(83, 59, 143, 0.12);
    color: #817b89;
    font-size: 10px;
    line-height: 1.5;
    overflow-wrap: anywhere;
`;

const TituloPanel = styled.h3`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: #30283a;
    font-size: 16px;
`;

const TextoPanel = styled.p`
    margin: 7px 0 16px;
    color: #716b79;
    font-size: 12px;
    line-height: 1.5;
`;

const Proveedores = styled.div`
    display: grid;
    gap: 9px;
    margin-bottom: 20px;
`;

const Proveedor = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid rgba(83, 59, 143, 0.12);
    border-radius: 11px;
    padding: 10px 12px;
    background: #fbfafd;
`;

const ProveedorNombre = styled.div`
    display: flex;
    align-items: center;
    gap: 9px;
    color: #393142;
    font-size: 12px;
    font-weight: 700;

    svg {
        color: ${({ $google }) => ($google ? "#db4437" : "var(--colorMorado)")};
        font-size: 15px;
    }
`;

const EstadoProveedor = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #287a47;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const Formulario = styled.form`
    display: grid;
    gap: 10px;
`;

const Campo = styled.label`
    display: grid;
    gap: 5px;
    color: #514a5b;
    font-size: 11px;
    font-weight: 800;
`;

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(83, 59, 143, 0.2);
    border-radius: 9px;
    padding: 10px 11px;
    background: white;
    color: #282132;
    font: inherit;
    font-size: 13px;

    &:focus {
        outline: none;
        border-color: var(--colorMorado);
        box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
    }
`;

const Boton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    border: none;
    border-radius: 9px;
    padding: 11px 14px;
    background: ${({ $google }) => ($google ? "#3d67b1" : "var(--colorMorado)")};
    color: white;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;

    &:disabled {
        cursor: wait;
        opacity: 0.55;
    }
`;

const Nota = styled.p`
    margin: 10px 0 0;
    color: #817b89;
    font-size: 11px;
    line-height: 1.45;
`;

const iniciales = (nombre = "Usuario") => nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "U";

const obtenerSnapshotAuth = (usuario) => usuario ? ({
    uid: usuario.uid,
    email: usuario.email || "",
    displayName: usuario.displayName || "",
    photoURL: usuario.photoURL || "",
    providerData: usuario.providerData?.map((proveedor) => ({
        providerId: proveedor.providerId,
        email: proveedor.email || "",
    })) || [],
}) : null;

export const PaginaPerfilUx = () => {
    const { usuario, setUsuario } = useAppStore();
    const [cuenta, setCuenta] = useState(() => obtenerSnapshotAuth(auth.currentUser));
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [cargando, setCargando] = useState("");
    const [aviso, setAviso] = useState(null);

    const sincronizarCuenta = async () => {
        if (!auth.currentUser) return;
        await reload(auth.currentUser);
        const actualizada = obtenerSnapshotAuth(auth.currentUser);
        setCuenta(actualizada);
        setCorreo(actualizada.email || usuario?.email || "");
        setUsuario({
            ...(usuario || {}),
            email: actualizada.email || usuario?.email || "",
            correo: actualizada.email || usuario?.correo || "",
        });
    };

    useEffect(() => {
        sincronizarCuenta().catch((error) => {
            console.error("No se pudo cargar el perfil de autenticación:", error);
        });
        // La cuenta de Firebase es la fuente de verdad de los proveedores vinculados.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario?.uid]);

    const proveedores = useMemo(() => cuenta?.providerData || [], [cuenta]);
    const tieneGoogle = useMemo(() => proveedores.some((item) => item.providerId === "google.com"), [proveedores]);
    const tieneCorreo = useMemo(() => proveedores.some((item) => item.providerId === "password"), [proveedores]);
    const nombreVisible = usuario?.nombres
        ? `${usuario.nombres} ${usuario.apellidos || ""}`.trim()
        : cuenta?.displayName || "Mi perfil";

    const handleVincularCorreo = async (event) => {
        event.preventDefault();
        setAviso(null);

        if (!correo.trim() || contrasena.length < 6) {
            setAviso({ error: true, texto: "Escribe un correo y una contraseña de al menos 6 caracteres." });
            return;
        }

        if (contrasena !== confirmacion) {
            setAviso({ error: true, texto: "Las contraseñas no coinciden." });
            return;
        }

        setCargando("correo");
        try {
            await vincularCorreoConCuenta(correo, contrasena);
            await sincronizarCuenta();
            setContrasena("");
            setConfirmacion("");
            setAviso({ texto: "Correo y contraseña vinculados. Ya puedes usar cualquiera de los dos accesos." });
        } catch (error) {
            console.error("No se pudo vincular el correo:", error);
            setAviso({ error: true, texto: mensajeErrorAutenticacion(error) });
        } finally {
            setCargando("");
        }
    };

    const handleVincularGoogle = async () => {
        setAviso(null);
        setCargando("google");
        try {
            await vincularGoogleConCuenta();
            await sincronizarCuenta();
            setAviso({ texto: "Google quedó vinculado a tu cuenta actual." });
        } catch (error) {
            console.error("No se pudo vincular Google:", error);
            setAviso({ error: true, texto: mensajeErrorAutenticacion(error) });
        } finally {
            setCargando("");
        }
    };

    return (
        <Pagina>
            <Encabezado>
                <div>
                    <Eyebrow>Cuenta y seguridad</Eyebrow>
                    <Titulo>Mi perfil</Titulo>
                    <Subtitulo>Administra tus datos y las formas disponibles para entrar a Zaldo.</Subtitulo>
                </div>
            </Encabezado>

            {aviso && <Aviso $error={aviso.error}>{aviso.texto}</Aviso>}

            <Grid>
                <PerfilPrincipal>
                    <Avatar>
                        {cuenta?.photoURL ? <img src={cuenta.photoURL} alt="" /> : iniciales(nombreVisible)}
                    </Avatar>
                    <Nombre>{nombreVisible}</Nombre>
                    <Correo>{cuenta?.email || usuario?.email || "Correo no disponible"}</Correo>
                    <UID>UID de Firebase<br />{cuenta?.uid || auth.currentUser?.uid || "—"}</UID>
                </PerfilPrincipal>

                <Panel>
                    <TituloPanel><FaLink /> Métodos de acceso</TituloPanel>
                    <TextoPanel>
                        Puedes iniciar sesión con más de un método y conservar la misma cuenta, datos y permisos.
                    </TextoPanel>

                    <Proveedores>
                        <Proveedor>
                            <ProveedorNombre $google><FaGoogle /> Google</ProveedorNombre>
                            {tieneGoogle && <EstadoProveedor><FaCheckCircle /> Vinculado</EstadoProveedor>}
                        </Proveedor>
                        <Proveedor>
                            <ProveedorNombre><FaKey /> Correo y contraseña</ProveedorNombre>
                            {tieneCorreo && <EstadoProveedor><FaCheckCircle /> Vinculado</EstadoProveedor>}
                        </Proveedor>
                    </Proveedores>

                    {!tieneCorreo && (
                        <>
                            <TituloPanel><FaKey /> Añadir acceso por correo</TituloPanel>
                            <TextoPanel>
                                Usa el correo de tu cuenta actual o el que prefieras para crear una contraseña alternativa.
                            </TextoPanel>
                            <Formulario onSubmit={handleVincularCorreo}>
                                <Campo>
                                    Correo electrónico
                                    <Input
                                        type="email"
                                        value={correo}
                                        onChange={(event) => setCorreo(event.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                </Campo>
                                <Campo>
                                    Nueva contraseña
                                    <Input
                                        type="password"
                                        value={contrasena}
                                        onChange={(event) => setContrasena(event.target.value)}
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </Campo>
                                <Campo>
                                    Confirmar contraseña
                                    <Input
                                        type="password"
                                        value={confirmacion}
                                        onChange={(event) => setConfirmacion(event.target.value)}
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </Campo>
                                <Boton type="submit" disabled={cargando === "correo"}>
                                    <FaLink /> {cargando === "correo" ? "Vinculando..." : "Vincular correo y contraseña"}
                                </Boton>
                            </Formulario>
                        </>
                    )}

                    {!tieneGoogle && (
                        <>
                            <TituloPanel style={{ marginTop: 22 }}><FaGoogle /> Añadir Google</TituloPanel>
                            <TextoPanel>
                                Vincula tu cuenta de Google para entrar rápidamente sin perder esta cuenta.
                            </TextoPanel>
                            <Boton type="button" $google onClick={handleVincularGoogle} disabled={cargando === "google"}>
                                <FaGoogle /> {cargando === "google" ? "Vinculando..." : "Vincular cuenta de Google"}
                            </Boton>
                        </>
                    )}

                    {tieneCorreo && tieneGoogle && (
                        <Nota><FaUserCircle style={{ marginRight: 5 }} /> Tu cuenta está protegida con dos métodos de acceso.</Nota>
                    )}
                </Panel>
            </Grid>
        </Pagina>
    );
};

export const PaginaPerfil = () => <PaginaPerfilUx />;
