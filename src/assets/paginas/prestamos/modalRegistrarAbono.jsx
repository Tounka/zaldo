import styled, { keyframes } from "styled-components";
import { useState, useEffect } from "react";
import {
    FaTimes,
    FaDollarSign,
    FaCalendarAlt,
    FaStickyNote,
    FaCheck,
    FaCoins,
    FaEdit,
} from "react-icons/fa";
import { agregarPago, editarPagoDePrestamo } from "../../funciones/firebase/prestamos";
import { fnFormatMoney } from "../../funciones/prestamosCalculos";
import Swal from "sweetalert2";

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 12, 30, 0.55);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11000;
  padding: 16px;
  animation: ${fadeIn} 0.2s ease;
`;

const ModalCard = styled.div`
  background: white;
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 32px);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(83, 59, 143, 0.25);
  overflow: hidden;
  animation: ${slideUp} 0.25s ease;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--colorMorado), var(--colorMoradoSecundario));
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BtnCerrar = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;

  &:hover {
    background: rgba(255, 255, 255, 0.35);
  }
`;

const Body = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
`;

const BannerDeudaInfo = styled.div`
  background: rgba(83, 59, 143, 0.05);
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoTexto = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const InfoNombre = styled.span`
  font-size: 14px;
  font-weight: 800;
  color: #1a1a2e;
`;

const InfoSaldo = styled.span`
  font-size: 12px;
  color: #666;
`;

const SaldoDestacado = styled.span`
  font-size: 15px;
  font-weight: 800;
  color: var(--colorMorado);
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const Input = styled.input`
  width: 100%;
  border: 1.5px solid rgba(83, 59, 143, 0.18);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  background: #fdfdfd;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: white;
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.12);
  }

  &[type="number"] {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 18px;
    font-weight: 900;
    color: #28a745;
  }
`;

const QuickChips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const ChipMonto = styled.button`
  background: rgba(83, 59, 143, 0.08);
  border: 1px solid rgba(83, 59, 143, 0.2);
  color: var(--colorMorado);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--colorMorado);
    color: white;
  }
`;

const Footer = styled.div`
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid rgba(83, 59, 143, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const BtnCancelar = styled.button`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.2);
  color: #666;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #f0f0f0;
  }
`;

const BtnConfirmar = styled.button`
  background: #28a745;
  border: none;
  color: white;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.25);
  transition: all 0.15s ease;

  &:hover {
    background: #218838;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const ModalRegistrarAbono = ({
    isOpen,
    onClose,
    prestamo,
    montoSugerido = null,
    fechaSugerida = null,
    uid,
    onAbonoRegistrado,
    pagoAEditar = null,
    onAbonoEditado,
}) => {
    const hoyIso = new Date().toISOString().split("T")[0];
    const pagos = prestamo?.pagos || [];

    const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalConInteres = Number(prestamo?.montoPrestado || 0) + Number(prestamo?.interesEstimado || 0);
    const saldoRestante = Math.max(0, totalConInteres - totalPagado + (pagoAEditar ? Number(pagoAEditar.monto || 0) : 0));

    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState(fechaSugerida || hoyIso);
    const [notas, setNotas] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (pagoAEditar) {
            setMonto(String(pagoAEditar.monto || ""));
            setFecha(pagoAEditar.fecha?.seconds
                ? new Date(pagoAEditar.fecha.seconds * 1000).toISOString().split("T")[0]
                : (pagoAEditar.fecha ? new Date(pagoAEditar.fecha).toISOString().split("T")[0] : hoyIso));
            setNotas(pagoAEditar.notas || "");
        } else if (montoSugerido && Number(montoSugerido) > 0) {
            setMonto(String(montoSugerido));
        } else if (prestamo?.abonoTeorico && Number(prestamo.abonoTeorico) > 0) {
            setMonto(String(prestamo.abonoTeorico));
        } else {
            setMonto(String(saldoRestante));
        }
        if (!pagoAEditar) {
            setFecha(fechaSugerida || hoyIso);
            setNotas("");
        }
    }, [prestamo, montoSugerido, fechaSugerida, isOpen, pagoAEditar, saldoRestante, hoyIso]);

    const handleGuardar = async () => {
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            Swal.fire("Monto inválido", "Ingresa un monto de abono mayor a $0", "warning");
            return;
        }

        setGuardando(true);
        try {
            if (pagoAEditar) {
                const actualizado = await editarPagoDePrestamo(uid, prestamo.id, pagoAEditar.id, {
                    monto: montoNum,
                    fecha: new Date(fecha + "T12:00:00"),
                    notas,
                });
                onAbonoEditado?.(actualizado);
            } else {
                const nuevoPago = await agregarPago(uid, prestamo.id, {
                    monto: montoNum,
                    fecha: new Date(fecha + "T12:00:00"),
                    numeroPago: pagos.length + 1,
                    notas: notas.trim(),
                    saldoAnterior: saldoRestante,
                    saldoRestante: Math.max(0, saldoRestante - montoNum),
                    transferidoAlAdmin: true,
                });
                onAbonoRegistrado?.(prestamo.id, nuevoPago);
            }
            Swal.fire({
                icon: "success",
                title: pagoAEditar ? "Abono actualizado" : "Abono registrado",
                text: `${fnFormatMoney(montoNum)} · ${prestamo.nombre}`,
                timer: 1800,
                showConfirmButton: false,
            });
            onClose();
        } catch (e) {
            console.error("Error al registrar abono:", e);
            Swal.fire("Error", "No se pudo registrar el abono", "error");
        } finally {
            setGuardando(false);
        }
    };

    if (!isOpen || !prestamo) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalCard onClick={(e) => e.stopPropagation()}>
                <Header>
                    <Titulo>
                        {pagoAEditar ? <FaEdit /> : <FaCoins />} {pagoAEditar ? "Editar Abono" : "Registrar Abono / Pago"}
                    </Titulo>
                    <BtnCerrar onClick={onClose}>
                        <FaTimes />
                    </BtnCerrar>
                </Header>

                <Body>
                    <BannerDeudaInfo>
                        <InfoTexto>
                            <InfoNombre>{prestamo.nombre}</InfoNombre>
                            <InfoSaldo>Saldo actual pendiente:</InfoSaldo>
                        </InfoTexto>
                        <SaldoDestacado>{fnFormatMoney(saldoRestante)}</SaldoDestacado>
                    </BannerDeudaInfo>

                    {/* MONTO ABONO */}
                    <Campo>
                        <Label><FaDollarSign /> Monto recibido / abonado</Label>
                        <Input
                            type="number"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                        />
                        <QuickChips>
                            {!pagoAEditar && prestamo.abonoTeorico > 0 && (
                                <ChipMonto type="button" onClick={() => setMonto(String(prestamo.abonoTeorico))}>
                                    Cuota: {fnFormatMoney(prestamo.abonoTeorico)}
                                </ChipMonto>
                            )}
                            {saldoRestante > 0 && (
                                <ChipMonto type="button" onClick={() => setMonto(String(saldoRestante))}>
                                    Liquidar todo: {fnFormatMoney(saldoRestante)}
                                </ChipMonto>
                            )}
                            {!pagoAEditar && prestamo.montoPrestado === 10000 && (
                                <ChipMonto type="button" onClick={() => setMonto("500")}>
                                    $500
                                </ChipMonto>
                            )}
                        </QuickChips>
                    </Campo>

                    {/* FECHA DEL ABONO */}
                    <Campo>
                        <Label><FaCalendarAlt /> Fecha del abono</Label>
                        <Input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </Campo>

                    {/* NOTAS */}
                    <Campo>
                        <Label><FaStickyNote /> Nota / Comentario (Opcional)</Label>
                        <Input
                            type="text"
                            placeholder="Ej. Transferencia Bancomer, Efectivo, Quincena..."
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                        />
                    </Campo>
                </Body>

                <Footer>
                    <BtnCancelar onClick={onClose} disabled={guardando}>Cancelar</BtnCancelar>
                    <BtnConfirmar onClick={handleGuardar} disabled={guardando}>
                        <FaCheck /> {guardando ? "Guardando..." : (pagoAEditar ? "Guardar cambios" : "Registrar abono")}
                    </BtnConfirmar>
                </Footer>
            </ModalCard>
        </Overlay>
    );
};
