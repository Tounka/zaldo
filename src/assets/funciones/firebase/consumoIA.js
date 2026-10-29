import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./dbFirebase";

/*
 * Consumo de tokens de la IA: consumoIA/{uid}_{AAAA-MM}. Lo suma el Worker en
 * cada llamada a OpenAI (workers/captura-ia/src/consumo.js); aquí solo se lee
 * para el panel de super admin.
 */

const coleccion = collection(db, "consumoIA");

/* "2026-10" del mes de `fecha` corrido `desplazamiento` meses. */
export const claveMes = (desplazamiento = 0, fecha = new Date()) => {
  const mes = new Date(fecha.getFullYear(), fecha.getMonth() + desplazamiento, 1);
  return `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
};

/** @returns [{ uid, mes, llamadas, totalLlamadas, tokensEntrada, tokensCache, tokensSalida, tokensRazonamiento, costoUSD, actualizado }] */
export const obtenerConsumoDelMes = async (mes) => {
  const snapshot = await getDocs(query(coleccion, where("mes", "==", mes)));
  return snapshot.docs.map((documento) => {
    const datos = documento.data();
    const llamadas = datos.llamadas || {};
    return {
      uid: datos.uid,
      mes: datos.mes,
      llamadas,
      totalLlamadas: Object.values(llamadas).reduce((suma, n) => suma + (Number(n) || 0), 0),
      tokensEntrada: Number(datos.tokensEntrada) || 0,
      tokensCache: Number(datos.tokensCache) || 0,
      tokensSalida: Number(datos.tokensSalida) || 0,
      tokensRazonamiento: Number(datos.tokensRazonamiento) || 0,
      costoUSD: Number(datos.costoUSD) || 0,
      actualizado: datos.actualizado?.toDate?.() || null,
    };
  });
};
