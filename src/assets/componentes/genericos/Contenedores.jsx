import styled from "styled-components";

export const ContenedorCentradoGenerico = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center; 
    background-color: ${({ bgColor }) => bgColor || 'transparent'};
    
`;