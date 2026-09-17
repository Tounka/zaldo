import { useCallback, useEffect, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import {
    FaWarehouse,
    FaShoppingCart,
    FaUtensils,
    FaClipboardCheck,
    FaChartLine,
    FaPlus,
    FaSyncAlt,
    FaRobot,
    FaChevronDown,
    FaCheck,
} from "react-icons/fa";
import { AREAS_DESPENSA, colorArea } from "./areasYCategorias";
import { useAppStore } from "../../stores/useAppStore";
import {
    obtenerDespensa,
    obtenerHistorialComprasDespensa,
    obtenerHistorialMovimientosDespensa,
    obtenerMesKey,
    marcarNecesarioDespensa,
    registrarEntradaRapidaDespensa,
    registrarConsumoLoteDespensa,
    conciliarInventarioDespensa,
    registrarEntradaLoteIADespensa,
    debeAgruparAtun,
    agruparAtunYActualizarPrecios,
    guardarEdicionProductoCompleto,
} from "../../funciones/firebase/despensa";
import { avisarError, avisarExito } from "../../funciones/utils/avisos";
import { H2 } from "../../componentes/genericos/titulos";

// Sub-componentes modulares
import { TabInventario } from "./tabs/TabInventario";
import { TabSuper } from "./tabs/TabSuper";
import { TabGastar } from "./tabs/TabGastar";
import { TabConciliacion } from "./tabs/TabConciliacion";
import { TabMetricas } from "./tabs/TabMetricas";
import { ModalEntradaRapida } from "./modales/ModalEntradaRapida";
import { ModalImportarIA } from "./modales/ModalImportarIA";
import { ModalEditarProducto } from "./modales/ModalEditarProducto";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Pagina = styled.div`
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  min-height: 80dvh;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 12px 16px calc(80px + env(safe-area-inset-bottom, 0px));
  animation: ${fadeUp} 0.4s ease;
  box-sizing: border-box;

  @media (max-width: 480px) {
    padding: 10px 12px calc(85px + env(safe-area-inset-bottom, 0px));
    gap: 14px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeaderTituloWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  > svg {
    font-size: 26px;
    color: var(--colorMorado);
    flex-shrink: 0;
  }
`;

const TextosTitulo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SubtituloHeader = styled.span`
  font-size: 13px;
  color: #6b6484;
  font-weight: 500;
`;

const ControlesHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
`;

const GrupoAccionesDesktop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 640px) {
    display: none;
  }
`;

const GrupoAccionesMovil = styled.div`
  display: none;
  align-items: center;
  gap: 6px;

  @media (max-width: 640px) {
    display: flex;
  }
`;

const BtnAccion = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(83, 59, 143, 0.2);
  border-radius: 8px;
  background: white;
  color: var(--colorMorado);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    transform: translateY(-1px);
  }

  svg {
    font-size: 12px;
  }
`;

const BtnPrimario = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--colorMorado);
  border-radius: 8px;
  background: var(--colorMorado);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(83, 59, 143, 0.2);
  transition: all 0.15s ease;

  &:hover {
    background: var(--colorMoradoOscuro, #533b8f);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(83, 59, 143, 0.3);
  }

  svg {
    font-size: 12px;
  }
`;

const girar = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const DropdownWrapper = styled.div`
  position: relative;
`;

const BtnDesplegableVistas = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1.5px solid rgba(83, 59, 143, 0.25);
  border-radius: 9px;
  background: white;
  color: var(--colorMorado, #6c5ce7);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(83, 59, 143, 0.05);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(83, 59, 143, 0.06);
    border-color: var(--colorMorado);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(83, 59, 143, 0.12);
  }

  svg.icono-vista {
    font-size: 13px;
  }

  svg.chevron {
    font-size: 10px;
    color: #8a88a0;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${({ $abierto }) => ($abierto ? "rotate(180deg)" : "rotate(0deg)")};
  }
`;

const MenuDesplegableVistas = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 215px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border: 1px solid rgba(83, 59, 143, 0.14);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 28px rgba(33, 27, 56, 0.14), 0 2px 8px rgba(83, 59, 143, 0.06);
  z-index: 1000;
  transform-origin: top right;
  
  opacity: ${({ $abierto }) => ($abierto ? 1 : 0)};
  transform: ${({ $abierto }) => ($abierto ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.96)")};
  pointer-events: ${({ $abierto }) => ($abierto ? "auto" : "none")};
  visibility: ${({ $abierto }) => ($abierto ? "visible" : "hidden")};
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              visibility 0.2s ease;
`;

const MenuHeader = styled.div`
  padding: 6px 10px 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #8a88a0;
`;

const MenuOpcion = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.09)" : "transparent")};
  color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#211b38")};
  font-size: 12.5px;
  font-weight: ${({ $activo }) => ($activo ? 700 : 600)};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(83, 59, 143, 0.07);
    color: var(--colorMorado);
  }

  .opcion-info {
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
      font-size: 13px;
      color: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#6b6484")};
    }
  }

  svg.check {
    font-size: 11px;
    color: var(--colorMorado);
  }

  svg.girando {
    animation: ${girar} 1s linear infinite;
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: rgba(83, 59, 143, 0.08);
  margin: 4px 6px;
`;

const BarraTabs = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.12);
  border-radius: 12px;
  padding: 6px;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabBoton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 15px;
  border: 1.5px solid ${({ $activo, $colorArea }) => ($activo ? ($colorArea || "var(--colorMorado)") : "transparent")};
  border-radius: 9px;
  background: ${({ $activo, $colorArea }) => ($activo ? ($colorArea || "var(--colorMorado)") : "transparent")};
  color: ${({ $activo }) => ($activo ? "#ffffff" : "#1a1a2e")};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: ${({ $activo }) => ($activo ? "0 2px 8px rgba(0, 0, 0, 0.12)" : "none")};
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: ${({ $activo, $colorArea }) => ($activo ? ($colorArea || "var(--colorMorado)") : "rgba(83, 59, 143, 0.06)")};
    color: ${({ $activo, $colorArea }) => ($activo ? "#ffffff" : ($colorArea || "var(--colorMorado)"))};
    transform: translateY(-1px);
  }

  @media (max-width: 640px) {
    padding: 7px 11px;
    font-size: 12px;
  }
`;

const PantallaCarga = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: #6b6484;
  font-weight: 600;
  background: white;
  border: 1px solid rgba(83, 59, 143, 0.1);
  border-radius: 12px;
`;

const STORAGE_KEY_AREA = "zaldo_despensa_area_activa";
const STORAGE_KEY_TAB = "zaldo_despensa_tab_activo";

const VISTAS_DESPENSA = [
    { id: "inventario", nombre: "Inventario", icono: FaWarehouse },
    { id: "super", nombre: "En el Súper", icono: FaShoppingCart },
    { id: "gastar", nombre: "Gastar", icono: FaUtensils },
    { id: "conciliacion", nombre: "Conciliar", icono: FaClipboardCheck },
    { id: "metricas", nombre: "Métricas", icono: FaChartLine },
];

export const PaginaDespensaUx = () => {
    const { usuario, setDespensaUsuario } = useAppStore();
    const [catalogo, setCatalogo] = useState(null);
    const [inventario, setInventario] = useState(null);
    const [cargando, setCargando] = useState(true);

    // Pestaña activa persistida en memoria
    const [tabActivo, setTabActivoState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_TAB) || "inventario";
        } catch {
            return "inventario";
        }
    });

    const setTabActivo = (nuevoTab) => {
        setTabActivoState(nuevoTab);
        try {
            localStorage.setItem(STORAGE_KEY_TAB, nuevoTab);
        } catch (e) {
            console.warn("Error guardando tab en localStorage:", e);
        }
    };

    // Área activa persistida en memoria (Despensa, Hogar, Baño, Aseo Personal, Todas)
    const [areaActiva, setAreaActivaState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_AREA) || "Todas";
        } catch {
            return "Todas";
        }
    });

    const setAreaActiva = (nuevaArea) => {
        setAreaActivaState(nuevaArea);
        try {
            localStorage.setItem(STORAGE_KEY_AREA, nuevaArea);
        } catch (e) {
            console.warn("Error guardando área en localStorage:", e);
        }
    };

    // Control del desplegable de vistas en el header
    const [menuVistasAbierto, setMenuVistasAbierto] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickAfuera = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setMenuVistasAbierto(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setMenuVistasAbierto(false);
        };
        if (menuVistasAbierto) {
            document.addEventListener("mousedown", handleClickAfuera);
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickAfuera);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [menuVistasAbierto]);

    // Modal Entrada Rápida
    const [modalEntradaAbierto, setModalEntradaAbierto] = useState(false);
    const [productoAComprar, setProductoAComprar] = useState(null);

    // Modal Editar Producto
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState(null);

    // Modal Importar con IA
    const [modalIAAbierto, setModalIAAbierto] = useState(false);

    // Historial para pestaña de métricas
    const [historialCompras, setHistorialCompras] = useState([]);
    const [historialMovimientos, setHistorialMovimientos] = useState([]);
    const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

    const cargarDatos = useCallback(async (forzarFirebase = false) => {
        if (!usuario?.uid) return;

        // Intentar primero desde caché local para 0 lecturas inmediatas (siempre que el atún ya esté agrupado)
        const dataCache = useAppStore.getState().despensaPorUsuario[usuario.uid];
        if (dataCache && !forzarFirebase && !debeAgruparAtun(dataCache.catalogo)) {
            setCatalogo(dataCache.catalogo || null);
            setInventario(dataCache.inventario || null);
            setCargando(false);
            return;
        }

        setCargando(true);
        try {
            const data = await obtenerDespensa(usuario.uid);
            let catalogoFinal = data.catalogo;
            let inventarioFinal = data.inventario;

            // Si el atún está desglosado en productos separados, consolidarlo en 1 solo producto con 2 presentaciones
            // y actualizar los precios de referencia compartidos.
            if (catalogoFinal && debeAgruparAtun(catalogoFinal)) {
                const res = await agruparAtunYActualizarPrecios(usuario.uid, catalogoFinal);
                catalogoFinal = res.catalogo;
                inventarioFinal = res.inventario;
            }

            setCatalogo(catalogoFinal);
            setInventario(inventarioFinal);
            setDespensaUsuario(usuario.uid, { catalogo: catalogoFinal, inventario: inventarioFinal });
        } catch (error) {
            console.error("Error al cargar despensa:", error);
            avisarError("No se pudo cargar la despensa");
        } finally {
            setCargando(false);
        }
    }, [usuario?.uid, setDespensaUsuario]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Cargar historial si entra a la pestaña métricas
    useEffect(() => {
        if (tabActivo === "metricas" && usuario?.uid) {
            const cargarHistoricos = async () => {
                setCargandoMovimientos(true);
                try {
                    const mesKey = obtenerMesKey(new Date());
                    const [compras, movs] = await Promise.all([
                        obtenerHistorialComprasDespensa(usuario.uid, new Date().getFullYear()),
                        obtenerHistorialMovimientosDespensa(usuario.uid, mesKey),
                    ]);
                    setHistorialCompras(compras);
                    setHistorialMovimientos(movs);
                } catch (error) {
                    console.error("Error al cargar históricos:", error);
                } finally {
                    setCargandoMovimientos(false);
                }
            };
            cargarHistoricos();
        }
    }, [tabActivo, usuario?.uid]);

    // Handlers de acciones principales
    const handleAbrirEntrada = (producto = null) => {
        setProductoAComprar(producto);
        setModalEntradaAbierto(true);
    };

    const handleAbrirEditar = (producto) => {
        setProductoAEditar(producto);
        setModalEditarAbierto(true);
    };

    const handleGuardarEdicionProducto = async (productoId, datos) => {
        if (!usuario?.uid) return;
        try {
            const res = await guardarEdicionProductoCompleto(usuario.uid, {
                productoId,
                datos,
                catalogo,
            });
            setCatalogo(res.catalogo);
            setInventario(res.inventario);
            setDespensaUsuario(usuario.uid, res);
            avisarExito("¡Producto actualizado exitosamente!");
        } catch (error) {
            console.error("Error al guardar edición de producto:", error);
            avisarError("No se pudo actualizar el producto");
            throw error;
        }
    };

    const handleGuardarEntradaRapida = async (datos) => {
        if (!usuario?.uid) return;
        try {
            const res = await registrarEntradaRapidaDespensa(usuario.uid, {
                ...datos,
                catalogo,
            });
            setCatalogo(res.catalogo);
            setInventario(res.inventario);
            setDespensaUsuario(usuario.uid, res);
            avisarExito("¡Producto ingresado a la despensa!");
        } catch (error) {
            console.error("Error al guardar entrada:", error);
            avisarError("Ocurrió un error al guardar");
            throw error;
        }
    };

    const handleImportarIA = async (datos) => {
        if (!usuario?.uid) return;
        try {
            const res = await registrarEntradaLoteIADespensa(usuario.uid, {
                ...datos,
                catalogo,
            });
            setCatalogo(res.catalogo);
            setInventario(res.inventario);
            setDespensaUsuario(usuario.uid, res);
            avisarExito(`¡Se importaron ${datos.items.length} productos a tu despensa!`);
        } catch (error) {
            console.error("Error al importar ticket IA:", error);
            avisarError("No se pudo importar el ticket");
            throw error;
        }
    };

    const handleConfirmarGasto = async (consumos, motivo) => {
        if (!usuario?.uid) return;
        try {
            const res = await registrarConsumoLoteDespensa(usuario.uid, {
                consumos,
                motivo,
                catalogo,
            });
            setCatalogo(res.catalogo);
            setInventario(res.inventario);
            setDespensaUsuario(usuario.uid, res);
            avisarExito("¡Consumo registrado exitosamente!");
            setTabActivo("inventario");
        } catch (error) {
            console.error("Error al registrar gasto:", error);
            avisarError("No se pudo registrar el consumo");
            throw error;
        }
    };

    const handleConfirmarComprasSuper = async (compras, tienda) => {
        if (!usuario?.uid) return;
        try {
            let catalogoActual = catalogo;
            let inventarioActual = inventario;
            for (const item of compras) {
                const res = await registrarEntradaRapidaDespensa(usuario.uid, {
                    nombreProducto: item.nombre,
                    nombrePresentacion: item.presentacion?.nombre || "",
                    presentacionId: item.presentacionId,
                    cantidadComprada: Number(item.cantidad || 1),
                    unidad: item.presentacion?.unidad || "pz",
                    costoTotal: Number(item.precioTotal || (item.cantidad * item.precioUnitario)),
                    buenPrecio: Number(item.buenPrecio || 0),
                    area: item.area,
                    categoria: item.categoria,
                    tienda: tienda || "",
                    catalogo: catalogoActual,
                });
                if (res) {
                    catalogoActual = res.catalogo;
                    inventarioActual = res.inventario;
                }
            }
            setCatalogo(catalogoActual);
            setInventario(inventarioActual);
            setDespensaUsuario(usuario.uid, { catalogo: catalogoActual, inventario: inventarioActual });
            avisarExito(`¡Se registraron ${compras.length} compras en tu despensa!`);
            setTabActivo("inventario");
        } catch (error) {
            console.error("Error al registrar compras de súper:", error);
            avisarError("No se pudieron registrar las compras");
            throw error;
        }
    };

    const handleAplicarConciliacion = async (ajustes) => {
        if (!usuario?.uid) return;
        try {
            const res = await conciliarInventarioDespensa(usuario.uid, {
                ajustes,
                catalogo,
            });
            if (res) {
                setCatalogo(res.catalogo);
                setInventario(res.inventario);
                setDespensaUsuario(usuario.uid, res);
                avisarExito("¡Despensa conciliada correctamente!");
            }
        } catch (error) {
            console.error("Error al conciliar despensa:", error);
            avisarError("Error al conciliar inventario");
            throw error;
        }
    };

    const handleAlternarNecesario = async (productoId, nuevoEstado) => {
        if (!usuario?.uid) return;
        try {
            await marcarNecesarioDespensa(usuario.uid, productoId, nuevoEstado, catalogo);
            // Actualización optimista
            setCatalogo((prev) => {
                if (!prev?.productos?.[productoId]) return prev;
                return {
                    ...prev,
                    productos: {
                        ...prev.productos,
                        [productoId]: {
                            ...prev.productos[productoId],
                            necesario: nuevoEstado,
                        },
                    },
                };
            });
        } catch (error) {
            console.error("Error al alternar necesario:", error);
        }
    };

    return (
        <Pagina>
            {/* Encabezado */}
            <Header>
                <HeaderTituloWrapper>
                    <FaWarehouse />
                    <TextosTitulo>
                        <H2 size="22px" color="var(--colorMorado)">
                            Mi Despensa
                        </H2>
                        <SubtituloHeader>Organiza, ahorra y controla lo que tienes en casa</SubtituloHeader>
                    </TextosTitulo>
                </HeaderTituloWrapper>

                <ControlesHeader>
                    {/* Selector desplegable de vistas (sustituye al botón Actualizar) */}
                    <DropdownWrapper ref={dropdownRef}>
                        <BtnDesplegableVistas
                            type="button"
                            $abierto={menuVistasAbierto}
                            onClick={() => setMenuVistasAbierto((prev) => !prev)}
                            title="Cambiar vista de despensa"
                        >
                            {(() => {
                                const vistaActual = VISTAS_DESPENSA.find((v) => v.id === tabActivo) || VISTAS_DESPENSA[0];
                                const Icono = vistaActual.icono;
                                return (
                                    <>
                                        <Icono className="icono-vista" />
                                        <span>{vistaActual.nombre}</span>
                                        <FaChevronDown className="chevron" />
                                    </>
                                );
                            })()}
                        </BtnDesplegableVistas>

                        <MenuDesplegableVistas $abierto={menuVistasAbierto}>
                            <MenuHeader>Vistas de Despensa</MenuHeader>
                            {VISTAS_DESPENSA.map((vista) => {
                                const Icono = vista.icono;
                                const esActivo = tabActivo === vista.id;
                                return (
                                    <MenuOpcion
                                        key={vista.id}
                                        type="button"
                                        $activo={esActivo}
                                        onClick={() => {
                                            setTabActivo(vista.id);
                                            setMenuVistasAbierto(false);
                                        }}
                                    >
                                        <span className="opcion-info">
                                            <Icono />
                                            <span>{vista.nombre}</span>
                                        </span>
                                        {esActivo && <FaCheck className="check" />}
                                    </MenuOpcion>
                                );
                            })}

                            <MenuDivider />

                            <MenuOpcion
                                type="button"
                                onClick={() => {
                                    cargarDatos(true);
                                    setMenuVistasAbierto(false);
                                }}
                                title="Actualizar datos desde Firebase"
                            >
                                <span className="opcion-info">
                                    <FaSyncAlt className={cargando ? "girando" : ""} />
                                    <span>Sincronizar datos</span>
                                </span>
                            </MenuOpcion>
                        </MenuDesplegableVistas>
                    </DropdownWrapper>

                    {/* Acciones para escritorio */}
                    <GrupoAccionesDesktop>
                        <BtnAccion
                            type="button"
                            onClick={() => setModalIAAbierto(true)}
                            title="Importar ticket mediante IA"
                        >
                            <FaRobot /> Ticket IA
                        </BtnAccion>
                        <BtnPrimario
                            type="button"
                            onClick={() => handleAbrirEntrada()}
                            title="Registrar entrada de producto"
                        >
                            <FaPlus /> Entrada
                        </BtnPrimario>
                    </GrupoAccionesDesktop>

                    {/* Acciones para móvil */}
                    <GrupoAccionesMovil>
                        <BtnAccion
                            type="button"
                            onClick={() => setModalIAAbierto(true)}
                            title="Ticket IA"
                        >
                            <FaRobot /> IA
                        </BtnAccion>
                        <BtnPrimario
                            type="button"
                            onClick={() => handleAbrirEntrada()}
                            title="Entrada rápida"
                        >
                            <FaPlus /> Entrada
                        </BtnPrimario>
                    </GrupoAccionesMovil>
                </ControlesHeader>
            </Header>

            {/* Barra de navegación por ÁREAS */}
            <BarraTabs>
                <TabBoton
                    type="button"
                    $activo={areaActiva === "Todas"}
                    onClick={() => setAreaActiva("Todas")}
                >
                    Todas
                </TabBoton>

                {AREAS_DESPENSA.map((areaNombre) => {
                    const color = colorArea(areaNombre);
                    const estaActivo = areaActiva === areaNombre;
                    return (
                        <TabBoton
                            key={areaNombre}
                            type="button"
                            $activo={estaActivo}
                            $colorArea={color}
                            onClick={() => setAreaActiva(areaNombre)}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: estaActivo ? "#ffffff" : color,
                                    display: "inline-block",
                                    transition: "background 0.2s ease",
                                }}
                            />
                            {areaNombre}
                        </TabBoton>
                    );
                })}
            </BarraTabs>

            {/* Contenido principal según pestaña activa */}
            {cargando ? (
                <PantallaCarga>
                    <FaWarehouse style={{ fontSize: "36px", color: "var(--colorMorado, #6c5ce7)" }} />
                    <span>Cargando tu despensa...</span>
                </PantallaCarga>
            ) : (
                <>
                    {tabActivo === "inventario" && (
                        <TabInventario
                            catalogo={catalogo}
                            inventario={inventario}
                            areaActiva={areaActiva}
                            setAreaActiva={setAreaActiva}
                            onAbrirEntrada={handleAbrirEntrada}
                            onAbrirEditar={handleAbrirEditar}
                            onAlternarNecesario={handleAlternarNecesario}
                            onIrAGastar={() => setTabActivo("gastar")}
                        />
                    )}

                    {tabActivo === "super" && (
                        <TabSuper
                            catalogo={catalogo}
                            areaSeleccionada={areaActiva}
                            setAreaSeleccionada={setAreaActiva}
                            onAbrirEntrada={handleAbrirEntrada}
                            onConfirmarCompras={handleConfirmarComprasSuper}
                        />
                    )}

                    {tabActivo === "gastar" && (
                        <TabGastar
                            catalogo={catalogo}
                            onConfirmarGasto={handleConfirmarGasto}
                        />
                    )}

                    {tabActivo === "conciliacion" && (
                        <TabConciliacion
                            catalogo={catalogo}
                            onAplicarConciliacion={handleAplicarConciliacion}
                        />
                    )}

                    {tabActivo === "metricas" && (
                        <TabMetricas
                            catalogo={catalogo}
                            historialCompras={historialCompras}
                            historialMovimientos={historialMovimientos}
                            cargandoMovimientos={cargandoMovimientos}
                        />
                    )}
                </>
            )}

            {/* Modal de Entrada Rápida (3 datos indispensables) */}
            <ModalEntradaRapida
                abierto={modalEntradaAbierto}
                onClose={() => {
                    setModalEntradaAbierto(false);
                    setProductoAComprar(null);
                }}
                onGuardar={handleGuardarEntradaRapida}
                catalogo={catalogo}
                productoPreseleccionado={productoAComprar}
            />

            {/* Modal de Edición de Producto y Presentaciones */}
            <ModalEditarProducto
                abierto={modalEditarAbierto}
                onClose={() => {
                    setModalEditarAbierto(false);
                    setProductoAEditar(null);
                }}
                onGuardar={handleGuardarEdicionProducto}
                producto={productoAEditar}
            />

            {/* Modal de Importación de Ticket con IA */}
            <ModalImportarIA
                abierto={modalIAAbierto}
                onClose={() => setModalIAAbierto(false)}
                onImportar={handleImportarIA}
                catalogo={catalogo}
            />
        </Pagina>
    );
};
