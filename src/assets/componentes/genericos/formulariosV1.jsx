import { Formik, Form, Field, ErrorMessage } from "formik";
import styled from "styled-components";

import { keyframes } from 'styled-components'

import { FaEye, FaEyeSlash, FaLock, FaUser, FaExclamationCircle } from "react-icons/fa";
import { useState } from "react";

const shake = keyframes`
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-4px);
  }
  100% {
    transform: translateX(0);
  }
`;
const slideDown = keyframes`
  0% {
    transform: translateY(-20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;
export const ContenedorFormularioStyled = styled.div`
    width: 500px;
    max-width: 90%;
    min-height: 500px;
    
    display: grid;
    grid-template-rows: 200px auto;
    

    -webkit-box-shadow: 0px 0px 14px 3px rgba(0,0,0,0.61);
    -moz-box-shadow: 0px 0px 14px 3px rgba(0,0,0,0.61);
    box-shadow: 0px 0px 14px 3px rgba(0,0,0,0.61);
`


export const SeccionFormularioStyled = styled(Form)`
    height: 100%;
    width: 100%;
    padding: 10px;
    gap: 10px;

    display: grid;
    grid-template-rows: 45px auto 35px;
    background-color: white;
`;
export const SeccionImgStyled = styled.div`
    height: 100%;
    width: 100%;
    background-color: var(--colorFondo);

    background-size: 80%;  
    background-position: center;  
    background-repeat: no-repeat; 
    
`

export const Titulo = styled.h1`
    color: black;
    margin: 0 ;
    text-align: center;
    font-size: 30px;
`
export const Subtitulo = styled.h2`
    color: black;
    margin: 0 ;
    text-align: center;
    font-size: 30px;
`

const ContenedorInternoField = styled.div`
    width: 100%;
    min-height: 40px;
    display: grid;
    grid-template-columns: 40px auto;
    gap: 5px;
    

    font-size: var(--SizeNormal);
    padding: 5px;
    border-radius: 10px;
    background-color: ${props => props.disable ? "gray" : "transparent"};
    color: ${props => props.disable ? "var(--colorMorado)" : "white"};
    
    
    border: solid 1px var(--colorMorado);

    > *{
      color: ${props => props.disable ? "var(--colorMorado)" : "var(--colorMorado)"};
        &::placeholder {
           color: ${props => props.disable ? "var(--colorMorado)" : "var(--colorMorado)"};
            font-size: var(--SizeNormal);
        }
    }

`;

const ContenedorInternoFieldPassword = styled(ContenedorInternoField)`
  grid-template-columns: 40px auto 40px;
`;

const FieldStyled = styled(Field)`
    border: none;
    height: 100%;
    width:100%;
    border-radius: 4px;
    outline: none;
    background-color: transparent;

    &:focus {
        
    }
`;
const LabelFormStyled = styled.label`
    border: none;
    height: 100%;
    width:100%;
    border-radius: 4px;
    outline: none;
    background-color: transparent;

    &:focus {
        
    }
`;
const ContenedorIconoField = styled.label`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    border-right: 1px solid var(--colorPrincipal);
    border-radius: 2px;
    cursor:pointer;
`
const ContenedorIconoFieldNoBorder = styled(ContenedorIconoField)`
    border:none;
`
export const BtnSubmit = styled.button`
    min-width: 100px;
    height: 60px;
    padding: 0 20px;
    font-size: 16px;
    border: none;
    border-radius: 5px;
    background-color: var(--colorMorado);
    color: var(--colorBlanco);
    cursor: pointer;

    font-weight: bold;
    font-size: var(--SizeLarge);
`
export const BtnSecundario = styled.button`
    min-width: 100px;
    height: 100%;
    padding: 0 20px;
    font-size: 16px;
    border: none;
    border-radius: 5px;
    background-color: var(--colorMorado) ;
    color: var(--colorPrincipal) ;
    cursor: pointer;

    font-weight: bold;
    font-size: var(--SizeLarge);
    border: solid 2px var(--colorPrincipal);
`
export const ContenedorFormBottom = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    gap: 10px;
    align-items: center;
    position: relative;
`
const TxtLinkStyled = styled.div`

    user-select: none;
    font-size: var(--SizeSmall);
    cursor: pointer;
    text-decoration: underline;
    color: var(--colorPrincipal);

    position: absolute;
    ${props => props.side === "right" ? "right: 10px" : (props.side === "left" ? "left: 10px" : "0")};




` ;

const ErrorMessageStyled = styled.div`
    width: 100%;
    color:  brown;
    font-size: var(--SizeSmall);

    padding: 4px;
  
    animation: ${shake} 0.5s ease, ${slideDown} 0.3s ease-out;
    animation: ${shake} 0.5s ease, ${slideDown} 0.3s ease-out;
`;

export const TxtLink = ({ txt, onClick, side = "right" }) => {
  return (
    <TxtLinkStyled side={side} onClick={onClick}>
      {txt}
    </TxtLinkStyled>
  );
}
const ContenedorSelectField = styled.div`
width: 100%;
min-height: 40px;
display: grid;
grid-template-columns: 40px auto;
gap: 5px;

font-size: var(--SizeNormal);
padding: 5px;
border-radius: 10px;
background-color: ${props => props.disable ? "gray" : "transparent"};
    
color: ${props => props.disable ? "var(--colorMorado)" : "var(--colorPrincipal)"};
    border: solid 1px var(--colorPrincipal);
&> * {
  color: ${props => props.disable ? "var(--colorMorado)" : "var(--colorPrincipal)"};
  &::placeholder {
    color: ${props => props.disable ? "var(--colorMorado)" : "var(--colorPrincipal)"};
    font-size: var(--SizeNormal);
  }
}
`;

const SelectStyled = styled.select`
border: none;
height: 100%;
width: 100%;
border-radius: 4px;
outline: none;
background-color: transparent;
color: ${props => props.disable ? "var(--colorMorado)" : "var(--colorPrincipal)"};
font-size: var(--SizeNormal);
&:focus {
  outline: 2px solid var(--colorPrincipal);
}
`;

const ContenedorIconoSelect = styled.label`
width: 100%;
height: 100%;
display: flex;
justify-content: center;
align-items: center;

border-right: 1px solid var(--colorMorado);
border-radius: 2px;
cursor: pointer;
`;

const OptionSelectForm = styled.option`
font-size: var(--SizeNormal); 
color: black;
`;

export const SelectForm = ({
  id = "pregunta",
  name = "pregunta",
  icon,
  options = [{ label: "", value: "" }],
  placeholder = "Selecciona una pregunta...",
  disable = false,
  onChangeCustom,
}) => {
  return (
    <div>
      <ContenedorSelectField disable={disable}>
        <ContenedorIconoSelect htmlFor={id}>{icon}</ContenedorIconoSelect>

        <Field name={name}>
          {({ field, form }) => (
            <SelectStyled
              disable={disable}
              {...field}
              id={id}
              name={name}
              onChange={(e) => {
                form.handleChange(e);
                if (onChangeCustom) onChangeCustom(e);
              }}
              onBlur={form.handleBlur}
            >
              <OptionSelectForm value="" disabled hidden>
                {placeholder}
              </OptionSelectForm>
              {options.map((option, index) => (
                <OptionSelectForm key={index} value={option.value} disabled={disable}>
                  {option.label}
                </OptionSelectForm>
              ))}
            </SelectStyled>
          )}
        </Field>
      </ContenedorSelectField>

      <ErrorMessage name={name} component={ErrorMessageStyled} />
    </div>
  );
};



export const ContenedorFields = styled.div`
     width: 100%;
    height: 100%;
    gap: 10px;
    display: flex;
    flex-direction: column;
    margin: 10px 0; 
`
export const FieldForm = ({ id = "email", name = "email", type = "email", placeholder = "Ingresa tu correo", icon = <FaUser />}) => {
  return (
    <div>
      <ContenedorInternoField >
        <ContenedorIconoField htmlFor={id}>  {icon}  </ContenedorIconoField>
        <FieldStyled id={id} name={name} type={type} placeholder={placeholder}  />
      </ContenedorInternoField>

      <ErrorMessage name={name} component={ErrorMessageStyled} />
    </div>
  );
};

const TooltipIcon = styled.div`
  position: relative;
  display: inline-block;
  margin-right: 0.5rem;

  &:hover span {
    visibility: visible;
    opacity: 1;
  }
`;

const TooltipText = styled.span`
  visibility: hidden;
  width: 180px;
  background-color: #333;
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 0.5rem;
  position: absolute;
  z-index: 1;
  bottom: 125%; /* Posición encima del icono */
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
`;
const ContenedorExternoField = styled.div`
  display: grid;
  grid-template-columns: 1fr 20px;
  gap: 0 10px;
  justify-content: center;
  align-items: center;
`
export const FieldFormConQuest = ({
  id = "email",
  name = "email",
  type = "email",
  placeholder = "Ingresa tu correo",
  icon = <FaUser />,
  descripcion = "Este campo es obligatorio.",
  disable = false
}) => {
  return (

    <ContenedorExternoField>

      <ContenedorInternoField disable={disable}>

        <ContenedorIconoField htmlFor={id}>
          {icon}
        </ContenedorIconoField>

        <FieldStyled
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disable}
        />
      </ContenedorInternoField>
      <TooltipIcon>
        <FaExclamationCircle color="orange" />
        <TooltipText>{descripcion}</TooltipText>
      </TooltipIcon>
      <ErrorMessage name={name} component={ErrorMessageStyled} />
    </ContenedorExternoField>
  );
};
export const SelectFormConQuest = ({
  id = "pregunta",
  name = "pregunta",
  icon,
  descripcion="Selecciona la opción adecuada",
  options = [{ label: "", value: "" }],
  placeholder = "Selecciona una pregunta...",
  disable = false,
  onChangeCustom,
}) => {
  return (
    <ContenedorExternoField>
      <ContenedorSelectField disable={disable}>
        <ContenedorIconoSelect htmlFor={id}>{icon}</ContenedorIconoSelect>

        <Field name={name}>
          {({ field, form }) => (
            <SelectStyled
              disable={disable}
              {...field}
              id={id}
              name={name}
              onChange={(e) => {
                form.handleChange(e);
                if (onChangeCustom) onChangeCustom(e);
              }}
              onBlur={form.handleBlur}
            >
              <OptionSelectForm value="" disabled hidden>
                {placeholder}
              </OptionSelectForm>
              {options.map((option, index) => (
                <OptionSelectForm key={index} value={option.value} disabled={disable}>
                  {option.label}
                </OptionSelectForm>
              ))}
            </SelectStyled>
          )}
        </Field>

      </ContenedorSelectField>
      <TooltipIcon>
        <FaExclamationCircle color="orange" />
        <TooltipText>{descripcion}</TooltipText>
      </TooltipIcon>
      <ErrorMessage name={name} component={ErrorMessageStyled} />
    </ContenedorExternoField>
  );
};


export const FieldPasswordForm = ({
  id = "password",
  name = "password",
  placeholder = "Ingresa tu contraseña",
  disable = false,
}) => {
  const [mostrar, setMostrar] = useState(false);

  const toggleMostrar = () => setMostrar((prev) => !prev);

  return (
    <div>
      <ContenedorInternoFieldPassword disable={disable}>
        <ContenedorIconoField htmlFor={id}>
          <FaLock />
        </ContenedorIconoField>

        <FieldStyled
          id={id}
          name={name}
          type={mostrar ? "text" : "password"}
          placeholder={placeholder}
          disabled={disable}
          autocomplete="current-password"
        />

        <ContenedorIconoFieldNoBorder
          style={{ right: "10px", left: "auto", cursor: "pointer" }}
          onClick={toggleMostrar}
        >
          {mostrar ? <FaEyeSlash /> : <FaEye />}
        </ContenedorIconoFieldNoBorder>
      </ContenedorInternoFieldPassword>

      <ErrorMessage name={name} component={ErrorMessageStyled} />
    </div>
  );
};

const ContenedorInternoFieldHorizontal = styled(ContenedorInternoField)`
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
`
const LabelFormHorizontal = styled.label`
   display: flex;
    width: 100%;
    height: 100%;
    text-align: center;
    background-color: var(--colorPrincipal);
    color: var(--colorFondo);
    justify-content: center;
    padding: 5px;
    font-weight: bold;
    align-items: center;
    cursor: pointer;
`
const FieldStyledHorizontal = styled(FieldStyled)`
  padding: 5px;
`
export const FieldFormHorizontal = ({ id = "email", name = "email", type = "email", placeholder = "Ingresa tu correo", label = "label", disable = false }) => {
  return (
    <div>
      <ContenedorInternoFieldHorizontal disable={disable}>
        <LabelFormHorizontal htmlFor={id} >{label}</LabelFormHorizontal>
        <FieldStyledHorizontal id={id} name={name} type={type} placeholder={placeholder} disabled={disable} />
      </ContenedorInternoFieldHorizontal>

      <ErrorMessage name={name} component={ErrorMessageStyled} />
    </div>
  );
};

export const LabelForm = ({ txt, icon = <FaUser /> }) => {
  return (
    <div>
      <ContenedorInternoField>
        <ContenedorIconoField >  {icon}  </ContenedorIconoField>
        <LabelFormStyled>
          {txt}
        </LabelFormStyled>
      </ContenedorInternoField>
    </div>

  );
};

export const FormularioAuthGeneric = ({ initialValues, validate, onSubmit, children }) => {
  initialValues = initialValues || { email: "" };
  validate = validate || ((values) => {
    const errors = {};
    if (!values.email) {
      errors.email = "El correo es requerido";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      errors.email = "El correo no es válido";
    }

    if (!values.password) {
      errors.password = "La contraseña es requerida";
    } else if (values.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    return errors;
  });
  onSubmit = onSubmit || ((values) => {

    console.log("Formulario enviado con los valores:", values);
  });

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={onSubmit}
    >
      <ContenedorFormularioStyled>
        <SeccionImgStyled />

        <SeccionFormularioStyled>
          {children}

        </SeccionFormularioStyled>

      </ContenedorFormularioStyled>
    </Formik>

  )
}
export const FormularioAuth = ({ initialValues, validate, onSubmit, titulo = "Iniciar Sesión" }) => {
  initialValues = initialValues || { email: "", password: "" };
  validate = validate || ((values) => {
    const errors = {};
    if (!values.email) {
      errors.email = "El correo es requerido";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      errors.email = "El correo no es válido";
    }

    if (!values.password) {
      errors.password = "La contraseña es requerida";
    } else if (values.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    return errors;
  });
  onSubmit = onSubmit || ((values) => {

    console.log("Formulario enviado con los valores:", values);
  });

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={onSubmit}
    >
      <ContenedorFormularioStyled>
        <SeccionImgStyled />

        <SeccionFormularioStyled>
          <Titulo> {titulo} </Titulo>

          <ContenedorFields>
            <FieldForm id="email" name="email" type="email" placeholder="Ingresa tu correo" icon={<FaUser />} />
            <FieldForm id="password" name="password" type="password" placeholder="Ingresa tu contraseña" icon={<FaUser />} />
            <FieldForm id="password" name="password" type="password" placeholder="Ingresa tu contraseña" icon={<FaUser />} />
            <FieldForm id="password" name="password" type="password" placeholder="Ingresa tu contraseña" icon={<FaUser />} />
          </ContenedorFields>

          <ContenedorFormBottom>
            <BtnSubmit type="submit">Enviar</BtnSubmit>
            <TxtLink txt="Iniciar Sesión" />
          </ContenedorFormBottom>

        </SeccionFormularioStyled>

      </ContenedorFormularioStyled>
    </Formik>

  )
}

const BtnSeleccionarImgStyled = styled.div`
    width: 100px;
    height: 100px;

    border-radius: 20px;
    border: solid 2px var(--colorPrincipal);
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 50px;
    font-weight: black;
`

const ModalStyled = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContentStyled = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

const ImageStyled = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 10px;
  object-fit: cover;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const BtnCerrarModalStyled = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: red;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
`;
