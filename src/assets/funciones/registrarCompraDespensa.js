import { useAppStore } from "../stores/useAppStore";
import { obtenerDespensa, registrarEntradaLoteIADespensa } from "./firebase/despensa";
import { festejarTopo } from "../stores/useTopoStore";

/*
 * Despensa desde fuera de su pantalla (el asistente de IA). Usa la misma caché
 * del store que la página de despensa, así que al abrirla después se ve la
 * compra sin otra lectura a Firestore.
 */

/* Catálogo en caché o, si no se ha abierto la despensa, una lectura. */
export const obtenerCatalogoDespensa = async (uid) => {
  const enCache = useAppStore.getState().despensaPorUsuario[uid];
  if (enCache?.catalogo) return enCache.catalogo;

  const data = await obtenerDespensa(uid);
  useAppStore.getState().setDespensaUsuario(uid, { catalogo: data.catalogo, inventario: data.inventario });
  return data.catalogo;
};

/**
 * @param compra { tienda, fecha (YYYY-MM-DD), totalTicket, items } ya validada.
 * @returns el resultado de registrarEntradaLoteIADespensa ({ catalogo, inventario, compra, ... }).
 */
export const registrarCompraDespensa = async ({ uid, compra }) => {
  const catalogo = await obtenerCatalogoDespensa(uid);
  const resultado = await registrarEntradaLoteIADespensa(uid, {
    items: compra.items,
    tienda: compra.tienda,
    fecha: compra.fecha,
    totalTicket: compra.totalTicket,
    metodoCaptura: "asistente_ia",
    catalogo,
  });

  useAppStore.getState().setDespensaUsuario(uid, {
    catalogo: resultado.catalogo,
    inventario: resultado.inventario,
  });

  festejarTopo("celebrando", "¡Despensa surtida!");
  return resultado;
};
