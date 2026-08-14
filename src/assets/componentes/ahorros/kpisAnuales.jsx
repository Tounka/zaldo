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

const toDate = (valor) => {
    if (!valor) return null;
    const d = valor?.seconds ? new Date(valor.seconds * 1000) : new Date(valor);
    return isNaN(d.getTime()) ? null : d;
};

const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/*
 * El snapshot inicial es el día 0: es el punto de partida, no un día de ahorro.
 * Si el día 1 metes dinero, ese dinero es incremento sobre la cantidad inicial,
 * y el ritmo se divide entre 1 día. Forzar un mínimo de 1 (como se hacía antes)
 * inventaba un día que no había transcurrido y contaba la apertura como avance.
 */
const calcularDiasTranscurridos = (fechaInicio, fechaFin) => {
    const inicio = toDate(fechaInicio);
    if (!inicio) return 0;
    const fin = toDate(fechaFin) || new Date();
    const dias = Math.floor(
        (inicioDelDia(fin).getTime() - inicioDelDia(inicio).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, dias);
};

const formatFechaCorta = (fechaInicio) => {
    const d = toDate(fechaInicio);
    if (!d) return "—";
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const KpisAnuales = ({ historial = [], kpis = {}, esAnioActivo = true, onActualizarMeta }) => {
    const [editandoMeta, setEditandoMeta] = useState(false);
    const [valorMeta, setValorMeta] = useState(kpis.metaAnual || "");

    const primero = historial.length > 0 ? historial[0] : null;
    const ultimo = historial.length > 0 ? historial[historial.length - 1] : null;

    /*
     * La cantidad inicial es la línea base del año y no debe moverse nunca.
     * Vive en `kpis.capitalInicial`, fuera de `historial`, porque los snapshots
     * del historial se reescriben al editar cuentas: si la edición cae el mismo
     * día en que se abrió el año, sobrescribía la apertura.
     * Los documentos creados antes de este cambio no la tienen, así que se
     * recurre al primer snapshot.
     */
    const tieneBase = kpis.capitalInicial !== undefined && kpis.capitalInicial !== null;
    const cantidadInicial = tieneBase
        ? Number(kpis.capitalInicial)
        : Number(primero?.capitalTotal || 0);
    const cantidadActual = Number(ultimo?.capitalTotal || 0);
    const incremento = cantidadActual - cantidadInicial;
    const aumento = cantidadInicial > 0 ? (incremento / cantidadInicial) * 100 : 0;
    const metaAnual = kpis.metaAnual || 0;
    const diferencia = cantidadActual - metaAnual;

    // En un año ya cerrado los días se cuentan hasta el último snapshot,
    // no hasta hoy: si no, el ritmo se diluye cada día que pasa.
    // Misma razón que la cantidad inicial: la fecha base viene de kpis, no del
    // primer snapshot, que puede reescribirse.
    const fechaBase = kpis.fechaInicio || primero?.fecha || null;
    const diasTranscurridos = calcularDiasTranscurridos(
        fechaBase,
        esAnioActivo ? null : ultimo?.fecha
    );
    // El ritmo mide lo ahorrado en el periodo, no el capital acumulado.
    const ritmoDiario = diasTranscurridos > 0 ? incremento / diasTranscurridos : 0;
    const fechaInicio = fechaBase ? formatFechaCorta(fechaBase) : "—";

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
                <CardSub>
                    {/* Si la base viene de kpis es el cierre del año anterior; si
                        no, es el primer registro que se capturó. */}
                    {tieneBase ? `Cierre anterior · ${fechaInicio}` : fechaInicio}
                </CardSub>
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
                    {historial.length === 0
                        ? "Sin historial"
                        : diasTranscurridos === 0
                            // Día 0: el punto de partida. Dividir entre 0 días daría
                            // un ritmo infinito o falso, así que no se muestra.
                            ? "Punto de partida"
                            : `Ritmo: ${formatMoney(ritmoDiario)}/día`}
                </CardSub>
            </Card>
        </Grid>
    );
};
