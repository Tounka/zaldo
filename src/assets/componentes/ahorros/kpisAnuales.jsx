import styled from "styled-components";
import { useState } from "react";
import { FaBullseye, FaCalendarAlt, FaChartLine, FaEdit, FaCheck } from "react-icons/fa";
import { TrendingUp, Target, Calendar, Wallet } from "lucide-react";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 700px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const Card = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
`;

const IconoFondo = styled.div`
  position: absolute;
  top: -10px;
  right: -10px;
  opacity: 0.06;
  color: var(--colorMorado);
  pointer-events: none;

  svg {
    width: 64px;
    height: 64px;
  }
`;

const CardLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #8a8a9a;
  z-index: 1;

  svg {
    font-size: 11px;
  }
`;

const CardValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  z-index: 1;

  ${({ $color }) => $color && `color: ${$color};`}
`;

const CardSub = styled.div`
  font-size: 11px;
  color: #8a8a9a;
  z-index: 1;
`;

const InputMeta = styled.input`
  width: 100%;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  text-align: right;
  z-index: 1;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const BtnEditar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(83, 59, 143, 0.06);
  color: var(--colorMorado);
  cursor: pointer;
  margin-left: auto;
  z-index: 1;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.12);
  }

  svg {
    font-size: 10px;
  }
`;

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

const calcularDiasTranscurridos = (fechaInicio) => {
    if (!fechaInicio) return 0;
    const inicio = fechaInicio?.seconds
        ? new Date(fechaInicio.seconds * 1000)
        : new Date(fechaInicio);
    return Math.max(1, Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
};

const formatFechaCorta = (fechaInicio) => {
    if (!fechaInicio) return "—";
    const d = fechaInicio?.seconds
        ? new Date(fechaInicio.seconds * 1000)
        : new Date(fechaInicio);
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const KpisAnuales = ({ historial = [], kpis = {}, onActualizarMeta }) => {
    const [editandoMeta, setEditandoMeta] = useState(false);
    const [valorMeta, setValorMeta] = useState(kpis.metaAnual || "");

    const cantidadInicial = historial.length > 0 ? historial[0].capitalTotal : 0;
    const cantidadActual = historial.length > 0 ? historial[historial.length - 1].capitalTotal : 0;
    const aumento = cantidadInicial > 0 ? ((cantidadActual - cantidadInicial) / cantidadInicial) * 100 : 0;
    const metaAnual = kpis.metaAnual || 0;
    const diferencia = cantidadActual - metaAnual;
    const diasTranscurridos = calcularDiasTranscurridos(
        historial.length > 0 ? historial[0].fecha : null
    );
    const fechaInicio = historial.length > 0 ? formatFechaCorta(historial[0].fecha) : "—";

    const handleGuardarMeta = () => {
        onActualizarMeta(Number(valorMeta) || 0);
        setEditandoMeta(false);
    };

    return (
        <Grid>
            <Card>
                <IconoFondo><Wallet /></IconoFondo>
                <CardLabel>
                    <FaChartLine /> Cantidad Inicial
                </CardLabel>
                <CardValue>{formatMoney(cantidadInicial)}</CardValue>
                <CardSub>{fechaInicio}</CardSub>
            </Card>

            <Card>
                <IconoFondo><TrendingUp /></IconoFondo>
                <CardLabel>
                    <FaChartLine /> Cantidad Actual
                </CardLabel>
                <CardValue>{formatMoney(cantidadActual)}</CardValue>
                <CardSub>
                    {aumento >= 0 ? "+" : ""}
                    {aumento.toFixed(1)}% de aumento
                </CardSub>
            </Card>

            <Card>
                <IconoFondo><Target /></IconoFondo>
                <CardLabel>
                    <FaBullseye /> Meta Anual
                    <BtnEditar onClick={() => {
                        setEditandoMeta(!editandoMeta);
                        setValorMeta(metaAnual || "");
                    }}>
                        {editandoMeta ? <FaCheck /> : <FaEdit />}
                    </BtnEditar>
                </CardLabel>
                {editandoMeta ? (
                    <InputMeta
                        type="number"
                        value={valorMeta}
                        onChange={(e) => setValorMeta(e.target.value)}
                        onBlur={handleGuardarMeta}
                        onKeyDown={(e) => e.key === "Enter" && handleGuardarMeta()}
                        autoFocus
                        min="0"
                        step="1000"
                    />
                ) : (
                    <CardValue>{formatMoney(metaAnual)}</CardValue>
                )}
                <CardSub>
                    {metaAnual > 0
                        ? diferencia >= 0
                            ? `+$${formatMoney(diferencia).slice(1)} sobre meta`
                            : `Faltan ${formatMoney(Math.abs(diferencia))}`
                        : "Sin meta definida"}
                </CardSub>
            </Card>

            <Card>
                <IconoFondo><Calendar /></IconoFondo>
                <CardLabel>
                    <FaCalendarAlt /> Días Transcurridos
                </CardLabel>
                <CardValue>{diasTranscurridos}</CardValue>
                <CardSub>
                    {metaAnual > 0 && diasTranscurridos > 0
                        ? `Ritmo: ${formatMoney(cantidadActual / diasTranscurridos)}/día`
                        : ""}
                </CardSub>
            </Card>
        </Grid>
    );
};
