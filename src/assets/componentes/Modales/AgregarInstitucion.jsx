import styled from "styled-components";
import { ModalEncabezado, ModalGenerico } from "./modalGenerico";
import { useState } from "react";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { Form, Formik } from "formik";
import { validarCampoRequerido } from "../../funciones/validaciones";
import { altaDeInstitucion } from "../../funciones/firebase/instituciones";
import { FaLandmark, FaCheck, FaBuilding } from "react-icons/fa";
import Swal from "sweetalert2";

const ContenedorModal = styled.div`
  width: 100%;
  max-width: none;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 20px 24px 20px;
  box-sizing: border-box;
`;

const Formulario = styled(Form)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CampoGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: #334155;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  svg {
    color: #6366f1;
    font-size: 16px;
    flex-shrink: 0;
  }

  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #0f172a;
    font-family: inherit;

    &::placeholder {
      color: #94a3b8;
    }
  }
`;

const ErrorMsg = styled.span`
  color: #ef4444;
  font-size: 11px;
  font-weight: 600;
`;

const BtnSubmitModerno = styled.button`
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: all 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
    transform: none;
  }
`;

export const ModalAgregarIntituciones = () => {
  const { usuario, setInstituciones } = useAppStore();
  const { isOpenAgregarInstituciones, setIsOpenAgregarInstituciones } = useModalStore();

  const onClose = () => setIsOpenAgregarInstituciones(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (values) => {
    const errors = {};
    const { error } = validarCampoRequerido(values.nombreInstitucion);
    if (error) {
      errors.nombreInstitucion = "Ingresa el nombre de la institución";
    }
    return errors;
  };

  const initialValues = {
    nombreInstitucion: "",
  };

  const onSubmit = async (values, { resetForm }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const institucionNueva = await altaDeInstitucion(values, usuario.uid);
      if (institucionNueva) {
        setInstituciones((prev) => [...prev, institucionNueva]);
        resetForm();
        onClose();
        Swal.fire({
          title: "Institución agregada",
          text: `"${values.nombreInstitucion}" registrada con éxito.`,
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error al agregar institución:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalGenerico isOpen={isOpenAgregarInstituciones} onClose={onClose}>
      <ContenedorModal>
        <ModalEncabezado
          icon={<FaBuilding />}
          title="Nueva Institución"
          description="Registra un banco, fintech o billetera digital"
        />

        <Formik
          validate={validateForm}
          initialValues={initialValues}
          onSubmit={onSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting: formikLoading }) => (
            <Formulario>
              <CampoGrupo>
                <Label htmlFor="nombreInstitucion">Nombre de la institución</Label>
                <InputWrapper>
                  <FaLandmark />
                  <input
                    id="nombreInstitucion"
                    name="nombreInstitucion"
                    type="text"
                    placeholder="Ej. Santander, BBVA, Nu, Mercado Pago..."
                    value={values.nombreInstitucion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoFocus
                  />
                </InputWrapper>
                {touched.nombreInstitucion && errors.nombreInstitucion && (
                  <ErrorMsg>{errors.nombreInstitucion}</ErrorMsg>
                )}
              </CampoGrupo>

              <BtnSubmitModerno
                type="submit"
                disabled={isSubmitting || formikLoading || !values.nombreInstitucion.trim()}
              >
                <FaCheck /> {isSubmitting ? "Guardando..." : "Guardar Institución"}
              </BtnSubmitModerno>
            </Formulario>
          )}
        </Formik>
      </ContenedorModal>
    </ModalGenerico>
  );
};
