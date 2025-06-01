import styled from "styled-components";
import React from "react";
const TxtSinEtiquetasStyled = styled.div`
    font-size: 32px;
    font-weight: bold;
    color: white;
    text-align: center;
`

export const TxtSinEtiquetas = ({ txt }) => {
    return (
        <TxtSinEtiquetasStyled>
            {txt}
        </TxtSinEtiquetasStyled>
    )
}

export const H2 = styled.h2`
    color: ${props => props.color ? props.color : " var(--colorBlanco)"} ;;
    margin: 0;
    font-size: ${props => props.size ? props.size : "16px"} ;
    font-weight: ${props => props.weight ? props.weight : "bold"} ;
    line-height: ${props => props.line ? props.line : ""} ;
    text-align: ${props => props.align ? props.align : ""} ;
`
export const TxtGenerico = styled.p`
    color: ${props => props.color ? props.color : " var(--colorBlanco)"} ;;
    margin: 0;
    font-size: ${props => props.size ? props.size : "16px"} ;
    font-weight: ${props => props.weight ? props.weight : "bold"} ;
    line-height: ${props => props.line ? props.line : ""} ;
    text-align: ${props => props.align ? props.align : ""} ;
`