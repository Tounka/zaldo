import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FaExchangeAlt, FaCheck, FaArrowRight } from "react-icons/fa";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "../Modales/ModalGenerico";

/*
 * Mueve dinero entre dos cuentas de Ahorros. Ajusta ambos saldos y deja el
 * traspaso registrado en el día, así no se confunde con rendimiento, aporte
 * ni retiro de ninguna de las dos.
 */

const formatMoney = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const NOMBRES_CATEGORIAS = {
  liquido: "Líquido",
  inversiones: "Inversiones",
  inversionesLargo: "A largo",
  responsabilidades: "Responsabilidades",
};

const listarCuentas = (cuentas = {}) => Object.entries(cuentas || {}).flatMap(([categoria, lista]) =>
  (lista || [])
    .filter((cuenta) => cuenta?.id)
    .map((cuenta) => ({
      categoria,
      id: cuenta.id,
      nombre: String(cuenta.nombre || "").trim() || "Sin nombre",
      monto: Number(cuenta.monto) || 0,
    })));

const saldoDespues = (cuenta, monto, signo) => {
  const direccion = cuenta.categoria === "responsabilidades" ? -signo : signo;
  return Math.round((cuenta.monto + direccion * monto) * 100) / 100;
};

/**
 * `inicial` = { origenId, destinoId } para abrir (cualquiera puede venir vacío) o null para cerrado.
 * `onConfirmar({ origen: { categoria, id }, destino: { categoria, id }, monto })`.
 */
export const ModalTraspaso = ({ inicial, cuentas, onClose, onConfirmar }) => {
  const opciones = useMemo(() => listarCuentas(cuentas), [cuentas]);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [monto, setMonto] = useState("");

  useEffect(() => {
    if (!inicial) return;
    setOrigenId(inicial.origenId || "");
    setDestinoId(inicial.destinoId || "");
    setMonto("");
  }, [inicial]);

  const origen = opciones.find((cuenta) => cuenta.id === origenId) || null;
  const destino = opciones.find((cuenta) => cuenta.id === destinoId) || null;
  const valor = Number(monto);
  const montoValido = Number.isFinite(valor) && valor > 0;
  const mismaCuenta = Boolean(origen && destino && origen.id === destino.id);
  const excede = Boolean(origen && montoValido && origen.categoria !== "responsabilidades" && valor > origen.monto);
  const puedeGuardar = origen && destino && !mismaCuenta && montoValido;

  const guardar = (evento) => {
    evento.preventDefault();
    if (!puedeGuardar) return;
    onConfirmar?.({
      origen: { categoria: origen.categoria, id: origen.id },
      destino: { categoria: destino.categoria, id: destino.id },
      monto: Math.round(valor * 100) / 100,
    });
    onClose?.();
  };

  const selector = (valorActual, onCambiar, etiqueta) => (
    <Campo>
      {etiqueta}
      <select value={valorActual} onChange={(evento) => onCambiar(evento.target.value)}>
        <option value="">Elige una cuenta</option>
        {Object.keys(NOMBRES_CATEGORIAS).map((categoria) => {
          const lista = opciones.filter((cuenta) => cuenta.categoria === categoria);
          if (lista.length === 0) return null;
          return (
            <optgroup key={categoria} label={NOMBRES_CATEGORIAS[categoria]}>
              {lista.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} · {formatMoney(cuenta.monto)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </Campo>
  );

  return (
    <ModalGenerico
      isOpen={Boolean(inicial)}
      onClose={onClose}
      encabezado={
        <ModalEncabezado
          icon={<FaExchangeAlt />}
          title="Traspaso entre cuentas"
          description="Mueve dinero sin que cuente como rendimiento, aporte ni retiro"
        />
      }
    >
      {inicial && (
        <Formulario as="form" onSubmit={guardar}>
          <Cuentas>
            {selector(origenId, setOrigenId, "Sale de")}
            <Flecha aria-hidden="true"><FaArrowRight /></Flecha>
            {selector(destinoId, setDestinoId, "Entra a")}
          </Cuentas>

          <Campo>
            Monto
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={monto}
              onChange={(evento) => setMonto(evento.target.value)}
              placeholder="Ej. 200"
              autoFocus
            />
            {mismaCuenta && <Aviso>Elige dos cuentas distintas.</Aviso>}
            {excede && <Aviso>Es más de lo que tiene {origen.nombre}; se registrará igual.</Aviso>}
          </Campo>

          {origen && destino && !mismaCuenta && montoValido && (
            <Vista>
              <div>
                <span>{origen.nombre}</span>
                <strong>{formatMoney(origen.monto)} → {formatMoney(saldoDespues(origen, valor, -1))}</strong>
              </div>
              <div>
                <span>{destino.nombre}</span>
                <strong>{formatMoney(destino.monto)} → {formatMoney(saldoDespues(destino, valor, 1))}</strong>
              </div>
              <small>El rendimiento de cada cuenta se sigue calculando sobre su propio saldo.</small>
            </Vista>
          )}

          <Botones>
            <Boton type="button" $secundario onClick={onClose}>Cancelar</Boton>
            <Boton type="submit" disabled={!puedeGuardar}><FaCheck /> Traspasar</Boton>
          </Botones>
        </Formulario>
      )}
    </ModalGenerico>
  );
};

/* =======================
   ESTILOS
======================= */

const Formulario = styled(ContenedorFormularioGenerico)`
  gap: 14px;
  padding-top: 16px;
`;

const Cuentas = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 8px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Flecha = styled.span`
  display: grid;
  place-items: center;
  height: 40px;
  color: var(--colorMorado);

  @media (max-width: 520px) {
    display: none;
  }
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  color: #3f3651;
  font-size: 12px;
  font-weight: 800;

  select,
  input {
    width: 100%;
    box-sizing: border-box;
    min-height: 40px;
    border: 1.5px solid rgba(83, 59, 143, 0.2);
    border-radius: 9px;
    padding: 8px 10px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #1a1a2e;
    background: #fff;

    &:focus {
      outline: none;
      border-color: var(--colorMorado);
      box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.12);
    }

    /* Evita el zoom automático de iOS al enfocar. */
    @media (max-width: 600px) {
      font-size: 16px;
    }
  }
`;

const Aviso = styled.small`
  color: #c2303c;
  font-size: 11px;
  font-weight: 700;
`;

const Vista = styled.section`
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(83, 59, 143, 0.05);
  border: 1px solid rgba(83, 59, 143, 0.12);

  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }

  span { color: #6b6a75; }

  strong {
    color: #1a1a2e;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  small {
    color: #8a8a9a;
    font-size: 11px;
  }
`;

const Botones = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

const Boton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 16px;
  border: 1.5px solid var(--colorMorado);
  border-radius: 9px;
  background: ${({ $secundario }) => ($secundario ? "#ffffff" : "var(--colorMorado)")};
  color: ${({ $secundario }) => ($secundario ? "var(--colorMorado)" : "#ffffff")};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;
