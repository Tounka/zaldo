import { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { editarMovimiento } from "../../funciones/firebase/movimientos";
import { Field, Form, Formik } from "formik";
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

const MarcaPersonal = styled.label`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 40px;
  padding: 0 11px;
  border: 1px solid rgba(83, 59, 143, .2);
  border-radius: 10px;
  background: #fbf9ff;
  color: #453c56;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: var(--colorMorado);
  }

  small {
    margin-left: auto;
    color: #8c8498;
    font-size: 10px;
    font-weight: 500;
  }
`;

const AvisoMovimientoInterno = styled.p`
  margin: 0;
  padding: 10px 11px;
  border: 1px solid rgba(83, 59, 143, .16);
  border-radius: 10px;
  background: #f7f3fc;
  color: #625578;
  font-size: 12px;
  line-height: 1.4;
`;

const esMovimientoInterno = (movimiento = {}) => Boolean(
  movimiento.esTransferencia
  || movimiento.cuentaDestino
  || movimiento.cuentaDestinoNombre
  || movimiento.tipoOperacion === "transferencia"
  || movimiento.tipoOperacion === "pago_tarjeta"
  || movimiento.esAjusteSaldo === true
  || ["transferencia", "pagoTarjeta", "ajusteDeSaldo", "ajusteDeSaldoMSI"].includes(movimiento.categoria)
);

const mismoMovimiento = (a, b) => Boolean(
  a?.fechaMovimiento && b?.fechaMovimiento
  && Number(a.fechaMovimiento.seconds) === Number(b.fechaMovimiento.seconds)
  && Number(a.fechaMovimiento.nanoseconds || 0) === Number(b.fechaMovimiento.nanoseconds || 0)
);

export const ModalEditarMovimiento = ({ movimiento, onClose }) => {
  const { usuario, setMovimientos } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const movimientoInterno = esMovimientoInterno(movimiento);

  const initialValues = {
    monto: Math.abs(movimiento.monto),
    categoria: movimiento.categoria || "",
    nota: movimiento.nota || "",
    esPersonal: !movimientoInterno && Boolean(movimiento.esPersonal || (movimiento.categoria === "personal" && movimiento.monto < 0)),
    ignorarEnResumen: !movimientoInterno && Boolean(movimiento.ignorarEnResumen),
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
              mismoMovimiento(m, movimiento)
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

            {movimientoInterno ? (
              <AvisoMovimientoInterno>
                Este es un movimiento interno, pago de tarjeta o ajuste de saldo. Se mantiene fuera del gasto del mes.
              </AvisoMovimientoInterno>
            ) : (
              <>
                {movimiento.monto < 0 && (
                  <MarcaPersonal>
                    <Field type="checkbox" name="esPersonal" />
                    <span>Marcar como gasto personal</span>
                    <small>Se incluirá en tu análisis real</small>
                  </MarcaPersonal>
                )}
                <MarcaPersonal>
                  <Field type="checkbox" name="ignorarEnResumen" />
                  <span>Excluir de los resúmenes</span>
                  <small>Para corregir un registro equivocado sin borrarlo</small>
                </MarcaPersonal>
              </>
            )}
          </ContenedorInputs>

          <BtnSubmit type="submit">Guardar cambios</BtnSubmit>
        </Formulario>

      )}
    </Formik>
  );
};
