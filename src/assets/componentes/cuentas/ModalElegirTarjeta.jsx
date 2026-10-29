import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion as Motion } from "framer-motion";
import { FaCheck, FaSearch, FaWallet } from "react-icons/fa";
import { ContenedorFormularioGenerico, ModalEncabezado, ModalGenerico } from "../Modales/ModalGenerico";
import { TarjetaVisual } from "../cards/TarjetaVisual";
import { tipoDeCuentaInput } from "../../funciones/utils/esqueletos";
import { adaptadorTxtLabel } from "../../funciones/utils/adaptadorTxtLabel";

const Contenido = styled(ContenedorFormularioGenerico)`
  gap: 14px;
`;

const Barra = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`;

const Buscador = styled.label`
  flex: 1 1 220px;
  min-width: 0;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #e1d9ee;
  border-radius: 12px;
  background: #faf8fd;
  color: #8a7fa0;

  &:focus-within { border-color: var(--colorMorado); box-shadow: 0 0 0 3px rgba(83, 59, 143, .12); }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: #2d2438;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
  }
`;

const Filtros = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Filtro = styled.button`
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#e1d9ee")};
  border-radius: 999px;
  background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#ffffff")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#5a4a78")};
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;

  span { margin-left: 5px; opacity: .7; }
  &:hover { border-color: var(--colorMorado); }
`;

const Rejilla = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
  padding: 4px 2px 6px;
`;

const Opcion = styled(Motion.button)`
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition: transform .16s ease, filter .16s ease;

  &:hover { transform: translateY(-4px); filter: drop-shadow(0 14px 16px rgba(27, 14, 48, .25)); }
  &:focus-visible { outline: 3px solid var(--colorMorado); outline-offset: 3px; }

  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    border: 3px solid ${({ $seleccionada }) => ($seleccionada ? "var(--colorMorado)" : "transparent")};
    border-radius: 19px;
    pointer-events: none;
  }
`;

const MarcaElegida = styled.span`
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  color: var(--colorMorado);
  font-size: 11px;
  box-shadow: 0 3px 8px rgba(20, 12, 35, .3);
`;

const Vacio = styled.div`
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 36px 12px;
  border: 1.5px dashed #ddd3ee;
  border-radius: 14px;
  color: #7d7290;
  font-size: 13px;
  font-weight: 700;
  text-align: center;

  svg { font-size: 22px; color: var(--colorMorado); }
`;

const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase();

export const ModalElegirTarjeta = ({
  isOpen,
  onClose,
  cuentas = [],
  cuentaSeleccionada = null,
  onSeleccionar,
  titulo = "Elige una cuenta",
  descripcion = "Toca la tarjeta que quieres usar.",
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todas");

  useEffect(() => {
    if (!isOpen) return;
    setBusqueda("");
    setTipo("todas");
  }, [isOpen]);

  const tipos = useMemo(() => {
    const conteo = new Map();
    cuentas.forEach((cuenta) => conteo.set(cuenta.tipoDeCuenta, (conteo.get(cuenta.tipoDeCuenta) || 0) + 1));
    return [...conteo.entries()].map(([valor, total]) => ({ valor, total }));
  }, [cuentas]);

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return cuentas.filter((cuenta) =>
      (tipo === "todas" || cuenta.tipoDeCuenta === tipo) &&
      (!termino || normalizar(cuenta.nombre).includes(termino)));
  }, [busqueda, cuentas, tipo]);

  const elegir = (cuenta) => {
    onSeleccionar?.(cuenta);
    onClose?.();
  };

  return (
    <ModalGenerico isOpen={isOpen} onClose={onClose} wide maxAncho="880px">
      <Contenido>
        <ModalEncabezado icon={<FaWallet />} title={titulo} description={descripcion} />

        <Barra>
          <Buscador>
            <FaSearch aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre"
              aria-label="Buscar cuenta por nombre"
            />
          </Buscador>
          {tipos.length > 1 && (
            <Filtros role="group" aria-label="Filtrar por tipo">
              <Filtro type="button" $activo={tipo === "todas"} onClick={() => setTipo("todas")}>
                Todas<span>{cuentas.length}</span>
              </Filtro>
              {tipos.map((item) => (
                <Filtro key={item.valor} type="button" $activo={tipo === item.valor} onClick={() => setTipo(item.valor)}>
                  {adaptadorTxtLabel(tipoDeCuentaInput, item.valor)}<span>{item.total}</span>
                </Filtro>
              ))}
            </Filtros>
          )}
        </Barra>

        {visibles.length ? (
          <Rejilla role="listbox" aria-label={titulo}>
            {visibles.map((cuenta, indice) => {
              const seleccionada = cuentaSeleccionada?.id === cuenta.id;
              return (
                <Opcion
                  key={cuenta.id}
                  type="button"
                  role="option"
                  aria-selected={seleccionada}
                  aria-label={cuenta.nombre}
                  $seleccionada={seleccionada}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(indice, 10) * 0.03 }}
                  onClick={() => elegir(cuenta)}
                >
                  <TarjetaVisual
                    cuenta={cuenta}
                    plana
                    esquina={seleccionada ? <MarcaElegida><FaCheck aria-hidden="true" /></MarcaElegida> : null}
                  />
                </Opcion>
              );
            })}
          </Rejilla>
        ) : (
          <Vacio>
            <FaWallet aria-hidden="true" />
            {cuentas.length ? "Ninguna cuenta coincide con la búsqueda." : "No hay cuentas disponibles."}
          </Vacio>
        )}
      </Contenido>
    </ModalGenerico>
  );
};
