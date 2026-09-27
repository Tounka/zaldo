import { useCallback, useState } from "react";
import styled from "styled-components";
import { FaCheck } from "react-icons/fa";

/*
 * Años ignorados por gráfica. Algunos años pueden traer información
 * contaminada (importaciones a medias, cuentas duplicadas…), así que cada
 * gráfica recuerda por separado qué años se excluyen.
 *
 * Es una preferencia de vista, no un dato: vive en el navegador y, si el
 * almacenamiento no está disponible, la vista funciona igual con todos los años.
 */
const CLAVE_STORAGE = "zaldo-ahorros-anual-excluidos";

const leerTodo = () => {
    try {
        const crudo = localStorage.getItem(CLAVE_STORAGE);
        const valor = crudo ? JSON.parse(crudo) : {};
        return valor && typeof valor === "object" ? valor : {};
    } catch {
        return {};
    }
};

const escribirGrafica = (idGrafica, anios) => {
    try {
        const todo = leerTodo();
        if (anios.length) todo[idGrafica] = anios;
        else delete todo[idGrafica];
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(todo));
    } catch {
        /* Sin almacenamiento: la exclusión dura solo esta visita. */
    }
};

export const useAniosExcluidos = (idGrafica) => {
    const [excluidos, setExcluidos] = useState(
        () => new Set((leerTodo()[idGrafica] || []).map(Number))
    );

    const alternar = useCallback((anio) => {
        setExcluidos((prev) => {
            const siguiente = new Set(prev);
            if (siguiente.has(anio)) siguiente.delete(anio);
            else siguiente.add(anio);
            escribirGrafica(idGrafica, [...siguiente].sort());
            return siguiente;
        });
    }, [idGrafica]);

    return [excluidos, alternar];
};

const Fila = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.28)" : "rgba(83, 59, 143, 0.14)")};
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.07)" : "transparent")};
  color: ${({ $activo }) => ($activo ? "#1a1a2e" : "#8a8a9a")};
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-decoration: ${({ $activo }) => ($activo ? "none" : "line-through")};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: var(--colorMorado);
  }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }

  .punto {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color || "var(--colorMorado)"};
    opacity: ${({ $activo }) => ($activo ? 1 : 0.35)};
  }

  svg {
    font-size: 9px;
    color: var(--colorMorado);
  }
`;

/**
 * Chips de años. `colores` es opcional: cuando la gráfica pinta un color por
 * año, el chip lo muestra y hace de leyenda.
 */
export const FiltroAnios = ({ anios, excluidos, onAlternar, colores }) => (
    <Fila role="group" aria-label="Años incluidos en la gráfica">
        {anios.map((anio) => {
            const activo = !excluidos.has(anio);
            return (
                <Chip
                    key={anio}
                    type="button"
                    $activo={activo}
                    $color={colores?.[anio]}
                    aria-pressed={activo}
                    title={activo ? `Ignorar ${anio} en esta gráfica` : `Incluir ${anio} en esta gráfica`}
                    onClick={() => onAlternar(anio)}
                >
                    {colores ? <span className="punto" /> : activo && <FaCheck />}
                    {anio}
                </Chip>
            );
        })}
    </Fila>
);
