import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "./dbFirebase";

const CATEGORIAS = ["liquido", "inversiones", "inversionesLargo", "responsabilidades"];

const crearCuentaVacia = (nombre) => ({
    id: crypto.randomUUID(),
    nombre,
    monto: 0,
});

const getDocRef = (uid, year) => doc(db, "ahorros", uid, "años", String(year));

export const obtenerAhorrosAnio = async (uid, year) => {
    const ref = getDocRef(uid, year);
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error al obtener ahorros:", error);
        return null;
    }
};

export const inicializarAnio = async (uid, year) => {
    const ref = getDocRef(uid, year);
    const data = {
        year,
        cuentas: {
            liquido: [],
            inversiones: [],
            inversionesLargo: [],
            responsabilidades: [],
        },
        historial: [],
        kpis: {
            metaAnual: 0,
            fechaInicio: null,
        },
        fechaCreacion: Timestamp.now(),
        fechaModificacion: Timestamp.now(),
    };
    try {
        await setDoc(ref, data);
        return data;
    } catch (error) {
        console.error("Error al inicializar año:", error);
        return null;
    }
};

export const obtenerOAInicializarAnio = async (uid, year) => {
    let data = await obtenerAhorrosAnio(uid, year);
    if (!data) {
        data = await inicializarAnio(uid, year);
    }
    return data;
};

export const guardarDocumentoCompleto = async (uid, year, data) => {
    const ref = getDocRef(uid, year);
    try {
        await updateDoc(ref, {
            cuentas: data.cuentas,
            historial: data.historial || [],
            kpis: data.kpis || {},
            fechaModificacion: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error("Error al guardar:", error);
        return false;
    }
};

export const agregarCuentaLocal = (data, categoria, nombre) => {
    const nuevaCuenta = crearCuentaVacia(nombre);
    return {
        ...data,
        cuentas: {
            ...data.cuentas,
            [categoria]: [...(data.cuentas[categoria] || []), nuevaCuenta],
        },
    };
};

export const eliminarCuentaLocal = (data, categoria, cuentaId) => {
    return {
        ...data,
        cuentas: {
            ...data.cuentas,
            [categoria]: (data.cuentas[categoria] || []).filter((c) => c.id !== cuentaId),
        },
    };
};

export const actualizarMontoLocal = (data, categoria, cuentaId, nuevoMonto) => {
    const arr = (data.cuentas[categoria] || []).map((c) =>
        c.id === cuentaId ? { ...c, monto: Number(nuevoMonto) } : c
    );
    return {
        ...data,
        cuentas: {
            ...data.cuentas,
            [categoria]: arr,
        },
    };
};

export const actualizarNombreLocal = (data, categoria, cuentaId, nuevoNombre) => {
    const arr = (data.cuentas[categoria] || []).map((c) =>
        c.id === cuentaId ? { ...c, nombre: nuevoNombre } : c
    );
    return {
        ...data,
        cuentas: {
            ...data.cuentas,
            [categoria]: arr,
        },
    };
};

export const reordenarFilasLocal = (data, categoria, fromIdx, toIdx) => {
    const arr = [...(data.cuentas[categoria] || [])];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    return {
        ...data,
        cuentas: {
            ...data.cuentas,
            [categoria]: arr,
        },
    };
};

export const calcularTotales = (cuentas) => {
    const sumar = (arr) => (arr || []).reduce((acc, c) => acc + Number(c.monto || 0), 0);
    const liquido = sumar(cuentas.liquido);
    const inversiones = sumar(cuentas.inversiones);
    const inversionesLargo = sumar(cuentas.inversionesLargo);
    const responsabilidades = sumar(cuentas.responsabilidades);
    return {
        liquido,
        inversiones,
        inversionesLargo,
        responsabilidades,
        capitalTotal: liquido + inversiones + inversionesLargo - responsabilidades,
    };
};

export const agregarSnapshotHistorial = (data) => {
    const totales = calcularTotales(data.cuentas);
    const hoy = new Date().toISOString().split("T")[0];
    const historial = [...(data.historial || [])];
    const ultimo = historial[historial.length - 1];

    if (ultimo && ultimo.fechaKey === hoy) {
        historial[historial.length - 1] = { ...ultimo, ...totales };
    } else {
        historial.push({
            fechaKey: hoy,
            fecha: Timestamp.now(),
            ...totales,
        });
    }

    return { ...data, historial };
};

export const importarHistorialDesdeExcel = (data, lineas) => {
    const historial = lineas
        .map((linea) => {
            const partes = linea.split("\t");
            if (partes.length < 2) return null;

            const montoStr = partes[0].replace(/[$,]/g, "").trim();
            const monto = parseFloat(montoStr);
            if (isNaN(monto)) return null;

            const fechaStr = partes[1].trim();
            const [day, month, year] = fechaStr.split("/");
            if (!day || !month || !year) return null;

            const fechaKey = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

            return {
                fechaKey,
                fecha: Timestamp.fromDate(new Date(year, month - 1, day)),
                capitalTotal: monto,
                liquido: 0,
                inversiones: 0,
                inversionesLargo: 0,
                responsabilidades: 0,
            };
        })
        .filter(Boolean);

    const historialExistente = data.historial || [];
    const historialMap = new Map();

    historialExistente.forEach((h) => historialMap.set(h.fechaKey, h));
    historial.forEach((h) => historialMap.set(h.fechaKey, h));

    const historialFinal = Array.from(historialMap.values()).sort((a, b) =>
        a.fechaKey.localeCompare(b.fechaKey)
    );

    return { ...data, historial: historialFinal };
};

export const importarCuentasDesdeExcel = (data, texto, categoria) => {
    const lineas = texto.trim().split("\n").filter((l) => l.trim());
    const cuentasExistentes = data.cuentas[categoria] || [];

    const nuevasCuentas = lineas.map((linea) => {
        const partes = linea.split("\t");
        const nombre = partes[0]?.trim() || "";
        const montoStr = partes[1]?.replace(/[$,]/g, "").trim() || "0";
        const monto = parseFloat(montoStr) || 0;

        const existente = cuentasExistentes.find(
            (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
        );

        if (existente) {
            return { ...existente, monto };
        }

        return {
            id: crypto.randomUUID(),
            nombre,
            monto,
        };
    });

    return {
        ...data,
        cuentas: {
            ...data.cuentas,
            [categoria]: nuevasCuentas,
        },
    };
};

export { CATEGORIAS };
