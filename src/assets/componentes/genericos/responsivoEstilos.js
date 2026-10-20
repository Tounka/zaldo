import { css } from "styled-components";

/* Corte entre celular y escritorio para las piezas de responsivo.jsx. */
export const BREAKPOINT_MOVIL = 680;
export const MEDIA_MOVIL = `@media (max-width: ${BREAKPOINT_MOVIL}px)`;
export const MEDIA_ESCRITORIO = `@media (min-width: ${BREAKPOINT_MOVIL + 1}px)`;

/* Para colgarlo de cualquier styled component: ${ocultarEnMovil} */
export const ocultarEnMovil = css`
  ${MEDIA_MOVIL} {
    display: none !important;
  }
`;
