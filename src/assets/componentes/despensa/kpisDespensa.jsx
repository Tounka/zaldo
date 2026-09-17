import { useMemo } from "react";
import styled from "styled-components";
import { FaBoxes, FaDollarSign, FaExclamationTriangle, FaShoppingCart } from "react-icons/fa";
import { Package, Wallet, AlertTriangle, ShoppingCart } from "lucide-react";

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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
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

const formatMoney = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export const KpisDespensa = ({ catalogo, inventario }) => {
  const metricas = useMemo(() => {
    if (!catalogo?.productos) {
      return {
        totalProductos: 0,
        categoriasActivas: 0,
        valorTotal: 0,
        porAgotar: 0,
        agotados: 0,
        bajos: 0,
        necesarios: 0,
      };
    }

    const productosActivos = Object.values(catalogo.productos).filter((p) => p.activo);
    const categoriasSet = new Set();
    let agotados = 0;
    let bajos = 0;
    let necesarios = 0;

    const valorCalculado = productosActivos.reduce((acc, prod) => {
      if (prod.categoria) categoriasSet.add(prod.categoria);
      if (prod.necesario) necesarios += 1;

      const presentaciones = Object.values(prod.presentaciones || {}).filter((pr) => pr.activa);
      let stockTotal = 0;

      const valorProd = presentaciones.reduce((sub, pres) => {
        const stock = Number(pres.stockActual || 0);
        stockTotal += stock;
        const precio = Number(pres.ultimoPrecioPagado || pres.precioAproximado || pres.buenPrecio || 0);
        return sub + stock * precio;
      }, 0);

      const stockMin = Number(prod.stockMinimo || 1);
      if (stockTotal <= 0) {
        agotados += 1;
      } else if (stockTotal <= stockMin) {
        bajos += 1;
      }

      return acc + valorProd;
    }, 0);

    const valorTotal = Number(inventario?.valorTotalInventario || valorCalculado || 0);

    return {
      totalProductos: productosActivos.length,
      categoriasActivas: categoriasSet.size,
      valorTotal,
      porAgotar: agotados + bajos,
      agotados,
      bajos,
      necesarios,
    };
  }, [catalogo, inventario]);

  return (
    <Grid>
      {/* 1. Total Productos */}
      <Card>
        <IconoFondo>
          <Package />
        </IconoFondo>
        <CardLabel>
          <FaBoxes /> Total Productos
        </CardLabel>
        <CardValue>{metricas.totalProductos}</CardValue>
        <CardSub>
          {metricas.categoriasActivas > 0
            ? `${metricas.categoriasActivas} categorías activas`
            : "Sin productos"}
        </CardSub>
      </Card>

      {/* 2. Valor Estimado */}
      <Card>
        <IconoFondo>
          <Wallet />
        </IconoFondo>
        <CardLabel>
          <FaDollarSign /> Valor Estimado
        </CardLabel>
        <CardValue $color="#2f7d54">
          {formatMoney(metricas.valorTotal)}
        </CardValue>
        <CardSub>En existencias actuales</CardSub>
      </Card>

      {/* 3. Por Agotar */}
      <Card>
        <IconoFondo>
          <AlertTriangle />
        </IconoFondo>
        <CardLabel>
          <FaExclamationTriangle /> Por Agotar
        </CardLabel>
        <CardValue $color={metricas.porAgotar > 0 ? "#c0392b" : "#2f7d54"}>
          {metricas.porAgotar}
        </CardValue>
        <CardSub>
          {metricas.porAgotar > 0
            ? `${metricas.agotados} agotados · ${metricas.bajos} bajos`
            : "Inventario con buen stock"}
        </CardSub>
      </Card>

      {/* 4. En Lista de Súper */}
      <Card>
        <IconoFondo>
          <ShoppingCart />
        </IconoFondo>
        <CardLabel>
          <FaShoppingCart /> Lista de Súper
        </CardLabel>
        <CardValue $color={metricas.necesarios > 0 ? "#d35400" : "#1a1a2e"}>
          {metricas.necesarios}
        </CardValue>
        <CardSub>
          {metricas.necesarios > 0
            ? "Productos marcados necesarios"
            : "Lista de compra al día"}
        </CardSub>
      </Card>
    </Grid>
  );
};
