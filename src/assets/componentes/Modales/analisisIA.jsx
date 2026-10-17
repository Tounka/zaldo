import styled from "styled-components";
import { useEffect, useRef, useState } from "react";
import { FaChartLine, FaDownload, FaExpand, FaRedo } from "react-icons/fa";
import { useModalStore } from "../../stores/useModalStore";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "./ModalGenerico";
import { renderizarPresentacion } from "../../funciones/ia/analisis/render.js";
import {
  ErrorAnalisisIA,
  LIMITE_CONTEXTO_ANALISIS,
  calcularMetricasAnalisis,
  solicitarAnalisisIA,
} from "../../funciones/ia/solicitarAnalisis";
import cssDeck from "../../funciones/ia/analisis/plantilla/deck.css?raw";
import jsDeck from "../../funciones/ia/analisis/plantilla/deck.js?raw";
import jsGraficas from "../../funciones/ia/analisis/plantilla/graficas.js?raw";

/*
 * Análisis con IA: la app lee tus datos de Firestore, calcula las métricas del
 * tema aquí mismo y el Worker le pide a OpenAI (esfuerzo alto) que redacte una
 * presentación con ellas. El diseño es la plantilla de scripts/presentaciones:
 * la IA solo decide qué decir. La presentación se pinta en un iframe aislado
 * (sandbox sin same-origin) y se puede descargar como HTML.
 */

const PLANTILLA = { css: cssDeck, deck: jsDeck, graficas: jsGraficas };

const TEMAS = [
  { valor: "gastos", etiqueta: "Gastos", descripcion: "Propio vs. terceros, tarjetas y lo que te deben" },
  { valor: "ingresos", etiqueta: "Ingresos", descripcion: "Fuentes, estabilidad y proyección" },
  { valor: "ahorros", etiqueta: "Ahorros", descripcion: "Capital, origen del ahorro y escenarios" },
];

const ETAPAS = {
  leyendo: "Leyendo tus datos y calculando métricas…",
  analizando: "La IA está redactando el análisis. Suele tardar entre 1 y 3 minutos.",
};

// El contexto es una comodidad por dispositivo: si no hay almacenamiento, se ignora.
const claveContexto = (tema) => `zaldo-analisis-contexto-${tema}`;
const leerContextoGuardado = (tema) => {
  try {
    return localStorage.getItem(claveContexto(tema)) || "";
  } catch {
    return "";
  }
};
const guardarContexto = (tema, texto) => {
  try {
    localStorage.setItem(claveContexto(tema), texto);
  } catch {
    /* sin almacenamiento: se ignora */
  }
};

const Contenido = styled(ContenedorFormularioGenerico)`
  padding-bottom: 24px;
`;

const GrupoTemas = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const BotonTema = styled.button`
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.2)")};
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.08)" : "white")};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 14px;
    color: var(--colorMorado);
  }

  span {
    font-size: 12px;
    color: rgba(26, 26, 46, 0.7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Etiqueta = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
`;

const AreaContexto = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  font: inherit;
  font-size: 14px;
  color: #1a1a2e;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
  }
`;

const FilaInferior = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const Casilla = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(26, 26, 46, 0.75);
`;

const Contador = styled.span`
  font-size: 12px;
  color: ${({ $excedido }) => ($excedido ? "#c0392b" : "rgba(26, 26, 46, 0.55)")};
`;

const Boton = styled.button`
  background: ${({ $secundario }) => ($secundario ? "rgba(83, 59, 143, 0.08)" : "var(--colorMorado)")};
  color: ${({ $secundario }) => ($secundario ? "var(--colorMorado)" : "white")};
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: ${({ $secundario }) => ($secundario ? "rgba(83, 59, 143, 0.14)" : "var(--colorMoradoSecundario)")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Aviso = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  background: ${({ $error }) => ($error ? "rgba(192, 57, 43, 0.08)" : "rgba(83, 59, 143, 0.06)")};
  color: ${({ $error }) => ($error ? "#c0392b" : "#1a1a2e")};
`;

const MarcoPresentacion = styled.iframe`
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  background: #f4f1ea;
`;

const Acciones = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const ModalAnalisisIA = () => {
  const { isOpenAnalisisIA, setIsOpenAnalisisIA } = useModalStore();

  const [tema, setTema] = useState("gastos");
  const [contexto, setContexto] = useState(() => leerContextoGuardado("gastos"));
  const [anonimizar, setAnonimizar] = useState(true);
  const [etapa, setEtapa] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState("");
  // Último resultado por tema: se conserva al cerrar el modal o cambiar de tema.
  const [resultados, setResultados] = useState({});
  const marcoRef = useRef(null);

  const ocupado = Boolean(etapa);
  const excedido = contexto.length > LIMITE_CONTEXTO_ANALISIS;
  const resultado = resultados[tema];

  useEffect(() => {
    if (etapa !== "analizando") return undefined;
    setSegundos(0);
    const intervalo = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(intervalo);
  }, [etapa]);

  const cambiarTema = (nuevo) => {
    setTema(nuevo);
    setContexto(leerContextoGuardado(nuevo));
    setError("");
  };

  const generar = async () => {
    if (ocupado || excedido) return;
    setError("");
    guardarContexto(tema, contexto);

    try {
      setEtapa("leyendo");
      const metricas = await calcularMetricasAnalisis(tema);
      setEtapa("analizando");
      const presentacion = await solicitarAnalisisIA({ tema, metricas, contexto, anonimizar });
      setResultados((previos) => ({
        ...previos,
        [tema]: {
          html: renderizarPresentacion(presentacion, PLANTILLA),
          titulo: presentacion.titulo,
          fecha: new Date().toISOString().slice(0, 10),
        },
      }));
    } catch (errorAnalisis) {
      setError(errorAnalisis instanceof ErrorAnalisisIA
        ? errorAnalisis.message
        : "Ocurrió un error inesperado con el análisis con IA.");
    } finally {
      setEtapa(null);
    }
  };

  const descargar = () => {
    if (!resultado) return;
    const url = URL.createObjectURL(new Blob([resultado.html], { type: "text/html;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `zaldo-analisis-${tema}-${resultado.fecha}.html`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  const pantallaCompleta = () => {
    marcoRef.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <ModalGenerico isOpen={isOpenAnalisisIA} onClose={() => setIsOpenAnalisisIA(false)} wide>
      <Contenido>
        <ModalEncabezado
          icon={<FaChartLine />}
          title="Análisis con IA"
          description="Una presentación con hallazgos y siguientes pasos. Los montos se calculan aquí; la IA solo redacta."
        />

        <GrupoTemas role="radiogroup" aria-label="Tema del análisis">
          {TEMAS.map((opcion) => (
            <BotonTema
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={tema === opcion.valor}
              $activo={tema === opcion.valor}
              onClick={() => cambiarTema(opcion.valor)}
              disabled={ocupado}
            >
              <strong>{opcion.etiqueta}</strong>
              <span>{opcion.descripcion}</span>
            </BotonTema>
          ))}
        </GrupoTemas>

        <Etiqueta htmlFor="contexto-analisis">Contexto (opcional)</Etiqueta>
        <AreaContexto
          id="contexto-analisis"
          value={contexto}
          onChange={(evento) => setContexto(evento.target.value)}
          placeholder="Ej. este mes cubrí un gasto médico de un familiar; mi tarjeta principal da 3% de cashback"
          disabled={ocupado}
        />

        <FilaInferior>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Casilla>
              <input
                type="checkbox"
                checked={anonimizar}
                onChange={(evento) => setAnonimizar(evento.target.checked)}
                disabled={ocupado}
              />
              Ocultar nombres de cuentas familiares a la IA
            </Casilla>
            <Contador $excedido={excedido}>{contexto.length}/{LIMITE_CONTEXTO_ANALISIS}</Contador>
          </div>
          <Boton type="button" onClick={generar} disabled={ocupado || excedido}>
            {resultado ? <FaRedo /> : <FaChartLine />}
            {ocupado ? "Generando..." : resultado ? "Generar de nuevo" : "Generar análisis"}
          </Boton>
        </FilaInferior>

        {etapa && (
          <Aviso role="status">
            {ETAPAS[etapa]}
            {etapa === "analizando" && ` (${segundos} s)`}
          </Aviso>
        )}

        {error && <Aviso $error>{error}</Aviso>}

        {resultado && !ocupado && (
          <>
            <MarcoPresentacion
              ref={marcoRef}
              title={resultado.titulo}
              srcDoc={resultado.html}
              sandbox="allow-scripts"
              allow="fullscreen"
            />
            <Acciones>
              <Boton type="button" onClick={pantallaCompleta}>
                <FaExpand /> Pantalla completa
              </Boton>
              <Boton type="button" $secundario onClick={descargar}>
                <FaDownload /> Descargar HTML
              </Boton>
            </Acciones>
          </>
        )}
      </Contenido>
    </ModalGenerico>
  );
};
