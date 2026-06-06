import React, { useState } from "react";
import styled from "styled-components";
import { FaPlus, FaTrash, FaGripVertical } from "react-icons/fa";

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
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
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
  font-size: 10px;
  color: rgba(83, 59, 143, 0.3);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const Td = styled.td`
  padding: 4px 6px;
  border-bottom: 1px solid rgba(83, 59, 143, 0.06);
  vertical-align: middle;
`;

const InputEditable = styled.input`
  width: 100%;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 13px;
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

const BtnEliminar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #d0d0d0;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  opacity: 0;

  tr:hover & {
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
    padding: 12px 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--colorMorado);
    border-top: 2px solid rgba(83, 59, 143, 0.15);
    border-bottom: none;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
`;

const BtnAgregarFila = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border: none;
  border-top: 1px solid rgba(83, 59, 143, 0.08);
  background: transparent;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }

  svg {
    font-size: 10px;
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

export const TablaCuentas = ({
    cuentas = {},
    onAgregarFila,
    onEliminar,
    onActualizarMonto,
    onActualizarNombre,
    onReordenarFilas,
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
        <TablaWrapper>
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
                                <Th $align="left" style={{ fontSize: "10px", padding: "6px 8px" }}>
                                    Concepto
                                </Th>
                                <Th $align="right" style={{ fontSize: "10px", padding: "6px 8px" }}>
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
                                    return (
                                        <React.Fragment key={`${cat}-${rowIdx}`}>
                                            <Td>
                                                <InputEditable
                                                    value={cuenta?.nombre || ""}
                                                    placeholder="—"
                                                    onChange={(e) => {
                                                        if (cuenta) {
                                                            onActualizarNombre(cat, cuenta.id, e.target.value);
                                                        }
                                                    }}
                                                />
                                            </Td>
                                            <Td>
                                                <InputEditable
                                                    type="number"
                                                    $isMonto
                                                    $align="right"
                                                    value={cuenta?.monto ?? ""}
                                                    placeholder="$0"
                                                    min="0"
                                                    step="0.01"
                                                    onChange={(e) => {
                                                        if (cuenta) {
                                                            onActualizarMonto(cat, cuenta.id, e.target.value);
                                                        }
                                                    }}
                                                />
                                            </Td>
                                        </React.Fragment>
                                    );
                                })}
                                <Td>
                                    {ordenCategorias.some((cat) => getCuenta(cat, rowIdx)) && (
                                        <BtnEliminar
                                            onClick={() => {
                                                const catConCuenta = ordenCategorias.find((cat) => getCuenta(cat, rowIdx));
                                                if (catConCuenta) {
                                                    const cuenta = getCuenta(catConCuenta, rowIdx);
                                                    if (cuenta) onEliminar(catConCuenta, cuenta.id);
                                                }
                                            }}
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
                                <td style={{ textAlign: "left", fontSize: "10px", fontWeight: 600 }}>
                                    {NOMBRES_CATEGORIAS[cat]}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                    {formatMoney(totales[cat])}
                                </td>
                            </React.Fragment>
                        ))}
                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                            {formatMoney(capitalTotal)}
                        </td>
                    </FilaTotal>
                </tbody>
            </Tabla>
            <BtnAgregarFila onClick={onAgregarFila}>
                <FaPlus /> Agregar fila
            </BtnAgregarFila>
        </TablaWrapper>
    );
};
