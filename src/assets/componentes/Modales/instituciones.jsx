import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useContextoGeneral } from "../../contextos/general";
import { eliminarInstitucion } from "../../funciones/firebase/instituciones";
import { useState, useMemo } from "react";
import { ContenedorFormularioGenerico, ModalGenerico } from "./modalGenerico";
import { H2 } from "../genericos/titulos";
import { FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import { BtnSubmit } from "../genericos/FormulariosV1";

export const ModalInstituciones = () => {
  const {
    instituciones,
    setInstituciones,
    usuario,
    isOpenInstituciones,
    setIsOpenInstituciones,
    setIsOpenAgregarInstituciones
  } = useContextoGeneral();

  const onClose = () => setIsOpenInstituciones(false);

  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const filasTabla = useMemo(
    () =>
      instituciones.map((inst) => ({
        id: inst.id,
        nombre: inst.nombre,
      })),
    [instituciones]
  );

  const handleEliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar institución?",
      text: "La institución se desactivará, pero las cuentas asociadas seguirán existiendo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    const ok = await eliminarInstitucion(usuario.uid, id);
    setLoading(false);

    if (ok) {
      setInstituciones((prev) =>
        prev.filter((inst) => inst.id !== id)
      );

      Swal.fire({
        title: "Institución eliminada",
        text: "La institución fue desactivada correctamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        title: "Error",
        text: "No se pudo eliminar la institución.",
        icon: "error",
      });
    }
  };

  const columns = [
    {
      field: "nombre",
      headerName: "Nombre de la institución",
      flex: 1,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Button
          color="error"
          size="small"
          onClick={() => handleEliminar(params.row.id)}
          disabled={loading}
        >
          <FaTrash />
        </Button>
      ),
    },
  ];

  return (
    <ModalGenerico isOpen={isOpenInstituciones} onClose={onClose}>
      <H2 size="30px" align="center" color="var(--colorMorado)">
        Instituciones
      </H2>

      <ContenedorFormularioGenerico>
        <DataGrid
          loading={loading}
          rows={filasTabla}
          columns={columns}
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10]}
          disableRowSelectionOnClick
          autoHeight
          sx={{ mt: 2 }}
        />
        <BtnSubmit onClick={() => setIsOpenAgregarInstituciones(true)}> Agregar Institución</BtnSubmit>
      </ContenedorFormularioGenerico>
    </ModalGenerico>
  );
};
