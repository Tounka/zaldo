import { useAppStore } from "../../stores/useAppStore";

/*
 * Formato de moneda en un solo lugar, para que la preferencia de centavos
 * aplique en toda la app sin repetir la configuración en cada componente.
 */

const cache = new Map();

const obtenerFormateador = (conCentavos) => {
    const clave = conCentavos ? "con" : "sin";

    if (!cache.has(clave)) {
        cache.set(clave, new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: conCentavos ? 2 : 0,
            maximumFractionDigits: conCentavos ? 2 : 0,
        }));
    }

    return cache.get(clave);
};

export const formatearMonedaCon = (valor, conCentavos = true) =>
    obtenerFormateador(conCentavos).format(Number(valor) || 0);

/*
 * Formatea leyendo la preferencia directamente del store.
 *
 * Está pensado para helpers que se ejecutan fuera de un componente (celdas de
 * tabla, contenido de gráficas) y por eso no pueden usar hooks. Como no
 * suscribe, un cambio de preferencia se refleja en el siguiente render de la
 * pantalla, no al instante; para componentes normales usa `useFormatoMoneda`.
 */
export const formatearMonedaSegunPreferencia = (valor) => formatearMonedaCon(
    valor,
    useAppStore.getState().preferencias?.mostrarCentavos !== false,
);

/*
 * Hook para componentes: devuelve un formateador que ya respeta la preferencia
 * del usuario y se recalcula solo cuando esa preferencia cambia.
 */
export const useFormatoMoneda = () => {
    const conCentavos = useAppStore(
        (estado) => estado.preferencias.mostrarCentavos !== false,
    );

    return (valor) => formatearMonedaCon(valor, conCentavos);
};
