import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Topo } from "./Topo";
import { cargarTiraTopo, tiraLista } from "./animacionesTopo";
import { cuadroEnTiempo } from "./tiempoAnimacion.mjs";

/** Reproduce una tira sin renderizar React por cada cuadro. Conserva el último
 * cuadro de las acciones finitas, admite reversa y pausa al salir de pantalla.
 * Anima siempre, aunque el sistema pida reducir movimiento: el topo es la app.
 * Al cambiar de animación sigue mostrando la tira anterior hasta que la nueva
 * está descargada; `alCiclo` avisa cada vez que un bucle vuelve al inicio. */
export const TopoAnimado = ({
  animacion = "respirar", tamano = 120, bucle, reversa = false,
  alTerminar, alError, alCiclo, alt = "", estadoRespaldo = "reposo", className, style,
}) => {
  const elemento = useRef(null);
  const callbacks = useRef({ alTerminar, alError, alCiclo });
  const [cargada, setCargada] = useState(() => tiraLista(animacion));
  useEffect(() => { callbacks.current = { alTerminar, alError, alCiclo }; }, [alTerminar, alError, alCiclo]);

  useEffect(() => {
    if (tiraLista(animacion)) return undefined;
    let cancelado = false;
    cargarTiraTopo(animacion).then((datos) => {
      if (!cancelado) setCargada(datos);
    }).catch((error) => { if (!cancelado) callbacks.current.alError?.(error); });
    return () => { cancelado = true; };
  }, [animacion]);

  // Si la tira ya está en caché se usa en este mismo render; si no, se queda
  // la anterior. Antes se mostraba un cuadro vacío y luego el respaldo estático.
  const datos = tiraLista(animacion) || cargada;
  // Layout y no efecto normal: el primer cuadro de una tira nueva se pinta antes
  // de que el navegador la muestre. Con useEffect se alcanzaba a ver la tira
  // nueva con la posición de la anterior (un topo cortado a la mitad).
  useLayoutEffect(() => {
    if (!datos || !elemento.current) return undefined;
    const { ficha } = datos;
    const nodo = elemento.current;
    const opciones = { bucle: bucle ?? ficha.bucle, reversa };
    let raf;
    let ultimo = null;
    let transcurrido = 0;
    let terminado = false;
    let visible = true;
    let cuadroPrevio = null;
    const pintar = (cuadro) => {
      nodo.style.backgroundPosition = `${ficha.cuadros > 1 ? cuadro * 100 / (ficha.cuadros - 1) : 0}% 0`;
      nodo.dataset.cuadro = String(cuadro);
    };
    const avanzar = (ahora) => {
      if (ultimo !== null) transcurrido += ahora - ultimo;
      ultimo = ahora;
      const resultado = cuadroEnTiempo(transcurrido, ficha, opciones);
      const volvio = cuadroPrevio !== null && (reversa ? resultado.cuadro > cuadroPrevio : resultado.cuadro < cuadroPrevio);
      cuadroPrevio = resultado.cuadro;
      pintar(resultado.cuadro);
      if (volvio) callbacks.current.alCiclo?.();
      if (resultado.terminado) {
        terminado = true;
        callbacks.current.alTerminar?.();
      } else raf = requestAnimationFrame(avanzar);
    };
    const actualizarVisibilidad = () => {
      cancelAnimationFrame(raf);
      ultimo = null;
      if (!terminado && visible && !document.hidden) raf = requestAnimationFrame(avanzar);
    };
    pintar(reversa ? ficha.cuadros - 1 : 0);
    document.addEventListener("visibilitychange", actualizarVisibilidad);
    const observador = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      actualizarVisibilidad();
    });
    observador?.observe(nodo);
    actualizarVisibilidad();
    return () => {
      cancelAnimationFrame(raf);
      observador?.disconnect();
      document.removeEventListener("visibilitychange", actualizarVisibilidad);
    };
  }, [datos, bucle, reversa]);

  return (
    <span
      ref={elemento} className={className} role={alt ? "img" : undefined}
      aria-label={alt || undefined} aria-hidden={alt ? undefined : true}
      data-animacion={animacion}
      style={{
        display: "inline-block", position: "relative", flexShrink: 0,
        width: tamano, height: tamano, backgroundRepeat: "no-repeat",
        backgroundImage: datos ? `url("${datos.src}")` : undefined,
        backgroundSize: datos ? `${datos.ficha.cuadros * 100}% 100%` : undefined,
        backgroundPosition: reversa ? "100% 0" : "0% 0",
        pointerEvents: "none", ...style,
      }}
    >
      {!datos && <Topo estado={estadoRespaldo} tamano={typeof tamano === "number" ? tamano : 120} animar={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />}
    </span>
  );
};
