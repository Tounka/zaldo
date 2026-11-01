import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styled from "styled-components";
import { FaPlus, FaTrash, FaGripVertical, FaRegEye, FaEye, FaPen, FaExchangeAlt } from "react-icons/fa";
import { markdownATextoPlano } from "../../funciones/utils/markdown";
import { ModalNotaCuenta } from "./modalNotaCuenta";
import { ModalDetalleCuenta } from "./modalDetalleCuenta";
import { ModalTraspaso } from "./modalTraspaso";
import { resumenRendimientoPorCuenta } from "../../funciones/ahorrosRendimientos";
import { useEnlaceCuentasStore } from "../../stores/useEnlaceCuentasStore";

const TablaWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  background: white;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(83, 59, 143, 0.04);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(83, 59, 143, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(83, 59, 143, 0.3);
    }
  }
`;

const Tabla = styled.table`
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: rgba(83, 59, 143, 0.06);
`;

const Th = styled.th`
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--colorMorado);
  text-align: ${({ $align }) => $align || "left"};
  border-bottom: 2px solid rgba(83, 59, 143, 0.12);
  white-space: nowrap;
  user-select: none;
  cursor: ${({ $draggable }) => ($draggable ? "grab" : "default")};
  position: relative;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }
`;

const ThCategoria = styled.th`
  padding: 10px 14px;
  font-size: 11.5px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ $color }) => $color};
  text-align: center;
  border-bottom: 2px solid ${({ $color }) => $color}40;
  background: ${({ $color }) => $color}08;
  cursor: grab;
  white-space: nowrap;
`;

const ThCategoriaContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const GripIcon = styled(FaGripVertical)`
  font-size: 11px;
  color: rgba(83, 59, 143, 0.3);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const Td = styled.td`
  padding: 6px 8px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  vertical-align: middle;
`;

/*
 * Marco dorado del enlace entre cuentas (el mismo de /home): el candidato late
 * y la cuenta ya elegida como salida se queda fija.
 */
const TdMonto = styled(Td)`
  position: relative;
  box-shadow: ${({ $enlace }) => ($enlace ? "inset 0 0 0 2px #f1c40f" : "none")};
  background: ${({ $enlace }) => ($enlace ? "rgba(241, 196, 15, 0.08)" : "transparent")};
  cursor: ${({ $enlace }) => ($enlace ? "pointer" : "auto")};
  animation: ${({ $enlace }) => ($enlace === "candidata" ? "latidoEnlaceAhorro 1.1s ease-in-out infinite alternate" : "none")};

  input {
    cursor: ${({ $enlace }) => ($enlace ? "pointer" : "text")};
  }

  @keyframes latidoEnlaceAhorro {
    from { box-shadow: inset 0 0 0 2px rgba(241, 196, 15, 0.5); }
    to { box-shadow: inset 0 0 0 2px #f1c40f, 0 0 10px rgba(241, 196, 15, 0.55); }
  }
`;

const CeldaConcepto = styled.div`
  min-width: 125px;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const FechaUltimoMovimiento = styled.span`
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $sinMovimiento }) => $sinMovimiento ? "#f4f1f5" : "rgba(18, 128, 92, .08)"};
  color: ${({ $sinMovimiento }) => $sinMovimiento ? "#958c9b" : "#26725d"};
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FilaEyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`;

/* Rendimiento del año de la cuenta, compacto, junto a sus botones. */
const RendimientoCuenta = styled.span`
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ $negativo }) => ($negativo ? "#c2303c" : "#1f8a52")};
  white-space: nowrap;
`;

const TasaCuenta = styled.span`
  color: #6b6a75;
  font-weight: 700;
`;

const BtnNota = styled.button`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 20px;
  height: 18px;
  padding: 0;
  border: 1px solid ${({ $conNota }) => ($conNota ? "rgba(83, 59, 143, 0.45)" : "transparent")};
  border-radius: 4px;
  background: ${({ $conNota }) => ($conNota ? "rgba(83, 59, 143, 0.1)" : "transparent")};
  color: ${({ $conNota }) => ($conNota ? "var(--colorMorado)" : "#a59cb0")};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  svg {
    font-size: 11px;
  }

  &:hover {
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.12);
    color: var(--colorMorado);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 1px;
  }
`;

const InputEditable = styled.input`
  width: 100%;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 13.5px;
  font-weight: ${({ $isMonto }) => ($isMonto ? 600 : 400)};
  color: #1a1a2e;
  background: transparent;
  text-align: ${({ $align }) => $align || "left"};
  font-family: ${({ $isMonto }) => ($isMonto ? "'SF Mono', 'Fira Code', monospace" : "inherit")};
  transition: border-color 0.15s ease, background 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.04);
  }

  &:hover:not(:focus) {
    border-color: rgba(83, 59, 143, 0.15);
    background: rgba(83, 59, 143, 0.02);
  }

  &::placeholder {
    color: #d0d0d0;
    font-style: italic;
  }
`;

const InputControlado = ({ value: valueProp, onCommit, ...rest }) => {
    const [local, setLocal] = useState(valueProp ?? "");
    const commitRef = useRef(false);

    useEffect(() => {
        if (!commitRef.current) {
            setLocal(valueProp ?? "");
        }
    }, [valueProp]);

    const handleChange = useCallback((e) => {
        setLocal(e.target.value);
        commitRef.current = true;
    }, []);

    const doCommit = useCallback(() => {
        commitRef.current = false;
        if (String(local) !== String(valueProp ?? "")) {
            onCommit?.(local);
        }
    }, [local, valueProp, onCommit]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter") {
            e.target.blur();
        }
    }, []);

    return (
        <InputEditable
            {...rest}
            value={local}
            onChange={handleChange}
            onBlur={doCommit}
            onKeyDown={handleKeyDown}
        />
    );
};

const BtnEliminar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #b3a9bd;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  opacity: 0.35;

  tr:hover &,
  &:focus-visible {
    opacity: 1;
  }

  /* En táctil no hay hover: si no, el botón nunca aparece. */
  @media (hover: none) {
    opacity: 1;
  }

  &:hover {
    background: rgba(219, 43, 57, 0.1);
    color: var(--colorRojo);
  }

  svg {
    font-size: 11px;
  }
`;

const FilaTotal = styled.tr`
  background: rgba(83, 59, 143, 0.06);

  td {
    padding: 12px 10px;
    font-size: 13px;
    font-weight: 700;
    color: var(--colorMorado);
    border-top: 2px solid rgba(83, 59, 143, 0.15);
    border-bottom: none;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
`;

const AccionesTabla = styled.div`
  display: flex;
  border-top: 1px solid rgba(83, 59, 143, 0.08);

  > * + * {
    border-left: 1px solid rgba(83, 59, 143, 0.08);
  }
`;

const BtnAgregarFila = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 11px;
  border: none;
  background: transparent;
  color: var(--colorMorado);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }

  svg {
    font-size: 11px;
  }
`;

const Vacio = styled.td`
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #c0c0c0;
  font-style: italic;
`;

const NumFila = styled.td`
  padding: 4px 8px;
  font-size: 10px;
  color: #c0c0c0;
  text-align: center;
  border-right: 1px solid rgba(83, 59, 143, 0.06);
  user-select: none;
  cursor: grab;
  width: 30px;

  &:active {
    cursor: grabbing;
  }
`;

const COLORES_CATEGORIAS = {
    liquido: "#006c67",
    inversiones: "#533b8f",
    inversionesLargo: "#cca43b",
    responsabilidades: "#db2b39",
};

const NOMBRES_CATEGORIAS = {
    liquido: "Líquido",
    inversiones: "Inversiones",
    inversionesLargo: "A Largo",
    responsabilidades: "Resp.",
};

const formatMoney = (n) =>
    Number(n || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

/* $1,234 → "$1.2k": cabe junto al nombre de la cuenta. */
const formatoCompacto = (n) => {
    const valor = Number(n || 0);
    const absoluto = Math.abs(valor);
    const signo = valor < 0 ? "-" : "";
    if (absoluto >= 1000) return `${signo}$${(absoluto / 1000).toFixed(absoluto >= 10000 ? 0 : 1)}k`;
    return `${signo}$${absoluto.toFixed(absoluto >= 100 ? 0 : 2)}`;
};

const obtenerUltimoMovimiento = (valor) => {
    if (!valor) return { texto: "Sin movimientos", titulo: "Esta cuenta aún no tiene un cambio de monto registrado", sinMovimiento: true };

    const fecha = typeof valor?.toDate === "function"
        ? valor.toDate()
        : typeof valor?.seconds === "number"
            ? new Date(valor.seconds * 1000)
            : new Date(`${String(valor).slice(0, 10)}T12:00:00`);

    if (Number.isNaN(fecha.getTime())) return { texto: "Sin movimientos", titulo: "No se pudo leer la fecha del último movimiento", sinMovimiento: true };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    const dias = Math.max(0, Math.floor((hoy.getTime() - fecha.getTime()) / 86400000));
    const fechaCompleta = fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    if (dias === 0) return { texto: "Movido hoy", titulo: `Último movimiento: ${fechaCompleta}`, sinMovimiento: false };
    if (dias === 1) return { texto: "Hace 1 día", titulo: `Último movimiento: ${fechaCompleta}`, sinMovimiento: false };
    return { texto: `Hace ${dias} días`, titulo: `Último movimiento: ${fechaCompleta}`, sinMovimiento: false };
};

const tieneModificador = (e) => e.shiftKey || e.ctrlKey || e.metaKey;
const esTeclaModificadora = (e) => e.key === "Shift" || e.key === "Control" || e.key === "Meta";

/*
 * Celda del monto. Igual que en /home: con Shift sobre el monto la celda se
 * arma, el primer clic fija la cuenta de salida y el segundo, en otra cuenta,
 * abre el traspaso con las dos ya puestas.
 */
const CeldaMonto = ({ cuenta, categoria, onCompletarEnlace, children }) => {
    const armado = useEnlaceCuentasStore((estado) => estado.armado);
    const cuentaOrigen = useEnlaceCuentasStore((estado) => estado.cuentaOrigen);
    const armar = useEnlaceCuentasStore((estado) => estado.armar);
    const desarmar = useEnlaceCuentasStore((estado) => estado.desarmar);
    const seleccionarOrigen = useEnlaceCuentasStore((estado) => estado.seleccionarOrigen);
    const setCuentaHover = useEnlaceCuentasStore((estado) => estado.setCuentaHover);
    const cancelar = useEnlaceCuentasStore((estado) => estado.cancelar);
    const registrarRect = useEnlaceCuentasStore((estado) => estado.registrarRect);
    const olvidarRect = useEnlaceCuentasStore((estado) => estado.olvidarRect);
    const [hover, setHover] = useState(false);
    const celdaRef = useRef(null);

    const id = cuenta?.id;
    const enlaceEnCurso = Boolean(cuentaOrigen);
    const esOrigen = Boolean(id && cuentaOrigen?.id === id);
    const candidata = Boolean(id) && hover && (armado || enlaceEnCurso) && !esOrigen;
    const resaltada = candidata || esOrigen;

    // La flecha del lienzo se dibuja sobre la posición de la celda.
    useEffect(() => {
        if (!id || !resaltada) return undefined;
        const publicar = () => {
            const rect = celdaRef.current?.getBoundingClientRect();
            if (rect) registrarRect(id, { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        };
        publicar();
        window.addEventListener("scroll", publicar, true);
        window.addEventListener("resize", publicar);
        return () => {
            window.removeEventListener("scroll", publicar, true);
            window.removeEventListener("resize", publicar);
            olvidarRect(id);
        };
    }, [id, olvidarRect, registrarRect, resaltada]);

    useEffect(() => {
        if (!hover || !id) return undefined;
        const alPresionar = (e) => { if (esTeclaModificadora(e)) armar(); };
        const alSoltar = (e) => { if (esTeclaModificadora(e)) desarmar(); };
        window.addEventListener("keydown", alPresionar);
        window.addEventListener("keyup", alSoltar);
        return () => {
            window.removeEventListener("keydown", alPresionar);
            window.removeEventListener("keyup", alSoltar);
        };
    }, [armar, desarmar, hover, id]);

    const referencia = () => ({ id, nombre: cuenta?.nombre || "", categoria });

    // En mousedown para que el input no tome el foco al elegir la cuenta.
    const alPresionarCelda = (e) => {
        if (!id || (!tieneModificador(e) && !enlaceEnCurso)) return;
        e.preventDefault();
        e.stopPropagation();
        if (!cuentaOrigen) {
            seleccionarOrigen(referencia());
            return;
        }
        const origenId = cuentaOrigen.id;
        cancelar();
        if (origenId !== id) onCompletarEnlace?.(origenId, id);
    };

    return (
        <TdMonto
            ref={celdaRef}
            $enlace={esOrigen ? "origen" : candidata ? "candidata" : null}
            title={esOrigen
                ? "Cuenta de salida · haz clic en el monto de otra cuenta"
                : candidata && enlaceEnCurso
                    ? `Traspasar a ${cuenta?.nombre || "esta cuenta"}`
                    : candidata
                        ? "Shift + clic: elegir esta cuenta como salida"
                        : undefined}
            onMouseDown={alPresionarCelda}
            onMouseEnter={(e) => {
                setHover(true);
                if (!id) return;
                if (tieneModificador(e)) armar();
                if (enlaceEnCurso && !esOrigen) setCuentaHover(referencia());
            }}
            onMouseMove={(e) => {
                if (!id) return;
                if (tieneModificador(e)) armar();
                else if (armado) desarmar();
            }}
            onMouseLeave={() => {
                setHover(false);
                if (id) desarmar();
            }}
        >
            {children}
        </TdMonto>
    );
};

export const TablaCuentas = ({
    cuentas = {},
    onAgregarFila,
    onEliminarFila,
    onActualizarNota,
    onActualizarDetalle,
    historial = [],
    onActualizarMonto,
    onActualizarNombre,
    onReordenarFilas,
    onCrearCuenta,
    onTraspasar,
}) => {
    const [ordenCategorias, setOrdenCategorias] = useState([
        "liquido",
        "inversiones",
        "inversionesLargo",
        "responsabilidades",
    ]);
    const [dragCat, setDragCat] = useState(null);
    const [dragFila, setDragFila] = useState(null);
    const [dragOverFila, setDragOverFila] = useState(null);
    const [notaAbierta, setNotaAbierta] = useState(null);
    const [detalleAbierto, setDetalleAbierto] = useState(null);
    const [traspasoAbierto, setTraspasoAbierto] = useState(null);
    const rendimientos = useMemo(() => resumenRendimientoPorCuenta(historial), [historial]);

    const cancelarEnlace = useEnlaceCuentasStore((estado) => estado.cancelar);
    const enlaceEnCurso = useEnlaceCuentasStore((estado) => Boolean(estado.cuentaOrigen));

    // El store es el mismo de /home: no se lleva un enlace a medias de una página a otra.
    useEffect(() => {
        cancelarEnlace();
        return cancelarEnlace;
    }, [cancelarEnlace]);

    useEffect(() => {
        if (!enlaceEnCurso) return undefined;
        const alPresionar = (e) => { if (e.key === "Escape") cancelarEnlace(); };
        window.addEventListener("keydown", alPresionar);
        return () => window.removeEventListener("keydown", alPresionar);
    }, [cancelarEnlace, enlaceEnCurso]);

    const totalCuentas = Object.values(cuentas || {}).reduce((suma, lista) => suma + (lista || []).length, 0);

    const maxFilas = Math.max(
        ...ordenCategorias.map((cat) => (cuentas[cat] || []).length),
        0
    );

    const getCuenta = (cat, idx) => (cuentas[cat] || [])[idx] || null;

    const handleDragStartCat = (cat) => setDragCat(cat);

    const handleDragOverCat = (e, cat) => {
        e.preventDefault();
        if (!dragCat || dragCat === cat) return;
        const nuevo = [...ordenCategorias];
        const from = nuevo.indexOf(dragCat);
        const to = nuevo.indexOf(cat);
        nuevo.splice(from, 1);
        nuevo.splice(to, 0, dragCat);
        setOrdenCategorias(nuevo);
        setDragCat(cat);
    };

    const handleDragStartFila = (e, idx) => {
        setDragFila(idx);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOverFila = (e, idx) => {
        e.preventDefault();
        if (dragFila === null || dragFila === idx) return;
        setDragOverFila(idx);
    };

    const handleDropFila = (e, idx) => {
        e.preventDefault();
        if (dragFila !== null && dragFila !== idx && onReordenarFilas) {
            onReordenarFilas(dragFila, idx);
        }
        setDragFila(null);
        setDragOverFila(null);
    };

    const totales = {};
    let capitalTotal = 0;
    ordenCategorias.forEach((cat) => {
        const suma = (cuentas[cat] || []).reduce((acc, c) => acc + Number(c.monto || 0), 0);
        totales[cat] = suma;
        if (cat === "responsabilidades") {
            capitalTotal -= suma;
        } else {
            capitalTotal += suma;
        }
    });

    const algunaCategoriaTieneFilas = maxFilas > 0;

    return (
        <TablaWrapper data-tour="ahorros-tabla">
            <Tabla>
                <Thead>
                    <tr>
                        <Th style={{ width: "30px" }}></Th>
                        {ordenCategorias.map((cat) => (
                            <ThCategoria
                                key={`${cat}-concepto`}
                                $color={COLORES_CATEGORIAS[cat]}
                                colSpan={2}
                                draggable
                                onDragStart={() => handleDragStartCat(cat)}
                                onDragOver={(e) => handleDragOverCat(e, cat)}
                                onDragEnd={() => setDragCat(null)}
                            >
                                <ThCategoriaContent>
                                    <GripIcon />
                                    {NOMBRES_CATEGORIAS[cat]}
                                </ThCategoriaContent>
                            </ThCategoria>
                        ))}
                        <Th style={{ width: "36px" }}></Th>
                    </tr>
                    <tr>
                        <Th></Th>
                        {ordenCategorias.map((cat) => (
                            <React.Fragment key={`${cat}-header`}>
                                <Th $align="left" style={{ fontSize: "11px", padding: "8px 10px", minWidth: "125px" }}>
                                    Cuenta · último movimiento
                                </Th>
                                <Th $align="right" style={{ fontSize: "11px", padding: "8px 10px", minWidth: "85px" }}>
                                    Monto
                                </Th>
                            </React.Fragment>
                        ))}
                        <Th></Th>
                    </tr>
                </Thead>
                <tbody>
                    {!algunaCategoriaTieneFilas ? (
                        <tr>
                            <Vacio colSpan={ordenCategorias.length * 2 + 2}>
                                Sin cuentas. Agrega una fila para comenzar.
                            </Vacio>
                        </tr>
                    ) : (
                        Array.from({ length: maxFilas }, (_, rowIdx) => (
                            <tr
                                key={rowIdx}
                                style={{
                                    background: dragOverFila === rowIdx ? "rgba(83, 59, 143, 0.06)" : undefined,
                                }}
                                onDragOver={(e) => handleDragOverFila(e, rowIdx)}
                                onDrop={(e) => handleDropFila(e, rowIdx)}
                            >
                                <NumFila
                                    draggable
                                    onDragStart={(e) => handleDragStartFila(e, rowIdx)}
                                    onDragEnd={() => { setDragFila(null); setDragOverFila(null); }}
                                >
                                    {rowIdx + 1}
                                </NumFila>
          {ordenCategorias.map((cat) => {
            const cuenta = getCuenta(cat, rowIdx);
            const ultimoMovimiento = cuenta
              ? obtenerUltimoMovimiento(cuenta.fechaUltimoMovimiento)
              : null;
            return (
              <React.Fragment key={`${cat}-${rowIdx}`}>
                <Td>
                  <CeldaConcepto>
                    <InputControlado
                      value={cuenta?.nombre || ""}
                      placeholder="—"
                      onCommit={(val) => {
                        if (cuenta) {
                          onActualizarNombre(cat, cuenta.id, val);
                        } else if (val && onCrearCuenta) {
                          onCrearCuenta(cat, val, 0);
                        }
                      }}
                    />
                    {ultimoMovimiento && (
                      <FilaEyebrow>
                        <FechaUltimoMovimiento
                          $sinMovimiento={ultimoMovimiento.sinMovimiento}
                          title={ultimoMovimiento.titulo}
                        >
                          {ultimoMovimiento.texto}
                        </FechaUltimoMovimiento>
                        <BtnNota
                          type="button"
                          $conNota={Boolean(cuenta.nota)}
                          title={cuenta.nota ? `Nota: ${markdownATextoPlano(cuenta.nota)}` : "Agregar nota"}
                          aria-label={cuenta.nota ? `Ver nota de ${cuenta.nombre || "la cuenta"}` : `Agregar nota a ${cuenta.nombre || "la cuenta"}`}
                          onClick={() => setNotaAbierta({
                            categoria: cat,
                            nombreCategoria: NOMBRES_CATEGORIAS[cat],
                            id: cuenta.id,
                            nombre: cuenta.nombre,
                            nota: cuenta.nota || "",
                          })}
                        >
                          {cuenta.nota ? <FaEye /> : <FaRegEye />}
                        </BtnNota>
                        {onActualizarDetalle && (
                          <BtnNota
                            type="button"
                            $conNota={Boolean(cuenta.descripcion || (cuenta.rendimientoEstimado ?? "") !== "")}
                            title={cuenta.descripcion ? `Detalle: ${cuenta.descripcion}` : "Editar detalle (descripción, rendimiento estimado)"}
                            aria-label={`Editar detalle de ${cuenta.nombre || "la cuenta"}`}
                            onClick={() => setDetalleAbierto({
                              categoria: cat,
                              nombreCategoria: NOMBRES_CATEGORIAS[cat],
                              id: cuenta.id,
                              nombre: cuenta.nombre,
                              descripcion: cuenta.descripcion || "",
                              rendimientoEstimado: cuenta.rendimientoEstimado ?? "",
                            })}
                          >
                            <FaPen />
                          </BtnNota>
                        )}
                        {Math.abs(rendimientos[cuenta.id]?.rendimiento || 0) >= 0.01 && (
                          <RendimientoCuenta
                            $negativo={rendimientos[cuenta.id].rendimiento < 0}
                            title={`Rendimiento del año: ${formatMoney(rendimientos[cuenta.id].rendimiento)}${rendimientos[cuenta.id].tasaAnual !== null ? ` · ~${rendimientos[cuenta.id].tasaAnual}% anual, compuesto sobre el saldo de cada día (meter o sacar dinero no la mueve)` : ""}`}
                          >
                            {rendimientos[cuenta.id].rendimiento > 0 ? "+" : ""}{formatoCompacto(rendimientos[cuenta.id].rendimiento)}
                            {rendimientos[cuenta.id].tasaAnual !== null && (
                              <TasaCuenta> · {rendimientos[cuenta.id].tasaAnual}%</TasaCuenta>
                            )}
                          </RendimientoCuenta>
                        )}
                      </FilaEyebrow>
                    )}
                  </CeldaConcepto>
                </Td>
                                            <CeldaMonto
                                                cuenta={cuenta}
                                                categoria={cat}
                                                onCompletarEnlace={onTraspasar
                                                    ? (origenId, destinoId) => setTraspasoAbierto({ origenId, destinoId })
                                                    : null}
                                            >
                                                <InputControlado
                                                    type="number" inputMode="decimal"
                                                    $isMonto
                                                    $align="right"
                                                    value={cuenta?.monto ?? ""}
                                                    placeholder="$0"
                                                    min="0"
                                                    step="0.01"
                                                    onCommit={(val) => {
                                                        if (cuenta) {
                                                            onActualizarMonto(cat, cuenta.id, val);
                                                        } else if (val && onCrearCuenta) {
                                                            onCrearCuenta(cat, "", val);
                                                        }
                                                    }}
                                                />
                                            </CeldaMonto>
                                        </React.Fragment>
                                    );
                                })}
                                <Td>
                                    {ordenCategorias.some((cat) => getCuenta(cat, rowIdx)) && (
                                        <BtnEliminar
                                            type="button"
                                            title={`Quitar fila ${rowIdx + 1}`}
                                            aria-label={`Quitar fila ${rowIdx + 1}`}
                                            onClick={() => onEliminarFila?.(
                                                rowIdx,
                                                ordenCategorias
                                                    .map((cat) => ({ cat, cuenta: getCuenta(cat, rowIdx) }))
                                                    .filter(({ cuenta }) => cuenta)
                                                    .map(({ cat, cuenta }) => ({
                                                        categoria: NOMBRES_CATEGORIAS[cat],
                                                        nombre: cuenta.nombre,
                                                        monto: Number(cuenta.monto || 0),
                                                    })),
                                            )}
                                        >
                                            <FaTrash />
                                        </BtnEliminar>
                                    )}
                                </Td>
                            </tr>
                        ))
                    )}
                    <FilaTotal>
                        <td></td>
                        {ordenCategorias.map((cat) => (
                            <React.Fragment key={`${cat}-total`}>
                                <td style={{ textAlign: "left", fontSize: "11px", fontWeight: 700, fontFamily: "inherit", letterSpacing: "0.5px" }}>
                                    {NOMBRES_CATEGORIAS[cat]}
                                </td>
                                <td style={{ textAlign: "right", fontSize: "13px" }}>
                                    {formatMoney(totales[cat])}
                                </td>
                            </React.Fragment>
                        ))}
                        <td style={{ textAlign: "right", fontWeight: 800, fontSize: "14px" }}>
                            {formatMoney(capitalTotal)}
                        </td>
                    </FilaTotal>
                </tbody>
            </Tabla>
            <AccionesTabla>
                <BtnAgregarFila onClick={onAgregarFila}>
                    <FaPlus /> Agregar fila
                </BtnAgregarFila>
                {onTraspasar && totalCuentas >= 2 && (
                    <BtnAgregarFila
                        type="button"
                        title="También: Shift + clic en el monto de una cuenta y luego en el de otra"
                        onClick={() => setTraspasoAbierto({ origenId: "", destinoId: "" })}
                    >
                        <FaExchangeAlt /> Traspaso entre cuentas
                    </BtnAgregarFila>
                )}
            </AccionesTabla>
            <ModalTraspaso
                inicial={traspasoAbierto}
                cuentas={cuentas}
                onClose={() => setTraspasoAbierto(null)}
                onConfirmar={onTraspasar}
            />
            <ModalDetalleCuenta
                cuenta={detalleAbierto}
                resumen={detalleAbierto ? rendimientos[detalleAbierto.id] : null}
                onClose={() => setDetalleAbierto(null)}
                onGuardar={onActualizarDetalle}
            />
            <ModalNotaCuenta
                cuenta={notaAbierta}
                onClose={() => setNotaAbierta(null)}
                onGuardar={onActualizarNota}
            />
        </TablaWrapper>
    );
};
