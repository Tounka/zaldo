import { useState, useEffect, useCallback, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { FaPiggyBank, FaFileImport, FaDownload } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerOAInicializarAnio,
    guardarDocumentoCompleto,
    agregarCuentaLocal,
    eliminarCuentaLocal,
    actualizarMontoLocal,
    actualizarNombreLocal,
    reordenarFilasLocal,
    importarHistorialDesdeExcel,
    importarCuentasDesdeExcel,
    agregarSnapshotHistorial,
    actualizarNotaHistorial,
} from "../../funciones/firebase/ahorros";
import { TablaCuentas } from "../../componentes/ahorros/tablaCuentas";
import { GraficaHistorial } from "../../componentes/ahorros/graficaHistorial";
import { KpisAnuales } from "../../componentes/ahorros/kpisAnuales";
import { ModalImportar } from "../../componentes/ahorros/modalImportar";
import { H2 } from "../../componentes/genericos/titulos";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Pagina = styled.div`
  width: 100%;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: ${fadeUp} 0.4s ease;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  svg {
    font-size: 24px;
    color: var(--colorMorado);
  }
`;

const SelectorAnio = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const BtnAnio = styled.button`
  padding: 6px 14px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "white")};
  color: ${({ $activo }) => ($activo ? "white" : "#1a1a2e")};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.06)")};
  }
`;

const BtnImportar = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: white;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }

  svg {
    font-size: 12px;
  }
`;

const Cargando = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 14px;
  color: var(--colorMorado);
`;

const GuardandoIndicator = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--colorMorado);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  z-index: 9999;
  animation: ${fadeUp} 0.2s ease;
`;

const DEBOUNCE_MS = 2000;

export const PaginaAhorrosUx = () => {
    const { usuario } = useAppStore();
    const anioActual = new Date().getFullYear();
    const [year, setYear] = useState(anioActual);
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [modalImportar, setModalImportar] = useState(false);

    const debounceRef = useRef(null);
    const dataRef = useRef(data);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const cargarDatos = useCallback(async () => {
        if (!usuario?.uid) return;
        setCargando(true);
        const result = await obtenerOAInicializarAnio(usuario.uid, year);
        setData(result);
        setCargando(false);
    }, [usuario, year]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const programarGuardado = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(async () => {
            if (!usuario?.uid || !dataRef.current) return;
            setGuardando(true);
            await guardarDocumentoCompleto(usuario.uid, year, dataRef.current);
            setGuardando(false);
        }, DEBOUNCE_MS);
    }, [usuario, year]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const handleAgregarFila = () => {
        setData((prev) => {
            const nueva = agregarCuentaLocal(prev, "liquido", "");
            return nueva;
        });
        programarGuardado();
    };

    const handleEliminar = (categoria, cuentaId) => {
        setData((prev) => {
            const sinCuenta = eliminarCuentaLocal(prev, categoria, cuentaId);
            return agregarSnapshotHistorial(sinCuenta);
        });
        programarGuardado();
    };

    const handleActualizarMonto = (categoria, cuentaId, nuevoMonto) => {
        setData((prev) => {
            const actualizado = actualizarMontoLocal(prev, categoria, cuentaId, nuevoMonto);
            return agregarSnapshotHistorial(actualizado);
        });
        programarGuardado();
    };

    const handleActualizarNombre = (categoria, cuentaId, nuevoNombre) => {
        setData((prev) => actualizarNombreLocal(prev, categoria, cuentaId, nuevoNombre));
        programarGuardado();
    };

    const handleReordenarFilas = (fromIdx, toIdx) => {
        setData((prev) => {
            let nueva = prev;
            Object.keys(prev.cuentas).forEach((cat) => {
                if ((prev.cuentas[cat] || []).length > Math.max(fromIdx, toIdx)) {
                    nueva = reordenarFilasLocal(nueva, cat, fromIdx, toIdx);
                }
            });
            return nueva;
        });
        programarGuardado();
    };

    const handleActualizarMeta = (meta) => {
        setData((prev) => ({
            ...prev,
            kpis: { ...(prev.kpis || {}), metaAnual: meta },
        }));
        programarGuardado();
    };

    const handleImportarCuentas = (texto, categoria) => {
        setData((prev) => {
            const importado = importarCuentasDesdeExcel(prev, texto, categoria);
            return agregarSnapshotHistorial(importado);
        });
        programarGuardado();
    };

    const handleImportarHistorial = (texto) => {
        const lineas = texto.trim().split("\n").filter((l) => l.trim());
        setData((prev) => importarHistorialDesdeExcel(prev, lineas));
        programarGuardado();
    };

    const handleActualizarNota = (fechaKey, nota) => {
        setData((prev) => actualizarNotaHistorial(prev, fechaKey, nota));
        programarGuardado();
    };

    const handleExportar = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ahorros-${year}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (cargando) {
        return (
            <Pagina>
                <Cargando>Cargando ahorros...</Cargando>
            </Pagina>
        );
    }

    const cuentas = data?.cuentas || {};
    const historial = data?.historial || [];
    const kpis = data?.kpis || {};

    return (
        <Pagina>
            <Header>
                <FaPiggyBank />
                <H2 size="22px" color="var(--colorMorado)">
                    Mis Ahorros
                </H2>
                <BtnImportar onClick={() => setModalImportar(true)}>
                    <FaFileImport /> Importar
                </BtnImportar>
                <BtnImportar onClick={handleExportar}>
                    <FaDownload /> Exportar
                </BtnImportar>
                <SelectorAnio>
                    {[anioActual - 1, anioActual, anioActual + 1].map((y) => (
                        <BtnAnio key={y} $activo={y === year} onClick={() => setYear(y)}>
                            {y}
                        </BtnAnio>
                    ))}
                </SelectorAnio>
            </Header>

            <KpisAnuales
                historial={historial}
                kpis={kpis}
                onActualizarMeta={handleActualizarMeta}
            />

            <TablaCuentas
                cuentas={cuentas}
                onAgregarFila={handleAgregarFila}
                onEliminar={handleEliminar}
                onActualizarMonto={handleActualizarMonto}
                onActualizarNombre={handleActualizarNombre}
                onReordenarFilas={handleReordenarFilas}
            />

            <GraficaHistorial historial={historial} onActualizarNota={handleActualizarNota} />

            <ModalImportar
                isOpen={modalImportar}
                onClose={() => setModalImportar(false)}
                onImportarCuentas={handleImportarCuentas}
                onImportarHistorial={handleImportarHistorial}
            />

            {guardando && <GuardandoIndicator>Guardando...</GuardandoIndicator>}
        </Pagina>
    );
};
