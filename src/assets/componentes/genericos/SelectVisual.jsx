import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { FaCheck, FaChevronDown } from "react-icons/fa";

const Root = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  font-size: 14px;
`;

const Trigger = styled.button`
  width: 100%;
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid ${({ $open }) => ($open ? "var(--colorMorado)" : "#dedbee")};
  border-radius: 11px;
  background: #ffffff;
  color: ${({ $placeholder }) => ($placeholder ? "#9d97b5" : "#211b38")};
  font: inherit;
  text-align: left;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  box-shadow: ${({ $open }) => ($open ? "0 0 0 3px rgba(83, 59, 143, .11)" : "none")};
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;

  &:hover:not(:disabled) {
    border-color: var(--colorMorado);
    background: #fcfbff;
  }

  &:focus-visible {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, .14);
  }
`;

const TriggerLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Arrow = styled(FaChevronDown)`
  flex: 0 0 auto;
  color: #726a92;
  font-size: 11px;
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  transition: transform .15s ease;
`;

const Menu = styled.div`
  position: fixed;
  z-index: 12000;
  width: max-content;
  min-width: 0;
  max-width: min(340px, calc(100vw - 32px));
  max-height: 270px;
  box-sizing: border-box;
  overflow-y: auto;
  padding: 5px;
  border: 1px solid #dedbee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(33, 27, 56, .16);
`;

const OptionButton = styled.button`
  width: 100%;
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: ${({ $selected }) => ($selected ? "#f2effd" : "transparent")};
  color: #211b38;
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    flex: 0 0 auto;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    background: #f2effd;
  }
`;

const OptionText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Thumb = styled.span`
  width: ${({ $small }) => ($small ? "27px" : "30px")};
  height: ${({ $small }) => ($small ? "27px" : "30px")};
  flex: 0 0 auto;
  display: inline-block;
  border: 1px solid rgba(83, 59, 143, .17);
  border-radius: 8px;
  background: #f2f1fa ${({ $image }) => ($image ? `url(${$image}) center / cover no-repeat` : "")};
`;

const Empty = styled.span`
  display: block;
  padding: 10px 8px;
  color: #77718f;
  font-size: 12px;
`;

const textFromChildren = (children) => React.Children.toArray(children)
  .filter((child) => typeof child === "string" || typeof child === "number")
  .join("")
  .trim();

const normalizarOpciones = (options, children) => {
  if (Array.isArray(options) && options.length > 0) return options;

  return React.Children.toArray(children)
    .filter((child) => React.isValidElement(child) && child.type === "option")
    .map((child) => ({
      value: child.props.value ?? "",
      label: textFromChildren(child.props.children),
      disabled: Boolean(child.props.disabled),
      imagen: child.props.imagen,
    }));
};

export const SelectVisual = ({
  id,
  name,
  value = "",
  onChange,
  onBlur,
  options = [],
  children,
  placeholder = "Selecciona una opción",
  disabled = false,
  className,
  "aria-label": ariaLabel,
  required,
}) => {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const opciones = useMemo(() => normalizarOpciones(options, children), [options, children]);
  const seleccion = opciones.find((option) => String(option.value) === String(value));
  const tieneValor = Boolean(seleccion && String(seleccion.value) !== "");

  const actualizarPosicionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margen = 8;
    const gap = 6;
    const width = Math.min(
      Math.max(rect.width, 220),
      340,
      Math.max(120, viewportWidth - margen * 2)
    );
    const left = Math.min(
      Math.max(margen, rect.left),
      Math.max(margen, viewportWidth - width - margen)
    );
    const espacioAbajo = Math.max(0, viewportHeight - rect.bottom - margen);
    const espacioArriba = Math.max(0, rect.top - margen);
    const abrirArriba = espacioAbajo < 220 && espacioArriba > espacioAbajo;
    const maxHeight = Math.max(
      110,
      Math.min(270, (abrirArriba ? espacioArriba : espacioAbajo) - gap)
    );

    setMenuPosition({
      left,
      width,
      maxHeight,
      top: abrirArriba ? Math.max(margen, rect.top - maxHeight - gap) : rect.bottom + gap,
      visibility: "hidden",
    });

    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;

      const menuHeight = Math.min(menu.getBoundingClientRect().height, maxHeight);
      const debeAbrirArriba = espacioAbajo < menuHeight + gap && espacioArriba > espacioAbajo;
      const top = debeAbrirArriba
        ? Math.max(margen, rect.top - menuHeight - gap)
        : Math.min(rect.bottom + gap, Math.max(margen, viewportHeight - menuHeight - margen));

      setMenuPosition((actual) => ({
        ...actual,
        top,
        maxHeight,
        visibility: "visible",
      }));
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return undefined;
    }

    actualizarPosicionMenu();
    const reposicionar = () => actualizarPosicionMenu();
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);

    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
    };
  }, [open, opciones.length]);

  useEffect(() => {
    const cerrarAlHacerClickFuera = (event) => {
      const dentroDelTrigger = rootRef.current?.contains(event.target);
      const dentroDelMenu = menuRef.current?.contains(event.target);
      if (!dentroDelTrigger && !dentroDelMenu) setOpen(false);
    };
    const cerrarConEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", cerrarAlHacerClickFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarAlHacerClickFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);

  const emitirCambio = (option) => {
    if (!option || option.disabled || disabled) return;
    const event = {
      target: { id, name, value: option.value },
      currentTarget: { id, name, value: option.value },
      persist: () => {},
    };
    onChange?.(event);
    setOpen(false);
  };

  const manejarTecla = (event) => {
    if (["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setOpen((actual) => !actual);
    }
    if (event.key === "Tab") setOpen(false);
  };

  return (
    <Root ref={rootRef} className={className}>
      <Trigger
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        $open={open}
        $placeholder={!tieneValor}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => setOpen((actual) => !actual)}
        onKeyDown={manejarTecla}
        onBlur={onBlur}
      >
        {seleccion?.imagen ? <Thumb $image={seleccion.imagen} $small aria-hidden="true" /> : null}
        <TriggerLabel>{tieneValor ? seleccion.label : placeholder}</TriggerLabel>
        <Arrow $open={open} aria-hidden="true" />
      </Trigger>

      {open && typeof document !== "undefined" && document.body && createPortal(
        <Menu
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          style={menuPosition || { visibility: "hidden" }}
        >
          {opciones.length === 0 ? (
            <Empty>No hay opciones disponibles.</Empty>
          ) : opciones.map((option) => {
            const selected = String(option.value) === String(value);
            return (
              <OptionButton
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                $selected={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => emitirCambio(option)}
              >
                {option.imagen ? <Thumb $image={option.imagen} aria-hidden="true" /> : null}
                <OptionText>{option.label}</OptionText>
                {selected && <FaCheck aria-hidden="true" style={{ color: "var(--colorMorado)", fontSize: 12 }} />}
              </OptionButton>
            );
          })}
        </Menu>,
        document.body
      )}
    </Root>
  );
};

export default SelectVisual;
