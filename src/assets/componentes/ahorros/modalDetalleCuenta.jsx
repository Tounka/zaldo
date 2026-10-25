import { useEffect, useState } from "react";
import styled from "styled-components";
import { FaCheck, FaPen } from "react-icons/fa";
import { ModalEncabezado, ModalGenerico } from "../Modales/ModalGenerico";

/*
 * Información de contexto de una cuenta de Ahorros: para qué es y cuánto se
 * espera que rinda. No toca montos; el asistente la usa para comparar lo
 * esperado contra lo que la cuenta realmente rinde (abajo, de solo lectura).
 */

const formatMoney = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/**
 * `cuenta` = { categoria, nombreCategoria, id, nombre, descripcion, rendimientoEstimado } o null.
 * `resumen` = rendimiento real del año para esa cuenta (resumenRendimientoPorCuenta).
 */
export const ModalDetalleCuenta = ({ cuenta, resumen, onClose, onGuardar }) => {
  const [descripcion, setDescripcion] = useState("");
  const [estimado, setEstimado] = useState("");

  useEffect(() => {
    if (!cuenta) return;
    setDescripcion(cuenta.descripcion || "");
    setEstimado(cuenta.rendimientoEstimado ?? "");
  }, [cuenta]);

  const sinCambios = descripcion.trim() === (cuenta?.descripcion || "")
    && String(estimado) === String(cuenta?.rendimientoEstimado ?? "");

  const guardar = (evento) => {
    evento.preventDefault();
    if (!cuenta) return;
    onGuardar?.(cuenta.categoria, cuenta.id, { descripcion, rendimientoEstimado: estimado });
    onClose?.();
  };

  const tasaReal = resumen?.tasaAnual;
  const estimadoNumero = Number(estimado);
  const comparacion = tasaReal !== null && tasaReal !== undefined && estimado !== "" && Number.isFinite(estimadoNumero)
    ? tasaReal - estimadoNumero
    : null;

  return (
    <ModalGenerico
      isOpen={Boolean(cuenta)}
      onClose={onClose}
      encabezado={
        <ModalEncabezado
          icon={<FaPen />}
          title="Detalle de la cuenta"
          description={`${cuenta?.nombre || "Sin nombre"} · ${cuenta?.nombreCategoria || ""}`}
        />
      }
    >
      {cuenta && (
        <Formulario onSubmit={guardar}>
          <Campo>
            Descripción
            <textarea
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej. Cuenta de ahorro con rendimiento diario, liquidez inmediata. Aquí guardo el fondo de emergencia."
            />
            <small>El asistente la usa para entender para qué es la cuenta.</small>
          </Campo>

          <Campo>
            Rendimiento anual estimado
            <ConSufijo>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="-100"
                max="1000"
                value={estimado}
                onChange={(evento) => setEstimado(evento.target.value)}
                placeholder="Ej. 9.5"
              />
              <span>% anual</span>
            </ConSufijo>
            <small>Lo que promete o esperas de la cuenta. Déjalo vacío si no genera rendimiento.</small>
          </Campo>

          <Real>
            <strong>Este año</strong>
            {resumen ? (
              <dl>
                <div>
                  <dt>Rendimiento</dt>
                  <MontoColor $color={resumen.rendimiento >= 0 ? "#1f8a52" : "#c2303c"}>{formatMoney(resumen.rendimiento)}</MontoColor>
                </div>
                {resumen.aportes ? (
                  <div>
                    <dt>Aumentos a capital</dt>
                    <dd>{formatMoney(resumen.aportes)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Tasa real aprox.</dt>
                  <dd>
                    {tasaReal === null ? "Faltan datos (mín. una semana)" : `${tasaReal}% anual`}
                    {comparacion !== null && (
                      <Comparacion $positivo={comparacion >= 0}>
                        {comparacion >= 0 ? "+" : ""}{comparacion.toFixed(1)} pts vs. estimado
                      </Comparacion>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>Aún no hay cambios registrados para esta cuenta. Se calcula a partir de hoy, con cada cambio de saldo.</p>
            )}
            <small>
              Los cambios de saldo cuentan como rendimiento salvo que en el desglose del día los marques como
              {" "}<b>Aumento a capital</b>. Los movimientos entre cuentas se compensan y no suman.
            </small>
          </Real>

          <Botones>
            <Boton type="button" $secundario onClick={onClose}>Cancelar</Boton>
            <Boton type="submit" disabled={sinCambios}><FaCheck /> Guardar</Boton>
          </Botones>
        </Formulario>
      )}
    </ModalGenerico>
  );
};

/* =======================
   ESTILOS
======================= */

const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 2px;
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #3f3651;
  font-size: 12px;
  font-weight: 800;

  textarea,
  input {
    width: 100%;
    box-sizing: border-box;
    border: 1.5px solid rgba(83, 59, 143, 0.2);
    border-radius: 9px;
    padding: 9px 11px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #1a1a2e;
    background: #fff;
    resize: vertical;

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

  small {
    color: #8a8a9a;
    font-size: 11px;
    font-weight: 500;
  }
`;

const ConSufijo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input { max-width: 140px; }

  span {
    color: #6b6a75;
    font-size: 13px;
    font-weight: 700;
  }
`;

const Real = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(83, 59, 143, 0.05);
  border: 1px solid rgba(83, 59, 143, 0.12);

  > strong {
    color: var(--colorMorado);
    font-size: 12px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  dl {
    display: grid;
    gap: 6px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }

  dt { color: #6b6a75; }
  dd {
    margin: 0;
    text-align: right;
    font-weight: 800;
    color: #1a1a2e;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #6b6a75;
  }

  small {
    color: #8a8a9a;
    font-size: 11px;
    line-height: 1.45;
  }
`;

const MontoColor = styled.dd`
  && { color: ${({ $color }) => $color}; }
`;

const Comparacion = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $positivo }) => ($positivo ? "#1f8a52" : "#c2303c")};
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
