import styled from "styled-components";
import { IoClose } from "react-icons/io5";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import modalMetalPins from "../../imagenes/banners/modal-metal-pins.png";


export const ContenedorFormularioGenerico = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  box-sizing: border-box;
  gap: 12px;
`;

const TONOS_BANNER = {
  primary: "linear-gradient(135deg, #31205f 0%, #533b8f 58%, #8065bf 100%)",
  blue: "linear-gradient(135deg, #164e63 0%, #0e7490 58%, #0891b2 100%)",
  green: "linear-gradient(135deg, #064e3b 0%, #047857 58%, #10b981 100%)",
  amber: "linear-gradient(135deg, #78350f 0%, #b45309 58%, #d97706 100%)",
};

export const ModalBanner = styled.header`
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  width: ${({ $bleed = 20 }) => `calc(100% + ${$bleed * 2}px)`};
  margin-top: 0;
  margin-left: ${({ $bleed = 20 }) => `-${$bleed}px`};
  margin-right: ${({ $bleed = 20 }) => `-${$bleed}px`};
  padding: 20px 52px 18px 20px;
  box-sizing: border-box;
  overflow: hidden;
  isolation: isolate;
  border-radius: 12px 12px 0 0;
  background-image: ${({ $tone = "primary" }) => TONOS_BANNER[$tone] || TONOS_BANNER.primary}, url(${modalMetalPins});
  background-position: center;
  background-size: cover;
  background-blend-mode: soft-light;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(38, 25, 70, 0.18);

  &::before {
    content: "";
    position: absolute;
    z-index: -1;
    width: 210px;
    height: 210px;
    right: -82px;
    top: -116px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    box-shadow: 0 0 0 20px rgba(255, 255, 255, 0.05), 0 0 0 42px rgba(255, 255, 255, 0.035);
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    z-index: -1;
    width: 90px;
    height: 90px;
    left: 38%;
    bottom: -64px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    pointer-events: none;
  }

  @media (max-width: 520px) {
    gap: 9px;
    padding: 17px 46px 15px 14px;
  }
`;

export const ModalBannerIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 21px;
  box-shadow: 0 6px 14px rgba(30, 27, 75, 0.16);
`;

export const ModalBannerContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
`;

export const ModalBannerTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: clamp(19px, 3vw, 23px);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
`;

export const ModalBannerText = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  line-height: 1.4;
`;

export const ModalBannerBadge = styled.span`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`;

export const ModalBannerAside = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  margin-left: auto;

  @media (max-width: 680px) {
    width: 100%;
    margin-left: 0;
  }
`;

export const ModalEncabezado = ({
  icon,
  title,
  description,
  badge,
  tone = "primary",
  bleed = 20,
  children,
}) => (
  <ModalBanner $tone={tone} $bleed={bleed}>
    {icon && <ModalBannerIcon aria-hidden="true">{icon}</ModalBannerIcon>}
    <ModalBannerContent>
      <ModalBannerTitle>{title}</ModalBannerTitle>
      {description && <ModalBannerText>{description}</ModalBannerText>}
    </ModalBannerContent>
    {badge !== undefined && badge !== null && (
      <ModalBannerBadge>{badge}</ModalBannerBadge>
    )}
    {children}
  </ModalBanner>
);

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
  z-index: 11000;
  overscroll-behavior: contain;

  @media (max-width: 450px) {
    padding-top: 20px;
    align-items: start;
  } 
`;

const ModalContainer = styled.div`
  background: white;
  width: ${({ $wide }) => ($wide ? "min(960px, 96vw)" : "min(550px, 95vw)")};
  max-width: 96vw;
  max-height: calc(100vh - 32px);
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  border-radius: 12px;
  position: relative;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 11001;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

/*
 * Los formularios antiguos definian anchos propios (470/500/520 px) dentro
 * del modal de 550 px. Eso dejaba una franja blanca a la derecha y colocaba
 * visualmente la X fuera del encabezado. Este envoltorio hace que cada vista
 * ocupe el ancho real del contenedor; sus paddings internos siguen controlando
 * el espacio de los campos.
 */
const ModalContent = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  /*
   * El selector && duplica la especificidad del shell. Los modales antiguos todavía
   * traen reglas como width: 470px/500px/520px; el contenedor común debe
   * ganarles siempre para que el encabezado y la X compartan exactamente el
   * mismo borde lateral.
   */
  && > * {
    width: 100%;
    max-width: none;
    min-width: 0;
    box-sizing: border-box;
  }

  /* Formik suele insertar un <form> entre el modal y el contenedor visual. */
  && > form {
    width: 100%;
    max-width: none;
    min-width: 0;
    box-sizing: border-box;
    margin: 0;
  }

  && > form > * {
    width: 100%;
    max-width: none;
    min-width: 0;
    box-sizing: border-box;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  z-index: 5;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(48, 36, 74, 0.12);
  border-radius: 8px;
  font-size: 22px;
  cursor: pointer;
  color: #30244a;
  box-shadow: 0 2px 8px rgba(30, 27, 75, 0.12);
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: #ffffff;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

export const ModalGenerico = ({ isOpen, onClose, children, wide = false }) => {
  /*
   * Escape cierra y el fondo deja de hacer scroll mientras el modal está
   * abierto. Sin esto, en el celular la página de atrás se mueve al capturar.
   */
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;

    const alPresionarTecla = (evento) => {
      if (evento.key === "Escape") onClose?.();
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener("keydown", alPresionarTecla);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal((
    <Overlay isOpen={isOpen} onClick={onClose}>
      <ModalContainer $wide={wide} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <CloseButton type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
          <IoClose />
        </CloseButton>
        <ModalContent>{children}</ModalContent>
      </ModalContainer>
    </Overlay>
  ), document.body);
};
