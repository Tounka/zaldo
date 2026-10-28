import { useCallback, useEffect, useState } from "react";

/*
 * Permisos del dispositivo desde /perfil.
 *
 * Cada permiso lo guarda el navegador en ese dispositivo, no en la cuenta:
 * por eso este módulo no toca Firestore. Los navegadores exigen un toque de
 * la persona para pedirlos, así que solo se solicitan al pulsar el botón; al
 * final se consulta el estado real con la Permissions API.
 *
 * Estados: "consultando" | "granted" | "denied" | "prompt" | "desconocido"
 *          | "sin-dispositivo" | "no-soportado".
 */

const CLAVES = ["notificaciones", "microfono", "camara"];

const NOMBRE_API = {
  notificaciones: "notifications",
  microfono: "microphone",
  camara: "camera",
};

const soportado = (clave) => {
  if (typeof window === "undefined") return false;
  if (clave === "notificaciones") return "Notification" in window;
  return Boolean(navigator.mediaDevices?.getUserMedia);
};

const consultar = async (clave) => {
  if (!soportado(clave)) return "no-soportado";

  if (clave === "notificaciones") {
    // La API de Notification responde de inmediato, sin consultar nada más.
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
  }

  try {
    const resultado = await navigator.permissions?.query({ name: NOMBRE_API[clave] });
    return resultado?.state || "desconocido";
  } catch {
    // Safari no deja consultar micrófono ni cámara: se sabrá al pedirlos.
    return clave === "notificaciones" ? "prompt" : "desconocido";
  }
};

/* Pide el permiso aceptando la API moderna (promesa) y la vieja (callback). */
const pedirNotificaciones = () => new Promise((resolver) => {
  const resultado = Notification.requestPermission(resolver);
  resultado?.then?.(resolver);
});

/* Enciende el dispositivo un instante y lo apaga: solo se busca el permiso. */
const pedirMedia = async (clave) => {
  const stream = await navigator.mediaDevices.getUserMedia(
    clave === "microfono" ? { audio: true } : { video: true },
  );
  stream.getTracks().forEach((pista) => pista.stop());
};

/*
 * En móvil `new Notification()` falla: hay que usar el service worker que ya
 * registra la PWA. En escritorio funciona igual, así que se intenta primero
 * el service worker y se cae a la API directa.
 */
const mostrarNotificacion = async (titulo, opciones) => {
  try {
    const registro = await navigator.serviceWorker?.getRegistration?.();
    if (registro?.showNotification) {
      await registro.showNotification(titulo, opciones);
      return true;
    }
    new Notification(titulo, opciones);
    return true;
  } catch (error) {
    console.warn("No se pudo mostrar la notificación de confirmación:", error);
    return false;
  }
};

const estadoDeError = (error) => {
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return "sin-dispositivo";
  }
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "denied";
  }
  return "desconocido";
};

/**
 * @returns {{ estados: Record<string, string>, solicitar: (clave: string) => Promise<string> }}
 *   `solicitar` pide el permiso y devuelve el estado resultante.
 */
export const usePermisos = () => {
  const [estados, setEstados] = useState(() => (
    Object.fromEntries(CLAVES.map((clave) => [clave, "consultando"]))
  ));

  useEffect(() => {
    let vigente = true;

    // El permiso también se puede cambiar desde la configuración del navegador.
    const revisar = async () => {
      const valores = await Promise.all(CLAVES.map(consultar));
      if (!vigente) return;
      setEstados(Object.fromEntries(CLAVES.map((clave, indice) => [clave, valores[indice]])));
    };

    revisar();
    window.addEventListener("focus", revisar);
    document.addEventListener("visibilitychange", revisar);

    return () => {
      vigente = false;
      window.removeEventListener("focus", revisar);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, []);

  const solicitar = useCallback(async (clave) => {
    let resultado = "desconocido";

    if (!soportado(clave)) {
      resultado = "no-soportado";
    } else {
      try {
        if (clave === "notificaciones") {
          resultado = await pedirNotificaciones();
          if (resultado === "granted") {
            await mostrarNotificacion("Zaldo", {
              body: "Notificaciones activadas. Te avisaremos por aquí cuando haga falta.",
              icon: "/bgPattern.webp",
              badge: "/bgPattern.webp",
            });
          }
        } else {
          await pedirMedia(clave);
          resultado = "granted";
        }
      } catch (error) {
        resultado = estadoDeError(error);
        console.warn(`No se pudo activar el permiso de ${clave}:`, error);
      }
    }

    // Si el navegador puede confirmarlo, manda su estado; si no, el del intento.
    const real = await consultar(clave);
    const definitivo = real === "desconocido" ? resultado : real;
    setEstados((previos) => ({ ...previos, [clave]: definitivo }));
    return definitivo;
  }, []);

  return { estados, solicitar };
};
