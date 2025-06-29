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
import { agregarMovimiento, movimientoEntreCuentas } from "../../funciones/firebase/movimientos";
import { convertirADatosFecha } from "../../funciones/utils/fechas";
import { modificarCuenta, modificarCuentaDesdeMovimientoEntreCuentas, modificarMontoDesdeMovimiento } from "../../funciones/firebase/cuentas";

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

export const ModalAgregarMovimientoEntreCuentas = () => {
    const { cuentas, setCuentas, usuario } = useContextoGeneral();
    const { isOpenMovimientoEntreCuentas, setIsOpenMovimientoEntreCuentas } = useContextoModales();

    const [cuentaOrigen, setCuentaOrigen] = useState(null);
    const [formValues, setFormValues] = useState(null);

    useEffect(() => {
        setCuentaOrigen(null);
        setFormValues(null);
    }, [isOpenMovimientoEntreCuentas]);

    const onClose = () => setIsOpenMovimientoEntreCuentas(false);

    const handleChangeMontos = (actualizaciones) => {
        setCuentas(prev =>
            prev.map(cuenta => {
                const actualizada = actualizaciones.find(c => c.id === cuenta.id);
                return actualizada
                    ? { ...cuenta, saldoALaFecha: Number(actualizada.saldoALaFecha) }
                    : cuenta;
            })
        );
    };


    const handleSelectDestino = async (cuentaDestino) => {
        if (!formValues || !cuentaOrigen || !cuentaDestino) return;

        const dataActualizada = await movimientoEntreCuentas(cuentaOrigen, cuentaDestino, formValues, usuario.uid);
        const cuentaOrigenActualizado = await modificarCuentaDesdeMovimientoEntreCuentas(dataActualizada.cuentaOrigen, usuario.uid, dataActualizada.cuentaOrigen.id);
        const cuentaDestinoActualizado = await modificarCuentaDesdeMovimientoEntreCuentas(dataActualizada.cuentaDestinoModificada, usuario.uid, dataActualizada.cuentaDestinoModificada.id);

        handleChangeMontos([
            { id: dataActualizada.cuentaOrigen.id, saldoALaFecha: cuentaOrigenActualizado.saldoALaFecha },
            { id: dataActualizada.cuentaDestinoModificada.id, saldoALaFecha: cuentaDestinoActualizado.saldoALaFecha },
        ]);



        setFormValues(null);
        setCuentaOrigen(null);
        onClose();
    };

    return (
        <ModalGenerico isOpen={isOpenMovimientoEntreCuentas} onClose={onClose}>
            {!cuentaOrigen ? (
                <SeleccionarCuenta
                    titulo="Selecciona la cuenta de origen"
                    cuentasFiltradas={cuentas}
                    setCuentaSeleccionada={setCuentaOrigen}
                />
            ) : !formValues ? (
                <Formik
                    initialValues={{
                        monto: "",
                        categoria: "",
                        nota: "",
                        tipoDeMovimiento: "gasto",
                    }}
                    validate={(values) => {
                        const errors = {};
                        if (!values.monto) errors.monto = "Requerido";
                        if (!values.categoria) errors.categoria = "Requerido";
                        return errors;
                    }}
                    onSubmit={(values) => setFormValues(values)}
                >
                    {({ handleSubmit }) => (
                        <Formulario onSubmit={handleSubmit}>
                            <FormularioAgregarCuenta cuentaOrigen={cuentaOrigen} />
                        </Formulario>
                    )}
                </Formik>
            ) : (
                <SeleccionarCuenta
                    titulo="Selecciona la cuenta destino"
                    cuentasFiltradas={cuentas.filter((c) => c.id !== cuentaOrigen.id)}
                    setCuentaSeleccionada={handleSelectDestino}
                />
            )}
        </ModalGenerico>
    );
};


const ContenedorPrimeraParte = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px 20px;
`;

const SeleccionarCuenta = ({ titulo, cuentasFiltradas, setCuentaSeleccionada }) => {
    const cuentasOrdenadas = [...cuentasFiltradas].sort((a, b) => b.saldoALaFecha - a.saldoALaFecha);

    return (
        <ContenedorPrimeraParte>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                {titulo}
            </H2>
            <ContenedorCards>
                {cuentasOrdenadas.map((cuenta) => (
                    <CardCuentaBtn
                        key={cuenta.id}
                        cuenta={cuenta}
                        handleClick={() => setCuentaSeleccionada(cuenta)}
                    />
                ))}
            </ContenedorCards>
        </ContenedorPrimeraParte>
    );
};

const FormularioAgregarCuenta = ({ cuentaOrigen }) => {
    return (
        <ContenedorFormulario>
            <H2 size="30px" align="center" color="var(--colorMorado)">
                Movimiento desde: {cuentaOrigen.nombre}
            </H2>
            <ContenedorInputs>
                <FieldForm
                    name="monto"
                    type="number"
                    min="0"
                    step=".1"
                    placeholder="Monto"
                    icon={<HiCurrencyDollar />}
                />
                <SelectForm
                    name="categoria"
                    type="text"
                    placeholder="Categoría"
                    options={categoriasEsqueleto}
                    icon={<FaTags />}
                />
                <FieldForm
                    name="nota"
                    type="text"
                    placeholder="Nota (opcional)"
                    icon={<HiOutlinePencilAlt />}
                />
        
            </ContenedorInputs>
            <BtnSubmit type="submit">Continuar</BtnSubmit>
        </ContenedorFormulario>
    );
};
