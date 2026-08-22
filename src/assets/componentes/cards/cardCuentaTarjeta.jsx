import styled from "styled-components";
import { TxtGenerico } from "../genericos/titulos";
import { tipoDeCuentaEsqueletos, tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";
import { FaStar } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";

const Donut = ({ porcentaje }) => {
    const radio = 30;
    const circunferencia = 2 * Math.PI * radio;
    const progreso = (porcentaje / 100) * circunferencia;

    return (
        <svg
            height="90%"
            width="auto"
            viewBox="0 0 80 80"
            preserveAspectRatio="xMidYMid meet"
        >
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
  width: 30dvw; 
  min-width: 220px;
  height: auto;
  display: grid;
  grid-template-rows: 40px auto auto;
  position: relative;
  
  
  
  padding: 10px;
  overflow: hidden;
  border-radius: 5px;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease;
  background-color: ${({ enPositivo }) => enPositivo ? "var(--colorPrincipal)" : "var(--colorRojo)"};
  background-image: linear-gradient(120deg, rgba(15, 10, 30, .14), rgba(15, 10, 30, .48)), url(${({ $fondo }) => $fondo});
  background-position: center;
  background-size: cover;

  &:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(27, 14, 48, .22); }
  
  @media (max-width: 800px) {
      width: 43dvw; 
      
  }
  @media (max-width: 500px) {
      grid-template-rows: 30px 100px 20px;
      width: 100%;
      height: 180px;
      
  }
`;

const ContenedorTitular = styled.div`
    width: 100%;
    height: 40px;
    display: flex;
    justify-content: center;
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
    grid-template-columns:3fr 2fr;
`
const ContenedorGenerico = styled.div`
    display: flex;
    flex-direction: column;
    justify-content:center;
    align-items: center;
    width: 100%;
    p{
        width: 100%;
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
    align-items: end;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    color: white;
    font-size: 12px;

    span:first-child { font-weight: 800; }
    span:last-child {
      overflow: hidden;
      color: rgba(255,255,255,.83);
      font-size: 10px;
      font-weight: 600;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
`
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

    if (cuenta?.fechaDeCorte >= 0) {
      textoFechaDeCorte = `Fecha de corte: ${cuenta.fechaDeCorte}`
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
          <Donut porcentaje={porcentaje} />
        </ContenedorGenerico>
      </ContenedorPrincipal>

      <PieTarjeta title={cuenta?.beneficiosMarkdown || ""}>
        <span>{adaptadorTxtLabel(tipoDeCuentaInput, tipoDeCuenta)}</span>
        {beneficiosCortos && <span>{beneficiosCortos}</span>}
      </PieTarjeta>
    </ContenedorCardTarjetaStyled>
  )
}

