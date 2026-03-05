import styled, { keyframes } from "styled-components";
import { Formik, Form } from "formik";
import { useEffect, useState } from "react";
import {
    FaUser,
    FaDollarSign,
    FaPercent,
    FaCalendarAlt,
    FaList,
    FaHandHoldingUsd,
} from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { crearPrestamo, obtenerPrestamosPendientes, agregarPago } from "../../funciones/firebase/prestamos";
import { FieldForm, SelectForm, BtnSubmit } from "../../componentes/genericos/FormulariosV1";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import { CardPrestamo } from "../../componentes/cards/cardPrestamo";

/* ======================= ANIMACIONES ======================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ======================= ESTILOS ======================= */

const Pagina = styled.div`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: ${fadeUp} 0.4s ease;
`;

const SeccionFormulario = styled.div`
  width: 100%;
  background: rgba(83, 59, 143, 0.06);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 18px;
  padding: 24px;
`;

const HeaderSeccion = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;

  svg {
    font-size: 22px;
    color: var(--colorMorado);
  }
`;

const FormularioStyled = styled(Form)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const BtnWrapper = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
`;

const SeccionPrestamos = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GridPrestamos = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 680px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1100px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const EstadoVacio = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  opacity: 0.5;

  svg {
    font-size: 48px;
    color: var(--colorMorado);
  }
`;

/* ======================= CONSTANTES ======================= */

const OPCIONES_ESTADO = [
    { value: "pendiente", label: "Pendiente" },
    { value: "pagado", label: "Pagado" },
];

/* ======================= COMPONENTE ======================= */

export const PaginaPrestamosUx = () => {
    const { usuario } = useAppStore();
    const [prestamos, setPrestamos] = useState([]);
    const [cargando, setCargando] = useState(true);

    /* ── Cargar préstamos pendientes ── */
    useEffect(() => {
        const cargar = async () => {
            if (!usuario?.uid) return;
            setCargando(true);
            const data = await obtenerPrestamosPendientes(usuario.uid);
            setPrestamos(data);
            setCargando(false);
        };
        cargar();
    }, [usuario]);

    /* ── Crear nuevo préstamo ── */
    const handleCrear = async (values, { resetForm }) => {
        try {
            const nuevo = await crearPrestamo(values, usuario.uid);
            if (nuevo.estado === "pendiente") {
                setPrestamos((prev) => [nuevo, ...prev]);
            }
            resetForm();
        } catch (e) {
            console.error("Error al crear préstamo:", e);
        }
    };

    /* ── Agregar pago (desde card) ── */
    const handlePagoAgregado = async (prestamoId, nuevoPago) => {
        try {
            const pago = await agregarPago(usuario.uid, prestamoId, nuevoPago);
            setPrestamos((prev) =>
                prev.map((p) =>
                    p.id === prestamoId ? { ...p, pagos: [...(p.pagos || []), pago] } : p
                )
            );
        } catch (e) {
            console.error("Error al agregar pago:", e);
        }
    };

    /* ── Valores iniciales formulario ── */
    const initialValues = {
        nombre: "",
        montoPrestado: "",
        interesEstimado: "",
        diasDePago: "",
        estado: "pendiente",
    };

    const validate = (values) => {
        const errors = {};
        if (!values.nombre) errors.nombre = "Requerido";
        if (!values.montoPrestado || Number(values.montoPrestado) <= 0)
            errors.montoPrestado = "Debe ser mayor a 0";
        if (!values.interesEstimado || Number(values.interesEstimado) < 0)
            errors.interesEstimado = "Debe ser ≥ 0";
        if (!values.diasDePago || Number(values.diasDePago) <= 0)
            errors.diasDePago = "Debe ser mayor a 0";
        return errors;
    };

    return (
        <Pagina>
            {/* ── SECCIÓN FORMULARIO ── */}
            <SeccionFormulario>
                <HeaderSeccion>
                    <FaHandHoldingUsd />
                    <H2 size="20px" color="var(--colorMorado)">
                        Nuevo Préstamo
                    </H2>
                </HeaderSeccion>

                <Formik
                    initialValues={initialValues}
                    validate={validate}
                    onSubmit={handleCrear}
                >
                    <FormularioStyled>
                        <FieldForm
                            id="nombre"
                            name="nombre"
                            type="text"
                            placeholder="Nombre del deudor"
                            icon={<FaUser />}
                        />
                        <FieldForm
                            id="montoPrestado"
                            name="montoPrestado"
                            type="number"
                            placeholder="Monto prestado"
                            icon={<FaDollarSign />}
                            min="0"
                            step="0.01"
                        />
                        <FieldForm
                            id="interesEstimado"
                            name="interesEstimado"
                            type="number"
                            placeholder="Interés estimado (%)"
                            icon={<FaPercent />}
                            min="0"
                            step="0.01"
                        />
                        <FieldForm
                            id="diasDePago"
                            name="diasDePago"
                            type="number"
                            placeholder="Días de pago"
                            icon={<FaCalendarAlt />}
                            min="1"
                        />
                        <SelectForm
                            id="estado"
                            name="estado"
                            options={OPCIONES_ESTADO}
                            placeholder="Estado"
                            icon={<FaList />}
                        />
                        <BtnWrapper>
                            <BtnSubmit type="submit">Crear Préstamo</BtnSubmit>
                        </BtnWrapper>
                    </FormularioStyled>
                </Formik>
            </SeccionFormulario>

            {/* ── SECCIÓN TARJETAS ── */}
            <SeccionPrestamos>
                <HeaderSeccion>
                    <FaList />
                    <H2 size="20px" color="var(--colorMorado)">
                        Préstamos Pendientes
                    </H2>
                </HeaderSeccion>

                {cargando ? (
                    <TxtGenerico color="var(--colorMorado)" align="center">
                        Cargando préstamos...
                    </TxtGenerico>
                ) : prestamos.length === 0 ? (
                    <EstadoVacio>
                        <FaHandHoldingUsd />
                        <TxtGenerico color="var(--colorMorado)" align="center">
                            No hay préstamos pendientes
                        </TxtGenerico>
                    </EstadoVacio>
                ) : (
                    <GridPrestamos>
                        {prestamos.map((prestamo) => (
                            <CardPrestamo
                                key={prestamo.id}
                                prestamo={prestamo}
                                onPagoAgregado={handlePagoAgregado}
                            />
                        ))}
                    </GridPrestamos>
                )}
            </SeccionPrestamos>
        </Pagina>
    );
};
