import styled from "styled-components"
import { BtnGenerico } from "../genericos/inputs";
import { FaUniversity, FaWallet, FaSignOutAlt } from "react-icons/fa";
import { useContextoGeneral } from "../../contextos/general";

const OverlayContenedorMenuSecundario = styled.div`
    display: flex;
    flex-direction: column;
    height: ${props => props.isOpen ? "100%" : "0"};
    width: ${props => props.isOpen ? "100%" : "0"};
     background: rgba(0, 0, 0, 0.6);
    z-index: 9999;
    position: fixed;
    right: 0;
    top: 0;

    transition: height .2s ease-in-out,width .2s ease-in-out;
`
export const ContenedorMenuSecundario = styled.div`
    color: var(--colorMoradoFondo);
    display: flex;
    flex-direction: column;
    height: ${props => props.isOpen ? "100%" : "0"};
    width: ${props => props.isOpen ? "20%" : "0"};
    min-width: ${props => props.isOpen ? "200px" : "0"};
    overflow: hidden;
    background-color:  var(--colorMoradoSecundario);
    position: fixed;
    right: 0;
    top: 0;
    

    gap: 10px;
    transition: height .2s ease-in-out,width .2s ease-in-out;
    padding-top: calc(var(--alturaTopMenu)  );
`;

const BtnMenuStyled = styled(BtnGenerico)`
  font-size: var(--fontSm);
  margin: 0 10px;
  width: auto;
  height: 60px;
  background-color: transparent;
  color: var(--colorBlanco);
  border: 2px solid var(--colorMorado);
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  z-index: 10000;
  text-align: left;
  &:hover {
    background-color: var(--colorMorado);
    transition: background-color 0.1s ease-in;
  }

  svg {
    font-size: 20px;
  }
`;

const BtnMenu = ({ handleClick = () => console.log("click"), txt = "NuevoBtn", icono: Icono }) => {
  return (
    <BtnMenuStyled onClick={handleClick}>
      {Icono && <Icono />}
      {txt}
    </BtnMenuStyled>
  );
};

export const MenuSecundario = ({ isOpen }) => {
  const { setIsOpenAgregarInstituciones, setIsOpenAgregarCuenta } = useContextoGeneral();

  return (
    <OverlayContenedorMenuSecundario isOpen={isOpen}>

      <ContenedorMenuSecundario isOpen={isOpen}  >
        <BtnMenu txt="Agregar Instituciones" icono={FaUniversity} handleClick={() => setIsOpenAgregarInstituciones(true)} />
        <BtnMenu txt="Agregar Cuenta" icono={FaWallet} handleClick={() => setIsOpenAgregarCuenta(true)} />
        <BtnMenu txt="Salir" icono={FaSignOutAlt} />
      </ContenedorMenuSecundario>
    </OverlayContenedorMenuSecundario>
  );
};