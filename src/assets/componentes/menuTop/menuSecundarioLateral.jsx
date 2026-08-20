import styled from "styled-components"
import { BtnGenerico } from "../genericos/inputs";
import {
  FaUniversity,
  FaWallet,
  FaSignOutAlt,
  FaMoneyBillWave,
  FaHandHoldingUsd,
  FaPiggyBank,
  FaWarehouse,
  FaCalendarCheck,
  FaBriefcase,
  FaUserCircle,
  FaExchangeAlt,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { signOut } from "firebase/auth";
import { auth } from "../../funciones/firebase/dbFirebase";
import { useLocation, useNavigate } from "react-router-dom";

const OverlayContenedorMenuSecundario = styled.div`
    display: flex;
    flex-direction: column;
    height: ${props => props.isOpen ? "100%" : "0"};
    width: ${props => props.isOpen ? "100%" : "0"};
     background: rgba(20, 12, 35, 0.76);
    z-index: 9999;
    position: fixed;
    right: 0;
    top: 0;

    transition: width .2s ease-in-out;
`
export const ContenedorMenuSecundario = styled.div`
    color: #f9f6ff;
    display: flex;
    flex-direction: column;
    height: ${props => props.isOpen ? "100%" : "0"};
    width: ${props => props.isOpen ? "20%" : "0"};
    min-width: ${props => props.isOpen ? "200px" : "0"};
    overflow: hidden;
    background: linear-gradient(180deg, #25183f 0%, #342253 58%, #211632 100%);
    border-left: 1px solid rgba(255, 255, 255, .16);
    box-shadow: -16px 0 40px rgba(19, 10, 37, .28);
    position: fixed;
    right: 0;
    top: 0;
    

    gap: 8px;
    overflow-y: auto;
    padding-bottom: 14px;
    box-sizing: border-box;
    transition: height .2s ease-in,width .2s ease-in-out, min-width .2s ease-in-out;
    padding-top: calc(var(--alturaTopMenu)  );
    padding-left: 10px;
    padding-right: 10px;
    @media (max-width: 400px) {
      padding-top: calc(var(--alturaTopMenuTelefono)  );


    }
`;

const BtnMenuStyled = styled(BtnGenerico)`
  flex-shrink: 0;
  font-size: 12px;
  margin: 0;
  width: auto;
  min-height: 44px;
  height: 44px;
  background-color: ${({ $active }) => $active ? "#7655a8" : "rgba(255, 255, 255, .075)"};
  color: #fff;
  border: 1px solid ${({ $active }) => $active ? "#b99be9" : "rgba(224, 211, 255, .25)"};
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  z-index: 10000;
  text-align: left;
  &:hover {
    background-color: #8b69c3;
    border-color: #d3c2f4;
    transform: translateX(-2px);
    transition: background-color 0.1s ease-in, border-color 0.1s ease-in, transform 0.1s ease-in;
  }

  svg {
    font-size: 16px;
    flex-shrink: 0;
  }
`;

const BtnMenu = ({ handleClick = () => { }, txt = "NuevoBtn", icono: Icono, active = false }) => {
  return (
    <BtnMenuStyled onClick={handleClick} $active={active} aria-current={active ? "page" : undefined}>
      {Icono && <Icono />}
      {txt}
    </BtnMenuStyled>
  );
};

export const MenuSecundario = ({ isOpen, setIsOpenMenuLateral }) => {
  const { setUsuario } = useAppStore();
  const { setIsOpenInstituciones, setIsOpenAgregarCuenta, setIsOpenMovimientoEntreCuentas } = useModalStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCerrarModal = () => {
    setIsOpenMenuLateral(false);
  };
  const handleCerrarSesion = async () => {
    await signOut(auth);
    setUsuario(null);
    window.location.reload();
  };
  const handleClickIngresos = () => {
    handleCerrarModal();
    navigate("/ingresos");
  };
  const handleClickMovimientos = async () => {
    handleCerrarModal();
    navigate("/movimientos");
  };
  const handleClickCobranza = () => {
    handleCerrarModal();
    navigate("/cobranza");
  };
  const handleClickPrestamos = () => {
    handleCerrarModal();
    navigate("/prestamos");
  };

  const handleClickAhorros = () => {
    handleCerrarModal();
    navigate("/ahorros");
  };

  const handleClickDespensa = () => {
    handleCerrarModal();
    navigate("/despensa");
  };

  const handleClickPerfil = () => {
    handleCerrarModal();
    navigate("/perfil");
  };

  const abrirModalDesdeMenu = (abrirModal) => {
    handleCerrarModal();
    abrirModal(true);
  };

  return (
    <OverlayContenedorMenuSecundario onClick={() => handleCerrarModal()} isOpen={isOpen}>
      <ContenedorMenuSecundario isOpen={isOpen} onClick={(e) => e.stopPropagation()} >
        <BtnMenu txt="Ingresos" icono={FaBriefcase} handleClick={handleClickIngresos} active={location.pathname === "/ingresos"} />
        <BtnMenu txt="Cobranza" icono={FaCalendarCheck} handleClick={handleClickCobranza} active={location.pathname === "/cobranza"} />
        <BtnMenu txt="Préstamos" icono={FaHandHoldingUsd} handleClick={handleClickPrestamos} active={location.pathname === "/prestamos"} />
        <BtnMenu txt="Instituciones" icono={FaUniversity} handleClick={() => abrirModalDesdeMenu(setIsOpenInstituciones)} />
        <BtnMenu txt="Agregar Cuenta" icono={FaWallet} handleClick={() => abrirModalDesdeMenu(setIsOpenAgregarCuenta)} />
        <BtnMenu txt="Movimientos" icono={FaMoneyBillWave} handleClick={() => handleClickMovimientos()} active={location.pathname === "/movimientos"} />
        <BtnMenu txt="Movimiento Entre Cuentas" icono={FaExchangeAlt} handleClick={() => abrirModalDesdeMenu(setIsOpenMovimientoEntreCuentas)} />
        <BtnMenu txt="Ahorros" icono={FaPiggyBank} handleClick={handleClickAhorros} active={location.pathname === "/ahorros"} />
        <BtnMenu txt="Despensa" icono={FaWarehouse} handleClick={handleClickDespensa} active={location.pathname === "/despensa"} />
        <BtnMenu txt="Mi perfil" icono={FaUserCircle} handleClick={handleClickPerfil} active={location.pathname === "/perfil"} />
        <BtnMenu txt="Salir" icono={FaSignOutAlt} handleClick={() => handleCerrarSesion()} />
      </ContenedorMenuSecundario>
    </OverlayContenedorMenuSecundario>
  );
};
