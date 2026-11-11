import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/dbFirebase";
import { guardarPreferencias } from "../../firebase/preferencias";
import { obtenerIngresosAnio } from "../../firebase/ingresos";
import { useAppStore } from "../../../stores/useAppStore";
import { fechaLocalISO } from "../../utils/fechas";
import { tieneAccesoIA } from "../accesoIA";
import { obtenerEstadoPagoTarjeta } from "../../utils/tarjetasCredito";
import { esGasto, esPersonal, fechaISODeMovimiento, marcaPorAlcance } from "../reglasConsulta.js";
import { DIAS_POSPONER, DIAS_POSPONER_POR_CLAVE, elegirSugerencia, ritmoDeGasto, sumarDiasISO } from "./elegirSugerencia.js";

/*
 * Junta lo que necesita elegirSugerencia: cuentas del store, empresas del año
 * y los movimientos del mes actual y el anterior (bastan para saber si lleva
 * días sin registrar y si va gastando más). Solo para quien tiene acceso a la IA.
 */

const CAMPO = "sugerenciasAsistente";

const idMes = (fecha) => `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}`;

/* Movimientos de este mes y el anterior, con su fecha en AAAA-MM-DD. */
const leerMovimientosRecientes = async (uid) => {
  const hoy = new Date();
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const documentos = await Promise.all(
    [hoy, mesAnterior].map((fecha) => getDoc(doc(db, "usuarios", uid, "movimientos", idMes(fecha)))),
  );

  return documentos
    .flatMap((snapshot) => (snapshot.exists() ? snapshot.data().movimientos || [] : []))
    .map((movimiento) => ({ ...movimiento, fechaISO: fechaISODeMovimiento(movimiento.fechaMovimiento) }))
    .filter((movimiento) => movimiento.fechaISO);
};

const DIAS_AVISO_TARJETA = 3;

/* Tarjetas con deuda cuyo pago vence en unos días o ya venció; la más urgente primero. */
const tarjetasPorPagar = (cuentas) => {
  const hoy = new Date();
  return cuentas
    .filter((cuenta) => cuenta.tipoDeCuenta === "credito")
    .map((cuenta) => {
      const estado = obtenerEstadoPagoTarjeta(cuenta, hoy);
      const dias = Number(cuenta.fechaLimiteDePago) - hoy.getDate();
      const revolvente = Math.max(0, -Number(cuenta.saldoALaFecha || 0));
      const total = Math.max(0, -(Number(cuenta.saldoALaFecha || 0) + Number(cuenta.saldoALaFechaMSI || 0)));
      return {
        id: cuenta.id,
        nombre: cuenta.nombre,
        vencida: estado.tono === "vencida",
        porVencer: estado.tono === "por-vencer" && dias <= DIAS_AVISO_TARJETA,
        dias: Math.max(0, dias),
        monto: Math.round((revolvente || total) * 100) / 100,
      };
    })
    .filter((tarjeta) => tarjeta.vencida || tarjeta.porVencer)
    .sort((a, b) => Number(b.vencida) - Number(a.vencida) || a.dias - b.dias);
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

    const [empresas, movimientos] = await Promise.all([
      leerEmpresas(usuario.uid),
      leerMovimientosRecientes(usuario.uid),
    ]);
    const activas = cuentas.filter((cuenta) => cuenta?.id && cuenta.activo !== false);
    // El ritmo usa el mismo alcance que las respuestas: solo lo personal si así lo eligió.
    const marca = marcaPorAlcance(movimientos, preferencias.alcanceGastosAsistente);
    const gastos = movimientos
      .filter((movimiento) => esGasto(movimiento) && (!marca || esPersonal(movimiento)))
      .map((movimiento) => ({ fechaISO: movimiento.fechaISO, monto: -Number(movimiento.monto) }));

    return elegirSugerencia({
      hoy,
      cuentas: activas,
      empresas,
      ultimoMovimiento: movimientos.map((movimiento) => movimiento.fechaISO).sort().at(-1) || null,
      tarjetas: tarjetasPorPagar(activas),
      ritmo: ritmoDeGasto(gastos, hoy),
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

export const posponerSugerencia = (clave, dias = DIAS_POSPONER_POR_CLAVE[clave] || DIAS_POSPONER) => guardarEstado({
  [clave]: { pospuestaHasta: sumarDiasISO(fechaLocalISO(), dias) },
});

export const descartarSugerencia = (clave) => guardarEstado({ [clave]: { descartada: true } });
