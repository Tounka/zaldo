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

const Formato = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
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
  gap: 14px;
`;

const FormularioCompra = styled.form`
  display: grid;
  grid-template-columns: minmax(190px, 1.4fr) minmax(120px, .7fr) minmax(145px, .8fr) minmax(180px, .9fr) auto;
  gap: 9px;
  align-items: end;
  padding: 14px;
  border: 1px solid rgba(83, 59, 143, .14);
  border-radius: 13px;
  background: #fff;

  @media (max-width: 980px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 550px) { grid-template-columns: 1fr; }
`;

const Campo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #756d80;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  border: 1px solid #ded8e6;
  border-radius: 8px;
  padding: 0 10px;
  color: #2d2636;
  background: #fff;
  font: inherit;
  font-size: 12px;
  outline: none;

  &:focus { border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .1); }
`;

const Select = styled.select`
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  border: 1px solid #ded8e6;
  border-radius: 8px;
  padding: 0 10px;
  color: #2d2636;
  background: #fff;
  font: inherit;
  font-size: 12px;
  outline: none;

  &:focus { border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .1); }
`;

const CategoriaCampo = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
`;

const Miniatura = styled.span`
  width: ${({ $grande }) => $grande ? "48px" : "28px"};
  height: ${({ $grande }) => $grande ? "48px" : "28px"};
  display: inline-block;
  flex: 0 0 auto;
  border: 1px solid rgba(83, 59, 143, .14);
  border-radius: ${({ $grande }) => $grande ? "12px" : "8px"};
  background: #f0ebfa url(${({ $imagen }) => $imagen}) center / cover no-repeat;
`;

const BtnPrimario = styled.button`
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: var(--colorMorado);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: #694da9; }
  &:disabled { opacity: .6; cursor: wait; }
`;

const ResumenCompras = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const ResumenItem = styled.div`
  padding: 11px 13px;
  border: 1px solid rgba(83, 59, 143, .12);
  border-radius: 10px;
  background: ${({ $tone }) => $tone === "green" ? "#f1faf6" : $tone === "orange" ? "#fff8ed" : "#faf8ff"};
`;

const ResumenEtiqueta = styled.span`
  display: block;
  color: #81798b;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
`;

const ResumenValor = styled.strong`
  display: block;
  margin-top: 4px;
  color: ${({ $tone }) => $tone === "green" ? "#237c5d" : $tone === "orange" ? "#ad6917" : "#30244a"};
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 17px;
`;

const ListaShell = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(83, 59, 143, .14);
  border-radius: 12px;
  background: #fff;
`;

const Tabla = styled.table`
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;

  th {
    padding: 10px 12px;
    border-bottom: 1px solid #ebe6ef;
    color: #81798b;
    background: #faf9fc;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .08em;
    text-align: left;
    text-transform: uppercase;
  }

  td {
    padding: 10px 12px;
    border-bottom: 1px solid #f0edf3;
    color: #4e4658;
    font-size: 12px;
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  tr:hover > td { background: #fdfbff; }
`;

const NombreCompra = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ $done }) => $done ? "#8b8492" : "#2e2737"};
  font-weight: 800;
  text-decoration: ${({ $done }) => $done ? "line-through" : "none"};
`;

const Fecha = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #70677b;
  white-space: nowrap;
`;

const Estado = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 999px;
  padding: 5px 8px;
  background: ${({ $done }) => $done ? "#eaf8f1" : "#fff5df"};
  color: ${({ $done }) => $done ? "#23805e" : "#a76518"};
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
`;

const Acciones = styled.div`
  display: flex;
  gap: 5px;
`;

const BtnIcono = styled.button`
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid ${({ $active }) => $active ? "#bda1e2" : "#e5dfeb"};
  border-radius: 7px;
  background: ${({ $active }) => $active ? "#f4effd" : "#fff"};
  color: ${({ $danger }) => $danger ? "#c44d5a" : "#756b82"};
  cursor: pointer;

  &:hover { border-color: ${({ $danger }) => $danger ? "#c44d5a" : "var(--colorMorado)"}; }
`;

const FilaEdicion = styled.td`
  padding: 0 !important;
  background: #faf8fe !important;
`;

const FormularioEdicion = styled.form`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border-top: 1px solid #e9e2f1;
  border-bottom: 1px solid #e9e2f1;

  @media (max-width: 800px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const CabeceraEdicion = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4a3964;
  font-size: 12px;
  font-weight: 800;
`;

const AccionesEdicion = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const BtnCancelar = styled.button`
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ded7e8;
  border-radius: 8px;
  background: #fff;
  color: #756b82;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
`;

const EstadoVacio = styled.div`
  padding: 34px 20px;
  color: #81798b;
  text-align: center;
  font-size: 12px;
`;

const ErrorTexto = styled.p`
  margin: -4px 0 0;
  color: #b64c58;
  font-size: 11px;
`;

const fechaLegible = (fecha) => {
  if (!fecha) return "—";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const nombreCategoria = (categoria) => CATEGORIAS_COMPRA.find((item) => item.value === categoria)?.label || "Sin categoría";

const SelectorCategoria = ({ value, onChange }) => (
  <CategoriaCampo>
    <Miniatura $imagen={obtenerImagenCategoriaCompra(value)} aria-hidden="true" />
    <Select value={value} onChange={onChange} aria-label="Categoría">
      <option value="">Sin categoría</option>
      {CATEGORIAS_COMPRA.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}
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

  useEffect(() => { cargarCompras(); }, [cargarCompras]);

  const totales = useMemo(() => compras.reduce((acc, compra) => {
    acc.presupuesto += Number(compra.presupuesto || 0);
    acc.real += Number(compra.gastoReal || 0);
    if (!compra.comprada) acc.pendientes += 1;
    return acc;
  }, { presupuesto: 0, real: 0, pendientes: 0 }), [compras]);

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
      const actualizada = await actualizarCompraPlaneada(usuario.uid, compra.id, { ...formEdicion, comprada: compra.comprada });
      setCompras((prev) => prev.map((item) => item.id === compra.id ? actualizada : item));
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
      const actualizada = await actualizarCompraPlaneada(usuario.uid, compra.id, { ...compra, comprada: !compra.comprada });
      setCompras((prev) => prev.map((item) => item.id === compra.id ? actualizada : item));
    } catch {
      setError("No se pudo actualizar el estado de la compra.");
    }
  };

  const eliminar = async (compra) => {
    if (!window.confirm(`¿Eliminar "${compra.nombre}" de tu lista?`)) return;
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
        <Campo>¿Qué quieres comprar?<Input value={formNueva.nombre} onChange={(event) => setFormNueva((prev) => ({ ...prev, nombre: event.target.value }))} placeholder="Ej. Monitor nuevo" /></Campo>
        <Campo>Presupuesto<Input type="number" min="0" step="0.01" value={formNueva.presupuesto} onChange={(event) => setFormNueva((prev) => ({ ...prev, presupuesto: event.target.value }))} placeholder="$0" /></Campo>
        <Campo>Fecha límite<Input type="date" value={formNueva.fechaLimite} onChange={(event) => setFormNueva((prev) => ({ ...prev, fechaLimite: event.target.value }))} /></Campo>
        <Campo>Categoría<SelectorCategoria value={formNueva.categoria} onChange={(event) => setFormNueva((prev) => ({ ...prev, categoria: event.target.value }))} /></Campo>
        <BtnPrimario type="submit" disabled={guardando}><FaPlus /> Apartar compra</BtnPrimario>
      </FormularioCompra>

      {error && <ErrorTexto>{error}</ErrorTexto>}

      <ResumenCompras>
        <ResumenItem><ResumenEtiqueta>Por apartar · {totales.pendientes} compras</ResumenEtiqueta><ResumenValor>{Formato.format(totales.presupuesto)}</ResumenValor></ResumenItem>
        <ResumenItem $tone="green"><ResumenEtiqueta>Gasto final registrado</ResumenEtiqueta><ResumenValor $tone="green">{Formato.format(totales.real)}</ResumenValor></ResumenItem>
        <ResumenItem $tone="orange"><ResumenEtiqueta>Margen contra presupuesto</ResumenEtiqueta><ResumenValor $tone="orange">{Formato.format(totales.presupuesto - totales.real)}</ResumenValor></ResumenItem>
      </ResumenCompras>

      <ListaShell>
        {cargando ? <EstadoVacio>Cargando tu lista de compras...</EstadoVacio> : compras.length === 0 ? <EstadoVacio><FaShoppingBag style={{ fontSize: 22, marginBottom: 8, color: "var(--colorMorado)" }} /><br />Aún no tienes compras próximas. Agrega la primera arriba.</EstadoVacio> : (
          <Tabla aria-label="Lista de compras próximas">
            <thead><tr><th>Compra</th><th>Alta</th><th>Fecha límite</th><th>Fecha compra</th><th>Presupuesto</th><th>Gasto final</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {compras.map((compra) => (
                <Fragment key={compra.id}>
                  <tr>
                    <td><NombreCompra $done={compra.comprada}><Miniatura $imagen={obtenerImagenCategoriaCompra(compra.categoria)} /><span>{compra.nombre}<small style={{ display: "block", marginTop: 2, color: "#91899a", fontWeight: 600 }}>{nombreCategoria(compra.categoria)}</small></span></NombreCompra></td>
                    <td><Fecha><FaCalendarAlt />{fechaLegible(compra.fechaAlta)}</Fecha></td>
                    <td><Fecha><FaCalendarAlt />{fechaLegible(compra.fechaLimite || compra.fechaObjetivo)}</Fecha></td>
                    <td><Fecha><FaCalendarAlt />{fechaLegible(compra.fechaCompra)}</Fecha></td>
                    <td>{Formato.format(Number(compra.presupuesto || 0))}</td>
                    <td>{compra.gastoReal === null || compra.gastoReal === undefined ? "—" : Formato.format(Number(compra.gastoReal || 0))}</td>
                    <td><Estado type="button" $done={compra.comprada} onClick={() => cambiarEstado(compra)}>{compra.comprada ? <FaCheck /> : <FaWallet />} {compra.comprada ? "Comprada" : "Pendiente"}</Estado></td>
                    <td><Acciones><BtnIcono type="button" $active={edicion === compra.id} onClick={() => abrirEdicion(compra)} title="Abrir edición"><FaEdit /><FaChevronDown style={{ transform: edicion === compra.id ? "rotate(180deg)" : "none", transition: "transform .16s ease" }} /></BtnIcono><BtnIcono type="button" $danger onClick={() => eliminar(compra)} title="Eliminar"><FaTrash /></BtnIcono></Acciones></td>
                  </tr>
                  {edicion === compra.id && (
                    <tr>
                      <FilaEdicion colSpan="8">
                        <FormularioEdicion onSubmit={(event) => guardarEdicion(event, compra)}>
                          <CabeceraEdicion><span>Editar compra · fechas y categoría</span><span style={{ color: "#8b8197", fontWeight: 600 }}>Las tres fechas quedan almacenadas</span></CabeceraEdicion>
                          <Campo>Nombre<Input value={formEdicion.nombre} onChange={(event) => setFormEdicion((prev) => ({ ...prev, nombre: event.target.value }))} /></Campo>
                          <Campo>Presupuesto<Input type="number" min="0" step="0.01" value={formEdicion.presupuesto} onChange={(event) => setFormEdicion((prev) => ({ ...prev, presupuesto: event.target.value }))} /></Campo>
                          <Campo>Gasto final<Input type="number" min="0" step="0.01" value={formEdicion.gastoReal} onChange={(event) => setFormEdicion((prev) => ({ ...prev, gastoReal: event.target.value }))} placeholder="Aún no comprada" /></Campo>
                          <Campo>Categoría<SelectorCategoria value={formEdicion.categoria} onChange={(event) => setFormEdicion((prev) => ({ ...prev, categoria: event.target.value }))} /></Campo>
                          <Campo>Fecha de alta<Input type="date" value={formEdicion.fechaAlta} onChange={(event) => setFormEdicion((prev) => ({ ...prev, fechaAlta: event.target.value }))} /></Campo>
                          <Campo>Fecha límite<Input type="date" value={formEdicion.fechaLimite} onChange={(event) => setFormEdicion((prev) => ({ ...prev, fechaLimite: event.target.value }))} /></Campo>
                          <Campo>Fecha de compra<Input type="date" value={formEdicion.fechaCompra} onChange={(event) => setFormEdicion((prev) => ({ ...prev, fechaCompra: event.target.value }))} /></Campo>
                          <AccionesEdicion><BtnCancelar type="button" onClick={() => setEdicion(null)}>Cancelar</BtnCancelar><BtnPrimario type="submit" disabled={guardando}><FaCheck /> {guardando ? "Guardando..." : "Guardar edición"}</BtnPrimario></AccionesEdicion>
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
