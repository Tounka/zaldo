import { useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { editarMovimiento } from "../../funciones/firebase/movimientos";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import styled from "styled-components";
import { H2 } from "../genericos/titulos";
import { HiCurrencyDollar, HiOutlinePencilAlt } from "react-icons/hi";
import { FaTags } from "react-icons/fa";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";
const Formulario = styled(Form)`
  display: flex;
  flex-direction: column;
    display:flex;
  flex-direction:column;
  width:100%;
  padding: 0 20px 20px 20px;
 
  gap: 10px;
`;
const ContenedorInputs = styled.div`
  width: 100%;
  justify-content: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const ModalEditarMovimiento = ({ movimiento, onClose }) => {
  const { usuario, setMovimientos } = useContextoGeneral();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = {
    monto: Math.abs(movimiento.monto),
    categoria: movimiento.categoria || "",
    nota: movimiento.nota || "",
  };

  const onSubmit = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const movimientoEditado = await editarMovimiento(
        movimiento,
        values,
        usuario.uid
      );

      if (movimientoEditado) {
        setMovimientos(prev => {
          const fecha = convertirADatosFecha(movimiento.fechaMovimiento.toDate());
          const key = `${fecha.anio}${fecha.mes}`;

          return {
            ...prev,
            [key]: prev[key].map(m =>
              m.fechaMovimiento.seconds === movimiento.fechaMovimiento.seconds
                ? movimientoEditado
                : m
            ),
          };
        });
      }

      onClose();
    } catch (error) {
      console.error("Error al editar movimiento", error);
    }

    setIsSubmitting(false);
  };

  return (
    <Formik initialValues={initialValues} onSubmit={onSubmit}>



      {({ handleSubmit }) => (
   
          <Formulario onSubmit={handleSubmit}>
            <H2 size="28px" align="center" color="var(--colorMorado)">
              Editar Movimiento
            </H2>

            <p style={{ fontSize: "14px", color: "#999", textAlign: "center" }}>
              Editar el monto <b>no modifica</b> la cantidad actual en las cuentas
            </p>

            <ContenedorInputs>
              <FieldForm
                name="monto"
                type="number"
                min="0"
                step=".01"
                placeholder="Monto"
                icon={<HiCurrencyDollar />}
              />

              <SelectForm
                options={categoriasEsqueleto}
                name="categoria"
                placeholder="Categoría"
                icon={<FaTags />}
              />

              <FieldForm
                name="nota"
                type="text"
                placeholder="Nota"
                icon={<HiOutlinePencilAlt />}
              />
            </ContenedorInputs>

            <BtnSubmit type="submit">Guardar cambios</BtnSubmit>
          </Formulario>

      )}
    </Formik>
  );
};
