import { useEffect, useRef, useState } from "react";
import { Topo } from "./Topo";
import { cargarTiraTopo } from "./animacionesTopo";
import { cuadroEnTiempo } from "./tiempoAnimacion.mjs";

/** Reproduce una tira sin renderizar React por cada cuadro. Conserva el último
 * cuadro de las acciones finitas, admite reversa y pausa al salir de pantalla.
 * Anima siempre, aunque el sistema pida reducir movimiento: el topo es la app. */
export const TopoAnimado = ({
  animacion = "respirar", tamano = 120, bucle, reversa = false,
  alTerminar, alError, alt = "", estadoRespaldo = "reposo", className, style,
}) => {
  const elemento = useRef(null);
  const callbacks = useRef({ alTerminar, alError });
  const [cargada, setCargada] = useState(null);
  useEffect(() => { callbacks.current = { alTerminar, alError }; }, [alTerminar, alError]);

  useEffect(() => {
    let cancelado = false;
    cargarTiraTopo(animacion).then((datos) => {
      if (!cancelado) setCargada({ ...datos, nombre: animacion });
    }).catch((error) => { if (!cancelado) callbacks.current.alError?.(error); });
    return () => { cancelado = true; };
  }, [animacion]);

  const datos = cargada?.nombre === animacion ? cargada : null;
  useEffect(() => {
    if (!datos || !elemento.current) return undefined;
    const { ficha } = datos;
    const nodo = elemento.current;
    const opciones = { bucle: bucle ?? ficha.bucle, reversa };
    let raf;
    let ultimo = null;
    let transcurrido = 0;
    let terminado = false;
    let visible = true;
    const pintar = (cuadro) => {
      nodo.style.backgroundPosition = `${ficha.cuadros > 1 ? cuadro * 100 / (ficha.cuadros - 1) : 0}% 0`;
      nodo.dataset.cuadro = String(cuadro);
    };
    const avanzar = (ahora) => {
      if (ultimo !== null) transcurrido += ahora - ultimo;
      ultimo = ahora;
      const resultado = cuadroEnTiempo(transcurrido, ficha, opciones);
      pintar(resultado.cuadro);
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
      {!datos && <Topo estado={estadoRespaldo} tamano="100%" animar={false} />}
    </span>
  );
};
