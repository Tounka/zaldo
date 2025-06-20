import styled from "styled-components";
import { DataGrid } from '@mui/x-data-grid';
import { TextField, Button } from "@mui/material";
import { useEffect, useState } from 'react';
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { obtenerMovimientosPorAnioMes } from "../../funciones/firebase/movimientos";
import { useContextoGeneral } from "../../contextos/general";

import { BarChart, LineChart, pieArcLabelClasses, PieChart, barLabelClasses } from '@mui/x-charts';
import { Box, Typography } from '@mui/material';
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
const ContenedorPaginaMovimientosUx = styled.div`
  width: 100%;
  height: auto;
  min-height: 80dvh;
  max-height: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ControlesFecha = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const columns = [
  { field: 'fechaMovimiento', headerName: 'Fecha', minWidth: 100, flex: 1 },
  { field: 'nombreCuenta', headerName: 'Cuenta', minWidth: 100, flex: 1 },
  { field: 'monto', headerName: 'Monto', minWidth: 80, flex: 1 },
  { field: 'categoria', headerName: 'Categoría', minWidth: 100, flex: 1 },
  { field: 'nota', headerName: 'Nota', minWidth: 150, flex: 2 },
];

export const PaginaMovimientosUx = () => {
  const { usuario, movimientos, setMovimientos } = useContextoGeneral();
  const [loading, setLoading] = useState(false);
  const [filas, setFilas] = useState([]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  const buscarMovimientos = async () => {
    setLoading(true);
    const [anio, mes] = fechaSeleccionada.split("-");
    const fechaABuscar = `${anio}${mes}`;

    if (!movimientos[fechaABuscar]) {
      const movimientosDelMes = await obtenerMovimientosPorAnioMes(usuario.uid, fechaABuscar);
      if (movimientosDelMes?.movimientos?.length > 0) {
        setMovimientos(prev => ({
          ...prev,
          [fechaABuscar]: movimientosDelMes.movimientos
        }));
        setFilas(formatearFilas(movimientosDelMes.movimientos));
      } else {
        setFilas([]);
      }
    } else {
      const movs = movimientos[fechaABuscar];
      setFilas(movs?.length > 0 ? formatearFilas(movs) : []);
    }

    setLoading(false);
  };

  const formatearFilas = (movs) => {
    return movs.map((mov, idx) => ({
      id: idx,
      ...mov,
      fechaMovimiento: mov.fechaMovimiento?.seconds
        ? new Date(mov.fechaMovimiento.seconds * 1000).toLocaleDateString()
        : "Sin fecha",
    }));
  };

  useEffect(() => {
    buscarMovimientos()
  }, [movimientos])

  return (
    <ContenedorPaginaMovimientosUx>
      <ControlesFecha>
        <TextField
          label="Selecciona mes"
          type="month"
          size="small"
          value={fechaSeleccionada}
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" color="primary" onClick={buscarMovimientos}>
          Buscar
        </Button>
      </ControlesFecha>

      <ContenedorTabla loading={loading} filas={filas} />
      <ContenedorGraficas loading={loading} filas={filas} />
    </ContenedorPaginaMovimientosUx>
  );
};

const ContenedorGraficasStyled = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: center;
  @media (max-width: 500px) {
    grid-template-columns: 1fr ;
  }
`
const ContenedorGraficaDeBarras = styled.div`
  width: 100%;
  max-height: 400px;
  overflow-x: auto;
  overflow-y: auto;
  grid-column: 1/3;
  -webkit-overflow-scrolling: touch; /* Scroll suave en iOS */
  touch-action: pan-y; /* Permitir desplazamiento vertical */
  
  @media (max-width: 500px) {
    grid-column: 1/2;
  }

  /* Asegurar que elementos hijos no rompan el layout */
  & > * {
    min-width: 100%;
  }
`;
const ContenedorGraficas = ({ loading, filas }) => {
  if (loading) return null;

  // Acumular categorías únicas y etiquetas convertidas
  const categorias = filas.reduce(
    (acc, mov) => {
      if (!acc.categorias.includes(mov.categoria)) {
        acc.categorias.push(mov.categoria);
        acc.categoriasConvertidas.push(adaptadorTxtLabel(categoriasEsqueleto, mov.categoria));
      }
      return acc;
    },
    { categorias: [], categoriasConvertidas: [] }
  );

  // Inicializar acumuladores por categoría
  const ingresosPorCategoria = {};
  const gastosPorCategoria = {};
  categorias.categorias.forEach(cat => {
    ingresosPorCategoria[cat] = 0;
    gastosPorCategoria[cat] = 0;
  });

  // Sumar montos en ingresos o gastos según el signo y categoría
  filas.forEach(mov => {
    if (mov.monto >= 0) {
      ingresosPorCategoria[mov.categoria] += mov.monto;
    } else {
      gastosPorCategoria[mov.categoria] += Math.abs(mov.monto);
    }
  });

  // Crear arrays para la gráfica en el mismo orden que las categorías
  const ingresosArray = categorias.categorias.map(cat => ingresosPorCategoria[cat]);
  const gastosArray = categorias.categorias.map(cat => gastosPorCategoria[cat]);

  // Datos para el PieChart (Ingresos y Gastos totales)
  const totalIngresos = ingresosArray.reduce((a, b) => a + b, 0);
  const totalGastos = gastosArray.reduce((a, b) => a + b, 0);
  const datosGraficaActivosPasivos = [
    { id: "activosGrafica", label: "Ingresos", value: totalIngresos },
    { id: "pasivosGrafica", label: "Gastos", value: totalGastos },
  ];
  const totalActivosPasivos = totalIngresos + totalGastos;

  // Datos para gráfico de línea por día (puedes mantener el tuyo)
  const datosPorDia = filas.reduce((acc, mov) => {
    const fecha = mov.fechaMovimiento || "Sin fecha";
    if (!acc[fecha]) acc[fecha] = 0;
    acc[fecha] += mov.monto;
    return acc;
  }, {});
  const fechasOrdenadas = Object.keys(datosPorDia).sort((a, b) => {
    const [da, ma, ya] = a.split("/").map(Number);
    const [db, mb, yb] = b.split("/").map(Number);
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
  });
  const montosOrdenados = fechasOrdenadas.map(fecha => datosPorDia[fecha]);

  return (
    <ContenedorGraficasStyled>
      <Box sx={{ maxWidth: 400, margin: '0', mt: 0 }}>
        {datosGraficaActivosPasivos.length > 0 ? (
          <PieChart
            series={[{
              data: datosGraficaActivosPasivos,
              cornerRadius: 5, innerRadius: 30, paddingAngle: 5,
              arcLabel: (item) => `${((item.value * 100) / totalActivosPasivos).toFixed(0)}%`,
            }]}
            sx={{
              [`& .${pieArcLabelClasses.root}`]: {
                fontWeight: 'bold',
                fill: "white"
              },
            }}
            height={200}
            legend
            tooltip
          />
        ) : (
          <Typography align="center" color="text.secondary">No hay datos para mostrar</Typography>
        )}
      </Box>

      <Box sx={{ margin: '0', mt: 0 }}>
        {fechasOrdenadas.length > 0 ? (
          <LineChart
            xAxis={[{
              data: fechasOrdenadas,
              scaleType: 'point',
            }]}
            series={[{ data: montosOrdenados }]}
            height={300}
          />
        ) : (
          <Typography align="center" color="text.secondary">No hay datos para mostrar</Typography>
        )}
      </Box>

      <ContenedorGraficaDeBarras>
        <Box sx={{ margin: '0', mt: 0 }}>
          <BarChart
            xAxis={[{ data: categorias.categoriasConvertidas }]}
            series={[
              { data: ingresosArray, label: 'Ingresos' },
              { data: gastosArray, label: 'Gastos' },
            ]}
            sx={{
              [`& .${barLabelClasses.root}`]: {
                fontWeight: 'bold',
                fill: 'white',
              },
            }}
            height={400}
            legend
            barLabel="value"
          />
        </Box>
      </ContenedorGraficaDeBarras>
    </ContenedorGraficasStyled>
  );
};




const ContenedorTabla = ({ loading, filas }) => {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  return (
    <Box sx={{  width: '100%' }}>
      <DataGrid
        loading={loading}
        rows={filas}
        columns={columns}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 50]}
        disableRowSelectionOnClick
      />
    </Box>
  );
};
