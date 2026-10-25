import styled from "styled-components";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { LIMITE_PREGUNTA_IA, MAXIMO_PREGUNTAS_IA, limpiarPreguntas } from "../../funciones/ia/metodoAnalisis";

/*
 * Preguntas que la persona quiere que la IA conteste en cada reporte
 * ("¿me alcanza para ahorrar 3 mil al mes?"). Se guardan en
 * preferencias.preguntasIA; la IA solo las contesta si las cifras del reporte
 * alcanzan, y las que sí contesta salen en una diapositiva propia.
 */

const Lista = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Pregunta = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid rgba(83, 59, 143, 0.14);
    border-radius: 11px;
    background: #faf8ff;
    color: #322b3d;
    font-size: 12px;
    line-height: 1.4;
`;

const BtnQuitar = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #8a8494;
    cursor: pointer;

    &:hover { background: #f1eff4; color: #a42318; }
    &:focus-visible { outline: 2px solid var(--colorMorado); outline-offset: 2px; }
`;

const Formulario = styled.form`
    display: flex;
    gap: 8px;

    input {
        flex: 1;
        min-width: 0;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid rgba(83, 59, 143, 0.22);
        border-radius: 11px;
        font: inherit;
        font-size: 12px;
        color: #25212d;
        background: #ffffff;
    }
`;

const BtnAgregar = styled.button`
    flex-shrink: 0;
    min-height: 38px;
    padding: 6px 14px;
    border: 0;
    border-radius: 10px;
    background: var(--colorMorado);
    color: #ffffff;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:focus-visible { outline: 2px solid var(--colorMorado); outline-offset: 2px; }
`;

const EJEMPLO = "¿Me alcanza para ahorrar 3 mil al mes?";

export const PreguntasIA = ({ preguntas = [], onCambiar }) => {
    const [nueva, setNueva] = useState("");
    const lleno = preguntas.length >= MAXIMO_PREGUNTAS_IA;

    const agregar = (evento) => {
        evento.preventDefault();
        const lista = limpiarPreguntas([...preguntas, nueva]);
        if (lista.length === preguntas.length) return;
        onCambiar(lista);
        setNueva("");
    };

    return (
        <>
            {preguntas.length > 0 && (
                <Lista>
                    {preguntas.map((pregunta) => (
                        <Pregunta key={pregunta}>
                            <span>{pregunta}</span>
                            <BtnQuitar
                                type="button"
                                aria-label={`Quitar la pregunta: ${pregunta}`}
                                onClick={() => onCambiar(preguntas.filter((actual) => actual !== pregunta))}
                            >
                                <FaTimes />
                            </BtnQuitar>
                        </Pregunta>
                    ))}
                </Lista>
            )}

            <Formulario onSubmit={agregar}>
                <input
                    type="text"
                    value={nueva}
                    maxLength={LIMITE_PREGUNTA_IA}
                    placeholder={lleno ? `Máximo ${MAXIMO_PREGUNTAS_IA} preguntas` : EJEMPLO}
                    disabled={lleno}
                    onChange={(evento) => setNueva(evento.target.value)}
                    aria-label="Nueva pregunta para la IA"
                />
                <BtnAgregar type="submit" disabled={lleno || !nueva.trim()}>Agregar</BtnAgregar>
            </Formulario>
        </>
    );
};
