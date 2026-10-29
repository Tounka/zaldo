import styled from "styled-components";
import { useState } from "react";

import { FaGoogle } from "react-icons/fa";
import { ContenedorCentradoGenerico } from "../../componentes/genericos/Contenedores";
import { FondoZaldo } from "../../componentes/fondos/FondoZaldo";
import { Topo } from "../../componentes/topo/Topo";
import { TopoRig } from "../../componentes/topo/TopoRig";
import { PanelInformativo } from "./panelInformativo";

/*
 * Paleta de las persianas. Con angle={44} el primer color queda abajo a la
 * izquierda y el último arriba a la derecha: medianoche → índigo → violeta →
 * orquídea → lavanda y cierra en un lila intenso en la esquina superior derecha.
 */
const ContenedorLogin = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  position: relative;
  isolation: isolate;

  grid-template-columns: 1fr 1fr;

  /* En móvil la tarjeta fluye en columna y la página puede hacer scroll:
     antes iba en position:absolute y el modo registro cortaba el botón inferior. */
  @media (max-width: 600px) {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: auto;

    & > :first-child {
      flex: 1 0 auto;
      height: auto;
      padding: 76px 0 28px;
    }

    & > :last-child {
      flex: 0 0 96px;
    }
  }
`;

/*
 * Burbuja del topo en tres capas para que la mano y la cabeza salgan del
 * círculo mientras el cuerpo queda dentro:
 *   1. FondoBurbuja: el círculo relleno con su borde completo (detrás).
 *   2. RecorteTopo: el topo, recortado con la mitad inferior del círculo y
 *      libre hacia arriba.
 *   3. BordeFrontal: la mitad inferior del borde, encima del topo, para que
 *      parezca que sale de adentro.
 */
const ContenedorBurbujaImg = styled.div`
  width: 100px;
  height: 100px;
  position: absolute;
  top: -50px;
  left: 50%;
  margin-left: -50px;
  isolation: isolate;
`;

const FondoBurbuja = styled.span`
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #ffffff, #efe9ff);
  border: 2px solid var(--colorPrincipal);
  box-sizing: border-box;
`;

const RecorteTopo = styled.span`
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  /* Rectángulo abierto hacia arriba + semicírculo inferior de 50 px de radio. */
  clip-path: path("M 0 50 L 0 -90 L 100 -90 L 100 50 A 50 50 0 0 1 0 50 Z");
  pointer-events: none;
`;

const BordeFrontal = styled.span`
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 50%;
  border: 2px solid var(--colorPrincipal);
  box-sizing: border-box;
  clip-path: inset(50% 0 0 0);
  pointer-events: none;
`;

const TarjetaLogin = styled.div`
  background: white;
  border-radius: 10px;
  padding: 50px 34px 30px;
  box-shadow: 0 18px 50px rgba(20, 10, 50, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border: solid 2px var(--colorPrincipal);
  position: relative;
  width: min(390px, calc(100% - 32px));
  box-sizing: border-box;

`;

const Titulo = styled.h2`
  color: var(--colorPrincipal);
  margin: 0;
`;

const BotonGoogle = styled.button`
  background-color: white;
  color: var(--colorPrincipal);
  border: 2px solid var(--colorPrincipal);
  padding: 11px 18px;
  border-radius: 5px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;
/*
 * Fondo animado detrás de toda la pantalla. El degradado de respaldo se ve si
 * el navegador no tiene WebGL2; con "reducir movimiento" las persianas quedan
 * quietas (lo resuelve el propio componente).
 */
const FondoLogin = styled.div`
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #0f0b1c;
  pointer-events: none;
`;

const PanelIzquierdo = styled(ContenedorCentradoGenerico)`
  position: relative;
`;

/* Velo oscuro detrás del panel informativo: el texto blanco no pierde
   contraste cuando el foco pasa por detrás. */
const ContenedorDerecho = styled(ContenedorCentradoGenerico)`
  position: relative;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(22, 13, 52, 0) 0%,
      rgba(22, 13, 52, 0.55) 28%,
      rgba(22, 13, 52, 0.72) 100%
    );
    /* El velo se desvanece hacia arriba para dejar ver el lila de la esquina. */
    -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, #000 38%);
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, #000 38%);
    pointer-events: none;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 600px) {
    &::before {
      display: none;
    }
  }
`;

const Separador = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #625c6e;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  &::before,
  &::after {
    content: "";
    height: 1px;
    flex: 1;
    background: rgba(83, 59, 143, 0.28);
  }
`;

const BotonSecundario = styled.button`
  width: 100%;
  border: 1px solid rgba(83, 59, 143, 0.4);
  background: #fbfafd;
  color: var(--colorMorado);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.06);
  }
`;

const FormularioCorreo = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 9px;
`;

const CampoAcceso = styled.input`
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(83, 59, 143, 0.38);
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  font-size: 13px;
  color: #24202d;
  background: white;

  &:focus {
    outline: none;
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
  }
`;

const BotonCorreo = styled.button`
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  background: var(--colorMorado);
  color: white;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: wait;
  }
`;

const AccionTexto = styled.button`
  border: none;
  background: transparent;
  color: var(--colorMorado);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px;

  &:hover {
    text-decoration: underline;
  }
`;

const MensajeAuth = styled.p`
  margin: 0;
  width: 100%;
  color: ${({ $success }) => ($success ? "#287a47" : "#b42318")};
  background: ${({ $success }) => ($success ? "rgba(40, 122, 71, 0.08)" : "rgba(180, 35, 24, 0.08)")};
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 11px;
  line-height: 1.45;
  box-sizing: border-box;
`;

const TextoAuxiliar = styled.p`
  margin: -2px 0 0;
  color: #57515f;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
`;

export const LoginUx = ({
  handleLoginGoogle,
  handleLoginCorreo,
  handleCrearCuentaCorreo,
  handleRecuperarContrasena,
  loading,
  loadingAction,
  error,
}) => {
  const [modoCorreo, setModoCorreo] = useState("login");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");

  const esRegistro = modoCorreo === "registro";
  const mensaje = errorFormulario || error;
  const esMensajeExito = mensaje?.startsWith("Te enviamos");
  const ocupado = loadingAction === "correo" || loadingAction === "registro";

  const handleSubmitCorreo = (event) => {
    event.preventDefault();
    setErrorFormulario("");

    if (!correo.trim() || !contrasena) {
      setErrorFormulario("Escribe tu correo y contraseña para continuar.");
      return;
    }

    if (esRegistro && contrasena !== confirmacion) {
      setErrorFormulario("Las contraseñas no coinciden.");
      return;
    }

    if (esRegistro) {
      handleCrearCuentaCorreo(correo, contrasena);
    } else {
      handleLoginCorreo(correo, contrasena);
    }
  };

  return (
    <ContenedorLogin>
      <FondoLogin>
        <FondoZaldo />
      </FondoLogin>
      {loading ? <></> : (
        <PanelIzquierdo>
          <TarjetaLogin>
            <ContenedorBurbujaImg>
              <FondoBurbuja />
              <RecorteTopo>
                {/* Saluda con la mano al entrar y sigue haciendo cosas; si algo
                    falla cambia a la ilustración de preocupado. */}
                {mensaje && !esMensajeExito ? (
                  <Topo estado="preocupado" tamano={118} prioridad alt="Topo de Zaldo preocupado" style={{ marginBottom: -16 }} />
                ) : (
                  <TopoRig tamano={104} style={{ marginBottom: -6, pointerEvents: "auto" }} />
                )}
              </RecorteTopo>
              <BordeFrontal />
            </ContenedorBurbujaImg>
            <Titulo>{esRegistro ? "Crea tu cuenta" : "Inicia sesión"}</Titulo>

            <BotonGoogle onClick={handleLoginGoogle} disabled={loadingAction === "google"}>
              <FaGoogle />
              {loadingAction === "google" ? "Conectando..." : "Continuar con Google"}
            </BotonGoogle>

            <Separador>o con tu correo</Separador>

            <FormularioCorreo onSubmit={handleSubmitCorreo}>
              <CampoAcceso
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                autoComplete="email"
              />
              <CampoAcceso
                type="password"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                placeholder="Contraseña"
                aria-label="Contraseña"
                autoComplete={esRegistro ? "new-password" : "current-password"}
              />

              {esRegistro && (
                <CampoAcceso
                  type="password"
                  value={confirmacion}
                  onChange={(event) => setConfirmacion(event.target.value)}
                  placeholder="Repite la contraseña"
                  aria-label="Repite la contraseña"
                  autoComplete="new-password"
                />
              )}

              <BotonCorreo type="submit" disabled={ocupado}>
                {loadingAction === "registro"
                  ? "Creando cuenta..."
                  : loadingAction === "correo"
                    ? "Entrando..."
                    : esRegistro ? "Crear cuenta" : "Entrar con correo"}
              </BotonCorreo>
            </FormularioCorreo>

            {mensaje && <MensajeAuth role="alert" $success={esMensajeExito}>{mensaje}</MensajeAuth>}

            <TextoAuxiliar>
              {esRegistro
                ? "¿Ya entrabas con Google? No crees una cuenta nueva: entra con Google y agrega tu contraseña desde Mi perfil para conservar toda tu información."
                : "También puedes vincular Google y contraseña a la misma cuenta desde Mi perfil."}
            </TextoAuxiliar>

            {!esRegistro && (
              <AccionTexto
                type="button"
                onClick={() => {
                  if (!correo.trim()) {
                    setErrorFormulario("Escribe primero tu correo para enviarte el enlace.");
                    return;
                  }
                  handleRecuperarContrasena(correo);
                }}
                disabled={loadingAction === "recuperacion"}
              >
                {loadingAction === "recuperacion" ? "Enviando..." : "Olvidé mi contraseña"}
              </AccionTexto>
            )}

            <BotonSecundario
              type="button"
              onClick={() => {
                setModoCorreo(esRegistro ? "login" : "registro");
                setErrorFormulario("");
                setConfirmacion("");
              }}
            >
              {esRegistro ? "Ya tengo una cuenta" : "Crear cuenta nueva"}
            </BotonSecundario>
          </TarjetaLogin>
        </PanelIzquierdo>
      )}

      <ContenedorDerecho>
        <PanelInformativo />
      </ContenedorDerecho>
    </ContenedorLogin>
  );
};
