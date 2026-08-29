import styled from "styled-components";
import { confirmarEliminacion } from "../../funciones/utils/avisos";
import { PanelPreferencias } from "./panelPreferencias";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reload } from "firebase/auth";
import {
    FaCheckCircle,
    FaCloudDownloadAlt,
    FaExclamationTriangle,
    FaGoogle,
    FaKey,
    FaLink,
    FaShieldAlt,
    FaSlidersH,
    FaUnlink,
    FaUserCircle,
    FaUsers,
} from "react-icons/fa";
import { auth } from "../../funciones/firebase/dbFirebase";
import {
    PROVEEDOR_CORREO,
    PROVEEDOR_GOOGLE,
    actualizarContrasena,
    desvincularProveedor,
    enviarVerificacionCorreo,
    mensajeErrorAutenticacion,
    reautenticarConCorreo,
    reautenticarConGoogle,
    requiereReautenticacion,
    vincularCorreoConCuenta,
    vincularGoogleConCuenta,
} from "../../funciones/firebase/autenticacion";
import { descargarRespaldo } from "../../funciones/firebase/respaldo";
import { obtenerUsuarios, sincronizarPerfilConAuth } from "../../funciones/firebase/usuario";
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

const PanelAncho = styled(Panel)`
    grid-column: 1 / -1;
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
    color: ${({ $inactivo }) => ($inactivo ? "#9b95a3" : "#287a47")};
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const AccionesProveedor = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
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

const BotonTexto = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: #a4485c;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    padding: 2px 4px;

    &:hover {
        text-decoration: underline;
    }

    &:disabled {
        cursor: wait;
        opacity: 0.5;
    }
`;

const Nota = styled.p`
    margin: 10px 0 0;
    color: #817b89;
    font-size: 11px;
    line-height: 1.45;
`;

const Separador = styled.hr`
    margin: 22px 0 18px;
    border: none;
    border-top: 1px solid rgba(83, 59, 143, 0.12);
`;

const CajaReautenticacion = styled.div`
    margin-bottom: 18px;
    border: 1px solid rgba(196, 138, 34, 0.28);
    border-radius: 12px;
    background: rgba(240, 178, 44, 0.08);
    padding: 14px;
`;

const ListaRespaldo = styled.ul`
    margin: 0 0 16px;
    padding-left: 18px;
    color: #716b79;
    font-size: 12px;
    line-height: 1.75;
`;

const FooterPerfiles = styled.footer`
    margin-top: 18px;
    padding: 18px 20px;
    border: 1px solid rgba(83, 59, 143, 0.14);
    border-radius: 16px;
    background: linear-gradient(145deg, #332749 0%, #241a34 100%);
    color: white;
    box-shadow: 0 12px 28px rgba(37, 24, 62, 0.12);
`;

const FooterPerfilesHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;

    h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 15px;
    }

    span {
        color: rgba(255, 255, 255, .68);
        font-size: 10px;
        font-weight: 700;
    }
`;

const ListaPerfiles = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 8px;
`;

const PerfilFooterCard = styled.article`
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    min-width: 0;
    padding: 9px;
    border: 1px solid ${({ $actual }) => ($actual ? "rgba(226, 198, 112, .72)" : "rgba(255, 255, 255, .14)")};
    border-radius: 11px;
    background: ${({ $actual }) => ($actual ? "rgba(204, 164, 59, .16)" : "rgba(255, 255, 255, .06)")};

    & > span:first-child {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: ${({ $actual }) => ($actual ? "#cca43b" : "rgba(255, 255, 255, .13)")};
        font-size: 11px;
        font-weight: 900;
    }

    div {
        min-width: 0;
    }

    strong,
    small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    strong {
        font-size: 11px;
    }

    small {
        margin-top: 2px;
        color: rgba(255, 255, 255, .64);
        font-size: 9px;
    }

    & > em {
        color: #f1d477;
        font-size: 8px;
        font-style: normal;
        font-weight: 900;
        letter-spacing: .05em;
        text-transform: uppercase;
    }
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
    emailVerified: usuario.emailVerified,
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
    const [nuevaContrasena, setNuevaContrasena] = useState("");
    const [confirmacionNueva, setConfirmacionNueva] = useState("");
    const [contrasenaReauth, setContrasenaReauth] = useState("");
    const [reautenticacionPendiente, setReautenticacionPendiente] = useState(false);
    const [cargando, setCargando] = useState("");
    const [aviso, setAviso] = useState(null);
    const [perfiles, setPerfiles] = useState([]);
    const [cargandoPerfiles, setCargandoPerfiles] = useState(true);
    const operacionPendiente = useRef(null);

    /*
     * `reload` trae del servidor los proveedores realmente vinculados. La cuenta
     * de Firebase Authentication es la fuente de verdad; el store y Firestore se
     * alinean a partir de ella, nunca al revés.
     */
    const sincronizarCuenta = useCallback(async () => {
        if (!auth.currentUser) return null;

        await reload(auth.currentUser);
        const actualizada = obtenerSnapshotAuth(auth.currentUser);
        setCuenta(actualizada);
        setCorreo((previo) => previo || actualizada.email || "");

        const usuarioActual = useAppStore.getState().usuario || {};
        setUsuario({
            ...usuarioActual,
            email: actualizada.email || usuarioActual.email || "",
            correo: actualizada.email || usuarioActual.correo || "",
        });

        await sincronizarPerfilConAuth(actualizada.uid, {
            email: actualizada.email,
            proveedores: actualizada.providerData.map((proveedor) => proveedor.providerId),
            emailVerificado: actualizada.emailVerified,
        });

        return actualizada;
    }, [setUsuario]);

    useEffect(() => {
        sincronizarCuenta().catch((error) => {
            console.error("No se pudo cargar el perfil de autenticación:", error);
        });
    }, [sincronizarCuenta]);

    useEffect(() => {
        let activo = true;
        if (!usuario?.uid) {
            setCargandoPerfiles(false);
            return undefined;
        }

        obtenerUsuarios()
            .then((resultado) => {
                if (activo) setPerfiles(resultado);
            })
            .finally(() => {
                if (activo) setCargandoPerfiles(false);
            });

        return () => {
            activo = false;
        };
    }, [usuario?.uid]);

    const proveedores = useMemo(() => cuenta?.providerData || [], [cuenta]);
    const tieneGoogle = useMemo(
        () => proveedores.some((item) => item.providerId === PROVEEDOR_GOOGLE),
        [proveedores],
    );
    const tieneCorreo = useMemo(
        () => proveedores.some((item) => item.providerId === PROVEEDOR_CORREO),
        [proveedores],
    );
    const nombreVisible = usuario?.nombres
        ? `${usuario.nombres} ${usuario.apellidos || ""}`.trim()
        : cuenta?.displayName || "Mi perfil";
    const perfilesVisibles = useMemo(() => {
        const porUid = new Map(perfiles.map((perfil) => [perfil.uid, perfil]));
        if (usuario?.uid && !porUid.has(usuario.uid)) porUid.set(usuario.uid, usuario);
        return Array.from(porUid.values());
    }, [perfiles, usuario]);

    /*
     * Vincular, cambiar contraseña y desvincular exigen sesión reciente. En vez
     * de fallar, se guarda la operación y se pide confirmar identidad; al
     * reautenticar se reintenta sola. Así el uid nunca cambia y la información
     * asociada a la cuenta permanece intacta.
     */
    const ejecutar = async (clave, operacion) => {
        setAviso(null);
        setCargando(clave);

        try {
            await operacion();
            operacionPendiente.current = null;
            setReautenticacionPendiente(false);
        } catch (error) {
            if (requiereReautenticacion(error)) {
                operacionPendiente.current = { clave, operacion };
                setReautenticacionPendiente(true);
                setAviso({
                    error: true,
                    texto: "Por seguridad confirma tu identidad para continuar. Tu información no se modificó.",
                });
            } else {
                console.error(`Falló la operación "${clave}":`, error);
                setAviso({ error: true, texto: mensajeErrorAutenticacion(error) });
            }
        } finally {
            setCargando("");
        }
    };

    const handleConfirmarIdentidad = async (metodo) => {
        if (metodo === "correo" && !contrasenaReauth) {
            setAviso({ error: true, texto: "Escribe tu contraseña actual." });
            return;
        }

        setAviso(null);
        setCargando("reauth");

        try {
            if (metodo === "google") {
                await reautenticarConGoogle();
            } else {
                await reautenticarConCorreo(contrasenaReauth);
            }

            setContrasenaReauth("");
            const pendiente = operacionPendiente.current;
            operacionPendiente.current = null;
            setReautenticacionPendiente(false);

            if (pendiente) {
                await ejecutar(pendiente.clave, pendiente.operacion);
            } else {
                setAviso({ texto: "Identidad confirmada." });
            }
        } catch (error) {
            console.error("No se pudo confirmar la identidad:", error);
            setAviso({ error: true, texto: mensajeErrorAutenticacion(error) });
        } finally {
            setCargando("");
        }
    };

    const handleVincularCorreo = (event) => {
        event.preventDefault();

        if (!correo.trim() || contrasena.length < 6) {
            setAviso({ error: true, texto: "Escribe un correo y una contraseña de al menos 6 caracteres." });
            return undefined;
        }

        if (contrasena !== confirmacion) {
            setAviso({ error: true, texto: "Las contraseñas no coinciden." });
            return undefined;
        }

        const correoAVincular = correo;
        const contrasenaAVincular = contrasena;

        return ejecutar("correo", async () => {
            await vincularCorreoConCuenta(correoAVincular, contrasenaAVincular);
            await sincronizarCuenta();
            setContrasena("");
            setConfirmacion("");
            setAviso({
                texto: "Correo y contraseña vinculados. Ya puedes entrar con cualquiera de los dos métodos y verás la misma información.",
            });
        });
    };

    const handleVincularGoogle = () => ejecutar("google", async () => {
        await vincularGoogleConCuenta();
        await sincronizarCuenta();
        setAviso({ texto: "Google quedó vinculado a tu cuenta actual." });
    });

    const handleCambiarContrasena = (event) => {
        event.preventDefault();

        if (nuevaContrasena.length < 6) {
            setAviso({ error: true, texto: "La nueva contraseña debe tener al menos 6 caracteres." });
            return undefined;
        }

        if (nuevaContrasena !== confirmacionNueva) {
            setAviso({ error: true, texto: "Las contraseñas no coinciden." });
            return undefined;
        }

        const contrasenaNueva = nuevaContrasena;

        return ejecutar("cambioContrasena", async () => {
            await actualizarContrasena(contrasenaNueva);
            setNuevaContrasena("");
            setConfirmacionNueva("");
            setAviso({ texto: "Contraseña actualizada." });
        });
    };

    const handleDesvincular = async (providerId) => {
        const nombre = providerId === PROVEEDOR_GOOGLE ? "Google" : "el acceso por correo";
        const confirmado = await confirmarEliminacion({
            titulo: `¿Quitar ${nombre}?`,
            texto: "Tu cuenta, tus movimientos y todo tu historial se conservan intactos: solo dejarás de poder entrar por esa vía.",
            textoConfirmar: "Sí, quitar",
        });

        if (!confirmado) return undefined;

        return ejecutar(`desvincular-${providerId}`, async () => {
            await desvincularProveedor(providerId);
            await sincronizarCuenta();
            setAviso({ texto: `Se quitó ${nombre}. Tu información sigue completa.` });
        });
    };

    const handleVerificarCorreo = () => ejecutar("verificacion", async () => {
        await enviarVerificacionCorreo();
        setAviso({ texto: "Te enviamos un correo para verificar tu dirección." });
    });

    const handleDescargarRespaldo = () => ejecutar("respaldo", async () => {
        const uid = auth.currentUser?.uid || usuario?.uid;

        if (!uid) {
            throw new Error("No hay una sesión activa para generar el respaldo.");
        }

        const respaldo = await descargarRespaldo(uid, auth.currentUser);
        const { totalDocumentos } = respaldo.metadatos;

        setAviso(respaldo.errores.length
            ? {
                error: true,
                texto: `Respaldo descargado con ${totalDocumentos} documentos, pero ${respaldo.errores.length} ruta(s) no se pudieron leer: ${respaldo.errores.map((item) => item.ruta).join(", ")}.`,
            }
            : { texto: `Respaldo descargado: ${totalDocumentos} documentos en un archivo JSON. No se modificó nada en la nube.` });
    });

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

            {reautenticacionPendiente && (
                <CajaReautenticacion>
                    <TituloPanel><FaShieldAlt /> Confirma tu identidad</TituloPanel>
                    <TextoPanel>
                        Firebase pide un inicio de sesión reciente para los cambios de seguridad.
                        Confirma y la operación continúa automáticamente.
                    </TextoPanel>

                    {tieneGoogle && (
                        <Boton
                            type="button"
                            $google
                            onClick={() => handleConfirmarIdentidad("google")}
                            disabled={cargando === "reauth"}
                        >
                            <FaGoogle /> {cargando === "reauth" ? "Confirmando..." : "Confirmar con Google"}
                        </Boton>
                    )}

                    {tieneCorreo && (
                        <Formulario
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleConfirmarIdentidad("correo");
                            }}
                            style={{ marginTop: tieneGoogle ? 10 : 0 }}
                        >
                            <Campo>
                                Contraseña actual
                                <Input
                                    type="password"
                                    value={contrasenaReauth}
                                    onChange={(event) => setContrasenaReauth(event.target.value)}
                                    autoComplete="current-password"
                                />
                            </Campo>
                            <Boton type="submit" disabled={cargando === "reauth"}>
                                <FaShieldAlt /> {cargando === "reauth" ? "Confirmando..." : "Confirmar con contraseña"}
                            </Boton>
                        </Formulario>
                    )}
                </CajaReautenticacion>
            )}

            <Grid>
                <PerfilPrincipal>
                    <Avatar>
                        {cuenta?.photoURL ? <img src={cuenta.photoURL} alt="" /> : iniciales(nombreVisible)}
                    </Avatar>
                    <Nombre>{nombreVisible}</Nombre>
                    <Correo>{cuenta?.email || usuario?.email || "Correo no disponible"}</Correo>
                    {cuenta?.email && !cuenta.emailVerified && (
                        <BotonTexto
                            type="button"
                            onClick={handleVerificarCorreo}
                            disabled={cargando === "verificacion"}
                            style={{ marginTop: 8, paddingLeft: 0 }}
                        >
                            {cargando === "verificacion" ? "Enviando..." : "Verificar correo"}
                        </BotonTexto>
                    )}
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
                            <AccionesProveedor>
                                {tieneGoogle
                                    ? <EstadoProveedor><FaCheckCircle /> Vinculado</EstadoProveedor>
                                    : <EstadoProveedor $inactivo>Sin vincular</EstadoProveedor>}
                                {tieneGoogle && tieneCorreo && (
                                    <BotonTexto
                                        type="button"
                                        onClick={() => handleDesvincular(PROVEEDOR_GOOGLE)}
                                        disabled={cargando === `desvincular-${PROVEEDOR_GOOGLE}`}
                                    >
                                        <FaUnlink /> Quitar
                                    </BotonTexto>
                                )}
                            </AccionesProveedor>
                        </Proveedor>
                        <Proveedor>
                            <ProveedorNombre><FaKey /> Correo y contraseña</ProveedorNombre>
                            <AccionesProveedor>
                                {tieneCorreo
                                    ? <EstadoProveedor><FaCheckCircle /> Vinculado</EstadoProveedor>
                                    : <EstadoProveedor $inactivo>Sin vincular</EstadoProveedor>}
                                {tieneGoogle && tieneCorreo && (
                                    <BotonTexto
                                        type="button"
                                        onClick={() => handleDesvincular(PROVEEDOR_CORREO)}
                                        disabled={cargando === `desvincular-${PROVEEDOR_CORREO}`}
                                    >
                                        <FaUnlink /> Quitar
                                    </BotonTexto>
                                )}
                            </AccionesProveedor>
                        </Proveedor>
                    </Proveedores>

                    {!tieneCorreo && (
                        <>
                            <TituloPanel><FaKey /> Añadir acceso por correo</TituloPanel>
                            <TextoPanel>
                                Te recomendamos usar el mismo correo de tu cuenta actual: las reglas de cobranza asignan préstamos por correo, y cambiarlo puede dejar fuera asignaciones existentes.
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

                    {tieneCorreo && (
                        <>
                            <TituloPanel><FaKey /> Cambiar contraseña</TituloPanel>
                            <TextoPanel>
                                Actualiza la contraseña con la que entras cuando no tienes tu cuenta de Google a la mano.
                            </TextoPanel>
                            <Formulario onSubmit={handleCambiarContrasena}>
                                <Campo>
                                    Nueva contraseña
                                    <Input
                                        type="password"
                                        value={nuevaContrasena}
                                        onChange={(event) => setNuevaContrasena(event.target.value)}
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </Campo>
                                <Campo>
                                    Confirmar nueva contraseña
                                    <Input
                                        type="password"
                                        value={confirmacionNueva}
                                        onChange={(event) => setConfirmacionNueva(event.target.value)}
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </Campo>
                                <Boton type="submit" disabled={cargando === "cambioContrasena"}>
                                    <FaKey /> {cargando === "cambioContrasena" ? "Actualizando..." : "Actualizar contraseña"}
                                </Boton>
                            </Formulario>
                        </>
                    )}

                    {!tieneGoogle && (
                        <>
                            <Separador />
                            <TituloPanel><FaGoogle /> Añadir Google</TituloPanel>
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

                <PanelAncho>
                    <TituloPanel><FaSlidersH /> Preferencias de captura</TituloPanel>
                    <TextoPanel>
                        Ajusta cómo arranca el formulario de movimiento para escribir menos.
                        Los cambios se guardan solos y te siguen a cualquier dispositivo.
                    </TextoPanel>

                    <PanelPreferencias />
                </PanelAncho>

                <PanelAncho>
                    <TituloPanel><FaCloudDownloadAlt /> Respaldo de mi información</TituloPanel>
                    <TextoPanel>
                        Descarga una copia completa de todo lo que hay en la nube asociado a esta cuenta.
                        Es una operación de <strong>solo lectura</strong>: no borra ni modifica nada en Firebase.
                    </TextoPanel>

                    <ListaRespaldo>
                        <li>Perfil, cuentas e instituciones</li>
                        <li>Movimientos mensuales y compras planeadas</li>
                        <li>Ingresos por año (perfil y colección global)</li>
                        <li>Ahorros por año</li>
                        <li>Préstamos y cobranza con su historial de pagos</li>
                        <li>Despensa: catálogo, compras, movimientos e inventario</li>
                    </ListaRespaldo>

                    <Boton
                        type="button"
                        onClick={handleDescargarRespaldo}
                        disabled={cargando === "respaldo"}
                        style={{ maxWidth: 320 }}
                    >
                        <FaCloudDownloadAlt /> {cargando === "respaldo" ? "Generando respaldo..." : "Descargar respaldo (JSON)"}
                    </Boton>

                    <Nota>
                        <FaExclamationTriangle style={{ marginRight: 5, color: "#c48a22" }} />
                        El respaldo solo incluye la cuenta con la que iniciaste sesión ahora mismo.
                        Para respaldar otra cuenta, entra con ella y repite la descarga.
                    </Nota>
                </PanelAncho>
            </Grid>

            <FooterPerfiles aria-label="Perfiles disponibles">
                <FooterPerfilesHeader>
                    <h2><FaUsers /> Perfiles</h2>
                    <span>{cargandoPerfiles ? "Cargando…" : `${perfilesVisibles.length} disponibles`}</span>
                </FooterPerfilesHeader>
                <ListaPerfiles>
                    {perfilesVisibles.map((perfil) => {
                        const nombrePerfil = `${perfil.nombres || ""} ${perfil.apellidos || ""}`.trim()
                            || perfil.displayName
                            || "Perfil sin nombre";
                        const esActual = perfil.uid === usuario?.uid;
                        return (
                            <PerfilFooterCard key={perfil.uid} $actual={esActual}>
                                <span>{iniciales(nombrePerfil)}</span>
                                <div>
                                    <strong>{nombrePerfil}</strong>
                                    <small>{perfil.email || perfil.correo || "Sin correo"}</small>
                                </div>
                                {esActual ? <em>Actual</em> : null}
                            </PerfilFooterCard>
                        );
                    })}
                </ListaPerfiles>
            </FooterPerfiles>
        </Pagina>
    );
};

export const PaginaPerfil = () => <PaginaPerfilUx />;
