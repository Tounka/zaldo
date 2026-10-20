import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../stores/useAppStore";
import { useModalStore } from "../../stores/useModalStore";
import { interpretarCaptura } from "../../funciones/ia/interpretarCaptura";
import { CATEGORIAS_CAPTURA, TIPOS_CAPTURA } from "../../funciones/ia/contratoCaptura";
import { ErrorCapturaIA, solicitarCaptura } from "../../funciones/ia/solicitarCaptura";
import { RUTAS_ASISTENTE } from "../../funciones/ia/contratoConsulta";
import { responderConsulta } from "../../funciones/ia/responderConsulta";
import {
  registrarMovimiento,
  registrarMovimientoEntreCuentas,
} from "../../funciones/registrarMovimientos";
import {
  obtenerCatalogoDespensa,
  registrarCompraDespensa,
} from "../../funciones/registrarCompraDespensa";
import { ordenarCategoriasPorUso } from "../../funciones/utils/preferenciasCaptura";
import { formatearMonedaSegunPreferencia } from "../../funciones/utils/moneda";
import { fechaCortaLegible, fechaLocalISO } from "../../funciones/utils/fechas";

/*
 * Conversación del asistente de captura.
 *
 * La IA solo propone (interpretarCaptura ya validó cuentas, montos y fechas).
 * Lo que falte se pregunta aquí, una cosa a la vez, con opciones que se
 * pueden tocar o escribir. Nada se guarda sin un "Guardar" explícito, y el
 * guardado pasa por registrarMovimientos, el mismo camino que los modales.
 *
 * Una compra del súper ("compré 2 leches y detergente") llega como propuesta
 * "despensa": primero se confirman los productos y luego se propone el gasto
 * en la cuenta, que el usuario puede cancelar.
 *
 * Las preguntas ("¿en qué gasté más este mes?") llegan como `consulta`: la
 * IA solo dice qué se pregunta y responderConsulta calcula la respuesta con
 * los datos reales, en el navegador.
 *
 * Una foto (ticket o productos) viaja reducida junto al mensaje y se trata
 * igual que un texto: la IA propone y el usuario confirma.
 *
 * La conversación vive solo en memoria: contiene datos financieros y no se
 * guarda en localStorage.
 */

const PASOS = {
  CUENTA: "cuenta",
  ORIGEN: "origen",
  DESTINO: "destino",
  CATEGORIA: "categoria",
  CONFIRMAR: "confirmar",
};

const OPCION = {
  GUARDAR: "__guardar",
  EDITAR: "__editar",
  CANCELAR: "__cancelar",
};

const PALABRAS_SI = ["si", "sí", "ok", "va", "dale", "guardar", "guarda", "guardalo", "confirmar", "listo", "correcto"];
const PALABRAS_NO = ["no", "cancelar", "cancela", "olvidalo", "nada"];

const CATEGORIAS_POR_PREGUNTA = 8;

let contadorMensajes = 0;
const nuevoId = () => `m${Date.now()}-${++contadorMensajes}`;

const normalizar = (texto) => String(texto || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[¡!¿?.,]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const mensajeBienvenida = () => ({
  id: nuevoId(),
  autor: "bot",
  /* El panel la dibuja como tarjeta (BienvenidaAsistente); el texto sigue en el historial. */
  tipo: "bienvenida",
  texto: "Hola, soy tu asistente de Zaldo. Cuéntame qué gastaste, recibiste o moviste entre cuentas, mándame la foto de un ticket, o pregúntame por tus gastos, saldos, ahorros o despensa.",
});

const cuentasActivas = () => useAppStore.getState().cuentas
  .filter((cuenta) => cuenta?.id && cuenta.activo !== false);

// Siempre la versión del store: otro guardado pudo cambiar el saldo.
const cuentaVigente = (cuenta) => (cuenta
  ? useAppStore.getState().cuentas.find((actual) => actual.id === cuenta.id) || cuenta
  : null);

const etiquetaCategoria = (valor) => CATEGORIAS_CAPTURA
  .find((categoria) => categoria.value === valor)?.label || "Sin categoría";

const NOMBRE_TIPO = {
  [TIPOS_CAPTURA.GASTO]: "gasto",
  [TIPOS_CAPTURA.INGRESO]: "ingreso",
};

/* Qué falta para poder confirmar. */
const siguientePaso = (propuesta) => {
  if (propuesta.accion === "despensa") return PASOS.CONFIRMAR;

  if (propuesta.accion === "transferencia") {
    if (!propuesta.cuentaOrigen) return PASOS.ORIGEN;
    if (!propuesta.cuentaDestino) return PASOS.DESTINO;
    return PASOS.CONFIRMAR;
  }

  if (!propuesta.cuenta) return PASOS.CUENTA;
  if (!propuesta.valores.categoria && !propuesta.categoriaRespondida) return PASOS.CATEGORIA;
  return PASOS.CONFIRMAR;
};

/*
 * Valores finales para guardar: el pago a meses solo aplica a gastos con
 * crédito, y si la IA no lo dijo se usa la preferencia del usuario.
 */
const valoresFinales = (propuesta) => {
  const { valores } = propuesta;
  const cuenta = cuentaVigente(propuesta.cuenta);
  const esGastoCredito = valores.tipoDeMovimiento === TIPOS_CAPTURA.GASTO && cuenta?.tipoDeCuenta === "credito";
  const msiPorDefecto = useAppStore.getState().preferencias?.msiPorDefectoEnCredito;

  return {
    ...valores,
    pagoAMeses: esGastoCredito ? valores.pagoAMeses || (msiPorDefecto ? "msi" : "revolvente") : null,
  };
};

/*
 * Las advertencias sobre algo que se va a preguntar (cuenta, categoría) sobran
 * en el resumen: para entonces el usuario ya lo eligió.
 */
const advertenciasVigentes = (propuesta) => (propuesta.advertencias || [])
  .filter((texto) => !(propuesta.cuentaPreguntada && /cuenta|origen|destino/i.test(texto)))
  .filter((texto) => !(propuesta.categoriaRespondida && /categor/i.test(texto)));

const describirProducto = ({ cantidad, unidad, producto, presentacion }) => {
  const medida = unidad === "pz" ? `${cantidad} ×` : `${cantidad} ${unidad}`;
  return `${medida} ${producto}${presentacion ? ` (${presentacion})` : ""}`;
};

const resumenDespensa = (propuesta) => ({
  titulo: `Despensa · ${propuesta.items.length} producto${propuesta.items.length === 1 ? "" : "s"}`,
  monto: propuesta.totalTicket ? formatearMonedaSegunPreferencia(propuesta.totalTicket) : "",
  tono: "despensa",
  filas: [
    ...propuesta.items.map((item) => [
      describirProducto(item),
      item.costoTotal ? formatearMonedaSegunPreferencia(item.costoTotal) : "",
    ]),
    propuesta.tienda ? ["Tienda", propuesta.tienda] : null,
    ["Fecha", propuesta.fecha === fechaLocalISO() ? "Hoy" : fechaCortaLegible(propuesta.fecha)],
  ].filter(Boolean),
  advertencias: propuesta.advertencias || [],
});

/*
 * Gasto que acompaña a una compra de despensa. Ya va con su categoría, así
 * que solo se pregunta la cuenta si la IA no la identificó.
 */
const gastoDeDespensa = (compra) => ({
  accion: "movimiento",
  cuenta: compra.cuenta,
  valores: {
    tipoDeMovimiento: TIPOS_CAPTURA.GASTO,
    monto: String(compra.totalTicket),
    categoria: "despensa",
    nota: compra.tienda ? `Súper ${compra.tienda}` : "Compra de despensa",
    fechaMovimiento: compra.fecha,
    esPersonal: false,
    esExtraordinario: false,
  },
  advertencias: [],
  categoriaRespondida: true,
});

const construirResumen = (propuesta) => {
  if (propuesta.accion === "despensa") return resumenDespensa(propuesta);

  if (propuesta.accion === "transferencia") {
    const destino = cuentaVigente(propuesta.cuentaDestino);
    return {
      titulo: destino?.tipoDeCuenta === "credito" ? "Pago de tarjeta" : "Transferencia",
      monto: formatearMonedaSegunPreferencia(propuesta.monto),
      tono: "transferencia",
      filas: [
        ["De", cuentaVigente(propuesta.cuentaOrigen)?.nombre],
        ["A", destino?.nombre],
        ["Fecha", "Hoy"],
        propuesta.nota ? ["Nota", propuesta.nota] : null,
      ].filter(Boolean),
      advertencias: advertenciasVigentes(propuesta),
    };
  }

  const valores = valoresFinales(propuesta);
  const esGasto = valores.tipoDeMovimiento === TIPOS_CAPTURA.GASTO;
  const fecha = valores.fechaMovimiento === fechaLocalISO() ? "Hoy" : fechaCortaLegible(valores.fechaMovimiento);
  const etiquetas = [
    valores.pagoAMeses === "msi" ? "A meses sin intereses" : null,
    valores.esPersonal ? "Personal" : null,
    valores.esExtraordinario ? "Extraordinario" : null,
  ].filter(Boolean);

  return {
    titulo: esGasto ? "Gasto" : "Ingreso",
    monto: `${esGasto ? "-" : "+"}${formatearMonedaSegunPreferencia(valores.monto)}`,
    tono: esGasto ? "gasto" : "ingreso",
    filas: [
      ["Cuenta", cuentaVigente(propuesta.cuenta)?.nombre],
      ["Categoría", etiquetaCategoria(valores.categoria)],
      ["Fecha", fecha],
      valores.nota ? ["Nota", valores.nota] : null,
      etiquetas.length ? ["Detalle", etiquetas.join(" · ")] : null,
    ].filter(Boolean),
    advertencias: advertenciasVigentes(propuesta),
  };
};

const opcionesCuentas = (excluirId) => [
  ...cuentasActivas()
    .filter((cuenta) => cuenta.id !== excluirId)
    .map((cuenta) => ({ valor: cuenta.id, etiqueta: cuenta.nombre })),
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

const categoriasPara = (propuesta) => CATEGORIAS_CAPTURA.filter((categoria) => (
  propuesta.valores.tipoDeMovimiento === TIPOS_CAPTURA.INGRESO || categoria.value !== "ingreso"
));

const opcionesCategorias = (propuesta) => [
  ...ordenarCategoriasPorUso(categoriasPara(propuesta))
    .slice(0, CATEGORIAS_POR_PREGUNTA)
    .map((categoria) => ({ valor: categoria.value, etiqueta: categoria.label })),
  { valor: "", etiqueta: "Sin categoría", tono: "neutro" },
];

const OPCIONES_CONFIRMAR = [
  { valor: OPCION.GUARDAR, etiqueta: "Guardar", tono: "principal" },
  { valor: OPCION.EDITAR, etiqueta: "Editar en formulario", tono: "editar" },
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

const OPCIONES_CONFIRMAR_DESPENSA = [
  { valor: OPCION.GUARDAR, etiqueta: "Agregar a la despensa", tono: "principal" },
  { valor: OPCION.CANCELAR, etiqueta: "Cancelar", tono: "cancelar" },
];

/*
 * Busca lo que el usuario escribió entre las opciones de la pregunta. Para
 * categorías se buscan todas, no solo las que se mostraron como botón.
 */
const buscarOpcionEscrita = (texto, pregunta, propuesta) => {
  const buscado = normalizar(texto);
  if (!buscado) return null;

  if (PALABRAS_NO.includes(buscado)) return { valor: OPCION.CANCELAR, etiqueta: texto };

  if (pregunta.paso === PASOS.CONFIRMAR) {
    if (PALABRAS_SI.includes(buscado)) return { valor: OPCION.GUARDAR, etiqueta: texto };
    if (buscado.startsWith("editar") && propuesta.accion !== "despensa") {
      return { valor: OPCION.EDITAR, etiqueta: texto };
    }
    return null;
  }

  const candidatas = pregunta.paso === PASOS.CATEGORIA
    ? [
      ...categoriasPara(propuesta).map((categoria) => ({ valor: categoria.value, etiqueta: categoria.label })),
      { valor: "", etiqueta: "Sin categoría" },
    ]
    : pregunta.opciones.filter((opcion) => !opcion.valor.startsWith("__"));

  const exactas = candidatas.filter((opcion) => normalizar(opcion.etiqueta) === buscado);
  if (exactas.length === 1) return exactas[0];

  // "la bbva" → "BBVA Oro": se acepta solo si hay una única coincidencia.
  const parciales = candidatas.filter((opcion) => {
    const etiqueta = normalizar(opcion.etiqueta);
    return etiqueta && (etiqueta.includes(buscado) || buscado.includes(etiqueta));
  });
  return parciales.length === 1 ? parciales[0] : null;
};

export const useConversacionCaptura = () => {
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState(() => [mensajeBienvenida()]);
  const [pensando, setPensando] = useState(false);
  const [estadoAvatar, setEstadoAvatar] = useState("reposo");
  /* Pregunta activa: { paso, mensajeId, opciones }. Solo esa acepta respuesta. */
  const [pregunta, setPregunta] = useState(null);

  const colaRef = useRef([]);
  const actualRef = useRef(null);
  const temporizadorFelizRef = useRef(null);

  const agregar = useCallback((mensaje) => {
    const completo = { id: nuevoId(), ...mensaje };
    setMensajes((previos) => [...previos, completo]);
    return completo.id;
  }, []);

  const decirBot = useCallback((texto, extra = {}) => agregar({ autor: "bot", texto, ...extra }), [agregar]);

  const celebrar = useCallback(() => {
    clearTimeout(temporizadorFelizRef.current);
    setEstadoAvatar("feliz");
    temporizadorFelizRef.current = setTimeout(() => setEstadoAvatar("reposo"), 2500);
  }, []);

  const preguntar = useCallback((propuesta) => {
    const paso = siguientePaso(propuesta);
    let texto;
    let opciones;
    let resumen;

    switch (paso) {
      case PASOS.CUENTA:
        propuesta.cuentaPreguntada = true;
        texto = `¿Con qué cuenta fue este ${NOMBRE_TIPO[propuesta.valores.tipoDeMovimiento]} de ${formatearMonedaSegunPreferencia(propuesta.valores.monto)}?`;
        opciones = opcionesCuentas();
        break;
      case PASOS.ORIGEN:
        propuesta.cuentaPreguntada = true;
        texto = `¿De qué cuenta salen los ${formatearMonedaSegunPreferencia(propuesta.monto)}?`;
        opciones = opcionesCuentas(propuesta.cuentaDestino?.id);
        break;
      case PASOS.DESTINO:
        propuesta.cuentaPreguntada = true;
        texto = `¿A qué cuenta van los ${formatearMonedaSegunPreferencia(propuesta.monto)}?`;
        opciones = opcionesCuentas(propuesta.cuentaOrigen?.id);
        break;
      case PASOS.CATEGORIA:
        texto = `¿En qué categoría lo pongo?${propuesta.valores.nota ? ` (${propuesta.valores.nota})` : ""}`;
        opciones = opcionesCategorias(propuesta);
        break;
      default:
        texto = propuesta.accion === "despensa"
          ? "¿Agrego esto a tu despensa?"
          : propuesta.esGastoDeDespensa ? "¿Registro también el gasto en tu cuenta?" : "¿Lo guardo así?";
        opciones = propuesta.accion === "despensa" ? OPCIONES_CONFIRMAR_DESPENSA : OPCIONES_CONFIRMAR;
        resumen = construirResumen(propuesta);
    }

    const mensajeId = decirBot(texto, { opciones, resumen });
    setPregunta({ paso, mensajeId, opciones });
  }, [decirBot]);

  /* Pasa a la siguiente propuesta de la cola, o termina. */
  const continuar = useCallback(() => {
    if (!actualRef.current) actualRef.current = colaRef.current.shift() || null;

    if (actualRef.current) {
      preguntar(actualRef.current);
      return;
    }

    setPregunta(null);
  }, [preguntar]);

  const terminarActual = useCallback(() => {
    actualRef.current = null;
    continuar();
  }, [continuar]);

  const guardar = useCallback(async (propuesta) => {
    const uid = useAppStore.getState().usuario?.uid;
    setPregunta(null);
    setPensando(true);
    setEstadoAvatar("pensando");

    try {
      if (propuesta.accion === "despensa") {
        const resultado = await registrarCompraDespensa({ uid, compra: propuesta });
        celebrar();
        const cuantos = resultado.totalImportados ?? propuesta.items.length;
        decirBot(`Agregué ${cuantos} producto${cuantos === 1 ? "" : "s"} a tu despensa.`, { estado: "exito" });

        if (propuesta.totalTicket > 0) {
          // Va al frente de la cola: es parte de la misma compra.
          colaRef.current.unshift({ ...gastoDeDespensa(propuesta), esGastoDeDespensa: true });
        } else {
          decirBot("No me dijiste cuánto pagaste, así que no registré el gasto. Si quieres, dime algo como “pagué 380 del súper con la BBVA”.");
        }
      } else if (propuesta.accion === "transferencia") {
        const resultado = await registrarMovimientoEntreCuentas({
          cuentaOrigen: cuentaVigente(propuesta.cuentaOrigen),
          cuentaDestino: cuentaVigente(propuesta.cuentaDestino),
          monto: propuesta.monto,
          nota: propuesta.nota,
          uid,
        });

        if (resultado) {
          celebrar();
          decirBot(`Listo. Moví ${formatearMonedaSegunPreferencia(propuesta.monto)} de ${resultado.cuentaOrigen.nombre} a ${resultado.cuentaDestino.nombre}.`, { estado: "exito" });
        } else {
          setEstadoAvatar("reposo");
          decirBot("No pude guardar la transferencia. Inténtalo de nuevo en un momento.");
        }
      } else {
        const resultado = await registrarMovimiento({
          valores: valoresFinales(propuesta),
          cuenta: cuentaVigente(propuesta.cuenta),
          uid,
        });

        if (resultado) {
          celebrar();
          const tipo = NOMBRE_TIPO[propuesta.valores.tipoDeMovimiento];
          decirBot(`Listo. Guardé el ${tipo} de ${formatearMonedaSegunPreferencia(propuesta.valores.monto)}. Saldo de ${resultado.cuenta.nombre}: ${formatearMonedaSegunPreferencia(resultado.cuenta.saldoALaFecha)}.`, { estado: "exito" });
        } else {
          setEstadoAvatar("reposo");
          decirBot("No pude guardar el movimiento. Inténtalo de nuevo en un momento.");
        }
      }
    } catch (error) {
      console.error("Error al guardar desde el asistente", error);
      setEstadoAvatar("reposo");
      decirBot("Algo falló al guardar. Inténtalo de nuevo.");
    } finally {
      setPensando(false);
    }

    terminarActual();
  }, [celebrar, decirBot, terminarActual]);

  const editarEnFormulario = useCallback((propuesta) => {
    const modales = useModalStore.getState();

    if (propuesta.accion === "transferencia") {
      modales.abrirMovimientoEntreCuentas({
        cuentaOrigen: cuentaVigente(propuesta.cuentaOrigen),
        cuentaDestino: cuentaVigente(propuesta.cuentaDestino),
        valores: { monto: propuesta.monto, nota: propuesta.nota },
      });
    } else {
      modales.abrirAgregarMovimiento({
        cuenta: cuentaVigente(propuesta.cuenta),
        valores: valoresFinales(propuesta),
      });
    }

    decirBot("Te abrí el formulario con los datos. Ajusta lo que necesites y guárdalo desde ahí.");
    terminarActual();
  }, [decirBot, terminarActual]);

  const aplicarRespuesta = useCallback((opcion) => {
    const propuesta = actualRef.current;
    if (!propuesta || !pregunta) return;

    agregar({ autor: "usuario", texto: opcion.etiqueta });

    if (opcion.valor === OPCION.CANCELAR) {
      setPregunta(null);
      decirBot("Va, no guardé nada de eso.");
      terminarActual();
      return;
    }

    if (opcion.valor === OPCION.GUARDAR) {
      guardar(propuesta);
      return;
    }

    if (opcion.valor === OPCION.EDITAR) {
      setPregunta(null);
      editarEnFormulario(propuesta);
      return;
    }

    const cuenta = cuentasActivas().find((actual) => actual.id === opcion.valor);
    switch (pregunta.paso) {
      case PASOS.CUENTA:
        propuesta.cuenta = cuenta;
        break;
      case PASOS.ORIGEN:
        propuesta.cuentaOrigen = cuenta;
        break;
      case PASOS.DESTINO:
        propuesta.cuentaDestino = cuenta;
        break;
      case PASOS.CATEGORIA:
        propuesta.valores = { ...propuesta.valores, categoria: opcion.valor };
        propuesta.categoriaRespondida = true;
        break;
      default:
        break;
    }

    preguntar(propuesta);
  }, [agregar, decirBot, editarEnFormulario, guardar, pregunta, preguntar, terminarActual]);

  const consultarIA = useCallback(async (texto, imagen = null) => {
    setPensando(true);
    setEstadoAvatar("pensando");

    try {
      const cuentas = cuentasActivas();
      const uid = useAppStore.getState().usuario?.uid;
      // Sin catálogo igual se puede capturar; solo habría más riesgo de duplicar productos.
      const catalogoDespensa = uid ? await obtenerCatalogoDespensa(uid).catch(() => null) : null;
      const respuesta = await solicitarCaptura({ mensaje: texto, cuentas, catalogoDespensa, imagen });
      const {
        propuestas,
        descartadas,
        despensa,
        consulta,
        respuesta: textoLibre,
        irA,
      } = interpretarCaptura(respuesta, { cuentas });
      if (despensa) propuestas.unshift({ accion: "despensa", ...despensa });

      // Una pregunta se responde con los datos reales; nunca con cifras de la IA.
      const respuestaConsulta = consulta && propuestas.length === 0
        ? await responderConsulta(consulta, { uid })
        : null;

      // Los ingresos sin categoría van a "Ingreso": no tiene caso preguntarlo.
      propuestas.forEach((propuesta) => {
        if (propuesta.accion === "movimiento"
          && propuesta.valores.tipoDeMovimiento === TIPOS_CAPTURA.INGRESO
          && !propuesta.valores.categoria) {
          propuesta.valores.categoria = "ingreso";
        }
      });

      setEstadoAvatar("reposo");
      setPensando(false);

      if (irA) {
        navigate(irA);
        decirBot(`Te llevé a ${RUTAS_ASISTENTE[irA]}.`, { estado: "exito" });
      }

      if (respuestaConsulta) {
        decirBot(respuestaConsulta.texto, { resumen: respuestaConsulta.resumen });
        return;
      }

      // Si se entendió algo útil, los "no es una captura" sobran.
      if (propuestas.length > 0 || !textoLibre) {
        descartadas.forEach(({ motivo }) => decirBot(motivo, { estado: "aviso" }));
      }

      if (propuestas.length === 0) {
        if (textoLibre) decirBot(textoLibre);
        else if (!irA) {
          decirBot(imagen
            ? "No encontré nada que registrar en esa imagen. Prueba con una foto más clara del ticket."
            : "No entendí si quieres registrar algo o preguntar por tus datos. Prueba con “gasté 150 en tacos con efectivo” o “¿en qué gasté más este mes?”.");
        }
        return;
      }

      if (propuestas.length > 1) {
        decirBot(`Encontré ${propuestas.length} cosas por registrar. Vamos una por una.`);
      }

      colaRef.current.push(...propuestas);
      continuar();
    } catch (error) {
      setEstadoAvatar("reposo");
      setPensando(false);
      if (!(error instanceof ErrorCapturaIA)) console.error("Error del asistente", error);
      decirBot(error instanceof ErrorCapturaIA ? error.message : "Algo falló. Inténtalo de nuevo.");
    }
  }, [continuar, decirBot, navigate]);

  const enviarTexto = useCallback((texto) => {
    const limpio = String(texto || "").trim();
    if (!limpio || pensando) return;

    // Hay una pregunta abierta: lo escrito se toma como respuesta.
    if (pregunta && actualRef.current) {
      const opcion = buscarOpcionEscrita(limpio, pregunta, actualRef.current);
      if (opcion) {
        aplicarRespuesta({ ...opcion, etiqueta: limpio });
        return;
      }

      agregar({ autor: "usuario", texto: limpio });
      decirBot(pregunta.paso === PASOS.CONFIRMAR
        ? "Responde “sí” para guardarlo, “editar” para abrirlo en el formulario o “cancelar”."
        : "No encontré esa opción. Toca una de las de arriba o escribe “cancelar”.");
      return;
    }

    agregar({ autor: "usuario", texto: limpio });
    consultarIA(limpio);
  }, [agregar, aplicarRespuesta, consultarIA, decirBot, pensando, pregunta]);

  /*
   * Foto de un ticket o de productos. Si había una pregunta abierta se da por
   * cancelada: la imagen empieza una captura nueva.
   */
  const enviarImagen = useCallback((imagen, texto = "") => {
    if (!imagen || pensando) return;
    const limpio = String(texto || "").trim();

    if (pregunta && actualRef.current) {
      colaRef.current = [];
      actualRef.current = null;
      setPregunta(null);
    }

    agregar({ autor: "usuario", texto: limpio, imagen });
    consultarIA(limpio, imagen);
  }, [agregar, consultarIA, pensando, pregunta]);

  const elegirOpcion = useCallback((mensajeId, opcion) => {
    if (pensando || pregunta?.mensajeId !== mensajeId) return;
    aplicarRespuesta(opcion);
  }, [aplicarRespuesta, pensando, pregunta]);

  const reiniciar = useCallback(() => {
    colaRef.current = [];
    actualRef.current = null;
    setPregunta(null);
    setPensando(false);
    setEstadoAvatar("reposo");
    setMensajes([mensajeBienvenida()]);
  }, []);

  return {
    mensajes,
    pensando,
    estadoAvatar,
    preguntaActivaId: pregunta?.mensajeId || null,
    enviarTexto,
    enviarImagen,
    elegirOpcion,
    reiniciar,
  };
};
