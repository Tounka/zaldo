import styled, { keyframes } from "styled-components";
import { useState } from "react";
import {
    FaChevronDown,
    FaChevronUp,
    FaClock,
    FaCheckCircle,
    FaImage,
    FaPlus,
    FaTimes,
} from "react-icons/fa";

/* ======================= ANIMACIONES ======================= */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 600px; }
`;

/* ======================= UTILIDADES ======================= */

const calcularMontoPagado = (pagos = []) =>
    pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);

const calcularRendimientoAnual = (prestamo) => {
    const { montoPrestado, pagos = [], fechaCreacion } = prestamo;
    const montoPagado = calcularMontoPagado(pagos);
    if (!montoPrestado || montoPrestado === 0) return 0;

    const fechaInicio = fechaCreacion?.seconds
        ? new Date(fechaCreacion.seconds * 1000)
        : new Date();
    const diasTranscurridos =
        Math.max(1, (Date.now() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

    const rendimiento =
        ((montoPagado / montoPrestado - 1) * (365 / diasTranscurridos)) * 100;
    return isFinite(rendimiento) ? rendimiento.toFixed(1) : "0.0";
};

const formatFecha = (timestamp) => {
    if (!timestamp) return "—";
    const d = timestamp.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const fnFormatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

/* ======================= ESTILOS CARD ======================= */

const CardWrapper = styled.div`
  animation: ${fadeIn} 0.3s ease both;
`;

const Card = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 8px 28px rgba(83, 59, 143, 0.12);
  }
`;

const CardBody = styled.div`
  padding: 20px 22px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const NombrePrestamo = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.3px;
`;

const BadgeEstado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ $estado }) =>
        $estado === "pendiente" ? "rgba(255, 183, 77, 0.15)" : "rgba(76, 175, 80, 0.15)"};
  color: ${({ $estado }) =>
        $estado === "pendiente" ? "#e65100" : "#2e7d32"};

  svg {
    font-size: 10px;
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 16px;
`;

const StatItem = styled.div`
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  position: relative;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background: rgba(83, 59, 143, 0.1);
  }
`;

const StatLabel = styled.span`
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #8a8a9a;
  margin-bottom: 4px;
`;

const StatValue = styled.span`
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
`;

const ProgressContainer = styled.div`
  margin-bottom: 4px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const ProgressLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #8a8a9a;
`;

const ProgressPercent = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: var(--colorMorado);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(83, 59, 143, 0.08);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--colorMorado), var(--colorMoradoSecundario));
  width: ${({ $percent }) => Math.min(100, $percent)}%;
  transition: width 0.4s ease;
`;

const BotonesAccion = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 22px 16px;
`;

const BtnAccion = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease, color 0.15s ease;

  ${({ $variant }) => $variant === "primary" ? `
    background: var(--colorMorado);
    color: white;
    &:hover { background: var(--colorMoradoSecundario); }
  ` : `
    background: rgba(83, 59, 143, 0.06);
    color: var(--colorMorado);
    &:hover { background: rgba(83, 59, 143, 0.12); }
  `}

  svg {
    font-size: 10px;
  }
`;

/* ======================= FORMULARIO PAGO INLINE ======================= */

const FormularioPagoContainer = styled.div`
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  animation: ${slideDown} 0.25s ease;
  overflow: hidden;
`;

const FormularioPago = styled.div`
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FilaInputs = styled.div`
  display: flex;
  gap: 10px;

  @media (max-width: 400px) {
    flex-direction: column;
  }
`;

const InputGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InputLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: #8a8a9a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  background: white;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }

  &[type="number"] {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-weight: 600;
  }
`;

const BtnSubmitPago = styled.button`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--colorMorado);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* ======================= HISTORIAL ======================= */

const BtnHistorial = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: rgba(83, 59, 143, 0.04);
  border: none;
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  cursor: pointer;
  color: #8a8a9a;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
    color: var(--colorMorado);
  }

  svg {
    font-size: 10px;
  }
`;

const HistorialContainer = styled.div`
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  animation: ${slideDown} 0.25s ease;
  overflow: hidden;
`;

const PagoItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.04);

  &:last-child {
    border-bottom: none;
  }
`;

const PagoInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PagoFecha = styled.span`
  font-size: 12px;
  color: #8a8a9a;
`;

const PagoMonto = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
`;

const BtnImagen = styled.a`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--colorMorado);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(83, 59, 143, 0.06);
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.12);
  }

  svg {
    font-size: 10px;
  }
`;

const SinPagos = styled.div`
  padding: 24px 22px;
  text-align: center;
  font-size: 13px;
  color: #8a8a9a;
`;

/* ======================= CARD PRÉSTAMO ======================= */

export const CardPrestamo = ({ prestamo, onPagoAgregado }) => {
    const [showHistorial, setShowHistorial] = useState(false);
    const [showFormularioPago, setShowFormularioPago] = useState(false);
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
    const [montoPago, setMontoPago] = useState("");
    const [enviandoPago, setEnviandoPago] = useState(false);

    const montoPagado = calcularMontoPagado(prestamo.pagos);
    const rendimiento = calcularRendimientoAnual(prestamo);
    const numPagos = prestamo.pagos?.length || 0;
    const porcentajePagado = prestamo.montoPrestado > 0
        ? ((montoPagado / prestamo.montoPrestado) * 100).toFixed(0)
        : 0;

    const montoInicialPago = prestamo.abonoTeorico ||
        (prestamo?.diasDePago && prestamo?.montoPrestado && prestamo?.interesEstimado
            ? Number(
                (
                    (prestamo.montoPrestado *
                        (prestamo.interesEstimado / 100 / 365) *
                        prestamo.diasDePago) +
                    (prestamo.montoPrestado / Math.ceil(365 / prestamo.diasDePago))
                ).toFixed(2)
            )
            : "");

    const handleAbrirFormulario = () => {
        setShowFormularioPago(true);
        if (!montoPago) {
            setMontoPago(montoInicialPago || "");
        }
    };

    const handleCancelarPago = () => {
        setShowFormularioPago(false);
    };

    const handleSubmitPago = async () => {
        if (!montoPago || Number(montoPago) <= 0) return;
        setEnviandoPago(true);
        try {
            await onPagoAgregado?.({
                fecha: new Date(fechaPago + "T12:00:00"),
                monto: Number(montoPago),
                imagenUrl: null,
            });
            setMontoPago("");
            setShowFormularioPago(false);
        } catch (e) {
            console.error("Error al agregar pago:", e);
        }
        setEnviandoPago(false);
    };

    return (
        <CardWrapper>
            <Card>
                <CardBody>
                    <CardHeader>
                        <NombrePrestamo>{prestamo.nombre}</NombrePrestamo>
                        <BadgeEstado $estado={prestamo.estado}>
                            {prestamo.estado === "pendiente" ? <FaClock /> : <FaCheckCircle />}
                            {prestamo.estado}
                        </BadgeEstado>
                    </CardHeader>

                    <StatsRow>
                        <StatItem>
                            <StatLabel>Prestado</StatLabel>
                            <StatValue>{fnFormatMoney(prestamo.montoPrestado)}</StatValue>
                        </StatItem>
                        <StatItem>
                            <StatLabel>Pagado</StatLabel>
                            <StatValue>{fnFormatMoney(montoPagado)}</StatValue>
                        </StatItem>
                        <StatItem>
                            <StatLabel>Pagos</StatLabel>
                            <StatValue>
                                {numPagos}{prestamo.numPagos ? `/${prestamo.numPagos}` : ""}
                            </StatValue>
                        </StatItem>
                        <StatItem>
                            <StatLabel>Rdto.</StatLabel>
                            <StatValue>{rendimiento}%</StatValue>
                        </StatItem>
                    </StatsRow>

                    <ProgressContainer>
                        <ProgressHeader>
                            <ProgressLabel>Progreso</ProgressLabel>
                            <ProgressPercent>{porcentajePagado}%</ProgressPercent>
                        </ProgressHeader>
                        <ProgressBar>
                            <ProgressFill $percent={porcentajePagado} />
                        </ProgressBar>
                    </ProgressContainer>
                </CardBody>

                <BotonesAccion>
                    <BtnAccion $variant="primary" onClick={handleAbrirFormulario}>
                        <FaPlus /> Agregar Pago
                    </BtnAccion>
                    <BtnAccion onClick={() => setShowHistorial((v) => !v)}>
                        {showHistorial ? <FaChevronUp /> : <FaChevronDown />}
                        {showHistorial ? "Ocultar" : `Pagos (${numPagos})`}
                    </BtnAccion>
                </BotonesAccion>
            </Card>

            {showFormularioPago && (
                <FormularioPagoContainer>
                    <FormularioPago>
                        <FilaInputs>
                            <InputGroup>
                                <InputLabel>Fecha</InputLabel>
                                <Input
                                    type="date"
                                    value={fechaPago}
                                    onChange={(e) => setFechaPago(e.target.value)}
                                />
                            </InputGroup>
                            <InputGroup>
                                <InputLabel>Monto</InputLabel>
                                <Input
                                    type="number"
                                    value={montoPago}
                                    onChange={(e) => setMontoPago(e.target.value)}
                                    placeholder="$0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </InputGroup>
                        </FilaInputs>
                        <FilaInputs>
                            <BtnSubmitPago
                                onClick={handleSubmitPago}
                                disabled={enviandoPago || !montoPago}
                            >
                                {enviandoPago ? "Registrando..." : "Registrar Pago"}
                            </BtnSubmitPago>
                            <BtnAccion onClick={handleCancelarPago}>
                                <FaTimes /> Cancelar
                            </BtnAccion>
                        </FilaInputs>
                    </FormularioPago>
                </FormularioPagoContainer>
            )}

            {showHistorial && (
                <HistorialContainer>
                    {prestamo.pagos?.length > 0 ? (
                        prestamo.pagos.map((pago, i) => (
                            <PagoItem key={i}>
                                <PagoInfo>
                                    <PagoFecha>{formatFecha(pago.fecha)}</PagoFecha>
                                    <PagoMonto>{fnFormatMoney(pago.monto)}</PagoMonto>
                                </PagoInfo>
                                {pago.imagenUrl && (
                                    <BtnImagen href={pago.imagenUrl} target="_blank" rel="noreferrer">
                                        <FaImage /> Ver
                                    </BtnImagen>
                                )}
                            </PagoItem>
                        ))
                    ) : (
                        <SinPagos>Sin pagos registrados</SinPagos>
                    )}
                </HistorialContainer>
            )}
        </CardWrapper>
    );
};
