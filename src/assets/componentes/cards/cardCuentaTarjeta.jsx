import styled from "styled-components";
import { TxtGenerico } from "../genericos/titulos";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";
import { FaStar } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { obtenerEstadoPagoTarjeta } from "../../funciones/utils/tarjetasCredito";

const Donut = ({ porcentaje, fondo, cuentaId }) => {
    const radio = 30;
    const circunferencia = 2 * Math.PI * radio;
    const progreso = (porcentaje / 100) * circunferencia;
    const idBase = String(cuentaId || "cuenta").replace(/[^a-zA-Z0-9_-]/g, "-");
    const clipId = `donut-background-${idBase}`;

    return (
        <svg
            height="90%"
            width="auto"
            viewBox="0 0 80 80"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <clipPath id={clipId}>
                    <circle cx="40" cy="40" r={radio} />
                </clipPath>
            </defs>
            <image
                href={fondo}
                x="10"
                y="10"
                width="60"
                height="60"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
            />
            <circle
                cx="40"
                cy="40"
                r={radio}
                fill="rgba(16, 9, 35, 0.36)"
                stroke="rgba(255,255,255,0.24)"
                strokeWidth="8"
            />
            <circle
                cx="40"
                cy="40"
                r={radio}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
                fill="none"
            />
            <circle
                cx="40"
                cy="40"
                r={radio}
                stroke="var(--colorBlanco)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circunferencia}
                strokeDashoffset={circunferencia - progreso}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
            />
            <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
            >
                {`${porcentaje}%`}
            </text>
        </svg>
    );
};



// 🟦 Estilos

const ContenedorCardTarjetaStyled = styled.div`
  width: clamp(240px, 30dvw, 360px);
  min-width: 220px;
  min-height: 185px;
  aspect-ratio: 1.62;
  display: grid;
  grid-template-rows: 34px minmax(100px, 1fr) auto;
  position: relative;

  padding: 12px;
  overflow: hidden;
  border-radius: 5px;
  border-right: 6px solid ${({ $estadoPago }) => $estadoPago?.color || "transparent"};
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease;
  background-color: transparent;
  background-image: linear-gradient(120deg, rgba(15, 10, 30, .08), rgba(15, 10, 30, .28)), url(${({ $fondo }) => $fondo});
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;

  &:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(27, 14, 48, .22); }
  
  @media (max-width: 800px) {
      width: min(43dvw, 360px);
  }
  @media (max-width: 500px) {
      grid-template-rows: 30px minmax(100px, 1fr) auto;
      width: 100%;
      min-height: 180px;
  }
`;

const ContenedorTitular = styled.div`
    width: 100%;
    height: 34px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
`
const MarcaPreferida = styled.span`
    position: absolute;
    top: 10px;
    right: 10px;
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 248, 210, .92);
    color: #b88410;
    box-shadow: 0 3px 8px rgba(20, 12, 35, .18);
    font-size: 12px;
`
const ContenedorPrincipal = styled.div`
    display: grid;
    height: 100%;
    grid-template-columns: 1fr 1fr;
    place-items: center;
`
const ContenedorGenerico = styled.div`
    display: flex;
    flex-direction: column;
    justify-content:center;
    align-items: center;
    width: 100%;
    text-align: center;
    p{
        width: 100%;
        text-align: center;
    }
`
const TxtCard = styled(TxtGenerico)`
    font-size: 18px;
    @media (max-width: 600px) {
        font-size: 16px;
    }
    @media (max-width: 400px) {
        font-size: 14px;
    }
`
const PieTarjeta = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 0;
    width: 100%;
    color: white;
    font-size: 12px;
    text-align: center;

    span:first-child { font-weight: 800; }
    span:last-child {
      overflow: hidden;
      color: rgba(255,255,255,.83);
      font-size: 10px;
      font-weight: 600;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
`
const EstadoPago = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .88);
  color: ${({ $color }) => $color};
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
// 🔷 Componente principal
export const CardCuentaTarjeta = ({ cuenta }) => {
  const { setCuentaSeleccionada } = useAppStore();
  const { setIsOpenModificarTarjeta } = useModalStore();

  const saldoNormal = cuenta?.saldoALaFecha ?? 0
  const saldoMSI = cuenta?.saldoALaFechaMSI ?? 0
  const saldoTotal = saldoNormal + saldoMSI
  const saldoAbsoluto = Math.abs(saldoTotal)

  let textoLateral = `$${saldoAbsoluto}`
  let textoFechaDeCorte = ""
  let porcentaje = 0

  const tipoDeCuenta = cuenta?.tipoDeCuenta
  const estadoPago = tipoDeCuenta === "credito"
    ? obtenerEstadoPagoTarjeta(cuenta)
    : null
  const beneficiosCortos = String(cuenta?.beneficiosMarkdown || "")
    .replace(/\*\*|_/g, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/\n+/g, " · ")
    .trim()

  // 🔹 CRÉDITO
  if (tipoDeCuenta === "credito") {
    if (cuenta?.limiteDeCredito) {
      textoLateral = `$${saldoAbsoluto} / $${cuenta.limiteDeCredito}`

      porcentaje = Math.min(
        100,
        Math.round((saldoAbsoluto / cuenta.limiteDeCredito) * 100)
      )
    }

    if (cuenta?.fechaDeCorte >= 1) {
      textoFechaDeCorte = `Corte: ${cuenta.fechaDeCorte} · Pago: ${cuenta?.fechaLimiteDePago || "—"}`
    }
  }

  // 🔹 DÉBITO / EFECTIVO
  if (tipoDeCuenta === "debito" || tipoDeCuenta === "efectivo") {
    porcentaje = cuenta?.metaDeAhorro
      ? Math.min(
          100,
          Math.round((saldoAbsoluto / cuenta.metaDeAhorro) * 100)
        )
      : 0
  }

  // 🔹 INVERSIÓN
  if (
    tipoDeCuenta === "inversion" &&
    cuenta?.fechaInicioInversion &&
    cuenta?.fechaFinalInversion
  ) {
    const totalMs =
      cuenta.fechaFinalInversion.toMillis() -
      cuenta.fechaInicioInversion.toMillis()

    const pasadoMs =
      Date.now() - cuenta.fechaInicioInversion.toMillis()

    const porcentajeRaw = (pasadoMs / totalMs) * 100

    porcentaje = Math.min(100, Math.max(0, Math.round(porcentajeRaw)))
  }

  // 🔥 Color coherente con saldo real
  const enPositivo = !(tipoDeCuenta === "credito" && saldoTotal < 0)

  return (
    <ContenedorCardTarjetaStyled
      enPositivo={enPositivo}
      $estadoPago={estadoPago}
      $fondo={obtenerFondoTarjeta(cuenta)}
      role="button"
      tabIndex={0}
      aria-label={`Editar tarjeta ${cuenta?.nombre || ""}`}
      onClick={() => { setCuentaSeleccionada(cuenta); setIsOpenModificarTarjeta(true); }}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setCuentaSeleccionada(cuenta); setIsOpenModificarTarjeta(true); } }}
    >
      {cuenta?.preferida && <MarcaPreferida title={cuenta?.beneficiosMarkdown || "Tarjeta preferida"}><FaStar /></MarcaPreferida>}
      <ContenedorTitular>
        <TxtGenerico size="24px" color="var(--colorBlanco)" weight="bold">
          {cuenta?.nombre}
        </TxtGenerico>
      </ContenedorTitular>

      <ContenedorPrincipal>
        <ContenedorGenerico>
          <TxtCard aling="start" color="var(--colorBlanco)">
            {textoLateral}
          </TxtCard>
          <TxtCard aling="start" color="var(--colorBlanco)">
            {textoFechaDeCorte}
          </TxtCard>
        </ContenedorGenerico>

        <ContenedorGenerico>
          <Donut
            porcentaje={porcentaje}
            fondo={obtenerFondoTarjeta(cuenta)}
            cuentaId={cuenta?.id || cuenta?.nombre}
          />
        </ContenedorGenerico>
      </ContenedorPrincipal>

      <PieTarjeta title={cuenta?.beneficiosMarkdown || ""}>
        <span>{adaptadorTxtLabel(tipoDeCuentaInput, tipoDeCuenta)}</span>
        {estadoPago && <EstadoPago $color={estadoPago.color}>{estadoPago.etiqueta}</EstadoPago>}
        {beneficiosCortos && <span>{beneficiosCortos}</span>}
      </PieTarjeta>
    </ContenedorCardTarjetaStyled>
  )
}

