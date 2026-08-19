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

export const obtenerComprasPlaneadas = async (uid) => {
  const snapshot = await getDocs(comprasRef(uid));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => Number(a.comprada) - Number(b.comprada) || (a.fechaObjetivo || "").localeCompare(b.fechaObjetivo || ""));
};

export const crearCompraPlaneada = async (uid, datos) => {
  const referencia = await addDoc(comprasRef(uid), {
    nombre: datos.nombre.trim(),
    presupuesto: Number(datos.presupuesto || 0),
    gastoReal: datos.gastoReal === "" ? null : Number(datos.gastoReal || 0),
    fechaObjetivo: datos.fechaObjetivo || "",
    categoria: datos.categoria || "",
    comprada: false,
    creadoEn: Timestamp.now(),
  });

  return { id: referencia.id, nombre: datos.nombre.trim(), presupuesto: Number(datos.presupuesto || 0), gastoReal: datos.gastoReal === "" ? null : Number(datos.gastoReal || 0), fechaObjetivo: datos.fechaObjetivo || "", categoria: datos.categoria || "", comprada: false };
};

export const actualizarCompraPlaneada = async (uid, id, datos) => {
  const payload = {
    nombre: datos.nombre.trim(),
    presupuesto: Number(datos.presupuesto || 0),
    gastoReal: datos.gastoReal === "" ? null : Number(datos.gastoReal || 0),
    fechaObjetivo: datos.fechaObjetivo || "",
    categoria: datos.categoria || "",
    comprada: Boolean(datos.comprada),
  };
  await updateDoc(doc(db, "usuarios", uid, "comprasPlaneadas", id), payload);
  return { id, ...payload };
};

export const eliminarCompraPlaneada = async (uid, id) => {
  await deleteDoc(doc(db, "usuarios", uid, "comprasPlaneadas", id));
};
