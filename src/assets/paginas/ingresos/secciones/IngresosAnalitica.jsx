import styled from "styled-components";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaBalanceScale, FaChartLine, FaClock, FaLightbulb, FaMoneyBillWave } from "react-icons/fa";
import {
  MESES_ANIO,
  esCobroConfirmado,
  fnFormatMoney,
  obtenerMontoRegistro,
} from "../../../funciones/ingresosCalculos";

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(83, 59, 143, .12);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 3px 12px rgba(83, 59, 143, .05);
`;

const Encabezado = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Titulo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;

  svg {
    flex: 0 0 auto;
    margin-top: 3px;
    color: var(--colorMorado);
  }

  h3 {
    margin: 0;
    color: #1a1a2e;
    font-size: 16px;
    font-weight: 800;
  }

  p {
    margin: 4px 0 0;
    color: #777;
    font-size: 12px;
    line-height: 1.45;
  }
`;

const EtiquetaVista = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 9px;
  border-radius: 8px;
  background: #f2effd;
  color: var(--colorMorado);
  font-size: 11px;
  font-weight: 800;
`;

const GraficaWrap = styled.div`
  width: 100%;
  height: 320px;

  @media (max-width: 600px) {
    height: 285px;
    margin-inline: -4px;
    width: calc(100% + 8px);
  }
`;

const Insights = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Insight = styled.article`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-height: 76px;
  padding: 12px;
  border: 1px solid ${({ $tone }) => ($tone === "warning" ? "#fde68a" : $tone === "positive" ? "#a7f3d0" : "#ddd6fe")};
  border-radius: 12px;
  background: ${({ $tone }) => ($tone === "warning" ? "#fffbeb" : $tone === "positive" ? "#ecfdf5" : "#faf8ff")};

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: ${({ $tone }) => ($tone === "warning" ? "#b7791f" : $tone === "positive" ? "#059669" : "var(--colorMorado)")};
  }

  strong {
    display: block;
    color: #29233a;
    font-size: 12px;
    line-height: 1.35;
  }

  span {
    display: block;
    margin-top: 3px;
    color: #6d6780;
    font-size: 11px;
    line-height: 1.4;
  }
`;

const formatoCorto = (valor) => {
  const numero = Number(valor || 0);
  if (Math.abs(numero) >= 1000000) return `$${(numero / 1000000).toFixed(1)} M`;
  if (Math.abs(numero) >= 1000) return `$${(numero / 1000).toFixed(0)} k`;
  return `$${Math.round(numero)}`;
};

const mesDeRegistro = (registro) => {
  const mes = Number(registro?.mes);
  if (mes >= 1 && mes <= 12) return mes - 1;
  const mesFecha = Number(String(registro?.fecha || "").split("-")[1]);
  return mesFecha >= 1 && mesFecha <= 12 ? mesFecha - 1 : null;
};

const perteneceAlAnio = (registro, year) => {
  const anio = Number(String(registro?.fecha || "").split("-")[0]);
  return !anio || anio === Number(year);
};

const construirMeses = (registros, year, empresaSeleccionada, empresas = []) => {
  const meses = MESES_ANIO.map((mes) => ({
    mes: mes.corto,
    cobrado: 0,
    pendiente: 0,
    promedio: 0,
    pagos: 0,
    horas: 0,
    dias: 0,
    valorHora: 0,
  }));

  registros
    .filter((registro) => perteneceAlAnio(registro, year))
    .filter((registro) => !empresaSeleccionada || registro.empresaId === empresaSeleccionada.id)
    .forEach((registro) => {
      const indice = mesDeRegistro(registro);
      if (indice === null) return;
      const fila = meses[indice];
      const monto = obtenerMontoRegistro(registro);
      const empresaDelRegistro = empresaSeleccionada || empresas.find((empresa) => empresa.id === registro.empresaId) || {};
      if (esCobroConfirmado(registro, empresaDelRegistro)) {
        fila.cobrado += monto;
        fila.pagos += 1;
      } else if (registro.estado === "Pendiente") {
        fila.pendiente += monto;
      }
      fila.horas += Number(registro.horasReportadas || 0);
      fila.dias += Number(registro.diasTrabajados || 0);
    });

  meses.forEach((fila) => {
    fila.promedio = fila.pagos ? fila.cobrado / fila.pagos : 0;
    fila.valorHora = fila.horas ? fila.cobrado / fila.horas : 0;
  });

  return meses;
};

const construirComparativa = (registros, year, empresas) => empresas.map((empresa) => {
  const propios = registros.filter((registro) => (
    registro.empresaId === empresa.id
    && perteneceAlAnio(registro, year)
    && esCobroConfirmado(registro, empresa)
  ));
  const total = propios.reduce((suma, registro) => suma + obtenerMontoRegistro(registro), 0);
  return {
    nombre: empresa.nombre?.length > 18 ? `${empresa.nombre.slice(0, 17)}…` : empresa.nombre,
    cobrado: total,
    color: empresa.color || "#533b8f",
  };
});

const construirInsights = (datos, registros, year, empresaSeleccionada, empresas = []) => {
  const cobrado = datos.reduce((suma, mes) => suma + mes.cobrado, 0);
  const pendiente = datos.reduce((suma, mes) => suma + mes.pendiente, 0);
  const horas = datos.reduce((suma, mes) => suma + mes.horas, 0);
  const mesesConPago = datos.filter((mes) => mes.cobrado > 0);
  const mejorMes = [...datos].sort((a, b) => b.cobrado - a.cobrado)[0];
  const propios = registros.filter((registro) => (
    perteneceAlAnio(registro, year)
    && (!empresaSeleccionada || registro.empresaId === empresaSeleccionada.id)
    && esCobroConfirmado(registro, empresaSeleccionada || empresas.find((empresa) => empresa.id === registro.empresaId) || {})
  ));
  const promedio = propios.length ? cobrado / propios.length : 0;
  const precioHora = Number(empresaSeleccionada?.precioHora || 0);
  const valorHora = horas ? cobrado / horas : 0;

  const conclusiones = [];
  if (mejorMes?.cobrado > 0) {
    conclusiones.push({
      tone: "positive",
      icon: <FaMoneyBillWave />,
      title: `Mes más fuerte: ${mejorMes.mes}`,
      text: `${fnFormatMoney(mejorMes.cobrado)} cobrados${cobrado ? ` (${Math.round((mejorMes.cobrado / cobrado) * 100)}% del total)` : ""}.`,
    });
  }
  if (empresaSeleccionada && horas > 0) {
    const diferencia = precioHora ? ((valorHora - precioHora) / precioHora) * 100 : null;
    conclusiones.push({
      tone: diferencia !== null && diferencia < -10 ? "warning" : "positive",
      icon: <FaClock />,
      title: `${fnFormatMoney(valorHora)} efectivos por hora`,
      text: diferencia === null
        ? `${horas.toFixed(1)} horas reportadas en el periodo.`
        : `${diferencia >= 0 ? "Por encima" : "Por debajo"} del precio configurado (${Math.abs(Math.round(diferencia))}%).`,
    });
  } else {
    conclusiones.push({
      tone: "neutral",
      icon: <FaBalanceScale />,
      title: `${fnFormatMoney(promedio)} promedio por pago`,
      text: `${propios.length} percepciones confirmadas en ${year}.`,
    });
  }
  if (pendiente > 0) {
    conclusiones.push({
      tone: "warning",
      icon: <FaLightbulb />,
      title: `${fnFormatMoney(pendiente)} por cobrar`,
      text: "Conviene revisar estos periodos antes de proyectar el siguiente mes.",
    });
  } else if (mesesConPago.length >= 2) {
    const minimo = Math.min(...mesesConPago.map((mes) => mes.cobrado));
    const maximo = Math.max(...mesesConPago.map((mes) => mes.cobrado));
    conclusiones.push({
      tone: "neutral",
      icon: <FaChartLine />,
      title: "Flujo sin pendientes",
      text: `La diferencia entre tu mes más alto y más bajo es de ${fnFormatMoney(maximo - minimo)}.`,
    });
  }

  return conclusiones.slice(0, 3);
};

export const IngresosAnalitica = ({
  registros = [],
  empresas = [],
  empresaSeleccionada = null,
  year,
}) => {
  const mensual = useMemo(
    () => construirMeses(registros, year, empresaSeleccionada, empresas),
    [empresaSeleccionada, empresas, registros, year]
  );
  const comparativa = useMemo(
    () => construirComparativa(registros, year, empresas),
    [empresas, registros, year]
  );
  const insights = useMemo(
    () => construirInsights(mensual, registros, year, empresaSeleccionada, empresas),
    [empresaSeleccionada, empresas, mensual, registros, year]
  );
  const esEmpresa = Boolean(empresaSeleccionada);

  return (
    <Panel aria-label="Analítica de ingresos">
      <Encabezado>
        <Titulo>
          <FaChartLine aria-hidden="true" />
          <div>
            <h3>{esEmpresa ? `Rendimiento mensual · ${empresaSeleccionada.nombre}` : "Lectura del flujo de ingresos"}</h3>
            <p>{esEmpresa ? "Compara lo cobrado con el valor efectivo de cada hora o pago." : "Identifica meses fuertes, pendientes y concentración por empresa."}</p>
          </div>
        </Titulo>
        <EtiquetaVista>{esEmpresa ? "Vista mensual" : "Vista consolidada"} · {year}</EtiquetaVista>
      </Encabezado>

      <GraficaWrap>
        <ResponsiveContainer width="100%" height="100%">
          {esEmpresa ? (
            <ComposedChart data={mensual} margin={{ top: 8, right: 10, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf6" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="monto" tickFormatter={formatoCorto} tick={{ fontSize: 10, fill: "#777" }} axisLine={false} tickLine={false} width={52} />
              <YAxis yAxisId="hora" orientation="right" tickFormatter={formatoCorto} tick={{ fontSize: 10, fill: "#777" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(value, key) => [key === "valorHora" ? fnFormatMoney(value) : fnFormatMoney(value), key === "cobrado" ? "Cobrado" : key === "pendiente" ? "Pendiente" : "Valor efectivo / hora"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e4def2", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="monto" dataKey="cobrado" name="Cobrado" fill={empresaSeleccionada.color || "#533b8f"} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="monto" dataKey="pendiente" name="Pendiente" fill="#f6c453" radius={[4, 4, 0, 0]} />
              <Line yAxisId="hora" type="monotone" dataKey="valorHora" name="Valor efectivo / hora" stroke="#e07a5f" strokeWidth={2.5} dot={{ r: 3, fill: "#e07a5f" }} connectNulls />
            </ComposedChart>
          ) : (
            <ComposedChart data={mensual} margin={{ top: 8, right: 10, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf6" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#777" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatoCorto} tick={{ fontSize: 10, fill: "#777" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(value, key) => [fnFormatMoney(value), key === "cobrado" ? "Cobrado" : key === "pendiente" ? "Pendiente" : "Promedio por pago"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e4def2", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cobrado" name="Cobrado" fill="#22a06b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendiente" name="Pendiente" fill="#f6c453" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="promedio" name="Promedio por pago" stroke="#533b8f" strokeWidth={2.5} dot={{ r: 3, fill: "#533b8f" }} connectNulls />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </GraficaWrap>

      {!esEmpresa && empresas.length > 1 && (
        <GraficaWrap style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={comparativa} layout="vertical" margin={{ top: 4, right: 14, left: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf6" horizontal={false} />
              <XAxis type="number" tickFormatter={formatoCorto} tick={{ fontSize: 10, fill: "#777" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nombre" width={112} tick={{ fontSize: 10, fill: "#4d4660" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [fnFormatMoney(value), "Cobrado"]} contentStyle={{ borderRadius: 10, border: "1px solid #e4def2", fontSize: 11 }} />
              <Bar dataKey="cobrado" name="Cobrado por empresa" fill="#533b8f" radius={[0, 5, 5, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </GraficaWrap>
      )}

      {insights.length > 0 && (
        <Insights>
          {insights.map((insight, index) => (
            <Insight key={`${insight.title}-${index}`} $tone={insight.tone}>
              {insight.icon}
              <div>
                <strong>{insight.title}</strong>
                <span>{insight.text}</span>
              </div>
            </Insight>
          ))}
        </Insights>
      )}
    </Panel>
  );
};

export default IngresosAnalitica;
