import { useState } from "react";
import styled from "styled-components";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const Container = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Titulo = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
`;

const LeyendaPersonalizada = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const ItemLeyenda = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #8a8a9a;
  cursor: pointer;
  opacity: ${({ $oculto }) => ($oculto ? 0.4 : 1)};
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 1;
  }
`;

const PuntoColor = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const Vacio = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  font-size: 13px;
  color: #8a8a9a;
`;

const COLORES = {
    capitalTotal: "#533b8f",
    liquido: "#006c67",
    inversiones: "#b494f1",
    inversionesLargo: "#cca43b",
    responsabilidades: "#db2b39",
};

const NOMBRES = {
    capitalTotal: "Capital Total",
    liquido: "Líquido",
    inversiones: "Inversiones",
    inversionesLargo: "A Largo Plazo",
    responsabilidades: "Responsabilidades",
};

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
    });

const formatFecha = (fechaKey) => {
    if (!fechaKey) return "";
    const [, month, day] = fechaKey.split("-");
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${parseInt(day)} ${meses[parseInt(month) - 1]}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "white",
                border: "1px solid rgba(83, 59, 143, 0.15)",
                borderRadius: "8px",
                padding: "12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}
        >
            <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "#1a1a2e" }}>
                {formatFecha(label)}
            </p>
            {payload.map((entry) => (
                <p
                    key={entry.name}
                    style={{
                        margin: "2px 0",
                        fontSize: "11px",
                        color: entry.color,
                        fontWeight: 600,
                    }}
                >
                    {NOMBRES[entry.name]}: {formatMoney(entry.value)}
                </p>
            ))}
        </div>
    );
};

export const GraficaHistorial = ({ historial = [] }) => {
    const [lineasVisibles, setLineasVisibles] = useState({
        capitalTotal: true,
        liquido: true,
        inversiones: true,
        inversionesLargo: true,
        responsabilidades: true,
    });

    const toggleLinea = (key) => {
        setLineasVisibles((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (historial.length < 2) {
        return (
            <Container>
                <Titulo>Evolución del Capital</Titulo>
                <Vacio>Necesitas al menos 2 días de datos para ver la gráfica.</Vacio>
            </Container>
        );
    }

    const datos = historial.map((h) => ({
        fechaKey: h.fechaKey,
        capitalTotal: h.capitalTotal || 0,
        liquido: h.liquido || 0,
        inversiones: h.inversiones || 0,
        inversionesLargo: h.inversionesLargo || 0,
        responsabilidades: h.responsabilidades || 0,
    }));

    return (
        <Container>
            <Header>
                <Titulo>Evolución del Capital</Titulo>
                <LeyendaPersonalizada>
                    {Object.entries(NOMBRES).map(([key, nombre]) => (
                        <ItemLeyenda
                            key={key}
                            $oculto={!lineasVisibles[key]}
                            onClick={() => toggleLinea(key)}
                        >
                            <PuntoColor $color={COLORES[key]} />
                            {nombre}
                        </ItemLeyenda>
                    ))}
                </LeyendaPersonalizada>
            </Header>

            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={datos} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(83, 59, 143, 0.08)" />
                    <XAxis
                        dataKey="fechaKey"
                        tickFormatter={formatFecha}
                        tick={{ fontSize: 10, fill: "#8a8a9a" }}
                        axisLine={{ stroke: "rgba(83, 59, 143, 0.1)" }}
                    />
                    <YAxis
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10, fill: "#8a8a9a" }}
                        axisLine={{ stroke: "rgba(83, 59, 143, 0.1)" }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {Object.entries(COLORES).map(([key, color]) => (
                        lineasVisibles[key] && (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={color}
                                strokeWidth={key === "capitalTotal" ? 3 : 2}
                                dot={{ r: key === "capitalTotal" ? 4 : 3, fill: color }}
                                activeDot={{ r: 6, fill: color }}
                            />
                        )
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </Container>
    );
};
