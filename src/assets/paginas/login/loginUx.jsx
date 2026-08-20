import styled from "styled-components";
import { useState } from "react";

import { FaGoogle, FaRegUser } from "react-icons/fa";
import { ContenedorCentradoGenerico } from "../../componentes/genericos/contenedores";
import imgBg from "../../media/img/bgPattern.webp"
const ContenedorLogin = styled.div`
  width: 100%;
  height: 100%;
  display: grid;

  grid-template-columns: 1fr 1fr;

  @media (max-width: 600px) {
     grid-template-columns: 1fr;
    position: relative;

  }
`;

const ContenedorBurbujaImg = styled.div`
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
  color: var(--colorPrincipal);
  border: 2px solid var(--colorPrincipal);
  font-size: 34px;
  position: absolute;
  top: -50px;
  border-radius: 50%;
  

`

const TarjetaLogin = styled.div`
  background: white;
  border-radius: 10px;
  padding: 50px 34px 30px;
  box-shadow: 0px 10px 20px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border: solid 2px var(--colorPrincipal);
  position: relative;
  width: min(390px, calc(100% - 32px));
  box-sizing: border-box;

  @media (max-width: 600px) {
     grid-template-columns: 1fr;
    position: absolute;
      top: 40%;
  }
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
const ContenedorDerecho = styled(ContenedorCentradoGenerico)`
  background-image: url(${imgBg});
  background-position: center;
  background-size: 100%;
`;

const Separador = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8a8494;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  &::before,
  &::after {
    content: "";
    height: 1px;
    flex: 1;
    background: rgba(83, 59, 143, 0.16);
  }
`;

const BotonSecundario = styled.button`
  width: 100%;
  border: 1px solid rgba(83, 59, 143, 0.22);
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
  border: 1px solid rgba(83, 59, 143, 0.2);
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
  color: #716b79;
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
      {loading ? <></> : (
        <ContenedorCentradoGenerico bgColor="#f5f5f5">
          <TarjetaLogin>
            <ContenedorBurbujaImg><FaRegUser /></ContenedorBurbujaImg>
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
                autoComplete="email"
              />
              <CampoAcceso
                type="password"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                placeholder="Contraseña"
                autoComplete={esRegistro ? "new-password" : "current-password"}
              />

              {esRegistro && (
                <CampoAcceso
                  type="password"
                  value={confirmacion}
                  onChange={(event) => setConfirmacion(event.target.value)}
                  placeholder="Repite la contraseña"
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

            {mensaje && <MensajeAuth $success={esMensajeExito}>{mensaje}</MensajeAuth>}

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
        </ContenedorCentradoGenerico>
      )}

      <ContenedorDerecho bgColor="var(--colorMorado)" />
    </ContenedorLogin>
  );
};
