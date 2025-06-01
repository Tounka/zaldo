import styled from "styled-components";

export const Contenedor100vdh = styled.div`
    width: 100dvw;
    height: 100dvh;
    display: flex;
    justify-content: center;
    align-items: center;
`
export const Contenedor100 = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: ${props => props.top ? "start" : "center"} ;
    flex-direction: ${({direction}) => direction || "row"} ;
    gap: ${({gap}) => gap || "0"} ;
    align-items:  center;
    overflow-x: hidden;
`

export const LayoutApp = styled(Contenedor100vdh)`
    margin-left: ${props => props.user ? "var(--anchoMenuLateral)" : "0"};
    width: ${props => props.user ? "calc(100dvw - var(--anchoMenuLateral))" : "100%"};
    transition: margin-left .3s ease;
`

