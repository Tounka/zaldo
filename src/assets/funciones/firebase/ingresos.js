import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "./dbFirebase";

const getDocRef = (uid, year) => doc(db, "ingresos", uid, "años", String(year));

export const EMPRESAS_PREDETERMINADAS = [
    {
        id: "emp_sitio_random",
        nombre: "Sitio Random",
        activo: false,
        color: "#533B8F",
        tipoEsquema: "quincenal",
        salarioDiario: 200,
        quincenaBase: 3000,
        bonoPromedio: 2000,
        notas: "Empleo anterior / Finiquitado",
    },
    {
        id: "emp_innci",
        nombre: "iNNCi",
        activo: true,
        color: "#0088FE",
        tipoEsquema: "por_horas",
        precioHora: 52,
        horasSemanales: 11,
        bonoInternet: 200,
        aplicarResico: false,
        notas: "Reporte semanal con pago mensual o semanal",
    },
    {
        id: "emp_empleo_actual",
        nombre: "Empleo Actual (Cortes)",
        activo: true,
        color: "#00C49F",
        tipoEsquema: "diario_sexto_dia",
        salarioDiario: 577,
        diasTrabajadosDefault: 5,
        incluirSextoDia: true,
        notas: "Cortes semanales $577/día trabajando 5 días + 6to por ley",
    },
    {
        id: "emp_otros",
        nombre: "Otros Ingresos",
        activo: true,
        color: "#FFBB28",
        tipoEsquema: "libre",
        notas: "Proyectos freelance, ventas o extras",
    },
];

/**
 * Consulta el documento del año en Firestore
 */
export const obtenerIngresosAnio = async (uid, year) => {
    const ref = getDocRef(uid, year);
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
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

    // Heredar empresas del año anterior si existen
    const anterior = anteriorEnCache ?? (year ? await obtenerIngresosAnio(uid, year - 1) : null);
    const empresas = anterior?.empresas?.length > 0 ? anterior.empresas : EMPRESAS_PREDETERMINADAS;

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
        await setDoc(ref, data);
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
            fechaModificacion: Timestamp.now(),
        };
        await updateDoc(ref, dataGuardar);
        return true;
    } catch (error) {
        console.error("Error al guardar ingresos:", error);
        return false;
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

    const registroObj = {
        ...registro,
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
 * Inserta masivamente registros de pago (ej. desde importación de Excel)
 */
export const guardarRegistrosMasivos = async (uid, year, data, nuevosRegistros) => {
    const registrosExistentes = [...(data.registros || [])];

    nuevosRegistros.forEach((n) => {
        const fechaD = new Date(n.fecha + "T12:00:00");
        const mes = !isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1;
        registrosExistentes.push({
            ...n,
            id: n.id || "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            mes,
        });
    });

    registrosExistentes.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

    const dataActualizada = { ...data, registros: registrosExistentes };
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
