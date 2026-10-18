import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Dictado por voz con la Web Speech API del navegador. La voz se convierte en
 * texto en el dispositivo/navegador y ese texto va a la caja del chat: al
 * asistente de IA nunca le llega audio, solo lo que el usuario decide enviar.
 *
 * Disponible en Chrome, Edge y Safari. En Firefox no existe y el botón no se
 * muestra. Ojo: Chrome procesa el audio con el servicio de voz de Google.
 */

const Reconocimiento = typeof window !== "undefined"
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export const dictadoDisponible = Boolean(Reconocimiento);

const MENSAJES_ERROR = {
  "not-allowed": "Necesito permiso para usar el micrófono.",
  "service-not-allowed": "Necesito permiso para usar el micrófono.",
  "no-speech": "No escuché nada. Intenta de nuevo.",
  "audio-capture": "No encontré un micrófono.",
  network: "El dictado necesita conexión a internet.",
};

/**
 * @param alTexto  Recibe el texto dictado hasta el momento (parcial y final).
 */
export const useDictado = ({ alTexto, idioma = "es-MX" }) => {
  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState("");
  const reconocimientoRef = useRef(null);
  const alTextoRef = useRef(alTexto);
  alTextoRef.current = alTexto;

  const detener = useCallback(() => {
    reconocimientoRef.current?.stop();
  }, []);

  const iniciar = useCallback((textoPrevio = "") => {
    if (!Reconocimiento || reconocimientoRef.current) return;

    const reconocimiento = new Reconocimiento();
    reconocimiento.lang = idioma;
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;

    const base = textoPrevio.trim() ? `${textoPrevio.trim()} ` : "";

    reconocimiento.onresult = (evento) => {
      const dictado = Array.from(evento.results)
        .map((resultado) => resultado[0]?.transcript || "")
        .join("");
      alTextoRef.current?.(`${base}${dictado}`.trimStart());
    };

    reconocimiento.onerror = (evento) => {
      if (evento.error !== "aborted") setError(MENSAJES_ERROR[evento.error] || "No pude usar el dictado.");
    };

    reconocimiento.onend = () => {
      reconocimientoRef.current = null;
      setEscuchando(false);
    };

    setError("");
    reconocimientoRef.current = reconocimiento;
    setEscuchando(true);
    reconocimiento.start();
  }, [idioma]);

  // Al desmontar (cerrar el chat) se corta el micrófono.
  useEffect(() => () => reconocimientoRef.current?.abort(), []);

  return { escuchando, error, iniciar, detener };
};
