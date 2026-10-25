import { useEffect, useState } from "react";

/*
 * Instalar Zaldo como app desde /perfil.
 *
 * Chrome y Edge avisan con `beforeinstallprompt` que la app se puede instalar,
 * pero solo una vez y muy al inicio: si nadie lo escucha en ese momento, se
 * pierde. Por eso este módulo se importa en main.jsx y guarda el evento hasta
 * que la persona toque "Instalar". Safari en iPhone no tiene ese evento: ahí
 * solo se puede explicar cómo agregarla desde Compartir.
 *
 * Estados: "instalada" | "disponible" | "ios" | "no-disponible".
 */

let eventoInstalacion = null;
const suscriptores = new Set();
const avisar = () => suscriptores.forEach((callback) => callback());

const estaInstalada = () => typeof window !== "undefined" && (
  window.matchMedia?.("(display-mode: standalone)").matches
  || window.navigator.standalone === true
);

const esIOS = () => typeof navigator !== "undefined"
  && /iphone|ipad|ipod/i.test(navigator.userAgent)
  && !/crios|fxios|edgios/i.test(navigator.userAgent);

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    // Sin esto Chrome muestra su propia barra; preferimos el botón de /perfil.
    evento.preventDefault();
    eventoInstalacion = evento;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    eventoInstalacion = null;
    avisar();
  });
}

const estadoActual = () => {
  if (estaInstalada()) return "instalada";
  if (eventoInstalacion) return "disponible";
  if (esIOS()) return "ios";
  return "no-disponible";
};

/**
 * @returns {{ estado: string, instalar: () => Promise<boolean> }}
 *   `instalar` abre el diálogo del navegador; true si la persona aceptó.
 */
export const useInstalacionPWA = () => {
  const [estado, setEstado] = useState(estadoActual);

  useEffect(() => {
    const actualizar = () => setEstado(estadoActual());
    suscriptores.add(actualizar);
    actualizar();
    return () => suscriptores.delete(actualizar);
  }, []);

  const instalar = async () => {
    if (!eventoInstalacion) return false;
    const evento = eventoInstalacion;
    // El evento solo se puede usar una vez, acepte o no.
    eventoInstalacion = null;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    avisar();
    return outcome === "accepted";
  };

  return { estado, instalar };
};
