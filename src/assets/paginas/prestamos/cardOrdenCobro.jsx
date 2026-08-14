import styled, { keyframes } from "styled-components";
import { useState } from "react";
import {
    FaClock,
    FaCheckCircle,
    FaMoneyBillWave,
    FaExchangeAlt,
    FaEdit,
    FaChevronDown,
    FaChevronUp,
    FaReceipt,
    FaExclamationTriangle,
    FaUserCheck,
} from "react-icons/fa";
import { fnFormatMoney, formatFechaLegible } from "../../funciones/prestamosCalculos";
import { registrarCobroOrden } from "../../funciones/firebase/prestamos";
import { ModalComprobantePago } from "./modalComprobantePago";
import Swal from "sweetalert2";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 500px; }
`;

const CardContainer = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid ${({ $estado }) => {
        if ($estado === "transferido") return "rgba(40, 167, 69, 0.3)";
        if ($estado === "cobrado_sin_transferir") return "rgba(255, 152, 0, 0.4)";
        return "rgba(83, 59, 143, 0.15)";
    }};
  box-shadow: 0 4px 16px rgba(83, 59, 143, 0.06);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: ${fadeIn} 0.3s ease;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 6px 22px rgba(83, 59, 143, 0.12);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
`;

const HeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const NombreDeudor = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
`;

const SubtitleFila = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const BadgeCuota = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--colorMorado);
  background: rgba(83, 59, 143, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
`;

const BadgeAtraso = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #e65100;
  background: rgba(255, 152, 0, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
`;

const BadgeEstado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.4px;

  ${({ $estado }) => {
        if ($estado === "transferido") {
            return `
        background: rgba(40, 167, 69, 0.15);
        color: #28a745;
      `;
        }
        if ($estado === "cobrado_sin_transferir") {
            return `
        background: rgba(255, 152, 0, 0.15);
        color: #e65100;
      `;
        }
        return `
      background: rgba(108, 117, 125, 0.12);
      color: #6c757d;
    `;
    }}
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: rgba(83, 59, 143, 0.04);
  border-radius: 12px;
  padding: 10px 6px;
  text-align: center;
`;

const StatCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    right: 0;
    top: 15%;
    height: 70%;
    width: 1px;
    background: rgba(83, 59, 143, 0.12);
  }
`;

const StatTitulo = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
`;

const StatValor = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $color }) => $color || "#1a1a2e"};
`;

/* ================= CONTROLES DE COBRANZA ================= */

const SeccionControles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fdfdfd;
  border: 1px solid rgba(83, 59, 143, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #2c2c3e;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--colorMorado);
    cursor: pointer;
  }
`;

const FilaMontoCobro = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const InputMonto = styled.input`
  flex: 1;
  min-width: 120px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(83, 59, 143, 0.25);
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const BtnGuardarCobro = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BtnMiniComprobante = styled.button`
  background: rgba(83, 59, 143, 0.1);
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMorado);
    color: white;
  }
`;

const FooterAcciones = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(83, 59, 143, 0.06);
  padding-top: 10px;
  gap: 8px;
`;

const BtnTexto = styled.button`
  background: none;
  border: none;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }
`;

const HistorialDesplegable = styled.div`
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  padding-top: 10px;
  animation: ${slideDown} 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ItemHistorial = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(83, 59, 143, 0.03);
  gap: 10px;
  flex-wrap: wrap;
`;

const ItemHistorialInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const BtnIconoComprobante = styled.button`
  background: white;
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: var(--colorMorado);
    color: white;
  }
`;

export const CardOrdenCobro = ({
    orden,
    uid,
    onOrdenActualizada,
    onEditarPrestamo,
    esAdmin,
}) => {
    const {
        prestamoId,
        prestamo,
        nombreDeudor,
        montoPrestado,
        totalPagado,
        deudaPendiente,
        montoSugerido,
        montoCobrado,
        pagoId,
        pagoRegistrado,
        fechaOrden,
        numeroPago,
        totalPagosEstimados,
        diasAtraso,
        atrasado,
        yaPago: initialYaPago,
        transferidoAlAdmin: initialTransferido,
        estadoOrden,
    } = orden;

    const [yaPago, setYaPago] = useState(initialYaPago);
    const [transferido, setTransferido] = useState(initialTransferido);
    const [montoInput, setMontoInput] = useState(montoCobrado || montoSugerido || "");
    const [guardando, setGuardando] = useState(false);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState(null);

    /* ── Toggle Ya Pagó ── */
    const handleToggleYaPago = async (e) => {
        const nuevoValor = e.target.checked;
        setYaPago(nuevoValor);

        if (!nuevoValor) {
            setGuardando(true);
            try {
                await registrarCobroOrden(uid, prestamoId, {
                    ordenFecha: fechaOrden,
                    yaPago: false,
                    pagoId,
                });
                setTransferido(false);
                onOrdenActualizada?.();
            } catch (error) {
                console.error("Error al desmarcar pago:", error);
                setYaPago(true);
            } finally {
                setGuardando(false);
            }
        }
    };

    /* ── Guardar Cobro ── */
    const handleGuardarCobro = async () => {
        if (!montoInput || Number(montoInput) <= 0) {
            Swal.fire("Monto requerido", "Ingresa el monto cobrado.", "warning");
            return;
        }

        setGuardando(true);
        try {
            const cobroRes = await registrarCobroOrden(uid, prestamoId, {
                ordenFecha: fechaOrden,
                fecha: fechaOrden,
                monto: Number(montoInput),
                numeroPago: numeroPago,
                yaPago: true,
                transferidoAlAdmin: transferido,
                pagoId,
            });

            onOrdenActualizada?.();

            // Preparar datos para comprobante
            const saldoRestanteCalc = Math.max(0, deudaPendiente - Number(montoInput));
            const datosComprobante = {
                nombreDeudor,
                numeroPago,
                totalPagos: totalPagosEstimados,
                montoPagado: Number(montoInput),
                fechaPactada: fechaOrden,
                fechaPago: new Date(),
                diasAtraso: diasAtraso || 0,
                saldoAnterior: deudaPendiente,
                saldoRestante: saldoRestanteCalc,
                prestamoNombre: prestamo.nombre,
                folio: `REC-${Date.now().toString().slice(-6)}`,
            };

            setComprobanteSeleccionado(datosComprobante);

            Swal.fire({
                icon: "success",
                title: "Cobro registrado",
                text: `${fnFormatMoney(montoInput)} cobrado a ${nombreDeudor}`,
                showCancelButton: true,
                confirmButtonText: "Descargar Comprobante 🧾",
                cancelButtonText: "Cerrar",
                confirmButtonColor: "var(--colorMorado)",
            }).then((res) => {
                if (res.isConfirmed) {
                    setComprobanteSeleccionado(datosComprobante);
                }
            });
        } catch (error) {
            console.error("Error al guardar cobro:", error);
            Swal.fire("Error", "No se pudo registrar el cobro.", "error");
        } finally {
            setGuardando(false);
        }
    };

    /* ── Toggle Transferido a Luis ── */
    const handleToggleTransferido = async (e) => {
        const nuevoValor = e.target.checked;
        if (!yaPago) {
            Swal.fire("Atención", "Primero debes marcar que el deudor ya pagó la orden.", "info");
            return;
        }

        setTransferido(nuevoValor);
        setGuardando(true);
        try {
            await registrarCobroOrden(uid, prestamoId, {
                ordenFecha: fechaOrden,
                fecha: fechaOrden,
                monto: Number(montoInput || montoSugerido),
                numeroPago: numeroPago,
                yaPago: true,
                transferidoAlAdmin: nuevoValor,
                pagoId,
            });
            onOrdenActualizada?.();
        } catch (error) {
            console.error("Error al actualizar transferencia:", error);
            setTransferido(!nuevoValor);
        } finally {
            setGuardando(false);
        }
    };

    /* ── Abrir Comprobante de un pago del historial ── */
    const abrirComprobanteDePago = (p, index) => {
        const numP = p.numeroPago || index + 1;
        const datos = {
            nombreDeudor,
            numeroPago: numP,
            totalPagos: totalPagosEstimados,
            montoPagado: Number(p.monto || 0),
            fechaPactada: p.ordenFecha || fechaOrden,
            fechaPago: p.fecha ? (p.fecha.seconds ? new Date(p.fecha.seconds * 1000) : new Date(p.fecha)) : new Date(),
            diasAtraso: p.diasAtraso || 0,
            saldoAnterior: p.saldoAnterior || deudaPendiente + Number(p.monto || 0),
            saldoRestante: p.saldoRestante !== undefined ? p.saldoRestante : Math.max(0, deudaPendiente),
            prestamoNombre: prestamo.nombre,
            folio: p.id ? p.id.replace("pago_", "REC-") : `REC-${Date.now().toString().slice(-6)}`,
        };
        setComprobanteSeleccionado(datos);
    };

    return (
        <CardContainer $estado={estadoOrden}>
            <CardHeader>
                <HeaderInfo>
                    <NombreDeudor>{nombreDeudor}</NombreDeudor>
                    <SubtitleFila>
                        <BadgeCuota>
                            Pago #{numeroPago} {totalPagosEstimados ? `de ${totalPagosEstimados}` : ""}
                        </BadgeCuota>
                        {atrasado && !yaPago && (
                            <BadgeAtraso>
                                <FaExclamationTriangle /> {diasAtraso} días de atraso
                            </BadgeAtraso>
                        )}
                        <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>
                            Corte: {formatFechaLegible(fechaOrden)}
                        </span>
                    </SubtitleFila>
                </HeaderInfo>

                <BadgeEstado $estado={estadoOrden}>
                    {estadoOrden === "transferido" && (
                        <>
                            <FaCheckCircle /> Transferido
                        </>
                    )}
                    {estadoOrden === "cobrado_sin_transferir" && (
                        <>
                            <FaClock /> Cobrado (Sin transferir)
                        </>
                    )}
                    {estadoOrden === "pendiente" && (
                        <>
                            <FaMoneyBillWave /> Pendiente de Cobro
                        </>
                    )}
                </BadgeEstado>
            </CardHeader>

            <StatsGrid>
                <StatCol>
                    <StatTitulo>Prestado</StatTitulo>
                    <StatValor>{fnFormatMoney(montoPrestado)}</StatValor>
                </StatCol>
                <StatCol>
                    <StatTitulo>Deuda Restante</StatTitulo>
                    <StatValor $color={deudaPendiente <= 0 ? "#28a745" : "#e65100"}>
                        {fnFormatMoney(deudaPendiente)}
                    </StatValor>
                </StatCol>
                <StatCol>
                    <StatTitulo>Abono Esperado</StatTitulo>
                    <StatValor $color="var(--colorMorado)">
                        {fnFormatMoney(montoSugerido)}
                    </StatValor>
                </StatCol>
            </StatsGrid>

            <SeccionControles>
                {/* Checkbox 1: Ya pagó */}
                <CheckboxRow>
                    <input
                        type="checkbox"
                        checked={yaPago}
                        onChange={handleToggleYaPago}
                        disabled={guardando}
                    />
                    <span>¿El cliente ya pagó esta orden?</span>
                </CheckboxRow>

                {yaPago && (
                    <FilaMontoCobro>
                        <InputMonto
                            type="number"
                            value={montoInput}
                            onChange={(e) => setMontoInput(e.target.value)}
                            placeholder="Monto cobrado ($)"
                            min="0"
                            step="0.01"
                        />
                        <BtnGuardarCobro onClick={handleGuardarCobro} disabled={guardando}>
                            {guardando ? "..." : "Confirmar Cobro"}
                        </BtnGuardarCobro>

                        {pagoRegistrado && (
                            <BtnMiniComprobante
                                type="button"
                                onClick={() => abrirComprobanteDePago(pagoRegistrado, numeroPago - 1)}
                            >
                                <FaReceipt /> Comprobante
                            </BtnMiniComprobante>
                        )}
                    </FilaMontoCobro>
                )}

                {/* Checkbox 2: Ya me transfirió */}
                <CheckboxRow style={{ opacity: yaPago ? 1 : 0.45 }}>
                    <input
                        type="checkbox"
                        checked={transferido}
                        onChange={handleToggleTransferido}
                        disabled={!yaPago || guardando}
                    />
                    <span>¿Ya se transfirió el dinero a Luis?</span>
                </CheckboxRow>
            </SeccionControles>

            <FooterAcciones>
                <BtnTexto onClick={() => setMostrarHistorial((v) => !v)}>
                    {mostrarHistorial ? <FaChevronUp /> : <FaChevronDown />}
                    Histórico ({prestamo.pagos?.length || 0})
                </BtnTexto>

                <BtnTexto onClick={() => onEditarPrestamo?.(prestamo)}>
                    <FaEdit /> Editar / Asignar
                </BtnTexto>
            </FooterAcciones>

            {mostrarHistorial && (
                <HistorialDesplegable>
                    {(prestamo.pagos || []).length === 0 ? (
                        <span style={{ fontSize: 12, color: "#888", textAlign: "center" }}>
                            Sin cobros registrados aún.
                        </span>
                    ) : (
                        prestamo.pagos.map((p, i) => (
                            <ItemHistorial key={p.id || i}>
                                <ItemHistorialInfo>
                                    <div>
                                        <strong>Pago #{p.numeroPago || i + 1}:</strong>{" "}
                                        <span style={{ color: "#28a745", fontWeight: 700 }}>
                                            {fnFormatMoney(p.monto)}
                                        </span>
                                    </div>
                                    <span style={{ color: "#777", fontSize: 11 }}>
                                        {formatFechaLegible(p.fecha)} ({p.ordenFecha || "Fecha corte"}) •{" "}
                                        {p.diasAtraso > 0 ? `⚠️ ${p.diasAtraso}d atraso` : "✓ A tiempo"}
                                    </span>
                                </ItemHistorialInfo>

                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: p.transferidoAlAdmin ? "#28a745" : "#e65100",
                                        }}
                                    >
                                        {p.transferidoAlAdmin ? "✓ Transferido" : "⏳ En cobrador"}
                                    </span>
                                    <BtnIconoComprobante onClick={() => abrirComprobanteDePago(p, i)}>
                                        <FaReceipt /> Recibo
                                    </BtnIconoComprobante>
                                </div>
                            </ItemHistorial>
                        ))
                    )}
                </HistorialDesplegable>
            )}

            {/* Modal de Comprobante de Pago */}
            <ModalComprobantePago
                isOpen={!!comprobanteSeleccionado}
                onClose={() => setComprobanteSeleccionado(null)}
                datosComprobante={comprobanteSeleccionado}
            />
        </CardContainer>
    );
};
