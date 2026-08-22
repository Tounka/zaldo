import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./dbFirebase";

const comprasRef = (uid) => collection(db, "usuarios", uid, "comprasPlaneadas");

const fechaActualISO = () => new Date().toISOString().slice(0, 10);

const fechaTimestampAISO = (valor) => {
  if (!valor) return "";
  if (typeof valor.toDate === "function") return valor.toDate().toISOString().slice(0, 10);
  if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000).toISOString().slice(0, 10);
  return typeof valor === "string" ? valor.slice(0, 10) : "";
};

const normalizarCompra = (compra = {}) => ({
  ...compra,
  // `fechaObjetivo` se conserva como compatibilidad con documentos anteriores.
  fechaLimite: compra.fechaLimite || compra.fechaObjetivo || "",
  fechaCompra: compra.fechaCompra || "",
  fechaAlta: compra.fechaAlta || fechaTimestampAISO(compra.creadoEn),
});

export const obtenerComprasPlaneadas = async (uid) => {
  const snapshot = await getDocs(comprasRef(uid));
  return snapshot.docs
    .map((item) => normalizarCompra({ id: item.id, ...item.data() }))
    .sort((a, b) => Number(a.comprada) - Number(b.comprada) || (a.fechaLimite || "").localeCompare(b.fechaLimite || ""));
};

export const crearCompraPlaneada = async (uid, datos) => {
  const fechaLimite = datos.fechaLimite || datos.fechaObjetivo || "";
  const fechaAlta = datos.fechaAlta || fechaActualISO();
  const referencia = await addDoc(comprasRef(uid), {
    nombre: datos.nombre.trim(),
    presupuesto: Number(datos.presupuesto || 0),
    gastoReal: datos.gastoReal === "" ? null : Number(datos.gastoReal || 0),
    fechaLimite,
    fechaObjetivo: fechaLimite,
    fechaCompra: datos.fechaCompra || "",
    fechaAlta,
    categoria: datos.categoria || "",
    comprada: false,
    creadoEn: Timestamp.now(),
  });

  return normalizarCompra({ id: referencia.id, nombre: datos.nombre.trim(), presupuesto: Number(datos.presupuesto || 0), gastoReal: datos.gastoReal === "" ? null : Number(datos.gastoReal || 0), fechaLimite, fechaObjetivo: fechaLimite, fechaCompra: datos.fechaCompra || "", fechaAlta, categoria: datos.categoria || "", comprada: false });
};

export const actualizarCompraPlaneada = async (uid, id, datos) => {
  const fechaLimite = datos.fechaLimite || datos.fechaObjetivo || "";
  const payload = {
    nombre: datos.nombre.trim(),
    presupuesto: Number(datos.presupuesto || 0),
    gastoReal: datos.gastoReal === "" ? null : Number(datos.gastoReal || 0),
    fechaLimite,
    fechaObjetivo: fechaLimite,
    fechaCompra: datos.fechaCompra || "",
    fechaAlta: datos.fechaAlta || fechaActualISO(),
    categoria: datos.categoria || "",
    comprada: Boolean(datos.comprada),
  };
  await updateDoc(doc(db, "usuarios", uid, "comprasPlaneadas", id), payload);
  return normalizarCompra({ id, ...payload });
};

export const eliminarCompraPlaneada = async (uid, id) => {
  await deleteDoc(doc(db, "usuarios", uid, "comprasPlaneadas", id));
};
