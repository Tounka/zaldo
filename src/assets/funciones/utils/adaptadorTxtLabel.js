export const adaptadorTxtLabel = (arreglo, valueBuscado) => {
  const itemEncontrado = arreglo.find((item) => item.value === valueBuscado);
  return itemEncontrado ? itemEncontrado.label : "";
};

export const adaptadorTimestampATxt = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();  
  return date.toISOString().slice(0, 10);
};