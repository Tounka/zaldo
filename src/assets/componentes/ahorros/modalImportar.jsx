import { useState } from "react";
import styled from "styled-components";
import { FaPaste, FaFileImport, FaTimes, FaCheck } from "react-icons/fa";
import { H2 } from "../genericos/titulos";

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
}) => {
    const [tab, setTab] = useState("cuentas");
    const [categoria, setCategoria] = useState("liquido");
    const [texto, setTexto] = useState("");

    const handlePegar = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setTexto(text);
        } catch {
            alert("No se pudo acceder al portapapeles. Usa Ctrl+V manualmente.");
        }
    };

    const handleImportar = () => {
        if (!texto.trim()) return;

        if (tab === "cuentas") {
            onImportarCuentas(texto, categoria);
        } else {
            onImportarHistorial(texto);
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
                </Tabs>

                {tab === "cuentas" ? (
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
                        Los datos se fusionarán con el historial existente.
                    </Instruccion>
                )}

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

                <BtnImportar onClick={handleImportar} disabled={!texto.trim()}>
                    <FaFileImport />
                    {tab === "cuentas"
                        ? `Importar ${texto.trim().split("\n").filter(Boolean).length} cuentas en ${CATEGORIAS_IMPORT.find((c) => c.key === categoria)?.label}`
                        : `Importar ${texto.trim().split("\n").filter(Boolean).length} registros históricos`}
                </BtnImportar>
            </Modal>
        </Overlay>
    );
};
