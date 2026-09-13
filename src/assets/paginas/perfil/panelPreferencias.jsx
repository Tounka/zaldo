import styled from "styled-components";
import { useState } from "react";
import { FaSlidersH, FaCheck } from "react-icons/fa";
import { useAppStore } from "../../stores/useAppStore";
import { guardarPreferencias } from "../../funciones/firebase/preferencias";
import { CATEGORIAS_COMPRA, obtenerImagenCategoriaCompra } from "../../funciones/categoriasCompra";
import { avisarError } from "../../funciones/utils/avisos";
import { SelectVisual } from "../../componentes/genericos/SelectVisual";

const Seccion = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 18px;

    &:first-of-type { margin-top: 12px; }
`;

const TituloSeccion = styled.h4`
    margin: 0 0 6px;
    color: var(--colorMorado);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
`;

const Opcion = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 13px;
    border: 1px solid ${({ $activo }) => ($activo ? "rgba(83, 59, 143, 0.28)" : "rgba(83, 59, 143, 0.12)")};
    border-radius: 11px;
    background: ${({ $activo }) => ($activo ? "#faf8ff" : "#ffffff")};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover { border-color: rgba(83, 59, 143, 0.34); }
`;

const InfoOpcion = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const NombreOpcion = styled.span`
    color: #322b3d;
    font-size: 13px;
    font-weight: 800;
`;

const DescripcionOpcion = styled.span`
    color: #716b79;
    font-size: 11px;
    line-height: 1.45;
`;

const Interruptor = styled.span`
    position: relative;
    flex-shrink: 0;
    width: 40px;
    height: 23px;
    border-radius: 999px;
    background: ${({ $activo }) => ($activo ? "var(--colorMorado)" : "#cbd5e1")};
    transition: background 0.2s ease;

    &::after {
        content: "";
        position: absolute;
        top: 2.5px;
        left: ${({ $activo }) => ($activo ? "19.5px" : "2.5px")};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
        transition: left 0.2s ease;
    }

    input {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
    }
`;

const SelectorPreferencias = styled(SelectVisual)`
    font-size: 13px;
`;

const AvisoGuardado = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    color: #287a47;
    font-size: 11px;
    font-weight: 800;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition: opacity 0.25s ease;
`;

const OPCIONES = [
    {
        grupo: "Al registrar un movimiento",
        opciones: [
            {
                clave: "gastoPersonalPorDefecto",
                nombre: "Marcar como gasto personal",
                descripcion: "Los gastos nuevos llegan ya marcados como personales. Puedes desmarcarlos uno por uno.",
            },
            {
                clave: "msiPorDefectoEnCredito",
                nombre: "Asumir MSI en tarjetas de crédito",
                descripcion: "En tarjetas de crédito, los gastos arrancan como meses sin intereses en lugar de contado.",
            },
            {
                clave: "recordarUltimaCuenta",
                nombre: "Abrir en la última cuenta usada",
                descripcion: "Salta el paso de elegir cuenta y abre directo en la que usaste la vez pasada.",
            },
        ],
    },
    {
        grupo: "Categorías",
        opciones: [
            {
                clave: "ordenarCategoriasPorUso",
                nombre: "Poner al frente las que más uso",
                descripcion: "Las cuatro categorías más frecuentes suben al principio de la cuadrícula.",
            },
        ],
    },
    {
        grupo: "Recordatorios y presentación",
        opciones: [
            {
                clave: "preguntarGastosRecurrentes",
                nombre: "Preguntar por gastos recurrentes",
                descripcion: "Al entrar, la app pregunta por la renta y suscripciones cuyo día del mes ya pasó.",
            },
            {
                clave: "mostrarCentavos",
                nombre: "Mostrar centavos",
                descripcion: "Los saldos y montos se muestran con dos decimales en vez de redondeados.",
            },
            {
                clave: "preguntarIngresosRecurrentes",
                nombre: "Preguntar por ingresos recurrentes",
                descripcion: "Avisa cuando llega el día de registrar horas trabajadas o cortes semanales (ej. sábados).",
            },
        ],
    },
];

/*
 * Preferencias de captura. Cada cambio se guarda al momento: no hay botón de
 * "guardar" porque son interruptores sueltos, y esperar a confirmar solo
 * agregaría un paso donde no hace falta.
 */
export const PanelPreferencias = () => {
    const { usuario, preferencias, setPreferencias } = useAppStore();
    const [guardado, setGuardado] = useState(false);

    const cambiar = async (clave, valor) => {
        const anterior = preferencias[clave];

        // Se refleja de inmediato y se revierte solo si Firestore falla.
        setPreferencias({ [clave]: valor });

        try {
            await guardarPreferencias(usuario.uid, { [clave]: valor });
            setGuardado(true);
            setTimeout(() => setGuardado(false), 1800);
        } catch (error) {
            setPreferencias({ [clave]: anterior });
            avisarError("No se pudo guardar la preferencia.", error);
        }
    };

    return (
        <>
            {OPCIONES.map((seccion) => (
                <Seccion key={seccion.grupo}>
                    <TituloSeccion>{seccion.grupo}</TituloSeccion>

                    {seccion.opciones.map((opcion) => {
                        const activo = Boolean(preferencias[opcion.clave]);

                        return (
                            <Opcion key={opcion.clave} $activo={activo}>
                                <InfoOpcion>
                                    <NombreOpcion>{opcion.nombre}</NombreOpcion>
                                    <DescripcionOpcion>{opcion.descripcion}</DescripcionOpcion>
                                </InfoOpcion>
                                <Interruptor $activo={activo}>
                                    <input
                                        type="checkbox"
                                        checked={activo}
                                        onChange={(evento) => cambiar(opcion.clave, evento.target.checked)}
                                        aria-label={opcion.nombre}
                                    />
                                </Interruptor>
                            </Opcion>
                        );
                    })}
                </Seccion>
            ))}

            <Seccion>
                <TituloSeccion>Categoría preseleccionada</TituloSeccion>
                <SelectorPreferencias
                    value={preferencias.categoriaPorDefecto || ""}
                    onChange={(evento) => cambiar("categoriaPorDefecto", evento.target.value)}
                    aria-label="Categoría preseleccionada al registrar un movimiento"
                >
                    <option value="">Ninguna (elegir cada vez)</option>
                    {CATEGORIAS_COMPRA.map((categoria) => (
                        <option
                            key={categoria.value}
                            value={categoria.value}
                            imagen={obtenerImagenCategoriaCompra(categoria.value)}
                        >
                            {categoria.label}
                        </option>
                    ))}
                </SelectorPreferencias>
                <DescripcionOpcion style={{ padding: "0 2px" }}>
                    Si casi siempre registras el mismo tipo de gasto, déjala fija y ahórrate ese toque.
                </DescripcionOpcion>
            </Seccion>

            <Seccion>
                <TituloSeccion>Vista predeterminada de percepciones</TituloSeccion>
                <SelectorPreferencias
                    value={preferencias.vistaPreferidaIngresos || "tabla"}
                    onChange={(evento) => cambiar("vistaPreferidaIngresos", evento.target.value)}
                    aria-label="Vista predeterminada de percepciones e ingresos"
                >
                    <option value="tabla">Vista Tabla de Pagos</option>
                    <option value="calendario">Vista Calendario Mensual de Pagos</option>
                </SelectorPreferencias>
                <DescripcionOpcion style={{ padding: "0 2px" }}>
                    Elige cómo prefieres ver los cobros y periodos al entrar a una empresa en el módulo de ingresos.
                </DescripcionOpcion>
            </Seccion>

            <AvisoGuardado $visible={guardado} aria-live="polite">
                <FaCheck /> Preferencia guardada
            </AvisoGuardado>
        </>
    );
};

export const IconoPreferencias = FaSlidersH;
