import {
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "./dbFirebase";
import { normalizarRegistroIngreso } from "../ingresosCalculos";

import { fechaLocalISO } from "../utils/fechas";
const getDocRef = (uid, year) => doc(db, "usuarios", uid, "ingresos", String(year));

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
        const refUser = getDocRef(uid, year);
        const snapUser = await getDoc(refUser);
        if (snapUser.exists()) {
            return { id: snapUser.id, ...snapUser.data() };
        }

        // 2. Intentar en ingresos/{uid}/años/{year} como fallback
        try {
            const refGlobal = doc(db, "ingresos", uid, "años", String(year));
            const snapGlobal = await getDoc(refGlobal);
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
 * Consultar un año ya no crea el documento: se crea con la primera escritura
 * (todas usan setDoc con merge sobre el documento completo).
 */
export const obtenerOAInicializarIngresosAnio = async (uid, year) => {
    const existente = await obtenerIngresosAnio(uid, year);
    if (existente) {
        return existente;
    }
    return construirIngresosAnioBase(uid, year);
};

/**
 * Guarda el documento completo de ingresos del año
 */
export const guardarIngresosDocumento = async (uid, year, data) => {
    const ref = getDocRef(uid, year);
    try {
        const dataGuardar = sinUndefined({
            ...data,
            year: Number(year),
            fechaModificacion: Timestamp.now(),
        });
        await setDoc(ref, dataGuardar, { merge: true });

        try {
            const refGlobal = doc(db, "ingresos", uid, "años", String(year));
            await setDoc(refGlobal, dataGuardar, { merge: true });
        } catch {
            // Ignorar si no hay regla global
        }

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
export const guardarEmpresa = async (uid, year, data, empresa) => {
    const empresas = [...(data?.empresas || [])].map((item, orden) => ({
        ...item,
        orden: item.orden ?? orden,
    }));
    const index = empresa.id ? empresas.findIndex((e) => e.id === empresa.id) : -1;

    if (index >= 0) {
        empresas[index] = { ...empresas[index], ...empresa };
    } else {
        empresas.push({
            ...empresa,
            id: empresa.id || "emp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            activo: empresa.activo !== undefined ? empresa.activo : true,
            orden: empresas.length,
            anioCreacion: Number(year),
        });
    }

    const dataActualizada = { ...(data || {}), empresas };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};

/** Mueve una empresa y guarda el orden para todas las vistas del a\u00f1o. */
export const reordenarEmpresa = async (uid, year, data, empresaId, direccion) => {
    const empresas = [...(data.empresas || [])]
        .map((empresa, orden) => ({ ...empresa, orden: empresa.orden ?? orden }))
        .sort((a, b) => Number(a.orden) - Number(b.orden));
    const indice = empresas.findIndex((empresa) => empresa.id === empresaId);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= empresas.length) return data;

    [empresas[indice], empresas[destino]] = [empresas[destino], empresas[indice]];
    const dataActualizada = { ...data, empresas: empresas.map((empresa, orden) => ({ ...empresa, orden })) };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};

/**
 * Elimina una empresa del año
 */
export const eliminarEmpresa = async (uid, year, data, empresaId) => {
    const empresas = (data.empresas || []).filter((e) => e.id !== empresaId);
    const dataActualizada = { ...data, empresas };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};

/**
 * Guarda o actualiza un registro individual de pago
 */
export const guardarRegistroPago = async (uid, year, data, registro) => {
    const registros = [...(data.registros || [])];
    const index = registros.findIndex((r) => r.id === registro.id);

    const registroId = registro.id || "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const fechaD = new Date(registro.fecha + "T12:00:00");
    const mes = !isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1;

    const empresa = (data.empresas || []).find((item) => item.id === registro.empresaId);
    const registroObj = {
        ...normalizarRegistroIngreso(registro, empresa),
        id: registroId,
        mes,
    };

    // Si la fecha es de otro año, el registro va al documento de ese año
    // (antes quedaba en el año visible y "desaparecía" de los totales).
    const anioFecha = !isNaN(fechaD.getTime()) ? fechaD.getFullYear() : Number(year);
    if (anioFecha !== Number(year)) {
        const destino = await obtenerOAInicializarIngresosAnio(uid, anioFecha);
        const empresasDestino = [...(destino.empresas || [])];
        if (empresa && !empresasDestino.some((e) => e.id === empresa.id)) {
            empresasDestino.push(empresa);
        }
        const registrosDestino = (destino.registros || []).filter((r) => r.id !== registroId);
        registrosDestino.push(registroObj);
        registrosDestino.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
        await guardarIngresosDocumento(uid, anioFecha, { ...destino, empresas: empresasDestino, registros: registrosDestino });

        if (index < 0) return data;
        // Era un registro de este año que cambió de fecha: se quita de aquí
        registros.splice(index, 1);
        const dataSinRegistro = { ...data, registros };
        await guardarIngresosDocumento(uid, year, dataSinRegistro);
        return dataSinRegistro;
    }

    if (index >= 0) {
        registros[index] = { ...registros[index], ...registroObj };
    } else {
        registros.push(registroObj);
    }

    // Ordenar por fecha cronológica
    registros.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

    const dataActualizada = { ...data, registros };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};

/**
 * Elimina un registro de pago
 */
export const eliminarRegistroPago = async (uid, year, data, registroId) => {
    const registros = (data.registros || []).filter((r) => r.id !== registroId);
    const dataActualizada = { ...data, registros };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};

/**
 * Inserta masivamente registros en sus respectivos años correspondientes
 */
export const importarRegistrosEnVariosAnios = async (uid, nuevosRegistros = [], empresasACrear = []) => {
    // 1. Agrupar registros por año según su fecha (YYYY-MM-DD)
    const porAnio = {};
    nuevosRegistros.forEach((reg) => {
        const anio = parseInt(reg.fecha?.split("-")[0]) || new Date().getFullYear();
        if (!porAnio[anio]) porAnio[anio] = [];
        porAnio[anio].push(reg);
    });

    const resultados = {};

    for (const [anioStr, regs] of Object.entries(porAnio)) {
        const anio = Number(anioStr);
        let dataAnio = await obtenerOAInicializarIngresosAnio(uid, anio);
        if (!dataAnio) {
            dataAnio = {
                year: anio,
                configuracion: { incluirPrestamosEnResumen: true },
                empresas: [],
                registros: [],
                ingresosExtra: [],
            };
        }

        // Combinar empresas
        const empresasActuales = [...(dataAnio.empresas || [])];
        empresasACrear.forEach((nuevaEmp) => {
            const existe = empresasActuales.some((e) => e.id === nuevaEmp.id || e.nombre.toLowerCase() === nuevaEmp.nombre.toLowerCase());
            if (!existe) {
                empresasActuales.push(nuevaEmp);
            }
        });

        // Combinar registros sin duplicar
        const registrosActuales = [...(dataAnio.registros || [])];
        regs.forEach((nuevoR) => {
            const fechaD = new Date(nuevoR.fecha + "T12:00:00");
            const mes = !isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1;
            const rObj = {
                ...nuevoR,
                id: nuevoR.id || "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                mes,
            };

            const idxExistente = registrosActuales.findIndex((r) =>
                r.fecha === rObj.fecha && r.empresaId === rObj.empresaId && r.numeroPeriodo === rObj.numeroPeriodo && r.tipo === rObj.tipo
            );

            if (idxExistente >= 0) {
                registrosActuales[idxExistente] = { ...registrosActuales[idxExistente], ...rObj };
            } else {
                registrosActuales.push(rObj);
            }
        });

        registrosActuales.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

        const dataGuardar = {
            ...dataAnio,
            empresas: empresasActuales,
            registros: registrosActuales,
        };

        await guardarIngresosDocumento(uid, anio, dataGuardar);
        resultados[anio] = regs.length;
    }

    return resultados;
};

/**
 * Inserta masivamente registros en un solo año
 */
export const guardarRegistrosMasivos = async (uid, year, data, nuevosRegistros) => {
    const registros = [...(data.registros || [])];
    const empresasPorId = new Map((data.empresas || []).map((empresa) => [empresa.id, empresa]));
    nuevosRegistros.forEach((registro) => {
        const fechaD = new Date(`${registro.fecha}T12:00:00`);
        const registroNormalizado = {
            ...normalizarRegistroIngreso(registro, empresasPorId.get(registro.empresaId)),
            id: registro.id || "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            mes: !Number.isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1,
        };
        const indice = registros.findIndex((item) => item.id === registroNormalizado.id);
        if (indice >= 0) registros[indice] = { ...registros[indice], ...registroNormalizado };
        else registros.push(registroNormalizado);
    });
    registros.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    const dataActualizada = { ...data, registros };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
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
 * m\u00e1s o de menos, redondeos), as\u00ed que el monto se registra tal cual y la
 * diferencia queda anotada; los adeudos pasan a Liquidado para no contar doble.
 */
export const liquidarAdeudosIngreso = async (uid, year, data, adeudos = [], { monto, fecha: fechaPago } = {}) => {
    if (adeudos.length === 0) return data;
    const primero = adeudos[0];
    const empresa = (data.empresas || []).find((item) => item.id === primero.empresaId);
    const fecha = fechaPago || fechaLocalISO();
    const fechaD = new Date(`${fecha}T12:00:00`);
    const ids = new Set(adeudos.map((adeudo) => adeudo.id));
    const esperado = Math.round(adeudos.reduce((suma, adeudo) => suma + montoAdeudo(adeudo), 0) * 100) / 100;
    const recibido = monto === undefined || monto === null || monto === "" ? esperado : Number(monto);

    let notas;
    if (adeudos.length === 1) {
        notas = `Pago del adeudo del ${primero.fecha}${primero.notas ? ` \u2022 ${primero.notas}` : ""}`;
    } else {
        const fechas = adeudos.map((adeudo) => adeudo.fecha).sort();
        notas = `Pago de ${adeudos.length} periodos (${fechas[0]} a ${fechas[fechas.length - 1]})`;
    }
    const diferencia = Math.round((recibido - esperado) * 100) / 100;
    if (diferencia !== 0) {
        notas += ` \u2022 esperado ${esperado.toFixed(2)}, diferencia ${diferencia > 0 ? "+" : ""}${diferencia.toFixed(2)}`;
    }

    const registros = (data.registros || []).map((item) => ids.has(item.id)
        ? { ...item, estado: "Liquidado", fechaLiquidacion: fecha }
        : item);
    registros.push(normalizarRegistroIngreso({
        id: `reg_liq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        empresaId: primero.empresaId,
        fecha,
        mes: !Number.isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1,
        numeroPeriodo: adeudos.length === 1 ? primero.numeroPeriodo || null : null,
        tipo: "Liquidaci\u00f3n",
        clasificacionCobro: "liquidacion",
        estado: "Pagado",
        montoTeorico: 0,
        montoExtra: 0,
        montoReal: recibido,
        notas,
        origenAdeudoId: primero.id,
        origenAdeudoIds: [...ids],
    }, empresa));
    registros.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    const dataActualizada = { ...data, registros };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};

/**
 * Actualiza la configuración del año (ej. switch de préstamos)
 */
export const actualizarConfiguracionIngresos = async (uid, year, data, configuracion) => {
    const dataActualizada = {
        ...data,
        configuracion: {
            ...(data.configuracion || {}),
            ...configuracion,
        },
    };
    await guardarIngresosDocumento(uid, year, dataActualizada);
    return dataActualizada;
};
