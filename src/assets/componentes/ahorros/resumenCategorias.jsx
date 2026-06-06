import styled from "styled-components";
import { FaWallet, FaChartLine, FaClock, FaExclamationTriangle } from "react-icons/fa";

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
  gap: 8px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(83, 59, 143, 0.1);
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconoCategoria = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};

  svg {
    font-size: 14px;
  }
`;

const NombreCategoria = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #8a8a9a;
`;

const Monto = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  letter-spacing: -0.5px;

  @media (max-width: 500px) {
    font-size: 16px;
  }
`;

const NumCuentas = styled.span`
  font-size: 11px;
  color: #8a8a9a;
`;

const CardTotal = styled(Card)`
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, var(--colorMorado) 0%, var(--colorMoradoSecundario) 100%);
  border: none;

  ${NombreCategoria} {
    color: rgba(255, 255, 255, 0.75);
  }

  ${Monto} {
    color: white;
    font-size: 26px;

    @media (max-width: 500px) {
      font-size: 20px;
    }
  }

  ${NumCuentas} {
    color: rgba(255, 255, 255, 0.6);
  }
`;

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

const CATEGORIA_CONFIG = {
    liquido: {
        nombre: "Líquido",
        Icono: FaWallet,
        color: "#006c67",
    },
    inversiones: {
        nombre: "Inversiones",
        Icono: FaChartLine,
        color: "#533b8f",
    },
    inversionesLargo: {
        nombre: "A Largo Plazo",
        Icono: FaClock,
        color: "#cca43b",
    },
    responsabilidades: {
        nombre: "Responsabilidades",
        Icono: FaExclamationTriangle,
        color: "#db2b39",
    },
};

// eslint-disable-next-line no-unused-vars
const CategoriaCard = ({ nombre, Icono, color, suma, numCuentas }) => (
    <Card>
        <CardHeader>
            <IconoCategoria $color={color}>
                <Icono />
            </IconoCategoria>
            <NombreCategoria>{nombre}</NombreCategoria>
        </CardHeader>
        <Monto>{formatMoney(suma)}</Monto>
        <NumCuentas>{numCuentas} cuenta{numCuentas !== 1 ? "s" : ""}</NumCuentas>
    </Card>
);

export const ResumenCategorias = ({ cuentas = {} }) => {
    const totales = {};
    let capitalTotal = 0;
    let totalCuentas = 0;

    Object.entries(CATEGORIA_CONFIG).forEach(([key, config]) => {
        const arr = cuentas[key] || [];
        const suma = arr.reduce((acc, c) => acc + Number(c.monto || 0), 0);
        totales[key] = { ...config, suma, numCuentas: arr.length };
        totalCuentas += arr.length;
        if (key === "responsabilidades") {
            capitalTotal -= suma;
        } else {
            capitalTotal += suma;
        }
    });

    return (
        <>
            <CardTotal>
                <div>
                    <NombreCategoria>Capital Total</NombreCategoria>
                    <NumCuentas>{totalCuentas} cuentas</NumCuentas>
                </div>
                <Monto>{formatMoney(capitalTotal)}</Monto>
            </CardTotal>
            <Grid>
                {Object.entries(totales).map(([key, { nombre, Icono, color, suma, numCuentas }]) => (
                    <CategoriaCard
                        key={key}
                        nombre={nombre}
                        Icono={Icono}
                        color={color}
                        suma={suma}
                        numCuentas={numCuentas}
                    />
                ))}
            </Grid>
        </>
    );
};
