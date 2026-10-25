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
    FaPrint,
} from "react-icons/fa";
import { fnFormatMoney, formatFechaLegible } from "../../funciones/prestamosCalculos";
import { eliminarPagoDePrestamo, eliminarPrestamoPermanente } from "../../funciones/firebase/prestamos";
import { ModalComprobantePago } from "./modalComprobantePago";
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

const CheckNota = styled.input`
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  accent-color: var(--colorMorado);
  cursor: pointer;
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

/* ================= FILA DE TABLA FINANCIERA ================= */

const FilaTabla = styled.tr`
  animation: ${fadeIn} 0.25s ease;

  td {
    background: #fff;
    border-bottom: 1px solid rgba(83, 59, 143, 0.08);
    transition: background .15s ease;
  }

  &:hover td { background: #fcfaff; }
  &:last-child td { border-bottom: none; }
`;

const CeldaTabla = styled.td`
  padding: 12px 10px;
  vertical-align: middle;
  color: #3b3545;
  font-size: 12px;
`;

const CeldaDeudorTabla = styled(CeldaTabla)`
  padding-left: 14px;
`;

const GrupoDeudorTabla = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
`;

const CheckNotaTabla = styled.input`
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  accent-color: var(--colorMorado);
  cursor: pointer;
`;

const IdentidadTabla = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const NombreTabla = styled.strong`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #24202d;
  font-size: 13px;
  font-weight: 850;
`;

const MetaTabla = styled.span`
  color: #8b8492;
  font-size: 10px;
`;

const TipoTabla = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #625672;
  font-size: 11px;
  font-weight: 700;
`;

const FechaTabla = styled.span`
  color: #5d5368;
  font-size: 11px;
  white-space: nowrap;
`;

const MontoTabla = styled.span`
  color: ${({ $tone }) => ($tone === "green" ? "#248657" : "#35303e")};
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
`;

const SaldoTabla = styled(MontoTabla)`
  color: ${({ $pagado }) => ($pagado ? "#248657" : "#b76516")};
  font-size: 13px;
`;

const EstadoTabla = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 7px;
  background: ${({ $pagado }) => ($pagado ? "rgba(40, 167, 69, .1)" : "rgba(243, 156, 18, .12)")};
  color: ${({ $pagado }) => ($pagado ? "#248657" : "#b76516")};
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
`;

const AccionesTabla = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
`;

const BtnCobrarTabla = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 70px;
  border: none;
  border-radius: 7px;
  padding: 7px 9px;
  background: #28a745;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 850;
  box-shadow: 0 3px 8px rgba(40, 167, 69, .18);
  transition: transform .15s ease, background .15s ease;

  &:hover { background: #218838; transform: translateY(-1px); }
`;

const BtnTabla = styled.button`
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgba(83, 59, 143, .16);
  border-radius: 7px;
  background: #fff;
  color: ${({ $danger }) => ($danger ? "#dc3545" : "#6c6378")};
  cursor: pointer;
  font-size: 11px;

  &:hover {
    border-color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
    background: ${({ $danger }) => ($danger ? "rgba(220, 53, 69, .05)" : "rgba(83, 59, 143, .06)")};
    color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
  }
`;

const FilaHistorialTabla = styled.tr`
  td { background: #fbfaff; border-bottom: 1px solid rgba(83, 59, 143, .08); }
`;

const CeldaHistorialTabla = styled.td`
  padding: 0 14px 12px 50px;
`;

const HistorialTabla = styled.div`
  border-top: 1px solid rgba(83, 59, 143, .1);
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

/* ================= RENGLÓN DE LISTA (vista principal) ================= */

/*
 * Un renglón por préstamo: quién, cuánto lleva abonado, cuánto falta y la
 * acción de cobrar. Sustituye a la tabla de 8 columnas, que en casi cualquier
 * pantalla obligaba a desplazarse de lado. En móvil se apila como tarjeta.
 */
const FilaLista = styled.article`
  animation: ${fadeIn} 0.25s ease;
  border-bottom: 1px solid rgba(83, 59, 143, 0.08);
  background: ${({ $seleccionado }) => ($seleccionado ? "#f7f3ff" : "#ffffff")};
  transition: background .15s ease;

  &:last-child { border-bottom: none; }
  &:hover { background: #fcfaff; }
`;

const RejillaLista = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.3fr) minmax(120px, 0.8fr) auto;
  grid-template-areas: "quien avance saldo acciones";
  align-items: center;
  gap: 18px;
  padding: 14px 18px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "quien saldo"
      "avance avance"
      "acciones acciones";
    gap: 12px;
    padding: 14px;
  }
`;

const ZonaQuien = styled.div`
  grid-area: quien;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const Avatar = styled.span`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: ${({ $tono }) => `hsl(${$tono} 70% 94%)`};
  color: ${({ $tono }) => `hsl(${$tono} 45% 36%)`};
  font-size: 14px;
  font-weight: 850;
  letter-spacing: -0.02em;
`;

const TextoQuien = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: #24202d;
    font-size: 14px;
    font-weight: 850;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #8b8492;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ZonaAvance = styled.div`
  grid-area: avance;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  > div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: #6f6680;
    font-size: 11.5px;
    font-weight: 600;
  }

  b {
    color: #248657;
    font-weight: 800;
  }
`;

const PistaAvance = styled.div`
  height: 7px;
  border-radius: 999px;
  background: #eee9f8;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    width: ${({ $porcentaje }) => `${Math.min(100, Math.max(0, $porcentaje))}%`};
    border-radius: inherit;
    background: ${({ $pagado }) => ($pagado
      ? "linear-gradient(90deg, #34c27a, #248657)"
      : "linear-gradient(90deg, #8e6dd4, #533b8f)")};
    transition: width .6s cubic-bezier(.16, 1, .3, 1);
  }
`;

const ZonaSaldo = styled.div`
  grid-area: saldo;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;

  small {
    color: #8b8492;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  strong {
    color: ${({ $pagado }) => ($pagado ? "#248657" : "#2d2450")};
    font-size: 18px;
    font-weight: 850;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`;

const ZonaAcciones = styled.div`
  grid-area: acciones;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;

  @media (max-width: 760px) {
    justify-content: stretch;

    > button:first-child { flex: 1; }
  }
`;

const BtnCobrarLista = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: ${({ $pagado }) => ($pagado ? "#eef7f1" : "#28a745")};
  color: ${({ $pagado }) => ($pagado ? "#248657" : "#ffffff")};
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  box-shadow: ${({ $pagado }) => ($pagado ? "none" : "0 4px 10px rgba(40, 167, 69, .2)")};
  transition: transform .15s ease, background .15s ease;

  &:hover { transform: translateY(-1px); background: ${({ $pagado }) => ($pagado ? "#e2f2e8" : "#218838")}; }
  &:focus-visible { outline: 2px solid #28a745; outline-offset: 2px; }
`;

const BtnIconoLista = styled.button`
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid rgba(83, 59, 143, .16);
  border-radius: 10px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, .08)" : "#ffffff")};
  color: ${({ $danger }) => ($danger ? "#dc3545" : "#6c6378")};
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    border-color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
    color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
  }

  &:focus-visible { outline: 2px solid var(--colorMorado); outline-offset: 2px; }
`;

const HistorialLista = styled.div`
  padding: 0 18px 14px 70px;

  @media (max-width: 760px) {
    padding: 0 14px 14px;
  }
`;

const tonoDeNombre = (nombre = "") => Array.from(nombre).reduce((acc, letra) => (acc * 31 + letra.charCodeAt(0)) % 360, 7);

const inicialesDe = (nombre = "") => nombre
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((parte) => parte[0]?.toUpperCase())
  .join("") || "?";

export const CardNotaDeuda = ({
    prestamo,
    uid,
    onAbrirAbono,
    onEditarNota,
    onNotaActualizada,
    onNotaEliminada,
    onEditarAbono,
    esAdmin = false,
    seleccionado = false,
    onToggleSeleccion,
    modoTabla = false,
    modoLista = false,
    tipoLabel = "",
    proximoPago = "",
}) => {
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState(null);

    const pagos = prestamo.pagos || [];
    const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const totalConInteres = Number(prestamo.montoPrestado || 0) + Number(prestamo.interesEstimado || 0);
    const saldoRestante = Math.max(0, totalConInteres - totalPagado);
    const porcentaje = totalConInteres > 0 ? (totalPagado / totalConInteres) * 100 : 100;
    const esPagado = saldoRestante <= 0 && totalPagado > 0;

    const abrirComprobanteDePago = (pago, index) => {
        setComprobanteSeleccionado({
            nombreDeudor: prestamo.nombre,
            numeroPago: pago.numeroPago || index + 1,
            totalPagos: prestamo.numPagos || null,
            montoPagado: pago.monto,
            fechaPago: pago.fecha,
            fechaPactada: pago.ordenFecha,
            diasAtraso: pago.diasAtraso || 0,
            saldoAnterior: pago.saldoAnterior,
            saldoRestante: pago.saldoRestante,
            cobradoPor: pago.registradoPor,
            notas: pago.notas,
            folio: pago.id ? pago.id.replace("pago_", "REC-") : undefined,
        });
    };

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

    const etiquetaTipo = tipoLabel || (prestamo.tipoPeriodicidad === "fechas_especificas"
        ? "Fecha única"
        : prestamo.tipoPeriodicidad === "dias_mes"
            ? "Quincenal"
            : prestamo.tipoPeriodicidad === "frecuencia_dias"
                ? `Cada ${prestamo.diasDePago || 7} días`
                : "Abonos libres");

    const historialTabla = (
        <HistorialTabla>
            {pagos.length === 0 ? (
                <span style={{ padding: "5px 0", color: "#888", fontSize: 11 }}>
                    Aún no se han registrado abonos para esta nota.
                </span>
            ) : (
                pagos.map((pago, index) => (
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
                                type="button"
                                onClick={() => abrirComprobanteDePago(pago, index)}
                                style={{ background: "none", border: "none", color: "var(--colorMorado)", cursor: "pointer", padding: 4 }}
                                title="Abrir comprobante como imagen 1000 × 800"
                            >
                                <FaPrint style={{ fontSize: 12 }} />
                            </button>
                            <button
                                type="button"
                                onClick={() => onEditarAbono?.(prestamo, pago)}
                                style={{ background: "none", border: "none", color: "#777", cursor: "pointer", padding: 4 }}
                                title="Editar este abono"
                            >
                                <FaEdit style={{ fontSize: 11 }} />
                            </button>
                            {esAdmin && <button
                                type="button"
                                onClick={() => handleEliminarAbono(pago.id)}
                                style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", padding: 4 }}
                                title="Eliminar este abono"
                            >
                                <FaTrash style={{ fontSize: 11 }} />
                            </button>}
                        </div>
                    </FilaAbono>
                ))
            )}
        </HistorialTabla>
    );

    if (modoLista) {
        return (
            <FilaLista $seleccionado={seleccionado}>
                <RejillaLista>
                    <ZonaQuien>
                        {esAdmin && (
                            <CheckNotaTabla
                                type="checkbox"
                                checked={seleccionado}
                                onChange={onToggleSeleccion}
                                aria-label={`Seleccionar préstamo de ${prestamo.nombre}`}
                            />
                        )}
                        <Avatar $tono={tonoDeNombre(prestamo.nombre)} aria-hidden="true">
                            {inicialesDe(prestamo.nombre)}
                        </Avatar>
                        <TextoQuien>
                            <strong>{prestamo.nombre}</strong>
                            <span>
                                <FaClock aria-hidden="true" />
                                {esPagado ? `${etiquetaTipo} · liquidada` : `${etiquetaTipo} · ${proximoPago || "Por acordar"}`}
                            </span>
                        </TextoQuien>
                    </ZonaQuien>

                    <ZonaAvance>
                        <div>
                            <span>Abonado <b>{fnFormatMoney(totalPagado)}</b> de {fnFormatMoney(totalConInteres)}</span>
                            <span>{Math.round(Math.min(100, porcentaje))}%</span>
                        </div>
                        <PistaAvance $porcentaje={porcentaje} $pagado={esPagado}><span /></PistaAvance>
                    </ZonaAvance>

                    <ZonaSaldo $pagado={esPagado}>
                        <small>{esPagado ? "Liquidada" : "Por cobrar"}</small>
                        <strong>{esPagado ? <FaCheckCircle aria-label="Liquidada" /> : fnFormatMoney(saldoRestante)}</strong>
                    </ZonaSaldo>

                    <ZonaAcciones>
                        <BtnCobrarLista type="button" $pagado={esPagado} onClick={() => onAbrirAbono?.(prestamo)} title="Registrar un abono">
                            <FaPlus aria-hidden="true" /> {esPagado ? "Abono" : "Cobrar"}
                        </BtnCobrarLista>
                        <BtnIconoLista
                            type="button"
                            $activo={mostrarHistorial}
                            onClick={() => setMostrarHistorial(!mostrarHistorial)}
                            title="Ver historial de abonos"
                            aria-expanded={mostrarHistorial}
                            aria-label={`Historial de abonos (${pagos.length})`}
                        >
                            <FaCoins aria-hidden="true" /> {pagos.length}
                            {mostrarHistorial ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
                        </BtnIconoLista>
                        {esAdmin && (
                            <>
                                <BtnIconoLista type="button" onClick={() => onEditarNota?.(prestamo)} title="Editar préstamo" aria-label="Editar préstamo">
                                    <FaEdit aria-hidden="true" />
                                </BtnIconoLista>
                                <BtnIconoLista type="button" $danger onClick={handleEliminarNota} title="Archivar préstamo" aria-label="Archivar préstamo">
                                    <FaTrash aria-hidden="true" />
                                </BtnIconoLista>
                            </>
                        )}
                    </ZonaAcciones>
                </RejillaLista>

                {mostrarHistorial && <HistorialLista>{historialTabla}</HistorialLista>}

                <ModalComprobantePago
                    isOpen={!!comprobanteSeleccionado}
                    onClose={() => setComprobanteSeleccionado(null)}
                    datosComprobante={comprobanteSeleccionado}
                />
            </FilaLista>
        );
    }

    if (modoTabla) {
        return (
            <>
                <FilaTabla>
                    <CeldaDeudorTabla>
                        <GrupoDeudorTabla>
                            {esAdmin && (
                                <CheckNotaTabla
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={onToggleSeleccion}
                                    aria-label={`Seleccionar préstamo de ${prestamo.nombre}`}
                                />
                            )}
                            <IdentidadTabla>
                                <NombreTabla>{prestamo.nombre}</NombreTabla>
                                <MetaTabla>{pagos.length} {pagos.length === 1 ? "abono" : "abonos"} registrados</MetaTabla>
                            </IdentidadTabla>
                        </GrupoDeudorTabla>
                    </CeldaDeudorTabla>
                    <CeldaTabla><TipoTabla><FaClock /> {etiquetaTipo}</TipoTabla></CeldaTabla>
                    <CeldaTabla><FechaTabla>{proximoPago || "Sin fecha"}</FechaTabla></CeldaTabla>
                    <CeldaTabla><SaldoTabla $pagado={esPagado}>{fnFormatMoney(saldoRestante)}</SaldoTabla></CeldaTabla>
                    <CeldaTabla><MontoTabla>{fnFormatMoney(prestamo.montoPrestado)}</MontoTabla></CeldaTabla>
                    <CeldaTabla><MontoTabla $tone="green">{fnFormatMoney(totalPagado)}</MontoTabla></CeldaTabla>
                    <CeldaTabla><EstadoTabla $pagado={esPagado}>{esPagado ? <FaCheckCircle /> : <FaClock />} {esPagado ? "Liquidada" : "Pendiente"}</EstadoTabla></CeldaTabla>
                    <CeldaTabla>
                        <AccionesTabla>
                            <BtnCobrarTabla type="button" onClick={() => onAbrirAbono?.(prestamo)} title="Registrar un abono">
                                <FaPlus /> Cobrar
                            </BtnCobrarTabla>
                            <BtnTabla type="button" onClick={() => setMostrarHistorial(!mostrarHistorial)} title="Ver historial de abonos" aria-label="Ver historial">
                                <FaCoins />
                            </BtnTabla>
                            {esAdmin && (
                                <>
                                    <BtnTabla type="button" onClick={() => onEditarNota?.(prestamo)} title="Editar nota" aria-label="Editar nota">
                                        <FaEdit />
                                    </BtnTabla>
                                    <BtnTabla type="button" $danger onClick={handleEliminarNota} title="Archivar nota" aria-label="Archivar nota">
                                        <FaTrash />
                                    </BtnTabla>
                                </>
                            )}
                        </AccionesTabla>
                    </CeldaTabla>
                </FilaTabla>
                {mostrarHistorial && (
                    <FilaHistorialTabla>
                        <CeldaHistorialTabla colSpan={8}>{historialTabla}</CeldaHistorialTabla>
                    </FilaHistorialTabla>
                )}
                <ModalComprobantePago
                    isOpen={!!comprobanteSeleccionado}
                    onClose={() => setComprobanteSeleccionado(null)}
                    datosComprobante={comprobanteSeleccionado}
                />
            </>
        );
    }

    return (
        <CardContainer>
            {/* CABECERA */}
            <CardTop>
                {esAdmin && (
                    <CheckNota
                        type="checkbox"
                        checked={seleccionado}
                        onChange={onToggleSeleccion}
                        aria-label={`Seleccionar préstamo de ${prestamo.nombre}`}
                    />
                )}
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

                {esAdmin && (
                    <>
                        <BtnAccionIcono onClick={() => onEditarNota?.(prestamo)} title="Editar nota">
                            <FaEdit />
                        </BtnAccionIcono>

                        <BtnAccionIcono $danger onClick={handleEliminarNota} title="Archivar nota">
                            <FaTrash />
                        </BtnAccionIcono>
                    </>
                )}
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
                                            type="button"
                                            onClick={() => abrirComprobanteDePago(pago, index)}
                                            style={{ background: "none", border: "none", color: "var(--colorMorado)", cursor: "pointer", padding: 4 }}
                                            title="Imprimir o guardar como PDF"
                                        >
                                            <FaPrint style={{ fontSize: 12 }} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onEditarAbono?.(prestamo, pago)}
                                            style={{ background: "none", border: "none", color: "#777", cursor: "pointer", padding: 4 }}
                                            title="Editar este abono"
                                        >
                                            <FaEdit style={{ fontSize: 11 }} />
                                        </button>
                                        {esAdmin && <button
                                            type="button"
                                            onClick={() => handleEliminarAbono(pago.id)}
                                            style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", padding: 4 }}
                                            title="Eliminar este abono"
                                        >
                                            <FaTrash style={{ fontSize: 11 }} />
                                        </button>}
                                    </div>
                                </FilaAbono>
                            ))}
                        </ListaAbonos>
                    )}
                </AcordeonHistorial>
            )}
            <ModalComprobantePago
                isOpen={!!comprobanteSeleccionado}
                onClose={() => setComprobanteSeleccionado(null)}
                datosComprobante={comprobanteSeleccionado}
            />
        </CardContainer>
    );
};
