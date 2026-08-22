import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "./dbFirebase";

const CATEGORIAS = ["liquido", "inversiones", "inversionesLargo", "responsabilidades"];

// El año de ahorro no es el año de calendario: corre de agosto a julio.
// El "año 2027" abarca del 01/ago/2026 al 31/jul/2027.
const MES_CORTE = 8;

export const getAnioAhorro = (fecha = new Date()) =>
    fecha.getFullYear() + (fecha.getMonth() + 1 >= MES_CORTE ? 1 : 0);

export const rangoAnioAhorro = (year) => ({
    inicio: new Date(year - 1, MES_CORTE - 1, 1),
    fin: new Date(year, MES_CORTE - 1, 1), // exclusivo
});

/*
 * La apertura se fecha el ÚLTIMO DÍA DEL MES ANTERIOR (31/jul), no el primero
 * del año nuevo (01/ago).
 *
 * Si se fecha el 01/ago choca con el snapshot del primer día del año: comparten
 * fechaKey, el snapshot de hoy reescribe la apertura y el historial se queda con
 * UNA sola fila. Sin fila previa no hay contra qué comparar y la gráfica, el
 * panel de incrementos y la tabla de aumento diario muestran que no hubo cambio.
 *
 * Fechándola el 31/jul el día 1 del año ya arranca con una referencia.
 * (day = 0 devuelve el último día del mes anterior)
 */
export const fechaCierreAnio = (year) => new Date(year, MES_CORTE - 1, 0);

// Lo que un año abre es lo que el anterior cerró: misma fecha, 31/jul.
export const fechaAperturaAnio = (year) => fechaCierreAnio(year - 1);

// Fecha local, no UTC: toISOString() adelanta un día en husos negativos.
export const toFechaKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fechaUltimoMovimientoHoy = () => toFechaKey(new Date());

// Un snapshot siempre debe caer dentro del año de ahorro que se está editando.
const fechaSnapshotParaAnio = (year) => {
    const hoy = new Date();
    if (!year || getAnioAhorro(hoy) === year) return hoy;
    const { inicio } = rangoAnioAhorro(year);
    if (hoy < inicio) return inicio;   // año futuro: primer día del periodo
    return fechaCierreAnio(year);      // año cerrado: último día del periodo
};

const crearCuentaVacia = (nombre) => ({
    id: crypto.randomUUID(),
    nombre,
    monto: 0,
});

const crearCuentasVacias = () =>
    CATEGORIAS.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});

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

// Corte anual: el año nuevo arranca con las cuentas de cierre del anterior
// y un snapshot de apertura fechado el día del corte, para que "Cantidad
// Inicial", el % de aumento y el ritmo diario tengan una base real.
export const inicializarAnio = async (uid, year, anteriorEnCache = null) => {
    const ref = getDocRef(uid, year);
    // Si la página ya tiene el año anterior en memoria no se vuelve a leer.
    const anterior = anteriorEnCache ?? await obtenerAhorrosAnio(uid, year - 1);

    const cuentas = crearCuentasVacias();
    let historial = [];
    let fechaInicio = null;

    if (anterior?.cuentas) {
        CATEGORIAS.forEach((cat) => {
            cuentas[cat] = (anterior.cuentas[cat] || []).map((c) => ({
                ...c,
                monto: Number(c.monto || 0),
            }));
        });

        const apertura = fechaAperturaAnio(year);
        fechaInicio = Timestamp.fromDate(apertura);
        historial = [{
            fechaKey: toFechaKey(apertura),
            fecha: fechaInicio,
            nota: "Apertura (corte anual)",
            ...calcularTotales(cuentas),
        }];
    }

    const data = {
        year,
        cuentas,
        historial,
        kpis: {
            metaAnual: 0,
            fechaInicio,
            /*
             * La línea base del año es el cierre del año anterior, y se guarda
             * APARTE de `historial` porque ese snapshot es mutable: al editar
             * cuentas el mismo día en que arranca el año se reescribía y movía
             * la "Cantidad Inicial".
             *
             * Si NO hay año anterior queda en null, no en 0. Son cosas distintas:
             * null = "todavía no se sabe", y deja que la fije el primer registro
             * que importes. Un 0 se congelaría y haría que todo tu capital
             * contara como ahorro del año.
             */
            capitalInicial: anterior?.cuentas ? calcularTotales(cuentas).capitalTotal : null,
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

/**
 * ¿Este documento ya tiene definida su línea base?
 * `null`/`undefined` significan "sin definir"; un 0 explícito sí cuenta.
 */
export const tieneLineaBase = (data) => data?.kpis?.capitalInicial !== undefined
    && data?.kpis?.capitalInicial !== null;

/*
 * Orden de prioridad para la línea base de un año:
 *
 *   1. El cierre del año anterior, si ese año existe. Es la definición correcta:
 *      lo que un año arranca es lo que el anterior terminó.
 *   2. El registro más antiguo del propio historial, para el primer año que
 *      registras (no hay año anterior de dónde heredar).
 *
 * Una vez fijada NO se recalcula, para que ninguna edición la mueva.
 */
const asegurarLineaBase = async (uid, data, year, anteriorEnCache = null) => {
    if (!data || tieneLineaBase(data)) return data;

    // 1) Heredar del cierre del año anterior
    const anterior = anteriorEnCache ?? await obtenerAhorrosAnio(uid, year - 1);
    if (anterior?.cuentas) {
        return {
            ...data,
            kpis: {
                ...(data.kpis || {}),
                capitalInicial: calcularTotales(anterior.cuentas).capitalTotal,
                fechaInicio: data.kpis?.fechaInicio || Timestamp.fromDate(fechaAperturaAnio(year)),
            },
        };
    }

    // 2) Sin año anterior: el registro más antiguo es el punto de partida
    const primero = (data.historial || [])[0];
    if (!primero) return data;

    return {
        ...data,
        kpis: {
            ...(data.kpis || {}),
            capitalInicial: Number(primero.capitalTotal || 0),
            fechaInicio: data.kpis?.fechaInicio || primero.fecha,
        },
    };
};

/*
 * Repara los documentos creados cuando la apertura se fechaba el 01/ago.
 * En esos, la apertura y el snapshot del primer día comparten fechaKey, así que
 * la apertura quedó sobrescrita con los montos de hoy y el historial tiene una
 * sola fila.
 *
 * No se inventa el desglose por categoría de la apertura (se perdió al
 * sobrescribirse): se le quita la nota a esa fila —pasa a ser el snapshot normal
 * del día— y se retrasa `kpis.fechaInicio` al 31/jul. La línea base sobrevivió
 * intacta en `kpis.capitalInicial`, y con esa fecha la gráfica ya puede
 * anteponerla como punto de partida.
 */
const NOTA_APERTURA = "Apertura (corte anual)";

export const repararAperturaColisionada = (data, year) => {
    if (!data || !tieneLineaBase(data)) return data;

    const fechaKeyCorrecta = toFechaKey(fechaAperturaAnio(year));
    const historial = data.historial || [];
    const idx = historial.findIndex((h) => h.nota === NOTA_APERTURA);

    // Sin apertura, o ya fechada bien: nada que hacer.
    if (idx < 0 || historial[idx].fechaKey === fechaKeyCorrecta) return data;

    return {
        ...data,
        historial: historial.map((h, i) => (i === idx ? { ...h, nota: "" } : h)),
        kpis: {
            ...(data.kpis || {}),
            fechaInicio: Timestamp.fromDate(fechaAperturaAnio(year)),
        },
    };
};

export const obtenerOAInicializarAnio = async (uid, year, opciones = {}) => {
    const { anteriorEnCache = null } = opciones;

    // Única lectura garantizada. Las demás rutas solo se activan la primera vez
    // que se abre un año o para reparar un documento viejo, y el resultado se
    // persiste para que no vuelvan a ocurrir.
    const existente = await obtenerAhorrosAnio(uid, year);
    if (!existente) {
        return inicializarAnio(uid, year, anteriorEnCache);
    }

    const conBase = await asegurarLineaBase(uid, existente, year, anteriorEnCache);
    const reparado = repararAperturaColisionada(conBase, year);

    if (reparado !== existente) {
        await guardarDocumentoCompleto(uid, year, reparado);
    }
    return reparado;
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
    const montoParseado = Number(nuevoMonto);
    const monto = Number.isFinite(montoParseado) ? montoParseado : 0;
    const arr = (data.cuentas[categoria] || []).map((c) => {
        if (c.id !== cuentaId) return c;
        // Solo un cambio financiero actualiza la fecha. Renombrar, reordenar o
        // guardar el documento no deben hacer parecer que la cuenta se movió.
        if (Number(c.monto || 0) === monto) return c;
        return { ...c, monto, fechaUltimoMovimiento: fechaUltimoMovimientoHoy() };
    });
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
    // El año sale del propio documento, no de la fecha de hoy: editar un año
    // pasado o futuro no debe estampar un snapshot fuera de su periodo.
    const anio = Number(data.year ?? data.id) || null;
    const fecha = fechaSnapshotParaAnio(anio);
    const fechaKey = toFechaKey(fecha);

    const historial = [...(data.historial || [])];
    const idx = historial.findIndex((h) => h.fechaKey === fechaKey);

    /*
     * El snapshot del día sí se reescribe: refleja el valor de cierre de ese día.
     * La "Cantidad Inicial" NO sale de aquí, sale de `kpis.capitalInicial`, que
     * se fija al crear o importar el año y ninguna edición toca. Así, editar el
     * mismo día en que arrancó el año actualiza el valor actual sin mover la
     * línea base.
     */
    if (idx >= 0) {
        historial[idx] = { ...historial[idx], ...totales };
    } else {
        historial.push({
            fechaKey,
            fecha: Timestamp.fromDate(fecha),
            nota: "",
            ...totales,
        });
    }

    historial.sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)));

    return { ...data, historial };
};

export const actualizarNotaHistorial = (data, fechaKey, nota) => {
    const historial = (data.historial || []).map((h) =>
        h.fechaKey === fechaKey ? { ...h, nota } : h
    );
    return { ...data, historial };
};

/* ─────────────────  Conciliación entre años  ───────────────── */

/*
 * El documento de un año nuevo se crea copiando las cuentas del anterior en el
 * momento en que se abre por primera vez. Si después sigues editando el año
 * viejo, los montos quedan desfasados. Esto compara ambos y deja traer solo las
 * cantidades, sin tocar el histórico.
 */

const claveNombre = (nombre) => String(nombre || "").trim().toLowerCase();

/**
 * Compara dos años y devuelve QUÉ cambiaría, sin escribir nada.
 * El emparejamiento es por id (que se conserva al copiar el año) y, si no hay,
 * por nombre normalizado.
 */
export const construirPlanConciliacion = (dataOrigen, dataDestino) => {
    const actualizar = [];
    const agregar = [];
    const igual = [];
    const soloEnDestino = [];

    CATEGORIAS.forEach((categoria) => {
        const origen = dataOrigen?.cuentas?.[categoria] || [];
        const destino = dataDestino?.cuentas?.[categoria] || [];

        const usadasDeOrigen = new Set();

        destino.forEach((cuentaDestino) => {
            const porId = origen.find((c) => c.id === cuentaDestino.id);
            const porNombre = !porId
                ? origen.find((c) => claveNombre(c.nombre) === claveNombre(cuentaDestino.nombre)
                    && !usadasDeOrigen.has(c.id))
                : null;
            const equivalente = porId || porNombre;

            if (!equivalente) {
                soloEnDestino.push({ categoria, nombre: cuentaDestino.nombre, monto: Number(cuentaDestino.monto || 0) });
                return;
            }

            usadasDeOrigen.add(equivalente.id);
            const montoAnterior = Number(cuentaDestino.monto || 0);
            const montoNuevo = Number(equivalente.monto || 0);
            const registro = {
                categoria,
                id: cuentaDestino.id,
                nombre: cuentaDestino.nombre,
                montoAnterior,
                montoNuevo,
            };

            if (montoAnterior === montoNuevo) igual.push(registro);
            else actualizar.push(registro);
        });

        origen.forEach((cuentaOrigen) => {
            if (usadasDeOrigen.has(cuentaOrigen.id)) return;
            agregar.push({
                categoria,
                cuenta: { ...cuentaOrigen, monto: Number(cuentaOrigen.monto || 0) },
            });
        });
    });

    return {
        actualizar,
        agregar,
        igual,
        soloEnDestino,
        totalesOrigen: calcularTotales(dataOrigen?.cuentas || {}),
        totalesDestino: calcularTotales(dataDestino?.cuentas || {}),
    };
};

/**
 * Aplica el plan sobre el año destino. Es puro: devuelve el documento nuevo y no
 * escribe en Firestore.
 *
 * El histórico NO se toca. `actualizarApertura` es opt-in porque el snapshot de
 * "Apertura (corte anual)" se calculó con los montos viejos y, si no se
 * actualiza, contradice a las cuentas.
 */
export const aplicarPlanConciliacion = (dataDestino, plan, opciones = {}) => {
    const { incluirNuevas = true, fijarCantidadInicial = false } = opciones;

    const montosPorId = new Map();
    plan.actualizar.forEach((item) => montosPorId.set(item.id, item.montoNuevo));

    const cuentas = {};
    CATEGORIAS.forEach((categoria) => {
        const base = (dataDestino?.cuentas?.[categoria] || []).map((cuenta) => (
            montosPorId.has(cuenta.id)
                ? { ...cuenta, monto: montosPorId.get(cuenta.id) }
                : cuenta
        ));

        const nuevas = incluirNuevas
            ? plan.agregar.filter((item) => item.categoria === categoria).map((item) => item.cuenta)
            : [];

        cuentas[categoria] = [...base, ...nuevas];
    });

    let historial = dataDestino?.historial || [];
    let kpis = dataDestino?.kpis || {};

    /*
     * Conciliar define, por definición, la apertura del año: lo que este año
     * arranca es lo que el anterior cerró. Al fijarla se repara de paso cualquier
     * documento cuya línea base se hubiera sobrescrito antes de que existiera
     * `kpis.capitalInicial`.
     */
    if (fijarCantidadInicial) {
        const totales = calcularTotales(cuentas);
        kpis = { ...kpis, capitalInicial: totales.capitalTotal };
        historial = historial.map((snapshot) => (
            snapshot.nota === "Apertura (corte anual)"
                ? { ...snapshot, ...totales }
                : snapshot
        ));
    }

    return { ...dataDestino, cuentas, historial, kpis };
};

// Convierte las líneas pegadas ("monto <TAB> dd/mm/aaaa") en snapshots.
// Cada uno lleva el año de ahorro al que pertenece según su fecha real.
export const parsearLineasHistorial = (lineas) => (lineas || [])
    .map((linea) => {
        const partes = String(linea).split("\t");
        if (partes.length < 2) return null;

        const montoStr = partes[0].replace(/[$,]/g, "").trim();
        const monto = parseFloat(montoStr);
        if (isNaN(monto)) return null;

        const fechaStr = partes[1].trim();
        const [day, month, year] = fechaStr.split("/");
        if (!day || !month || !year) return null;

        const fechaReal = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(fechaReal.getTime())) return null;

        return {
            fechaKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            fecha: Timestamp.fromDate(fechaReal),
            anioAhorro: getAnioAhorro(fechaReal),
            capitalTotal: monto,
            liquido: 0,
            inversiones: 0,
            inversionesLargo: 0,
            responsabilidades: 0,
        };
    })
    .filter(Boolean);

/**
 * Agrupa los registros pegados por año de ahorro.
 * Sirve para avisar antes de importar que el pegado abarca varios años, en vez
 * de meterlos todos en el año que esté seleccionado (que era el comportamiento
 * anterior y dejaba el "Cantidad Inicial" y el ritmo diario sin sentido).
 */
export const agruparHistorialPorAnio = (lineas) => {
    const porAnio = {};
    parsearLineasHistorial(lineas).forEach((registro) => {
        if (!porAnio[registro.anioAhorro]) porAnio[registro.anioAhorro] = [];
        porAnio[registro.anioAhorro].push(registro);
    });
    return porAnio;
};

const fusionarHistorial = (data, registros) => {
    const historialMap = new Map();
    (data.historial || []).forEach((h) => historialMap.set(h.fechaKey, h));
    registros.forEach((registro) => {
        // `anioAhorro` es solo para agrupar; no se persiste en el snapshot.
        const snapshot = { ...registro };
        delete snapshot.anioAhorro;
        historialMap.set(snapshot.fechaKey, snapshot);
    });

    const historial = Array.from(historialMap.values())
        .sort((a, b) => a.fechaKey.localeCompare(b.fechaKey));

    /*
     * Si el año todavía no tiene línea base, el registro más antiguo importado la
     * define. Se congela en `kpis` porque `historial[0]` es mutable: al editar
     * cuentas el mismo día se reescribe ese snapshot, y eso movía la "Cantidad
     * Inicial" en pantalla.
     *
     * Si YA la tiene no se toca: una base heredada del cierre del año anterior
     * manda sobre lo que traiga el pegado.
     */
    const primero = historial[0];
    const kpis = (primero && !tieneLineaBase(data))
        ? {
            ...(data.kpis || {}),
            capitalInicial: Number(primero.capitalTotal || 0),
            fechaInicio: primero.fecha,
        }
        : (data.kpis || {});

    return { ...data, historial, kpis };
};

/**
 * Importa en el año que se está editando SOLO los registros que le corresponden
 * por fecha. Los de otros años se ignoran aquí; para esos está
 * `importarHistorialEnVariosAnios`.
 */
export const importarHistorialDesdeExcel = (data, lineas) => {
    const anioDestino = Number(data?.year) || getAnioAhorro();
    const registros = parsearLineasHistorial(lineas).filter(
        (registro) => registro.anioAhorro === anioDestino
    );
    return fusionarHistorial(data, registros);
};

/**
 * Reparte los registros en el documento de cada año de ahorro, creando los que
 * falten. Devuelve { [anio]: cantidadImportada } para poder reportarlo.
 */
export const importarHistorialEnVariosAnios = async (uid, lineas) => {
    const porAnio = agruparHistorialPorAnio(lineas);
    const resultado = {};

    for (const [anioTexto, registros] of Object.entries(porAnio)) {
        const anio = Number(anioTexto);
        const dataAnio = await obtenerOAInicializarAnio(uid, anio);
        if (!dataAnio) {
            resultado[anio] = 0;
            continue;
        }
        const fusionado = fusionarHistorial({ ...dataAnio, year: anio }, registros);
        const ok = await guardarDocumentoCompleto(uid, anio, fusionado);
        resultado[anio] = ok ? registros.length : 0;
    }

    return resultado;
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
            const montoAnterior = Number(existente.monto || 0);
            return montoAnterior === monto
                ? existente
                : { ...existente, monto, fechaUltimoMovimiento: fechaUltimoMovimientoHoy() };
        }

        return {
            id: crypto.randomUUID(),
            nombre,
            monto,
            fechaUltimoMovimiento: monto !== 0 ? fechaUltimoMovimientoHoy() : null,
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

export { CATEGORIAS, MES_CORTE };
