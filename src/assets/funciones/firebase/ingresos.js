import {
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "./dbFirebase";
import { normalizarRegistroIngreso } from "../ingresosCalculos";

const getDocRef = (uid, year) => doc(db, "usuarios", uid, "ingresos", String(year));

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
 * Inicializa un año con estructura base
 */
export const inicializarIngresosAnio = async (uid, year, anteriorEnCache = null) => {
    const ref = getDocRef(uid, year);
    const ahora = Timestamp.now();

    // Heredar empresas del año anterior si existen en la cuenta del usuario
    const anterior = anteriorEnCache ?? (year ? await obtenerIngresosAnio(uid, year - 1) : null);
    const empresas = anterior?.empresas?.length > 0 ? anterior.empresas : [];

    const data = {
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

    try {
        await setDoc(ref, data, { merge: true });
        return data;
    } catch (error) {
        console.error("Error al inicializar año de ingresos:", error);
        return null;
    }
};

/**
 * Obtiene o inicializa los ingresos para un año
 */
export const obtenerOAInicializarIngresosAnio = async (uid, year) => {
    const existente = await obtenerIngresosAnio(uid, year);
    if (existente) {
        return existente;
    }
    return inicializarIngresosAnio(uid, year);
};

/**
 * Guarda el documento completo de ingresos del año
 */
export const guardarIngresosDocumento = async (uid, year, data) => {
    const ref = getDocRef(uid, year);
    try {
        const dataGuardar = {
            ...data,
            year: Number(year),
            fechaModificacion: Timestamp.now(),
        };
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
    const empresas = [...(data.empresas || [])];
    const index = empresas.findIndex((e) => e.id === empresa.id);

    if (index >= 0) {
        empresas[index] = { ...empresas[index], ...empresa };
    } else {
        empresas.push({
            ...empresa,
            id: empresa.id || "emp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            activo: empresa.activo !== undefined ? empresa.activo : true,
        });
    }

    const dataActualizada = { ...data, empresas };
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
    return importarRegistrosEnVariosAnios(uid, nuevosRegistros, data.empresas || []);
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
