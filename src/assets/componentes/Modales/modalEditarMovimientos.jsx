import { useState } from "react";
import { avisarError } from "../../funciones/utils/avisos";
import { useAppStore } from "../../stores/useAppStore";
import { editarMovimiento } from "../../funciones/firebase/movimientos";
import { ajustarSaldoPorEdicionDeMovimiento } from "../../funciones/firebase/cuentas";
import { Field, Form, Formik } from "formik";
import styled from "styled-components";
import {
  FaPen,
  FaDollarSign,
  FaUser,
  FaCheck,
  FaEdit,
  FaExclamationTriangle,
  FaEyeSlash,
} from "react-icons/fa";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { BadgeCategoria } from "../../funciones/utils/coloresCategorias";
import { obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";
import { ModalEncabezado } from "./modalGenerico";

const ContenedorModal = styled.div`
  width: 500px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 24px 20px;
  box-sizing: border-box;
`;

const FormularioStyled = styled(Form)`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const MontoHeroContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MontoHeroInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 54px;
  padding: 0 16px;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
  }

  span.moneda {
    font-size: 22px;
    font-weight: 800;
    color: #6366f1;
  }

  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
`;

const AvisoMonto = styled.p`
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  text-align: center;
`;

const CampoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InputConIcono = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  svg {
    color: #6366f1;
    font-size: 14px;
    flex-shrink: 0;
  }

  input,
  select {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #0f172a;
    font-family: inherit;

    &::placeholder {
      color: #94a3b8;
    }
  }
`;

const RejillaCategorias = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 10px;

  @media (max-width: 430px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
`;

const BotonCategoria = styled.button`
  position: relative;
  min-width: 0;
  min-height: 94px;
  aspect-ratio: 1.35 / 1;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 1.5px solid ${({ $activo }) => ($activo ? "#6366f1" : "#dbe2ec")};
  border-radius: 14px;
  background: #f8fafc;
  font: inherit;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  box-shadow: ${({ $activo }) => ($activo
    ? "0 8px 18px rgba(99, 102, 241, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.1)"
    : "0 4px 10px rgba(30, 41, 59, 0.08)")};

  &:hover {
    border-color: #a5b4fc;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(30, 41, 59, 0.14);
  }

  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 1px;
  }

  span.nombre {
    position: absolute;
    z-index: 1;
    right: 8px;
    bottom: 8px;
    left: 8px;
    max-width: calc(100% - 16px);
    padding: 5px 7px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
    color: ${({ $activo }) => ($activo ? "#4338ca" : "#64748b")};
    font-size: 10px;
    font-weight: 700;
    line-height: 1.15;
    text-align: left;
    overflow-wrap: anywhere;
  }
`;

const ImagenCategoria = styled.span`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: #eef2f7 url(${({ $imagen }) => $imagen}) center / contain no-repeat;
`;

const TarjetaGastoPersonal = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid ${({ $checked }) => ($checked ? "#c4b5fd" : "#e2e8f0")};
  background: ${({ $checked }) => ($checked ? "#f5f3ff" : "#ffffff")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #a78bfa;
  }
`;

const InfoPersonal = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TituloPersonal = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $checked }) => ($checked ? "#5b21b6" : "#334155")};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SubtituloPersonal = styled.span`
  font-size: 11px;
  color: #64748b;
`;

const SwitchTrack = styled.div`
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: ${({ $checked }) => ($checked ? "#7c3aed" : "#cbd5e1")};
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $checked }) => ($checked ? "18px" : "2px")};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.2s ease;
  }

  input {
    display: none;
  }
`;

const AvisoMovimientoInterno = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
  line-height: 1.4;

  svg {
    font-size: 16px;
    color: #4f46e5;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const BtnSubmitModerno = styled.button`
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: all 0.15s ease;
  margin-top: 4px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const esMovimientoInterno = (movimiento = {}) =>
  Boolean(
    movimiento.esTransferencia ||
      movimiento.cuentaDestino ||
      movimiento.cuentaDestinoNombre ||
      movimiento.tipoOperacion === "transferencia" ||
      movimiento.tipoOperacion === "pago_tarjeta" ||
      movimiento.esAjusteSaldo === true ||
      ["transferencia", "pagoTarjeta", "ajusteDeSaldo", "ajusteDeSaldoMSI"].includes(
        movimiento.categoria
      )
  );

const mismoMovimiento = (a, b) =>
  Boolean(
    a?.fechaMovimiento &&
      b?.fechaMovimiento &&
      Number(a.fechaMovimiento.seconds) === Number(b.fechaMovimiento.seconds) &&
      Number(a.fechaMovimiento.nanoseconds || 0) ===
        Number(b.fechaMovimiento.nanoseconds || 0)
  );

export const ModalEditarMovimiento = ({ movimiento, onClose }) => {
  const { usuario, setMovimientos, setCuentas } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const movimientoInterno = esMovimientoInterno(movimiento);

  const initialValues = {
    monto: Math.abs(movimiento.monto),
    categoria: movimiento.categoria || "",
    nota: movimiento.nota || "",
    esPersonal:
      !movimientoInterno &&
      Boolean(
        movimiento.esPersonal ||
          (movimiento.categoria === "personal" && movimiento.monto < 0)
      ),
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
        setMovimientos((prev) => {
          const fecha = convertirADatosFecha(movimiento.fechaMovimiento.toDate());
          const key = `${fecha.anio}${fecha.mes}`;

          return {
            ...prev,
            [key]: prev[key].map((m) =>
              mismoMovimiento(m, movimiento) ? movimientoEditado : m
            ),
          };
        });

        /*
         * Corregir el monto ahora también corrige el saldo de la cuenta: se
         * aplica solo la diferencia. Los movimientos internos (transferencias,
         * pagos de tarjeta, ajustes) se quedan fuera porque tocan dos cuentas y
         * su saldo se recalcula por otra vía.
         */
        const cuentaAsociada = movimiento?.cuentaAsociada;

        if (!movimientoInterno && cuentaAsociada) {
          const saldoActualizado = await ajustarSaldoPorEdicionDeMovimiento({
            uid: usuario.uid,
            cuentaId: cuentaAsociada,
            montoAnterior: Number(movimiento.monto || 0),
            montoNuevo: Number(movimientoEditado.monto || 0),
            afectaMSI: movimiento?.pagoAMeses === "msi",
          });

          if (saldoActualizado) {
            setCuentas((prev) => prev.map((cuenta) => (
              cuenta.id === cuentaAsociada
                ? { ...cuenta, ...saldoActualizado }
                : cuenta
            )));
          }
        }
      }

      onClose();
    } catch (error) {
      avisarError("No se pudo guardar el cambio. Intenta de nuevo.", error);
    }

    setIsSubmitting(false);
  };

  return (
    <ContenedorModal>
      <ModalEncabezado
        icon={<FaEdit />}
        title="Editar Movimiento"
        description="Modifica la categoría, nota o clasificación"
      />

      <Formik initialValues={initialValues} onSubmit={onSubmit}>
        {({ values, setFieldValue }) => (
          <FormularioStyled>
            <MontoHeroContainer>
              <MontoHeroInputWrapper>
                <span className="moneda">$</span>
                <Field
                  name="monto"
                  type="number" inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </MontoHeroInputWrapper>
              <AvisoMonto>
                El saldo de la cuenta se ajusta con la diferencia
              </AvisoMonto>
            </MontoHeroContainer>

            <CampoWrapper>
              <RejillaCategorias role="group" aria-label="Categoría del movimiento">
                {categoriasEsqueleto.map((cat) => (
                  <BotonCategoria
                    key={cat.value}
                    type="button"
                    $activo={values.categoria === cat.value}
                    aria-pressed={values.categoria === cat.value}
                    onClick={() => setFieldValue("categoria", cat.value)}
                  >
                    <ImagenCategoria
                      $imagen={obtenerImagenCategoriaCompra(cat.value)}
                      aria-hidden="true"
                    />
                    <span className="nombre">{cat.label}</span>
                  </BotonCategoria>
                ))}
              </RejillaCategorias>
              {values.categoria && (
                <div style={{ marginTop: 2 }}>
                  <BadgeCategoria categoria={values.categoria} size="sm" />
                </div>
              )}
            </CampoWrapper>

            <CampoWrapper>
              <InputConIcono>
                <FaPen />
                <Field name="nota" type="text" placeholder="Nota o descripción" />
              </InputConIcono>
            </CampoWrapper>

            {movimientoInterno ? (
              <AvisoMovimientoInterno>
                <FaExclamationTriangle />
                <div>
                  <strong>Movimiento interno o ajuste</strong>
                  <p style={{ margin: "2px 0 0" }}>
                    Este registro se mantiene fuera del cálculo de gasto del mes.
                  </p>
                </div>
              </AvisoMovimientoInterno>
            ) : (
              <>
                {movimiento.monto < 0 && (
                  <TarjetaGastoPersonal $checked={values.esPersonal}>
                    <InfoPersonal>
                      <TituloPersonal $checked={values.esPersonal}>
                        <FaUser /> Gasto Personal
                      </TituloPersonal>
                      <SubtituloPersonal>
                        Se incluirá en tus métricas de consumo real
                      </SubtituloPersonal>
                    </InfoPersonal>
                    <SwitchTrack $checked={values.esPersonal}>
                      <Field type="checkbox" name="esPersonal" />
                    </SwitchTrack>
                  </TarjetaGastoPersonal>
                )}

                <TarjetaGastoPersonal $checked={values.ignorarEnResumen}>
                  <InfoPersonal>
                    <TituloPersonal $checked={values.ignorarEnResumen}>
                      <FaEyeSlash /> Excluir de los resúmenes
                    </TituloPersonal>
                    <SubtituloPersonal>
                      Para corregir un registro equivocado sin borrarlo
                    </SubtituloPersonal>
                  </InfoPersonal>
                  <SwitchTrack $checked={values.ignorarEnResumen}>
                    <Field type="checkbox" name="ignorarEnResumen" />
                  </SwitchTrack>
                </TarjetaGastoPersonal>
              </>
            )}

            <BtnSubmitModerno type="submit" disabled={isSubmitting}>
              <FaCheck /> {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </BtnSubmitModerno>
          </FormularioStyled>
        )}
      </Formik>
    </ContenedorModal>
  );
};
