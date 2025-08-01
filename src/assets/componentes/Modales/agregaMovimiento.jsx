import styled from "styled-components";
import { H2 } from "../genericos/titulos";
import { useEffect, useState } from "react";
import { useContextoGeneral } from "../../contextos/general";
import { Form, Formik } from "formik";
import { BtnSubmit, FieldForm, SelectForm } from "../genericos/FormulariosV1";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { useContextoModales } from "../../contextos/modales";
import { ModalGenerico } from "./modalGenerico";
import { CardCuentaBtn } from "../cards/cardCuenta";
import { categoriasEsqueleto } from "../../funciones/utils/esqueletos";
import { HiCurrencyDollar, HiOutlinePencilAlt } from "react-icons/hi";
import { FaTags } from "react-icons/fa";
import { agregarMovimiento, obtenerMovimientosPorAnioMes } from "../../funciones/firebase/movimientos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { modificarMontoDesdeMovimiento } from "../../funciones/firebase/cuentas";

// Estilos
const ContenedorFormulario = styled.div`
  width: 500px;
  max-width: 100%;
  height: auto;
  max-height: 90%;
  display: grid;
  grid-template-rows: auto 1fr 60px;
  padding: 0 20px 20px 20px;
  align-items: center;
  gap: 10px;
`;

const Formulario = styled(Form)`
  display: flex;
  flex-direction: column;
`;

const ContenedorInputs = styled.div`
  width: 100%;
  justify-content: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ContenedorCards = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

// Componente principal
export const ModalAgregarMovimiento = () => {
    const { usuario, setMovimientos, movimientos, cuentas, setCuentas } = useContextoGeneral();
    const { isOpenAgregarMovimiento, setIsOpenAgregarMovimiento } = useContextoModales();
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleActualizar = (nuevoMovimiento) => {
        const fecha = convertirADatosFecha(new Date());
        const fechaConvertida = `${fecha.anio}${fecha.mes}`;

        setMovimientos(prev => {
            const movimientosPrevios = prev[fechaConvertida] || [];

            return {
                ...prev,
                [fechaConvertida]: [...movimientosPrevios, nuevoMovimiento],
            };
        });
    };
    const handleActualizarMonto = (monto) => {
        const arregloModificado = cuentas.map((cuenta) =>
            cuenta.id === cuentaSeleccionada.id
                ? { ...cuentaSeleccionada, saldoALaFecha: Number(monto) }
                : { ...cuenta }
        );
        setCuentas(arregloModificado);
    };

    useEffect(() => {
        setCuentaSeleccionada(null);
    }, [isOpenAgregarMovimiento])
    const onClose = () => setIsOpenAgregarMovimiento(false);


    const validateForm = (values) => {
        const errors = {};
        const { error: nombreError } = validarCampoRequerido(values.nombreCuenta);
        const { error: cuentaAsociadaError } = validarCampoRequerido(values.cuentaAsociada);
        const { error: montoError } = validarCampoRequerido(values.monto);
        const { error: categoriaError } = validarCampoRequerido(values.categoria);

        if (nombreError) errors.nombreCuenta = nombreError;
        if (cuentaAsociadaError) errors.nombreCuenta = cuentaAsociadaError;
        if (montoError) errors.nombreCuenta = montoError;
        if (categoriaError) errors.nombreCuenta = categoriaError;

        return errors;
    };

    const initialValues = {
        cuentaAsociada: cuentaSeleccionada?.id || "",
        nombreCuenta: cuentaSeleccionada?.nombre || "",
        monto: "",
        categoria: "",
        nota: "",
        tipoDeMovimiento: "gasto",
    };

    const onSubmit = async (values, { resetForm }) => {
        if (!isSubmitting) {
            setIsSubmitting(true);
            try {

                const movimientoAgregado = await agregarMovimiento(values, usuario.uid);
                const cuentaActualizada = await modificarMontoDesdeMovimiento(values, usuario.uid, cuentaSeleccionada)
                
                if (movimientos.length !== 0) {
                    handleActualizar(movimientoAgregado);
                    
                }
                
                handleActualizarMonto(cuentaActualizada.saldoALaFecha)
                resetForm();
                onClose();
                setCuentaSeleccionada(null);


            } catch (error) {
                console.log("Error al agregar movimiento:");
            }
            setIsSubmitting(false);
        }

    };

    return (
        <ModalGenerico isOpen={isOpenAgregarMovimiento} onClose={onClose}>
            {!cuentaSeleccionada ? (
                <SeleccionarCuenta setCuentaSeleccionada={setCuentaSeleccionada} />
            ) : (
                <Formik
                    validate={validateForm}
                    initialValues={initialValues}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {({ handleSubmit }) => (
                        <Formulario onSubmit={handleSubmit}>
                            <FormularioAgregarCuenta />
                        </Formulario>
                    )}
                </Formik>
            )}
        </ModalGenerico>
    );
};

const ContenedorPrimeraParte = styled.div`
    width: 100%;
    max-width: 600px;
    height: auto;
    max-height: auto;
    gap: 20px;
    display: flex;
    flex-direction: column;
    padding: 0 20px 20px 20px;

`
const SeleccionarCuenta = ({ setCuentaSeleccionada }) => {
    const { cuentas } = useContextoGeneral();

    const cuentasOrdenadas = cuentas.sort((a, b) => b.saldoALaFecha - a.saldoALaFecha);

    return (
        <ContenedorPrimeraParte>
            <H2 size="30px" align="center" color="var(--colorMorado)">Selecciona una cuenta</H2>
            <ContenedorCards>
                {cuentasOrdenadas.map((cuenta, index) => (
                    <CardCuentaBtn
                        cuenta={cuenta}
                        key={`cuenta-${index}`}
                        handleClick={() => setCuentaSeleccionada(cuenta)}
                    />
                ))}
            </ContenedorCards>
        </ContenedorPrimeraParte>
    );
};

// Formulario de movimiento
export const FormularioAgregarCuenta = () => {

    return (
        <ContenedorFormulario>
            <FormularioMovimiento />
        </ContenedorFormulario>
    );
};

const FormularioMovimiento = () => {
    return (
        <>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Agregar Movimiento
            </H2>
            <ContenedorInputs>
                <FieldForm min="0" name="monto" type="number" placeholder="Monto" icon={<HiCurrencyDollar />} step=".1" />
                <SelectForm options={categoriasEsqueleto} name="categoria" type="text" placeholder="Categoría" icon={<FaTags />} />
                <FieldForm name="nota" type="text" placeholder="Nota (opcional)" icon={<HiOutlinePencilAlt />} />
                <SelectForm options={[{ value: "gasto", label: "Gasto" }, { value: "ingreso", label: "Ingreso" }]} name="tipoDeMovimiento" type="text" placeholder="Tipo de movimiento" icon={<FaTags />} />
            </ContenedorInputs>
            <BtnSubmit type="submit">Enviar</BtnSubmit>
        </>
    )
}
