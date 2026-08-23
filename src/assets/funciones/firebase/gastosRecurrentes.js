import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./dbFirebase";

/*
 * Gastos recurrentes: renta, suscripciones, servicios.
 *
 * No se crean movimientos solos. Lo que se guarda aquí es la plantilla (nombre,
 * monto, cuenta, categoría y día del mes); cuando llega la fecha, la app
 * pregunta al entrar y el movimiento se registra únicamente si se confirma. Eso
 * evita ensuciar los datos con gastos que quizá no ocurrieron.
 *
 * `ultimoMesConfirmado` guarda el periodo ya resuelto en formato YYYY-MM, así
 * que sirve tanto para lo confirmado como para lo omitido: en ambos casos ya no
 * se vuelve a preguntar por ese mes.
 */

const recurrentesRef = (uid) => collection(db, "usuarios", uid, "gastosRecurrentes");

const normalizar = (recurrente = {}) => ({
  ...recurrente,
  nombre: recurrente.nombre || "",
  monto: Number(recurrente.monto || 0),
  diaDelMes: Number(recurrente.diaDelMes || 1),
  categoria: recurrente.categoria || "",
  cuentaAsociada: recurrente.cuentaAsociada || "",
  nombreCuenta: recurrente.nombreCuenta || "",
  esPersonal: Boolean(recurrente.esPersonal),
  activo: recurrente.activo !== false,
  ultimoMesConfirmado: recurrente.ultimoMesConfirmado || "",
});

export const obtenerGastosRecurrentes = async (uid) => {
  const snapshot = await getDocs(recurrentesRef(uid));
  return snapshot.docs
    .map((item) => normalizar({ id: item.id, ...item.data() }))
    .sort((a, b) => a.diaDelMes - b.diaDelMes);
};

export const crearGastoRecurrente = async (uid, datos) => {
  const aGuardar = {
    nombre: String(datos.nombre || "").trim(),
    monto: Number(datos.monto || 0),
    // Se limita a 28 para que exista en todos los meses, febrero incluido.
    diaDelMes: Math.min(28, Math.max(1, Number(datos.diaDelMes || 1))),
    categoria: datos.categoria || "",
    cuentaAsociada: datos.cuentaAsociada || "",
    nombreCuenta: datos.nombreCuenta || "",
    esPersonal: Boolean(datos.esPersonal),
    activo: true,
    ultimoMesConfirmado: "",
  };

  const referencia = await addDoc(recurrentesRef(uid), aGuardar);
  return normalizar({ id: referencia.id, ...aGuardar });
};

export const actualizarGastoRecurrente = async (uid, id, cambios) => {
  await updateDoc(doc(db, "usuarios", uid, "gastosRecurrentes", id), cambios);
  return cambios;
};

export const eliminarGastoRecurrente = async (uid, id) => {
  await deleteDoc(doc(db, "usuarios", uid, "gastosRecurrentes", id));
};

/*
 * Marca el periodo como resuelto para que no se vuelva a preguntar este mes,
 * tanto si el gasto se registró como si se omitió.
 */
export const marcarPeriodoResuelto = async (uid, id, periodo) =>
  actualizarGastoRecurrente(uid, id, { ultimoMesConfirmado: periodo });

/*
 * Devuelve los recurrentes que ya tocan y siguen sin resolverse este mes.
 * "Ya tocan" incluye los días pasados del mes en curso: si la app no se abrió
 * el día 5, el día 9 la pregunta sigue esperando.
 */
export const obtenerRecurrentesPendientes = (recurrentes = [], hoy = new Date()) => {
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  return recurrentes.filter((recurrente) => (
    recurrente.activo
    && recurrente.ultimoMesConfirmado !== periodo
    && Number(recurrente.diaDelMes) <= hoy.getDate()
  ));
};
