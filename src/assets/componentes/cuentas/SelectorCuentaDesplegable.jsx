import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { FaCheck, FaChevronDown, FaStar, FaWallet } from "react-icons/fa";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { Donut, resumenTarjeta } from "../cards/cardCuentaTarjeta";

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

/*
 * Variante "tarjeta": la cuenta elegida se ve con el formato de su tarjeta y el
 * clic sobre ella despliega la lista para cambiarla. Sin cuenta, un hueco
 * punteado del mismo tamaño invita a elegirla.
 */
const TarjetaBase = styled.button`
  position: relative;
  width: 100%;
  min-height: 128px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 4px;
  box-sizing: border-box;
  padding: 10px 12px;
  overflow: hidden;
  border: ${({ $vacia }) => ($vacia ? "1.5px dashed rgba(83, 59, 143, .4)" : "1px solid rgba(255, 255, 255, .2)")};
  border-radius: 8px;
  background-color: ${({ $vacia }) => ($vacia ? "#f7f4fc" : "transparent")};
  background-image: ${({ $fondo }) => $fondo
    ? `linear-gradient(120deg, rgba(15, 10, 30, .08), rgba(15, 10, 30, .32)), url(${$fondo})`
    : "none"};
  background-position: center;
  background-size: cover;
  color: ${({ $vacia }) => ($vacia ? "var(--colorMorado)" : "#fff")};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease;
  box-shadow: ${({ $abierto }) => ($abierto ? "0 0 0 3px rgba(83, 59, 143, .25)" : "none")};

  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(27, 14, 48, .22); }
  &:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(83, 59, 143, .3); }
  &:disabled { cursor: not-allowed; opacity: .6; }
`;

const TarjetaCabecera = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;

  strong {
    min-width: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg { flex: 0 0 auto; font-size: 12px; transition: transform .16s ease; }
  svg.abierto { transform: rotate(180deg); }
`;

const TarjetaCuerpo = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px;
  align-items: center;
  gap: 8px;
  min-width: 0;

  p { margin: 0; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
  small { display: block; margin-top: 3px; font-size: 10px; opacity: .85; }

  .donut { width: 56px; height: 56px; display: grid; place-items: center; }
`;

const TarjetaPie = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  opacity: .9;
`;

const TarjetaVacia = styled.span`
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;

  strong { font-size: 13px; font-weight: 850; }
  small { font-size: 10px; font-weight: 650; color: #746b80; }
  svg { font-size: 20px; }
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
  variante = "selector",
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

  const bloqueado = disabled || cuentasDisponibles.length === 0;
  const resumen = variante === "tarjeta" && cuentaSeleccionada ? resumenTarjeta(cuentaSeleccionada) : null;

  return (
    <Raiz ref={raizRef} className={className}>
      {etiqueta ? <Etiqueta>{etiqueta}</Etiqueta> : null}
      {variante === "tarjeta" ? (
        <TarjetaBase
          type="button"
          $abierto={abierto}
          $vacia={!cuentaSeleccionada}
          $fondo={cuentaSeleccionada ? obtenerFondoTarjeta(cuentaSeleccionada) : null}
          disabled={bloqueado}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-label={cuentaSeleccionada ? `${cuentaSeleccionada.nombre}. Cambiar cuenta` : placeholder}
          onClick={() => setAbierto((actual) => !actual)}
        >
          {resumen ? (
            <>
              <TarjetaCabecera>
                <strong>{cuentaSeleccionada.nombre || "Sin nombre"}</strong>
                {cuentaSeleccionada.preferida ? <FaStar title="Cuenta preferida" /> : null}
                <FaChevronDown className={abierto ? "abierto" : ""} aria-hidden="true" />
              </TarjetaCabecera>
              <TarjetaCuerpo>
                <div>
                  <p>{resumen.textoLateral}</p>
                  {resumen.textoFechaDeCorte ? <small>{resumen.textoFechaDeCorte}</small> : null}
                </div>
                <div className="donut">
                  <Donut
                    porcentaje={resumen.porcentaje}
                    fondo={obtenerFondoTarjeta(cuentaSeleccionada)}
                    cuentaId={`selector-${cuentaSeleccionada.id || cuentaSeleccionada.nombre}`}
                  />
                </div>
              </TarjetaCuerpo>
              <TarjetaPie>
                <span>{adaptadorTxtLabel(tipoDeCuentaInput, resumen.tipoDeCuenta)}</span>
                <span>Toca para cambiar</span>
              </TarjetaPie>
            </>
          ) : (
            <TarjetaVacia>
              <FaWallet aria-hidden="true" />
              <strong>{placeholder}</strong>
              <small>
                {cuentasDisponibles.length
                  ? `${cuentasDisponibles.length} cuentas disponibles`
                  : "No hay cuentas disponibles"}
              </small>
            </TarjetaVacia>
          )}
        </TarjetaBase>
      ) : (
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
      )}

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
