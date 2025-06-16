import styled from "styled-components";
import { DataGrid } from '@mui/x-data-grid';
import { TextField, Button } from "@mui/material";
import { useEffect, useState } from 'react';
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { obtenerMovimientosPorAnioMes } from "../../funciones/firebase/movimientos";
import { useContextoGeneral } from "../../contextos/general";

const ContenedorPaginaMovimientosUx = styled.div`
  width: 100%;
  height: 80dvh;
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
  { field: 'fechaMovimiento', headerName: 'Fecha', width: 150 },
  { field: 'nombreCuenta', headerName: 'Cuenta', width: 150 },
  { field: 'monto', headerName: 'Monto', width: 120 },
  { field: 'categoria', headerName: 'Categoría', width: 150 },
  { field: 'nota', headerName: 'Nota', width: 250 },
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

    console.log(movimientos)
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

  useEffect(() =>{
    
  },[movimientos])

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

      <DataGrid
        loading={loading}
        rows={filas}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5, 10]}
        disableSelectionOnClick
      />
    </ContenedorPaginaMovimientosUx>
  );
};
