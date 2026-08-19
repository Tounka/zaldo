import styled from "styled-components";
import { useEffect, useState } from "react";
import { FaDownload, FaWhatsapp, FaReceipt, FaPrint, FaEdit } from "react-icons/fa";
import { ModalGenerico } from "../../componentes/modales/modalGenerico";
import { H2, TxtGenerico } from "../../componentes/genericos/titulos";
import {
    descargarComprobanteImagen,
    compartirComprobante,
    abrirComprobantePdf,
} from "../../funciones/generadorComprobante";
import { fnFormatMoney } from "../../funciones/prestamosCalculos";

const ContenedorModal = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const HeaderModal = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
`;

const EditorWorkspace = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(250px, .9fr) minmax(280px, 1.1fr);
  gap: 18px;
  align-items: start;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const EditorPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  border: 1px solid rgba(83, 59, 143, .14);
  border-radius: 14px;
  background: #fbfaff;
`;

const EditorHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: #30244a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .04em;
`;

const CampoEdicion = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #6f6878;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
`;

const InputEdicion = styled.input`
  width: 100%;
  min-height: 36px;
  border: 1px solid rgba(83, 59, 143, .18);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  color: #292331;
  font-size: 13px;
  font-weight: 600;

  &:focus { outline: none; border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .1); }
`;

const TextareaEdicion = styled.textarea`
  width: 100%;
  min-height: 60px;
  border: 1px solid rgba(83, 59, 143, .18);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  color: #292331;
  font: inherit;
  font-size: 12px;
  resize: vertical;

  &:focus { outline: none; border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .1); }
`;

const FilaCampos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
`;

const AyudaEdicion = styled.p`
  margin: 1px 0 0;
  color: #8b8492;
  font-size: 10px;
  line-height: 1.4;
`;

const VistaPrevia = styled.div`
  width: 100%;
  aspect-ratio: 5 / 4;
  min-height: 0;
  padding: 22px 20px;
  border: 1px solid #d9d5de;
  background: #fff;
  box-shadow: 0 8px 24px rgba(38, 30, 52, .1);
  color: #24212a;
  font-family: "Roboto", Arial, sans-serif;
`;

const VistaCabecera = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 2px solid #30244a;
`;

const VistaMarca = styled.strong`
  color: #30244a;
  font-size: 16px;
  letter-spacing: .15em;
`;

const VistaTitulo = styled.div`
  color: #30244a;
  font-size: 9px;
  font-weight: 900;
  text-align: right;
  text-transform: uppercase;
`;

const VistaCliente = styled.div`
  margin-top: 22px;
  color: #24212a;
  font-size: 17px;
  font-weight: 700;
`;

const VistaMonto = styled.div`
  margin-top: 17px;
  padding: 14px 0;
  border-top: 1px solid #ebe7ee;
  border-bottom: 1px solid #ebe7ee;
  color: #30244a;
  font-size: 27px;
  font-weight: 900;
`;

const VistaTabla = styled.div`
  margin-top: 15px;

  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #f0edf2;
    font-size: 10px;
  }

  span { color: #7a7482; }
  strong { color: #24212a; text-align: right; }
`;

const VistaEstado = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  padding: 10px;
  background: ${({ $liquidado }) => ($liquidado ? "#f1faf6" : "#f8f5fb")};
  color: ${({ $liquidado }) => ($liquidado ? "#21785f" : "#30244a")};
  font-size: 10px;
  font-weight: 800;
`;

const BotonesAccion = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
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
  background: #30244a;

  &:hover {
    background: #211932;
  }
`;

const toDateInput = (value) => {
    if (!value) return "";
    const date = value?.seconds
        ? new Date(value.seconds * 1000)
        : value instanceof Date
            ? value
            : new Date(value);
    if (Number.isNaN(date.getTime())) return typeof value === "string" ? value.slice(0, 10) : "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const fromDateInput = (value, fallback) => value ? new Date(`${value}T12:00:00`) : fallback;

const prepararDatosEditables = (datos) => ({
    ...datos,
    nombreDeudor: datos.nombreDeudor || "Cliente",
    folio: datos.folio || `REC-${Date.now().toString().slice(-6)}`,
    numeroPago: datos.numeroPago || 1,
    totalPagos: datos.totalPagos || "",
    montoPagado: datos.montoPagado ?? 0,
    fechaPago: toDateInput(datos.fechaPago),
    fechaPactada: toDateInput(datos.fechaPactada),
    saldoRestante: datos.saldoRestante ?? 0,
    cobradoPor: datos.cobradoPor || "Administración Zaldo",
    notas: datos.notas || "",
});

export const ModalComprobantePago = ({ isOpen, onClose, datosComprobante }) => {
    const [datosEditables, setDatosEditables] = useState(null);

    useEffect(() => {
        if (isOpen && datosComprobante) {
            setDatosEditables(prepararDatosEditables(datosComprobante));
        }
    }, [isOpen, datosComprobante]);

    const construirDatosSalida = () => ({
        ...datosEditables,
        montoPagado: Number(datosEditables?.montoPagado || 0),
        saldoRestante: Number(datosEditables?.saldoRestante || 0),
        fechaPago: datosEditables?.fechaPago
            ? fromDateInput(datosEditables.fechaPago, datosComprobante?.fechaPago || new Date())
            : "",
        fechaPactada: datosEditables?.fechaPactada || "",
    });

    if (!datosComprobante || !datosEditables) return null;

    const handleDescargar = () => {
        descargarComprobanteImagen(construirDatosSalida());
    };

    const handleWhatsApp = () => {
        compartirComprobante(construirDatosSalida());
    };

    const handlePdf = () => {
        abrirComprobantePdf(construirDatosSalida());
    };

    const actualizarCampo = (campo, valor) => {
        setDatosEditables((prev) => ({ ...prev, [campo]: valor }));
    };

    const liquidado = Number(datosEditables.saldoRestante || 0) <= 0;

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose} wide>
            <ContenedorModal>
                <HeaderModal>
                    <H2 size="20px" color="var(--colorMorado)">
                        <FaReceipt style={{ marginRight: 6 }} /> Revisar comprobante
                    </H2>
                    <TxtGenerico size="13px" color="#666">
                        Ajusta los datos de la imagen PNG 1000 × 800. No modifica el abono guardado.
                    </TxtGenerico>
                </HeaderModal>

                <EditorWorkspace>
                    <EditorPanel>
                        <EditorHeading><FaEdit /> Datos imprimibles</EditorHeading>
                        <CampoEdicion>
                            Nombre del cliente
                            <InputEdicion value={datosEditables.nombreDeudor} onChange={(e) => actualizarCampo("nombreDeudor", e.target.value)} />
                        </CampoEdicion>
                        <FilaCampos>
                            <CampoEdicion>
                                Monto abonado
                                <InputEdicion type="number" min="0" step="0.01" value={datosEditables.montoPagado} onChange={(e) => actualizarCampo("montoPagado", e.target.value)} />
                            </CampoEdicion>
                            <CampoEdicion>
                                Folio
                                <InputEdicion value={datosEditables.folio} onChange={(e) => actualizarCampo("folio", e.target.value)} />
                            </CampoEdicion>
                        </FilaCampos>
                        <FilaCampos>
                            <CampoEdicion>
                                Fecha del abono
                                <InputEdicion type="date" value={datosEditables.fechaPago} onChange={(e) => actualizarCampo("fechaPago", e.target.value)} />
                            </CampoEdicion>
                            <CampoEdicion>
                                Fecha pactada
                                <InputEdicion type="date" value={datosEditables.fechaPactada} onChange={(e) => actualizarCampo("fechaPactada", e.target.value)} />
                            </CampoEdicion>
                        </FilaCampos>
                        <FilaCampos>
                            <CampoEdicion>
                                Número de abono
                                <InputEdicion type="number" min="1" value={datosEditables.numeroPago} onChange={(e) => actualizarCampo("numeroPago", e.target.value)} />
                            </CampoEdicion>
                            <CampoEdicion>
                                Saldo posterior
                                <InputEdicion type="number" min="0" step="0.01" value={datosEditables.saldoRestante} onChange={(e) => actualizarCampo("saldoRestante", e.target.value)} />
                            </CampoEdicion>
                        </FilaCampos>
                        <CampoEdicion>
                            Registrado por
                            <InputEdicion value={datosEditables.cobradoPor} onChange={(e) => actualizarCampo("cobradoPor", e.target.value)} />
                        </CampoEdicion>
                        <CampoEdicion>
                            Observación
                            <TextareaEdicion value={datosEditables.notas} onChange={(e) => actualizarCampo("notas", e.target.value)} placeholder="Opcional" />
                        </CampoEdicion>
                        <AyudaEdicion>Estos cambios son solo para la constancia que vas a imprimir o compartir.</AyudaEdicion>
                    </EditorPanel>

                    <VistaPrevia aria-label="Vista previa del comprobante">
                        <VistaCabecera>
                            <VistaMarca>ZALDO</VistaMarca>
                            <VistaTitulo>Constancia<br />de abono</VistaTitulo>
                        </VistaCabecera>
                        <VistaCliente>{datosEditables.nombreDeudor}</VistaCliente>
                        <VistaMonto>{fnFormatMoney(datosEditables.montoPagado)}</VistaMonto>
                        <VistaTabla>
                            <div><span>Folio</span><strong>{datosEditables.folio}</strong></div>
                            <div><span>Fecha del abono</span><strong>{datosEditables.fechaPago || "—"}</strong></div>
                            <div><span>Fecha pactada</span><strong>{datosEditables.fechaPactada || "—"}</strong></div>
                            <div><span>Referencia</span><strong>Abono {datosEditables.numeroPago}{datosEditables.totalPagos ? ` de ${datosEditables.totalPagos}` : ""}</strong></div>
                        </VistaTabla>
                        <VistaEstado $liquidado={liquidado}>
                            <span>Estado de cuenta</span>
                            <strong>{liquidado ? "LIQUIDADA" : fnFormatMoney(datosEditables.saldoRestante)}</strong>
                        </VistaEstado>
                    </VistaPrevia>
                </EditorWorkspace>

                <BotonesAccion>
                    <BtnPdf onClick={handlePdf}>
                        <FaPrint /> Abrir imagen 1000 × 800
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
