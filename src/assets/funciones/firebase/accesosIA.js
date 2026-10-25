import { collection, deleteDoc, doc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./dbFirebase";

/*
 * Accesos a la IA por tiempo: accesosIA/{uid} = { hasta, nota, correo, nombre,
 * otorgadoPor, actualizado }. Solo un super admin los escribe (firestore.rules)
 * y el Worker los lee para dejar pasar a quien tiene una prueba vigente
 * (workers/captura-ia/src/accesos.js).
 */

const coleccion = collection(db, "accesosIA");

/* Duraciones que ofrece el panel; "hasta una fecha" se elige aparte. */
export const DURACIONES_ACCESO = [
  { valor: "7", etiqueta: "7 días", dias: 7 },
  { valor: "30", etiqueta: "1 mes", dias: 30 },
  { valor: "90", etiqueta: "3 meses", dias: 90 },
];

/* Fin del día local de la fecha elegida, para que "hasta el 30" incluya el 30. */
export const finDelDia = (fechaISO) => {
  const [anio, mes, dia] = String(fechaISO).split("-").map(Number);
  return new Date(anio, mes - 1, dia, 23, 59, 59);
};

export const sumarDias = (dias, desde = new Date()) => {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
};

/** @returns { [uid]: { hasta: Date, nota, otorgadoPor, actualizado: Date|null } } */
export const obtenerAccesosIA = async () => {
  const snapshot = await getDocs(coleccion);
  return Object.fromEntries(snapshot.docs.map((documento) => {
    const datos = documento.data();
    return [documento.id, {
      ...datos,
      hasta: datos.hasta?.toDate?.() || null,
      actualizado: datos.actualizado?.toDate?.() || null,
    }];
  }));
};

/**
 * Da o extiende el acceso hasta `hasta`. El correo y el nombre se guardan solo
 * para reconocer la fila en el panel.
 */
export const otorgarAccesoIA = async ({ usuario, hasta, nota = "", otorgadoPor }) => {
  await setDoc(doc(coleccion, usuario.uid), {
    hasta: Timestamp.fromDate(hasta),
    nota: String(nota).trim().slice(0, 120),
    correo: usuario.email || usuario.correo || "",
    nombre: [usuario.nombres, usuario.apellidos].filter(Boolean).join(" "),
    otorgadoPor,
    actualizado: Timestamp.now(),
  });
};

export const revocarAccesoIA = (uid) => deleteDoc(doc(coleccion, uid));
