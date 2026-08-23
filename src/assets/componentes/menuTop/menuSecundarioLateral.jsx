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
  FaBriefcase,
  FaUserCircle,
  FaExchangeAlt,
  FaCreditCard,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { signOut } from "firebase/auth";
import { auth } from "../../funciones/firebase/dbFirebase";
import { useLocation, useNavigate } from "react-router-dom";

const OverlayContenedorMenuSecundario = styled.div`
    display: flex;
    flex-direction: column;
    inset: 0;
    height: 100dvh;
    width: 100dvw;
    background: rgba(20, 12, 35, ${({ isOpen }) => isOpen ? ".76" : "0"});
    z-index: 9999;
    position: fixed;
    pointer-events: ${({ isOpen }) => isOpen ? "auto" : "none"};
    visibility: ${({ isOpen }) => isOpen ? "visible" : "hidden"};
    transition: background .2s ease, visibility .2s ease;
`
export const ContenedorMenuSecundario = styled.div`
    color: #f9f6ff;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: min(320px, 86dvw);
    min-width: 0;
    background: linear-gradient(180deg, #25183f 0%, #342253 58%, #211632 100%);
    border-left: 1px solid rgba(255, 255, 255, .16);
    box-shadow: -16px 0 40px rgba(19, 10, 37, .28);
    position: fixed;
    right: 0;
    top: 0;
    gap: 8px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    padding-bottom: 14px;
    box-sizing: border-box;
    transform: translateX(${({ isOpen }) => isOpen ? "0" : "105%"});
    transition: transform .22s ease-in-out;
    padding-top: calc(var(--alturaTopMenu)  );
    padding-left: 10px;
    padding-right: 10px;
    &::-webkit-scrollbar { display: none; }
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

  const handleClickTarjetas = () => {
    handleCerrarModal();
    navigate("/cuentas");
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
        <BtnMenu txt="Préstamos" icono={FaHandHoldingUsd} handleClick={handleClickPrestamos} active={["/prestamos", "/cobranza"].includes(location.pathname)} />
        <BtnMenu txt="Instituciones" icono={FaUniversity} handleClick={() => abrirModalDesdeMenu(setIsOpenInstituciones)} />
        <BtnMenu txt="Agregar Cuenta" icono={FaWallet} handleClick={() => abrirModalDesdeMenu(setIsOpenAgregarCuenta)} />
        <BtnMenu txt="Mis Tarjetas" icono={FaCreditCard} handleClick={handleClickTarjetas} active={location.pathname === "/cuentas"} />
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
