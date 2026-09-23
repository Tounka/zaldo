import styled from "styled-components";
import { IoArrowBack, IoClose } from "react-icons/io5";
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

  > header {
    width: calc(100% + 40px);
    margin-left: -20px;
    margin-right: -20px;
    border-radius: 12px 12px 0 0;
  }

  @media (max-width: 520px) {
    padding: 0 14px 16px;

    > header {
      width: calc(100% + 28px);
      margin-left: -14px;
      margin-right: -14px;
    }
  }
`;

/*
 * Rejilla compartida para formularios compactos. En escritorio reúne campos
 * breves y relacionados; en móvil vuelve a una sola columna para conservar
 * el ancho táctil y el espacio de los mensajes de validación.
 */
export const RejillaCamposModal = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(${({ $columnas = 2 }) => $columnas}, minmax(0, 1fr));
  gap: ${({ $gap = 12 }) => `${$gap}px`};
  align-items: start;

  > * {
    min-width: 0;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const CampoModalCompleto = styled.div`
  min-width: 0;
  grid-column: 1 / -1;
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
  width: ${({ $bleed = 0 }) => ($bleed ? `calc(100% + ${$bleed * 2}px)` : "100%")};
  margin-top: 0;
  margin-left: ${({ $bleed = 0 }) => ($bleed ? `-${$bleed}px` : "0")};
  margin-right: ${({ $bleed = 0 }) => ($bleed ? `-${$bleed}px` : "0")};
  padding: 18px 56px 16px 18px;
  box-sizing: border-box;
  overflow: hidden;
  isolation: isolate;
  flex-shrink: 0;
  border-radius: 16px 16px 0 0;
  background-image: ${({ $tone = "primary" }) => TONOS_BANNER[$tone] || TONOS_BANNER.primary}, url(${modalMetalPins});
  background-position: center;
  background-size: cover;
  background-blend-mode: soft-light;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(38, 25, 70, 0.14);

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

  @media (max-width: 640px) {
    gap: 9px;
    padding: 16px 52px 14px 14px;
    border-radius: 20px 20px 0 0;
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

export const ModalBannerBackButton = styled.button`
  position: relative;
  z-index: 1;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }

  svg {
    font-size: 13px;
  }

  .texto-desktop {
    display: inline;
  }

  .texto-movil {
    display: none;
  }

  @media (max-width: 520px) {
    ${({ $hasBadge }) =>
      $hasBadge
        ? `
      width: auto;
      padding: 0 8px;

      .texto-desktop {
        display: none;
      }

      .texto-movil {
        display: inline;
      }
    `
        : `
      width: 30px;
      padding: 0;

      span {
        display: none;
      }
    `}
  }
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
  icono,
  title,
  titulo,
  description,
  subtitulo,
  badge,
  onBack,
  onRegresar,
  backLabel = "Regresar",
  tone = "primary",
  tono,
  bleed = 0,
  children,
}) => {
  const finalTitle = title || titulo;
  const finalDescription = description || subtitulo;
  const finalIcon = icon || icono;
  const finalOnBack = onBack || onRegresar;
  const finalTone = tone || tono || "primary";
  const tieneBadge = badge !== undefined && badge !== null;

  return (
    <ModalBanner $tone={finalTone} $bleed={bleed}>
      {finalIcon && <ModalBannerIcon aria-hidden="true">{finalIcon}</ModalBannerIcon>}
      <ModalBannerContent>
        {finalTitle && <ModalBannerTitle>{finalTitle}</ModalBannerTitle>}
        {finalDescription && <ModalBannerText>{finalDescription}</ModalBannerText>}
      </ModalBannerContent>
      {tieneBadge && finalOnBack ? (
        <ModalBannerBackButton
          type="button"
          onClick={finalOnBack}
          aria-label={`${badge} · ${backLabel}`}
          title={`${badge} · ${backLabel}`}
          $hasBadge
        >
          <IoArrowBack aria-hidden="true" />
          <span className="texto-desktop">{badge} · {backLabel}</span>
          <span className="texto-movil">{badge}</span>
        </ModalBannerBackButton>
      ) : (
        <>
          {tieneBadge && (
            <ModalBannerBadge>{badge}</ModalBannerBadge>
          )}
          {finalOnBack && (
            <ModalBannerBackButton
              type="button"
              onClick={finalOnBack}
              aria-label={backLabel}
              title={backLabel}
            >
              <IoArrowBack aria-hidden="true" />
              <span>{backLabel}</span>
            </ModalBannerBackButton>
          )}
        </>
      )}
      {children}
    </ModalBanner>
  );
};

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  height: 100dvh;
  background: rgba(15, 10, 30, 0.65);
  backdrop-filter: blur(2px);
  display: ${({ isOpen }) => (isOpen ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  z-index: 11000;
  overscroll-behavior: contain;
  padding: 20px;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 0;
    align-items: flex-end;
  }
`;

const ModalContainer = styled.div`
  background: white;
  width: ${({ $wide }) => ($wide ? "min(960px, 96vw)" : "min(560px, 95vw)")};
  max-width: 100%;
  max-height: calc(100dvh - 40px);
  box-sizing: border-box;
  overflow: hidden;
  padding: 0;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 12px 36px rgba(15, 10, 30, 0.22);
  z-index: 11001;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  @media (max-width: 640px) {
    width: 100%;
    max-width: 100%;
    max-height: calc(100dvh - 16px);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 28px rgba(15, 10, 30, 0.28);
    margin-bottom: 0;
  }
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
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }

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
  z-index: 10;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(48, 36, 74, 0.14);
  border-radius: 9px;
  font-size: 20px;
  cursor: pointer;
  color: #30244a;
  box-shadow: 0 2px 8px rgba(30, 27, 75, 0.14);
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: #ffffff;
    transform: scale(1.04);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado, #6366f1);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    font-size: 19px;
  }
`;

export const ModalGenerico = ({
  isOpen,
  abierto,
  onClose,
  children,
  wide = false,
  maxAncho,
  encabezado,
}) => {
  const visible = Boolean(isOpen ?? abierto);

  /*
   * Escape cierra y el fondo deja de hacer scroll mientras el modal está
   * abierto. Sin esto, en el celular la página de atrás se mueve al capturar.
   */
  useEffect(() => {
    if (!visible || typeof document === "undefined") return undefined;

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
  }, [visible, onClose]);

  if (!visible || typeof document === "undefined") return null;

  return createPortal((
    <Overlay isOpen={visible} onClick={onClose}>
      <ModalContainer
        $wide={wide}
        style={maxAncho ? { maxWidth: maxAncho } : undefined}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar">
          <IoClose />
        </CloseButton>
        {encabezado}
        <ModalContent>{children}</ModalContent>
      </ModalContainer>
    </Overlay>
  ), document.body);
};
