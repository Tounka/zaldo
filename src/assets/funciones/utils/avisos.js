import Swal from "sweetalert2";
import { sonar } from "../sonidos";
import { rutaTopo } from "../../componentes/topo/topoAssets";

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

/*
 * El topo acompaña los avisos grandes: preocupado en los errores, contento en
 * los éxitos y celebrando cuando entra una compra.
 */
const TOPO_POR_SONIDO = {
    compra: "celebrando",
};

const conTopo = (estado) => ({
    imageUrl: rutaTopo(estado, 256),
    imageWidth: 120,
    imageHeight: 120,
    imageAlt: "",
});

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
    sonar("error");

    return Swal.fire({
        ...conTopo("preocupado"),
        title: "Algo salió mal",
        text: mensaje,
        confirmButtonColor: COLOR_MORADO,
    });
};

/*
 * Toast que no bloquea: para acciones de un toque que se repiten seguido.
 * Con `deshacer`, el toast dura más y ofrece revertir la acción: un toque por
 * error ya no obliga a ir a corregirlo a otra pantalla.
 */
export const avisarBreve = (mensaje, { sonido = "exito", deshacer } = {}) => {
    sonar(sonido);
    return Swal.fire({
        toast: true,
        position: "bottom",
        icon: "success",
        title: mensaje,
        timer: deshacer ? 4500 : 1600,
        timerProgressBar: Boolean(deshacer),
        showConfirmButton: Boolean(deshacer),
        confirmButtonText: "Deshacer",
        confirmButtonColor: COLOR_MORADO,
    }).then((resultado) => {
        if (deshacer && resultado.isConfirmed) {
            sonar("deshacer");
            deshacer();
        }
        return resultado;
    });
};

/* Confirmación breve de que algo sí ocurrió. `sonido` elige el momento que suena. */
export const avisarExito = (mensaje, { sonido = "exito" } = {}) => {
    sonar(sonido);
    return Swal.fire({
        ...conTopo(TOPO_POR_SONIDO[sonido] || "feliz"),
        title: mensaje,
        timer: 1700,
        showConfirmButton: false,
    });
};
