import styled from "styled-components";
import { useState } from "react";
import Swal from "sweetalert2";
import { FaEdit, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import {
  BotonAyuda,
  ContenedorBottom,
  ContenedorDetalle,
  ContenedorResumenCuenta,
  ContenedorTop,
} from "../cards/CardResumenCuentaHome";
import { rendimientoTotalAnio } from "../../funciones/ahorrosRendimientos";

/*
 * Mismas tarjetas que el resumen del Home: banda morada con el título, monto
 * al centro y una franja inferior con el detalle. Las piezas vienen de
 * CardResumenCuentaHome para que ambas pantallas se vean idénticas.
 */
/* Cinco tarjetas con el mismo acomodo que el Home: 3 + 2 centradas en celular. */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
  gap: 10px;

  @media (max-width: 800px) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 5px;

    & > * {
      grid-column: span 2;
    }

    & > :nth-child(4) {
      grid-column: 2 / span 2;
    }

    & > :nth-child(5) {
      grid-column: 4 / span 2;
    }
  }

  @media (max-width: 500px) {
    gap: 3px;
  }
`;

const Tarjeta = styled(ContenedorResumenCuenta)`
  /* Todas llevan franja de detalle, aunque el monto no sea moneda. */
  font-variant-numeric: tabular-nums;
`;

/* Botón de editar en la banda: mismo lugar y tamaño que el "?" de Balance. */
const BotonBanda = styled(BotonAyuda)`
  svg { font-size: 10px; }

  @media (max-width: 500px) {
    svg { font-size: 8px; }
  }
`;

const InputMeta = styled.input`
  width: calc(100% - 20px);
  max-width: 180px;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.3);
  border-radius: 8px;
  padding: 4px 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--colorMorado);
  text-align: center;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.12);
  }

  @media (max-width: 500px) {
    font-size: 16px;
    padding: 2px 6px;
  }
`;

const Detalle = styled(ContenedorDetalle)`
  min-width: 0;

  span, strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  strong {
    color: ${({ $color }) => $color || "var(--colorMorado)"};
  }
`;

const DetalleAviso = styled(Detalle)`
  color: #a0521d;
  background: #fff8ef;
  cursor: help;

  svg { flex-shrink: 0; }
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

export const KpisAnuales = ({
    historial = [],
    kpis = {},
    esAnioActivo = true,
    onActualizarMeta,
    onActualizarCapitalInicial,
}) => {
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

    // Base en 0 con historial por arriba de 0: todo el capital cuenta como ahorro.
    const primerRegistro = historial.find((h) => h.nota !== "Apertura (corte anual)");
    const baseSospechosa = tieneBase && Number(kpis.capitalInicial) === 0
        && Number(primerRegistro?.capitalTotal || 0) > 0;

    /*
     * La línea base se congela a propósito para que ninguna edición la mueva,
     * así que cambiarla es una acción explícita y confirmada.
     */
    const handleEditarCapitalInicial = async () => {
        const sugerido = baseSospechosa ? Number(primerRegistro.capitalTotal) : cantidadInicial;
        const { value, isConfirmed } = await Swal.fire({
            title: "Cantidad Inicial del año",
            html: `
                <div style="text-align:left;font-size:13px;line-height:1.6;color:#555">
                    Es la base contra la que se mide el ahorro del año: lo que el año anterior cerró.
                    ${primerRegistro ? `<br/>Primer registro: <b>${formatMoney(primerRegistro.capitalTotal)}</b> (${primerRegistro.fechaKey})` : ""}
                </div>`,
            input: "number",
            inputValue: sugerido,
            inputAttributes: { min: "0", step: "0.01", inputmode: "decimal" },
            showCancelButton: true,
            confirmButtonText: "Guardar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#533b8f",
            inputValidator: (v) => (v === "" || !Number.isFinite(Number(v)) || Number(v) < 0
                ? "Escribe un monto válido"
                : undefined),
        });
        if (isConfirmed) onActualizarCapitalInicial(Number(value));
    };

    const handleGuardarMeta = () => {
        onActualizarMeta(Number(valorMeta) || 0);
        setEditandoMeta(false);
    };

    // Rendimiento del año: lo que no se marcó como aumento a capital u otro origen.
    const rendimiento = rendimientoTotalAnio(historial, tieneBase ? kpis.capitalInicial : null);
    const tasaRendimiento = diasTranscurridos >= 7 && cantidadInicial > 0
        ? (rendimiento / cantidadInicial) * (365 / diasTranscurridos) * 100
        : null;

    const textoMeta = metaAnual > 0
        ? diferencia >= 0
            ? `+${formatMoney(diferencia)} sobre meta`
            : `Faltan ${formatMoney(Math.abs(diferencia))}`
        : "Sin meta definida";

    const textoDias = historial.length === 0
        ? "Sin historial"
        // Día 0: el punto de partida. Dividir entre 0 días daría un ritmo
        // infinito o falso, así que no se muestra.
        : diasTranscurridos === 0
            ? "Punto de partida"
            : null;

    return (
        <Grid data-tour="ahorros-kpis">
            <Tarjeta $tieneDetalle>
                <ContenedorTop>
                    Cantidad inicial
                    {onActualizarCapitalInicial && (
                        <BotonBanda
                            type="button"
                            onClick={handleEditarCapitalInicial}
                            aria-label="Editar cantidad inicial"
                            title="Editar cantidad inicial"
                        >
                            <FaEdit aria-hidden="true" />
                        </BotonBanda>
                    )}
                </ContenedorTop>
                <ContenedorBottom>{formatMoney(cantidadInicial)}</ContenedorBottom>
                {baseSospechosa ? (
                    <DetalleAviso
                        title={`Está en $0 y el primer registro es ${formatMoney(primerRegistro.capitalTotal)}. Revísala.`}
                    >
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>Base en $0 · revísala</span>
                    </DetalleAviso>
                ) : (
                    <Detalle>
                        {/* Si la base viene de kpis es el cierre del año anterior; si
                            no, es el primer registro que se capturó. */}
                        <span>{tieneBase ? `Cierre · ${fechaInicio}` : fechaInicio}</span>
                    </Detalle>
                )}
            </Tarjeta>

            <Tarjeta $tieneDetalle>
                <ContenedorTop>Cantidad actual</ContenedorTop>
                <ContenedorBottom>{formatMoney(cantidadActual)}</ContenedorBottom>
                <Detalle $color={aumento >= 0 ? "#1f8a52" : "#c2303c"}>
                    <span>Aumento</span>
                    <strong>{aumento >= 0 ? "+" : ""}{aumento.toFixed(1)}%</strong>
                </Detalle>
            </Tarjeta>

            <Tarjeta $tieneDetalle>
                <ContenedorTop>
                    Meta anual
                    <BotonBanda
                        type="button"
                        onClick={() => {
                            setEditandoMeta(!editandoMeta);
                            setValorMeta(metaAnual || "");
                        }}
                        aria-label={editandoMeta ? "Guardar meta anual" : "Editar meta anual"}
                        title={editandoMeta ? "Guardar meta" : "Editar meta"}
                    >
                        {editandoMeta ? <FaCheck aria-hidden="true" /> : <FaEdit aria-hidden="true" />}
                    </BotonBanda>
                </ContenedorTop>
                <ContenedorBottom>
                    {editandoMeta ? (
                        <InputMeta
                            type="number" inputMode="decimal"
                            value={valorMeta}
                            onChange={(e) => setValorMeta(e.target.value)}
                            onBlur={handleGuardarMeta}
                            onKeyDown={(e) => e.key === "Enter" && handleGuardarMeta()}
                            aria-label="Meta anual"
                            autoFocus
                            min="0"
                            step="1000"
                        />
                    ) : formatMoney(metaAnual)}
                </ContenedorBottom>
                <Detalle $color={diferencia >= 0 ? "#1f8a52" : "#c2303c"}>
                    {metaAnual > 0
                        ? <strong title={textoMeta}>{textoMeta}</strong>
                        : <span>{textoMeta}</span>}
                </Detalle>
            </Tarjeta>

            <Tarjeta $tieneDetalle>
                <ContenedorTop>Días transcurridos</ContenedorTop>
                <ContenedorBottom>{diasTranscurridos}</ContenedorBottom>
                <Detalle>
                    {textoDias ? <span>{textoDias}</span> : (
                        <>
                            <span>Ritmo</span>
                            <strong>{formatMoney(ritmoDiario)}/día</strong>
                        </>
                    )}
                </Detalle>
            </Tarjeta>

            <Tarjeta $tieneDetalle title="Cambios de saldo que no marcaste como aumento a capital u otro origen. Los movimientos entre cuentas se compensan.">
                <ContenedorTop>Rendimientos</ContenedorTop>
                <ContenedorBottom>{formatMoney(rendimiento)}</ContenedorBottom>
                <Detalle $color={rendimiento >= 0 ? "#1f8a52" : "#c2303c"}>
                    {tasaRendimiento === null ? <span>Del año</span> : (
                        <>
                            <span>Aprox.</span>
                            <strong>{tasaRendimiento >= 0 ? "+" : ""}{tasaRendimiento.toFixed(1)}% anual</strong>
                        </>
                    )}
                </Detalle>
            </Tarjeta>
        </Grid>
    );
};
