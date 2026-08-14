import { useMemo, useState } from "react";
import styled from "styled-components";
import { FaPaste, FaFileImport, FaTimes, FaCheck } from "react-icons/fa";
import { H2 } from "../genericos/titulos";
import Swal from "sweetalert2";
import { agruparHistorialPorAnio } from "../../funciones/firebase/ahorros";

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

const Modal = styled.div`
  background: white;
  width: 550px;
  max-width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BtnCerrar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(83, 59, 143, 0.06);
  color: #8a8a9a;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.12);
    color: var(--colorMorado);
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(83, 59, 143, 0.06);
  border-radius: 10px;
  padding: 4px;
`;

const Tab = styled.button`
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${({ $activo }) => ($activo ? "white" : "transparent")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#8a8a9a")};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: ${({ $activo }) => ($activo ? "0 2px 8px rgba(0,0,0,0.08)" : "none")};

  &:hover {
    color: var(--colorMorado);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  border: 2px dashed rgba(83, 59, 143, 0.2);
  border-radius: 12px;
  padding: 16px;
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1a1a2e;
  resize: vertical;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    border-style: solid;
  }

  &::placeholder {
    color: #c0c0c0;
    font-style: italic;
  }
`;

const Instruccion = styled.div`
  font-size: 12px;
  color: #8a8a9a;
  line-height: 1.6;

  strong {
    color: #1a1a2e;
  }
`;

const BtnImportar = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: var(--colorMorado);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s ease;

  &:hover {
    background: var(--colorMoradoSecundario);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Preview = styled.div`
  background: rgba(83, 59, 143, 0.04);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1a1a2e;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.6;
`;

const BtnPegar = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: white;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }
`;

const DesgloseAnios = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ChipAnio = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
  background: ${({ $actual }) => ($actual ? "rgba(83, 59, 143, 0.14)" : "rgba(204, 164, 59, 0.16)")};
  color: ${({ $actual }) => ($actual ? "var(--colorMorado)" : "#8a6d15")};
`;

const OpcionReparto = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  line-height: 1.5;
  color: #6a6a7a;

  input {
    margin-top: 2px;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--colorMorado);
  }

  label { cursor: pointer; }
`;

const FilaDiff = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: #f7f7fb;
  font-size: 12px;

  & + & { margin-top: 4px; }

  strong { font-weight: 700; color: #1a1a2e; }
  em { font-style: normal; color: #8a8a9a; font-size: 11px; }
`;

const MontoDiff = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $tipo }) => ($tipo === "nuevo" ? "#b4791a" : "var(--colorMorado)")};

  s { color: #a5a5b5; font-weight: 500; margin-right: 6px; }
`;

const ResumenDiff = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(83, 59, 143, 0.06);
  font-size: 12px;
  color: #4a4a5a;

  b { font-variant-numeric: tabular-nums; color: #1a1a2e; }
`;

const BloqueDiff = styled.div`
  max-height: 200px;
  overflow-y: auto;
`;

const CATEGORIAS_IMPORT = [
    { key: "liquido", label: "Líquido" },
    { key: "inversiones", label: "Inversiones" },
    { key: "inversionesLargo", label: "A Largo Plazo" },
    { key: "responsabilidades", label: "Responsabilidades" },
];

export const ModalImportar = ({
    isOpen,
    onClose,
    onImportarCuentas,
    onImportarHistorial,
    onPrevisualizarConciliacion,
    onAplicarConciliacion,
    anioSeleccionado,
}) => {
    const [tab, setTab] = useState("cuentas");
    const [categoria, setCategoria] = useState("liquido");
    const [texto, setTexto] = useState("");
    const [repartirPorAnio, setRepartirPorAnio] = useState(true);

    // ── Conciliación con el año anterior ──
    const anioOrigen = (Number(anioSeleccionado) || 0) - 1;
    const [plan, setPlan] = useState(null);
    const [revisando, setRevisando] = useState(false);
    const [incluirNuevas, setIncluirNuevas] = useState(true);
    const [fijarCantidadInicial, setFijarCantidadInicial] = useState(true);

    /*
     * El año de ahorro va de agosto a julio, así que un pegado largo casi siempre
     * abarca más de un año. Antes todo caía en el año seleccionado, lo que dejaba
     * la "Cantidad Inicial" y el ritmo diario sin sentido. Ahora se muestra el
     * desglose antes de importar.
     */
    const desglosePorAnio = useMemo(() => {
        if (tab !== "historial" || !texto.trim()) return [];
        const lineas = texto.trim().split("\n").filter((l) => l.trim());
        const agrupado = agruparHistorialPorAnio(lineas);
        return Object.entries(agrupado)
            .map(([anio, registros]) => ({ anio: Number(anio), cantidad: registros.length }))
            .sort((a, b) => a.anio - b.anio);
    }, [tab, texto]);

    const registrosDeOtrosAnios = desglosePorAnio
        .filter((item) => item.anio !== anioSeleccionado)
        .reduce((suma, item) => suma + item.cantidad, 0);

    const handlePegar = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setTexto(text);
        } catch {
            alert("No se pudo acceder al portapapeles. Usa Ctrl+V manualmente.");
        }
    };

    const dinero = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    const handleRevisarConciliacion = async () => {
        setRevisando(true);
        try {
            const resultado = await onPrevisualizarConciliacion(anioOrigen);
            if (!resultado) {
                await Swal.fire({
                    icon: "info",
                    title: `Sin datos de ${anioOrigen}`,
                    text: "No encontré un documento de ahorros para ese año.",
                });
                setPlan(null);
                return;
            }
            setPlan(resultado);
        } finally {
            setRevisando(false);
        }
    };

    /*
     * Confirmación intermedia: antes de escribir se muestra exactamente cuántas
     * cuentas cambian y cómo queda el capital, porque esto pisa los montos del
     * año en curso.
     */
    const handleAplicarConciliacion = async () => {
        if (!plan) return;

        const totalNuevas = incluirNuevas ? plan.agregar.length : 0;
        const capitalResultante = plan.totalesOrigen.capitalTotal
            + plan.soloEnDestino.reduce((suma, cuenta) => (
                cuenta.categoria === "responsabilidades" ? suma - cuenta.monto : suma + cuenta.monto
            ), 0)
            - (incluirNuevas ? 0 : plan.agregar.reduce((suma, item) => (
                item.categoria === "responsabilidades" ? suma - item.cuenta.monto : suma + item.cuenta.monto
            ), 0));

        const resultado = await Swal.fire({
            title: `¿Traer los montos de ${anioOrigen} a ${anioSeleccionado}?`,
            html: `
                <div style="text-align:left;font-size:14px;line-height:1.7">
                    <b>${plan.actualizar.length}</b> cuenta(s) cambian de monto<br/>
                    <b>${totalNuevas}</b> cuenta(s) se agregan<br/>
                    <b>${plan.igual.length}</b> quedan igual<br/>
                    <b>${plan.soloEnDestino.length}</b> solo existen en ${anioSeleccionado} y no se tocan
                    <hr style="margin:10px 0;border:none;border-top:1px solid #eee"/>
                    Capital: <b>${dinero(plan.totalesDestino.capitalTotal)}</b> →
                    <b>${dinero(capitalResultante)}</b><br/>
                    <span style="color:#8a8a9a;font-size:12px">
                        ${fijarCantidadInicial
                            ? "La Cantidad Inicial del año queda fijada en ese capital."
                            : "La Cantidad Inicial no se toca."}
                    </span>
                </div>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, traer montos",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#533b8f",
            cancelButtonColor: "#aaa",
        });

        if (!resultado.isConfirmed) return;

        onAplicarConciliacion(plan, { incluirNuevas, fijarCantidadInicial });
        setPlan(null);
        onClose();
    };

    const handleImportar = () => {
        if (!texto.trim()) return;

        if (tab === "cuentas") {
            onImportarCuentas(texto, categoria);
        } else {
            onImportarHistorial(texto, repartirPorAnio && registrosDeOtrosAnios > 0);
        }

        setTexto("");
        onClose();
    };

    const lineasPreview = texto.trim().split("\n").filter((l) => l.trim()).slice(0, 5);

    return (
        <Overlay $isOpen={isOpen} onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Header>
                    <H2 size="18px" color="var(--colorMorado)">
                        Importar Datos
                    </H2>
                    <BtnCerrar onClick={onClose}>
                        <FaTimes />
                    </BtnCerrar>
                </Header>

                <Tabs>
                    <Tab $activo={tab === "cuentas"} onClick={() => setTab("cuentas")}>
                        Cuentas
                    </Tab>
                    <Tab $activo={tab === "historial"} onClick={() => setTab("historial")}>
                        Histórico
                    </Tab>
                    <Tab $activo={tab === "conciliar"} onClick={() => setTab("conciliar")}>
                        Conciliar
                    </Tab>
                </Tabs>

                {tab === "conciliar" ? (
                    <>
                        <Instruccion>
                            Trae a <strong>{anioSeleccionado}</strong> los montos de cierre de{" "}
                            <strong>{anioOrigen}</strong>. Útil cuando el año nuevo se creó copiando
                            el anterior y después seguiste editando el viejo.
                            <br />
                            Solo se tocan las <strong>cantidades</strong>: el histórico se queda como está.
                        </Instruccion>

                        <BtnPegar type="button" onClick={handleRevisarConciliacion} disabled={revisando}>
                            <FaCheck /> {revisando ? "Revisando..." : `Revisar diferencias con ${anioOrigen}`}
                        </BtnPegar>

                        {plan && (
                            <>
                                <ResumenDiff>
                                    <span>Capital en <b>{anioOrigen}</b>: <b>{dinero(plan.totalesOrigen.capitalTotal)}</b></span>
                                    <span>Capital en <b>{anioSeleccionado}</b>: <b>{dinero(plan.totalesDestino.capitalTotal)}</b></span>
                                </ResumenDiff>

                                {plan.actualizar.length === 0 && plan.agregar.length === 0 ? (
                                    <Instruccion>
                                        <strong>No hay diferencias.</strong> Los montos de {anioSeleccionado} ya
                                        coinciden con el cierre de {anioOrigen}.
                                    </Instruccion>
                                ) : (
                                    <BloqueDiff>
                                        {plan.actualizar.map((item) => (
                                            <FilaDiff key={`upd_${item.id}`}>
                                                <span>
                                                    <strong>{item.nombre}</strong> <em>{item.categoria}</em>
                                                </span>
                                                <MontoDiff>
                                                    <s>{dinero(item.montoAnterior)}</s>
                                                    {dinero(item.montoNuevo)}
                                                </MontoDiff>
                                            </FilaDiff>
                                        ))}
                                        {incluirNuevas && plan.agregar.map((item, indice) => (
                                            <FilaDiff key={`new_${item.cuenta.id || indice}`}>
                                                <span>
                                                    <strong>{item.cuenta.nombre || "Sin nombre"}</strong>{" "}
                                                    <em>{item.categoria} · nueva</em>
                                                </span>
                                                <MontoDiff $tipo="nuevo">{dinero(item.cuenta.monto)}</MontoDiff>
                                            </FilaDiff>
                                        ))}
                                    </BloqueDiff>
                                )}

                                {plan.agregar.length > 0 && (
                                    <OpcionReparto>
                                        <input
                                            type="checkbox"
                                            id="conciliar-nuevas"
                                            checked={incluirNuevas}
                                            onChange={(e) => setIncluirNuevas(e.target.checked)}
                                        />
                                        <label htmlFor="conciliar-nuevas">
                                            Agregar las {plan.agregar.length} cuenta(s) que existen en {anioOrigen}
                                            {" "}y faltan en {anioSeleccionado}.
                                        </label>
                                    </OpcionReparto>
                                )}

                                <OpcionReparto>
                                    <input
                                        type="checkbox"
                                        id="conciliar-apertura"
                                        checked={fijarCantidadInicial}
                                        onChange={(e) => setFijarCantidadInicial(e.target.checked)}
                                    />
                                    <label htmlFor="conciliar-apertura">
                                        Fijar la <strong>Cantidad Inicial</strong> de {anioSeleccionado} en el
                                        cierre de {anioOrigen}. Es lo correcto: lo que este año arranca es lo que
                                        el anterior cerró. Repara además la línea base si ya se había movido.
                                    </label>
                                </OpcionReparto>

                                {plan.soloEnDestino.length > 0 && (
                                    <Instruccion>
                                        {plan.soloEnDestino.length} cuenta(s) existen solo en {anioSeleccionado}
                                        {" "}y no se modifican.
                                    </Instruccion>
                                )}

                                <BtnImportar
                                    onClick={handleAplicarConciliacion}
                                    disabled={plan.actualizar.length === 0 && (!incluirNuevas || plan.agregar.length === 0) && !fijarCantidadInicial}
                                >
                                    <FaFileImport /> Traer montos de {anioOrigen}
                                </BtnImportar>
                            </>
                        )}
                    </>
                ) : tab === "cuentas" ? (
                    <>
                        <Instruccion>
                            Pega los datos desde Excel. Formato: <strong>Concepto [TAB] Monto</strong>
                            <br />
                            Una cuenta por línea. Los duplicados se actualizarán.
                        </Instruccion>

                        <Tabs>
                            {CATEGORIAS_IMPORT.map((c) => (
                                <Tab
                                    key={c.key}
                                    $activo={categoria === c.key}
                                    onClick={() => setCategoria(c.key)}
                                >
                                    {c.label}
                                </Tab>
                            ))}
                        </Tabs>
                    </>
                ) : (
                    <Instruccion>
                        Pega los datos históricos desde Excel. Formato: <strong>Monto [TAB] Fecha</strong>
                        <br />
                        Ejemplo: <strong>108121.43 [TAB] 2/11/2025</strong>
                        <br />
                        Cada registro se guarda en su año de ahorro según su fecha (el año corre de agosto a julio).
                    </Instruccion>
                )}

                {tab !== "conciliar" && (
                <>
                <div style={{ display: "flex", gap: "8px" }}>
                    <BtnPegar onClick={handlePegar}>
                        <FaPaste /> Pegar desde portapapeles
                    </BtnPegar>
                </div>

                <TextArea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder={
                        tab === "cuentas"
                            ? "Klar 1\t$1,538.00\nUala\t$0.00\nDidi\t$5,059.00"
                            : "108121.43\t2/11/2025\n108186.96\t3/11/2025"
                    }
                />

                {texto.trim() && (
                    <>
                        <Instruccion>
                            <strong>Vista previa ({texto.trim().split("\n").length} líneas):</strong>
                        </Instruccion>
                        <Preview>
                            {lineasPreview.join("\n")}
                            {texto.trim().split("\n").length > 5 && "\n..."}
                        </Preview>
                    </>
                )}

                {desglosePorAnio.length > 0 && (
                    <>
                        <Instruccion>
                            <strong>Años de ahorro detectados:</strong>
                        </Instruccion>
                        <DesgloseAnios>
                            {desglosePorAnio.map((item) => (
                                <ChipAnio key={item.anio} $actual={item.anio === anioSeleccionado}>
                                    {item.anio}: {item.cantidad} registro{item.cantidad === 1 ? "" : "s"}
                                    {item.anio === anioSeleccionado ? " (año actual)" : ""}
                                </ChipAnio>
                            ))}
                        </DesgloseAnios>
                        {registrosDeOtrosAnios > 0 && (
                            <OpcionReparto>
                                <input
                                    type="checkbox"
                                    id="repartir-anios"
                                    checked={repartirPorAnio}
                                    onChange={(e) => setRepartirPorAnio(e.target.checked)}
                                />
                                <label htmlFor="repartir-anios">
                                    Guardar cada registro en su año ({registrosDeOtrosAnios} caen fuera del año
                                    seleccionado). Si lo desmarcas, esos registros se descartan.
                                </label>
                            </OpcionReparto>
                        )}
                    </>
                )}

                <BtnImportar onClick={handleImportar} disabled={!texto.trim()}>
                    <FaFileImport />
                    {tab === "cuentas"
                        ? `Importar ${texto.trim().split("\n").filter(Boolean).length} cuentas en ${CATEGORIAS_IMPORT.find((c) => c.key === categoria)?.label}`
                        : `Importar ${texto.trim().split("\n").filter(Boolean).length} registros históricos`}
                </BtnImportar>
                </>
                )}
            </Modal>
        </Overlay>
    );
};
