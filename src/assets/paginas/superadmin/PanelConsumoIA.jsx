import styled from "styled-components";
import { useEffect, useMemo, useState } from "react";
import { FaCoins } from "react-icons/fa";
import { claveMes, obtenerConsumoDelMes } from "../../funciones/firebase/consumoIA";
import { avisarError } from "../../funciones/utils/avisos";

/*
 * Consumo de tokens de la IA por persona en un mes (consumoIA). El costo es
 * estimado con las tarifas del Worker (wrangler.toml); sin tarifas queda en 0
 * y se muestran solo los tokens.
 */

const Panel = styled.section`
  margin-top: 18px;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  background: white;
  box-shadow: 0 12px 30px rgba(37, 24, 62, 0.06);
  padding: 18px;
`;

const Encabezado = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: #282132;
    font-size: 17px;
    letter-spacing: -0.02em;
  }
`;

const Chips = styled.div`
  display: flex;
  gap: 8px;
`;

const Chip = styled.button`
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.25)")};
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "var(--colorMorado)")};
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const Totales = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin: 14px 0 10px;
`;

const Total = styled.div`
  padding: 10px 12px;
  border-radius: 12px;
  background: #faf8ff;

  small {
    display: block;
    color: #716b79;
    font-size: 11px;
  }

  strong {
    color: #322b3d;
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
`;

const Lista = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Fila = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 13px;
`;

const Persona = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    color: #322b3d;
    font-size: 13px;
    font-weight: 800;
  }

  small {
    color: #716b79;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Cifra = styled.span`
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;

  strong {
    display: block;
    color: #322b3d;
    font-size: 14px;
  }

  small {
    color: #716b79;
    font-size: 11px;
  }
`;

const Nota = styled.p`
  margin: 12px 2px 0;
  color: #8a8494;
  font-size: 11px;
  line-height: 1.5;
`;

const MESES = [
  { desplazamiento: 0, etiqueta: "Este mes" },
  { desplazamiento: -1, etiqueta: "Mes pasado" },
];

const NOMBRES_LLAMADA = { captura: "asistente", analisis: "análisis", reporte: "reportes", respuesta: "respuestas amplias" };

const tokens = (n) => new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const dolares = (n) => new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: n < 1 ? 4 : 2,
}).format(n);

const detalleLlamadas = (llamadas) => Object.entries(llamadas)
  .filter(([, n]) => n > 0)
  .map(([tipo, n]) => `${n} ${NOMBRES_LLAMADA[tipo] || tipo}`)
  .join(" · ");

export const PanelConsumoIA = ({ personas = [] }) => {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [consumo, setConsumo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const mes = claveMes(desplazamiento);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    obtenerConsumoDelMes(mes)
      .then((lista) => { if (vigente) setConsumo(lista); })
      .catch((error) => avisarError("No se pudo cargar el consumo de la IA.", error))
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [mes]);

  const porUid = useMemo(() => Object.fromEntries(personas.map((persona) => [persona.uid, persona])), [personas]);
  const conCosto = consumo.some((fila) => fila.costoUSD > 0);
  const ordenado = useMemo(() => [...consumo].sort((a, b) => b.costoUSD - a.costoUSD
    || (b.tokensEntrada + b.tokensSalida) - (a.tokensEntrada + a.tokensSalida)), [consumo]);

  const total = consumo.reduce((suma, fila) => ({
    llamadas: suma.llamadas + fila.totalLlamadas,
    entrada: suma.entrada + fila.tokensEntrada,
    salida: suma.salida + fila.tokensSalida,
    costo: suma.costo + fila.costoUSD,
  }), { llamadas: 0, entrada: 0, salida: 0, costo: 0 });

  return (
    <Panel aria-labelledby="titulo-consumo-ia">
      <Encabezado>
        <h2 id="titulo-consumo-ia"><FaCoins aria-hidden /> Consumo de la IA</h2>
        <Chips role="group" aria-label="Mes">
          {MESES.map((opcion) => (
            <Chip
              key={opcion.desplazamiento}
              type="button"
              $activo={desplazamiento === opcion.desplazamiento}
              onClick={() => setDesplazamiento(opcion.desplazamiento)}
            >
              {opcion.etiqueta}
            </Chip>
          ))}
        </Chips>
      </Encabezado>

      <Totales>
        <Total><small>Llamadas</small><strong>{total.llamadas.toLocaleString("es-MX")}</strong></Total>
        <Total><small>Tokens de entrada</small><strong>{tokens(total.entrada)}</strong></Total>
        <Total><small>Tokens de salida</small><strong>{tokens(total.salida)}</strong></Total>
        {conCosto && <Total><small>Costo estimado</small><strong>{dolares(total.costo)}</strong></Total>}
      </Totales>

      {cargando && <Nota>Cargando…</Nota>}
      {!cargando && !ordenado.length && <Nota>Nadie ha usado la IA en este mes (o aún no se configura el registro).</Nota>}

      <Lista>
        {ordenado.map((fila) => {
          const persona = porUid[fila.uid];
          const nombre = persona ? [persona.nombres, persona.apellidos].filter(Boolean).join(" ") || "Sin nombre" : "Cuenta desconocida";
          return (
            <Fila key={fila.uid}>
              <Persona>
                <strong>{nombre}</strong>
                <small>{detalleLlamadas(fila.llamadas) || "Sin llamadas"}</small>
                <small>{persona?.email || persona?.correo || fila.uid}</small>
              </Persona>
              <Cifra>
                <strong>{conCosto ? dolares(fila.costoUSD) : `${tokens(fila.tokensEntrada + fila.tokensSalida)} tokens`}</strong>
                <small>
                  {tokens(fila.tokensEntrada)} entrada · {tokens(fila.tokensSalida)} salida
                  {fila.tokensRazonamiento ? ` (${tokens(fila.tokensRazonamiento)} razonando)` : ""}
                </small>
              </Cifra>
            </Fila>
          );
        })}
      </Lista>

      <Nota>
        Lo suma el Worker en cada llamada a OpenAI, incluso si la respuesta falla. El costo es estimado con las tarifas configuradas en el Worker; la factura real está en el panel de OpenAI.
      </Nota>
    </Panel>
  );
};
