import styled from "styled-components";
import { useState, useMemo, useEffect } from "react";
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
    FaBolt,
    FaSortAmountDown,
    FaSortAmountUp,
    FaChevronDown,
} from "react-icons/fa";
import {
    fnFormatMoney,
    formatFechaLegible,
    exportarRegistrosEmpresaACSV,
    generarPeriodosRecurrentesEmpresa,
} from "../../../funciones/ingresosCalculos";
import {
    guardarRegistroPago,
    eliminarRegistroPago,
    guardarRegistrosMasivos,
} from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";

const ContenedorDetalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EncabezadoEmpresa = styled.div`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
`;

const InfoEmpresa = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const TituloFila = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const DotColor = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color || "var(--colorMorado)"};
  display: inline-block;
`;

const TituloEmpresa = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: #1a1a2e;
`;

const SelectEmpresaHeader = styled.select`
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--colorMorado);
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const EsquemaBadge = styled.div`
  font-size: 12px;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(83, 59, 143, 0.04);
  border-radius: 8px;
  padding: 4px 10px;
  width: fit-content;
`;

const BotonesAccionEmpresa = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const BtnAccion = styled.button`
  background: ${({ $primario, $destacado }) => ($destacado ? "rgba(243, 156, 18, 0.12)" : ($primario ? "var(--colorMorado)" : "white"))};
  color: ${({ $primario, $destacado }) => ($destacado ? "#d35400" : ($primario ? "white" : "var(--colorMorado)"))};
  border: 1px solid ${({ $primario, $destacado }) => ($destacado ? "rgba(243, 156, 18, 0.35)" : ($primario ? "transparent" : "rgba(83, 59, 143, 0.2)"))};
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
    background: ${({ $primario, $destacado }) => ($destacado ? "rgba(243, 156, 18, 0.18)" : ($primario ? "var(--colorMoradoSecundario)" : "rgba(83, 59, 143, 0.06)"))};
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
  &:hover {
    background: rgba(83, 59, 143, 0.02);
  }
`;

const TrTotal = styled.tr`
  background: rgba(83, 59, 143, 0.08);
  font-weight: 800;
  border-top: 2px solid rgba(83, 59, 143, 0.2);
`;

const BadgeEstado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  background: ${({ $estado }) => ($estado === "Pagado" ? "rgba(40, 167, 69, 0.12)" : "rgba(255, 193, 7, 0.18)")};
  color: ${({ $estado }) => ($estado === "Pagado" ? "#1e7e34" : "#856404")};
  border: 1px solid ${({ $estado }) => ($estado === "Pagado" ? "rgba(40, 167, 69, 0.3)" : "rgba(255, 193, 7, 0.4)")};
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.04);
  }
`;

const InputRapido = styled.input`
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  width: 110px;
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

const InputFechaRapido = styled.input`
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 12px;
  color: #1a1a2e;
  background: transparent;
  cursor: pointer;

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
    empresaSeleccionadaId,
    onCambiarEmpresaSeleccionada,
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

    const [empresaIdLocal, setEmpresaIdLocal] = useState(
        empresaSeleccionadaId || empresas[0]?.id || ""
    );
    const [ordenDesc, setOrdenDesc] = useState(true); // true = Más reciente primero

    useEffect(() => {
        if (empresaSeleccionadaId) {
            setEmpresaIdLocal(empresaSeleccionadaId);
        }
    }, [empresaSeleccionadaId]);

    const empresaActual = empresas.find((e) => e.id === empresaIdLocal) || empresas[0] || {};

    const handleSelectEmpresa = (id) => {
        setEmpresaIdLocal(id);
        onCambiarEmpresaSeleccionada?.(id);
    };

    // Registros ordenados por fecha (Más recientes arriba por defecto)
    const registrosEmpresa = useMemo(() => {
        const filtrados = registros.filter((r) => r.empresaId === empresaActual.id);
        return [...filtrados].sort((a, b) => {
            const comp = (b.fecha || "").localeCompare(a.fecha || "");
            return ordenDesc ? comp : -comp;
        });
    }, [registros, empresaActual.id, ordenDesc]);

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

    // Generar todas las semanas o quincenas pendientes del año automáticamente
    const handleGenerarRecurrentes = async () => {
        const nuevos = generarPeriodosRecurrentesEmpresa(empresaActual, year, registros);
        if (nuevos.length === 0) {
            Swal.fire("Todo al día", "Todas las fechas del año ya están generadas para esta empresa.", "info");
            return;
        }

        const confirm = await Swal.fire({
            title: `¿Generar ${nuevos.length} periodos pendientes?`,
            text: `Se crearán automáticamente las fechas restantes de ${year} en estado Pendiente para ${empresaActual.nombre}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: `Sí, generar ${nuevos.length} periodos`,
            confirmButtonColor: "var(--colorMorado)",
            cancelButtonText: "Cancelar",
        });

        if (confirm.isConfirmed) {
            try {
                const dataActualizada = await guardarRegistrosMasivos(uid, year, dataIngresos, nuevos);
                onActualizado?.(dataActualizada);
                Swal.fire("¡Listo!", `Se generaron ${nuevos.length} periodos pendientes para ${year}.`, "success");
            } catch (e) {
                console.error("Error al generar periodos:", e);
                Swal.fire("Error", "No se pudieron generar los periodos.", "error");
            }
        }
    };

    // Toggle estado Pagado / Pendiente rápido
    const handleToggleEstado = async (registro) => {
        const nuevoEstado = registro.estado === "Pagado" ? "Pendiente" : "Pagado";
        const teoricoTotal = Number(registro.montoTeorico || 0) + Number(registro.montoExtra || 0);
        const montoRealNuevo = nuevoEstado === "Pagado" && (!registro.montoReal || Number(registro.montoReal) === 0)
            ? teoricoTotal
            : (registro.montoReal ?? teoricoTotal);

        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                estado: nuevoEstado,
                montoReal: montoRealNuevo,
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al cambiar estado:", e);
        }
    };

    // Cambio rápido de fecha
    const handleCambioFecha = async (registro, nuevaFecha) => {
        if (!nuevaFecha || nuevaFecha === registro.fecha) return;
        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                fecha: nuevaFecha,
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al actualizar fecha:", e);
        }
    };

    // Cambio rápido de monto real
    const handleCambioMontoReal = async (registro, nuevoMonto) => {
        const montoNum = parseFloat(nuevoMonto);
        if (isNaN(montoNum)) return;
        try {
            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, {
                ...registro,
                montoReal: montoNum,
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
            {/* ── ENCABEZADO DE LA EMPRESA SELECCIONADA ── */}
            <EncabezadoEmpresa>
                <InfoEmpresa>
                    <TituloFila>
                        <DotColor $color={empresaActual.color} />
                        <TituloEmpresa>{empresaActual.nombre || "Empresa"}</TituloEmpresa>
                        {empresas.length > 1 && (
                            <SelectEmpresaHeader
                                value={empresaActual.id}
                                onChange={(e) => handleSelectEmpresa(e.target.value)}
                            >
                                {empresas.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        Cambiar a: {e.nombre}
                                    </option>
                                ))}
                            </SelectEmpresaHeader>
                        )}
                    </TituloFila>
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
                    <BtnAccion $destacado onClick={handleGenerarRecurrentes} title="Genera automáticamente los cortes o semanas restantes del año en estado Pendiente">
                        <FaBolt /> Proyectar Periodos de {year}
                    </BtnAccion>
                    <BtnAccion onClick={() => setOrdenDesc(!ordenDesc)}>
                        {ordenDesc ? <FaSortAmountDown /> : <FaSortAmountUp />} {ordenDesc ? "Recientes Primero" : "Antiguos Primero"}
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
                                        <div style={{ marginTop: 12 }}>
                                            <BtnAccion $destacado onClick={handleGenerarRecurrentes} style={{ display: "inline-flex" }}>
                                                <FaBolt /> Generar Semanas Pendientes de {year}
                                            </BtnAccion>
                                        </div>
                                    </EstadoVacio>
                                </td>
                            </tr>
                        ) : (
                            registrosEmpresa.map((reg) => (
                                <Tr key={reg.id}>
                                    <Td $mono>
                                        <InputFechaRapido
                                            type="date"
                                            value={reg.fecha || ""}
                                            onChange={(e) => handleCambioFecha(reg, e.target.value)}
                                            title="Click para cambiar fecha"
                                        />
                                    </Td>
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
                                            title="Click para alternar entre Pagado y Pendiente"
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
                                            title="Edita el monto real depositado"
                                        />
                                    </Td>
                                    <Td style={{ color: "#777", fontSize: 12 }}>{reg.notas || "—"}</Td>
                                    <Td $align="center">
                                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                            <BotonIcono onClick={() => onEditarRegistro?.(reg)} title="Editar detalles completos">
                                                <FaEdit />
                                            </BotonIcono>
                                            <BotonIcono $danger onClick={() => handleEliminarRegistro(reg.id)} title="Eliminar registro">
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
