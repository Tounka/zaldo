import styled from "styled-components";
import { useCallback, useEffect, useState } from "react";
import { FaCalendarCheck, FaCheck, FaTimes } from "react-icons/fa";
import { ModalGenerico } from "./modalGenerico";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import {
  obtenerGastosRecurrentes,
  obtenerRecurrentesPendientes,
  marcarPeriodoResuelto,
} from "../../funciones/firebase/gastosRecurrentes";
import { obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";
import { BadgeCategoria } from "../../funciones/utils/coloresCategorias";
import { fechaLocalISO } from "../../funciones/utils/fechas";
import { avisarError } from "../../funciones/utils/avisos";

const Contenedor = styled.div`
  width: 480px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 20px 22px;
  box-sizing: border-box;
`;

const Cabecera = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
`;

const IconoCabecera = styled.div`
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: #fff;
  font-size: 19px;
  box-shadow: 0 6px 14px rgba(99, 102, 241, 0.25);
`;

const Titulo = styled.h2`
  margin: 0;
  color: #1e1b4b;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const Subtitulo = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
`;

const Tarjeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
`;

const FilaConcepto = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
`;

const Miniatura = styled.span`
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
  border-radius: 11px;
  background: #f1f5f9 url(${({ $imagen }) => $imagen}) center / cover no-repeat;
`;

const Concepto = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const NombreConcepto = styled.span`
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
`;

const CuentaConcepto = styled.span`
  color: #64748b;
  font-size: 11px;
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const FilaCampos = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const Entrada = styled.input`
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

const Acciones = styled.div`
  display: flex;
  gap: 9px;

  @media (max-width: 420px) {
    flex-direction: column-reverse;
  }
`;

const BtnOmitir = styled.button`
  flex: 1;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #cbd5e1;
  border-radius: 11px;
  background: #ffffff;
  color: #64748b;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover { border-color: #94a3b8; color: #475569; }
  &:disabled { opacity: 0.6; cursor: wait; }
`;

const BtnRegistrar = styled.button`
  flex: 1.4;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: none;
  border-radius: 11px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover { transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: wait; transform: none; }
`;

const Progreso = styled.span`
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
`;

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
};

/*
 * Fecha propuesta: el día que toca del mes en curso. Nunca se propone una fecha
 * futura — si el día del mes aún no llega, ese recurrente ni siquiera aparece.
 */
const fechaSugerida = (diaDelMes) => {
  const hoy = new Date();
  const dia = Math.min(Number(diaDelMes) || 1, hoy.getDate());
  return fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), dia));
};

/*
 * Pregunta por los gastos recurrentes que ya tocan este mes. No registra nada
 * por su cuenta: cada uno se confirma o se omite, y tanto el monto como la
 * fecha se pueden corregir antes de registrar.
 */
export const ModalGastosRecurrentesPendientes = () => {
  const { usuario, cuentas, preferencias } = useAppStore();
  const { abrirAgregarMovimiento, isOpenAgregarMovimiento } = useModalStore();

  const [pendientes, setPendientes] = useState([]);
  const [indice, setIndice] = useState(0);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [procesando, setProcesando] = useState(false);
  const [revisado, setRevisado] = useState(false);

  /* Se consulta una sola vez por sesión, al entrar. */
  useEffect(() => {
    if (!usuario?.uid || revisado) return;
    // El usuario puede apagar esta pregunta desde su perfil.
    if (!preferencias.preguntarGastosRecurrentes) return;

    let cancelado = false;

    (async () => {
      try {
        const recurrentes = await obtenerGastosRecurrentes(usuario.uid);
        if (cancelado) return;
        setPendientes(obtenerRecurrentesPendientes(recurrentes));
      } catch (error) {
        // Un fallo aquí no debe estorbar el arranque de la app.
        console.warn("No se pudieron revisar los gastos recurrentes.", error);
      } finally {
        if (!cancelado) setRevisado(true);
      }
    })();

    return () => { cancelado = true; };
  }, [usuario?.uid, revisado, preferencias.preguntarGastosRecurrentes]);

  const actual = pendientes[indice] || null;

  /* Al cambiar de pendiente se recargan monto y fecha propuestos. */
  useEffect(() => {
    if (!actual) return;
    setMonto(String(actual.monto || ""));
    setFecha(fechaSugerida(actual.diaDelMes));
  }, [actual]);

  const pasarAlSiguiente = useCallback(() => {
    setIndice((previo) => previo + 1);
  }, []);

  const resolver = useCallback(async (registrar) => {
    if (!actual || procesando) return;
    setProcesando(true);

    try {
      await marcarPeriodoResuelto(usuario.uid, actual.id, periodoActual());

      if (registrar) {
        const cuenta = cuentas.find((item) => item.id === actual.cuentaAsociada);

        abrirAgregarMovimiento({
          cuenta: cuenta || null,
          valores: {
            cuentaAsociada: actual.cuentaAsociada || "",
            nombreCuenta: actual.nombreCuenta || cuenta?.nombre || "",
            monto: String(monto || actual.monto || ""),
            categoria: actual.categoria || "",
            nota: actual.nombre || "",
            esPersonal: Boolean(actual.esPersonal),
            tipoDeMovimiento: "gasto",
            fechaMovimiento: fecha,
          },
        });
      }
    } catch (error) {
      avisarError("No se pudo actualizar el gasto recurrente.", error);
    } finally {
      setProcesando(false);
      pasarAlSiguiente();
    }
  }, [
    actual, procesando, usuario, cuentas, monto, fecha,
    abrirAgregarMovimiento, pasarAlSiguiente,
  ]);

  /*
   * No se muestra si no hay pendientes ni encima del alta de movimiento: al
   * confirmar uno, esa captura pasa al frente y el resto espera su turno.
   */
  if (!actual || isOpenAgregarMovimiento) return null;

  return (
    <ModalGenerico isOpen onClose={pasarAlSiguiente}>
      <Contenedor>
        <Cabecera>
          <IconoCabecera>
            <FaCalendarCheck />
          </IconoCabecera>
          <Titulo>¿Ya tuviste este gasto?</Titulo>
          <Subtitulo>
            Lo tienes marcado como recurrente cada día {actual.diaDelMes}.
            Se registra solo si lo confirmas.
          </Subtitulo>
        </Cabecera>

        <Tarjeta>
          <FilaConcepto>
            <Miniatura
              $imagen={obtenerImagenCategoriaCompra(actual.categoria)}
              aria-hidden="true"
            />
            <Concepto>
              <NombreConcepto>{actual.nombre}</NombreConcepto>
              <CuentaConcepto>
                {actual.nombreCuenta || "Sin cuenta asignada"}
              </CuentaConcepto>
            </Concepto>
          </FilaConcepto>

          {actual.categoria && (
            <BadgeCategoria categoria={actual.categoria} size="sm" />
          )}

          <FilaCampos>
            <Campo>
              Monto
              <Entrada
                type="number"
                inputMode="decimal"
                step=".01"
                min="0"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value)}
              />
            </Campo>
            <Campo>
              Fecha
              <Entrada
                type="date"
                max={fechaLocalISO()}
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </Campo>
          </FilaCampos>
        </Tarjeta>

        <Acciones>
          <BtnOmitir
            type="button"
            disabled={procesando}
            onClick={() => resolver(false)}
          >
            <FaTimes /> Este mes no
          </BtnOmitir>
          <BtnRegistrar
            type="button"
            disabled={procesando}
            onClick={() => resolver(true)}
          >
            <FaCheck /> Sí, registrarlo
          </BtnRegistrar>
        </Acciones>

        {pendientes.length > 1 && (
          <Progreso>
            {indice + 1} de {pendientes.length} por revisar
          </Progreso>
        )}
      </Contenedor>
    </ModalGenerico>
  );
};
