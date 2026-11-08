import { useAppStore } from "../stores/useAppStore";
import { guardarRegistrosPago } from "./firebase/ingresos";
import { obtenerMontoRegistro } from "./ingresosCalculos";
import { registrarMovimiento } from "./registrarMovimientos";

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
 * @returns {{ dataActualizada, depositos: { cuenta, monto }[] }}
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

        const resultado = await registrarMovimiento({
            valores: {
                tipoDeMovimiento: "ingreso",
                monto,
                categoria: "ingreso",
                nota: notaMovimiento(registro, empresa),
                fechaMovimiento: registro.fecha,
            },
            cuenta,
            uid,
            festejar: false,
        });
        if (resultado) {
            // Dos depósitos a la misma cuenta: el segundo parte del saldo nuevo.
            cuentasPorId.set(cuenta.id, resultado.cuenta);
            depositos.push({ cuenta: resultado.cuenta, monto });
        }
    }

    return { dataActualizada, depositos };
};
