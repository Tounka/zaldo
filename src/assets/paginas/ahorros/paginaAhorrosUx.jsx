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
    importarHistorialEnVariosAnios,
    obtenerAhorrosAnio,
    construirPlanConciliacion,
    aplicarPlanConciliacion,
    importarCuentasDesdeExcel,
    agregarSnapshotHistorial,
    actualizarNotaHistorial,
    getAnioAhorro,
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

// Cada documento sabe a qué año pertenece; es la única fuente confiable
// mientras el estado `year` y el `data` en mano están desfasados.
const anioDeData = (d) => Number(d?.year ?? d?.id) || null;

export const PaginaAhorrosUx = () => {
    const { usuario, setAhorrosAnio } = useAppStore();
    const anioActual = getAnioAhorro();
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

    useEffect(() => {
        if (!usuario?.uid || !data) return;
        // Al cambiar de año este efecto corre antes de que llegue la data nueva:
        // sin este guard escribiría la data vieja bajo la llave del año nuevo,
        // y cargarDatos la leería como si fuera buena.
        if (anioDeData(data) !== year) return;
        setAhorrosAnio(usuario.uid, year, data);
    }, [data, setAhorrosAnio, usuario?.uid, year]);

    const cargarDatos = useCallback(async () => {
        if (!usuario?.uid) return;
        const cacheKey = `${usuario.uid}_${year}`;
        const dataCache = useAppStore.getState().ahorrosPorAnio[cacheKey];
        if (dataCache) {
            setData(dataCache);
            setCargando(false);
            return;
        }

        setCargando(true);
        // El año anterior casi siempre ya está en memoria (vienes de verlo).
        // Pasarlo evita que el corte anual tenga que releerlo de Firestore.
        const anteriorEnCache =
            useAppStore.getState().ahorrosPorAnio[`${usuario.uid}_${year - 1}`] || null;
        const result = await obtenerOAInicializarAnio(usuario.uid, year, { anteriorEnCache });
        setData(result);
        setAhorrosAnio(usuario.uid, year, result);
        setCargando(false);
    }, [setAhorrosAnio, usuario?.uid, year]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const programarGuardado = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(async () => {
            debounceRef.current = null;
            const payload = dataRef.current;
            const anio = anioDeData(payload);
            if (!usuario?.uid || !payload || !anio) return;
            setGuardando(true);
            // El año sale del payload, no del estado: si el usuario ya cambió
            // de año el guardado sigue yendo al documento correcto.
            await guardarDocumentoCompleto(usuario.uid, anio, payload);
            setGuardando(false);
        }, DEBOUNCE_MS);
    }, [usuario?.uid]);

    // Al cambiar de año (o desmontar) se descarga lo que quedó pendiente
    // antes de que dataRef apunte al año nuevo.
    useEffect(() => {
        return () => {
            if (!debounceRef.current) return;
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
            const payload = dataRef.current;
            const anio = anioDeData(payload);
            if (usuario?.uid && payload && anio) {
                guardarDocumentoCompleto(usuario.uid, anio, payload);
            }
        };
    }, [year, usuario?.uid]);

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

    const handleCrearCuenta = (categoria, nombre, monto) => {
        setData((prev) => {
            let nueva = agregarCuentaLocal(prev, categoria, nombre);
            if (monto) {
                const arr = nueva.cuentas[categoria];
                const lastId = arr[arr.length - 1].id;
                nueva = actualizarMontoLocal(nueva, categoria, lastId, monto);
            }
            return agregarSnapshotHistorial(nueva);
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

    const handleImportarHistorial = async (texto, repartirPorAnio) => {
        const lineas = texto.trim().split("\n").filter((l) => l.trim());

        // Los registros del año en pantalla entran al estado local (y se guardan
        // con el debounce habitual, para que la tabla se actualice al instante).
        setData((prev) => importarHistorialDesdeExcel(prev, lineas));
        programarGuardado();

        if (!repartirPorAnio || !usuario?.uid) return;

        /*
         * Los registros de OTROS años se escriben directo en su documento. Antes
         * caían todos en el año seleccionado, lo que inflaba su historial y dejaba
         * "Cantidad Inicial" y ritmo diario sin sentido.
         */
        try {
            setGuardando(true);
            const repartido = await importarHistorialEnVariosAnios(usuario.uid, lineas);
            // Las cachés de los años tocados quedan obsoletas: se invalidan para
            // que al cambiar de año se relean desde Firestore.
            Object.keys(repartido).forEach((anio) => {
                if (Number(anio) !== year) setAhorrosAnio(usuario.uid, Number(anio), null);
            });
        } catch (error) {
            console.error("Error al repartir el historial por año:", error);
        } finally {
            setGuardando(false);
        }
    };

    /*
     * Conciliación con el año anterior. El documento del año nuevo se crea
     * copiando las cuentas del viejo; si después se sigue editando el viejo, los
     * montos quedan desfasados. Esto solo lee y arma el diff: no escribe nada.
     */
    const handlePrevisualizarConciliacion = async (anioOrigen) => {
        if (!usuario?.uid || !data) return null;
        const dataOrigen = await obtenerAhorrosAnio(usuario.uid, anioOrigen);
        if (!dataOrigen) return null;
        return construirPlanConciliacion(dataOrigen, data);
    };

    const handleAplicarConciliacion = (plan, opciones) => {
        // Se aplica sobre el estado local y se guarda con el debounce habitual,
        // igual que cualquier otra edición de la tabla.
        setData((prev) => aplicarPlanConciliacion(prev, plan, opciones));
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
                key={`kpis-${year}`}
                historial={historial}
                kpis={kpis}
                esAnioActivo={year === anioActual}
                onActualizarMeta={handleActualizarMeta}
            />

            <TablaCuentas
                key={`tabla-${year}`}
                cuentas={cuentas}
                onAgregarFila={handleAgregarFila}
                onEliminar={handleEliminar}
                onActualizarMonto={handleActualizarMonto}
                onActualizarNombre={handleActualizarNombre}
                onReordenarFilas={handleReordenarFilas}
                onCrearCuenta={handleCrearCuenta}
            />

            <GraficaHistorial
                historial={historial}
                kpis={data?.kpis || {}}
                onActualizarNota={handleActualizarNota}
            />

            <ModalImportar
                isOpen={modalImportar}
                onClose={() => setModalImportar(false)}
                onImportarCuentas={handleImportarCuentas}
                onImportarHistorial={handleImportarHistorial}
                onPrevisualizarConciliacion={handlePrevisualizarConciliacion}
                onAplicarConciliacion={handleAplicarConciliacion}
                anioSeleccionado={year}
            />

            {guardando && <GuardandoIndicator>Guardando...</GuardandoIndicator>}
        </Pagina>
    );
};
