import styled from "styled-components";
import { useMemo } from "react";
import {
    FaFileCsv,
    FaToggleOn,
    FaToggleOff,
    FaHandHoldingUsd,
    FaMoneyBillWave,
} from "react-icons/fa";
import {
    calcularMatrizResumenMensual,
    exportarMatrizACSV,
    fnFormatMoney,
} from "../../../funciones/ingresosCalculos";
import { actualizarConfiguracionIngresos } from "../../../funciones/firebase/ingresos";

const ContenedorSeccion = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const BarraControlesMatriz = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  padding: 12px 18px;
`;

const ControlesIzquierda = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`;

const ToggleSwitch = styled.button`
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#777")};

  svg {
    font-size: 22px;
    color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ccc")};
  }
`;

const BtnDescargarCSV = styled.button`
  background: rgba(83, 59, 143, 0.08);
  color: var(--colorMorado);
  border: 1px solid rgba(83, 59, 143, 0.2);
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
    background: var(--colorMorado);
    color: white;
  }
`;

const TablaWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  background: white;
  box-shadow: 0 2px 10px rgba(83, 59, 143, 0.04);

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(83, 59, 143, 0.2);
    border-radius: 3px;
  }
`;

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
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
  color: ${({ $color }) => $color || "var(--colorMorado)"};
  text-align: ${({ $align }) => $align || "left"};
  border-bottom: 2px solid rgba(83, 59, 143, 0.12);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 10px 14px;
  font-size: 13px;
  color: #1a1a2e;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  text-align: ${({ $align }) => $align || "left"};
  font-family: ${({ $mono }) => ($mono ? "'SF Mono', 'Fira Code', monospace" : "inherit")};
  font-weight: ${({ $bold }) => ($bold ? 700 : 400)};
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
    font-size: 14px;
  }
`;

const BadgeInactiva = styled.span`
  font-size: 9px;
  font-weight: 600;
  color: #999;
  background: #eee;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 4px;
`;

export const TablaResumenMensual = ({
    dataIngresos,
    prestamosPagos = [],
    uid,
    year,
    onActualizado,
}) => {
    const empresas = dataIngresos?.empresas || [];
    const registros = dataIngresos?.registros || [];
    const ingresosExtra = dataIngresos?.ingresosExtra || [];
    const incluirPrestamos = dataIngresos?.configuracion?.incluirPrestamosEnResumen !== false;

    // Calcular matriz
    const { matriz, totalAnual } = useMemo(() => {
        return calcularMatrizResumenMensual(
            empresas,
            registros,
            ingresosExtra,
            prestamosPagos,
            incluirPrestamos
        );
    }, [empresas, registros, ingresosExtra, prestamosPagos, incluirPrestamos]);

    // Toggle switch préstamos
    const handleTogglePrestamos = async () => {
        const nuevoValor = !incluirPrestamos;
        try {
            const dataActualizada = await actualizarConfiguracionIngresos(uid, year, dataIngresos, {
                incluirPrestamosEnResumen: nuevoValor,
            });
            onActualizado?.(dataActualizada);
        } catch (e) {
            console.error("Error al actualizar switch préstamos:", e);
        }
    };

    const handleDescargarCSV = () => {
        exportarMatrizACSV(empresas, matriz, totalAnual, year, incluirPrestamos);
    };

    return (
        <ContenedorSeccion>
            <BarraControlesMatriz>
                <ControlesIzquierda>
                    <ToggleSwitch $activo={incluirPrestamos} onClick={handleTogglePrestamos}>
                        {incluirPrestamos ? <FaToggleOn /> : <FaToggleOff />}
                        <span>
                            <FaHandHoldingUsd style={{ marginRight: 4 }} />
                            Contabilizar cobros de préstamos en el total
                        </span>
                    </ToggleSwitch>
                </ControlesIzquierda>

                <BtnDescargarCSV onClick={handleDescargarCSV}>
                    <FaFileCsv /> Exportar Matriz a CSV
                </BtnDescargarCSV>
            </BarraControlesMatriz>

            <TablaWrapper>
                <Tabla>
                    <Thead>
                        <tr>
                            <Th>Mes</Th>
                            <Th $align="center"># Pagos</Th>
                            {empresas.map((emp) => (
                                <Th key={emp.id} $align="right" $color={emp.color || "var(--colorMorado)"}>
                                    {emp.nombre}
                                    {!emp.activo && <BadgeInactiva>Inactiva</BadgeInactiva>}
                                </Th>
                            ))}
                            <Th $align="right">Otros</Th>
                            {incluirPrestamos && (
                                <Th $align="right" $color="#0088FE">
                                    Préstamos (Cobros)
                                </Th>
                            )}
                            <Th $align="right" $color="var(--colorMorado)">
                                Total Mes
                            </Th>
                        </tr>
                    </Thead>
                    <tbody>
                        {matriz.map((m) => (
                            <Tr key={m.mesNum}>
                                <Td $bold>{m.mesNombre}</Td>
                                <Td $align="center" $mono>
                                    {m.numPagos > 0 ? m.numPagos : "—"}
                                </Td>

                                {empresas.map((emp) => {
                                    const montoEmp = m.porEmpresa[emp.id] || 0;
                                    return (
                                        <Td key={emp.id} $align="right" $mono>
                                            {montoEmp > 0 ? fnFormatMoney(montoEmp) : "—"}
                                        </Td>
                                    );
                                })}

                                <Td $align="right" $mono>
                                    {m.otros > 0 ? fnFormatMoney(m.otros) : "—"}
                                </Td>

                                {incluirPrestamos && (
                                    <Td $align="right" $mono style={{ color: m.prestamos > 0 ? "#0088FE" : "#888" }}>
                                        {m.prestamos > 0 ? fnFormatMoney(m.prestamos) : "—"}
                                    </Td>
                                )}

                                <Td $align="right" $mono $bold style={{ color: m.totalMes > 0 ? "#1A1A2E" : "#888" }}>
                                    {m.totalMes > 0 ? fnFormatMoney(m.totalMes) : "—"}
                                </Td>
                            </Tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <TrTotal>
                            <Td $bold>TOTAL ANUAL</Td>
                            <Td $align="center" $mono>
                                {totalAnual.numPagos}
                            </Td>

                            {empresas.map((emp) => (
                                <Td key={emp.id} $align="right" $mono>
                                    {fnFormatMoney(totalAnual.porEmpresa[emp.id] || 0)}
                                </Td>
                            ))}

                            <Td $align="right" $mono>
                                {fnFormatMoney(totalAnual.otros || 0)}
                            </Td>

                            {incluirPrestamos && (
                                <Td $align="right" $mono>
                                    {fnFormatMoney(totalAnual.prestamos || 0)}
                                </Td>
                            )}

                            <Td $align="right" $mono $bold>
                                {fnFormatMoney(totalAnual.totalMes || 0)}
                            </Td>
                        </TrTotal>
                    </tfoot>
                </Tabla>
            </TablaWrapper>
        </ContenedorSeccion>
    );
};
