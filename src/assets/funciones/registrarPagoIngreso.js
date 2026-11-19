import { useAppStore } from "../stores/useAppStore";
import { guardarRegistrosPago, mutarIngresosAnio } from "./firebase/ingresos";
import { obtenerMontoRegistro } from "./ingresosCalculos";
import { deshacerMovimiento, registrarMovimiento } from "./registrarMovimientos";

/*
 * Único camino para registrar el pago de un empleo: lo usan el modal de
 * Ingresos y el asistente.
 *
 * Guarda el pago y sus percepciones (bonos, vales) en el año de su fecha y,
 * por cada uno que ya se cobró y tiene cuenta, registra el ingreso en esa
 * cuenta por registrarMovimiento, el mismo camino de cualquier movimiento. Lo
 * pendiente de cobro no mueve saldos.
 */

const notaMovimiento = (registro, empresa) => {
    const concepto = registro.notas || "";
    return `Ingreso · ${empresa?.nombre || registro.empresaNombre || "Empresa"}${concepto ? ` · ${concepto}` : ""}`.slice(0, 200);
};

/**
 * @param registros       [pagoPrincipal, ...percepciones]; el primero puede ser una edición.
 * @param estadosPrevios  { [registroId]: estado } de los que se editan, para no duplicar el movimiento.
 * @returns {{ dataActualizada, depositos: { cuenta, monto, movimiento, valores }[] }}
 *          `movimiento` y `valores` son lo que pide deshacerPagoIngreso.
 */
export const registrarPagoIngreso = async ({ uid, year, empresa, registros = [], estadosPrevios = {} }) => {
    const dataActualizada = await guardarRegistrosPago(uid, year, registros, { empresaRespaldo: empresa });

    const cuentasPorId = new Map((useAppStore.getState().cuentas || []).map((cuenta) => [cuenta.id, cuenta]));
    const depositos = [];

    for (const registro of registros) {
        const yaEstabaCobrado = estadosPrevios[registro.id] === "Pagado";
        const monto = obtenerMontoRegistro(registro);
        const cuenta = cuentasPorId.get(registro.cuentaDestinoId);
        if (registro.estado !== "Pagado" || yaEstabaCobrado || !cuenta || !(monto > 0)) continue;

        const valores = {
            tipoDeMovimiento: "ingreso",
            monto,
            categoria: "ingreso",
            nota: notaMovimiento(registro, empresa),
            fechaMovimiento: registro.fecha,
        };
        const resultado = await registrarMovimiento({ valores, cuenta, uid, festejar: false });
        if (resultado) {
            // Dos depósitos a la misma cuenta: el segundo parte del saldo nuevo.
            cuentasPorId.set(cuenta.id, resultado.cuenta);
            depositos.push({ cuenta: resultado.cuenta, monto, movimiento: resultado.movimiento, valores });
        }
    }

    return { dataActualizada, depositos };
};

/**
 * Deshace un pago recién registrado con registrarPagoIngreso: regresa cada
 * depósito a su cuenta y quita los registros de Ingresos.
 * @param registros  Los que se guardaron (con su id y fecha).
 * @param depositos  Los que devolvió registrarPagoIngreso.
 * @returns {{ sinSaldo: boolean }} sinSaldo si algún depósito no se pudo regresar.
 */
export const deshacerPagoIngreso = async ({ uid, registros = [], depositos = [] }) => {
    let sinSaldo = false;
    for (const deposito of [...depositos].reverse()) {
        const cuenta = (useAppStore.getState().cuentas || []).find((actual) => actual.id === deposito.cuenta.id);
        const resultado = cuenta
            ? await deshacerMovimiento({ movimiento: deposito.movimiento, valores: deposito.valores, cuenta, uid })
            : null;
        if (!resultado || resultado.sinSaldo) sinSaldo = true;
    }

    const idsPorAnio = new Map();
    registros.forEach((registro) => {
        const anio = Number(String(registro.fecha).slice(0, 4));
        idsPorAnio.set(anio, (idsPorAnio.get(anio) || new Set()).add(registro.id));
    });
    for (const [anio, ids] of idsPorAnio) {
        await mutarIngresosAnio(uid, anio, (actual) => ({
            ...actual,
            registros: (actual.registros || []).filter((registro) => !ids.has(registro.id)),
        }));
    }

    return { sinSaldo };
};
