import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FaArrowRight, FaCheck, FaSyncAlt } from "react-icons/fa";
import { construirPropuestaSaldos, montoDesdeCuentaZaldo } from "../../funciones/firebase/ahorros";
import { ModalEncabezado, ModalGenerico } from "../Modales/ModalGenerico";

/*
 * Vista previa para traer los saldos de las cuentas de Zaldo a Ahorros.
 * No escribe nada: cada fila elige su cuenta de origen y solo se aplican las
 * que el usuario deja marcadas.
 */

const NOMBRES_CATEGORIA = {
    liquido: "Líquido",
    inversiones: "Inversiones",
    inversionesLargo: "Inversiones a largo plazo",
    responsabilidades: "Responsabilidades",
};

const formato = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const DIFERENCIA_MINIMA = 0.009;

export const ModalSaldosCuentas = ({ isOpen, onClose, data, cuentasZaldo = [], onAplicar }) => {
    const [filas, setFilas] = useState([]);

    // Cada apertura parte de la propuesta: marcadas solo las que sí cambian.
    useEffect(() => {
        if (!isOpen) return;
        setFilas(construirPropuestaSaldos(data, cuentasZaldo).map((fila) => {
            const origen = cuentasZaldo.find((cuenta) => cuenta.id === fila.cuentaZaldoId);
            const montoNuevo = origen ? montoDesdeCuentaZaldo(fila.categoria, origen) : null;
            return {
                ...fila,
                marcada: montoNuevo !== null && Math.abs(montoNuevo - fila.montoActual) > DIFERENCIA_MINIMA,
            };
        }));
    }, [isOpen, data, cuentasZaldo]);

    const filasConMonto = useMemo(() => filas.map((fila) => {
        const origen = cuentasZaldo.find((cuenta) => cuenta.id === fila.cuentaZaldoId);
        const montoNuevo = origen ? montoDesdeCuentaZaldo(fila.categoria, origen) : null;
        return {
            ...fila,
            montoNuevo,
            cambia: montoNuevo !== null && Math.abs(montoNuevo - fila.montoActual) > DIFERENCIA_MINIMA,
        };
    }), [filas, cuentasZaldo]);

    const aAplicar = filasConMonto.filter((fila) => fila.marcada && fila.montoNuevo !== null);

    const actualizarFila = (cuentaId, cambios) => {
        setFilas((previas) => previas.map((fila) => (fila.cuentaId === cuentaId ? { ...fila, ...cambios } : fila)));
    };

    const elegirOrigen = (fila, cuentaZaldoId) => {
        const origen = cuentasZaldo.find((cuenta) => cuenta.id === cuentaZaldoId);
        const montoNuevo = origen ? montoDesdeCuentaZaldo(fila.categoria, origen) : null;
        actualizarFila(fila.cuentaId, {
            cuentaZaldoId,
            // Elegir una cuenta es intención de usarla; quitarla la desmarca.
            marcada: montoNuevo !== null,
        });
    };

    const aplicar = () => {
        onAplicar(aAplicar.map(({ categoria, cuentaId, cuentaZaldoId, montoNuevo }) => ({
            categoria,
            cuentaId,
            cuentaZaldoId,
            monto: montoNuevo,
        })));
        onClose();
    };

    const grupos = Object.keys(NOMBRES_CATEGORIA)
        .map((categoria) => ({ categoria, filas: filasConMonto.filter((fila) => fila.categoria === categoria) }))
        .filter((grupo) => grupo.filas.length > 0);

    return (
        <ModalGenerico
            isOpen={isOpen}
            onClose={onClose}
            wide
            encabezado={(
                <ModalEncabezado
                    icon={<FaSyncAlt />}
                    title="Traer saldos de mis cuentas"
                    description="Elige de qué cuenta sale cada saldo. Solo se actualizan las filas marcadas."
                />
            )}
        >
            <Cuerpo>
                {grupos.length === 0 ? (
                    <Vacio>Aún no tienes cuentas con nombre en Ahorros para este año.</Vacio>
                ) : grupos.map((grupo) => (
                    <Grupo key={grupo.categoria}>
                        <TituloGrupo>{NOMBRES_CATEGORIA[grupo.categoria]}</TituloGrupo>
                        {grupo.filas.map((fila) => (
                            <Fila key={fila.cuentaId} $apagada={!fila.marcada}>
                                <input
                                    type="checkbox"
                                    checked={fila.marcada}
                                    disabled={fila.montoNuevo === null}
                                    onChange={(evento) => actualizarFila(fila.cuentaId, { marcada: evento.target.checked })}
                                    aria-label={`Actualizar ${fila.nombre}`}
                                />
                                <Nombre>
                                    <strong>{fila.nombre}</strong>
                                    <select
                                        value={fila.cuentaZaldoId}
                                        onChange={(evento) => elegirOrigen(fila, evento.target.value)}
                                        aria-label={`Cuenta de origen para ${fila.nombre}`}
                                    >
                                        <option value="">Sin vincular</option>
                                        {cuentasZaldo.map((cuenta) => (
                                            <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
                                        ))}
                                    </select>
                                </Nombre>
                                <Montos>
                                    <span>{formato.format(fila.montoActual)}</span>
                                    {fila.montoNuevo !== null && (
                                        <>
                                            <FaArrowRight aria-hidden="true" />
                                            <MontoNuevo $igual={!fila.cambia}>{formato.format(fila.montoNuevo)}</MontoNuevo>
                                        </>
                                    )}
                                </Montos>
                            </Fila>
                        ))}
                    </Grupo>
                ))}
            </Cuerpo>

            <Pie>
                <small>
                    {aAplicar.length === 0
                        ? "Nada marcado todavía."
                        : `Se actualizarán ${aAplicar.length} fila${aAplicar.length === 1 ? "" : "s"} y se guardará el vínculo para la próxima vez.`}
                </small>
                <div>
                    <BotonSecundario type="button" onClick={onClose}>Cancelar</BotonSecundario>
                    <BotonPrincipal type="button" onClick={aplicar} disabled={aAplicar.length === 0}>
                        <FaCheck /> Aplicar {aAplicar.length > 0 ? aAplicar.length : ""}
                    </BotonPrincipal>
                </div>
            </Pie>
        </ModalGenerico>
    );
};

/* =======================
   ESTILOS
======================= */

const Cuerpo = styled.div`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    min-height: 0;
`;

const Vacio = styled.p`
    margin: 12px 0;
    font-size: 13.5px;
    color: #6b6a75;
    text-align: center;
`;

const Grupo = styled.section`
    border: 1px solid #ebeaf0;
    border-radius: 12px;
    overflow: hidden;
`;

const TituloGrupo = styled.h3`
    margin: 0;
    padding: 9px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #6b6a75;
    background: #fafafb;
    border-bottom: 1px solid #ebeaf0;
`;

const Fila = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    opacity: ${({ $apagada }) => ($apagada ? 0.6 : 1)};
    transition: opacity .15s ease;

    & + & { border-top: 1px solid #ebeaf0; }

    > input {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        accent-color: var(--colorMorado);
    }

    @media (max-width: 560px) {
        flex-wrap: wrap;
    }
`;

const Nombre = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
        font-size: 13.5px;
        font-weight: 600;
        color: #18161f;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    select {
        max-width: 240px;
        padding: 4px 8px;
        border: 1px solid #ebeaf0;
        border-radius: 8px;
        background: white;
        font-size: 12.5px;
        color: #6b6a75;
    }
`;

const Montos = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: #8e8d97;

    svg { font-size: 10px; }
`;

/* Si el saldo no cambia se muestra tenue: no hay nada que actualizar. */
const MontoNuevo = styled.strong`
    font-weight: 600;
    color: ${({ $igual }) => ($igual ? "#8e8d97" : "#18161f")};
`;

const Pie = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 20px;
    border-top: 1px solid #ebeaf0;

    small { font-size: 12px; color: #6b6a75; }
    > div { display: flex; gap: 8px; margin-left: auto; }
`;

const BotonSecundario = styled.button`
    padding: 9px 14px;
    border: 1px solid #ebeaf0;
    border-radius: 10px;
    background: white;
    font-size: 13px;
    font-weight: 500;
    color: #18161f;
    cursor: pointer;

    &:hover { background: #fafafb; }
`;

const BotonPrincipal = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border: none;
    border-radius: 10px;
    background: var(--colorMorado);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:disabled { opacity: .4; cursor: default; }
`;
