import styled from "styled-components";
import { confirmarAccion, confirmarEliminacion } from "../../funciones/utils/avisos";
import { PanelPreferencias } from "./panelPreferencias";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reload } from "firebase/auth";
import {
    FaCheckCircle,
    FaCloudDownloadAlt,
    FaCloudUploadAlt,
    FaExclamationTriangle,
    FaGoogle,
    FaKey,
    FaLink,
    FaShieldAlt,
    FaSlidersH,
    FaUnlink,
    FaUserCircle,
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
import { descargarRespaldo, restaurarRespaldo } from "../../funciones/firebase/respaldo";
import { BotonDatos, ModalDatos } from "../../componentes/Modales/ModalDatos";
import { sincronizarPerfilConAuth } from "../../funciones/firebase/usuario";
import { useAppStore } from "../../stores/useAppStore";

const ESCRITORIO = "(min-width: 960px)";

const Pagina = styled.main`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 8px 0 36px;
    color: #25212d;

    /* Los controles nativos no heredan la tipografía del sistema por sí solos. */
    button,
    input,
    select,
    textarea {
        font-family: inherit;
    }
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
    margin: 2px 0 0;
    color: var(--colorMorado);
    font-size: 26px;
    font-weight: 800;
    line-height: 1.2;

    @media (max-width: 500px) {
        font-size: 21px;
    }
`;

const Subtitulo = styled.p`
    margin: 4px 0 0;
    color: #666;
    font-size: 13px;
    line-height: 1.5;
`;

const Aviso = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-bottom: 16px;
    border: 1px solid ${({ $error }) => ($error ? "rgba(180, 35, 24, 0.2)" : "rgba(40, 122, 71, 0.2)")};
    border-radius: 12px;
    background: ${({ $error }) => ($error ? "rgba(180, 35, 24, 0.06)" : "rgba(40, 122, 71, 0.06)")};
    color: ${({ $error }) => ($error ? "#a42318" : "#287a47")};
    padding: 11px 13px;
    font-size: 12.5px;
    line-height: 1.45;

    svg {
        flex-shrink: 0;
        margin-top: 2px;
    }
`;

/*
 * En celular las columnas se disuelven (`display: contents`) y los paneles
 * quedan en una sola fila ordenada por `$orden`: perfil, acceso, preferencias
 * y respaldo. En computadora, perfil y respaldo forman la columna lateral.
 */
const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;

    @media ${ESCRITORIO} {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        align-items: start;
    }
`;

const Columna = styled.div`
    display: contents;

    @media ${ESCRITORIO} {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
    }
`;

const Panel = styled.section`
    order: ${({ $orden }) => $orden || 0};
    min-width: 0;
    border: 1px solid rgba(83, 59, 143, 0.12);
    border-radius: 16px;
    background: white;
    box-shadow: 0 12px 30px rgba(37, 24, 62, 0.06);
    padding: 20px;

    @media (max-width: 700px) {
        padding: 16px;
    }
`;

const PerfilPrincipal = styled(Panel)`
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: linear-gradient(145deg, #fbfafd 0%, #f4f0fb 100%);
    border-color: rgba(83, 59, 143, 0.2);
`;

const Identidad = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;

    @media ${ESCRITORIO} {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const Avatar = styled.div`
    flex-shrink: 0;
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

const DatosIdentidad = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const Nombre = styled.h2`
    margin: 0;
    color: #2e2639;
    font-size: 19px;
    font-weight: 800;
    line-height: 1.25;
`;

const Correo = styled.p`
    margin: 0;
    color: #6c6675;
    font-size: 12.5px;
    overflow-wrap: anywhere;
`;

const ListaChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const TONOS_CHIP = {
    ok: { texto: "#287a47", fondo: "rgba(40, 122, 71, 0.1)", borde: "rgba(40, 122, 71, 0.18)" },
    alerta: { texto: "#a06a12", fondo: "rgba(196, 138, 34, 0.12)", borde: "rgba(196, 138, 34, 0.24)" },
    neutro: { texto: "var(--colorMorado)", fondo: "#ffffff", borde: "rgba(83, 59, 143, 0.16)" },
};

const ChipEstado = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border: 1px solid ${({ $tono = "neutro" }) => TONOS_CHIP[$tono].borde};
    border-radius: 999px;
    background: ${({ $tono = "neutro" }) => TONOS_CHIP[$tono].fondo};
    color: ${({ $tono = "neutro" }) => TONOS_CHIP[$tono].texto};
    font-size: 11px;
    font-weight: 800;
    line-height: 1.3;

    svg {
        font-size: 10.5px;
    }
`;

const UID = styled.div`
    padding-top: 12px;
    border-top: 1px solid rgba(83, 59, 143, 0.12);
    color: #817b89;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;

    code {
        display: block;
        margin-top: 3px;
        color: #6c6675;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 10.5px;
        font-weight: 400;
        letter-spacing: 0;
        text-transform: none;
        overflow-wrap: anywhere;
    }
`;

const CabeceraPanel = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
`;

const IconoPanel = styled.span`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: rgba(83, 59, 143, 0.1);
    color: var(--colorMorado);
    font-size: 15px;
`;

const TituloPanel = styled.h3`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: #30283a;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.3;
`;

const TextoPanel = styled.p`
    margin: 3px 0 0;
    color: #716b79;
    font-size: 12.5px;
    line-height: 1.5;
`;

const CuerpoAcceso = styled.div`
    display: grid;
    gap: 18px;

    @media (min-width: 1100px) {
        grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
        gap: 24px;
    }
`;

const Bloque = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

const BloqueSeparado = styled(Bloque)`
    padding-top: 18px;
    border-top: 1px solid rgba(83, 59, 143, 0.12);

    @media (min-width: 1100px) {
        padding: 0 0 0 24px;
        border-top: none;
        border-left: 1px solid rgba(83, 59, 143, 0.12);
    }
`;

const SubtituloBloque = styled.h4`
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: var(--colorMorado);
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
`;

const DescripcionBloque = styled.p`
    margin: 0;
    color: #716b79;
    font-size: 12px;
    line-height: 1.5;
`;

const Proveedores = styled.div`
    display: grid;
    gap: 8px;
`;

const Proveedor = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    border: 1px solid ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.24)" : "rgba(83, 59, 143, 0.12)")};
    border-radius: 12px;
    padding: 11px 12px;
    background: ${({ $activo }) => ($activo ? "#faf8ff" : "#ffffff")};
`;

const ProveedorNombre = styled.div`
    display: flex;
    align-items: center;
    gap: 9px;
    color: #393142;
    font-size: 13px;
    font-weight: 800;

    svg {
        color: ${({ $google }) => ($google ? "#db4437" : "var(--colorMorado)")};
        font-size: 15px;
    }
`;

const EstadoProveedor = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 999px;
    background: ${({ $inactivo }) => ($inactivo ? "rgba(108, 102, 117, 0.08)" : "rgba(40, 122, 71, 0.1)")};
    color: ${({ $inactivo }) => ($inactivo ? "#7a7090" : "#287a47")};
    font-size: 9.5px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const AccionesProveedor = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Formulario = styled.form`
    display: grid;
    gap: 10px;
`;

const FilaCampos = styled.div`
    display: grid;
    gap: 10px;

    @media (min-width: 600px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const Campo = styled.label`
    display: grid;
    gap: 5px;
    color: #514a5b;
    font-size: 11.5px;
    font-weight: 800;
`;

const Input = styled.input`
    width: 100%;
    min-height: 40px;
    box-sizing: border-box;
    border: 1px solid rgba(83, 59, 143, 0.2);
    border-radius: 10px;
    padding: 9px 11px;
    background: white;
    color: #282132;
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
    min-height: 40px;
    border: ${({ $secundario }) => ($secundario ? "1px solid rgba(83, 59, 143, 0.35)" : "none")};
    border-radius: 10px;
    padding: 10px 14px;
    background: ${({ $google, $secundario }) =>
        $google ? "#3d67b1" : $secundario ? "rgba(83, 59, 143, 0.06)" : "var(--colorMorado)"};
    color: ${({ $secundario }) => ($secundario ? "var(--colorMorado)" : "white")};
    font-size: 12.5px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.2s ease, filter 0.2s ease;

    &:hover {
        ${({ $secundario }) =>
            $secundario
                ? "background: rgba(83, 59, 143, 0.12);"
                : "filter: brightness(1.08);"}
    }

    &:focus-visible {
        outline: 2px solid var(--colorMorado);
        outline-offset: 2px;
    }

    &:disabled {
        cursor: wait;
        opacity: 0.55;
    }
`;

const GrupoBotones = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
`;

const BotonTexto = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: #a4485c;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    padding: 4px;

    &:hover {
        text-decoration: underline;
    }

    &:disabled {
        cursor: wait;
        opacity: 0.5;
    }
`;

const BotonVerificar = styled(BotonTexto)`
    align-self: flex-start;
    padding: 0;
    color: var(--colorMorado);
`;

const Nota = styled.p`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 12px 0 0;
    color: #817b89;
    font-size: 11.5px;
    line-height: 1.45;

    svg {
        flex-shrink: 0;
        margin-top: 2px;
    }
`;

const CajaReautenticacion = styled.div`
    margin-bottom: 16px;
    border: 1px solid rgba(196, 138, 34, 0.28);
    border-radius: 14px;
    background: rgba(240, 178, 44, 0.08);
    padding: 16px;

    ${TextoPanel} {
        margin: 6px 0 14px;
    }
`;

const AccionesReautenticacion = styled.div`
    display: grid;
    gap: 10px;
    max-width: 560px;
`;

const ChipsRespaldo = styled(ListaChips)`
    margin-bottom: 16px;
`;

const CONTENIDO_RESPALDO = [
    "Perfil, cuentas e instituciones",
    "Movimientos y compras planeadas",
    "Ingresos por año",
    "Ahorros por año",
    "Préstamos y cobranza",
    "Despensa e inventario",
];

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
    const { usuario, setUsuario, cargarDatos } = useAppStore();
    const [cuenta, setCuenta] = useState(() => obtenerSnapshotAuth(auth.currentUser));
    const [cuentaCargada, setCuentaCargada] = useState(false);
    const [modalDatosAbierto, setModalDatosAbierto] = useState(false);
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [nuevaContrasena, setNuevaContrasena] = useState("");
    const [confirmacionNueva, setConfirmacionNueva] = useState("");
    const [contrasenaReauth, setContrasenaReauth] = useState("");
    const [reautenticacionPendiente, setReautenticacionPendiente] = useState(false);
    const [cargando, setCargando] = useState("");
    const [aviso, setAviso] = useState(null);
    const operacionPendiente = useRef(null);
    const inputArchivoRef = useRef(null);

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

        const proveedoresAuth = actualizada.providerData.map((proveedor) => proveedor.providerId);
        const perfilDesalineado =
            (usuarioActual.email || "") !== (actualizada.email || "")
            || [...(usuarioActual.proveedores || [])].sort().join() !== [...proveedoresAuth].sort().join()
            || usuarioActual.emailVerificado !== actualizada.emailVerified;
        if (perfilDesalineado) {
            await sincronizarPerfilConAuth(actualizada.uid, {
                email: actualizada.email,
                proveedores: proveedoresAuth,
                emailVerificado: actualizada.emailVerified,
            });
        }

        setCuentaCargada(true);
        return actualizada;
    }, [setUsuario]);

    // Al recargar /perfil, auth.currentUser aún no existe en el primer render;
    // se vuelve a sincronizar cuando la sesión termina de rehidratarse.
    useEffect(() => {
        if (!usuario?.uid) return;
        sincronizarCuenta().catch((error) => {
            console.error("No se pudo cargar el perfil de autenticación:", error);
        });
    }, [sincronizarCuenta, usuario?.uid]);


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

    const handleCargarRespaldoClick = () => {
        inputArchivoRef.current?.click();
    };

    const handleArchivoSeleccionado = async (event) => {
        const archivo = event.target.files?.[0];
        event.target.value = "";
        if (!archivo) return;

        const uid = auth.currentUser?.uid || usuario?.uid;
        if (!uid) {
            setAviso({ error: true, texto: "No hay una sesión activa para cargar el respaldo." });
            return;
        }

        let datosJson;
        try {
            const contenidoTexto = await archivo.text();
            datosJson = JSON.parse(contenidoTexto);
        } catch {
            setAviso({ error: true, texto: "El archivo seleccionado no es un JSON válido." });
            return;
        }

        const confirmado = await confirmarAccion({
            titulo: "¿Cargar respaldo?",
            texto: "Se importará la información del archivo en tu cuenta de Zaldo. Los documentos se agregarán o actualizarán.",
            textoConfirmar: "Sí, cargar respaldo",
        });

        if (!confirmado) return;

        await ejecutar("cargarRespaldo", async () => {
            const resultado = await restaurarRespaldo(datosJson, uid);
            useAppStore.getState().limpiarAhorros?.();
            useAppStore.getState().limpiarDespensa?.(uid);
            useAppStore.getState().limpiarPrestamos?.();
            useAppStore.getState().setMovimientos({});
            await cargarDatos(uid);

            if (resultado.errores?.length) {
                setAviso({
                    error: true,
                    texto: `Respaldo cargado con ${resultado.totalDocumentos} documentos, pero ${resultado.errores.length} ruta(s) tuvieron errores: ${resultado.errores.map((item) => item.ruta).join(", ")}.`,
                });
            } else {
                setAviso({
                    texto: `Respaldo cargado exitosamente: ${resultado.totalDocumentos} documentos sincronizados con la nube.`,
                });
            }
        });
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

            {aviso && (
                <Aviso $error={aviso.error} role="status">
                    {aviso.error ? <FaExclamationTriangle /> : <FaCheckCircle />}
                    <span>{aviso.texto}</span>
                </Aviso>
            )}

            {reautenticacionPendiente && (
                <CajaReautenticacion>
                    <TituloPanel><FaShieldAlt /> Confirma tu identidad</TituloPanel>
                    <TextoPanel>
                        Firebase pide un inicio de sesión reciente para los cambios de seguridad.
                        Confirma y la operación continúa automáticamente.
                    </TextoPanel>

                    <AccionesReautenticacion>
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
                    </AccionesReautenticacion>
                </CajaReautenticacion>
            )}

            <Layout>
                <Columna>
                    <PerfilPrincipal data-tour="perfil-datos" $orden={1}>
                        <Identidad>
                            <Avatar>
                                {cuenta?.photoURL ? <img src={cuenta.photoURL} alt="" /> : iniciales(nombreVisible)}
                            </Avatar>
                            <DatosIdentidad>
                                <Nombre>{nombreVisible}</Nombre>
                                <Correo>{cuenta?.email || usuario?.email || "Correo no disponible"}</Correo>
                            </DatosIdentidad>
                        </Identidad>

                        {cuentaCargada && (
                            <ListaChips>
                                {cuenta?.email && (cuenta.emailVerified
                                    ? <ChipEstado $tono="ok"><FaCheckCircle /> Correo verificado</ChipEstado>
                                    : <ChipEstado $tono="alerta"><FaExclamationTriangle /> Correo sin verificar</ChipEstado>)}
                                {tieneGoogle && <ChipEstado><FaGoogle /> Google</ChipEstado>}
                                {tieneCorreo && <ChipEstado><FaKey /> Contraseña</ChipEstado>}
                            </ListaChips>
                        )}

                        {cuenta?.email && !cuenta.emailVerified && (
                            <BotonVerificar
                                type="button"
                                onClick={handleVerificarCorreo}
                                disabled={cargando === "verificacion"}
                            >
                                {cargando === "verificacion" ? "Enviando..." : "Enviar enlace de verificación"}
                            </BotonVerificar>
                        )}

                        <UID>
                            UID de Firebase
                            <code>{cuenta?.uid || auth.currentUser?.uid || "—"}</code>
                        </UID>
                    </PerfilPrincipal>

                    <Panel data-tour="perfil-respaldo" $orden={4}>
                        <CabeceraPanel>
                            <IconoPanel><FaCloudDownloadAlt /></IconoPanel>
                            <div>
                                <TituloPanel>Respaldo</TituloPanel>
                                <TextoPanel>
                                    Descarga una copia de todo lo que hay en la nube de esta cuenta o restaura un respaldo JSON.
                                </TextoPanel>
                            </div>
                        </CabeceraPanel>

                        <ChipsRespaldo aria-label="Qué incluye el respaldo">
                            {CONTENIDO_RESPALDO.map((contenido) => (
                                <ChipEstado key={contenido}>{contenido}</ChipEstado>
                            ))}
                        </ChipsRespaldo>

                        <GrupoBotones>
                            {cargando === "respaldo" || cargando === "cargarRespaldo" ? (
                                <Boton type="button" disabled>
                                    {cargando === "respaldo" ? "Generando respaldo..." : "Cargando respaldo..."}
                                </Boton>
                            ) : (
                                <BotonDatos
                                    etiqueta="Datos de respaldo"
                                    onClick={() => setModalDatosAbierto(true)}
                                />
                            )}

                            <ModalDatos
                                isOpen={modalDatosAbierto}
                                onClose={() => setModalDatosAbierto(false)}
                                titulo="Respaldo de mi información"
                                descripcion="Descarga una copia completa o restaura un respaldo previo en formato JSON."
                                cargar={[
                                    {
                                        id: "cargar-respaldo",
                                        titulo: "Cargar respaldo (JSON)",
                                        descripcion: "Restaura los datos de un archivo. Sobrescribe la información actual en la nube.",
                                        icono: <FaCloudUploadAlt />,
                                        onClick: handleCargarRespaldoClick,
                                        peligro: true,
                                        textoAccion: "Elegir archivo",
                                    },
                                ]}
                                descargar={[
                                    {
                                        id: "descargar-respaldo",
                                        titulo: "Descargar respaldo (JSON)",
                                        descripcion: "Copia de todo lo asociado a esta cuenta. No modifica nada en la nube.",
                                        icono: <FaCloudDownloadAlt />,
                                        onClick: handleDescargarRespaldo,
                                    },
                                ]}
                            />

                            <input
                                type="file"
                                ref={inputArchivoRef}
                                onChange={handleArchivoSeleccionado}
                                accept=".json,application/json"
                                style={{ display: "none" }}
                            />
                        </GrupoBotones>

                        <Nota>
                            <FaExclamationTriangle style={{ color: "#c48a22" }} />
                            <span>
                                Solo incluye la cuenta con la que iniciaste sesión ahora mismo.
                                Para respaldar otra cuenta, entra con ella y repite la descarga.
                            </span>
                        </Nota>
                    </Panel>
                </Columna>

                <Columna>
                    <Panel data-tour="perfil-acceso" $orden={2}>
                        <CabeceraPanel>
                            <IconoPanel><FaLink /></IconoPanel>
                            <div>
                                <TituloPanel>Métodos de acceso</TituloPanel>
                                <TextoPanel>
                                    Puedes iniciar sesión con más de un método y conservar la misma cuenta, datos y permisos.
                                </TextoPanel>
                            </div>
                        </CabeceraPanel>

                        <CuerpoAcceso>
                            <Bloque>
                                <SubtituloBloque>Vinculados</SubtituloBloque>
                                <Proveedores>
                                    <Proveedor $activo={tieneGoogle}>
                                        <ProveedorNombre $google><FaGoogle /> Google</ProveedorNombre>
                                        <AccionesProveedor>
                                            {tieneGoogle
                                                ? <EstadoProveedor><FaCheckCircle /> Vinculado</EstadoProveedor>
                                                : <EstadoProveedor $inactivo>{cuentaCargada ? "Sin vincular" : "Verificando…"}</EstadoProveedor>}
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
                                    <Proveedor $activo={tieneCorreo}>
                                        <ProveedorNombre><FaKey /> Correo y contraseña</ProveedorNombre>
                                        <AccionesProveedor>
                                            {tieneCorreo
                                                ? <EstadoProveedor><FaCheckCircle /> Vinculado</EstadoProveedor>
                                                : <EstadoProveedor $inactivo>{cuentaCargada ? "Sin vincular" : "Verificando…"}</EstadoProveedor>}
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

                                {cuentaCargada && !tieneGoogle && (
                                    <>
                                        <DescripcionBloque>
                                            Vincula tu cuenta de Google para entrar rápidamente sin perder esta cuenta.
                                        </DescripcionBloque>
                                        <Boton type="button" $google onClick={handleVincularGoogle} disabled={cargando === "google"}>
                                            <FaGoogle /> {cargando === "google" ? "Vinculando..." : "Vincular cuenta de Google"}
                                        </Boton>
                                    </>
                                )}

                                {tieneCorreo && tieneGoogle && (
                                    <Nota>
                                        <FaUserCircle />
                                        <span>Tu cuenta está protegida con dos métodos de acceso.</span>
                                    </Nota>
                                )}
                            </Bloque>

                            {cuentaCargada && !tieneCorreo && (
                                <BloqueSeparado>
                                    <SubtituloBloque><FaKey /> Añadir acceso por correo</SubtituloBloque>
                                    <DescripcionBloque>
                                        Te recomendamos usar el mismo correo de tu cuenta actual: las reglas de cobranza asignan préstamos por correo, y cambiarlo puede dejar fuera asignaciones existentes.
                                    </DescripcionBloque>
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
                                        <FilaCampos>
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
                                        </FilaCampos>
                                        <Boton type="submit" disabled={cargando === "correo"}>
                                            <FaLink /> {cargando === "correo" ? "Vinculando..." : "Vincular correo y contraseña"}
                                        </Boton>
                                    </Formulario>
                                </BloqueSeparado>
                            )}

                            {tieneCorreo && (
                                <BloqueSeparado>
                                    <SubtituloBloque><FaKey /> Cambiar contraseña</SubtituloBloque>
                                    <DescripcionBloque>
                                        Actualiza la contraseña con la que entras cuando no tienes tu cuenta de Google a la mano.
                                    </DescripcionBloque>
                                    <Formulario onSubmit={handleCambiarContrasena}>
                                        <FilaCampos>
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
                                                Confirmar nueva
                                                <Input
                                                    type="password"
                                                    value={confirmacionNueva}
                                                    onChange={(event) => setConfirmacionNueva(event.target.value)}
                                                    autoComplete="new-password"
                                                    minLength={6}
                                                    required
                                                />
                                            </Campo>
                                        </FilaCampos>
                                        <Boton type="submit" disabled={cargando === "cambioContrasena"}>
                                            <FaKey /> {cargando === "cambioContrasena" ? "Actualizando..." : "Actualizar contraseña"}
                                        </Boton>
                                    </Formulario>
                                </BloqueSeparado>
                            )}
                        </CuerpoAcceso>
                    </Panel>

                    <Panel data-tour="perfil-preferencias" $orden={3}>
                        <CabeceraPanel>
                            <IconoPanel><FaSlidersH /></IconoPanel>
                            <div>
                                <TituloPanel>Preferencias</TituloPanel>
                                <TextoPanel>
                                    Ajusta Zaldo a tu forma de trabajar. Los cambios se guardan solos y te siguen a cualquier dispositivo.
                                </TextoPanel>
                            </div>
                        </CabeceraPanel>

                        <PanelPreferencias />
                    </Panel>
                </Columna>
            </Layout>
        </Pagina>
    );
};

export const PaginaPerfil = () => <PaginaPerfilUx />;
