import styled from "styled-components";
import { useEffect, useState } from "react";
import { FaDownload, FaWhatsapp, FaReceipt, FaPrint } from "react-icons/fa";
import { ModalGenerico } from "../../componentes/modales/modalGenerico";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import {
    obtenerDataUrlComprobante,
    descargarComprobanteImagen,
    compartirComprobante,
    abrirComprobantePdf,
} from "../../funciones/generadorComprobante";

const ContenedorModal = styled.div`
  padding: 0 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const HeaderModal = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
`;

const PreviewImagenWrapper = styled.div`
  width: 100%;
  max-width: 380px;
  max-height: 520px;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid rgba(83, 59, 143, 0.15);
  box-shadow: 0 8px 24px rgba(83, 59, 143, 0.12);
  display: flex;
  justify-content: center;
  background: #f6f5fa;
`;

const ImagenComprobante = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const BotonesAccion = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 380px;
  flex-wrap: wrap;
`;

const BtnDescargar = styled.button`
  flex: 1;
  min-width: 150px;
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(83, 59, 143, 0.2);
  transition: all 0.2s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: translateY(-1px);
  }
`;

const BtnWhatsApp = styled.button`
  flex: 1;
  min-width: 150px;
  background: #25d366;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
  transition: all 0.2s ease;

  &:hover {
    background: #20ba5a;
    transform: translateY(-1px);
  }
`;

const BtnPdf = styled(BtnDescargar)`
  background: #30205f;

  &:hover {
    background: #1f143f;
  }
`;

export const ModalComprobantePago = ({ isOpen, onClose, datosComprobante }) => {
    const [dataUrl, setDataUrl] = useState(null);

    useEffect(() => {
        if (isOpen && datosComprobante) {
            try {
                const url = obtenerDataUrlComprobante(datosComprobante);
                setDataUrl(url);
            } catch (e) {
                console.error("Error al generar comprobante:", e);
            }
        }
    }, [isOpen, datosComprobante]);

    if (!datosComprobante) return null;

    const handleDescargar = () => {
        descargarComprobanteImagen(datosComprobante);
    };

    const handleWhatsApp = () => {
        compartirComprobante(datosComprobante);
    };

    const handlePdf = () => {
        abrirComprobantePdf(datosComprobante);
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <ContenedorModal>
                <HeaderModal>
                    <H2 size="20px" color="var(--colorMorado)">
                        <FaReceipt style={{ marginRight: 6 }} /> Comprobante de Abono
                    </H2>
                    <TxtGenerico size="13px" color="#666">
                        Comprobante formal para {datosComprobante.nombreDeudor}
                    </TxtGenerico>
                </HeaderModal>

                {dataUrl && (
                    <PreviewImagenWrapper>
                        <ImagenComprobante src={dataUrl} alt="Comprobante de Pago" />
                    </PreviewImagenWrapper>
                )}

                <BotonesAccion>
                    <BtnPdf onClick={handlePdf}>
                        <FaPrint /> Imprimir / Guardar PDF
                    </BtnPdf>
                    <BtnDescargar onClick={handleDescargar}>
                        <FaDownload /> Descargar PNG
                    </BtnDescargar>
                    <BtnWhatsApp onClick={handleWhatsApp}>
                        <FaWhatsApp /> Enviar por WhatsApp
                    </BtnWhatsApp>
                </BotonesAccion>
            </ContenedorModal>
        </ModalGenerico>
    );
};
