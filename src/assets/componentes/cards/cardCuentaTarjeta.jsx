import styled from "styled-components";
import { TxtGenerico } from "../genericos/titulos";
import { tipoDeCuentaEsqueletos, tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";

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
  grid-template-rows: 40px auto 30px;
  
  
  
  padding: 10px;
  overflow: hidden;
  border-radius: 5px;
  background-color: ${({ enPositivo }) => enPositivo ? "var(--colorPrincipal)" : "var(--colorRojo)"} ;
  
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
// 🔷 Componente principal
export const CardCuentaTarjeta = ({ cuenta }) => {

  const saldoNormal = cuenta?.saldoALaFecha ?? 0
  const saldoMSI = cuenta?.saldoALaFechaMSI ?? 0
  const saldoTotal = saldoNormal + saldoMSI
  const saldoAbsoluto = Math.abs(saldoTotal)

  let textoLateral = `$${saldoAbsoluto}`
  let textoFechaDeCorte = ""
  let porcentaje = 0

  const tipoDeCuenta = cuenta?.tipoDeCuenta

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
    <ContenedorCardTarjetaStyled enPositivo={enPositivo}>
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

      <TxtCard aling="start" size="18px" color="var(--colorBlanco)">
        {adaptadorTxtLabel(tipoDeCuentaInput, tipoDeCuenta)}
      </TxtCard>
    </ContenedorCardTarjetaStyled>
  )
}

