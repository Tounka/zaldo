import styled from "styled-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaRobot, FaSearch, FaUserShield } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { obtenerUsuarios } from "../../funciones/firebase/usuario";
import {
  DURACIONES_ACCESO,
  finDelDia,
  obtenerAccesosIA,
  otorgarAccesoIA,
  revocarAccesoIA,
  sumarDias,
} from "../../funciones/firebase/accesosIA";
import { avisarError, avisarExito, confirmarEliminacion } from "../../funciones/utils/avisos";
import { fechaLocalISO } from "../../funciones/utils/fechas";
import { PanelConsumoIA } from "./PanelConsumoIA";

/*
 * Super admin: da accesos de prueba a la IA por un tiempo. La ruta solo se
 * muestra con el claim `superadmin` del token (usuario.js), pero lo que de
 * verdad protege es Firestore: solo un super admin puede escribir accesosIA.
 */

const Pagina = styled.main`
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 8px 0 36px;
  color: #25212d;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--colorMorado);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Titulo = styled.h1`
  margin: 4px 0 0;
  color: #282132;
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
`;

const Subtitulo = styled.p`
  margin: 8px 0 18px;
  color: #6c6675;
  font-size: 13px;
  line-height: 1.5;
`;

const Panel = styled.section`
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 16px;
  background: white;
  box-shadow: 0 12px 30px rgba(37, 24, 62, 0.06);
  padding: 18px;
`;

const Buscador = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 11px;
  color: #8a8494;

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    font: inherit;
    font-size: 13px;
    color: #25212d;
    background: transparent;
  }
`;

const Resumen = styled.p`
  margin: 12px 2px 4px;
  color: #716b79;
  font-size: 11px;
`;

const Lista = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Fila = styled.li`
  border: 1px solid ${({ $abierta }) => ($abierta ? "rgba(83, 59, 143, 0.3)" : "rgba(83, 59, 143, 0.12)")};
  border-radius: 13px;
  background: ${({ $abierta }) => ($abierta ? "#faf8ff" : "#ffffff")};
  overflow: hidden;
`;

const Cabecera = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: -2px;
  }
`;

const Persona = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    color: #322b3d;
    font-size: 13px;
    font-weight: 800;
  }

  small {
    color: #716b79;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const COLORES_ESTADO = {
  activo: { fondo: "rgba(40, 122, 71, 0.1)", texto: "#287a47" },
  porVencer: { fondo: "rgba(196, 120, 0, 0.12)", texto: "#9a5b00" },
  vencido: { fondo: "rgba(180, 35, 24, 0.08)", texto: "#a42318" },
  sinAcceso: { fondo: "#f1eff4", texto: "#6c6675" },
};

const Estado = styled.span`
  flex-shrink: 0;
  padding: 4px 9px;
  border-radius: 999px;
  background: ${({ $tipo }) => COLORES_ESTADO[$tipo].fondo};
  color: ${({ $tipo }) => COLORES_ESTADO[$tipo].texto};
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`;

const Detalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 14px 14px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button`
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.25)")};
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "var(--colorMorado)")};
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const Campo = styled.input`
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid rgba(83, 59, 143, 0.25);
  border-radius: 10px;
  font: inherit;
  font-size: 12px;
  color: #25212d;
  background: #ffffff;
`;

const Acciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;

  p {
    margin: 0;
    color: #716b79;
    font-size: 11px;
  }
`;

const Botones = styled.div`
  display: flex;
  gap: 8px;
`;

const Boton = styled.button`
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid ${({ $peligro }) => ($peligro ? "rgba(180, 35, 24, 0.3)" : "var(--colorMorado)")};
  border-radius: 10px;
  background: ${({ $peligro }) => ($peligro ? "#ffffff" : "var(--colorMorado)")};
  color: ${({ $peligro }) => ($peligro ? "#a42318" : "#ffffff")};
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &:focus-visible {
    outline: 2px solid var(--colorMorado);
    outline-offset: 2px;
  }
`;

const Nota = styled.p`
  margin: 14px 2px 0;
  color: #8a8494;
  font-size: 11px;
  line-height: 1.5;
`;

const DIAS_AVISO_VENCIMIENTO = 5;
const UN_DIA_MS = 864e5;

const fechaLegible = (fecha) => fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

const estadoAcceso = (acceso, ahora) => {
  if (!acceso?.hasta) return { tipo: "sinAcceso", texto: "Sin acceso" };
  const dias = Math.ceil((acceso.hasta - ahora) / UN_DIA_MS);
  if (dias <= 0) return { tipo: "vencido", texto: `Venció el ${fechaLegible(acceso.hasta)}` };
  return {
    tipo: dias <= DIAS_AVISO_VENCIMIENTO ? "porVencer" : "activo",
    texto: `Hasta ${fechaLegible(acceso.hasta)} · ${dias} día${dias === 1 ? "" : "s"}`,
  };
};

const nombreDe = (persona) => [persona.nombres, persona.apellidos].filter(Boolean).join(" ") || "Sin nombre";

/* Lo que se edita en la fila abierta: duración elegida (o fecha) y nota. */
const EDICION_INICIAL = { duracion: "30", fecha: "", nota: "" };

const FilaUsuario = ({ persona, acceso, abierta, onAlternar, onOtorgar, onRevocar, guardando }) => {
  const [edicion, setEdicion] = useState({ ...EDICION_INICIAL, nota: acceso?.nota || "" });
  const ahora = Date.now();
  const estado = estadoAcceso(acceso, ahora);
  const vigente = estado.tipo === "activo" || estado.tipo === "porVencer";

  // Extender suma a partir de la fecha actual de vencimiento, no de hoy.
  const nuevaFecha = useMemo(() => {
    if (edicion.duracion === "fecha") return edicion.fecha ? finDelDia(edicion.fecha) : null;
    const dias = DURACIONES_ACCESO.find((duracion) => duracion.valor === edicion.duracion)?.dias || 30;
    return sumarDias(dias, vigente ? acceso.hasta : new Date());
  }, [acceso, edicion, vigente]);

  return (
    <Fila $abierta={abierta}>
      <Cabecera type="button" onClick={onAlternar} aria-expanded={abierta}>
        <Persona>
          <strong>{nombreDe(persona)}</strong>
          <small>{persona.email || persona.correo || persona.uid}</small>
        </Persona>
        <Estado $tipo={estado.tipo}>{estado.texto}</Estado>
      </Cabecera>

      {abierta && (
        <Detalle>
          <Chips role="group" aria-label="Duración del acceso">
            {DURACIONES_ACCESO.map((duracion) => (
              <Chip
                key={duracion.valor}
                type="button"
                $activo={edicion.duracion === duracion.valor}
                onClick={() => setEdicion((previa) => ({ ...previa, duracion: duracion.valor }))}
              >
                {vigente ? `+${duracion.etiqueta}` : duracion.etiqueta}
              </Chip>
            ))}
            <Chip
              type="button"
              $activo={edicion.duracion === "fecha"}
              onClick={() => setEdicion((previa) => ({ ...previa, duracion: "fecha" }))}
            >
              Hasta una fecha
            </Chip>
            {edicion.duracion === "fecha" && (
              <Campo
                type="date"
                aria-label="Fecha de vencimiento"
                min={fechaLocalISO(sumarDias(1))}
                value={edicion.fecha}
                onChange={(evento) => setEdicion((previa) => ({ ...previa, fecha: evento.target.value }))}
              />
            )}
          </Chips>

          <Campo
            type="text"
            maxLength={120}
            placeholder="Nota (opcional): por qué o para qué es la prueba"
            value={edicion.nota}
            onChange={(evento) => setEdicion((previa) => ({ ...previa, nota: evento.target.value }))}
          />

          <Acciones>
            <p>{nuevaFecha ? `Tendrá acceso hasta el ${fechaLegible(nuevaFecha)}.` : "Elige la fecha."}</p>
            <Botones>
              {acceso && (
                <Boton type="button" $peligro disabled={guardando} onClick={onRevocar}>
                  Quitar acceso
                </Boton>
              )}
              <Boton
                type="button"
                disabled={guardando || !nuevaFecha || nuevaFecha <= new Date()}
                onClick={() => onOtorgar({ hasta: nuevaFecha, nota: edicion.nota })}
              >
                {vigente ? "Extender" : "Dar acceso"}
              </Boton>
            </Botones>
          </Acciones>
        </Detalle>
      )}
    </Fila>
  );
};

export const PaginaSuperAdmin = () => {
  const usuario = useAppStore((estado) => estado.usuario);
  const [personas, setPersonas] = useState([]);
  const [accesos, setAccesos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const esSuperAdmin = usuario?.superadmin === true;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, mapa] = await Promise.all([obtenerUsuarios(), obtenerAccesosIA()]);
      setPersonas(lista);
      setAccesos(mapa);
    } catch (error) {
      avisarError("No se pudieron cargar los accesos.", error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esSuperAdmin) cargar();
  }, [cargar, esSuperAdmin]);

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const ahora = Date.now();
    return personas
      .filter((persona) => persona.uid !== usuario?.uid)
      .filter((persona) => !texto || `${nombreDe(persona)} ${persona.email || persona.correo || ""}`.toLowerCase().includes(texto))
      // Primero quien tiene o tuvo acceso, luego por nombre.
      .sort((a, b) => Number(Boolean(accesos[b.uid])) - Number(Boolean(accesos[a.uid]))
        || (accesos[b.uid]?.hasta > ahora) - (accesos[a.uid]?.hasta > ahora)
        || nombreDe(a).localeCompare(nombreDe(b)));
  }, [accesos, busqueda, personas, usuario?.uid]);

  const vigentes = Object.values(accesos).filter((acceso) => acceso.hasta > Date.now()).length;

  // Mientras se rehidrata la sesión no se decide nada.
  if (usuario === undefined) return null;
  if (!esSuperAdmin) return <Navigate to="/home" replace />;

  const otorgar = async (persona, { hasta, nota }) => {
    setGuardando(true);
    try {
      await otorgarAccesoIA({ usuario: persona, hasta, nota, otorgadoPor: usuario.uid });
      setAccesos((previos) => ({ ...previos, [persona.uid]: { ...previos[persona.uid], hasta, nota, actualizado: new Date() } }));
      avisarExito(`${nombreDe(persona)} tiene acceso a la IA hasta el ${fechaLegible(hasta)}.`);
    } catch (error) {
      avisarError("No se pudo guardar el acceso.", error);
    } finally {
      setGuardando(false);
    }
  };

  const revocar = async (persona) => {
    const confirmado = await confirmarEliminacion({
      titulo: "¿Quitar el acceso a la IA?",
      texto: `${nombreDe(persona)} dejará de poder usar el asistente en menos de un minuto.`,
      textoConfirmar: "Sí, quitar",
    });
    if (!confirmado) return;

    setGuardando(true);
    try {
      await revocarAccesoIA(persona.uid);
      setAccesos((previos) => {
        const { [persona.uid]: _quitado, ...resto } = previos;
        return resto;
      });
      avisarExito("Acceso quitado.");
    } catch (error) {
      avisarError("No se pudo quitar el acceso.", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Pagina>
      <Eyebrow><FaUserShield aria-hidden /> Super admin</Eyebrow>
      <Titulo>Accesos a la IA</Titulo>
      <Subtitulo>
        Da acceso de prueba al asistente por un tiempo. Al vencer, la persona ya no puede usar la IA hasta que lo extiendas.
      </Subtitulo>

      <Panel>
        <Buscador>
          <FaSearch aria-hidden />
          <input
            type="search"
            placeholder="Buscar por nombre o correo"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </Buscador>

        <Resumen>
          <FaRobot aria-hidden /> {cargando ? "Cargando…" : `${vigentes} acceso${vigentes === 1 ? "" : "s"} vigente${vigentes === 1 ? "" : "s"} · ${filtradas.length} cuenta${filtradas.length === 1 ? "" : "s"}`}
        </Resumen>

        <Lista>
          {filtradas.map((persona) => (
            <FilaUsuario
              key={persona.uid}
              persona={persona}
              acceso={accesos[persona.uid]}
              abierta={abierta === persona.uid}
              onAlternar={() => setAbierta((actual) => (actual === persona.uid ? null : persona.uid))}
              onOtorgar={(datos) => otorgar(persona, datos)}
              onRevocar={() => revocar(persona)}
              guardando={guardando}
            />
          ))}
        </Lista>

        <Nota>
          Las cuentas con acceso permanente (lista del Worker) y los super admins siempre pueden usar la IA, aunque aquí aparezcan sin acceso. Un cambio tarda hasta un minuto en aplicarse.
        </Nota>
      </Panel>

      <PanelConsumoIA personas={personas} />
    </Pagina>
  );
};
