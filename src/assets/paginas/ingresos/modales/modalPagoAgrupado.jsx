import styled from "styled-components";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaHandHoldingUsd } from "react-icons/fa";
import {
    ContenedorFormularioGenerico,
    ModalEncabezado,
    ModalGenerico,
    RejillaCamposModal,
} from "../../../componentes/Modales/ModalGenerico";
import { fnFormatMoney, formatFechaLegible, obtenerMontoRegistro } from "../../../funciones/ingresosCalculos";
import { fechaLocalISO } from "../../../funciones/utils/fechas";

const Contenido = styled(ContenedorFormularioGenerico).attrs({ as: "form" })`
  gap: 14px;
`;

const ListaPeriodos = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 10px;
`;

const ItemPeriodo = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #1a1a2e;

  & + & {
    border-top: 1px solid rgba(83, 59, 143, 0.06);
  }

  small {
    color: #777;
    margin-left: 6px;
  }

  b {
    font-family: 'SF Mono', 'Fira Code', monospace;
    white-space: nowrap;
  }
`;

const TotalEsperado = styled(ItemPeriodo).attrs({ as: "div" })`
  background: rgba(83, 59, 143, 0.06);
  border-radius: 10px;
  font-weight: 800;
  color: var(--colorMorado);
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--colorMorado);

  input {
    border: 1px solid rgba(83, 59, 143, 0.22);
    border-radius: 10px;
    padding: 10px 12px;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
    outline: none;
    min-width: 0;
  }

  input:focus {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
  }
`;

const Diferencia = styled.p`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $valor }) => ($valor > 0 ? "#1e7e34" : $valor < 0 ? "#d35400" : "#666")};
`;

const Botones = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  button {
    border-radius: 10px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid rgba(83, 59, 143, 0.2);
    background: white;
    color: var(--colorMorado);
  }

  button[type="submit"] {
    background: var(--colorMorado);
    border-color: transparent;
    color: white;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const redondear = (n) => Math.round(n * 100) / 100;

export const ModalPagoAgrupado = ({ isOpen, onClose, registros = [], empresa, onConfirmar }) => {
    const esperado = useMemo(
        () => redondear(registros.reduce((suma, registro) => suma + obtenerMontoRegistro(registro), 0)),
        [registros],
    );
    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState(fechaLocalISO());
    const [guardando, setGuardando] = useState(false);
    const inputMontoRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setMonto(String(esperado));
        setFecha(fechaLocalISO());
        setGuardando(false);
        // Lo normal es teclear lo que llegó: el monto queda seleccionado para sobrescribirlo.
        const id = setTimeout(() => inputMontoRef.current?.select(), 60);
        return () => clearTimeout(id);
    }, [isOpen, esperado]);

    const montoNum = parseFloat(monto);
    const montoValido = !Number.isNaN(montoNum) && montoNum >= 0;
    const diferencia = montoValido ? redondear(montoNum - esperado) : 0;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!montoValido || !fecha || guardando) return;
        setGuardando(true);
        try {
            await onConfirmar?.({ monto: redondear(montoNum), fecha });
        } finally {
            setGuardando(false);
        }
    };

    const ordenados = [...registros].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose} maxAncho="480px">
            <Contenido onSubmit={handleSubmit}>
                <ModalEncabezado
                    icon={<FaHandHoldingUsd />}
                    title={registros.length === 1 ? "Registrar pago del periodo" : `Registrar pago de ${registros.length} periodos`}
                    description={`${empresa?.nombre || "Empresa"} · los periodos quedarán como liquidados y se crea un solo ingreso por lo que recibiste.`}
                    tone="green"
                />

                <ListaPeriodos>
                    {ordenados.map((registro) => (
                        <ItemPeriodo key={registro.id}>
                            <span>
                                {formatFechaLegible(registro.fecha)}
                                {registro.horasReportadas ? <small>{registro.horasReportadas} hrs</small>
                                    : registro.diasTrabajados ? <small>{registro.diasTrabajados} días</small> : null}
                            </span>
                            <b>{fnFormatMoney(obtenerMontoRegistro(registro))}</b>
                        </ItemPeriodo>
                    ))}
                </ListaPeriodos>
                <TotalEsperado>
                    <span>Esperado</span>
                    <b>{fnFormatMoney(esperado)}</b>
                </TotalEsperado>

                <RejillaCamposModal>
                    <Campo>
                        ¿Cuánto te pagaron?
                        <input
                            ref={inputMontoRef}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            required
                        />
                    </Campo>
                    <Campo>
                        Fecha del depósito
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                    </Campo>
                </RejillaCamposModal>

                <Diferencia $valor={diferencia} aria-live="polite">
                    {!montoValido
                        ? "Escribe un monto válido."
                        : diferencia === 0
                            ? "Cuadra exacto con lo esperado."
                            : `${diferencia > 0 ? "+" : "−"}${fnFormatMoney(Math.abs(diferencia))} ${diferencia > 0 ? "más" : "menos"} de lo esperado (quedará anotado).`}
                </Diferencia>

                <Botones>
                    <button type="button" onClick={onClose} disabled={guardando}>Cancelar</button>
                    <button type="submit" disabled={!montoValido || !fecha || guardando}>
                        {guardando ? "Guardando..." : "Registrar pago"}
                    </button>
                </Botones>
            </Contenido>
        </ModalGenerico>
    );
};
