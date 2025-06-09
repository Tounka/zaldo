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

export const validarCampoNumerico = (valor) => {
  const valorSanitizado = sanitizar(valor);

  if (valorSanitizado === '') {
    return { error: 'Este campo numérico es requerido.', valor: '' };
  }

  const numero = Number(valorSanitizado);

  if (isNaN(numero)) {
    return { error: 'Debe ser un número válido.', valor: '' };
  }

  if (numero < 0) {
    return { error: 'El número no puede ser negativo.', valor: numero };
  }

  return { error: null, valor: numero };
};