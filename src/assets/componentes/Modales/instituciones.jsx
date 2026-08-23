import { useState, useMemo } from "react";
import styled from "styled-components";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { eliminarInstitucion, altaDeInstitucion } from "../../funciones/firebase/instituciones";
import { ModalGenerico } from "./modalGenerico";
import { FaTrash, FaPlus, FaSearch, FaLandmark, FaWallet, FaCheck, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import { obtenerEstiloInstitucion } from "../../funciones/utils/coloresCategorias";

const ContenedorModal = styled.div`
  width: 520px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 24px 20px;
  box-sizing: border-box;
`;

const Cabecera = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
`;

const IconoCabecera = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 24px;
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.28);
  margin-bottom: 2px;
`;

const Titulo = styled.h2`
  margin: 0;
  color: #1e1b4b;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const Subtitulo = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BadgeTotal = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
  font-size: 11px;
  font-weight: 800;
`;

const BarraAcciones = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const BuscadorWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #94a3b8;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #6366f1;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }

  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #1e293b;
    font-family: inherit;

    &::placeholder {
      color: #94a3b8;
    }
  }
`;

const BtnAgregarToggle = styled.button`
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  }
`;

const FormularioAgregarRapido = styled.form`
  display: flex;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  input {
    flex: 1;
    height: 36px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;

    &:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }
  }
`;

const BtnGuardarRapido = styled.button`
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #059669;
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const BtnCancelarRapido = styled.button`
  height: 36px;
  width: 36px;
  display: grid;
  place-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
    color: #0f172a;
  }
`;

const ListaInstituciones = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 999px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
`;

const TarjetaInstitucion = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: all 0.15s ease;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    transform: translateX(2px);
  }
`;

const InfoInstitucion = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const AvatarInstitucion = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  text-transform: uppercase;
`;

const TextosInstitucion = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const NombreInstitucion = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DetalleCuentas = styled.span`
  font-size: 11px;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const BtnEliminar = styled.button`
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  background: #fef2f2;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: #ef4444;
    color: #fff;
    border-color: #ef4444;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EstadoVacio = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 16px;
  text-align: center;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;

  svg {
    font-size: 32px;
    color: #94a3b8;
  }

  strong {
    color: #334155;
    font-size: 14px;
  }

  p {
    margin: 0;
    font-size: 12px;
  }
`;

const obtenerIniciales = (nombre = "") => {
  const partes = nombre.trim().split(" ").filter(Boolean);
  if (partes.length === 0) return "IN";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

export const ModalInstituciones = () => {
  const { instituciones, setInstituciones, cuentas, usuario } = useAppStore();
  const { isOpenInstituciones, setIsOpenInstituciones } = useModalStore();

  const [busqueda, setBusqueda] = useState("");
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const onClose = () => {
    setIsOpenInstituciones(false);
    setMostrarAgregar(false);
    setBusqueda("");
  };

  const institucionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return instituciones;
    const q = busqueda.toLowerCase().trim();
    return instituciones.filter((inst) =>
      String(inst?.nombre || "").toLowerCase().includes(q)
    );
  }, [instituciones, busqueda]);

  const obtenerCuentasAsociadas = (institucion) => {
    if (!Array.isArray(cuentas)) return 0;
    return cuentas.filter(
      (c) => c.institucion === institucion.id || c.institucion === institucion.nombre
    ).length;
  };

  const handleAgregarRapido = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    setLoading(true);
    try {
      const institucionNueva = await altaDeInstitucion(
        { nombreInstitucion: nuevoNombre.trim() },
        usuario.uid
      );
      if (institucionNueva) {
        setInstituciones((prev) => [...prev, institucionNueva]);
        setNuevoNombre("");
        setMostrarAgregar(false);
        Swal.fire({
          title: "Institución agregada",
          text: `"${nuevoNombre.trim()}" ha sido registrada con éxito.`,
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id, nombre) => {
    const result = await Swal.fire({
      title: "¿Eliminar institución?",
      text: `Se desactivará "${nombre}". Las cuentas asociadas seguirán existiendo.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    const ok = await eliminarInstitucion(usuario.uid, id);
    setLoading(false);

    if (ok) {
      setInstituciones((prev) => prev.filter((inst) => inst.id !== id));
      Swal.fire({
        title: "Institución eliminada",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });
    }
  };

  return (
    <ModalGenerico isOpen={isOpenInstituciones} onClose={onClose}>
      <ContenedorModal>
        <Cabecera>
          <IconoCabecera>
            <FaLandmark />
          </IconoCabecera>
          <Titulo>Instituciones</Titulo>
          <Subtitulo>
            Bancos, billeteras y entidades registradas
            <BadgeTotal>{instituciones.length}</BadgeTotal>
          </Subtitulo>
        </Cabecera>

        <BarraAcciones>
          <BuscadorWrapper>
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar institución..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </BuscadorWrapper>
          {!mostrarAgregar && (
            <BtnAgregarToggle
              type="button"
              onClick={() => setMostrarAgregar(true)}
            >
              <FaPlus /> Nueva
            </BtnAgregarToggle>
          )}
        </BarraAcciones>

        {mostrarAgregar && (
          <FormularioAgregarRapido onSubmit={handleAgregarRapido}>
            <input
              autoFocus
              type="text"
              placeholder="Ej. Santander, BBVA, Nu..."
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
            <BtnGuardarRapido type="submit" disabled={loading || !nuevoNombre.trim()}>
              <FaCheck /> Agregar
            </BtnGuardarRapido>
            <BtnCancelarRapido
              type="button"
              onClick={() => {
                setMostrarAgregar(false);
                setNuevoNombre("");
              }}
            >
              <FaTimes />
            </BtnCancelarRapido>
          </FormularioAgregarRapido>
        )}

        <ListaInstituciones>
          {institucionesFiltradas.length > 0 ? (
            institucionesFiltradas.map((inst) => {
              const estilo = obtenerEstiloInstitucion(inst.nombre);
              const totalCuentas = obtenerCuentasAsociadas(inst);

              return (
                <TarjetaInstitucion key={inst.id}>
                  <InfoInstitucion>
                    <AvatarInstitucion $bg={estilo.bg} $color={estilo.color}>
                      {obtenerIniciales(inst.nombre)}
                    </AvatarInstitucion>
                    <TextosInstitucion>
                      <NombreInstitucion>{inst.nombre}</NombreInstitucion>
                      <DetalleCuentas>
                        <FaWallet style={{ fontSize: 10, color: estilo.accent }} />
                        {totalCuentas === 1
                          ? "1 cuenta vinculada"
                          : `${totalCuentas} cuentas vinculadas`}
                      </DetalleCuentas>
                    </TextosInstitucion>
                  </InfoInstitucion>

                  <BtnEliminar
                    type="button"
                    title="Eliminar institución"
                    disabled={loading}
                    onClick={() => handleEliminar(inst.id, inst.nombre)}
                  >
                    <FaTrash />
                  </BtnEliminar>
                </TarjetaInstitucion>
              );
            })
          ) : (
            <EstadoVacio>
              <FaLandmark />
              <strong>
                {busqueda
                  ? "No se encontraron instituciones"
                  : "Aún no tienes instituciones"}
              </strong>
              <p>
                {busqueda
                  ? `No hay coincidencias para "${busqueda}"`
                  : "Registra tu primer banco o billetera para vincular tus cuentas."}
              </p>
            </EstadoVacio>
          )}
        </ListaInstituciones>
      </ContenedorModal>
    </ModalGenerico>
  );
};
