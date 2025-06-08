const sanitizar = (valor) => {
  return valor?.toString().trim() || '';
};

export const validarCampoRequerido = (valor) => {
  const valorSanitizado = sanitizar(valor);
  if (valorSanitizado === '') {
    return { error: 'Este campo es requerido.', valor: '' };
  }
  return { error: null, valor: valorSanitizado };
};
