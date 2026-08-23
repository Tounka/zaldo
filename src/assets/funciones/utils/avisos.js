import Swal from "sweetalert2";

/*
 * Punto único de avisos al usuario.
 *
 * Antes cada módulo resolvía esto a su manera: unos con Swal, otros con
 * window.confirm, otros solo con console.error (y entonces el fallo era
 * invisible). Centralizarlo hace que un error siempre se note y que confirmar
 * un borrado se vea igual en toda la app.
 */

const COLOR_MORADO = "#533b8f";
const COLOR_ROJO = "#db2b39";

/* Confirmación destructiva. Devuelve true solo si el usuario aceptó. */
export const confirmarEliminacion = async ({
    titulo = "¿Eliminar?",
    texto = "Esta acción no se puede deshacer.",
    textoConfirmar = "Sí, eliminar",
} = {}) => {
    const resultado = await Swal.fire({
        title: titulo,
        text: texto,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: textoConfirmar,
        cancelButtonText: "Cancelar",
        confirmButtonColor: COLOR_ROJO,
        cancelButtonColor: "#6b6180",
        reverseButtons: true,
    });

    return resultado.isConfirmed === true;
};

/* Confirmación no destructiva (guardar, aplicar, continuar). */
export const confirmarAccion = async ({
    titulo = "¿Continuar?",
    texto = "",
    textoConfirmar = "Continuar",
} = {}) => {
    const resultado = await Swal.fire({
        title: titulo,
        text: texto,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: textoConfirmar,
        cancelButtonText: "Cancelar",
        confirmButtonColor: COLOR_MORADO,
        cancelButtonColor: "#6b6180",
        reverseButtons: true,
    });

    return resultado.isConfirmed === true;
};

/*
 * Reporta un fallo. Registra el detalle técnico en consola para depurar y
 * además se lo dice al usuario, que es justo lo que faltaba en la mayoría de
 * los catch del proyecto.
 */
export const avisarError = (mensaje, error) => {
    if (error) console.error(mensaje, error);

    return Swal.fire({
        icon: "error",
        title: "Algo salió mal",
        text: mensaje,
        confirmButtonColor: COLOR_MORADO,
    });
};

/* Confirmación breve de que algo sí ocurrió. */
export const avisarExito = (mensaje) => Swal.fire({
    icon: "success",
    title: mensaje,
    timer: 1700,
    showConfirmButton: false,
});
