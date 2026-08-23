import { Navigate } from "react-router-dom";
import { PaginaPrestamosUx } from "./paginaPrestamosUx";

export const PaginaPrestamos = () => {
    return <PaginaPrestamosUx />;
};

/*
 * Cobranza y Préstamos eran la misma pantalla duplicada: misma consulta, mismos
 * KPIs y mismo filtrado. La única diferencia real, la asignación masiva, ya
 * estaba condicionada por `esAdmin` dentro de la página, así que se conservó una
 * sola implementación. La ruta vieja redirige para no romper enlaces guardados.
 */
export const PaginaCobranza = () => {
    return <Navigate to="/prestamos" replace />;
};
