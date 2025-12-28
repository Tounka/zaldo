import styled from "styled-components";
import { H2 } from "../genericos/titulos";
import { useEffect, useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik, useFormikContext } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { useContextoModales } from "../../contextos/modales";
import { ModalGenerico } from "./modalGenerico";
import { CardCuentaBtn } from "../cards/cardCuenta";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { HiCurrencyDollar, HiOutlinePencilAlt } from "react-icons/hi";
import { FaRegClock, FaTags } from "react-icons/fa";
import { agregarMovimiento } from "../../funciones/firebase/movimientos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { modificarMontoDesdeMovimiento } from "../../funciones/firebase/cuentas";

/* =======================
   ESTILOS
======================= */

const ContenedorFormulario = styled.div`
  width: 500px;
  max-width: 100%;
  max-height: 90%;
  display: grid;
  grid-template-rows: auto 1fr 60px;
  padding: 0 20px 20px;
  gap: 10px;
`;

const Formulario = styled(Form)`
  display: flex;
  flex-direction: column;
`;

const ContenedorInputs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ContenedorCards = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

const ContenedorPrimeraParte = styled.div`
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px 20px;
`;

/* =======================
   MODAL PRINCIPAL
======================= */

export const ModalAgregarMovimiento = () => {
    const { usuario, setMovimientos, movimientos, cuentas, setCuentas } =
        useContextoGeneral();
    const { isOpenAgregarMovimiento, setIsOpenAgregarMovimiento } =
        useContextoModales();

    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setCuentaSeleccionada(null);
    }, [isOpenAgregarMovimiento]);

    const onClose = () => setIsOpenAgregarMovimiento(false);

    const handleActualizar = (nuevoMovimiento) => {
        const fecha = convertirADatosFecha(new Date());
        const key = `${fecha.anio}${fecha.mes}`;

        setMovimientos((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), nuevoMovimiento],
        }));
    };

    const handleActualizarMonto = (dataActualizada) => {
        setCuentas((prev) =>
            prev.map((cuenta) =>
                cuenta.id === cuentaSeleccionada.id
                    ? { ...cuenta, ...dataActualizada }
                    : cuenta
            )
        );
    };



    const validateForm = (values) => {
        const errors = {};
        if (validarCampoRequerido(values.monto).error) errors.monto = "Requerido";
     
        return errors;
    };

    const initialValues = {
        cuentaAsociada: cuentaSeleccionada?.id || "",
        nombreCuenta: cuentaSeleccionada?.nombre || "",
        monto: "",
        categoria: "",
        nota: "",
        tipoDeMovimiento: "gasto",
        pagoAMeses:
            cuentaSeleccionada?.tipoDeCuenta === "credito"
                ? "revolvente"
                : null,
    };

    const onSubmit = async (values, { resetForm }) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (values.tipoDeMovimiento !== "gasto") {
                values.pagoAMeses = null;
            }

            const movimientoAgregado = await agregarMovimiento(
                values,
                usuario.uid
            );
            const cuentaActualizada = await modificarMontoDesdeMovimiento(
                values,
                usuario.uid,
                cuentaSeleccionada
            );

            if (Object.keys(movimientos).length !== 0) {
                handleActualizar(movimientoAgregado);
            }

            handleActualizarMonto(cuentaActualizada);


            resetForm();
            onClose();
            setCuentaSeleccionada(null);
        } catch (err) {
            console.error("Error al agregar movimiento", err);
        }

        setIsSubmitting(false);
    };

    return (
        <ModalGenerico isOpen={isOpenAgregarMovimiento} onClose={onClose}>
            {!cuentaSeleccionada ? (
                <SeleccionarCuenta setCuentaSeleccionada={setCuentaSeleccionada} />
            ) : (
                <Formik
                    enableReinitialize
                    initialValues={initialValues}
                    validate={validateForm}
                    onSubmit={onSubmit}
                >
                    <Formulario>
                        <FormularioAgregarCuenta
                            cuentaSeleccionada={cuentaSeleccionada}
                        />
                    </Formulario>
                </Formik>
            )}
        </ModalGenerico>
    );
};

/* =======================
   SELECCIONAR CUENTA
======================= */

const SeleccionarCuenta = ({ setCuentaSeleccionada }) => {
    const { cuentas } = useContextoGeneral();

    const cuentasOrdenadas = [...cuentas].sort(
        (a, b) => b.saldoALaFecha - a.saldoALaFecha
    );

    return (
        <ContenedorPrimeraParte>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Selecciona una cuenta
            </H2>

            <ContenedorCards>
                {cuentasOrdenadas.map((cuenta, index) => (
                    <CardCuentaBtn
                        key={`cuenta-${index}`}
                        cuenta={cuenta}
                        handleClick={() => setCuentaSeleccionada(cuenta)}
                    />
                ))}
            </ContenedorCards>
        </ContenedorPrimeraParte>
    );
};

/* =======================
   FORMULARIO
======================= */

export const FormularioAgregarCuenta = ({ cuentaSeleccionada }) => (
    <ContenedorFormulario>
        <FormularioMovimiento cuentaSeleccionada={cuentaSeleccionada} />
    </ContenedorFormulario>
);

const FormularioMovimiento = ({ cuentaSeleccionada }) => {
    const { values } = useFormikContext();

    const mostrarPagoAMeses =
        cuentaSeleccionada?.tipoDeCuenta === "credito" &&
        values.tipoDeMovimiento === "gasto";

    return (
        <>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Agregar Movimiento
            </H2>

            <ContenedorInputs>
                <FieldForm
                    name="monto"
                    type="number"
                    placeholder="Monto"
                    icon={<HiCurrencyDollar />}
                    step=".01"
                    min="0"
                />

                <SelectForm
                    name="categoria"
                    options={categoriasEsqueleto}
                    placeholder="Categoría"
                    icon={<FaTags />}
                />

                <FieldForm
                    name="nota"
                    type="text"
                    placeholder="Nota (opcional)"
                    icon={<HiOutlinePencilAlt />}
                />

                <div style={{ display: "flex", gap: "10px", width: "100%", }}>
                    <div style={{ width: "100%" }} >

                        <SelectForm

                            name="tipoDeMovimiento"
                            options={[
                                { value: "gasto", label: "Gasto" },
                                { value: "ingreso", label: "Ingreso" },
                            ]}
                            placeholder="Tipo de movimiento"
                            icon={<FaTags />}
                        />
                    </div>

                    {mostrarPagoAMeses && (
                        <div style={{ width: "100%" }} >

                            <SelectForm
                                name="pagoAMeses"
                                options={[
                                    { value: "revolvente", label: "No MSI" },
                                    { value: "msi", label: "MSI" },
                                ]}
                                placeholder="¿Es a meses?"
                                icon={<FaRegClock />}
                            />
                        </div>
                    )}
                </div>
            </ContenedorInputs>

            <BtnSubmit type="submit">Enviar</BtnSubmit>
        </>
    );
};
