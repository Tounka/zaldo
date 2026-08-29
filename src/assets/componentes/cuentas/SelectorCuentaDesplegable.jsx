import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { FaCheck, FaChevronDown, FaStar, FaWallet } from "react-icons/fa";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";

const Raiz = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
`;

const CuentaBase = styled.button`
  width: 100%;
  min-width: 0;
  min-height: 58px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  padding: 8px 11px;
  border: 1px solid ${({ $abierto, $seleccionada }) =>
    $abierto || $seleccionada ? "rgba(83, 59, 143, .45)" : "rgba(83, 59, 143, .18)"};
  border-radius: 12px;
  background: ${({ $seleccionada }) => ($seleccionada ? "#f7f4fc" : "#ffffff")};
  color: #2d2438;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;

  &:hover:not(:disabled) {
    border-color: var(--colorMorado);
    box-shadow: 0 5px 14px rgba(65, 43, 92, .09);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, .13);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: .6;
  }
`;

const Miniatura = styled.span`
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background-color: #332650;
  background-image: linear-gradient(135deg, rgba(71, 48, 115, .2), rgba(22, 13, 38, .7)),
    url(${({ $fondo }) => $fondo || "none"});
  background-position: center;
  background-size: cover;
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18);
`;

const Texto = styled.span`
  min-width: 0;

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #30243f;
    font-size: 12px;
    font-weight: 850;
  }

  small {
    margin-top: 3px;
    color: #746b80;
    font-size: 10px;
    font-weight: 650;
  }
`;

const Estado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--colorMorado);
  font-size: 11px;

  svg:last-child {
    transform: rotate(${({ $abierto }) => ($abierto ? "180deg" : "0deg")});
    transition: transform .16s ease;
  }
`;

const Etiqueta = styled.span`
  display: block;
  margin-bottom: 5px;
  color: #62596d;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .055em;
  text-transform: uppercase;
`;

const Menu = styled.div`
  position: absolute;
  z-index: 1300;
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
  max-height: min(310px, 48dvh);
  display: grid;
  gap: 6px;
  box-sizing: border-box;
  overflow-y: auto;
  padding: 7px;
  border: 1px solid rgba(83, 59, 143, .2);
  border-radius: 13px;
  background: #ffffff;
  box-shadow: 0 18px 38px rgba(36, 24, 52, .2);
`;

const saldoCuenta = (cuenta) =>
  Number(cuenta?.saldoALaFecha || 0) + Number(cuenta?.saldoALaFechaMSI || 0);

export const SelectorCuentaDesplegable = ({
  cuentas = [],
  cuentaSeleccionada = null,
  onSeleccionar,
  etiqueta,
  placeholder = "Selecciona una cuenta",
  disabled = false,
  className,
}) => {
  const raizRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const cuentasOrdenadas = useMemo(
    () => [...cuentas].sort((a, b) =>
      Number(Boolean(b?.preferida)) - Number(Boolean(a?.preferida)) ||
      saldoCuenta(b) - saldoCuenta(a)),
    [cuentas]
  );
  const cuentasDisponibles = useMemo(
    () => cuentaSeleccionada
      ? cuentasOrdenadas.filter((cuenta) => cuenta.id !== cuentaSeleccionada.id)
      : cuentasOrdenadas,
    [cuentaSeleccionada, cuentasOrdenadas]
  );

  useEffect(() => {
    const cerrar = (event) => {
      if (!raizRef.current?.contains(event.target)) setAbierto(false);
    };
    const cerrarEscape = (event) => {
      if (event.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrarEscape);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, []);

  useEffect(() => {
    if (cuentasDisponibles.length === 0) setAbierto(false);
  }, [cuentasDisponibles.length]);

  const elegir = (cuenta) => {
    onSeleccionar?.(cuenta);
    setAbierto(false);
  };

  return (
    <Raiz ref={raizRef} className={className}>
      {etiqueta ? <Etiqueta>{etiqueta}</Etiqueta> : null}
      <CuentaBase
        type="button"
        $abierto={abierto}
        $seleccionada={Boolean(cuentaSeleccionada)}
        disabled={disabled || cuentasDisponibles.length === 0}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
      >
        <Miniatura $fondo={cuentaSeleccionada ? obtenerFondoTarjeta(cuentaSeleccionada) : null}>
          {!cuentaSeleccionada ? <FaWallet aria-hidden="true" /> : null}
        </Miniatura>
        <Texto>
          <strong>{cuentaSeleccionada?.nombre || placeholder}</strong>
          <small>
            {cuentaSeleccionada
              ? `Saldo ${formatearMonedaSegunPreferencia(saldoCuenta(cuentaSeleccionada))}`
              : cuentasDisponibles.length
              ? `${cuentasDisponibles.length} cuentas disponibles`
              : "No hay cuentas disponibles"}
          </small>
        </Texto>
        <Estado $abierto={abierto}>
          {cuentaSeleccionada?.preferida ? <FaStar title="Cuenta preferida" /> : null}
          <FaChevronDown aria-hidden="true" />
        </Estado>
      </CuentaBase>

      {abierto && cuentasDisponibles.length > 0 ? (
        <Menu role="listbox" aria-label={etiqueta || placeholder}>
          {cuentasDisponibles.map((cuenta) => {
            const seleccionada = cuentaSeleccionada?.id === cuenta.id;
            return (
              <CuentaBase
                key={cuenta.id}
                type="button"
                role="option"
                aria-selected={seleccionada}
                $seleccionada={seleccionada}
                onClick={() => elegir(cuenta)}
              >
                <Miniatura $fondo={obtenerFondoTarjeta(cuenta)} />
                <Texto>
                  <strong>{cuenta.nombre || "Sin nombre"}</strong>
                  <small>Saldo {formatearMonedaSegunPreferencia(saldoCuenta(cuenta))}</small>
                </Texto>
                <Estado>
                  {cuenta.preferida ? <FaStar title="Cuenta preferida" /> : null}
                  {seleccionada ? <FaCheck aria-hidden="true" /> : null}
                </Estado>
              </CuentaBase>
            );
          })}
        </Menu>
      ) : null}
    </Raiz>
  );
};
