import { useState, useMemo } from "react";
import styled from "styled-components";
import {
    FaRobot,
    FaCopy,
    FaCheck,
    FaTrash,
    FaStore,
    FaCalendarAlt,
    FaDollarSign,
    FaChevronDown,
    FaChevronUp,
    FaListUl,
} from "react-icons/fa";
import { ModalGenerico, ModalEncabezado } from "../../../componentes/modales/ModalGenerico";
import { resolverImagenProducto } from "../iconosDespensa";

/**
 * Genera el prompt inteligente para ChatGPT / Gemini
 * incluyendo la lista de productos y presentaciones que el usuario ya tiene en casa.
 */
export const construirPromptTicketIA = (catalogo) => {
    let seccionCatalogo = "";
    if (catalogo?.productos) {
        const productosActivos = Object.values(catalogo.productos)
            .filter((p) => p.activo)
            .map((p) => {
                const presentaciones = Object.values(p.presentaciones || {})
                    .filter((pr) => pr.activa)
                    .map((pr) => `${pr.nombre || ""} ${pr.cantidad || ""} ${pr.unidad || ""}`.trim())
                    .filter(Boolean)
                    .join(", ");
                return presentaciones
                    ? `- ${p.nombre} [Presentaciones: ${presentaciones}] (Categoría: ${p.categoria || "Despensa"})`
                    : `- ${p.nombre} (Categoría: ${p.categoria || "Despensa"})`;
            });

        if (productosActivos.length > 0) {
            seccionCatalogo = `
7. Catálogo existente en la despensa del usuario:
A continuación tienes los productos que el usuario YA tiene registrados en su casa:
${productosActivos.slice(0, 100).join("\n")}

REGLA DE CONCILIACIÓN CON EL CATÁLOGO:
- Si un artículo del ticket corresponde a uno de los productos de esta lista, USA EXACTAMENTE EL MISMO NOMBRE Y PRESENTACIÓN para evitar duplicados en el inventario.
- Si en el ticket compraste un producto que NO está en esta lista previa, agrégalo sin problema como producto nuevo con su nombre limpio, empaque y categoría correspondiente.
`;
        }
    }

    return `Actúa como un asistente experto en extracción de tickets de compra y despensa mexicana.
Analiza la foto del ticket adjunto y extrae los productos en formato JSON EXACTO, sin texto conversacional previo ni explicaciones. Solo el bloque JSON puro.

Reglas de extracción:
1. Agrupa productos repetidos en un solo elemento sumando la cantidad y el costo total pagado.
2. "categoria": Asigna ESTRICTAMENTE una de las siguientes opciones según el producto:
   - "Despensa" (abarrotes secos, pastas, atún, granos, aceite, café, azúcar, etc.)
   - "Refrigerados" (leche, queso, huevos, carnes, pollo, jamón, crema, etc.)
   - "Limpieza" (detergentes de ropa, cloro, lavatrastes, suavizantes, etc.)
   - "Baño" (papel higiénico, toallitas, etc.)
   - "Higiene" (shampoo, desodorante, jabón corporal, pasta dental, etc.)
   - "Hogar" (servilletas, bolsas de basura, fibras, etc.)
   - "Bebidas" (agua, refrescos, jugos, etc.)
   - "Botanas" (galletas, papas, dulces, etc.)
3. "unidad": Usa estrictamente una de: "pz" (por defecto), "kg", "g", "L", "ml", "paq".
4. "costoTotal": Número float con el total pagado por ese concepto en el ticket.
5. "buenPrecio": Calcula o estima un precio unitario de referencia/oferta razonable para ese producto.
6. "presentacion": Breve descripción del tamaño o empaque (ej. "Lata 140g", "1 Litro", "Bolsa 900g", "1 Pieza").
${seccionCatalogo}
Estructura JSON requerida:
{
  "tienda": "Nombre de la tienda o supermercado",
  "fecha": "YYYY-MM-DD",
  "totalTicket": 0.00,
  "items": [
    {
      "producto": "Nombre limpio del producto",
      "presentacion": "Tamaño o presentación",
      "cantidad": 1,
      "unidad": "pz",
      "costoTotal": 0.00,
      "buenPrecio": 0.00,
      "categoria": "Despensa"
    }
  ]
}`;
};

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  width: 100%;

  @media (min-width: 600px) {
    padding: 18px 22px;
  }
`;

const CajaPrompt = styled.div`
  background: #fbfbfe;
  border: 1.5px solid rgba(83, 59, 143, 0.15);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EncabezadoPaso = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  strong {
    font-size: 14px;
    font-weight: 800;
    color: #211b38;
    display: flex;
    align-items: center;
    gap: 8px;

    svg {
      color: var(--colorMorado, #6c5ce7);
    }
  }
`;

const TextoExplicativo = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: #6b6484;
  line-height: 1.45;
`;

const BadgeCatalogo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(108, 92, 231, 0.08);
  color: var(--colorMorado, #6c5ce7);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  align-self: flex-start;
`;

const BotonCopiar = styled.button`
  height: 44px;
  width: 100%;
  padding: 0 16px;
  background: ${({ $copiado }) => ($copiado ? "#2f7d54" : "var(--colorMorado, #6c5ce7)")};
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 8px ${({ $copiado }) => ($copiado ? "rgba(47, 125, 84, 0.25)" : "rgba(108, 92, 231, 0.25)")};
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${({ $copiado }) => ($copiado ? "rgba(47, 125, 84, 0.35)" : "rgba(108, 92, 231, 0.35)")};
  }

  &:active {
    transform: translateY(0);
  }
`;

const BotonToggleDetalle = styled.button`
  background: transparent;
  border: none;
  color: #8c84a8;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 0;
  align-self: flex-start;
  transition: color 0.15s ease;

  &:hover {
    color: var(--colorMorado, #6c5ce7);
  }
`;

const PrePrompt = styled.pre`
  background: #211b38;
  color: #f6f6fb;
  padding: 12px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
  margin: 4px 0 0;
  font-family: 'SF Mono', 'Fira Code', monospace;
`;

const TextAreaJSON = styled.textarea`
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1.5px solid #e2e0f0;
  border-radius: 12px;
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #211b38;
  background: #ffffff;
  box-sizing: border-box;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--colorMorado, #6c5ce7);
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12);
  }
`;

const CajaResumen = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e2e0f0;
  border-radius: 14px;
  padding: 14px;
  min-width: 0;
`;

const MetadatosTicket = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #6b6484;
  padding-bottom: 8px;
  border-bottom: 1px solid #ecebf6;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    strong {
      color: #211b38;
    }
  }
`;

const ListaPrevia = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  min-width: 0;
`;

const FilaPrevia = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  background: #fbfbfe;
  border-radius: 10px;
  border: 1px solid #ecebf6;
  min-width: 0;

  img {
    width: 36px;
    height: 36px;
    object-fit: contain;
    flex-shrink: 0;
  }

  div.info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;

    strong {
      font-size: 13px;
      color: #211b38;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    small {
      font-size: 11px;
      color: #8c84a8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  div.monto {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;

    strong {
      font-size: 13px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: #2f7d54;
    }

    small {
      font-size: 10px;
      color: #8c84a8;
    }
  }
`;

const BotonQuitar = styled.button`
  background: transparent;
  border: none;
  color: #c0392b;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  font-size: 13px;
  flex-shrink: 0;
  border-radius: 6px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(192, 57, 43, 0.08);
  }
`;

const BotonImportar = styled.button`
  height: 48px;
  width: 100%;
  background: var(--colorMorado, #6c5ce7);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(108, 92, 231, 0.25);
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(108, 92, 231, 0.35);
  }
`;

export const ModalImportarIA = ({ abierto, onClose, onImportar, catalogo }) => {
    const [copiado, setCopiado] = useState(false);
    const [mostrarTextoPrompt, setMostrarTextoPrompt] = useState(false);
    const [jsonTexto, setJsonTexto] = useState("");
    const [itemsEditables, setItemsEditables] = useState([]);
    const [metadatos, setMetadatos] = useState({ tienda: "", fecha: "", totalTicket: 0 });
    const [guardando, setGuardando] = useState(false);

    // Contar productos registrados en catálogo para mostrar feedback al usuario
    const totalProductosRegistrados = useMemo(() => {
        if (!catalogo?.productos) return 0;
        return Object.values(catalogo.productos).filter((p) => p.activo).length;
    }, [catalogo]);

    // Generar prompt dinámico con catálogo incluido
    const promptGenerado = useMemo(() => {
        return construirPromptTicketIA(catalogo);
    }, [catalogo]);

    const copiarPrompt = async () => {
        try {
            await navigator.clipboard.writeText(promptGenerado);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 3000);
        } catch (e) {
            console.error("No se pudo copiar al portapapeles:", e);
        }
    };

    // Procesar el texto ingresado en tiempo real
    const handleTextoChange = (e) => {
        const texto = e.target.value;
        setJsonTexto(texto);

        try {
            // Limpiar bloques de markdown ```json ... ``` si los trae
            const jsonLimpio = texto
                .replace(/^```(json)?/im, "")
                .replace(/```$/im, "")
                .trim();

            if (!jsonLimpio) {
                setItemsEditables([]);
                return;
            }

            const parsed = JSON.parse(jsonLimpio);

            let lista = [];
            let tienda = "";
            let fecha = "";
            let totalTicket = 0;

            if (Array.isArray(parsed)) {
                lista = parsed;
            } else if (parsed.items && Array.isArray(parsed.items)) {
                lista = parsed.items;
                tienda = parsed.tienda || "";
                fecha = parsed.fecha || "";
                totalTicket = Number(parsed.totalTicket || 0);
            }

            // Normalizar ítems con sticker
            const itemsConAvatar = lista.map((it, index) => ({
                idTemp: `ia_${index}_${Date.now()}`,
                producto: it.producto || it.nombre || "Producto",
                presentacion: it.presentacion || `${it.cantidad || 1} ${it.unidad || "pz"}`,
                cantidad: Number(it.cantidad || 1),
                unidad: it.unidad || "pz",
                costoTotal: Number(it.costoTotal || it.precioTotal || 0),
                buenPrecio: Number(it.buenPrecio || 0),
                categoria: it.categoria || "Despensa",
                icono: resolverImagenProducto({
                    nombre: it.producto || it.nombre,
                    categoria: it.categoria,
                    imagen: it.icono,
                }),
            }));

            setItemsEditables(itemsConAvatar);
            setMetadatos({ tienda, fecha, totalTicket });
        } catch (err) {
            // Aún escribiendo o JSON incompleto
            setItemsEditables([]);
        }
    };

    const quitarItem = (idTemp) => {
        setItemsEditables((prev) => prev.filter((it) => it.idTemp !== idTemp));
    };

    const totalCalculado = useMemo(() => {
        return itemsEditables.reduce((acc, it) => acc + (it.costoTotal || 0), 0);
    }, [itemsEditables]);

    const handleConfirmarImportacion = async () => {
        if (!itemsEditables.length) return;
        setGuardando(true);
        try {
            await onImportar({
                items: itemsEditables,
                tienda: metadatos.tienda,
                fecha: metadatos.fecha || new Date(),
                totalTicket: metadatos.totalTicket || totalCalculado,
            });
            setJsonTexto("");
            setItemsEditables([]);
            onClose();
        } catch (error) {
            console.error("Error al importar:", error);
        } finally {
            setGuardando(false);
        }
    };

    if (!abierto) return null;

    return (
        <ModalGenerico
            isOpen={abierto}
            abierto={abierto}
            onClose={onClose}
            maxAncho="580px"
            encabezado={(
                <ModalEncabezado
                    icon={<FaRobot />}
                    title="Importar Ticket con IA"
                    description="Envía la foto de tu ticket a ChatGPT o Gemini y pega el resultado aquí"
                />
            )}
        >
            <Contenedor>
                {/* Paso 1: Copiar el Prompt (limpio, sin mostrar el bloque de texto crudo) */}
                <CajaPrompt>
                    <EncabezadoPaso>
                        <strong>
                            <FaRobot /> 1. Copia el prompt para tu IA
                        </strong>
                        {totalProductosRegistrados > 0 && (
                            <BadgeCatalogo>
                                <FaListUl /> {totalProductosRegistrados} productos enlazados
                            </BadgeCatalogo>
                        )}
                    </EncabezadoPaso>

                    <TextoExplicativo>
                        El prompt incluye automáticamente los productos que ya tienes en casa para que la IA reutilice sus nombres y presentaciones sin duplicarlos. Si compraste productos nuevos, la IA los creará automáticamente.
                    </TextoExplicativo>

                    <BotonCopiar type="button" $copiado={copiado} onClick={copiarPrompt}>
                        {copiado ? <FaCheck /> : <FaCopy />}
                        {copiado ? "¡Prompt con tu catálogo copiado al portapapeles!" : "Copiar Prompt para IA"}
                    </BotonCopiar>

                    {/* Toggle opcional por si el usuario desea inspeccionar el prompt sin ensuciar la pantalla */}
                    <BotonToggleDetalle
                        type="button"
                        onClick={() => setMostrarTextoPrompt((prev) => !prev)}
                    >
                        {mostrarTextoPrompt ? <FaChevronUp /> : <FaChevronDown />}
                        {mostrarTextoPrompt ? "Ocultar texto del prompt" : "Ver texto del prompt"}
                    </BotonToggleDetalle>

                    {mostrarTextoPrompt && (
                        <PrePrompt>{promptGenerado}</PrePrompt>
                    )}
                </CajaPrompt>

                {/* Paso 2: Pegar el JSON devuelto */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <strong style={{ fontSize: "14px", color: "#211b38" }}>
                        2. Pega la respuesta JSON que te dio la IA:
                    </strong>
                    <TextAreaJSON
                        placeholder='Pega aquí el JSON devuelto por ChatGPT o Gemini (ej. { "tienda": "Walmart", "items": [...] })'
                        value={jsonTexto}
                        onChange={handleTextoChange}
                    />
                </div>

                {/* Previsualización de productos leídos */}
                {itemsEditables.length > 0 && (
                    <CajaResumen>
                        <MetadatosTicket>
                            {metadatos.tienda && (
                                <span>
                                    <FaStore /> Tienda: <strong>{metadatos.tienda}</strong>
                                </span>
                            )}
                            <span>
                                <FaDollarSign /> Total: <strong>${(metadatos.totalTicket || totalCalculado).toFixed(2)}</strong>
                            </span>
                            <span>
                                Ítems detectados: <strong>{itemsEditables.length}</strong>
                            </span>
                        </MetadatosTicket>

                        <ListaPrevia>
                            {itemsEditables.map((item) => (
                                <FilaPrevia key={item.idTemp}>
                                    <img
                                        src={item.icono}
                                        alt={item.producto}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = "/despensa/iconos/atun.jpg";
                                        }}
                                    />
                                    <div className="info">
                                        <strong>{item.producto}</strong>
                                        <small>{item.presentacion} • {item.categoria}</small>
                                    </div>
                                    <div className="monto">
                                        <strong>${item.costoTotal.toFixed(2)}</strong>
                                        <small>{item.cantidad} {item.unidad}</small>
                                    </div>
                                    <BotonQuitar
                                        type="button"
                                        onClick={() => quitarItem(item.idTemp)}
                                        title="Quitar ítem"
                                    >
                                        <FaTrash />
                                    </BotonQuitar>
                                </FilaPrevia>
                            ))}
                        </ListaPrevia>
                    </CajaResumen>
                )}

                {/* Botón de confirmación e ingreso en lote */}
                <BotonImportar
                    type="button"
                    disabled={itemsEditables.length === 0 || guardando}
                    onClick={handleConfirmarImportacion}
                >
                    <FaRobot />
                    {guardando
                        ? "Ingresando a tu despensa..."
                        : `Ingresar ${itemsEditables.length} productos a mi Despensa`}
                </BotonImportar>
            </Contenedor>
        </ModalGenerico>
    );
};
