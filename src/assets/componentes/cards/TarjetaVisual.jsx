import styled from "styled-components";
import { useId } from "react";
import { motion as Motion } from "framer-motion";
import { FaStar, FaUniversity, FaWifi } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { obtenerFondoTarjeta } from "../../funciones/fondosTarjetas";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { Donut, resumenTarjeta } from "./cardCuentaTarjeta";

// Medidas en cqi: la tarjeta escala con el ancho de su Marco.
const formatear = formatearMonedaSegunPreferencia;

const Marco = styled.div`
  container-type: inline-size;
  width: 100%;
  aspect-ratio: 1.586;
`;

const Cara = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4.6cqi;
  padding: 5.4cqi 5.6cqi 4.8cqi;
  box-sizing: border-box;
  color: #ffffff;
  background-color: #1d1442;
  background-image:
    linear-gradient(125deg, rgba(10, 6, 30, 0.12), rgba(10, 6, 30, 0.55)),
    url(${({ $fondo }) => $fondo});
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: ${({ $plana }) => ($plana
    ? "0 10px 22px -12px rgba(8, 4, 24, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
    : "0 40px 70px -20px rgba(8, 4, 24, 0.75), 0 18px 30px -18px rgba(8, 4, 24, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.35)")};
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto 1fr auto;
  user-select: none;
  text-align: left;
`;

const Brillo = styled(Motion.div)`
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: soft-light;
`;

const Cabecera = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 2.4cqi;
  min-width: 0;
  padding-right: ${({ $conEsquina }) => ($conEsquina ? "9cqi" : "0")};
  font-size: 5.8cqi;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg { flex-shrink: 0; }
`;

const Esquina = styled.div`
  position: absolute;
  top: 4.6cqi;
  right: 4.6cqi;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 1.6cqi;
`;

const MarcaPreferida = styled.span`
  width: 6.6cqi;
  height: 6.6cqi;
  min-width: 18px;
  min-height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 248, 210, 0.94);
  color: #b88410;
  box-shadow: 0 3px 8px rgba(20, 12, 35, 0.25);
  font-size: max(9px, 3cqi);
`;

const Cuerpo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2.2cqi;
  min-width: 0;
`;

const FilaChip = styled.div`
  display: flex;
  align-items: center;
  gap: 3cqi;

  svg {
    font-size: 4.6cqi;
    transform: rotate(90deg);
    opacity: 0.9;
  }
`;

const Chip = styled.span`
  width: 11.2cqi;
  aspect-ratio: 1.3;
  border-radius: 1.7cqi;
  background:
    linear-gradient(90deg, transparent 32%, rgba(80, 60, 20, 0.35) 33%, transparent 34%, transparent 65%, rgba(80, 60, 20, 0.35) 66%, transparent 67%),
    linear-gradient(0deg, transparent 45%, rgba(80, 60, 20, 0.35) 46%, transparent 54%),
    linear-gradient(135deg, #f6e7b4, #c9a75a 55%, #f1dc9c);
  box-shadow: inset 0 0 0 1px rgba(90, 70, 20, 0.35);
`;

const Saldo = styled.span`
  font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 6.6cqi;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Detalle = styled.span`
  margin-top: -1cqi;
  color: rgba(255, 255, 255, 0.82);
  font-size: max(9px, 2.9cqi);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
`;

const DonaTarjeta = styled.div`
  grid-row: 2;
  grid-column: 2;
  align-self: center;
  width: 26cqi;
  display: grid;
  place-items: center;

  svg { width: 100% !important; height: auto; }
`;

const Pie = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2.4cqi;
  min-width: 0;

  small {
    display: block;
    color: rgba(255, 255, 255, 0.75);
    font-size: max(8px, 2.2cqi);
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  strong {
    display: block;
    font-size: max(10px, 3.1cqi);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  > div { min-width: 0; }
  > div:last-child { text-align: right; }
`;

const detalleDeCuenta = (cuenta, resumen) => {
  if (cuenta?.tipoDeCuenta === "credito" && Number(cuenta?.limiteDeCredito)) {
    return `Límite ${formatear(Number(cuenta.limiteDeCredito))}`;
  }
  if (Number(cuenta?.metaDeAhorro)) return `Meta ${formatear(Number(cuenta.metaDeAhorro))}`;
  return resumen.beneficiosCortos || "";
};

export const TarjetaVisual = ({ cuenta, titular, brillo, esquina, pieDerecho, plana = false, className, style }) => {
  const usuario = useAppStore((estado) => estado.usuario);
  const idDona = useId();
  const resumen = resumenTarjeta(cuenta);
  const fondo = obtenerFondoTarjeta(cuenta);
  const esCredito = cuenta?.tipoDeCuenta === "credito";
  const nombreTitular = titular
    || [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(" ")
    || "Titular";
  const detalle = detalleDeCuenta(cuenta, resumen);
  const conEsquina = Boolean(cuenta?.preferida || esquina);

  return (
    <Marco className={className} style={style}>
      <Cara $fondo={fondo} $plana={plana}>
        <Cabecera $conEsquina={conEsquina}>
          <FaUniversity aria-hidden="true" />
          <span>{cuenta?.nombre || "Sin nombre"}</span>
        </Cabecera>

        {conEsquina && (
          <Esquina>
            {cuenta?.preferida && (
              <MarcaPreferida title="Tarjeta preferida"><FaStar aria-hidden="true" /></MarcaPreferida>
            )}
            {esquina}
          </Esquina>
        )}

        <Cuerpo>
          <FilaChip>
            <Chip aria-hidden="true" />
            <FaWifi aria-hidden="true" />
          </FilaChip>
          <Saldo>{formatear(resumen.saldoTotal)}</Saldo>
          {detalle && <Detalle title={detalle}>{detalle}</Detalle>}
        </Cuerpo>

        <DonaTarjeta>
          <Donut porcentaje={resumen.porcentaje} fondo={fondo} cuentaId={`tv-${idDona}`} />
        </DonaTarjeta>

        <Pie>
          <div>
            <small>{esCredito ? "Corte · Pago" : "Tipo"}</small>
            <strong>
              {esCredito
                ? `${cuenta?.fechaDeCorte || "—"} · ${cuenta?.fechaLimiteDePago || "—"}`
                : adaptadorTxtLabel(tipoDeCuentaInput, cuenta?.tipoDeCuenta)}
            </strong>
          </div>
          {pieDerecho ?? (
            <div>
              <small>Titular</small>
              <strong>{nombreTitular}</strong>
            </div>
          )}
        </Pie>

        {brillo && <Brillo style={{ background: brillo }} />}
      </Cara>
    </Marco>
  );
};
