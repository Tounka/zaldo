import styled, { keyframes } from "styled-components";
import { useState } from "react";
import {
    FaPlus,
    FaCoins,
    FaCalendarAlt,
    FaTrash,
    FaEdit,
    FaChevronDown,
    FaChevronUp,
    FaCheckCircle,
    FaClock,
    FaStickyNote,
    FaEllipsisV,
} from "react-icons/fa";
import { fnFormatMoney, formatFechaLegible } from "../../funciones/prestamosCalculos";
import { eliminarPagoDePrestamo, eliminarPrestamoPermanente } from "../../funciones/firebase/prestamos";
import Swal from "sweetalert2";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 500px; }
`;

const CardContainer = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(83, 59, 143, 0.05);
  transition: all 0.2s ease;
  animation: ${fadeIn} 0.3s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 8px 24px rgba(83, 59, 143, 0.1);
    transform: translateY(-2px);
  }
`;

const CardTop = styled.div`
  padding: 16px 18px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
`;

const TituloGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const NombreDeudor = styled.h4`
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BadgeEsquema = styled.span`
  font-size: 11px;
  color: #666;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BadgeEstado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: ${({ $pagado }) => ($pagado ? "rgba(40, 167, 69, 0.12)" : "rgba(243, 156, 18, 0.14)")};
  color: ${({ $pagado }) => ($pagado ? "#28a745" : "#d35400")};
  border: 1px solid ${({ $pagado }) => ($pagado ? "rgba(40, 167, 69, 0.3)" : "rgba(243, 156, 18, 0.35)")};
`;

const CardBody = styled.div`
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const BloqueSaldo = styled.div`
  background: rgba(83, 59, 143, 0.04);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LabelSaldo = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #777;
  letter-spacing: 0.5px;
`;

const ValorSaldo = styled.span`
  font-size: 20px;
  font-weight: 900;
  color: ${({ $pagado }) => ($pagado ? "#28a745" : "var(--colorMorado)")};
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const GridMetricas = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const ItemMetrica = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TituloMetrica = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
`;

const ValorMetrica = styled.span`
  font-size: 14px;
  font-weight: 800;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const BarraProgresoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoProgreso = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: #777;
`;

const BarraProgresoFondo = styled.div`
  width: 100%;
  height: 7px;
  background: rgba(83, 59, 143, 0.08);
  border-radius: 4px;
  overflow: hidden;
`;

const BarraProgresoRelleno = styled.div`
  height: 100%;
  background: ${({ $pagado }) => ($pagado ? "#28a745" : "linear-gradient(90deg, var(--colorMorado), #00C49F)")};
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  transition: width 0.3s ease;
`;

const NotasTexto = styled.p`
  margin: 0;
  font-size: 12px;
  color: #666;
  background: #fdfdfd;
  border-left: 3px solid rgba(83, 59, 143, 0.3);
  padding: 6px 10px;
  border-radius: 0 6px 6px 0;
`;

const CardFooter = styled.div`
  padding: 12px 18px;
  background: #fafafa;
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  display: flex;
  gap: 8px;
  align-items: center;
`;

const BtnAbonar = styled.button`
  flex: 1;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 3px 8px rgba(40, 167, 69, 0.25);
  transition: all 0.15s ease;

  &:hover {
    background: #218838;
    transform: translateY(-1px);
  }
`;

const BtnHistorial = styled.button`
  background: white;
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background: rgba(83, 59, 143, 0.05);
  }
`;

const BtnAccionIcono = styled.button`
  background: white;
  color: #777;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 10px;
  padding: 9px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
    border-color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
    background: ${({ $danger }) => ($danger ? "rgba(220, 53, 69, 0.05)" : "rgba(83, 59, 143, 0.05)")};
  }
`;

const AcordeonHistorial = styled.div`
  border-top: 1px solid rgba(83, 59, 143, 0.1);
  background: #fafafa;
  animation: ${slideDown} 0.25s ease;
  overflow: hidden;
`;

const ListaAbonos = styled.div`
  display: flex;
  flex-direction: column;
`;

const FilaAbono = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  font-size: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoAbonoFila = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MontoAbonoFila = styled.span`
  font-weight: 800;
  color: #28a745;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
`;

export const CardNotaDeuda = ({
    prestamo,
    uid,
    onAbrirAbono,
    onEditarNota,
    onNotaActualizada,
    onNotaEliminada,
}) => {
    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    const pagos = prestamo.pagos || [];
    const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalConInteres = Number(prestamo.montoPrestado || 0) + Number(prestamo.interesEstimado || 0);
    const saldoRestante = Math.max(0, totalConInteres - totalPagado);
    const porcentaje = totalConInteres > 0 ? (totalPagado / totalConInteres) * 100 : 100;
    const esPagado = saldoRestante <= 0 && totalPagado > 0;

    const handleEliminarAbono = async (pagoId) => {
        const confirm = await Swal.fire({
            title: "¿Eliminar este abono?",
            text: "Se descontará del acumulado de pagos de esta nota.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirm.isConfirmed) {
            try {
                const actualizado = await eliminarPagoDePrestamo(uid, prestamo.id, pagoId);
                onNotaActualizada?.(actualizado);
                Swal.fire("Eliminado", "El abono fue retirado con éxito", "success");
            } catch (e) {
                console.error("Error al eliminar abono:", e);
                Swal.fire("Error", "No se pudo eliminar el abono", "error");
            }
        }
    };

    const handleEliminarNota = async () => {
        const confirm = await Swal.fire({
            title: `¿Eliminar nota de ${prestamo.nombre}?`,
            text: "Se archivará esta nota de cobranza.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, archivar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirm.isConfirmed) {
            try {
                await eliminarPrestamoPermanente(uid, prestamo.id);
                onNotaEliminada?.(prestamo.id);
                Swal.fire("Archivado", "La nota ha sido retirada", "success");
            } catch (e) {
                console.error("Error al archivar nota:", e);
                Swal.fire("Error", "No se pudo archivar", "error");
            }
        }
    };

    return (
        <CardContainer>
            {/* CABECERA */}
            <CardTop>
                <TituloGrupo>
                    <NombreDeudor>{prestamo.nombre}</NombreDeudor>
                    <BadgeEsquema>
                        <FaClock />
                        {prestamo.tipoPeriodicidad === "fechas_especificas" && prestamo.fechasEspecificas?.[0]
                            ? `Fecha única: ${prestamo.fechasEspecificas[0]}`
                            : prestamo.tipoPeriodicidad === "dias_mes"
                                ? `Quincenal (${prestamo.abonoTeorico ? fnFormatMoney(prestamo.abonoTeorico) + " c/u" : "15 y 30"})`
                                : prestamo.tipoPeriodicidad === "frecuencia_dias"
                                    ? `Cada ${prestamo.diasDePago || 7} días`
                                    : "Abonos libres"}
                    </BadgeEsquema>
                </TituloGrupo>

                <BadgeEstado $pagado={esPagado}>
                    {esPagado ? <FaCheckCircle /> : <FaClock />}
                    {esPagado ? "Liquidado" : "Pendiente"}
                </BadgeEstado>
            </CardTop>

            {/* CUERPO CON MÉTRICAS */}
            <CardBody>
                <BloqueSaldo>
                    <div>
                        <LabelSaldo>Saldo Pendiente</LabelSaldo>
                        <div style={{ fontSize: 11, color: "#888" }}>
                            {esPagado ? "Totalmente saldado" : "Por cobrar"}
                        </div>
                    </div>
                    <ValorSaldo $pagado={esPagado}>{fnFormatMoney(saldoRestante)}</ValorSaldo>
                </BloqueSaldo>

                <GridMetricas>
                    <ItemMetrica>
                        <TituloMetrica>Monto Prestado</TituloMetrica>
                        <ValorMetrica>{fnFormatMoney(prestamo.montoPrestado)}</ValorMetrica>
                        {prestamo.interesEstimado > 0 && (
                            <span style={{ fontSize: 10, color: "#e65100", fontWeight: 700 }}>
                                +{fnFormatMoney(prestamo.interesEstimado)} interés
                            </span>
                        )}
                    </ItemMetrica>

                    <ItemMetrica>
                        <TituloMetrica>Abonado / Pagado</TituloMetrica>
                        <ValorMetrica style={{ color: "#28a745" }}>{fnFormatMoney(totalPagado)}</ValorMetrica>
                        <span style={{ fontSize: 10, color: "#777" }}>
                            {pagos.length} {pagos.length === 1 ? "abono" : "abonos"} registrados
                        </span>
                    </ItemMetrica>
                </GridMetricas>

                {/* BARRA DE PROGRESO */}
                <BarraProgresoWrapper>
                    <InfoProgreso>
                        <span>Progreso de pago</span>
                        <span>{Math.round(porcentaje)}%</span>
                    </InfoProgreso>
                    <BarraProgresoFondo>
                        <BarraProgresoRelleno $pct={porcentaje} $pagado={esPagado} />
                    </BarraProgresoFondo>
                </BarraProgresoWrapper>

                {prestamo.notas && (
                    <NotasTexto>{prestamo.notas}</NotasTexto>
                )}
            </CardBody>

            {/* BOTONERA DE ACCIÓN */}
            <CardFooter>
                <BtnAbonar onClick={() => onAbrirAbono?.(prestamo)}>
                    <FaPlus /> Registrar Abono
                </BtnAbonar>

                <BtnHistorial onClick={() => setMostrarHistorial(!mostrarHistorial)}>
                    <FaCoins /> {pagos.length} {mostrarHistorial ? <FaChevronUp /> : <FaChevronDown />}
                </BtnHistorial>

                <BtnAccionIcono onClick={() => onEditarNota?.(prestamo)} title="Editar nota">
                    <FaEdit />
                </BtnAccionIcono>

                <BtnAccionIcono $danger onClick={handleEliminarNota} title="Archivar nota">
                    <FaTrash />
                </BtnAccionIcono>
            </CardFooter>

            {/* HISTORIAL DESPLEGABLE DE ABONOS */}
            {mostrarHistorial && (
                <AcordeonHistorial>
                    {pagos.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: "#888", fontSize: 12 }}>
                            Aún no se han registrado abonos para esta nota.
                        </div>
                    ) : (
                        <ListaAbonos>
                            {pagos.map((pago, index) => (
                                <FilaAbono key={pago.id || index}>
                                    <InfoAbonoFila>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontWeight: 700, color: "#1a1a2e" }}>
                                                Abono #{pago.numeroPago || index + 1}
                                            </span>
                                            <span style={{ color: "#888" }}>
                                                • {formatFechaLegible(pago.fecha)}
                                            </span>
                                        </div>
                                        {pago.notas && (
                                            <span style={{ color: "#777", fontSize: 11 }}>{pago.notas}</span>
                                        )}
                                    </InfoAbonoFila>

                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <MontoAbonoFila>+{fnFormatMoney(pago.monto)}</MontoAbonoFila>
                                        <button
                                            onClick={() => handleEliminarAbono(pago.id)}
                                            style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", padding: 4 }}
                                            title="Eliminar este abono"
                                        >
                                            <FaTrash style={{ fontSize: 11 }} />
                                        </button>
                                    </div>
                                </FilaAbono>
                            ))}
                        </ListaAbonos>
                    )}
                </AcordeonHistorial>
            )}
        </CardContainer>
    );
};
