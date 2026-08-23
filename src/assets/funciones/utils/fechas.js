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

/*
 * Fecha local en formato YYYY-MM-DD, el que usan los <input type="date">.
 * No se usa toISOString() porque convierte a UTC y en México adelanta el día.
 */
export const fechaLocalISO = (fecha = new Date()) => {
  const { anio, mes, dia } = convertirADatosFecha(fecha);
  return `${anio}-${mes}-${dia}`;
};

export const fechaLocalISOConDesfase = (dias = 0) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocalISO(fecha);
};

/* Texto corto para mostrar una fecha ya elegida ("12 mar 2026"). */
export const fechaCortaLegible = (fechaISO) => {
  if (!fechaISO) return '';
  return new Date(`${fechaISO}T12:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

