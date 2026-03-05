import styled from "styled-components";
import { Formik, Form } from "formik";
import { ModalGenerico } from "./modalGenerico";
import { FieldForm, BtnSubmit } from "../genericos/FormulariosV1";
import { H2 } from "../genericos/titulos";
import {
    FaDollarSign,
    FaCalendarAlt,
    FaUpload,
    FaTimes,
} from "react-icons/fa";
import { useRef, useState } from "react";

/* ======================= ESTILOS ======================= */

const ContenedorFormulario = styled.div`
  width: 480px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 24px 24px;
`;

const ContenedorInputs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Formulario = styled(Form)`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

/* ======================= COMPONENTE IMAGEN ======================= */

const AreaImagen = styled.div`
  width: 100%;
  min-height: 140px;
  border-radius: 12px;
  border: 2px dashed var(--colorMorado);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  position: relative;
  overflow: hidden;
  background-color: rgba(83, 59, 143, 0.05);

  &:hover {
    background-color: rgba(83, 59, 143, 0.1);
    border-color: var(--colorMoradoSecundario);
  }
`;

const PreviewImg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
`;

const OverlayRemover = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  font-size: 14px;
  z-index: 2;
  transition: background 0.15s;

  &:hover {
    background: var(--colorRojo);
  }
`;

const TxtAreaImagen = styled.span`
  font-size: var(--fontSm);
  color: var(--colorMorado);
  font-weight: 600;
  pointer-events: none;
`;

const SubtxtAreaImagen = styled.span`
  font-size: var(--fontXs);
  color: var(--colorMoradoSecundario);
  pointer-events: none;
`;

const IconoUpload = styled(FaUpload)`
  font-size: 28px;
  color: var(--colorMorado);
  pointer-events: none;
`;

/**
 * Componente para seleccionar/previsualizar imagen de comprobante.
 * Por ahora guarda solo placeholder local (no sube a Storage).
 */
export const ImagenPagoPrestamo = ({ onImagenSeleccionada }) => {
    const [preview, setPreview] = useState(null);
    const inputRef = useRef(null);

    const handleClick = () => {
        if (!preview) inputRef.current?.click();
    };

    const handleChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Optimizar: crear blob URL local como preview
        const url = URL.createObjectURL(file);
        setPreview(url);
        onImagenSeleccionada?.(file); // pasa el file al padre (por ahora placeholder)
    };

    const handleRemover = (e) => {
        e.stopPropagation();
        setPreview(null);
        if (inputRef.current) inputRef.current.value = "";
        onImagenSeleccionada?.(null);
    };

    return (
        <AreaImagen onClick={handleClick}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleChange}
            />
            {preview ? (
                <>
                    <PreviewImg src={preview} alt="Comprobante" />
                    <OverlayRemover type="button" onClick={handleRemover}>
                        <FaTimes />
                    </OverlayRemover>
                </>
            ) : (
                <>
                    <IconoUpload />
                    <TxtAreaImagen>Agregar comprobante</TxtAreaImagen>
                    <SubtxtAreaImagen>JPG, PNG o HEIC • Opcional</SubtxtAreaImagen>
                </>
            )}
        </AreaImagen>
    );
};

/* ======================= MODAL PRINCIPAL ======================= */

export const ModalAgregarPagoPrestamo = ({
    isOpen,
    onClose,
    prestamo,
    onPagoAgregado,
}) => {
    const [imagenFile, setImagenFile] = useState(null);

    const ultimoMonto =
        prestamo?.pagos?.length > 0
            ? prestamo.pagos[prestamo.pagos.length - 1].monto
            : prestamo?.diasDePago && prestamo?.montoPrestado && prestamo?.interesEstimado
                ? Number(
                    (
                        (prestamo.montoPrestado *
                            (prestamo.interesEstimado / 100 / 365) *
                            prestamo.diasDePago) +
                        (prestamo.montoPrestado / Math.ceil(365 / prestamo.diasDePago))
                    ).toFixed(2)
                )
                : "";

    const hoy = new Date().toISOString().split("T")[0];

    const initialValues = {
        fecha: hoy,
        monto: ultimoMonto,
    };

    const validate = (values) => {
        const errors = {};
        if (!values.monto || Number(values.monto) <= 0)
            errors.monto = "El monto debe ser mayor a 0";
        if (!values.fecha) errors.fecha = "La fecha es requerida";
        return errors;
    };

    const handleSubmit = async (values, { resetForm }) => {
        await onPagoAgregado?.({
            fecha: new Date(values.fecha + "T12:00:00"),
            monto: Number(values.monto),
            imagenUrl: null, // placeholder por ahora
        });
        resetForm();
        onClose();
    };

    if (!prestamo) return null;

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <Formik
                initialValues={initialValues}
                enableReinitialize
                validate={validate}
                onSubmit={handleSubmit}
            >
                <Formulario>
                    <ContenedorFormulario>
                        <H2 size="24px" align="center" color="var(--colorMorado)">
                            Agregar Pago
                        </H2>
                        <H2 size="14px" align="center" color="var(--colorMoradoSecundario)" weight="normal">
                            {prestamo.nombre}
                        </H2>

                        <ContenedorInputs>
                            <FieldForm
                                id="fecha"
                                name="fecha"
                                type="date"
                                placeholder="Fecha del pago"
                                icon={<FaCalendarAlt />}
                                label="Fecha"
                            />
                            <FieldForm
                                id="monto"
                                name="monto"
                                type="number"
                                placeholder="Monto del pago"
                                icon={<FaDollarSign />}
                                label="Monto"
                                min="0"
                                step="0.01"
                            />
                            <ImagenPagoPrestamo onImagenSeleccionada={setImagenFile} />
                        </ContenedorInputs>

                        <BtnSubmit type="submit">Registrar Pago</BtnSubmit>
                    </ContenedorFormulario>
                </Formulario>
            </Formik>
        </ModalGenerico>
    );
};
