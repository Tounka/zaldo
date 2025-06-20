import styled from "styled-components";
import { IoClose } from "react-icons/io5";


export const ContenedorFormularioGenerico = styled.div`
    width: 500px;
    max-width: 100%;

    height: auto;
  
    max-height: auto;
    display: grid;
    grid-template-rows: auto 1fr 60px;
    padding: 0 20px 20px 20px;
    align-items: center;
    gap:10px;
`
export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  overflow-y: auto;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: ${({ isOpen }) => (isOpen ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  z-index: 10000;

  @media (max-width: 450px) {
    padding-top: 20px;
    align-items: start;
  } 
`;

const ModalContainer = styled.div`
  background: white;
  width: auto;
  max-width: 95%;
  max-height: 95%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 40px 0px 0px 0px;
  border-radius: 12px;
  position: relative;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 10001;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #333;

  &:hover {
    color: red;
  }
`;

export const ModalGenerico = ({ isOpen, onClose, children }) => {
  return (
    <Overlay isOpen={isOpen} onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <IoClose />
        </CloseButton>
        {children}
      </ModalContainer>
    </Overlay>
  );
};
