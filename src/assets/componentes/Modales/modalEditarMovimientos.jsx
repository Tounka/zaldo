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
  FaArrowDown,
  FaArrowUp,
  FaUser,
  FaCheck,
  FaEdit,
  FaExclamationTriangle,
  FaEyeSlash,
} from "react-icons/fa";
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { BadgeCategoria } from "../../funciones/utils/coloresCategorias";
import { ModalEncabezado, RejillaCamposModal } from "./modalGenerico";
import { SelectorCategoriaVisual } from "../categorias/SelectorCategoriaVisual";
import { normalizarCategoriaCompra } from "../../funciones/categoriasCompra";

const ContenedorModal = styled.div`
  width: 100%;
  max-width: none;
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

const SelectorTipoWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f1f5f9;
`;

const BotonTipo = styled.button`
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 9px;
  background: ${({ $activo, $tipo }) => {
    if (!$activo) return "transparent";
    return $tipo === "gasto"
      ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
      : "linear-gradient(135deg, #10b981 0%, #059669 100%)";
  }};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#64748b")};
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;

  &:hover {
    background: ${({ $activo }) => ($activo ? undefined : "#e2e8f0")};
    color: ${({ $activo }) => ($activo ? "#ffffff" : "#1e293b")};
  }

  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    height: 38px;
    font-size: 12px;
  }
`;

const InputNotaPrincipal = styled(InputConIcono)`
  height: 54px;
`;

const RejillaCamposPrincipales = styled(RejillaCamposModal)`
  align-items: start;
`;

const RejillaCategorias = styled.div`
  width: 100%;
`;

const RejillaClasificacion = styled(RejillaCamposModal)`
  align-items: stretch;

  > label {
    height: 100%;
    box-sizing: border-box;
  }
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

const TarjetaGastoExtraordinario = styled(TarjetaGastoPersonal)`
  border-color: ${({ $checked }) => ($checked ? "#f6c76d" : "#e2e8f0")};
  background: ${({ $checked }) => ($checked ? "#fff8e8" : "#ffffff")};

  &:hover {
    border-color: #e7a82f;
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

const esMovimientoInternoEstructural = (movimiento = {}) =>
  Boolean(
    movimiento.esTransferencia ||
      movimiento.cuentaDestino ||
      movimiento.cuentaDestinoNombre ||
      movimiento.tipoOperacion === "transferencia" ||
      movimiento.tipoOperacion === "pago_tarjeta" ||
      movimiento.esAjusteSaldo === true
  );

const mismoMovimiento = (a, b) =>
  Boolean(
    a?.fechaMovimiento &&
      b?.fechaMovimiento &&
      Number(a.fechaMovimiento.seconds) === Number(b.fechaMovimiento.seconds) &&
      Number(a.fechaMovimiento.nanoseconds || 0) ===
        Number(b.fechaMovimiento.nanoseconds || 0)
  );

export const ModalEditarMovimiento = ({ movimiento, onClose, onActualizado }) => {
  const { usuario, setMovimientos, setCuentas } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const movimientoInterno = esMovimientoInterno(movimiento);
  const movimientoInternoEstructural = esMovimientoInternoEstructural(movimiento);

  const initialValues = {
    monto: Math.abs(movimiento.monto),
    tipoDeMovimiento: movimiento.monto < 0 ? "gasto" : "ingreso",
    categoria: normalizarCategoriaCompra(movimiento.categoria || ""),
    nota: movimiento.nota || "",
    esPersonal:
      !movimientoInterno &&
      Boolean(
        movimiento.esPersonal ||
          (movimiento.categoria === "personal" && movimiento.monto < 0)
      ),
    ignorarEnResumen: !movimientoInterno && Boolean(movimiento.ignorarEnResumen),
    esExtraordinario: !movimientoInterno && Boolean(movimiento.esExtraordinario),
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
        if (onActualizado) {
          onActualizado(movimientoEditado);
        } else {
          setMovimientos((prev) => {
            const fecha = convertirADatosFecha(movimiento.fechaMovimiento.toDate());
            const key = `${fecha.anio}${fecha.mes}`;

            return {
              ...prev,
              [key]: (prev[key] || []).map((m) =>
                mismoMovimiento(m, movimiento) ? movimientoEditado : m
              ),
            };
          });
        }

        /*
         * Corregir el monto ahora también corrige el saldo de la cuenta: se
         * aplica solo la diferencia. Los movimientos internos (transferencias,
         * pagos de tarjeta, ajustes) se quedan fuera porque tocan dos cuentas y
         * su saldo se recalcula por otra vía.
         */
        const cuentaAsociada = movimiento?.cuentaAsociada;

        if (!movimientoInternoEstructural && cuentaAsociada) {
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
        {({ values, setFieldValue }) => {
          const movimientoInternoActual = esMovimientoInterno({
            ...movimiento,
            categoria: values.categoria,
          });
          const cambiarTipoMovimiento = (tipo) => {
            setFieldValue("tipoDeMovimiento", tipo);

            // Una categorÃ­a reservada para transferencias solo debe bloquear
            // los resÃºmenes cuando realmente se trata de un movimiento interno.
            // Si fue elegida por error en un movimiento normal, la convertimos
            // al concepto correspondiente para que el cambio tambiÃ©n impacte
            // los cÃ¡lculos.
            if (
              !movimientoInternoEstructural &&
              ["transferencia", "pagoTarjeta", "ajusteDeSaldo", "ajusteDeSaldoMSI"].includes(values.categoria)
            ) {
              setFieldValue("categoria", tipo === "ingreso" ? "ingreso" : "");
            }
          };

          return (
          <FormularioStyled>
            {!movimientoInternoEstructural && (
              <SelectorTipoWrapper aria-label="Tipo de movimiento">
                <BotonTipo
                  type="button"
                  $tipo="gasto"
                  $activo={values.tipoDeMovimiento === "gasto"}
                  onClick={() => cambiarTipoMovimiento("gasto")}
                >
                  <FaArrowDown /> Gasto
                </BotonTipo>
                <BotonTipo
                  type="button"
                  $tipo="ingreso"
                  $activo={values.tipoDeMovimiento === "ingreso"}
                  onClick={() => cambiarTipoMovimiento("ingreso")}
                >
                  <FaArrowUp /> Ingreso
                </BotonTipo>
              </SelectorTipoWrapper>
            )}

            <RejillaCamposPrincipales>
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
                <InputNotaPrincipal>
                  <FaPen />
                  <Field name="nota" type="text" placeholder="Nota o descripción" />
                </InputNotaPrincipal>
              </CampoWrapper>
            </RejillaCamposPrincipales>

            <CampoWrapper>
              <RejillaCategorias role="group" aria-label="Categoría del movimiento">
                <SelectorCategoriaVisual
                  value={values.categoria}
                  onChange={(categoria) => setFieldValue("categoria", categoria)}
                />
              </RejillaCategorias>
              {values.categoria && (
                <div style={{ marginTop: 2 }}>
                  <BadgeCategoria categoria={values.categoria} size="sm" />
                </div>
              )}
            </CampoWrapper>

            {movimientoInternoActual ? (
              <AvisoMovimientoInterno>
                <FaExclamationTriangle />
                <div>
                  <strong>
                    {movimientoInternoEstructural
                      ? "Movimiento interno o ajuste"
                      : "Categor\u00eda de movimiento interno"}
                  </strong>
                  <p style={{ margin: "2px 0 0" }}>
                    {movimientoInternoEstructural
                      ? "Este registro se mantiene fuera del c\u00e1lculo de gasto del mes."
                      : "Si no es una transferencia, cambia el tipo y la categor\u00eda para incluirlo en tus res\u00famenes."}
                  </p>
                </div>
              </AvisoMovimientoInterno>
            ) : (
              <>
                {values.tipoDeMovimiento === "gasto" && (
                  <RejillaClasificacion>
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

                    <TarjetaGastoExtraordinario $checked={values.esExtraordinario}>
                      <InfoPersonal>
                        <TituloPersonal $checked={values.esExtraordinario}>
                          <FaExclamationTriangle /> Gasto extraordinario
                        </TituloPersonal>
                        <SubtituloPersonal>
                          No formará parte del promedio diario habitual
                        </SubtituloPersonal>
                      </InfoPersonal>
                      <SwitchTrack $checked={values.esExtraordinario}>
                        <Field type="checkbox" name="esExtraordinario" />
                      </SwitchTrack>
                    </TarjetaGastoExtraordinario>
                  </RejillaClasificacion>
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
          );
        }}
      </Formik>
    </ContenedorModal>
  );
};
