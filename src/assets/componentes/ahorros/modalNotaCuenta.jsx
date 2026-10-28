import { useEffect, useState } from "react";
import styled from "styled-components";
import { FaRegStickyNote, FaCheck } from "react-icons/fa";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "../Modales/ModalGenerico";
import { EditorNotasMarkdown } from "../genericos/editorNotasMarkdown";

const Cuerpo = styled(ContenedorFormularioGenerico)`
  gap: 14px;
  padding-top: 16px;
`;

const Botones = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

const Boton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 16px;
  border: 1.5px solid var(--colorMorado);
  border-radius: 9px;
  background: ${({ $secundario }) => ($secundario ? "#ffffff" : "var(--colorMorado)")};
  color: ${({ $secundario }) => ($secundario ? "var(--colorMorado)" : "#ffffff")};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ $secundario }) => ($secundario ? "rgba(83, 59, 143, 0.08)" : "#45307a")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

/**
 * `cuenta` = { categoria, nombreCategoria, id, nombre, nota } o null para cerrado.
 */
export const ModalNotaCuenta = ({ cuenta, onClose, onGuardar }) => {
  const [borrador, setBorrador] = useState("");

  useEffect(() => {
    if (cuenta) setBorrador(cuenta.nota || "");
  }, [cuenta]);

  const original = cuenta?.nota || "";
  const sinCambios = borrador === original;

  const guardar = () => {
    if (!cuenta) return;
    onGuardar?.(cuenta.categoria, cuenta.id, borrador.trim() ? borrador : "");
    onClose?.();
  };

  return (
    <ModalGenerico
      isOpen={Boolean(cuenta)}
      onClose={onClose}
      encabezado={
        <ModalEncabezado
          icon={<FaRegStickyNote />}
          title="Notas de la cuenta"
          description={`${cuenta?.nombre || "Sin nombre"} · ${cuenta?.nombreCategoria || ""}`}
        />
      }
    >
      {cuenta && (
        <Cuerpo>
          <EditorNotasMarkdown
            key={`${cuenta.categoria}-${cuenta.id}`}
            id={`nota-ahorro-${cuenta.id}`}
            value={borrador}
            onChange={setBorrador}
            etiqueta="Descripción · Markdown"
            textoVacio="Agregar una nota a esta cuenta"
            placeholder={"Ej.\n- Rinde 10% anual\n- **Retiro** solo en diciembre\n_Pendiente revisar comisión_"}
            editandoInicial={!original}
            alturaMinima={140}
            alturaMaxima={320}
          />
          <Botones>
            <Boton type="button" $secundario onClick={onClose}>
              Cancelar
            </Boton>
            <Boton type="button" onClick={guardar} disabled={sinCambios}>
              <FaCheck /> Guardar nota
            </Boton>
          </Botones>
        </Cuerpo>
      )}
    </ModalGenerico>
  );
};
