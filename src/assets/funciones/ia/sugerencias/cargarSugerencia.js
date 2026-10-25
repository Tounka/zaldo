import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/dbFirebase";
import { guardarPreferencias } from "../../firebase/preferencias";
import { obtenerIngresosAnio } from "../../firebase/ingresos";
import { useAppStore } from "../../../stores/useAppStore";
import { fechaLocalISO } from "../../utils/fechas";
import { tieneAccesoIA } from "../accesoIA";
import { DIAS_POSPONER, elegirSugerencia, sumarDiasISO } from "./elegirSugerencia.js";

/*
 * Junta lo que necesita elegirSugerencia: cuentas del store, empresas del año
 * y la fecha del último movimiento (mes actual y anterior bastan para saber
 * si lleva días sin registrar). Solo para quien tiene acceso a la IA.
 */

const CAMPO = "sugerenciasAsistente";

const idMes = (fecha) => `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}`;

/* Fecha (AAAA-MM-DD) del movimiento más reciente de este mes o el anterior; null si no hay. */
const leerUltimoMovimiento = async (uid) => {
  const hoy = new Date();
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const documentos = await Promise.all(
    [hoy, mesAnterior].map((fecha) => getDoc(doc(db, "usuarios", uid, "movimientos", idMes(fecha)))),
  );

  const fechas = documentos
    .flatMap((snapshot) => (snapshot.exists() ? snapshot.data().movimientos || [] : []))
    .map((movimiento) => movimiento.fechaMovimiento?.toDate?.())
    .filter((fecha) => fecha && !Number.isNaN(fecha.getTime()));

  if (!fechas.length) return null;
  return fechaLocalISO(new Date(Math.max(...fechas)));
};

const leerEmpresas = async (uid) => {
  const ingresos = await obtenerIngresosAnio(uid, new Date().getFullYear());
  return (ingresos?.empresas || []).filter((empresa) => empresa.activo !== false);
};

/**
 * La sugerencia de hoy ({ clave, texto }) o null. Nunca lanza: si algo falla,
 * simplemente no se sugiere nada.
 */
export const cargarSugerencia = async () => {
  const { usuario, cuentas, preferencias, preferenciasCargadas } = useAppStore.getState();
  if (!usuario?.uid || !preferenciasCargadas || preferencias.sugerirMejoras === false) return null;

  const hoy = fechaLocalISO();
  const estado = preferencias[CAMPO] || {};
  if (estado.ultimaOfrecida === hoy) return null;

  try {
    if (!(await tieneAccesoIA())) return null;

    const [empresas, ultimoMovimiento] = await Promise.all([
      leerEmpresas(usuario.uid),
      leerUltimoMovimiento(usuario.uid),
    ]);

    return elegirSugerencia({
      hoy,
      cuentas: cuentas.filter((cuenta) => cuenta?.id && cuenta.activo !== false),
      empresas,
      ultimoMovimiento,
      estado,
    });
  } catch (error) {
    console.warn("No se pudo preparar la sugerencia del asistente.", error);
    return null;
  }
};

/*
 * Guarda en el store y en Firestore. setDoc con merge mezcla los mapas
 * anidados, así que cambiar una clave no borra las demás.
 */
const guardarEstado = async (cambios) => {
  const { usuario, preferencias, setPreferencias } = useAppStore.getState();
  if (!usuario?.uid) return;

  setPreferencias({ [CAMPO]: { ...(preferencias[CAMPO] || {}), ...cambios } });
  try {
    await guardarPreferencias(usuario.uid, { [CAMPO]: cambios });
  } catch (error) {
    // En el peor caso se vuelve a sugerir otro día.
    console.warn("No se pudo guardar el estado de la sugerencia.", error);
  }
};

export const marcarSugerenciaOfrecida = () => guardarEstado({ ultimaOfrecida: fechaLocalISO() });

export const posponerSugerencia = (clave, dias = DIAS_POSPONER) => guardarEstado({
  [clave]: { pospuestaHasta: sumarDiasISO(fechaLocalISO(), dias) },
});

export const descartarSugerencia = (clave) => guardarEstado({ [clave]: { descartada: true } });
