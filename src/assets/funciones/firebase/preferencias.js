import { doc, getDoc, setDoc } from "firebase/firestore";
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
    recordarUltimaCuenta: true,
    /* Ordena las categorías poniendo al frente las que más usas. */
    ordenarCategoriasPorUso: true,
    /* Pregunta por los gastos recurrentes al entrar a la app. */
    preguntarGastosRecurrentes: true,
    /* Muestra los centavos en saldos y montos. */
    mostrarCentavos: true,
    /* En tarjetas de crédito, asume MSI en lugar de contado. */
    msiPorDefectoEnCredito: false,
};

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
