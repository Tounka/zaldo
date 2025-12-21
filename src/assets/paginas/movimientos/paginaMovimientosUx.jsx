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
import { FaEdit } from "react-icons/fa";
import { ModalGenerico } from "../../componentes/modales/modalGenerico";
import { ModalEditarMovimiento } from "../../componentes/modales/modalEditarMovimientos";
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



export const PaginaMovimientosUx = () => {
  const { usuario, movimientos, setMovimientos } = useContextoGeneral();
  const [loading, setLoading] = useState(false);
  const [filas, setFilas] = useState([]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleEditar = (e) => {


  }
  const buscarMovimientos = async () => {
    setLoading(true);
    const [anio, mes] = fechaSeleccionada.split("-");
    const fechaABuscar = `${anio}${mes}`;

    const ordenarPorFecha = (arr) =>
      [...arr].sort((a, b) => b.fechaMovimiento - a.fechaMovimiento);

    if (!movimientos[fechaABuscar]) {
      const movimientosDelMes = await obtenerMovimientosPorAnioMes(usuario.uid, fechaABuscar);
      if (movimientosDelMes?.movimientos?.length > 0) {
        const movimientosOrdenados = ordenarPorFecha(movimientosDelMes.movimientos);
        setMovimientos(prev => ({
          ...prev,
          [fechaABuscar]: movimientosOrdenados
        }));
        setFilas(formatearFilas(movimientosOrdenados));
      } else {
        setFilas([]);
      }
    } else {
      const movs = movimientos[fechaABuscar];
      const movimientosOrdenados = ordenarPorFecha(movs);
      setFilas(movimientosOrdenados.length > 0 ? formatearFilas(movimientosOrdenados) : []);
    }

    setLoading(false);
  };


  const formatearFilas = (movs) => {
    return movs.map((mov, idx) => ({
      id: idx,
      ...mov,
      fechaMovimientoFormateada: mov.fechaMovimiento?.seconds
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
  display: ${({ ocultar }) => (ocultar ? "none" : "grid")};
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: center;
  @media (max-width: 500px) {
    grid-template-columns: 1fr ;
  }
`
const ContenedorGraficaDeBarras = styled.div`
  width: 100%;
  overflow-x: auto;
  min-height: 400px;
  overflow-x: auto;

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

  console.log(filas)


  const categorias = filas.reduce(
    (acc, mov) => {

      if (!acc.categorias.includes(mov.categoria) && mov.categoria != "ajusteDeSaldo") {
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
    if (mov.categoria != "ajusteDeSaldo") {
      if (mov.monto >= 0) {
        ingresosPorCategoria[mov.categoria] += mov.monto;
      } else {
        gastosPorCategoria[mov.categoria] += Math.abs(mov.monto);
      }
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


  return (
    <ContenedorGraficasStyled ocultar={filas.length === 0} >
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
            legend="true"
            tooltip="true"
          />
        ) : (
          <Typography align="center" color="text.secondary">No hay datos para mostrar</Typography>
        )}
      </Box>

      <Box sx={{ margin: '0', mt: 0 }}>
        {filas.length > 0 ? (() => {
          // Filtramos solo gastos y ordenamos por monto descendente
          const gastosGrandes = [...filas]
            .filter(mov => mov.monto < 0)
            .sort((a, b) => a.monto - b.monto) // más negativo primero
            .slice(0, 5);

          const etiquetas = gastosGrandes.map(mov =>
            `${mov.nombreCuenta} - ${mov.fechaMovimiento}`
          );
          const montos = gastosGrandes.map(mov => Math.abs(mov.monto));

          return (
            <BarChart
              xAxis={[{ data: etiquetas, scaleType: 'band' }]}
              series={[{ data: montos, label: 'Monto del gasto' }]}
              height={300}
              sx={{
                [`& .${barLabelClasses.root}`]: {
                  fontWeight: 'bold',
                  fill: 'white',
                },
              }}
              barLabel="value"
              legend
            />
          );
        })() : (
          <Typography align="center" color="text.secondary">No hay datos para mostrar</Typography>
        )}
      </Box>

    </ContenedorGraficasStyled>
  );
};




const ContenedorTabla = ({ loading, filas }) => {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [filasTabla, setFilasTabla] = useState(filas);
  const [isOpenModalEditar, setIsOpenModalEditar] = useState(false);
  const [movimientoEditar, setMovimientoEditar] = useState(null);

  useEffect(() => {
    let filasConvertidas = filas.map((fila, index) => ({
      ...fila,
      categoriasConvertidas: adaptadorTxtLabel(categoriasEsqueleto, fila.categoria)
    }))
    if (filasConvertidas) {
      setFilasTabla(filasConvertidas);
    }
  }, [filas])
  const columns = [
    { field: 'fechaMovimientoFormateada', headerName: 'Fecha', minWidth: 100, flex: 1 },
    { field: 'nombreCuenta', headerName: 'Cuenta', minWidth: 100, flex: 1 },
    { field: 'monto', headerName: 'Monto', minWidth: 80, flex: 1 },
    { field: 'categoriasConvertidas', headerName: 'Categoría', minWidth: 100, flex: 1 },
    { field: 'nota', headerName: 'Nota', minWidth: 150, flex: 2 },
    {
      field: 'acciones',
      headerName: 'Acciones',
      minWidth: 80,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div
          onClick={() => handleEditar(params.row)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: "100%",
            justifyContent: "center",
            display: "flex",
            height: "100%",
            alignItems: "center"
          }}
        >
          <FaEdit size={20} />
        </div>
      )
    }
  ];


  const handleEditar = (row) => {
    setMovimientoEditar(row);
    setIsOpenModalEditar(true);
    console.log(row)
  };
  const cerrarModalEditar = () => {
    setIsOpenModalEditar(false);
    setMovimientoEditar(null);
  };
  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        loading={loading}
        rows={filasTabla}
        columns={columns}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 50]}
        disableRowSelectionOnClick
      />
      <ModalGenerico isOpen={isOpenModalEditar} onClose={cerrarModalEditar}>
        {movimientoEditar && (
          <ModalEditarMovimiento
            movimiento={movimientoEditar}
            onClose={cerrarModalEditar}
          />
        )}
      </ModalGenerico>

    </Box>
  );
};
