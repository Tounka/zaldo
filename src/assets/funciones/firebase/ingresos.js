import {
    doc,
    getDoc,
    onSnapshot,
    runTransaction,
    setDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "./dbFirebase";
import { normalizarRegistroIngreso } from "../ingresosCalculos";

import { fechaLocalISO } from "../utils/fechas";
const getDocRef = (uid, year) => doc(db, "usuarios", uid, "ingresos", String(year));
const getDocRefGlobal = (uid, year) => doc(db, "ingresos", uid, "años", String(year));

const nuevoIdRegistro = () => "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

const mesDeFecha = (fecha) => {
    const fechaD = new Date(`${fecha}T12:00:00`);
    return !Number.isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1;
};

const ordenarPorFecha = (registros) => registros.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

// Firestore rechaza el setDoc completo si hay un `undefined` anidado; como el año
// viaja en un solo documento, un campo viejo mal formado bloqueaba cualquier guardado.
const sinUndefined = (valor) => {
    if (Array.isArray(valor)) return valor.filter((v) => v !== undefined).map(sinUndefined);
    if (valor && Object.getPrototypeOf(valor) === Object.prototype) {
        return Object.fromEntries(
            Object.entries(valor)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, sinUndefined(v)])
        );
    }
    return valor;
};

/**
 * Consulta el documento del año en Firestore
 */
export const obtenerIngresosAnio = async (uid, year) => {
    try {
        // 1. Intentar en usuarios/{uid}/ingresos/{year} (ruta permitida por reglas)
        const snapUser = await getDoc(getDocRef(uid, year));
        if (snapUser.exists()) {
            return { id: snapUser.id, ...snapUser.data() };
        }

        // 2. Intentar en ingresos/{uid}/años/{year} como fallback
        try {
            const snapGlobal = await getDoc(getDocRefGlobal(uid, year));
            if (snapGlobal.exists()) {
                return { id: snapGlobal.id, ...snapGlobal.data() };
            }
        } catch {
            // Ignorar si la regla de la raíz aún no está configurada
        }

        return null;
    } catch (error) {
        console.error("Error al obtener ingresos:", error);
        return null;
    }
};

/**
 * Estructura base de un año (hereda las empresas del año anterior). No escribe en Firestore.
 */
const construirIngresosAnioBase = async (uid, year, anteriorEnCache = null) => {
    const ahora = Timestamp.now();

    // Heredar empresas del año anterior si existen en la cuenta del usuario
    const anterior = anteriorEnCache ?? (year ? await obtenerIngresosAnio(uid, year - 1) : null);
    const empresas = anterior?.empresas?.length > 0 ? anterior.empresas : [];

    return {
        year: Number(year),
        configuracion: {
            incluirPrestamosEnResumen: true,
        },
        empresas,
        registros: [],
        ingresosExtra: [],
        fechaCreacion: ahora,
        fechaModificacion: ahora,
    };
};

/**
 * Inicializa un año con estructura base
 */
export const inicializarIngresosAnio = async (uid, year, anteriorEnCache = null) => {
    const ref = getDocRef(uid, year);
    const data = await construirIngresosAnioBase(uid, year, anteriorEnCache);

    try {
        await setDoc(ref, data, { merge: true });
        return data;
    } catch (error) {
        console.error("Error al inicializar año de ingresos:", error);
        return null;
    }
};

/**
 * Obtiene los ingresos de un año o, si no existen, su estructura base.
 * Consultar un año ya no crea el documento: se crea con la primera escritura.
 */
export const obtenerOAInicializarIngresosAnio = async (uid, year) => {
    const existente = await obtenerIngresosAnio(uid, year);
    if (existente) {
        return existente;
    }
    return construirIngresosAnioBase(uid, year);
};

/**
 * Escucha el año en vivo: cualquier cambio hecho en otro dispositivo (o desde
 * el asistente) llega a la pantalla sin recargar. Mientras el documento no
 * exista no se llama a `alCambiar`: la página usa la estructura base.
 */
export const escucharIngresosAnio = (uid, year, alCambiar) => {
    if (!uid || !year) return () => {};
    return onSnapshot(
        getDocRef(uid, year),
        (snap) => {
            if (snap.exists()) alCambiar({ id: snap.id, ...snap.data() });
        },
        (error) => console.error(`Error al escuchar ingresos ${year}:`, error),
    );
};

const prepararParaGuardar = (data, year) => {
    // eslint-disable-next-line no-unused-vars
    const { id, ...resto } = data || {};
    return sinUndefined({
        ...resto,
        year: Number(year),
        fechaModificacion: Timestamp.now(),
    });
};

const reflejarEnGlobal = async (uid, year, dataGuardar) => {
    try {
        await setDoc(getDocRefGlobal(uid, year), dataGuardar, { merge: true });
    } catch {
        // Ignorar si no hay regla global
    }
};

const actualDesdeSnap = async (snap, uid, year) => (snap.exists()
    ? { id: snap.id, ...snap.data() }
    : obtenerOAInicializarIngresosAnio(uid, year));

/**
 * Aplica `mutar` sobre la versión MÁS RECIENTE del año y la guarda.
 *
 * Antes cada guardado reescribía el documento con la copia que tenía la
 * pantalla: si otro dispositivo (o el asistente) había agregado un pago, se
 * perdía. Ahora el cambio se aplica dentro de una transacción sobre lo que hay
 * en el servidor. Sin red, las transacciones no corren: se usa la copia local
 * de Firestore (que el listener mantiene al día) y la escritura queda en la
 * cola offline.
 */
export const mutarIngresosAnio = async (uid, year, mutar) => {
    const ref = getDocRef(uid, year);
    let guardado = null;

    const enLinea = typeof navigator === "undefined" || navigator.onLine !== false;
    if (enLinea) {
        try {
            await runTransaction(db, async (tx) => {
                const actual = await actualDesdeSnap(await tx.get(ref), uid, year);
                guardado = prepararParaGuardar(mutar(actual), year);
                tx.set(ref, guardado);
            });
        } catch (error) {
            if (error?.code !== "unavailable") throw error;
            guardado = null;
        }
    }

    if (!guardado) {
        const actual = await actualDesdeSnap(await getDoc(ref), uid, year);
        guardado = prepararParaGuardar(mutar(actual), year);
        await setDoc(ref, guardado);
    }

    reflejarEnGlobal(uid, year, guardado);
    return { id: String(year), ...guardado };
};

/**
 * Guarda el documento completo de ingresos del año.
 * Solo para reemplazos totales; los cambios puntuales usan `mutarIngresosAnio`.
 */
export const guardarIngresosDocumento = async (uid, year, data) => {
    const dataGuardar = prepararParaGuardar(data, year);
    try {
        await setDoc(getDocRef(uid, year), dataGuardar, { merge: true });
        await reflejarEnGlobal(uid, year, dataGuardar);
        return true;
    } catch (error) {
        console.error("Error al guardar ingresos:", error);
        // No ocultar el fallo: los modales deben permanecer abiertos y mostrar
        // el error si la escritura principal de Firestore no se completó.
        throw error;
    }
};

/**
 * Agrega o actualiza una empresa en el año
 */
export const guardarEmpresa = async (uid, year, _data, empresa) => {
    const idNuevo = empresa.id || "emp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
    return mutarIngresosAnio(uid, year, (actual) => {
        const empresas = [...(actual.empresas || [])].map((item, orden) => ({
            ...item,
            orden: item.orden ?? orden,
        }));
        const index = empresas.findIndex((e) => e.id === idNuevo);

        if (index >= 0) {
            empresas[index] = { ...empresas[index], ...empresa, id: idNuevo };
        } else {
            empresas.push({
                ...empresa,
                id: idNuevo,
                activo: empresa.activo !== undefined ? empresa.activo : true,
                orden: empresas.length,
                anioCreacion: Number(year),
            });
        }
        return { ...actual, empresas };
    });
};

/** Mueve una empresa y guarda el orden para todas las vistas del año. */
export const reordenarEmpresa = async (uid, year, _data, empresaId, direccion) => mutarIngresosAnio(uid, year, (actual) => {
    const empresas = [...(actual.empresas || [])]
        .map((empresa, orden) => ({ ...empresa, orden: empresa.orden ?? orden }))
        .sort((a, b) => Number(a.orden) - Number(b.orden));
    const indice = empresas.findIndex((empresa) => empresa.id === empresaId);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= empresas.length) return actual;

    [empresas[indice], empresas[destino]] = [empresas[destino], empresas[indice]];
    return { ...actual, empresas: empresas.map((empresa, orden) => ({ ...empresa, orden })) };
});

/**
 * Elimina una empresa del año
 */
export const eliminarEmpresa = async (uid, year, _data, empresaId) => mutarIngresosAnio(uid, year, (actual) => ({
    ...actual,
    empresas: (actual.empresas || []).filter((e) => e.id !== empresaId),
}));

const prepararRegistro = (registro, empresa) => {
    const registroId = registro.id || nuevoIdRegistro();
    return {
        ...normalizarRegistroIngreso(registro, empresa),
        id: registroId,
        mes: mesDeFecha(registro.fecha),
    };
};

const insertarRegistros = (actual, nuevos, empresaRespaldo = null) => {
    const empresas = [...(actual.empresas || [])];
    if (empresaRespaldo && !empresas.some((e) => e.id === empresaRespaldo.id)) empresas.push(empresaRespaldo);
    const porId = new Map(empresas.map((empresa) => [empresa.id, empresa]));

    const registros = [...(actual.registros || [])];
    nuevos.forEach((registro) => {
        const registroObj = prepararRegistro(registro, porId.get(registro.empresaId));
        const indice = registros.findIndex((item) => item.id === registroObj.id);
        if (indice >= 0) registros[indice] = { ...registros[indice], ...registroObj };
        else registros.push(registroObj);
    });
    return { ...actual, empresas, registros: ordenarPorFecha(registros) };
};

const anioDeRegistro = (registro, year) => {
    const fechaD = new Date(`${registro.fecha}T12:00:00`);
    return !Number.isNaN(fechaD.getTime()) ? fechaD.getFullYear() : Number(year);
};

/**
 * Guarda o actualiza varios registros. Cada uno va al documento del año de su
 * fecha (antes quedaba en el año visible y "desaparecía" de los totales). Si un
 * registro de `year` cambió de año, se quita de aquí. Devuelve el año `year`.
 */
export const guardarRegistrosPago = async (uid, year, registrosNuevos = [], { empresaRespaldo = null } = {}) => {
    const conId = registrosNuevos.map((registro) => ({ ...registro, id: registro.id || nuevoIdRegistro() }));
    const porAnio = new Map();
    conId.forEach((registro) => {
        const anio = anioDeRegistro(registro, year);
        porAnio.set(anio, [...(porAnio.get(anio) || []), registro]);
    });

    for (const [anio, registros] of porAnio) {
        if (anio === Number(year)) continue;
        await mutarIngresosAnio(uid, anio, (actual) => insertarRegistros(actual, registros, empresaRespaldo));
    }

    const delAnio = porAnio.get(Number(year)) || [];
    const idsFuera = new Set(conId.filter((r) => anioDeRegistro(r, year) !== Number(year)).map((r) => r.id));
    return mutarIngresosAnio(uid, year, (actual) => {
        const sinMovidos = { ...actual, registros: (actual.registros || []).filter((r) => !idsFuera.has(r.id)) };
        return delAnio.length ? insertarRegistros(sinMovidos, delAnio) : sinMovidos;
    });
};

/**
 * Guarda o actualiza un registro individual de pago
 */
export const guardarRegistroPago = async (uid, year, data, registro) => {
    const empresaRespaldo = (data?.empresas || []).find((item) => item.id === registro.empresaId) || null;
    return guardarRegistrosPago(uid, year, [registro], { empresaRespaldo });
};

/**
 * Elimina un registro de pago
 */
export const eliminarRegistroPago = async (uid, year, _data, registroId) => mutarIngresosAnio(uid, year, (actual) => ({
    ...actual,
    registros: (actual.registros || []).filter((r) => r.id !== registroId),
}));

/**
 * Inserta masivamente registros en sus respectivos años correspondientes
 */
export const importarRegistrosEnVariosAnios = async (uid, nuevosRegistros = [], empresasACrear = []) => {
    const porAnio = {};
    nuevosRegistros.forEach((reg) => {
        const anio = parseInt(reg.fecha?.split("-")[0]) || new Date().getFullYear();
        if (!porAnio[anio]) porAnio[anio] = [];
        porAnio[anio].push({ ...reg, id: reg.id || nuevoIdRegistro(), mes: mesDeFecha(reg.fecha) });
    });

    const resultados = {};

    for (const [anioStr, regs] of Object.entries(porAnio)) {
        const anio = Number(anioStr);
        await mutarIngresosAnio(uid, anio, (dataAnio) => {
            const empresasActuales = [...(dataAnio.empresas || [])];
            empresasACrear.forEach((nuevaEmp) => {
                const existe = empresasActuales.some((e) => e.id === nuevaEmp.id || e.nombre.toLowerCase() === nuevaEmp.nombre.toLowerCase());
                if (!existe) empresasActuales.push(nuevaEmp);
            });

            // Combinar registros sin duplicar
            const registrosActuales = [...(dataAnio.registros || [])];
            regs.forEach((rObj) => {
                const idxExistente = registrosActuales.findIndex((r) =>
                    r.fecha === rObj.fecha && r.empresaId === rObj.empresaId && r.numeroPeriodo === rObj.numeroPeriodo && r.tipo === rObj.tipo
                );
                if (idxExistente >= 0) registrosActuales[idxExistente] = { ...registrosActuales[idxExistente], ...rObj };
                else registrosActuales.push(rObj);
            });

            return {
                configuracion: { incluirPrestamosEnResumen: true },
                ingresosExtra: [],
                ...dataAnio,
                empresas: empresasActuales,
                registros: ordenarPorFecha(registrosActuales),
            };
        });
        resultados[anio] = regs.length;
    }

    return resultados;
};

/**
 * Inserta masivamente registros en un solo año
 */
export const guardarRegistrosMasivos = async (uid, year, _data, nuevosRegistros) => {
    const conId = nuevosRegistros.map((registro) => ({ ...registro, id: registro.id || nuevoIdRegistro() }));
    return mutarIngresosAnio(uid, year, (actual) => insertarRegistros(actual, conId));
};

/**
 * Mantiene el corte como adeudo y genera otro registro por el dinero recibido.
 * El corte nunca vuelve a contar como ingreso al liquidarlo.
 */
const montoAdeudo = (registro) =>
    Number(registro.montoReal) || Number(registro.montoTeorico || 0) + Number(registro.montoExtra || 0);

/**
 * Un solo pago que cubre varios adeudos (p. ej. cuatro semanas depositadas
 * juntas). Lo recibido casi nunca cuadra al centavo con lo esperado (horas de
 * más o de menos, redondeos), así que el monto se registra tal cual y la
 * diferencia queda anotada; los adeudos pasan a Liquidado para no contar doble.
 */
export const liquidarAdeudosIngreso = async (uid, year, _data, adeudos = [], { monto, fecha: fechaPago } = {}) => {
    if (adeudos.length === 0) return _data;
    const primero = adeudos[0];
    const fecha = fechaPago || fechaLocalISO();
    const ids = new Set(adeudos.map((adeudo) => adeudo.id));
    const esperado = Math.round(adeudos.reduce((suma, adeudo) => suma + montoAdeudo(adeudo), 0) * 100) / 100;
    const recibido = monto === undefined || monto === null || monto === "" ? esperado : Number(monto);

    let notas;
    if (adeudos.length === 1) {
        notas = `Pago del adeudo del ${primero.fecha}${primero.notas ? ` • ${primero.notas}` : ""}`;
    } else {
        const fechas = adeudos.map((adeudo) => adeudo.fecha).sort();
        notas = `Pago de ${adeudos.length} periodos (${fechas[0]} a ${fechas[fechas.length - 1]})`;
    }
    const diferencia = Math.round((recibido - esperado) * 100) / 100;
    if (diferencia !== 0) {
        notas += ` • esperado ${esperado.toFixed(2)}, diferencia ${diferencia > 0 ? "+" : ""}${diferencia.toFixed(2)}`;
    }
    const idLiquidacion = `reg_liq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    return mutarIngresosAnio(uid, year, (actual) => {
        const empresa = (actual.empresas || []).find((item) => item.id === primero.empresaId);
        const registros = (actual.registros || []).map((item) => ids.has(item.id)
            ? { ...item, estado: "Liquidado", fechaLiquidacion: fecha }
            : item);
        registros.push(normalizarRegistroIngreso({
            id: idLiquidacion,
            empresaId: primero.empresaId,
            fecha,
            mes: mesDeFecha(fecha),
            numeroPeriodo: adeudos.length === 1 ? primero.numeroPeriodo || null : null,
            tipo: "Liquidación",
            clasificacionCobro: "liquidacion",
            estado: "Pagado",
            montoTeorico: 0,
            montoExtra: 0,
            montoReal: recibido,
            notas,
            origenAdeudoId: primero.id,
            origenAdeudoIds: [...ids],
        }, empresa));
        return { ...actual, registros: ordenarPorFecha(registros) };
    });
};

/**
 * Actualiza la configuración del año (ej. switch de préstamos)
 */
export const actualizarConfiguracionIngresos = async (uid, year, _data, configuracion) => mutarIngresosAnio(uid, year, (actual) => ({
    ...actual,
    configuracion: {
        ...(actual.configuracion || {}),
        ...configuracion,
    },
}));
