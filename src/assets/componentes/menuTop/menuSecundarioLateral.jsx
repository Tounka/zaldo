import styled from "styled-components";
import {
  FaWallet,
  FaSignOutAlt,
  FaMoneyBillWave,
  FaHandHoldingUsd,
  FaPiggyBank,
  FaWarehouse,
  FaBriefcase,
  FaUserCircle,
  FaCreditCard,
  FaHome,
  FaUserShield,
} from "react-icons/fa";
import { motion as Motion } from "framer-motion";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { signOut } from "firebase/auth";
import { auth } from "../../funciones/firebase/dbFirebase";
import { useLocation, useNavigate } from "react-router-dom";

import { useEffect, useCallback } from "react";

/*
 * Menú lateral con entrada escalonada (inspirado en StaggeredMenu de React
 * Bits): dos capas de color entran una tras otra, después el panel y al final
 * los renglones suben girando, cada uno con su número. Está hecho con
 * framer-motion, que la app ya usa, en lugar de sumar gsap solo para esto.
 * Se anima siempre, aunque el sistema pida reducir movimiento.
 *
 * Instituciones y movimientos entre cuentas ya no viven aquí: se abren desde
 * el paso "Selecciona una cuenta" del modal de movimiento.
 */

const ANCHO_PANEL = "min(340px, 88dvw)";
const COLORES_CAPAS = ["#b494f1", "#533b8f"];
const ESCALON_CAPAS = 0.07;
const INICIO_PANEL = (COLORES_CAPAS.length - 1) * ESCALON_CAPAS + 0.08;
const DURACION_PANEL = 0.65;
const DURACION_CIERRE = 0.32;
const SALIDA = [0.55, 0, 1, 0.45];
const ENTRADA = [0.16, 1, 0.3, 1];

const OverlayContenedorMenuSecundario = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: ${({ $isOpen }) => ($isOpen ? "auto" : "none")};
    visibility: ${({ $isOpen }) => ($isOpen ? "visible" : "hidden")};
    /* Al cerrar, espera a que el panel salga antes de ocultarse. */
    transition: visibility 0s linear ${({ $isOpen }) => ($isOpen ? "0s" : `${DURACION_CIERRE}s`)};
`;

const Fondo = styled(Motion.div)`
    position: absolute;
    inset: 0;
    background: rgba(20, 12, 35, .62);
    backdrop-filter: blur(2px);
`;

const CapaColor = styled(Motion.div)`
    position: absolute;
    top: 0;
    right: 0;
    height: 100dvh;
    width: ${ANCHO_PANEL};
    background: ${({ $color }) => $color};
`;

export const ContenedorMenuSecundario = styled(Motion.nav)`
    color: #f9f6ff;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: ${ANCHO_PANEL};
    min-width: 0;
    background: linear-gradient(180deg, #25183f 0%, #342253 58%, #211632 100%);
    border-left: 1px solid rgba(255, 255, 255, .16);
    box-shadow: -16px 0 40px rgba(19, 10, 37, .28);
    position: absolute;
    right: 0;
    top: 0;
    overflow: hidden;
    box-sizing: border-box;
`;

const HeaderMenuSecundario = styled.div`
    height: var(--alturaTopMenu);
    display: flex;
    align-items: center;
    padding: 0 22px;
    padding-right: 88px;
    flex-shrink: 0;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    @media (max-width: 400px) {
      height: var(--alturaTopMenuTelefono);
      padding: 0 16px;
      padding-right: 72px;
    }
`;

const TituloMenuSecundario = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #b494f1;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    user-select: none;
`;

const ContenidoScrollMenu = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    padding: 18px 18px 22px;
    box-sizing: border-box;
    &::-webkit-scrollbar { display: none; }
`;

const ListaMenu = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    counter-reset: itemMenu;
`;

/* Recorta el renglón mientras sube girando desde abajo. */
const RenglonMenu = styled.li`
    position: relative;
    overflow: hidden;
    counter-increment: itemMenu;
`;

const BtnMenuStyled = styled.button`
    position: relative;
    width: 100%;
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 44px 6px 10px;
    border: 0;
    border-radius: 12px;
    background: ${({ $active }) => ($active ? "rgba(180, 148, 241, .18)" : "transparent")};
    color: ${({ $active }) => ($active ? "#ffffff" : "rgba(249, 246, 255, .86)")};
    font: inherit;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-align: left;
    cursor: pointer;
    transition: background-color .2s ease, color .2s ease;

    svg {
      font-size: 17px;
      flex-shrink: 0;
      color: ${({ $active }) => ($active ? "#d9c8ff" : "#b494f1")};
    }

    /* Numeración 01, 02... como en StaggeredMenu. */
    &::after {
      content: counter(itemMenu, decimal-leading-zero);
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      color: #b494f1;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0;
    }

    &:hover {
      background: rgba(255, 255, 255, .08);
      color: #ffffff;
    }

    &:focus-visible {
      outline: 2px solid #b494f1;
      outline-offset: -2px;
    }

    @media (max-width: 400px) {
      font-size: 18px;
    }
`;

const EtiquetaMenu = styled(Motion.span)`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    transform-origin: 50% 100%;
`;

const PieMenu = styled(Motion.div)`
    margin-top: auto;
    padding-top: 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const TituloPie = styled.span`
    color: #b494f1;
    font-size: 12px;
    font-weight: 600;
`;

const BtnSalir = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    padding: 8px 14px;
    border: 1px solid rgba(224, 211, 255, .28);
    border-radius: 999px;
    background: transparent;
    color: #f9f6ff;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color .2s ease, border-color .2s ease;

    &:hover {
      background: rgba(255, 255, 255, .08);
      border-color: #d3c2f4;
    }

    &:focus-visible {
      outline: 2px solid #b494f1;
      outline-offset: 2px;
    }
`;

/* ── Variantes ── */

const variantesFondo = {
  abierto: { opacity: 1, transition: { duration: 0.25 } },
  cerrado: { opacity: 0, transition: { duration: DURACION_CIERRE } },
};

const variantesCapa = {
  abierto: (indice) => ({
    x: "0%",
    transition: { duration: 0.5, ease: ENTRADA, delay: indice * ESCALON_CAPAS },
  }),
  cerrado: { x: "100%", transition: { duration: DURACION_CIERRE, ease: SALIDA } },
};

const variantesPanel = {
  abierto: {
    x: "0%",
    transition: {
      duration: DURACION_PANEL,
      ease: ENTRADA,
      delay: INICIO_PANEL,
      // Los renglones arrancan cuando el panel lleva el 15 % de su entrada.
      delayChildren: INICIO_PANEL + DURACION_PANEL * 0.15,
      staggerChildren: 0.08,
    },
  },
  cerrado: { x: "100%", transition: { duration: DURACION_CIERRE, ease: SALIDA } },
};

/* Al cerrar no se animan: se reinician en cuanto el panel terminó de salir. */
const variantesRenglon = {
  abierto: { y: "0%", rotate: 0, opacity: 1, transition: { duration: 0.9, ease: ENTRADA } },
  cerrado: { y: "140%", rotate: 10, opacity: 1, transition: { duration: 0, delay: DURACION_CIERRE } },
};

const variantesPie = {
  abierto: { y: 0, opacity: 1, transition: { duration: 0.55, ease: ENTRADA } },
  cerrado: { y: 25, opacity: 0, transition: { duration: 0, delay: DURACION_CIERRE } },
};

const BtnMenu = ({ handleClick = () => { }, txt = "NuevoBtn", icono: Icono, active = false, variantes }) => (
  <RenglonMenu>
    <BtnMenuStyled type="button" onClick={handleClick} $active={active} aria-current={active ? "page" : undefined}>
      <EtiquetaMenu variants={variantes}>
        {Icono && <Icono aria-hidden="true" />}
        {txt}
      </EtiquetaMenu>
    </BtnMenuStyled>
  </RenglonMenu>
);

export const MenuSecundario = ({ isOpen, setIsOpenMenuLateral }) => {
  const { setUsuario, usuario } = useAppStore();
  const { setIsOpenAgregarCuenta } = useModalStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCerrarModal = useCallback(() => {
    setIsOpenMenuLateral(false);
  }, [setIsOpenMenuLateral]);

  useEffect(() => {
    if (!isOpen) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCerrarModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleCerrarModal]);

  const handleCerrarSesion = async () => {
    await signOut(auth);
    setUsuario(null);
    window.location.reload();
  };

  const ir = (ruta) => {
    handleCerrarModal();
    navigate(ruta);
  };

  const abrirModalDesdeMenu = (abrirModal) => {
    handleCerrarModal();
    abrirModal(true);
  };

  const estado = isOpen ? "abierto" : "cerrado";
  const variantesItem = variantesRenglon;

  const opciones = [
    { txt: "Inicio", icono: FaHome, ruta: "/home" },
    { txt: "Ingresos", icono: FaBriefcase, ruta: "/ingresos" },
    { txt: "Movimientos", icono: FaMoneyBillWave, ruta: "/movimientos" },
    { txt: "Mis tarjetas", icono: FaCreditCard, ruta: "/cuentas" },
    { txt: "Préstamos", icono: FaHandHoldingUsd, ruta: "/prestamos", activa: ["/prestamos", "/cobranza"].includes(location.pathname) },
    { txt: "Ahorros", icono: FaPiggyBank, ruta: "/ahorros", activa: location.pathname.startsWith("/ahorros") },
    { txt: "Despensa", icono: FaWarehouse, ruta: "/despensa" },
    { txt: "Mi perfil", icono: FaUserCircle, ruta: "/perfil" },
    // Solo con el claim de super admin (usuario.js); la página también lo valida.
    ...(usuario?.superadmin === true ? [{ txt: "Super admin", icono: FaUserShield, ruta: "/superadmin" }] : []),
  ];

  return (
    <OverlayContenedorMenuSecundario
      $isOpen={isOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
      aria-hidden={!isOpen}
    >
      <Fondo
        initial={false}
        animate={estado}
        variants={variantesFondo}
        onClick={handleCerrarModal}
      />

      {COLORES_CAPAS.map((color, indice) => (
        <CapaColor
          key={color}
          aria-hidden="true"
          $color={color}
          custom={indice}
          initial={false}
          animate={estado}
          variants={variantesCapa}
        />
      ))}

      <ContenedorMenuSecundario
        initial={false}
        animate={estado}
        variants={variantesPanel}
        aria-label="Secciones"
      >
        <HeaderMenuSecundario>
          <TituloMenuSecundario>Menú</TituloMenuSecundario>
        </HeaderMenuSecundario>
        <ContenidoScrollMenu>
          <ListaMenu>
            {opciones.map((opcion) => (
              <BtnMenu
                key={opcion.ruta}
                txt={opcion.txt}
                icono={opcion.icono}
                handleClick={() => ir(opcion.ruta)}
                active={opcion.activa ?? location.pathname === opcion.ruta}
                variantes={variantesItem}
              />
            ))}
            <BtnMenu
              txt="Agregar cuenta"
              icono={FaWallet}
              handleClick={() => abrirModalDesdeMenu(setIsOpenAgregarCuenta)}
              variantes={variantesItem}
            />
          </ListaMenu>

          <PieMenu variants={variantesPie}>
            <TituloPie>Sesión</TituloPie>
            <BtnSalir type="button" onClick={handleCerrarSesion}>
              <FaSignOutAlt aria-hidden="true" /> Salir
            </BtnSalir>
          </PieMenu>
        </ContenidoScrollMenu>
      </ContenedorMenuSecundario>
    </OverlayContenedorMenuSecundario>
  );
};
