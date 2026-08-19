import styled from "styled-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaCheck, FaEdit, FaPlus, FaShoppingBag, FaTrash, FaWallet } from "react-icons/fa";
import { fnFormatMoney } from "../../funciones/prestamosCalculos";
import {
  actualizarCompraPlaneada,
  crearCompraPlaneada,
  eliminarCompraPlaneada,
  obtenerComprasPlaneadas,
} from "../../funciones/firebase/comprasPlaneadas";
import { useAppStore } from "../../stores/useAppStore";

const Formato = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const formVacio = { nombre: "", presupuesto: "", gastoReal: "", fechaObjetivo: "", categoria: "" };

const PaginaCompras = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FormularioCompra = styled.form`
  display: grid;
  grid-template-columns: minmax(200px, 1.7fr) minmax(140px, .8fr) minmax(140px, .8fr) minmax(140px, .8fr) auto;
  gap: 9px;
  align-items: end;
  padding: 14px;
  border: 1px solid rgba(83, 59, 143, .14);
  border-radius: 13px;
  background: #fff;

  @media (max-width: 900px) {
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
  color: #756d80;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  height: 36px;
  border: 1px solid #ded8e6;
  border-radius: 8px;
  padding: 0 10px;
  color: #2d2636;
  background: #fff;
  font: inherit;
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, .1);
  }
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

const BtnSecundario = styled.button`
  height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid #e2dce9;
  border-radius: 7px;
  background: #fff;
  color: #70687c;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;

  &:hover { border-color: var(--colorMorado); color: var(--colorMorado); }
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
  min-width: 760px;
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
  tr:hover td { background: #fdfbff; }
`;

const NombreCompra = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ $done }) => $done ? "#8b8492" : "#2e2737"};
  font-weight: 800;
  text-decoration: ${({ $done }) => $done ? "line-through" : "none"};
`;

const IconoCompra = styled.span`
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f0ebfa;
  color: var(--colorMorado);
  font-size: 11px;
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
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid #e5dfeb;
  border-radius: 7px;
  background: #fff;
  color: ${({ $danger }) => $danger ? "#c44d5a" : "#756b82"};
  cursor: pointer;

  &:hover { border-color: ${({ $danger }) => $danger ? "#c44d5a" : "var(--colorMorado)"}; }
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
  if (!fecha) return "Sin fecha";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
};

export const ComprasPlaneadas = () => {
  const { usuario } = useAppStore();
  const [compras, setCompras] = useState([]);
  const [form, setForm] = useState(formVacio);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargarCompras = useCallback(async () => {
    if (!usuario?.uid) return;
    setCargando(true);
    try {
      setCompras(await obtenerComprasPlaneadas(usuario.uid));
    } catch (e) {
      console.error("Error al cargar compras planeadas", e);
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

  const actualizarCampo = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError("Escribe qué compra quieres apartar.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      if (editando) {
        const actualizada = await actualizarCompraPlaneada(usuario.uid, editando, { ...form, comprada: compras.find((compra) => compra.id === editando)?.comprada });
        setCompras((prev) => prev.map((compra) => compra.id === editando ? actualizada : compra));
      } else {
        const nueva = await crearCompraPlaneada(usuario.uid, form);
        setCompras((prev) => [nueva, ...prev]);
      }
      setForm(formVacio);
      setEditando(null);
    } catch (e) {
      console.error("Error al guardar compra planeada", e);
      setError("No se pudo guardar la compra. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const editar = (compra) => {
    setEditando(compra.id);
    setForm({ nombre: compra.nombre || "", presupuesto: compra.presupuesto ?? "", gastoReal: compra.gastoReal ?? "", fechaObjetivo: compra.fechaObjetivo || "", categoria: compra.categoria || "" });
    setError("");
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
      if (editando === compra.id) { setEditando(null); setForm(formVacio); }
    } catch {
      setError("No se pudo eliminar la compra.");
    }
  };

  return (
    <PaginaCompras>
      <FormularioCompra onSubmit={guardar}>
        <Campo>¿Qué quieres comprar?<Input value={form.nombre} onChange={(event) => actualizarCampo("nombre", event.target.value)} placeholder="Ej. Monitor nuevo" /></Campo>
        <Campo>Presupuesto<Input type="number" min="0" step="0.01" value={form.presupuesto} onChange={(event) => actualizarCampo("presupuesto", event.target.value)} placeholder="$0" /></Campo>
        <Campo>Gasto final<Input type="number" min="0" step="0.01" value={form.gastoReal} onChange={(event) => actualizarCampo("gastoReal", event.target.value)} placeholder="Al comprar" /></Campo>
        <Campo>Fecha objetivo<Input type="date" value={form.fechaObjetivo} onChange={(event) => actualizarCampo("fechaObjetivo", event.target.value)} /></Campo>
        <BtnPrimario type="submit" disabled={guardando}><FaPlus /> {editando ? "Actualizar" : "Apartar compra"}</BtnPrimario>
      </FormularioCompra>

      {editando && <BtnSecundario type="button" onClick={() => { setEditando(null); setForm(formVacio); }}>Cancelar edición</BtnSecundario>}
      {error && <ErrorTexto>{error}</ErrorTexto>}

      <ResumenCompras>
        <ResumenItem><ResumenEtiqueta>Por apartar · {totales.pendientes} compras</ResumenEtiqueta><ResumenValor>{Formato.format(totales.presupuesto)}</ResumenValor></ResumenItem>
        <ResumenItem $tone="green"><ResumenEtiqueta>Gasto final registrado</ResumenEtiqueta><ResumenValor $tone="green">{Formato.format(totales.real)}</ResumenValor></ResumenItem>
        <ResumenItem $tone="orange"><ResumenEtiqueta>Margen contra presupuesto</ResumenEtiqueta><ResumenValor $tone="orange">{Formato.format(totales.presupuesto - totales.real)}</ResumenValor></ResumenItem>
      </ResumenCompras>

      <ListaShell>
        {cargando ? <EstadoVacio>Cargando tu lista de compras...</EstadoVacio> : compras.length === 0 ? <EstadoVacio><FaShoppingBag style={{ fontSize: 22, marginBottom: 8, color: "var(--colorMorado)" }} /><br />Aún no tienes compras próximas. Agrega la primera arriba.</EstadoVacio> : (
          <Tabla aria-label="Lista de compras próximas">
            <thead><tr><th>Compra</th><th>Fecha objetivo</th><th>Presupuesto</th><th>Gasto final</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {compras.map((compra) => (
                <tr key={compra.id}>
                  <td><NombreCompra $done={compra.comprada}><IconoCompra><FaShoppingBag /></IconoCompra>{compra.nombre}</NombreCompra></td>
                  <td><FaCalendarAlt style={{ marginRight: 5, color: "#8a7ca2" }} />{fechaLegible(compra.fechaObjetivo)}</td>
                  <td>{fnFormatMoney(compra.presupuesto)}</td>
                  <td>{compra.gastoReal === null || compra.gastoReal === undefined ? "—" : fnFormatMoney(compra.gastoReal)}</td>
                  <td><Estado type="button" $done={compra.comprada} onClick={() => cambiarEstado(compra)}>{compra.comprada ? <FaCheck /> : <FaWallet />} {compra.comprada ? "Comprada" : "Pendiente"}</Estado></td>
                  <td><Acciones><BtnIcono type="button" onClick={() => editar(compra)} title="Editar"><FaEdit /></BtnIcono><BtnIcono type="button" $danger onClick={() => eliminar(compra)} title="Eliminar"><FaTrash /></BtnIcono></Acciones></td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </ListaShell>
    </PaginaCompras>
  );
};
