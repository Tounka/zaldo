import styled from "styled-components";
import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaTrash, FaCalendarCheck, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import {
  obtenerGastosRecurrentes,
  crearGastoRecurrente,
  actualizarGastoRecurrente,
  eliminarGastoRecurrente,
} from "../../funciones/firebase/gastosRecurrentes";
import { CATEGORIAS_COMPRA, obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";
import { confirmarEliminacion, avisarError } from "../../funciones/utils/avisos";

const Pagina = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Intro = styled.p`
  max-width: 70ch;
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
`;

const Formulario = styled.form`
  display: grid;
  grid-template-columns: minmax(170px, 1.4fr) minmax(110px, 0.7fr) minmax(95px, 0.5fr) minmax(170px, 0.9fr) auto;
  gap: 10px;
  align-items: end;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 550px) {
    grid-template-columns: 1fr;
  }
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Entrada = styled.input`
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #6366f1;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

const Seleccion = styled.select`
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #6366f1;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

const CampoCategoria = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
`;

const Miniatura = styled.span`
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f1f5f9 url(${({ $imagen }) => $imagen}) center / cover no-repeat;
`;

const BtnPrimario = styled.button`
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);

  &:hover { transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: wait; transform: none; }
`;

const Lista = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
`;

const Tabla = styled.table`
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;

  th {
    padding: 12px 14px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #475569;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    font-size: 13px;
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover > td { background: #f8fafc; }
`;

const Concepto = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: ${({ $inactivo }) => ($inactivo ? "#94a3b8" : "#0f172a")};
`;

const Monto = styled.span`
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 800;
`;

const BtnIcono = styled.button`
  min-width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: ${({ $peligro }) => ($peligro ? "#dc2626" : "#64748b")};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $peligro }) => ($peligro ? "#dc2626" : "#6366f1")};
    background: ${({ $peligro }) => ($peligro ? "#fef2f2" : "#f5f3ff")};
  }
`;

const Acciones = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

const EstadoVacio = styled.div`
  padding: 34px 20px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
`;

const ErrorTexto = styled.p`
  margin: 0;
  color: #dc2626;
  font-size: 12px;
  font-weight: 700;
`;

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formularioVacio = () => ({
  nombre: "",
  monto: "",
  diaDelMes: "1",
  categoria: "",
  cuentaAsociada: "",
});

export const GastosRecurrentes = () => {
  const { usuario, cuentas } = useAppStore();
  const [recurrentes, setRecurrentes] = useState([]);
  const [form, setForm] = useState(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!usuario?.uid) return;
    try {
      setRecurrentes(await obtenerGastosRecurrentes(usuario.uid));
    } catch (errorCarga) {
      avisarError("No se pudieron cargar tus gastos recurrentes.", errorCarga);
    }
  }, [usuario?.uid]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (evento) => {
    evento.preventDefault();

    if (!form.nombre.trim()) {
      setError("Ponle un nombre al gasto recurrente.");
      return;
    }
    if (!Number(form.monto)) {
      setError("Indica el monto aproximado.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const cuenta = cuentas.find((item) => item.id === form.cuentaAsociada);
      const nuevo = await crearGastoRecurrente(usuario.uid, {
        ...form,
        nombreCuenta: cuenta?.nombre || "",
      });

      setRecurrentes((previos) => [...previos, nuevo].sort(
        (a, b) => a.diaDelMes - b.diaDelMes
      ));
      setForm(formularioVacio());
    } catch (errorGuardar) {
      avisarError("No se pudo guardar el gasto recurrente.", errorGuardar);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (recurrente) => {
    const activo = !recurrente.activo;

    setRecurrentes((previos) => previos.map((item) => (
      item.id === recurrente.id ? { ...item, activo } : item
    )));

    try {
      await actualizarGastoRecurrente(usuario.uid, recurrente.id, { activo });
    } catch (errorActualizar) {
      avisarError("No se pudo cambiar el estado.", errorActualizar);
      cargar();
    }
  };

  const eliminar = async (recurrente) => {
    const confirmado = await confirmarEliminacion({
      titulo: `¿Eliminar "${recurrente.nombre}"?`,
      texto: "Dejará de preguntarte por este gasto cada mes.",
    });
    if (!confirmado) return;

    try {
      await eliminarGastoRecurrente(usuario.uid, recurrente.id);
      setRecurrentes((previos) => previos.filter((item) => item.id !== recurrente.id));
    } catch (errorEliminar) {
      avisarError("No se pudo eliminar el gasto recurrente.", errorEliminar);
    }
  };

  return (
    <Pagina>
      <Intro>
        Renta, suscripciones y servicios que se repiten cada mes. Al llegar el día,
        la app te pregunta al entrar si ya tuviste ese gasto: nada se registra solo,
        y puedes ajustar monto y fecha antes de confirmarlo.
      </Intro>

      <Formulario onSubmit={crear}>
        <Campo>
          ¿Qué gasto se repite?
          <Entrada
            value={form.nombre}
            onChange={(evento) =>
              setForm((previo) => ({ ...previo, nombre: evento.target.value }))
            }
            placeholder="Renta, Netflix, luz..."
          />
        </Campo>

        <Campo>
          Monto aproximado
          <Entrada
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={(evento) =>
              setForm((previo) => ({ ...previo, monto: evento.target.value }))
            }
            placeholder="$0.00"
          />
        </Campo>

        <Campo>
          Día del mes
          <Entrada
            type="number"
            inputMode="decimal"
            min="1"
            max="28"
            value={form.diaDelMes}
            onChange={(evento) =>
              setForm((previo) => ({ ...previo, diaDelMes: evento.target.value }))
            }
          />
        </Campo>

        <Campo>
          Categoría
          <CampoCategoria>
            <Miniatura
              $imagen={obtenerImagenCategoriaCompra(form.categoria)}
              aria-hidden="true"
            />
            <Seleccion
              value={form.categoria}
              onChange={(evento) =>
                setForm((previo) => ({ ...previo, categoria: evento.target.value }))
              }
            >
              <option value="">Sin categoría</option>
              {CATEGORIAS_COMPRA.map((categoria) => (
                <option key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </option>
              ))}
            </Seleccion>
          </CampoCategoria>
        </Campo>

        <BtnPrimario type="submit" disabled={guardando}>
          <FaPlus /> Agregar
        </BtnPrimario>

        <Campo style={{ gridColumn: "1 / -1" }}>
          Cuenta de la que sale
          <Seleccion
            value={form.cuentaAsociada}
            onChange={(evento) =>
              setForm((previo) => ({ ...previo, cuentaAsociada: evento.target.value }))
            }
          >
            <option value="">Elegir al confirmar</option>
            {cuentas.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
              </option>
            ))}
          </Seleccion>
        </Campo>
      </Formulario>

      {error && <ErrorTexto>{error}</ErrorTexto>}

      <Lista>
        {recurrentes.length === 0 ? (
          <EstadoVacio>
            <FaCalendarCheck style={{ fontSize: 26, color: "#c7d2fe", marginBottom: 8 }} />
            <div>Aún no tienes gastos recurrentes. Agrega el primero arriba.</div>
          </EstadoVacio>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Día</th>
                <th>Cuenta</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recurrentes.map((recurrente) => (
                <tr key={recurrente.id}>
                  <td>
                    <Concepto $inactivo={!recurrente.activo}>
                      <Miniatura
                        $imagen={obtenerImagenCategoriaCompra(recurrente.categoria)}
                        aria-hidden="true"
                      />
                      {recurrente.nombre}
                    </Concepto>
                  </td>
                  <td><Monto>{formatoMoneda.format(recurrente.monto)}</Monto></td>
                  <td>Día {recurrente.diaDelMes}</td>
                  <td>{recurrente.nombreCuenta || "Se elige al confirmar"}</td>
                  <td>
                    <Acciones>
                      <BtnIcono
                        type="button"
                        onClick={() => alternarActivo(recurrente)}
                        title={recurrente.activo ? "Pausar recordatorio" : "Reanudar recordatorio"}
                        aria-label={recurrente.activo ? "Pausar recordatorio" : "Reanudar recordatorio"}
                      >
                        {recurrente.activo ? <FaToggleOn /> : <FaToggleOff />}
                      </BtnIcono>
                      <BtnIcono
                        type="button"
                        $peligro
                        onClick={() => eliminar(recurrente)}
                        title="Eliminar"
                        aria-label="Eliminar gasto recurrente"
                      >
                        <FaTrash />
                      </BtnIcono>
                    </Acciones>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Lista>
    </Pagina>
  );
};
