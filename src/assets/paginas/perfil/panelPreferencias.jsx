import styled from "styled-components";
import { useState } from "react";
import {
    FaSlidersH,
    FaCheck,
    FaBell,
    FaCamera,
    FaEye,
    FaMicrophone,
    FaMobileAlt,
    FaPencilAlt,
    FaQuestionCircle,
    FaRobot,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { ALCANCES_GASTOS_ASISTENTE, DESTINOS_BOTON_PRINCIPAL, guardarPreferencias, reiniciarTutoriales } from "../../funciones/firebase/preferencias";
import { CATEGORIAS_COMPRA, obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";
import { avisarBreve, avisarError } from "../../funciones/utils/avisos";
import { SelectVisual } from "../../componentes/genericos/SelectVisual";
import { PreguntasIA } from "./preguntasIA";
import { useInstalacionPWA } from "../../funciones/utils/instalacionPWA";
import { usePermisos } from "../../funciones/utils/permisos";

/* Barra de chips: en celular se desliza de lado, en computadora se acomoda en filas. */
const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(83, 59, 143, 0.12);

    @media (max-width: 700px) {
        flex-wrap: nowrap;
        overflow-x: auto;
        margin-inline: -16px;
        padding-inline: 16px;
        scrollbar-width: none;
        scroll-snap-type: x proximity;

        &::-webkit-scrollbar { display: none; }
    }
`;

const Chip = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 6px 13px;
    border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.18)")};
    border-radius: 999px;
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ffffff")};
    color: ${({ $activo }) => ($activo ? "#ffffff" : "#4a4255")};
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    scroll-snap-align: start;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    svg {
        font-size: 12px;
        color: ${({ $activo }) => ($activo ? "#ffffff" : "var(--colorMorado)")};
    }

    &:hover {
        border-color: var(--colorMorado);
        background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#faf8ff")};
    }

    &:focus-visible {
        outline: 2px solid var(--colorMorado);
        outline-offset: 2px;
    }
`;

const ConteoChip = styled.span`
    min-width: 30px;
    padding: 1px 6px;
    border-radius: 999px;
    background: ${({ $activo }) => ($activo ? "rgba(255, 255, 255, 0.22)" : "rgba(83, 59, 143, 0.1)")};
    color: inherit;
    font-size: 10px;
    font-weight: 900;
    text-align: center;
`;

const Seccion = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    & + & {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px dashed rgba(83, 59, 143, 0.16);
    }
`;

const TituloSeccion = styled.h4`
    margin: 0;
    color: var(--colorMorado);
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
`;

const GridOpciones = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 10px;
`;

const Opcion = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-width: 0;
    padding: 13px 14px;
    border: 1px solid ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.28)" : "rgba(83, 59, 143, 0.12)")};
    border-radius: 12px;
    background: ${({ $activo }) => ($activo ? "#faf8ff" : "#ffffff")};
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover { border-color: rgba(83, 59, 143, 0.34); }
`;

const TarjetaAjuste = styled.div`
    display: flex;
    flex-direction: column;
    gap: 9px;
    min-width: 0;
    padding: 13px 14px;
    border: 1px solid rgba(83, 59, 143, 0.12);
    border-radius: 12px;
    background: #ffffff;
`;

const InfoOpcion = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const NombreOpcion = styled.span`
    color: #322b3d;
    font-size: 13px;
    font-weight: 800;
`;

const DescripcionOpcion = styled.span`
    color: #716b79;
    font-size: 11.5px;
    line-height: 1.45;
`;

const Interruptor = styled.span`
    position: relative;
    flex-shrink: 0;
    width: 40px;
    height: 23px;
    border-radius: 999px;
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#cbd5e1")};
    transition: background 0.2s ease;

    &::after {
        content: "";
        position: absolute;
        top: 2.5px;
        left: ${({ $activo }) => ($activo ? "19.5px" : "2.5px")};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
        transition: left 0.2s ease;
    }

    input {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
    }
`;

const SelectorPreferencias = styled(SelectVisual)`
    font-size: 13px;
`;

const BtnSecundario = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 36px;
    padding: 6px 14px;
    border: 1px solid rgba(83, 59, 143, 0.3);
    border-radius: 10px;
    appearance: none;
    background: #ffffff;
    color: var(--colorMorado);
    font-family: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover { background: #faf8ff; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }

    &:focus-visible {
        outline: 2px solid var(--colorMorado);
        outline-offset: 2px;
    }
`;

const COLOR_ESTADO = {
    granted: { texto: "#287a47", fondo: "rgba(40, 122, 71, 0.1)" },
    denied: { texto: "#a42318", fondo: "rgba(180, 35, 24, 0.08)" },
    prompt: { texto: "#7a7090", fondo: "rgba(108, 102, 117, 0.08)" },
    desconocido: { texto: "#7a7090", fondo: "rgba(108, 102, 117, 0.08)" },
    "sin-dispositivo": { texto: "#a06a12", fondo: "rgba(196, 138, 34, 0.12)" },
    "no-soportado": { texto: "#a42318", fondo: "rgba(180, 35, 24, 0.08)" },
    consultando: { texto: "#7a7090", fondo: "rgba(108, 102, 117, 0.08)" },
};

const GridApp = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
    gap: 10px;
`;

const TarjetaApp = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: 13px;
    border: 1px solid ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.28)" : "rgba(83, 59, 143, 0.12)")};
    border-radius: 12px;
    background: ${({ $activo }) => ($activo ? "#faf8ff" : "#ffffff")};
`;

const CabeceraTarjeta = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
`;

const IconoPermiso = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: ${({ $tono }) => `${$tono}1a`};
    color: ${({ $tono }) => $tono};
    font-size: 15px;
`;

const TextosTarjeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const PieTarjeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const EstadoPermiso = styled.span`
    flex-shrink: 0;
    padding: 3px 8px;
    border-radius: 999px;
    background: ${({ $estado }) => COLOR_ESTADO[$estado]?.fondo || "rgba(108, 102, 117, 0.08)"};
    color: ${({ $estado }) => COLOR_ESTADO[$estado]?.texto || "#6c6675"};
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
`;

const AvisoGuardado = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    color: #287a47;
    font-size: 11px;
    font-weight: 800;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition: opacity 0.25s ease;
`;

/* Interruptores sueltos; cada pestaña decide cuáles muestra y en qué orden. */
const INTERRUPTORES = {
    gastoPersonalPorDefecto: {
        nombre: "Marcar como gasto personal",
        descripcion: "Los gastos nuevos llegan ya marcados como personales. Puedes desmarcarlos uno por uno.",
    },
    msiPorDefectoEnCredito: {
        nombre: "Asumir MSI en tarjetas de crédito",
        descripcion: "En tarjetas de crédito, los gastos arrancan como meses sin intereses en lugar de contado.",
    },
    recordarUltimaCuenta: {
        nombre: "Abrir en la última cuenta usada",
        descripcion: "Salta el paso de elegir cuenta y abre directo en la que usaste la vez pasada.",
    },
    ordenarCategoriasPorUso: {
        nombre: "Poner al frente las que más uso",
        descripcion: "Las cuatro categorías más frecuentes suben al principio de la cuadrícula.",
    },
    preguntarGastosRecurrentes: {
        nombre: "Preguntar por gastos recurrentes",
        descripcion: "Al entrar, la app pregunta por la renta y suscripciones cuyo día del mes ya pasó.",
    },
    preguntarIngresosRecurrentes: {
        nombre: "Preguntar por ingresos recurrentes",
        descripcion: "Avisa cuando llega el día de registrar horas trabajadas o cortes semanales (ej. sábados).",
    },
    sonidosActivos: {
        nombre: "Sonidos de la app",
        descripcion: "Sonidos cortos al registrar compras, descontar de la despensa, conciliar o cuando algo falla.",
    },
    mostrarCentavos: {
        nombre: "Mostrar centavos",
        descripcion: "Los saldos y montos se muestran con dos decimales en vez de redondeados.",
    },
    sugerirMejoras: {
        nombre: "Sugerencias del asistente",
        descripcion: "Una vez al día, al abrir el asistente, te propone completar tu cuenta: registrar tu trabajo, agregar cuentas o anotar lo que gastaste. Requiere acceso a la IA.",
    },
};

/* `interruptores` alimenta el contador del chip (activos / total). */
const PESTANAS = [
    {
        id: "captura",
        nombre: "Captura",
        Icono: FaPencilAlt,
        interruptores: ["gastoPersonalPorDefecto", "msiPorDefectoEnCredito", "recordarUltimaCuenta", "ordenarCategoriasPorUso"],
    },
    {
        id: "avisos",
        nombre: "Avisos y sonidos",
        Icono: FaBell,
        interruptores: ["preguntarGastosRecurrentes", "preguntarIngresosRecurrentes", "sonidosActivos"],
    },
    { id: "vista", nombre: "Vista y navegación", Icono: FaEye, interruptores: ["mostrarCentavos"] },
    { id: "asistente", nombre: "Asistente IA", Icono: FaRobot, interruptores: ["sugerirMejoras"] },
    { id: "app", nombre: "App y permisos", Icono: FaMobileAlt },
    { id: "ayuda", nombre: "Ayuda", Icono: FaQuestionCircle },
];

/*
 * Preferencias de captura. Cada cambio se guarda al momento: no hay botón de
 * "guardar" porque son interruptores sueltos, y esperar a confirmar solo
 * agregaría un paso donde no hace falta.
 */
/* Qué decir según lo que permite el navegador (instalacionPWA.js). */
const TEXTO_INSTALACION = {
    disponible: "Ábrela como app desde tu pantalla de inicio, sin la barra del navegador, y con el acceso directo a \"Nuevo gasto\".",
    instalada: "Ya la estás usando como app instalada.",
    ios: "En iPhone: toca Compartir en Safari y luego \"Agregar a inicio\".",
    "no-disponible": "Tu navegador no ofrece instalarla desde aquí. En Chrome o Edge busca \"Instalar app\" en el menú; en iPhone, Compartir → \"Agregar a inicio\".",
};

const ESTADO_INSTALACION = {
    disponible: { estado: "prompt", texto: "Disponible" },
    instalada: { estado: "granted", texto: "Instalada" },
    ios: { estado: "desconocido", texto: "Manual" },
    "no-disponible": { estado: "no-soportado", texto: "No disponible" },
};

/* Los permisos que la app usa de verdad, con lo que se muestra en cada tarjeta. */
const PERMISOS_APP = [
    {
        clave: "notificaciones",
        nombre: "Notificaciones",
        descripcion: "Avisos de Zaldo en este dispositivo.",
        Icono: FaBell,
        tono: "#c48a22",
        mensajeActivado: "Listo, las notificaciones quedaron activadas.",
    },
    {
        clave: "microfono",
        nombre: "Micrófono",
        descripcion: "Dictado por voz en el asistente.",
        Icono: FaMicrophone,
        tono: "#533b8f",
        mensajeActivado: "Listo, el micrófono quedó permitido.",
    },
    {
        clave: "camara",
        nombre: "Cámara",
        descripcion: "Fotos de tickets y comprobantes.",
        Icono: FaCamera,
        tono: "#287a47",
        mensajeActivado: "Listo, la cámara quedó permitida.",
    },
];

const TEXTO_ESTADO_PERMISO = {
    granted: "Permitido",
    denied: "Bloqueado",
    prompt: "Sin activar",
    desconocido: "Sin activar",
    "sin-dispositivo": "Sin dispositivo",
    "no-soportado": "No disponible",
    consultando: "Revisando…",
};

const ETIQUETA_BOTON_PERMISO = {
    granted: "Activado",
    denied: "Bloqueado",
    prompt: "Activar",
    desconocido: "Activar",
    "sin-dispositivo": "No disponible",
    "no-soportado": "No disponible",
    consultando: "Revisando…",
};

const AYUDA_PERMISO = {
    granted: "Ya está permitido en este dispositivo.",
    denied: "Lo bloqueaste en el navegador. Para permitirlo, ábrelo en la configuración del sitio.",
    prompt: "El navegador te pedirá permiso.",
    desconocido: "El navegador te pedirá permiso.",
    "sin-dispositivo": "No encontramos ese dispositivo en este equipo.",
    "no-soportado": "Este navegador no lo admite.",
    consultando: "Revisando el estado del permiso…",
};

export const PanelPreferencias = () => {
    const { usuario, preferencias, setPreferencias } = useAppStore();
    const [guardado, setGuardado] = useState(false);
    const [activandoPermiso, setActivandoPermiso] = useState("");
    const [pestana, setPestana] = useState(PESTANAS[0].id);
    const instalacion = useInstalacionPWA();
    const permisos = usePermisos();

    const activarPermiso = async (permiso) => {
        setActivandoPermiso(permiso.clave);

        try {
            const resultado = await permisos.solicitar(permiso.clave);

            // Lo demás se ve en la propia tarjeta: bloqueado, sin dispositivo, etc.
            if (resultado === "granted") avisarBreve(permiso.mensajeActivado);
        } finally {
            setActivandoPermiso("");
        }
    };

    const cambiar = async (clave, valor) => {
        const anterior = preferencias[clave];

        // Se refleja de inmediato y se revierte solo si Firestore falla.
        setPreferencias({ [clave]: valor });

        try {
            await guardarPreferencias(usuario.uid, { [clave]: valor });
            setGuardado(true);
            setTimeout(() => setGuardado(false), 1800);
        } catch (error) {
            setPreferencias({ [clave]: anterior });
            avisarError("No se pudo guardar la preferencia.", error);
        }
    };

    const volverAVerTutoriales = async () => {
        const anteriores = preferencias.tutorialesVistos;
        setPreferencias({ tutorialesVistos: {} });

        try {
            await reiniciarTutoriales(usuario.uid);
            avisarBreve("Listo, verás los tutoriales al entrar a cada pantalla.");
        } catch (error) {
            setPreferencias({ tutorialesVistos: anteriores });
            avisarError("No se pudieron reiniciar los tutoriales.", error);
        }
    };

    const interruptor = (clave) => {
        const { nombre, descripcion } = INTERRUPTORES[clave];
        const activo = Boolean(preferencias[clave]);

        return (
            <Opcion key={clave} $activo={activo}>
                <InfoOpcion>
                    <NombreOpcion>{nombre}</NombreOpcion>
                    <DescripcionOpcion>{descripcion}</DescripcionOpcion>
                </InfoOpcion>
                <Interruptor $activo={activo}>
                    <input
                        type="checkbox"
                        checked={activo}
                        onChange={(evento) => cambiar(clave, evento.target.checked)}
                        aria-label={nombre}
                    />
                </Interruptor>
            </Opcion>
        );
    };

    const contenidoPestana = {
        captura: (
            <>
                <Seccion>
                    <TituloSeccion>Al registrar un movimiento</TituloSeccion>
                    <GridOpciones>
                        {interruptor("gastoPersonalPorDefecto")}
                        {interruptor("msiPorDefectoEnCredito")}
                        {interruptor("recordarUltimaCuenta")}
                    </GridOpciones>
                </Seccion>

                <Seccion>
                    <TituloSeccion>Categorías</TituloSeccion>
                    <GridOpciones>
                        {interruptor("ordenarCategoriasPorUso")}
                        <TarjetaAjuste>
                            <InfoOpcion>
                                <NombreOpcion>Categoría preseleccionada</NombreOpcion>
                                <DescripcionOpcion>
                                    Si casi siempre registras el mismo tipo de gasto, déjala fija y ahórrate ese toque.
                                </DescripcionOpcion>
                            </InfoOpcion>
                            <SelectorPreferencias
                                value={preferencias.categoriaPorDefecto || ""}
                                onChange={(evento) => cambiar("categoriaPorDefecto", evento.target.value)}
                                aria-label="Categoría preseleccionada al registrar un movimiento"
                            >
                                <option value="">Ninguna (elegir cada vez)</option>
                                {CATEGORIAS_COMPRA.map((categoria) => (
                                    <option
                                        key={categoria.value}
                                        value={categoria.value}
                                        imagen={obtenerImagenCategoriaCompra(categoria.value)}
                                    >
                                        {categoria.label}
                                    </option>
                                ))}
                            </SelectorPreferencias>
                        </TarjetaAjuste>
                    </GridOpciones>
                </Seccion>
            </>
        ),
        avisos: (
            <Seccion>
                <TituloSeccion>Recordatorios y sonidos</TituloSeccion>
                <GridOpciones>
                    {interruptor("preguntarGastosRecurrentes")}
                    {interruptor("preguntarIngresosRecurrentes")}
                    {interruptor("sonidosActivos")}
                </GridOpciones>
            </Seccion>
        ),
        vista: (
            <>
                <Seccion>
                    <TituloSeccion>Montos</TituloSeccion>
                    <GridOpciones>{interruptor("mostrarCentavos")}</GridOpciones>
                </Seccion>

                <Seccion>
                    <TituloSeccion>Pantallas</TituloSeccion>
                    <GridOpciones>
                        <TarjetaAjuste>
                            <InfoOpcion>
                                <NombreOpcion>Vista de percepciones</NombreOpcion>
                                <DescripcionOpcion>
                                    Cómo ves los cobros y periodos al entrar a una empresa en el módulo de ingresos.
                                </DescripcionOpcion>
                            </InfoOpcion>
                            <SelectorPreferencias
                                value={preferencias.vistaPreferidaIngresos || "tabla"}
                                onChange={(evento) => cambiar("vistaPreferidaIngresos", evento.target.value)}
                                aria-label="Vista predeterminada de percepciones e ingresos"
                            >
                                <option value="tabla">Vista Tabla de Pagos</option>
                                <option value="calendario">Vista Calendario Mensual de Pagos</option>
                            </SelectorPreferencias>
                        </TarjetaAjuste>

                        <TarjetaAjuste>
                            <InfoOpcion>
                                <NombreOpcion>Botón principal del menú</NombreOpcion>
                                <DescripcionOpcion>
                                    Es el saludo de arriba. Un toque te lleva a esta pantalla, y si ya estás en ella, vuelves a Inicio. Mantenlo presionado para alternar entre Inicio y Mis tarjetas.
                                </DescripcionOpcion>
                            </InfoOpcion>
                            <SelectorPreferencias
                                value={preferencias.destinoBotonPrincipal || "/ahorros"}
                                onChange={(evento) => cambiar("destinoBotonPrincipal", evento.target.value)}
                                aria-label="Pantalla a la que lleva el botón principal del menú"
                            >
                                {DESTINOS_BOTON_PRINCIPAL.map((destino) => (
                                    <option key={destino.ruta} value={destino.ruta}>{destino.nombre}</option>
                                ))}
                            </SelectorPreferencias>
                        </TarjetaAjuste>
                    </GridOpciones>
                </Seccion>
            </>
        ),
        asistente: (
            <>
                <Seccion>
                    <TituloSeccion>Comportamiento</TituloSeccion>
                    <GridOpciones>
                        {interruptor("sugerirMejoras")}
                        <TarjetaAjuste>
                            <InfoOpcion>
                                <NombreOpcion>Gastos que cuenta</NombreOpcion>
                                <DescripcionOpcion>
                                    Qué cuenta el asistente cuando le preguntas por "mis gastos". Siempre puedes pedir "mis gastos personales" o "todos mis gastos" en el momento.
                                </DescripcionOpcion>
                            </InfoOpcion>
                            <SelectorPreferencias
                                value={preferencias.alcanceGastosAsistente || ""}
                                onChange={(evento) => cambiar("alcanceGastosAsistente", evento.target.value)}
                                aria-label="Qué gastos cuenta el asistente cuando preguntas por tus gastos"
                                placeholder="Preguntarme"
                            >
                                {ALCANCES_GASTOS_ASISTENTE.map((alcance) => (
                                    <option key={alcance.valor} value={alcance.valor}>{alcance.nombre}</option>
                                ))}
                            </SelectorPreferencias>
                        </TarjetaAjuste>
                    </GridOpciones>
                </Seccion>

                <Seccion>
                    <TituloSeccion>Preguntas para la IA</TituloSeccion>
                    <DescripcionOpcion>
                        La IA las contesta en cada reporte cuando sus cifras alcanzan, en una diapositiva "Lo que preguntaste". También puedes agregar una pregunta al pedir el reporte en el chat.
                    </DescripcionOpcion>
                    <PreguntasIA
                        preguntas={preferencias.preguntasIA || []}
                        onCambiar={(lista) => cambiar("preguntasIA", lista)}
                    />
                </Seccion>
            </>
        ),
        app: (
            <Seccion>
                <DescripcionOpcion>
                    Activa lo que Zaldo puede usar en este dispositivo. El navegador pedirá tu permiso y lo recordará.
                </DescripcionOpcion>
                <GridApp>
                    <TarjetaApp $activo={instalacion.estado === "instalada"}>
                        <CabeceraTarjeta>
                            <IconoPermiso $tono="#533b8f"><FaMobileAlt /></IconoPermiso>
                            <TextosTarjeta>
                                <NombreOpcion>Instalar Zaldo</NombreOpcion>
                                <DescripcionOpcion>{TEXTO_INSTALACION[instalacion.estado]}</DescripcionOpcion>
                            </TextosTarjeta>
                        </CabeceraTarjeta>
                        <PieTarjeta>
                            <EstadoPermiso $estado={ESTADO_INSTALACION[instalacion.estado].estado}>
                                {ESTADO_INSTALACION[instalacion.estado].texto}
                            </EstadoPermiso>
                            {instalacion.estado === "disponible" && (
                                <BtnSecundario
                                    type="button"
                                    onClick={async () => {
                                        if (await instalacion.instalar()) avisarBreve("Listo, Zaldo quedó instalada.");
                                    }}
                                >
                                    Instalar
                                </BtnSecundario>
                            )}
                        </PieTarjeta>
                    </TarjetaApp>

                    {PERMISOS_APP.map((permiso) => {
                        const { clave, nombre, descripcion, Icono, tono } = permiso;
                        const estado = permisos.estados[clave];
                        const activo = estado === "granted";
                        const puedeActivar = estado === "prompt" || estado === "desconocido";
                        const activando = activandoPermiso === clave;

                        return (
                            <TarjetaApp key={clave} $activo={activo}>
                                <CabeceraTarjeta>
                                    <IconoPermiso $tono={tono}><Icono /></IconoPermiso>
                                    <TextosTarjeta>
                                        <NombreOpcion>{nombre}</NombreOpcion>
                                        <DescripcionOpcion>{descripcion}</DescripcionOpcion>
                                    </TextosTarjeta>
                                </CabeceraTarjeta>
                                <PieTarjeta>
                                    <EstadoPermiso $estado={estado}>{TEXTO_ESTADO_PERMISO[estado]}</EstadoPermiso>
                                    <BtnSecundario
                                        type="button"
                                        onClick={() => activarPermiso(permiso)}
                                        disabled={!puedeActivar || activando}
                                        title={AYUDA_PERMISO[estado]}
                                        aria-label={`${nombre}: ${AYUDA_PERMISO[estado]}`}
                                    >
                                        {activo ? <FaCheck /> : <Icono />}
                                        {activando ? "Activando..." : ETIQUETA_BOTON_PERMISO[estado]}
                                    </BtnSecundario>
                                </PieTarjeta>
                            </TarjetaApp>
                        );
                    })}
                </GridApp>
                {PERMISOS_APP.some(({ clave }) => permisos.estados[clave] === "denied") && (
                    <DescripcionOpcion>
                        Si algo quedó bloqueado, ábrelo desde el candado del navegador → Permisos y cámbialo a Permitir.
                    </DescripcionOpcion>
                )}
            </Seccion>
        ),
        ayuda: (
            <Seccion>
                <GridOpciones>
                    <Opcion as="div">
                        <InfoOpcion>
                            <NombreOpcion>Tutoriales</NombreOpcion>
                            <DescripcionOpcion>
                                Vuelve a mostrar las guías de cada pantalla la próxima vez que entres a ella.
                            </DescripcionOpcion>
                        </InfoOpcion>
                        <BtnSecundario
                            type="button"
                            onClick={volverAVerTutoriales}
                            disabled={!Object.keys(preferencias.tutorialesVistos || {}).length}
                        >
                            Volver a verlos
                        </BtnSecundario>
                    </Opcion>
                </GridOpciones>
            </Seccion>
        ),
    };

    return (
        <>
            <Chips role="tablist" aria-label="Grupos de preferencias">
                {PESTANAS.map((opcionPestana) => {
                    const { id, nombre, Icono, interruptores } = opcionPestana;
                    const activo = pestana === id;
                    const encendidos = interruptores?.filter((clave) => preferencias[clave]).length;

                    return (
                        <Chip
                            key={id}
                            type="button"
                            role="tab"
                            id={`pref-tab-${id}`}
                            aria-selected={activo}
                            aria-controls={`pref-panel-${id}`}
                            $activo={activo}
                            onClick={() => setPestana(id)}
                        >
                            <Icono /> {nombre}
                            {interruptores && (
                                <ConteoChip $activo={activo} aria-label={`${encendidos} de ${interruptores.length} activas`}>
                                    {encendidos}/{interruptores.length}
                                </ConteoChip>
                            )}
                        </Chip>
                    );
                })}
            </Chips>

            <div role="tabpanel" id={`pref-panel-${pestana}`} aria-labelledby={`pref-tab-${pestana}`}>
                {contenidoPestana[pestana]}
            </div>

            <AvisoGuardado $visible={guardado} aria-live="polite">
                <FaCheck /> Preferencia guardada
            </AvisoGuardado>
        </>
    );
};

export const IconoPreferencias = FaSlidersH;
