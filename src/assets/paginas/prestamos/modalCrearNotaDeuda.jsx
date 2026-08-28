import styled from "styled-components";
import { useState } from "react";
import {
    FaUser,
    FaDollarSign,
    FaCalendarAlt,
    FaStickyNote,
    FaCheck,
    FaClock,
    FaPercentage,
} from "react-icons/fa";
import { crearPrestamo } from "../../funciones/firebase/prestamos";
import Swal from "sweetalert2";

import { ModalEncabezado, ModalGenerico } from "../../componentes/modales/modalGenerico";

const ContenidoModal = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const Body = styled.div`
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
`;

const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const Input = styled.input`
  width: 100%;
  border: 1.5px solid rgba(83, 59, 143, 0.18);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  background: #fdfdfd;
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: white;
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.12);
  }

  &[type="number" inputMode="decimal"] {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 16px;
    font-weight: 800;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  border: 1.5px solid rgba(83, 59, 143, 0.18);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  color: #1a1a2e;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.12);
  }
`;

const GridRecurrencias = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const PillRecurrencia = styled.button`
  padding: 8px 10px;
  border-radius: 10px;
  border: 1.5px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "white")};
  color: ${({ $activo }) => ($activo ? "white" : "#444")};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
    transform: translateY(-1px);
  }
`;

const FilaDosCampos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Footer = styled.div`
  padding: 14px 22px;
  background: #fafafa;
  border-top: 1px solid rgba(83, 59, 143, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const BtnCancelar = styled.button`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.2);
  color: #666;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #f0f0f0;
  }
`;

const BtnGuardar = styled.button`
  background: var(--colorMorado);
  border: none;
  color: white;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(83, 59, 143, 0.25);
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const ModalCrearNotaDeuda = ({
    isOpen,
    onClose,
    uid,
    onNotaCreada,
}) => {
    const hoyIso = new Date().toISOString().split("T")[0];

    const [nombre, setNombre] = useState("");
    const [montoPrestado, setMontoPrestado] = useState("");
    const [tipoRecurrencia, setTipoRecurrencia] = useState("quincenal"); // "fecha_unica" | "quincenal" | "semanal" | "libre"
    const [fechaCompromiso, setFechaCompromiso] = useState(hoyIso);
    const [montoAbonoOInteres, setMontoAbonoOInteres] = useState("");
    const [notas, setNotas] = useState("");
    const [guardando, setGuardando] = useState(false);

    if (!isOpen) return null;

    const handleGuardar = async () => {
        if (!nombre.trim()) {
            Swal.fire("Falta nombre", "Indica a quién o de qué es la deuda/préstamo", "warning");
            return;
        }
        const montoNum = parseFloat(montoPrestado);
        if (isNaN(montoNum) || montoNum <= 0) {
            Swal.fire("Monto inválido", "Ingresa un monto prestado válido", "warning");
            return;
        }

        setGuardando(true);
        try {
            let tipoPeriodicidad = "dias_mes";
            let diasMes = [15, 30];
            let diasDePago = 15;
            let fechasEspecificas = [];
            let interesEstimado = 0;
            let abonoTeorico = null;
            let numPagos = null;

            if (tipoRecurrencia === "fecha_unica") {
                tipoPeriodicidad = "fechas_especificas";
                fechasEspecificas = [fechaCompromiso];
                interesEstimado = parseFloat(montoAbonoOInteres) || 0;
                abonoTeorico = montoNum + interesEstimado;
                numPagos = 1;
            } else if (tipoRecurrencia === "quincenal") {
                tipoPeriodicidad = "dias_mes";
                diasMes = [15, 30];
                diasDePago = 15;
                abonoTeorico = parseFloat(montoAbonoOInteres) || null;
                if (abonoTeorico && abonoTeorico > 0) {
                    numPagos = Math.ceil(montoNum / abonoTeorico);
                }
            } else if (tipoRecurrencia === "semanal") {
                tipoPeriodicidad = "frecuencia_dias";
                diasDePago = 7;
                abonoTeorico = parseFloat(montoAbonoOInteres) || null;
                if (abonoTeorico && abonoTeorico > 0) {
                    numPagos = Math.ceil(montoNum / abonoTeorico);
                }
            } else {
                tipoPeriodicidad = "libre";
                abonoTeorico = null;
            }

            const nuevaNota = await crearPrestamo({
                nombre: nombre.trim(),
                montoPrestado: montoNum,
                interesEstimado,
                diasDePago,
                tipoPeriodicidad,
                diasMes,
                fechasEspecificas,
                abonoTeorico,
                numPagos,
                fechaInicio: fechaCompromiso,
                notas: notas.trim(),
                estado: "pendiente",
            }, uid);

            onNotaCreada?.(nuevaNota);
            Swal.fire({
                icon: "success",
                title: "Nota registrada",
                text: `Se agregó la nota para ${nombre}`,
                timer: 1800,
                showConfirmButton: false,
            });
            onClose();
        } catch (e) {
            console.error("Error al crear nota de deuda:", e);
            Swal.fire("Error", "No se pudo guardar la nota", "error");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose}>
            <ContenidoModal>
                <ModalEncabezado
                    bleed={0}
                    title="Nueva Nota de Deuda / Cobranza"
                    description="Registra el acuerdo, su periodicidad y los detalles del préstamo."
                />

                <Body>
                    {/* ¿A QUIÉN O CONCEPTO? */}
                    <Campo>
                        <Label><FaUser /> ¿A quién o Concepto?</Label>
                        <Input
                            type="text"
                            placeholder="Ej. Tía Norma, Amigo de mi mamá, Préstamo 80k..."
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            autoFocus
                        />
                    </Campo>

                    {/* MONTO PRESTADO */}
                    <Campo>
                        <Label><FaDollarSign /> Monto Prestado</Label>
                        <Input
                            type="number" inputMode="decimal"
                            placeholder="Ej. 10000"
                            value={montoPrestado}
                            onChange={(e) => setMontoPrestado(e.target.value)}
                        />
                    </Campo>

                    {/* RECURRENCIA RÁPIDA */}
                    <Campo>
                        <Label><FaClock /> ¿Cómo o cuándo se paga?</Label>
                        <GridRecurrencias>
                            <PillRecurrencia
                                $activo={tipoRecurrencia === "quincenal"}
                                onClick={() => setTipoRecurrencia("quincenal")}
                                type="button"
                            >
                                <span>🌓 Quincenal</span>
                                <small style={{ opacity: 0.85, fontSize: 10 }}>15 y fin de mes</small>
                            </PillRecurrencia>

                            <PillRecurrencia
                                $activo={tipoRecurrencia === "fecha_unica"}
                                onClick={() => setTipoRecurrencia("fecha_unica")}
                                type="button"
                            >
                                <span>📅 Fecha Única</span>
                                <small style={{ opacity: 0.85, fontSize: 10 }}>Un solo pago</small>
                            </PillRecurrencia>

                            <PillRecurrencia
                                $activo={tipoRecurrencia === "semanal"}
                                onClick={() => setTipoRecurrencia("semanal")}
                                type="button"
                            >
                                <span>🗓️ Semanal</span>
                                <small style={{ opacity: 0.85, fontSize: 10 }}>Cada 7 días</small>
                            </PillRecurrencia>

                            <PillRecurrencia
                                $activo={tipoRecurrencia === "libre"}
                                onClick={() => setTipoRecurrencia("libre")}
                                type="button"
                            >
                                <span>🔓 Abonos Libres</span>
                                <small style={{ opacity: 0.85, fontSize: 10 }}>Sin fecha fija</small>
                            </PillRecurrencia>
                        </GridRecurrencias>
                    </Campo>

                    {/* CAMPOS DEPENDIENTES DE LA RECURRENCIA */}
                    <FilaDosCampos>
                        <Campo>
                            <Label><FaCalendarAlt /> {tipoRecurrencia === "fecha_unica" ? "Fecha de Cobro" : "Fecha Inicio"}</Label>
                            <Input
                                type="date"
                                value={fechaCompromiso}
                                onChange={(e) => setFechaCompromiso(e.target.value)}
                            />
                        </Campo>

                        <Campo>
                            <Label>
                                {tipoRecurrencia === "fecha_unica" ? (
                                    <>
                                        <FaPercentage /> Interés $ (Opcional)
                                    </>
                                ) : (
                                    <>
                                        <FaDollarSign /> Abono Pactado $
                                    </>
                                )}
                            </Label>
                            <Input
                                type="number" inputMode="decimal"
                                placeholder={tipoRecurrencia === "fecha_unica" ? "Ej. 10000" : "Ej. 500"}
                                value={montoAbonoOInteres}
                                onChange={(e) => setMontoAbonoOInteres(e.target.value)}
                            />
                        </Campo>
                    </FilaDosCampos>

                    {/* NOTAS ADICIONALES */}
                    <Campo>
                        <Label><FaStickyNote /> Notas / Detalles adicionales</Label>
                        <Textarea
                            placeholder="Detalles sobre el acuerdo, números de contacto, etc."
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                        />
                    </Campo>
                </Body>

                <Footer>
                    <BtnCancelar onClick={onClose} disabled={guardando}>Cancelar</BtnCancelar>
                    <BtnGuardar onClick={handleGuardar} disabled={guardando}>
                        <FaCheck /> {guardando ? "Guardando..." : "Crear Nota"}
                    </BtnGuardar>
                </Footer>
            </ContenidoModal>
        </ModalGenerico>
    );
};
