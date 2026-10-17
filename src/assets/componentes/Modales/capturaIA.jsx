import styled from "styled-components";
import { useState } from "react";
import { FaArrowRight, FaCheck, FaExchangeAlt, FaExclamationTriangle, FaMagic, FaRedo } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "./ModalGenerico";
import { CATEGORIAS_CAPTURA } from "../../funciones/ia/contratoCaptura";
import { interpretarCaptura } from "../../funciones/ia/interpretarCaptura";
import { ErrorCapturaIA, LIMITE_MENSAJE_IA, solicitarCapturaIA } from "../../funciones/ia/solicitarCaptura";

/*
 * Captura con IA: el usuario escribe en lenguaje natural ("gasté 230 en uber con
 * la BBVA"), el Worker lo traduce a JSON y aquí se muestran las propuestas ya
 * validadas por interpretarCaptura. Nada se guarda desde este modal: cada
 * propuesta abre el formulario de siempre, prellenado, para que el usuario
 * confirme. Las propuestas se conservan al cerrar, así se puede volver por la
 * siguiente después de guardar una.
 */

const Contenido = styled(ContenedorFormularioGenerico)`
  padding-bottom: 24px;
`;

const AreaMensaje = styled.textarea`
  width: 100%;
  min-height: 110px;
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

const ListaPropuestas = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TarjetaPropuesta = styled.li`
  border: 1px solid rgba(83, 59, 143, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: ${({ $abierta }) => ($abierta ? 0.6 : 1)};
`;

const EncabezadoPropuesta = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`;

const TipoPropuesta = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--colorMorado);
`;

const Monto = styled.strong`
  font-size: 18px;
  color: #1a1a2e;
`;

const Detalle = styled.p`
  margin: 0;
  font-size: 13px;
  color: rgba(26, 26, 46, 0.75);
`;

const ListaAdvertencias = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #a05a00;
`;

const formatoMoneda = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const ETIQUETA_TIPO = { gasto: "Gasto", ingreso: "Ingreso", transferencia: "Transferencia" };

const etiquetaCategoria = (valor) => CATEGORIAS_CAPTURA.find((categoria) => categoria.value === valor)?.label || "";

const describirPropuesta = (propuesta) => {
  if (propuesta.accion === "transferencia") {
    const origen = propuesta.cuentaOrigen?.nombre || "¿origen?";
    const destino = propuesta.cuentaDestino?.nombre || "¿destino?";
    return [`${origen} → ${destino}`, propuesta.nota].filter(Boolean).join(" · ");
  }

  const { valores, cuenta } = propuesta;
  return [
    cuenta?.nombre || "Sin cuenta",
    etiquetaCategoria(valores.categoria),
    valores.fechaMovimiento,
    valores.nota,
  ].filter(Boolean).join(" · ");
};

export const ModalCapturaIA = () => {
  const { cuentas } = useAppStore();
  const {
    isOpenCapturaIA,
    setIsOpenCapturaIA,
    abrirAgregarMovimiento,
    abrirMovimientoEntreCuentas,
  } = useModalStore();

  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [abiertas, setAbiertas] = useState([]);

  const cerrar = () => setIsOpenCapturaIA(false);
  const excedido = mensaje.length > LIMITE_MENSAJE_IA;

  const reiniciar = () => {
    setMensaje("");
    setError("");
    setResultado(null);
    setAbiertas([]);
  };

  const interpretar = async () => {
    if (cargando || !mensaje.trim() || excedido) return;
    setCargando(true);
    setError("");
    setResultado(null);
    setAbiertas([]);

    try {
      const respuesta = await solicitarCapturaIA({ mensaje, cuentas });
      setResultado(interpretarCaptura(respuesta, { cuentas }));
    } catch (errorCaptura) {
      setError(errorCaptura instanceof ErrorCapturaIA
        ? errorCaptura.message
        : "Ocurrió un error inesperado con la captura con IA.");
    } finally {
      setCargando(false);
    }
  };

  const abrirPropuesta = (propuesta) => {
    setAbiertas((previas) => [...previas, propuesta.indice]);
    cerrar();

    if (propuesta.accion === "transferencia") {
      abrirMovimientoEntreCuentas({
        cuentaOrigen: propuesta.cuentaOrigen,
        cuentaDestino: propuesta.cuentaDestino,
      });
      return;
    }

    abrirAgregarMovimiento({ cuenta: propuesta.cuenta, valores: propuesta.valores });
  };

  const propuestas = resultado?.propuestas || [];
  const descartadas = resultado?.descartadas || [];

  return (
    <ModalGenerico isOpen={isOpenCapturaIA} onClose={cerrar}>
      <Contenido>
        <ModalEncabezado
          icon={<FaMagic />}
          title="Capturar con IA"
          description="Escribe tus movimientos como se los contarías a alguien. Revisas cada uno antes de guardarlo."
        />

        <AreaMensaje
          value={mensaje}
          onChange={(evento) => setMensaje(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) interpretar();
          }}
          placeholder="Ej. gasté 230 en uber con la BBVA y pasé 1,000 de la nómina al efectivo"
          aria-label="Mensaje para la captura con IA"
          disabled={cargando}
        />

        <FilaInferior>
          <Contador $excedido={excedido}>{mensaje.length}/{LIMITE_MENSAJE_IA}</Contador>
          <div style={{ display: "flex", gap: 8 }}>
            {resultado && (
              <Boton type="button" $secundario onClick={reiniciar}>
                <FaRedo /> Nueva captura
              </Boton>
            )}
            <Boton type="button" onClick={interpretar} disabled={cargando || !mensaje.trim() || excedido}>
              <FaMagic /> {cargando ? "Interpretando..." : "Interpretar"}
            </Boton>
          </div>
        </FilaInferior>

        {error && <Aviso $error>{error}</Aviso>}

        {resultado && propuestas.length === 0 && (
          <Aviso>No encontré movimientos claros en el mensaje. Prueba con algo como "gasté 150 en comida con la BBVA".</Aviso>
        )}

        {propuestas.length > 0 && (
          <ListaPropuestas>
            {propuestas.map((propuesta) => {
              const yaAbierta = abiertas.includes(propuesta.indice);
              const esTransferencia = propuesta.accion === "transferencia";
              const tipo = esTransferencia ? "transferencia" : propuesta.valores.tipoDeMovimiento;
              const monto = esTransferencia ? propuesta.monto : Number(propuesta.valores.monto);

              return (
                <TarjetaPropuesta key={propuesta.indice} $abierta={yaAbierta}>
                  <EncabezadoPropuesta>
                    <TipoPropuesta>{ETIQUETA_TIPO[tipo] || tipo}</TipoPropuesta>
                    <Monto>{formatoMoneda.format(monto)}</Monto>
                  </EncabezadoPropuesta>
                  <Detalle>{describirPropuesta(propuesta)}</Detalle>

                  {esTransferencia && (
                    <Detalle>El monto no se llena solo en la transferencia: escríbelo en el siguiente paso.</Detalle>
                  )}

                  {propuesta.advertencias.length > 0 && (
                    <ListaAdvertencias>
                      {propuesta.advertencias.map((advertencia) => (
                        <li key={advertencia}><FaExclamationTriangle /> {advertencia}</li>
                      ))}
                    </ListaAdvertencias>
                  )}

                  <div>
                    <Boton type="button" $secundario={yaAbierta} onClick={() => abrirPropuesta(propuesta)}>
                      {yaAbierta ? <FaCheck /> : esTransferencia ? <FaExchangeAlt /> : <FaArrowRight />}
                      {yaAbierta ? "Abrir de nuevo" : "Revisar y guardar"}
                    </Boton>
                  </div>
                </TarjetaPropuesta>
              );
            })}
          </ListaPropuestas>
        )}

        {descartadas.length > 0 && (
          <Aviso>
            No se pudo usar {descartadas.length === 1 ? "una parte" : `${descartadas.length} partes`} del mensaje:{" "}
            {descartadas.map((descartada) => descartada.motivo).join(" ")}
          </Aviso>
        )}
      </Contenido>
    </ModalGenerico>
  );
};
