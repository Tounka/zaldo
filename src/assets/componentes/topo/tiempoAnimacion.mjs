export function validarAnimacion(ficha) {
  return Boolean(ficha && Number.isInteger(ficha.cuadros) && ficha.cuadros > 0
    && Number.isFinite(ficha.fps) && ficha.fps > 0 && ficha.fps <= 60
    && Number.isInteger(ficha.tam) && ficha.tam > 0);
}

export function cuadroEnTiempo(ms, ficha, { bucle = ficha.bucle, reversa = false } = {}) {
  const paso = Math.floor(Math.max(0, ms) * ficha.fps / 1000);
  const inicio = Math.max(0, Math.min(ficha.cuadros - 1, ficha.inicioBucle || 0));
  const indice = bucle && paso >= ficha.cuadros
    ? inicio + ((paso - ficha.cuadros) % (ficha.cuadros - inicio))
    : Math.min(paso, ficha.cuadros - 1);
  return {
    cuadro: reversa ? ficha.cuadros - 1 - indice : indice,
    terminado: !bucle && paso >= ficha.cuadros,
  };
}
