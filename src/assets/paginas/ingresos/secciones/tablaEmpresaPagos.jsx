import styled from "styled-components";
import { useState, useMemo } from "react";
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaFileCsv,
    FaBuilding,
    FaCheckCircle,
    FaClock,
    FaFileImport,
    FaInfoCircle,
} from "react-icons/fa";
import {
    fnFormatMoney,
    formatFechaLegible,
    exportarRegistrosEmpresaACSV,
} from "../../../funciones/ingresosCalculos";
import {
    guardarRegistroPago,
    eliminarRegistroPago,
} from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";

const ContenedorDetalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const BarraEmpresas = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const TabEmpresa = styled.button`
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid ${({ $activo, $color }) => ($activo ? ($color || "var(--colorMorado)") : "rgba(83, 59, 143, 0.15)")};
  background: ${({ $activo, $color }) => ($activo ? ($color || "var(--colorMorado)") : "white")};
  color: ${({ $activo }) => ($activo ? "white" : "#1a1a2e")};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  box-shadow: ${({ $activo }) => ($activo ? "0 4px 12px rgba(83, 59, 143, 0.2)" : "none")};
  transition: all 0.15s ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const EncabezadoEmpresa = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const InfoEmpresa = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TituloEmpresa = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EsquemaBadge = styled.span`
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BotonesAccionEmpresa = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const BtnAccion = styled.button`
  background: ${({ $primario }) => ($primario ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.08)")};
  color: ${({ $primario }) => ($primario ? "white" : "var(--colorMorado)")};
  border: 1px solid ${({ $primario }) => ($primario ? "transparent" : "rgba(83, 59, 143, 0.2)")};
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const TablaWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  background: white;
  box-shadow: 0 2px 10px rgba(83, 59, 143, 0.04);
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
`;

const Thead = styled.thead`
  background: rgba(83, 59, 143, 0.06);
`;

const Th = styled.th`
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--colorMorado);
  text-align: ${({ $align }) => $align || "left"};
  border-bottom: 2px solid rgba(83, 59, 143, 0.12);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 12px;
  font-size: 13px;
  color: #1a1a2e;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  text-align: ${({ $align }) => $align || "left"};
  font-family: ${({ $mono }) => ($mono ? "'SF Mono', 'Fira Code', monospace" : "inherit")};
  white-space: nowrap;
`;

const Tr = styled.tr`
  transition: background 0.1s ease;
  &:hover {
    background: rgba(83, 59, 143, 0.02);
  }
`;

const TrTotal = styled.tr`
  background: rgba(83, 59, 143, 0.08);
  border-top: 2px solid rgba(83, 59, 143, 0.2);

  td {
    font-weight: 800;
    color: var(--colorMorado);
    font-size: 13px;
  }
`;

const BadgeEstado = styled.button`
  border: none;
  background: ${({ $estado }) => ($estado === "Pagado" ? "rgba(40, 167, 69, 0.15)" : "rgba(255, 152, 0, 0.15)")};
  color: ${({ $estado }) => ($estado === "Pagado" ? "#28a745" : "#e65100")};
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const InputRapido = styled.input`
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', 'Fira Code', monospace;
  width: 100px;
  text-align: right;
  background: transparent;

  &:hover {
    border-color: rgba(83, 59, 143, 0.2);
    background: white;
  }

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: white;
  }
`;

const BotonIcono = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

  &:hover {
    color: ${({ $danger }) => ($danger ? "#dc3545" : "var(--colorMorado)")};
    background: rgba(83, 59, 143, 0.06);
  }
`;

const EstadoVacio = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #888;
  font-size: 13px;
`;

export const TablaEmpresaPagos = ({
    dataIngresos,
    uid,
    year,
    onActualizado,
    onEditarEmpresa,
    onAbrirNuevoPago,
    onAbrirImportador,
    onEditarRegistro,
}) => {
    const empresas = dataIngresos?.empresas || [];
    const registros = dataIngresos?.registros || [];

    const [empresaIdSeleccionada, setEmpresaIdSeleccionada] = useState(
        empresas[0]?.id || ""
    );

    const empresaActual = empresas.find((e) => e.id === empresaIdSeleccionada) || empresas[0] || {};

    const registrosEmpresa = useMemo(() => {
        return registros.filter((r) => r.empresaId === empresaActual.id);
    }, [registros, empresaActual.id]);

    // Totales de la empresa
    const totales = useMemo(() => {
        let totalTeorico = 0;
        let totalReal = 0;
        let totalPendiente = 0;

        registrosEmpresa.forEach((r) => {
            const teorico = Number(r.montoTeorico || 0) + Number(r.montoExtra || 0);
            totalTeorico += teorico;
            if (r.estado === "Pagado") {
                totalReal += Number(r.montoReal !== undefined && r.montoReal !== "" ? r.montoReal : teorico);
            } else {
                totalPendiente += Number(r.montoReal !== undefined && r.montoReal !== "" ? r.montoReal : teorico);
            }
        });

        return { totalTeorico, totalReal, totalPendiente };
    }, [registrosEmpresa]);

    // Toggle estado Pagado / Pendiente rápido
    const handleToggleEstado = async (registro) => {
        const nuevoEstado = registro.estado === "Pagado" ? "Pendiente" : "Pagado";
        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                estado: nuevoEstado,
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al cambiar estado:", e);
        }
    };

    // Cambio rápido de monto real
    const handleCambioMontoReal = async (registro, nuevoMonto) => {
        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                montoReal: Number(nuevoMonto || 0),
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al actualizar monto:", e);
        }
    };

    // Eliminar registro
    const handleEliminarRegistro = async (registroId) => {
        const confirmacion = await Swal.fire({
            title: "¿Eliminar pago?",
            text: "Se quitará este registro del historial.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirmacion.isConfirmed) {
            try {
                const dataActualizada = await eliminarRegistroPago(uid, year, dataIngresos, registroId);
                onActualizado?.(dataActualizada);
            } catch (e) {
                console.error("Error al eliminar:", e);
            }
        }
    };

    const handleExportarCSV = () => {
        exportarRegistrosEmpresaACSV(empresaActual.nombre || "Empresa", registrosEmpresa, year);
    };

    if (empresas.length === 0) {
        return (
            <ContenedorDetalle>
                <EstadoVacio style={{ background: "white", borderRadius: 14, border: "1px dashed rgba(83, 59, 143, 0.2)", padding: "50px 20px" }}>
                    <FaBuilding style={{ fontSize: 40, color: "var(--colorMorado)", opacity: 0.5, marginBottom: 12 }} />
                    <h3 style={{ margin: "0 0 8px", color: "var(--colorMorado)" }}>Aún no tienes empresas registradas en el año {year}</h3>
                    <p style={{ margin: "0 0 16px", color: "#666", fontSize: 13 }}>
                        Da de alta tu primera empresa o importa tu historial de pagos desde Excel.
                    </p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                        <BtnAccion $primario onClick={() => onEditarEmpresa?.(null)}>
                            <FaPlus /> Crear Primera Empresa
                        </BtnAccion>
                        <BtnAccion onClick={onAbrirImportador}>
                            <FaFileImport /> Importar desde Excel
                        </BtnAccion>
                    </div>
                </EstadoVacio>
            </ContenedorDetalle>
        );
    }

    return (
        <ContenedorDetalle>
            {/* ── SELECTOR DE EMPRESAS (TABS) ── */}
            <BarraEmpresas>
                {empresas.map((emp) => (
                    <TabEmpresa
                        key={emp.id}
                        $activo={emp.id === empresaActual.id}
                        $color={emp.color}
                        onClick={() => setEmpresaIdSeleccionada(emp.id)}
                    >
                        <FaBuilding /> {emp.nombre}
                    </TabEmpresa>
                ))}
            </BarraEmpresas>

            {/* ── ENCABEZADO DE LA EMPRESA SELECCIONADA ── */}
            <EncabezadoEmpresa>
                <InfoEmpresa>
                    <TituloEmpresa>
                        <span
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: empresaActual.color || "var(--colorMorado)",
                                display: "inline-block",
                            }}
                        />
                        {empresaActual.nombre || "Empresa"}
                    </TituloEmpresa>
                    <EsquemaBadge>
                        <FaInfoCircle />
                        {empresaActual.tipoEsquema === "diario_sexto_dia" && `Cortes diarios: $${empresaActual.salarioDiario}/día (5 días + 6to por ley)`}
                        {empresaActual.tipoEsquema === "por_horas" && `Por horas: $${empresaActual.precioHora}/hr + Bono Internet $${empresaActual.bonoInternet}`}
                        {empresaActual.tipoEsquema === "quincenal" && `Quincenal base: $${empresaActual.quincenaBase} + Bonos`}
                        {empresaActual.tipoEsquema === "mensual" && "Sueldo Mensual"}
                        {empresaActual.tipoEsquema === "libre" && "Honorarios / Libre"}
                        {empresaActual.notas ? ` • ${empresaActual.notas}` : ""}
                    </EsquemaBadge>
                </InfoEmpresa>

                <BotonesAccionEmpresa>
                    <BtnAccion $primario onClick={() => onAbrirNuevoPago?.(empresaActual)}>
                        <FaPlus /> Registrar Pago
                    </BtnAccion>
                    <BtnAccion onClick={() => onAbrirImportador?.(empresaActual)}>
                        <FaFileImport /> Importar
                    </BtnAccion>
                    <BtnAccion onClick={() => onEditarEmpresa?.(empresaActual)}>
                        <FaEdit /> Configurar Empresa
                    </BtnAccion>
                    <BtnAccion onClick={handleExportarCSV}>
                        <FaFileCsv /> CSV
                    </BtnAccion>
                </BotonesAccionEmpresa>
            </EncabezadoEmpresa>

            {/* ── TABLA DE REGISTROS DE LA EMPRESA ── */}
            <TablaWrapper>
                <Tabla>
                    <Thead>
                        <tr>
                            <Th>Fecha</Th>
                            <Th $align="center"># Periodo</Th>
                            <Th $align="center">Días / Horas</Th>
                            <Th $align="right">Monto Teórico</Th>
                            <Th $align="right">Extra / Bono</Th>
                            <Th>Tipo</Th>
                            <Th $align="center">Estado</Th>
                            <Th $align="right">Pago Real Confirmado</Th>
                            <Th>Notas</Th>
                            <Th $align="center">Acciones</Th>
                        </tr>
                    </Thead>
                    <tbody>
                        {registrosEmpresa.length === 0 ? (
                            <tr>
                                <td colSpan="10">
                                    <EstadoVacio>
                                        No hay pagos registrados para {empresaActual.nombre} en el año {year}.
                                    </EstadoVacio>
                                </td>
                            </tr>
                        ) : (
                            registrosEmpresa.map((reg) => (
                                <Tr key={reg.id}>
                                    <Td $mono>{formatFechaLegible(reg.fecha)}</Td>
                                    <Td $align="center" $mono>
                                        {reg.numeroPeriodo || "—"}
                                    </Td>
                                    <Td $align="center" $mono>
                                        {reg.horasReportadas ? `${reg.horasReportadas} hrs` : (reg.diasTrabajados ? `${reg.diasTrabajados} días` : "—")}
                                    </Td>
                                    <Td $align="right" $mono>
                                        {fnFormatMoney(reg.montoTeorico)}
                                    </Td>
                                    <Td $align="right" $mono style={{ color: reg.montoExtra > 0 ? "#28a745" : "#888" }}>
                                        {reg.montoExtra > 0 ? `+${fnFormatMoney(reg.montoExtra)}` : "—"}
                                    </Td>
                                    <Td>{reg.tipo || "Quincena"}</Td>
                                    <Td $align="center">
                                        <BadgeEstado
                                            $estado={reg.estado}
                                            onClick={() => handleToggleEstado(reg)}
                                            title="Click para alternar estado"
                                        >
                                            {reg.estado === "Pagado" ? <FaCheckCircle /> : <FaClock />}
                                            {reg.estado}
                                        </BadgeEstado>
                                    </Td>
                                    <Td $align="right" $mono>
                                        <InputRapido
                                            type="number"
                                            defaultValue={reg.montoReal !== undefined ? reg.montoReal : (Number(reg.montoTeorico || 0) + Number(reg.montoExtra || 0))}
                                            onBlur={(e) => handleCambioMontoReal(reg, e.target.value)}
                                        />
                                    </Td>
                                    <Td style={{ color: "#777", fontSize: 12 }}>{reg.notas || "—"}</Td>
                                    <Td $align="center">
                                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                            <BotonIcono onClick={() => onEditarRegistro?.(reg)}>
                                                <FaEdit />
                                            </BotonIcono>
                                            <BotonIcono $danger onClick={() => handleEliminarRegistro(reg.id)}>
                                                <FaTrash />
                                            </BotonIcono>
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </tbody>
                    {registrosEmpresa.length > 0 && (
                        <tfoot>
                            <TrTotal>
                                <Td colSpan="3">TOTAL {empresaActual.nombre?.toUpperCase()}</Td>
                                <Td $align="right" $mono>{fnFormatMoney(totales.totalTeorico)}</Td>
                                <Td $align="right">—</Td>
                                <Td colSpan="2" $align="center">
                                    <span style={{ fontSize: 11, color: "#28a745" }}>
                                        Pagado: {fnFormatMoney(totales.totalReal)}
                                    </span>
                                    {totales.totalPendiente > 0 && (
                                        <span style={{ fontSize: 11, color: "#e65100", marginLeft: 8 }}>
                                            Pendiente: {fnFormatMoney(totales.totalPendiente)}
                                        </span>
                                    )}
                                </Td>
                                <Td $align="right" $mono>{fnFormatMoney(totales.totalReal)}</Td>
                                <Td colSpan="2" />
                            </TrTotal>
                        </tfoot>
                    )}
                </Tabla>
            </TablaWrapper>
        </ContenedorDetalle>
    );
};
