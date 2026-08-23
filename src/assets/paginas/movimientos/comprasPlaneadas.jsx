import styled from "styled-components";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheck,
  FaChevronDown,
  FaEdit,
  FaPlus,
  FaShoppingBag,
  FaTrash,
  FaWallet,
} from "react-icons/fa";
import {
  actualizarCompraPlaneada,
  crearCompraPlaneada,
  eliminarCompraPlaneada,
  obtenerComprasPlaneadas,
} from "../../funciones/firebase/comprasPlaneadas";
import { CATEGORIAS_COMPRA, obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";
import { useAppStore } from "../../stores/useAppStore";
import { confirmarEliminacion } from "../../funciones/utils/avisos";

const Formato = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const fechaHoy = () => new Date().toISOString().slice(0, 10);
const crearFormVacio = () => ({
  nombre: "",
  presupuesto: "",
  gastoReal: "",
  fechaLimite: "",
  fechaCompra: "",
  fechaAlta: fechaHoy(),
  categoria: "",
});

const PaginaCompras = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormularioCompra = styled.form`
  display: grid;
  grid-template-columns: minmax(190px, 1.4fr) minmax(120px, 0.7fr) minmax(145px, 0.8fr) minmax(180px, 0.9fr) auto;
  gap: 10px;
  align-items: end;
  padding: 16px;
  border: 1px solid rgba(83, 59, 143, 0.12);
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
  color: #555;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

/* Marca los campos que no bloquean el alta, para que se note al capturar. */
const Opcional = styled.span`
  color: #999;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .02em;
  text-transform: none;
`;

const Input = styled.input`
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  padding: 0 12px;
  color: #1a1a2e;
  background: rgba(83, 59, 143, 0.04);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--colorMorado);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

const Select = styled.select`
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 10px;
  padding: 0 10px;
  color: #1a1a2e;
  background: rgba(83, 59, 143, 0.04);
  font: inherit;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--colorMorado);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`;

const CategoriaCampo = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
`;

const Miniatura = styled.span`
  width: ${({ $grande }) => ($grande ? "48px" : "30px")};
  height: ${({ $grande }) => ($grande ? "48px" : "30px")};
  display: inline-block;
  flex: 0 0 auto;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: ${({ $grande }) => ($grande ? "12px" : "8px")};
  background: rgba(83, 59, 143, 0.06) url(${({ $imagen }) => $imagen}) center / cover no-repeat;
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
  background: var(--colorMorado);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: all 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const ResumenCompras = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ResumenItem = styled.div`
  padding: 16px;
  border-radius: 14px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  box-shadow: 0 2px 8px rgba(83, 59, 143, 0.04);
`;

const ResumenEtiqueta = styled.span`
  display: block;
  color: #777;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const ResumenValor = styled.strong`
  display: block;
  margin-top: 4px;
  color: ${({ $tone }) =>
    $tone === "green"
      ? "var(--colorVerde)"
      : $tone === "orange"
        ? "#a37f18"
        : "var(--colorMorado)"};
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: clamp(16px, 3.4vw, 19px);
  font-weight: 800;
`;

const ListaShell = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
`;

const Tabla = styled.table`
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;

  th {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(83, 59, 143, 0.12);
    color: var(--colorMorado);
    background: rgba(83, 59, 143, 0.04);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-align: left;
    text-transform: uppercase;
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(83, 59, 143, 0.06);
    color: #1a1a2e;
    font-size: 13px;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
  tr:hover > td {
    background: rgba(83, 59, 143, 0.04);
  }
`;

const NombreCompra = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ $done }) => ($done ? "#999" : "#1a1a2e")};
  font-weight: 800;
  text-decoration: ${({ $done }) => ($done ? "line-through" : "none")};
`;

const Fecha = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #666;
  font-size: 12px;
  white-space: nowrap;
`;

const Estado = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 999px;
  padding: 4px 9px;
  background: ${({ $done }) => ($done ? "#d1fae5" : "#fef3c7")};
  color: ${({ $done }) => ($done ? "#059669" : "#d97706")};
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    transform: scale(1.03);
  }
`;

const Acciones = styled.div`
  display: flex;
  gap: 6px;
`;

const BtnIcono = styled.button`
  min-width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid ${({ $active }) => ($active ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.2)")};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? "#ede9fe" : "#ffffff")};
  color: ${({ $danger }) => ($danger ? "#ef4444" : "#666")};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ $danger }) => ($danger ? "#ef4444" : "var(--colorMorado)")};
    color: ${({ $danger }) => ($danger ? "#ef4444" : "var(--colorMorado)")};
  }
`;

const FilaEdicion = styled.td`
  padding: 0 !important;
  background: rgba(83, 59, 143, 0.04) !important;
`;

const FormularioEdicion = styled.form`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 16px;
  border-top: 1px solid rgba(83, 59, 143, 0.12);
  border-bottom: 1px solid rgba(83, 59, 143, 0.12);

  @media (max-width: 800px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const CabeceraEdicion = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--colorMorado);
  font-size: 13px;
  font-weight: 800;
`;

const AccionesEdicion = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const BtnCancelar = styled.button`
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: #ffffff;
  color: #666;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }
`;

const EstadoVacio = styled.div`
  padding: 40px 20px;
  color: #666;
  text-align: center;
  font-size: 13px;
`;

const ErrorTexto = styled.p`
  margin: -4px 0 0;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
`;

const fechaLegible = (fecha) => {
  if (!fecha) return "—";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/*
 * La fecha límite se captura por mes, no por día: lo que importa es "para
 * cuándo", no el día exacto. Se guarda el último día del mes elegido, así que
 * el dato sigue siendo una fecha normal y lo ya capturado no se rompe.
 */
const mesDesdeFecha = (fecha) => (fecha ? String(fecha).slice(0, 7) : "");

const ultimoDiaDelMes = (mes) => {
  if (!mes) return "";
  const [anio, numeroMes] = mes.split("-").map(Number);
  if (!anio || !numeroMes) return "";
  const dia = new Date(anio, numeroMes, 0).getDate();
  return `${mes}-${String(dia).padStart(2, "0")}`;
};

const mesLegible = (fecha) => {
  if (!fecha) return "—";
  const texto = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const nombreCategoria = (categoria) =>
  CATEGORIAS_COMPRA.find((item) => item.value === categoria)?.label ||
  "Sin categoría";

const SelectorCategoria = ({ value, onChange }) => (
  <CategoriaCampo>
    <Miniatura $imagen={obtenerImagenCategoriaCompra(value)} aria-hidden="true" />
    <Select value={value} onChange={onChange} aria-label="Categoría">
      <option value="">Sin categoría</option>
      {CATEGORIAS_COMPRA.map((categoria) => (
        <option key={categoria.value} value={categoria.value}>
          {categoria.label}
        </option>
      ))}
    </Select>
  </CategoriaCampo>
);

export const ComprasPlaneadas = () => {
  const { usuario } = useAppStore();
  const [compras, setCompras] = useState([]);
  const [formNueva, setFormNueva] = useState(crearFormVacio);
  const [edicion, setEdicion] = useState(null);
  const [formEdicion, setFormEdicion] = useState(crearFormVacio);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargarCompras = useCallback(async () => {
    if (!usuario?.uid) return;
    setCargando(true);
    try {
      setCompras(await obtenerComprasPlaneadas(usuario.uid));
    } catch (errorCarga) {
      console.error("Error al cargar compras planeadas", errorCarga);
      setError("No se pudieron cargar tus compras próximas.");
    } finally {
      setCargando(false);
    }
  }, [usuario?.uid]);

  useEffect(() => {
    cargarCompras();
  }, [cargarCompras]);

  const totales = useMemo(
    () =>
      compras.reduce(
        (acc, compra) => {
          acc.presupuesto += Number(compra.presupuesto || 0);
          acc.real += Number(compra.gastoReal || 0);
          if (!compra.comprada) acc.pendientes += 1;
          return acc;
        },
        { presupuesto: 0, real: 0, pendientes: 0 }
      ),
    [compras]
  );

  const crear = async (event) => {
    event.preventDefault();
    if (!formNueva.nombre.trim()) {
      setError("Escribe qué compra quieres apartar.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const nueva = await crearCompraPlaneada(usuario.uid, formNueva);
      setCompras((prev) => [nueva, ...prev]);
      setFormNueva(crearFormVacio());
    } catch (errorGuardar) {
      console.error("Error al guardar compra planeada", errorGuardar);
      setError("No se pudo guardar la compra. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = (compra) => {
    if (edicion === compra.id) {
      setEdicion(null);
      return;
    }
    setEdicion(compra.id);
    setFormEdicion({
      nombre: compra.nombre || "",
      presupuesto: compra.presupuesto ?? "",
      gastoReal: compra.gastoReal ?? "",
      fechaLimite: compra.fechaLimite || compra.fechaObjetivo || "",
      fechaCompra: compra.fechaCompra || "",
      fechaAlta: compra.fechaAlta || "",
      categoria: compra.categoria || "",
    });
    setError("");
  };

  const guardarEdicion = async (event, compra) => {
    event.preventDefault();
    if (!formEdicion.nombre.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const actualizada = await actualizarCompraPlaneada(
        usuario.uid,
        compra.id,
        { ...formEdicion, comprada: compra.comprada }
      );
      setCompras((prev) =>
        prev.map((item) => (item.id === compra.id ? actualizada : item))
      );
      setEdicion(null);
    } catch (errorGuardar) {
      console.error("Error al editar compra planeada", errorGuardar);
      setError("No se pudo actualizar la compra. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (compra) => {
    try {
      const actualizada = await actualizarCompraPlaneada(
        usuario.uid,
        compra.id,
        { ...compra, comprada: !compra.comprada }
      );
      setCompras((prev) =>
        prev.map((item) => (item.id === compra.id ? actualizada : item))
      );
    } catch {
      setError("No se pudo actualizar el estado de la compra.");
    }
  };

  const eliminar = async (compra) => {
    const confirmado = await confirmarEliminacion({
      titulo: `¿Eliminar "${compra.nombre}"?`,
      texto: "Se quitará de tu lista de compras planeadas.",
    });
    if (!confirmado) return;
    try {
      await eliminarCompraPlaneada(usuario.uid, compra.id);
      setCompras((prev) => prev.filter((item) => item.id !== compra.id));
      if (edicion === compra.id) setEdicion(null);
    } catch {
      setError("No se pudo eliminar la compra.");
    }
  };

  return (
    <PaginaCompras>
      <FormularioCompra onSubmit={crear}>
        <Campo>
          ¿Qué quieres comprar?
          <Input
            value={formNueva.nombre}
            onChange={(event) =>
              setFormNueva((prev) => ({ ...prev, nombre: event.target.value }))
            }
            placeholder="Ej. Monitor nuevo, Despensa fin de mes..."
          />
        </Campo>
        <Campo>
          Presupuesto
          <Input
            type="number" inputMode="decimal"
            min="0"
            step="0.01"
            value={formNueva.presupuesto}
            onChange={(event) =>
              setFormNueva((prev) => ({
                ...prev,
                presupuesto: event.target.value,
              }))
            }
            placeholder="$0.00"
          />
        </Campo>
        <Campo>
          Mes límite <Opcional>(opcional)</Opcional>
          <Input
            type="month"
            value={mesDesdeFecha(formNueva.fechaLimite)}
            onChange={(event) =>
              setFormNueva((prev) => ({
                ...prev,
                fechaLimite: ultimoDiaDelMes(event.target.value),
              }))
            }
          />
        </Campo>
        <Campo>
          Categoría
          <SelectorCategoria
            value={formNueva.categoria}
            onChange={(event) =>
              setFormNueva((prev) => ({
                ...prev,
                categoria: event.target.value,
              }))
            }
          />
        </Campo>
        <BtnPrimario type="submit" disabled={guardando}>
          <FaPlus /> Apartar compra
        </BtnPrimario>
      </FormularioCompra>

      {error && <ErrorTexto>{error}</ErrorTexto>}

      <ResumenCompras>
        <ResumenItem>
          <ResumenEtiqueta>
            Por apartar · {totales.pendientes} pendientes
          </ResumenEtiqueta>
          <ResumenValor>{Formato.format(totales.presupuesto)}</ResumenValor>
        </ResumenItem>
        <ResumenItem $tone="green">
          <ResumenEtiqueta>Gasto final registrado</ResumenEtiqueta>
          <ResumenValor $tone="green">
            {Formato.format(totales.real)}
          </ResumenValor>
        </ResumenItem>
        <ResumenItem $tone="orange">
          <ResumenEtiqueta>Margen contra presupuesto</ResumenEtiqueta>
          <ResumenValor $tone="orange">
            {Formato.format(totales.presupuesto - totales.real)}
          </ResumenValor>
        </ResumenItem>
      </ResumenCompras>

      <ListaShell>
        {cargando ? (
          <EstadoVacio>Cargando tu lista de compras...</EstadoVacio>
        ) : compras.length === 0 ? (
          <EstadoVacio>
            <FaShoppingBag
              style={{
                fontSize: 26,
                marginBottom: 8,
                color: "var(--colorMorado)",
              }}
            />
            <br />
            Aún no tienes compras próximas. Agrega la primera arriba.
          </EstadoVacio>
        ) : (
          <Tabla aria-label="Lista de compras próximas">
            <thead>
              <tr>
                <th>Compra</th>
                <th>Alta</th>
                <th>Mes límite</th>
                <th>Fecha compra</th>
                <th>Presupuesto</th>
                <th>Gasto final</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((compra) => (
                <Fragment key={compra.id}>
                  <tr>
                    <td>
                      <NombreCompra $done={compra.comprada}>
                        <Miniatura
                          $imagen={obtenerImagenCategoriaCompra(compra.categoria)}
                        />
                        <span>
                          {compra.nombre}
                          <small
                            style={{
                              display: "block",
                              marginTop: 2,
                              color: "#666",
                              fontWeight: 600,
                            }}
                          >
                            {nombreCategoria(compra.categoria)}
                          </small>
                        </span>
                      </NombreCompra>
                    </td>
                    <td>
                      <Fecha>
                        <FaCalendarAlt />
                        {fechaLegible(compra.fechaAlta)}
                      </Fecha>
                    </td>
                    <td>
                      <Fecha>
                        <FaCalendarAlt />
                        {mesLegible(
                          compra.fechaLimite || compra.fechaObjetivo
                        )}
                      </Fecha>
                    </td>
                    <td>
                      <Fecha>
                        <FaCalendarAlt />
                        {fechaLegible(compra.fechaCompra)}
                      </Fecha>
                    </td>
                    <td>{Formato.format(Number(compra.presupuesto || 0))}</td>
                    <td>
                      {compra.gastoReal === null ||
                      compra.gastoReal === undefined
                        ? "—"
                        : Formato.format(Number(compra.gastoReal || 0))}
                    </td>
                    <td>
                      <Estado
                        type="button"
                        $done={compra.comprada}
                        onClick={() => cambiarEstado(compra)}
                      >
                        {compra.comprada ? <FaCheck /> : <FaWallet />}{" "}
                        {compra.comprada ? "Comprada" : "Pendiente"}
                      </Estado>
                    </td>
                    <td>
                      <Acciones>
                        <BtnIcono
                          type="button"
                          $active={edicion === compra.id}
                          onClick={() => abrirEdicion(compra)}
                          title="Abrir edición"
                        >
                          <FaEdit />
                          <FaChevronDown
                            style={{
                              transform:
                                edicion === compra.id
                                  ? "rotate(180deg)"
                                  : "none",
                              transition: "transform .16s ease",
                            }}
                          />
                        </BtnIcono>
                        <BtnIcono
                          type="button"
                          $danger
                          onClick={() => eliminar(compra)}
                          title="Eliminar"
                        >
                          <FaTrash />
                        </BtnIcono>
                      </Acciones>
                    </td>
                  </tr>
                  {edicion === compra.id && (
                    <tr>
                      <FilaEdicion colSpan="8">
                        <FormularioEdicion
                          onSubmit={(event) => guardarEdicion(event, compra)}
                        >
                          <CabeceraEdicion>
                            <span>Editar compra · fechas y categoría</span>
                            <span
                              style={{
                                color: "#666",
                                fontWeight: 600,
                              }}
                            >
                              Las tres fechas quedan almacenadas
                            </span>
                          </CabeceraEdicion>
                          <Campo>
                            Nombre
                            <Input
                              value={formEdicion.nombre}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  nombre: event.target.value,
                                }))
                              }
                            />
                          </Campo>
                          <Campo>
                            Presupuesto
                            <Input
                              type="number" inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={formEdicion.presupuesto}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  presupuesto: event.target.value,
                                }))
                              }
                            />
                          </Campo>
                          <Campo>
                            Gasto final
                            <Input
                              type="number" inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={formEdicion.gastoReal}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  gastoReal: event.target.value,
                                }))
                              }
                              placeholder="Aún no comprada"
                            />
                          </Campo>
                          <Campo>
                            Categoría
                            <SelectorCategoria
                              value={formEdicion.categoria}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  categoria: event.target.value,
                                }))
                              }
                            />
                          </Campo>
                          <Campo>
                            Fecha de alta
                            <Input
                              type="date"
                              value={formEdicion.fechaAlta}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  fechaAlta: event.target.value,
                                }))
                              }
                            />
                          </Campo>
                          <Campo>
                            Mes límite <Opcional>(opcional)</Opcional>
                            <Input
                              type="month"
                              value={mesDesdeFecha(formEdicion.fechaLimite)}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  fechaLimite: ultimoDiaDelMes(event.target.value),
                                }))
                              }
                            />
                          </Campo>
                          <Campo>
                            Fecha de compra
                            <Input
                              type="date"
                              value={formEdicion.fechaCompra}
                              onChange={(event) =>
                                setFormEdicion((prev) => ({
                                  ...prev,
                                  fechaCompra: event.target.value,
                                }))
                              }
                            />
                          </Campo>
                          <AccionesEdicion>
                            <BtnCancelar
                              type="button"
                              onClick={() => setEdicion(null)}
                            >
                              Cancelar
                            </BtnCancelar>
                            <BtnPrimario
                              type="submit"
                              disabled={guardando}
                            >
                              <FaCheck />{" "}
                              {guardando ? "Guardando..." : "Guardar edición"}
                            </BtnPrimario>
                          </AccionesEdicion>
                        </FormularioEdicion>
                      </FilaEdicion>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Tabla>
        )}
      </ListaShell>
    </PaginaCompras>
  );
};
