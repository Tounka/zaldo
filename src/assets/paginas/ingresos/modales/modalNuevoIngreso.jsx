import styled from "styled-components";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
    FaDollarSign,
    FaCalendarAlt,
    FaHashtag,
    FaBriefcase,
    FaCheck,
    FaClock,
    FaTrash,
} from "react-icons/fa";
import { ModalEncabezado, ModalGenerico } from "../../../componentes/modales/modalGenerico";
import { SelectVisual } from "../../../componentes/genericos/SelectVisual";
import {
    CLASIFICACIONES_COBRO,
    empresaLiquidaCortesMensualmente,
    fnFormatMoney,
    obtenerClasificacionCobro,
} from "../../../funciones/ingresosCalculos";
import { guardarRegistroPago, eliminarRegistroPago } from "../../../funciones/firebase/ingresos";
import Swal from "sweetalert2";
import { useAppStore } from "../../../stores/useAppStore";
import { agregarMovimiento } from "../../../funciones/firebase/movimientos";
import { modificarMontoDesdeMovimiento } from "../../../funciones/firebase/cuentas";
import { convertirTimestampADatosFecha } from "../../../funciones/utils/fechas";

const ContenedorModal = styled.div`
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: none;
  width: 100%;
  box-sizing: border-box;
`;

/* ── GRID PRINCIPAL (2 COLUMNAS) ── */
const GridPrincipal = styled.div`
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

/* ── COLUMNA IZQUIERDA (FORMULARIO) ── */
const ColumnaIzquierda = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const GrupoCampo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LabelCampo = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: #333;
`;

const SubtituloSeccion = styled.h4`
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--colorMorado);
`;

const FilaCampos = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => ($cols ? `repeat(${$cols}, 1fr)` : "1fr 1fr")};
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  transition: all 0.15s ease;

  &:focus-within {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
  }
`;

const IconoInput = styled.div`
  padding-left: 12px;
  color: var(--colorMorado);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const InputStyled = styled.input`
  width: 100%;
  border: none;
  background: transparent;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  font-family: inherit;

  &:focus {
    outline: none;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: transparent;
`;

const SelectStyled = styled(SelectVisual)`
  width: 100%;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
`;

const TextareaStyled = styled.textarea`
  width: 100%;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  color: #1a1a2e;
  font-family: inherit;
  resize: vertical;
  min-height: 48px;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
  }
`;

/* ── COLUMNA DERECHA (RESUMEN Y PAGO RECIBIDO) ── */
const ColumnaDerecha = styled.div`
  background: #fbfafd;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TituloResumen = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--colorMorado);
`;

const ListaDesglose = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilaDesglose = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #555;
`;

const ValorDesglose = styled.span`
  font-weight: 700;
  color: #1a1a2e;
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const TarjetaPagoTeorico = styled.div`
  background: white;
  border: 1.5px solid rgba(83, 59, 143, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LabelTeorico = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: var(--colorMorado);
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const MontoTeoricoDestacado = styled.div`
  font-size: 22px;
  font-weight: 900;
  color: var(--colorMorado);
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const Separador = styled.hr`
  border: none;
  border-top: 1px solid rgba(83, 59, 143, 0.1);
  margin: 0;
`;

/* ── PAGO RECIBIDO (PILLS & REAL) ── */
const SeccionPagoRecibido = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ContenedorPills = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const PillEstado = styled.button`
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.2)")};
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "white")};
  color: ${({ $activo }) => ($activo ? "white" : "#666")};
  box-shadow: ${({ $activo }) => ($activo ? "0 2px 8px rgba(83, 59, 143, 0.25)" : "none")};

  &:hover {
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.04)")};
  }
`;

const ContenedorDiferencia = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
`;

const ValorDiferencia = styled.span`
  font-size: 15px;
  font-weight: 800;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: ${({ $diff }) => ($diff < 0 ? "#dc3545" : $diff > 0 ? "#28a745" : "#666")};
`;

/* ── FOOTER BOTONES ── */
const FooterBotones = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(83, 59, 143, 0.1);
  flex-wrap: wrap;
  gap: 10px;
`;

const GrupoBotonesFin = styled.div`
  display: flex;
  gap: 10px;
  margin-left: auto;
`;

const BtnCancelar = styled.button`
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.2);
  color: #555;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #f5f5f5;
  }
`;

const BtnGuardar = styled.button`
  background: var(--colorMorado);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
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

const BtnEliminar = styled.button`
  background: rgba(220, 53, 69, 0.08);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;

// Los registros antiguos no siempre guardaban el precio unitario. En esos
// casos lo reconstruimos desde el subtotal y la unidad correcta, evitando
// tratar el subtotal completo como salario diario al editar.
const obtenerPrecioUnitarioInicial = (registro, empresas) => {
    if (!registro) return 577;

    if (registro.precioUnitario !== undefined && registro.precioUnitario !== null && registro.precioUnitario !== "") {
        return registro.precioUnitario;
    }

    if (registro.precioHora !== undefined && registro.precioHora !== null && registro.precioHora !== "") {
        return registro.precioHora;
    }

    const subtotal = Number(registro.montoTeorico);
    if (!Number.isFinite(subtotal)) return 577;

    const empresa = empresas.find((item) => item.id === registro.empresaId);
    const tipoEsquema = empresa?.tipoEsquema || "";
    const horas = Number(registro.horasReportadas);
    const dias = Number(registro.diasTrabajados);

    if (horas > 0) return subtotal / horas;
    if (!["quincenal", "mensual"].includes(tipoEsquema) && dias > 0) return subtotal / dias;

    return subtotal;
};

export const ModalNuevoIngreso = ({
    isOpen,
    onClose,
    registro = null,
    empresaPreseleccionada = null,
    empresas = [],
    uid,
    year,
    dataIngresos,
    onGuardado,
}) => {
    const { cuentas, setCuentas, setMovimientos } = useAppStore();
    const [cargando, setCargando] = useState(false);

    // Empresa inicial seleccionada
    const [empresaId, setEmpresaId] = useState("");
    const [fecha, setFecha] = useState("");
    const [numeroPeriodo, setNumeroPeriodo] = useState("");
    const [diasTrabajados, setDiasTrabajados] = useState(5);
    const [horasTrabajadas, setHorasTrabajadas] = useState(11);
    const [precioUnitario, setPrecioUnitario] = useState(577); // salarioDiario o precioHora o quincenaBase
    const [extra, setExtra] = useState(0); // 6to dia o bono
    const [tipoPago, setTipoPago] = useState("Corte Semanal");
    const [clasificacionCobro, setClasificacionCobro] = useState(CLASIFICACIONES_COBRO.PAGO);
    const [notas, setNotas] = useState("");
    const [estado, setEstado] = useState("Pagado");
    const [montoReal, setMontoReal] = useState("");
    const [cuentaDestinoId, setCuentaDestinoId] = useState("");

    // Encontrar la empresa actual
    const empresaActual = useMemo(() => {
        return empresas.find((e) => e.id === empresaId) || empresas[0] || {};
    }, [empresas, empresaId]);

    const prellenarSegunEmpresa = useCallback((emp) => {
        if (!emp) return;
        const hoyIso = new Date().toISOString().split("T")[0];
        setFecha(hoyIso);

        const nom = (emp.nombre || "").toLowerCase();
        const tipo = emp.tipoEsquema || "diario_sexto_dia";
        const cortesSeLiquidan = empresaLiquidaCortesMensualmente(emp);
        setCuentaDestinoId(emp.cuentaPorDefectoId || "");

        if (nom.includes("cslp") || emp.id === "emp_cslp_mex") {
            const base = Number(emp.quincenaBase || 7500);
            setDiasTrabajados(15);
            setHorasTrabajadas(0);
            setPrecioUnitario(base);
            setExtra(0);
            setTipoPago("Quincena");
            setClasificacionCobro(CLASIFICACIONES_COBRO.PAGO);
            setEstado("Pagado");
            setMontoReal(String(base));
        } else if (tipo === "por_horas" || nom.includes("innci")) {
            const horas = Number(emp.horasSemanales || 11);
            const precio = Number(emp.precioHora || 52);
            const bono = Number(emp.bonoInternet || 200);
            const calc = (horas * precio) + bono;
            setHorasTrabajadas(horas);
            setDiasTrabajados(3);
            setPrecioUnitario(precio);
            setExtra(bono);
            setTipoPago("Semana (Horas)");
            setClasificacionCobro(cortesSeLiquidan ? CLASIFICACIONES_COBRO.CORTE : CLASIFICACIONES_COBRO.PAGO);
            setEstado(cortesSeLiquidan ? "Pendiente" : "Pagado");
            setMontoReal(String(calc));
        } else if (tipo === "quincenal" || nom.includes("sitio random")) {
            const base = Number(emp.quincenaBase || 5000);
            setDiasTrabajados(15);
            setHorasTrabajadas(0);
            setPrecioUnitario(base);
            setExtra(0);
            setTipoPago("Quincena");
            setClasificacionCobro(CLASIFICACIONES_COBRO.PAGO);
            setEstado("Pagado");
            setMontoReal(String(base));
        } else if (tipo === "diario_sexto_dia") {
            const salario = Number(emp.salarioDiario || 577);
            const dias = Number(emp.diasTrabajadosDefault || 5);
            const sexto = emp.incluirSextoDia !== false ? salario : 0;
            const calc = (dias * salario) + sexto;
            setDiasTrabajados(dias);
            setHorasTrabajadas(0);
            setPrecioUnitario(salario);
            setExtra(sexto);
            setTipoPago("Corte Semanal");
            setClasificacionCobro(CLASIFICACIONES_COBRO.PAGO);
            setEstado("Pagado");
            setMontoReal(String(calc));
        } else {
            setDiasTrabajados(1);
            setPrecioUnitario(0);
            setExtra(0);
            setTipoPago("Honorarios / Libre");
            setClasificacionCobro(CLASIFICACIONES_COBRO.PAGO);
            setEstado("Pagado");
            setMontoReal("");
        }

        // Sugerir número de periodo
        const regsEmp = (dataIngresos?.registros || []).filter((r) => r.empresaId === emp.id);
        const proxPeriodo = regsEmp.length + 1;
        setNumeroPeriodo(proxPeriodo);
    }, [dataIngresos?.registros]);

    // Pre-llenado al abrir el modal o cambiar de registro
    useEffect(() => {
        if (!isOpen) return;

        if (registro) {
            // Edición de registro existente
            setEmpresaId(registro.empresaId || "");
            setFecha(registro.fecha || "");
            setNumeroPeriodo(registro.numeroPeriodo || "");
            setDiasTrabajados(registro.diasTrabajados ?? 5);
            setHorasTrabajadas(registro.horasReportadas ?? 11);
            setPrecioUnitario(obtenerPrecioUnitarioInicial(registro, empresas));
            setExtra(registro.montoExtra || 0);
            setTipoPago(registro.tipo || "Quincena");
            setClasificacionCobro(obtenerClasificacionCobro(registro, empresas.find((empresa) => empresa.id === registro.empresaId)));
            setNotas(registro.notas || "");
            setEstado(registro.estado || "Pagado");
            setMontoReal(registro.montoReal !== undefined && registro.montoReal !== null ? String(registro.montoReal) : "");
            setCuentaDestinoId(registro.cuentaDestinoId || empresaPreseleccionada?.cuentaPorDefectoId || "");
        } else {
            // Nuevo registro: Seleccionar empresa y pre-llenar valores predeterminados
            const emp = empresaPreseleccionada || empresas[0];
            const empId = emp?.id || (empresas[0]?.id || "");
            setEmpresaId(empId);
            prellenarSegunEmpresa(emp || empresas[0]);
        }
    }, [isOpen, registro, empresaPreseleccionada, empresas, prellenarSegunEmpresa]);

    const handleCambiarEmpresa = (nuevaEmpId) => {
        setEmpresaId(nuevaEmpId);
        const emp = empresas.find((e) => e.id === nuevaEmpId);
        prellenarSegunEmpresa(emp);
    };

    // Cálculos teóricos en vivo
    const calculosTeoricos = useMemo(() => {
        const tipo = empresaActual?.tipoEsquema || "diario_sexto_dia";
        const nom = (empresaActual?.nombre || "").toLowerCase();

        let subtotal = 0;
        let pagoTeorico = 0;
        const extraNum = parseFloat(extra) || 0;
        const precioNum = parseFloat(precioUnitario) || 0;

        if (tipo === "por_horas" || nom.includes("innci")) {
            const hrs = parseFloat(horasTrabajadas) || 0;
            subtotal = hrs * precioNum;
            pagoTeorico = subtotal + extraNum;
        } else if (tipo === "quincenal" || nom.includes("sitio random")) {
            subtotal = precioNum;
            pagoTeorico = subtotal + extraNum;
        } else {
            // Por defecto: diario + 6to día
            const d = parseFloat(diasTrabajados) || 0;
            subtotal = d * precioNum;
            pagoTeorico = subtotal + extraNum;
        }

        return {
            subtotal,
            pagoTeorico,
        };
    }, [empresaActual, diasTrabajados, horasTrabajadas, precioUnitario, extra]);

    // Cálculo de Diferencia (Monto Real - Pago Teórico)
    const diferencia = useMemo(() => {
        const real = parseFloat(montoReal) || 0;
        return real - calculosTeoricos.pagoTeorico;
    }, [montoReal, calculosTeoricos.pagoTeorico]);

    // Al alternar pill de Estado a Pagado
    const handleToggleEstadoPill = (nuevoEstado) => {
        setEstado(nuevoEstado);
        if (nuevoEstado === "Pagado" && (!montoReal || parseFloat(montoReal) === 0)) {
            setMontoReal(String(calculosTeoricos.pagoTeorico));
        }
    };

    const handleGuardar = async (e) => {
        e?.preventDefault?.();
        if (!empresaId) {
            Swal.fire("Atención", "Selecciona una empresa para este pago.", "warning");
            return;
        }

        setCargando(true);
        try {
            const fechaD = new Date((fecha || new Date().toISOString().split("T")[0]) + "T12:00:00");
            const mes = !isNaN(fechaD.getTime()) ? fechaD.getMonth() + 1 : 1;

            const esPagoPorHoras = empresaActual.tipoEsquema === "por_horas" || tipoPago === "Semana (Horas)";
            const registroAGuardar = {
                id: registro?.id || "reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
                empresaId,
                empresaNombre: empresaActual.nombre || "Empresa",
                fecha: fecha || new Date().toISOString().split("T")[0],
                mes,
                numeroPeriodo: Number(numeroPeriodo) || 1,
                diasTrabajados: esPagoPorHoras ? null : (diasTrabajados ? Number(diasTrabajados) : null),
                horasReportadas: esPagoPorHoras && horasTrabajadas ? Number(horasTrabajadas) : null,
                precioUnitario: Number(precioUnitario) || 0,
                precioHora: esPagoPorHoras ? Number(precioUnitario) : null,
                montoTeorico: Number(calculosTeoricos.subtotal),
                montoExtra: Number(extra) || 0,
                tipo: tipoPago,
                clasificacionCobro,
                estado,
                montoReal: montoReal !== "" ? Number(montoReal) : calculosTeoricos.pagoTeorico,
                notas,
                cuentaDestinoId: cuentaDestinoId || "",
            };

            const dataActualizada = await guardarRegistroPago(uid, year, dataIngresos, registroAGuardar);

            // Un ingreso cobrado se refleja también en Movimientos. Los cortes
            // pendientes no modifican saldos hasta que realmente se reciban.
            const debeRegistrarMovimiento = estado === "Pagado"
                && cuentaDestinoId
                && (!registro || registro.estado !== "Pagado");
            if (debeRegistrarMovimiento) {
                const cuentaDestino = (cuentas || []).find((cuenta) => cuenta.id === cuentaDestinoId);
                const montoIngreso = Number(registroAGuardar.montoReal || 0);
                if (cuentaDestino && montoIngreso > 0) {
                    const movimiento = await agregarMovimiento({
                        tipoDeMovimiento: "ingreso",
                        monto: montoIngreso,
                        cuentaAsociada: cuentaDestino.id,
                        nombreCuenta: cuentaDestino.nombre,
                        categoria: "ingreso",
                        nota: `Ingreso · ${empresaActual.nombre || "Empresa"}${notas ? ` · ${notas}` : ""}`,
                        fechaMovimiento: registroAGuardar.fecha,
                    }, uid);

                    if (movimiento) {
                        const cuentaActualizada = await modificarMontoDesdeMovimiento(
                            {
                                ...movimiento,
                                tipoDeMovimiento: "ingreso",
                            },
                            uid,
                            cuentaDestino
                        );
                        if (cuentaActualizada) {
                            setCuentas((prev) => prev.map((cuenta) => (
                                cuenta.id === cuentaDestino.id
                                    ? { ...cuenta, ...cuentaActualizada }
                                    : cuenta
                            )));
                        }
                        setMovimientos((prev) => {
                            if (!prev || Array.isArray(prev)) return prev;
                            const fechaMovimiento = convertirTimestampADatosFecha(movimiento.fechaMovimiento);
                            const clave = `${fechaMovimiento.anio}${fechaMovimiento.mes}`;
                            return { ...prev, [clave]: [...(prev[clave] || []), movimiento] };
                        });
                    }
                }
            }
            onGuardado?.(dataActualizada);
            onClose();
        } catch (error) {
            console.error("Error al guardar pago:", error);
            Swal.fire("Error", "No se pudo guardar el registro.", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleEliminar = async () => {
        if (!registro?.id) return;
        const confirmacion = await Swal.fire({
            title: "¿Eliminar este pago?",
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (confirmacion.isConfirmed) {
            setCargando(true);
            try {
                const dataActualizada = await eliminarRegistroPago(uid, year, dataIngresos, registro.id);
                onGuardado?.(dataActualizada);
                onClose();
            } catch (error) {
                console.error("Error al eliminar:", error);
            } finally {
                setCargando(false);
            }
        }
    };

    return (
        <ModalGenerico isOpen={isOpen} onClose={onClose} wide>
            <ContenedorModal>
                <ModalEncabezado
                    icon={<FaDollarSign />}
                    title={registro ? "Editar pago / percepción" : "Nuevo ingreso / percepción"}
                    description="Registra los detalles del corte y compara lo teórico con lo recibido."
                    bleed={24}
                />

                <GridPrincipal>
                    {/* ── COLUMNA IZQUIERDA ── */}
                    <ColumnaIzquierda>
                        {/* Selector de Empleo */}
                        <GrupoCampo>
                            <LabelCampo>Empleo</LabelCampo>
                            <SelectWrapper>
                                <SelectStyled
                                    value={empresaId}
                                    onChange={(e) => handleCambiarEmpresa(e.target.value)}
                                >
                                    {empresas.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nombre}
                                        </option>
                                    ))}
                                </SelectStyled>
                            </SelectWrapper>
                        </GrupoCampo>

                        <GrupoCampo>
                            <LabelCampo>Cuenta que recibe el ingreso</LabelCampo>
                            <SelectWrapper>
                                <SelectStyled
                                    value={cuentaDestinoId}
                                    onChange={(e) => setCuentaDestinoId(e.target.value)}
                                >
                                    <option value="">No registrar en una cuenta</option>
                                    {(cuentas || []).map((cuenta) => (
                                        <option key={cuenta.id} value={cuenta.id}>
                                            {cuenta.nombre || "Sin nombre"}
                                        </option>
                                    ))}
                                </SelectStyled>
                            </SelectWrapper>
                            <small style={{ color: "#777", fontSize: 11 }}>
                                Se usa la cuenta por defecto de la empresa, pero puedes cambiarla o quitarla.
                            </small>
                        </GrupoCampo>

                        {/* Sección Periodo */}
                        <SubtituloSeccion>Periodo</SubtituloSeccion>
                        <FilaCampos $cols={3}>
                            <GrupoCampo>
                                <LabelCampo>Fecha de corte</LabelCampo>
                                <InputWrapper>
                                    <IconoInput>
                                        <FaCalendarAlt />
                                    </IconoInput>
                                    <InputStyled
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                    />
                                </InputWrapper>
                            </GrupoCampo>

                            <GrupoCampo>
                                <LabelCampo>Semana / Quincena #</LabelCampo>
                                <InputWrapper>
                                    <IconoInput>
                                        <FaHashtag />
                                    </IconoInput>
                                    <InputStyled
                                        type="number" inputMode="decimal"
                                        value={numeroPeriodo}
                                        onChange={(e) => setNumeroPeriodo(e.target.value)}
                                    />
                                </InputWrapper>
                            </GrupoCampo>

                            <GrupoCampo>
                                <LabelCampo>
                                    {empresaActual?.tipoEsquema === "por_horas" ? "Horas trabajadas" : "Días trabajados"}
                                </LabelCampo>
                                <InputWrapper>
                                    <IconoInput>
                                        <FaBriefcase />
                                    </IconoInput>
                                    {empresaActual?.tipoEsquema === "por_horas" ? (
                                        <InputStyled
                                            type="number" inputMode="decimal"
                                            step="0.5"
                                            value={horasTrabajadas}
                                            onChange={(e) => setHorasTrabajadas(e.target.value)}
                                        />
                                    ) : (
                                        <InputStyled
                                            type="number" inputMode="decimal"
                                            value={diasTrabajados}
                                            onChange={(e) => setDiasTrabajados(e.target.value)}
                                        />
                                    )}
                                </InputWrapper>
                            </GrupoCampo>
                        </FilaCampos>

                        {/* Sección Cálculo */}
                        <SubtituloSeccion>Cálculo</SubtituloSeccion>
                        <FilaCampos $cols={2}>
                            <GrupoCampo>
                                <LabelCampo>
                                    {empresaActual?.tipoEsquema === "por_horas"
                                        ? "Precio por hora"
                                        : empresaActual?.tipoEsquema === "quincenal"
                                            ? "Quincena base"
                                            : "Monto teórico base (salario diario)"}
                                </LabelCampo>
                                <InputWrapper>
                                    <IconoInput>
                                        <FaDollarSign />
                                    </IconoInput>
                                    <InputStyled
                                        type="number" inputMode="decimal"
                                        value={precioUnitario}
                                        onChange={(e) => setPrecioUnitario(e.target.value)}
                                    />
                                </InputWrapper>
                            </GrupoCampo>

                            <GrupoCampo>
                                <LabelCampo>
                                    {empresaActual?.tipoEsquema === "por_horas"
                                        ? "Bono Internet / Extras $"
                                        : "Extra (6to día / Bono / Otros $)"}
                                </LabelCampo>
                                <InputWrapper>
                                    <IconoInput>
                                        <FaDollarSign />
                                    </IconoInput>
                                    <InputStyled
                                        type="number" inputMode="decimal"
                                        value={extra}
                                        onChange={(e) => setExtra(e.target.value)}
                                    />
                                </InputWrapper>
                            </GrupoCampo>
                        </FilaCampos>

                        {/* Tipo de pago y cobro */}
                        <FilaCampos $cols={3}>
                            <GrupoCampo>
                                <LabelCampo>Tipo de pago</LabelCampo>
                                <SelectWrapper>
                                    <SelectStyled
                                        value={tipoPago}
                                        onChange={(e) => setTipoPago(e.target.value)}
                                    >
                                        <option value="Corte Semanal">Corte Semanal</option>
                                        <option value="Quincena">Quincena</option>
                                        <option value="Bono">Bono</option>
                                        <option value="Semana (Horas)">Semana (Horas)</option>
                                        <option value="Liquidación">Liquidación</option>
                                        <option value="Finiquito">Finiquito</option>
                                        <option value="Honorarios / Libre">Honorarios / Libre</option>
                                        <option value="Ajuste / Extra">Ajuste / Extra</option>
                                    </SelectStyled>
                                </SelectWrapper>
                            </GrupoCampo>

                            <GrupoCampo>
                                <LabelCampo>Se contabiliza como</LabelCampo>
                                <SelectWrapper>
                                    <SelectStyled
                                        value={clasificacionCobro}
                                        onChange={(e) => setClasificacionCobro(e.target.value)}
                                    >
                                        <option value={CLASIFICACIONES_COBRO.PAGO}>Pago recibido directo</option>
                                        <option value={CLASIFICACIONES_COBRO.CORTE}>Corte por liquidar</option>
                                        <option value={CLASIFICACIONES_COBRO.LIQUIDACION}>Liquidación recibida</option>
                                    </SelectStyled>
                                </SelectWrapper>
                            </GrupoCampo>

                            <GrupoCampo>
                                <LabelCampo>Notas / Desglose</LabelCampo>
                                <TextareaStyled
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                />
                            </GrupoCampo>
                        </FilaCampos>
                    </ColumnaIzquierda>

                    {/* ── COLUMNA DERECHA (RESUMEN EXACTO A PROPUESTA 1) ── */}
                    <ColumnaDerecha>
                        <TituloResumen>Resumen del cálculo</TituloResumen>

                        <ListaDesglose>
                            <FilaDesglose>
                                <span>
                                    {empresaActual?.tipoEsquema === "por_horas" ? "Precio hora" : "Salario diario"}
                                </span>
                                <ValorDesglose>{fnFormatMoney(precioUnitario)}</ValorDesglose>
                            </FilaDesglose>
                            <FilaDesglose>
                                <span>
                                    {empresaActual?.tipoEsquema === "por_horas" ? "Horas trabajadas" : "Días trabajados"}
                                </span>
                                <ValorDesglose>
                                    {empresaActual?.tipoEsquema === "por_horas" ? `${horasTrabajadas} hrs` : `× ${diasTrabajados}`}
                                </ValorDesglose>
                            </FilaDesglose>
                            <FilaDesglose>
                                <span>Subtotal</span>
                                <ValorDesglose>{fnFormatMoney(calculosTeoricos.subtotal)}</ValorDesglose>
                            </FilaDesglose>
                            <FilaDesglose>
                                <span>
                                    {empresaActual?.tipoEsquema === "por_horas" ? "Bono Internet" : "6to día / Bono / Otros"}
                                </span>
                                <ValorDesglose style={{ color: Number(extra) > 0 ? "#28a745" : "inherit" }}>
                                    + {fnFormatMoney(extra)}
                                </ValorDesglose>
                            </FilaDesglose>
                        </ListaDesglose>

                        <TarjetaPagoTeorico>
                            <LabelTeorico>Pago teórico</LabelTeorico>
                            <MontoTeoricoDestacado>
                                {fnFormatMoney(calculosTeoricos.pagoTeorico)} <span style={{ fontSize: 13, fontWeight: 700 }}>MXN</span>
                            </MontoTeoricoDestacado>
                        </TarjetaPagoTeorico>

                        <Separador />

                        {/* Sección Pago Recibido */}
                        <SeccionPagoRecibido>
                            <TituloResumen style={{ fontSize: 13 }}>Pago recibido</TituloResumen>

                            <GrupoCampo>
                                <LabelCampo>Estado</LabelCampo>
                                <ContenedorPills>
                                    <PillEstado
                                        type="button"
                                        $activo={estado === "Pagado"}
                                        onClick={() => handleToggleEstadoPill("Pagado")}
                                    >
                                        <FaCheck /> Pagado
                                    </PillEstado>
                                    <PillEstado
                                        type="button"
                                        $activo={estado === "Pendiente"}
                                        onClick={() => handleToggleEstadoPill("Pendiente")}
                                    >
                                        <FaClock /> Pendiente
                                    </PillEstado>
                                </ContenedorPills>
                            </GrupoCampo>

                            <GrupoCampo>
                                <LabelCampo>Monto real confirmado / pagado</LabelCampo>
                                <InputWrapper>
                                    <IconoInput>
                                        <FaDollarSign />
                                    </IconoInput>
                                    <InputStyled
                                        type="number" inputMode="decimal"
                                        value={montoReal}
                                        onChange={(e) => setMontoReal(e.target.value)}
                                    />
                                </InputWrapper>
                            </GrupoCampo>

                            <ContenedorDiferencia>
                                <LabelCampo style={{ margin: 0 }}>Diferencia</LabelCampo>
                                <ValorDiferencia $diff={diferencia}>
                                    {diferencia > 0 ? `+${fnFormatMoney(diferencia)} ▲` : diferencia < 0 ? `${fnFormatMoney(diferencia)} ▼` : `${fnFormatMoney(0)} MXN`}
                                </ValorDiferencia>
                            </ContenedorDiferencia>
                        </SeccionPagoRecibido>
                    </ColumnaDerecha>
                </GridPrincipal>

                {/* ── FOOTER BOTONES ── */}
                <FooterBotones>
                    {registro && (
                        <BtnEliminar type="button" onClick={handleEliminar} disabled={cargando}>
                            <FaTrash /> Eliminar Registro
                        </BtnEliminar>
                    )}

                    <GrupoBotonesFin>
                        <BtnCancelar type="button" onClick={onClose} disabled={cargando}>
                            Cancelar
                        </BtnCancelar>
                        <BtnGuardar type="button" onClick={handleGuardar} disabled={cargando}>
                            <FaCheck /> {cargando ? "Guardando..." : "Guardar Pago"}
                        </BtnGuardar>
                    </GrupoBotonesFin>
                </FooterBotones>
            </ContenedorModal>
        </ModalGenerico>
    );
};
