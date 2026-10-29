import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./dbFirebase";

/*
 * Preferencias del usuario, guardadas en su documento de perfil.
 *
 * Se distinguen de `utils/preferenciasCaptura.js`: aquello son atajos que el
 * navegador deduce solo (última cuenta, categorías más usadas) y que da igual
 * perder; esto son decisiones que la persona tomó a propósito, así que viven en
 * Firestore y la siguen a cualquier dispositivo.
 */

export const PREFERENCIAS_POR_DEFECTO = {
    /* Marca los gastos como personales sin tener que activarlo cada vez. */
    gastoPersonalPorDefecto: false,
    /* Categoría preseleccionada al abrir el alta; vacío = ninguna. */
    categoriaPorDefecto: "",
    /* Abre el alta directo en la última cuenta usada, saltando el paso 1. */
    recordarUltimaCuenta: false,
    /* Ordena las categorías poniendo al frente las que más usas. */
    ordenarCategoriasPorUso: true,
    /* Pregunta por los gastos recurrentes al entrar a la app. */
    preguntarGastosRecurrentes: true,
    /* Muestra los centavos en saldos y montos. */
    mostrarCentavos: true,
    /* En tarjetas de crédito, asume MSI en lugar de contado. */
    msiPorDefectoEnCredito: false,
    /* Vista preferida en percepciones e ingresos: 'tabla' o 'calendario'. */
    vistaPreferidaIngresos: "tabla",
    /* Pantalla a la que lleva el título del menú con un toque (ver DESTINOS_BOTON_PRINCIPAL). */
    destinoBotonPrincipal: "/ahorros",
    /* Pregunta por ingresos recurrentes (ej. horas semanales) al estar en la fecha de corte. */
    preguntarIngresosRecurrentes: true,
    /* Sonidos cortos al registrar, descontar o comprar. */
    sonidosActivos: true,
    /* Preguntas que la IA contesta en cada reporte si los datos alcanzan (metodoAnalisis.js). */
    preguntasIA: [],
    /* Tutoriales ya vistos, por clave (ver `tutoriales/index.js`): { home: true }. */
    tutorialesVistos: {},
    /* El asistente sugiere completar la cuenta (un trabajo, cuentas, registrar seguido). */
    sugerirMejoras: true,
    /* Qué sugerencias se pospusieron o descartaron (ia/sugerencias/elegirSugerencia.js). */
    sugerenciasAsistente: {},
    /*
     * Qué cuenta el asistente cuando preguntas por "mis gastos" sin más:
     * "personal" (solo lo marcado como personal), "todos", o "" para preguntarlo
     * la primera vez y recordar la respuesta.
     */
    alcanceGastosAsistente: "",
};

/* Opciones de `alcanceGastosAsistente`; el chat y Preferencias usan las mismas. */
export const ALCANCES_GASTOS_ASISTENTE = [
    { valor: "", nombre: "Preguntarme" },
    { valor: "personal", nombre: "Solo mis gastos personales" },
    { valor: "todos", nombre: "Todos mis gastos" },
];

/* Pantallas que el usuario puede elegir como botón principal; mismas que el menú lateral. */
export const DESTINOS_BOTON_PRINCIPAL = [
    { ruta: "/home", nombre: "Inicio" },
    { ruta: "/ingresos", nombre: "Ingresos" },
    { ruta: "/movimientos", nombre: "Movimientos" },
    { ruta: "/cuentas", nombre: "Mis tarjetas" },
    { ruta: "/prestamos", nombre: "Préstamos" },
    { ruta: "/ahorros", nombre: "Ahorros" },
    { ruta: "/despensa", nombre: "Despensa" },
];

const CAMPO_PREFERENCIAS = "preferencias";

/*
 * Completa con los valores por defecto lo que el documento no traiga, para que
 * un perfil viejo (o una preferencia nueva) nunca devuelva `undefined`.
 */
const conValoresPorDefecto = (guardadas = {}) => ({
    ...PREFERENCIAS_POR_DEFECTO,
    ...guardadas,
});

export const obtenerPreferencias = async (uid) => {
    if (!uid) return { ...PREFERENCIAS_POR_DEFECTO };

    try {
        const snapshot = await getDoc(doc(db, "usuarios", uid));
        if (!snapshot.exists()) return { ...PREFERENCIAS_POR_DEFECTO };

        return conValoresPorDefecto(snapshot.data()?.[CAMPO_PREFERENCIAS]);
    } catch (error) {
        console.error("No se pudieron leer las preferencias:", error);
        return { ...PREFERENCIAS_POR_DEFECTO };
    }
};

/*
 * Guarda solo las claves indicadas. El merge anidado evita que cambiar una
 * preferencia borre las demás.
 */
export const guardarPreferencias = async (uid, cambios = {}) => {
    if (!uid || !Object.keys(cambios).length) return null;

    await setDoc(
        doc(db, "usuarios", uid),
        { [CAMPO_PREFERENCIAS]: cambios },
        { merge: true },
    );

    return cambios;
};

/*
 * Vuelve a mostrar todos los tutoriales. No sirve `guardarPreferencias` con un
 * objeto vacío: el merge conserva las claves que ya estaban. `updateDoc` con la
 * ruta del campo sí lo sustituye completo.
 */
export const reiniciarTutoriales = async (uid) => {
    if (!uid) return;

    await updateDoc(doc(db, "usuarios", uid), {
        [`${CAMPO_PREFERENCIAS}.tutorialesVistos`]: {},
    });
};
