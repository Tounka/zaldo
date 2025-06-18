export const limitarADosDecimales = (numero) => {
  return Math.round(numero * 100) / 100;
}