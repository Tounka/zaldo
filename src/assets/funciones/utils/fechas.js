export const convertirTimestampADatosFecha = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return null; 
  }

  const fecha = timestamp.toDate(); 
  return {
    anio: fecha.getFullYear().toString(),
    mes: (fecha.getMonth() + 1).toString().padStart(2, '0'),
    dia: fecha.getDate().toString().padStart(2, '0'),
  };
};

export const convertirADatosFecha = (fecha) => {
  return {
    anio: fecha.getFullYear().toString(),
    mes: (fecha.getMonth() + 1).toString().padStart(2, '0'),
    dia: fecha.getDate().toString().padStart(2, '0'),
  };
};

