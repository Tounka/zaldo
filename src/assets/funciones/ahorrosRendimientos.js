/*
 * Rendimiento por cuenta en Ahorros.
 *
 * Cada snapshot diario guarda, además de los totales, el saldo de cada cuenta
 * (`saldos`, con signo: las responsabilidades restan). Con eso el cambio del
 * día se reparte entre las cuentas que lo originaron.
 *
 * Lo que manda sigue siendo la diferencia NETA del capital, como siempre: un
 * movimiento entre cuentas (una baja 1,000 y otra sube 1,000) suma cero y no
 * se cuenta como ganancia. Solo esa diferencia neta se reparte, en proporción
 * a las cuentas que se movieron en la misma dirección:
 *
 *   A -1,000 · B +1,005  →  neto +5  →  B +5
 *   A +3     · B +5      →  neto +8  →  A +3, B +5
 *
 * Por defecto una parte positiva se toma como rendimiento y una negativa como
 * retiro: sacar dinero no es perder rendimiento. Si en realidad fue dinero
 * nuevo, se cambia a "Aumento a capital"; si fue una pérdida real (p. ej. una
 * inversión que bajó), a "Rendimientos".
 *
 * Sin dependencias de Firebase: lo usan la página, el asistente y el análisis
 * de IA (que corre también en Node).
 */

export const TOLERANCIA = 0.01;
export const CATEGORIA_POR_DEFECTO = "rendimientos";
export const CATEGORIA_RETIRO = "retiro";

/* Lo que cuenta como rendimiento de una cuenta. */
const CATEGORIAS_RENDIMIENTO = new Set(["rendimientos", "interesesGenerales"]);
export const esRendimiento = (categoria) => CATEGORIAS_RENDIMIENTO.has(categoria || CATEGORIA_POR_DEFECTO);

/* Categoría con la que nace una parte nueva, según el signo del cambio. */
export const categoriaPorSigno = (monto) => (Number(monto) < 0 ? CATEGORIA_RETIRO : CATEGORIA_POR_DEFECTO);

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

/*
 * Carga un sobrante a la última parte. Si esa parte es rendimiento y el
 * sobrante la volvería negativa, se queda en 0 y el resto entra como retiro
 * (y al revés: un retiro no se vuelve positivo, el resto entra como
 * rendimiento). Así bajar un saldo nunca crea "rendimiento negativo".
 */
export const cargarSobrante = (partes, sobrante, extra = {}) => {
  const resto = redondear(sobrante);
  if (Math.abs(resto) <= TOLERANCIA || partes.length === 0) return partes;
  const previas = partes.slice(0, -1);
  const ultima = partes.at(-1);
  const monto = redondear(ultima.monto + resto);
  const cruza = (esRendimiento(ultima.categoria) && monto < 0)
    || (ultima.categoria === CATEGORIA_RETIRO && monto > 0);
  if (!cruza) return [...previas, { ...ultima, monto }];
  return [...previas, { categoria: categoriaPorSigno(monto), monto, nota: "", ...extra }];
};

/* Saldo de cada cuenta con el signo con el que entra al capital. */
export const saldosDeCuentas = (cuentas = {}) => {
  const saldos = {};
  Object.entries(cuentas || {}).forEach(([categoria, lista]) => {
    (lista || []).forEach((cuenta) => {
      if (!cuenta?.id) return;
      const monto = Number(cuenta.monto) || 0;
      saldos[cuenta.id] = redondear(categoria === "responsabilidades" ? -monto : monto);
    });
  });
  return saldos;
};

export const nombresDeCuentas = (cuentas = {}) => {
  const nombres = {};
  Object.values(cuentas || {}).forEach((lista) => {
    (lista || []).forEach((cuenta) => {
      if (cuenta?.id) nombres[cuenta.id] = String(cuenta.nombre || "").trim();
    });
  });
  return nombres;
};

/**
 * Reparte `neto` entre las cuentas que se movieron en su misma dirección.
 * Devuelve [{ cuentaId, monto }] que suma exactamente `neto`.
 */
export const atribuirCambioPorCuenta = (saldosInicio = {}, saldosFin = {}, neto = 0) => {
  const total = redondear(neto);
  if (Math.abs(total) <= TOLERANCIA) return [];

  const ids = new Set([...Object.keys(saldosInicio || {}), ...Object.keys(saldosFin || {})]);
  const mismaDireccion = [...ids]
    .map((cuentaId) => ({
      cuentaId,
      delta: (Number(saldosFin?.[cuentaId]) || 0) - (Number(saldosInicio?.[cuentaId]) || 0),
    }))
    .filter(({ delta }) => Math.abs(delta) > TOLERANCIA && Math.sign(delta) === Math.sign(total));

  const suma = mismaDireccion.reduce((acumulado, { delta }) => acumulado + delta, 0);
  if (!suma) return [];

  const partes = mismaDireccion.map(({ cuentaId, delta }) => ({
    cuentaId,
    monto: redondear((total * delta) / suma),
  }));

  // El centavo que se pierde al redondear va a la parte más grande.
  const sobrante = redondear(total - partes.reduce((acumulado, parte) => acumulado + parte.monto, 0));
  if (sobrante) {
    const mayor = partes.reduce((a, b) => (Math.abs(b.monto) > Math.abs(a.monto) ? b : a));
    mayor.monto = redondear(mayor.monto + sobrante);
  }
  return partes.filter((parte) => Math.abs(parte.monto) > TOLERANCIA);
};

/**
 * Desglose del día por cuenta, conservando lo que la persona ya clasificó:
 *  - Las partes SIN cuenta son manuales y se respetan tal cual.
 *  - Lo demás (neto menos esas partes) se reparte por cuenta. Si una cuenta ya
 *    tenía partes (p. ej. la separaste en capital y rendimiento), se conservan
 *    y el ajuste cae en la última.
 *  - Una cuenta nueva en el desglose entra como rendimiento si subió y como
 *    retiro si bajó.
 */
export const desglosePorCuenta = ({ existentes = [], saldosInicio, saldosFin, neto, nombres = {} }) => {
  const partes = (Array.isArray(existentes) ? existentes : []).map((parte) => ({
    ...parte,
    categoria: parte?.categoria || CATEGORIA_POR_DEFECTO,
    monto: Number(parte?.monto) || 0,
    nota: parte?.nota || "",
  }));
  const manuales = partes.filter((parte) => !parte.cuentaId);
  const porRepartir = (Number(neto) || 0) - manuales.reduce((suma, parte) => suma + parte.monto, 0);
  const atribucion = atribuirCambioPorCuenta(saldosInicio, saldosFin, porRepartir);

  const porCuenta = atribucion.flatMap(({ cuentaId, monto }) => {
    const previas = partes.filter((parte) => parte.cuentaId === cuentaId);
    const cuenta = nombres[cuentaId] || previas.at(-1)?.cuenta || "";
    if (previas.length === 0) {
      return [{ categoria: categoriaPorSigno(monto), monto, nota: "", cuentaId, cuenta }];
    }
    const sumaPrevias = previas.reduce((suma, parte) => suma + parte.monto, 0);
    return cargarSobrante(previas.map((parte) => ({ ...parte, cuenta })), monto - sumaPrevias, { cuentaId, cuenta });
  });

  /*
   * Si ninguna cuenta se movió en la dirección del cambio (p. ej. un historial
   * importado cuyo total no cuadra con los saldos), el día queda como una
   * parte sin cuenta: así el desglose siempre suma la diferencia del día.
   */
  const sinAsignar = redondear(porRepartir - atribucion.reduce((suma, parte) => suma + parte.monto, 0));
  const respaldo = Math.abs(sinAsignar) > TOLERANCIA
    ? [{ categoria: categoriaPorSigno(sinAsignar), monto: sinAsignar, nota: "" }]
    : [];

  return [...porCuenta, ...manuales, ...respaldo];
};

const fechaDeKey = (fechaKey) => {
  const [y, m, d] = String(fechaKey || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

const ordenar = (historial) => [...(historial || [])]
  .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)));

/**
 * Rendimiento de un snapshot: sus partes de rendimiento. Un día sin desglose
 * (los viejos, o los importados) se toma completo como rendimiento solo si el
 * capital subió; una baja sin desglose se trata como retiro.
 */
export const rendimientoDelDia = (snapshot, capitalAnterior = null) => {
  const partes = snapshot?.incrementos || [];
  if (partes.length > 0) {
    return redondear(partes
      .filter((parte) => esRendimiento(parte?.categoria))
      .reduce((suma, parte) => suma + (Number(parte.monto) || 0), 0));
  }
  if (capitalAnterior === null || capitalAnterior === undefined) return 0;
  return redondear(Math.max(0, (Number(snapshot?.capitalTotal) || 0) - Number(capitalAnterior)));
};

/*
 * Porcentaje de un día = rendimiento del día / capital con el que cerró el día
 * anterior (lo que había cuando generó). Aportes y retiros no cuentan, así que
 * encadenar estos porcentajes da un rendimiento ponderado en el tiempo (TWR):
 * meter o sacar dinero no mueve la tasa.
 */
const porcentajeSobre = (rendimiento, base) => (base > TOLERANCIA ? (rendimiento / base) * 100 : null);

/* Anualización simple, como siempre: solo con al menos una semana de datos. */
const anualizar = (porcentaje, dias) => (dias >= 7 && porcentaje !== null ? porcentaje * (365 / dias) : null);

const redondearPct = (n) => (n === null ? null : Math.round(n * 10000) / 10000);

/**
 * Serie diaria: por cada snapshot { fechaKey, base, rendimiento, porcentaje, acumulado }.
 * `porcentaje` es el del día y `acumulado` el compuesto desde el inicio (en %).
 * `capitalInicial` es la base del primer día (kpis.capitalInicial).
 */
export const serieRendimientoDiario = (historial = [], capitalInicial = null) => {
  let anterior = capitalInicial === null || capitalInicial === undefined ? null : Number(capitalInicial);
  let factor = 1;
  return ordenar(historial).map((snapshot) => {
    const rendimiento = rendimientoDelDia(snapshot, anterior);
    const porcentaje = anterior === null ? null : porcentajeSobre(rendimiento, anterior);
    if (porcentaje !== null) factor *= 1 + porcentaje / 100;
    const fila = {
      fechaKey: snapshot.fechaKey,
      base: anterior,
      rendimiento,
      porcentaje: redondearPct(porcentaje),
      acumulado: redondearPct((factor - 1) * 100),
    };
    anterior = Number(snapshot.capitalTotal) || 0;
    return fila;
  });
};

/**
 * Resumen del año por cuenta a partir del historial:
 *   { [cuentaId]: { rendimiento, aportes, retiros, otros, saldoPromedio, dias, porcentaje, tasaAnual } }
 * `porcentaje` compone el rendimiento de cada día sobre el saldo previo de la
 * cuenta, así que un retiro no lo distorsiona; `tasaAnual` (en %) lo anualiza.
 */
export const resumenRendimientoPorCuenta = (historial = []) => {
  const resumen = {};
  const asegurar = (cuentaId) => {
    resumen[cuentaId] ||= {
      rendimiento: 0, aportes: 0, retiros: 0, otros: 0, saldos: [], factor: 1, saldoPrevio: null, desde: null, hasta: null,
    };
    return resumen[cuentaId];
  };

  ordenar(historial).forEach((snapshot) => {
    const fecha = fechaDeKey(snapshot.fechaKey);
    const rendimientoHoy = {};
    (snapshot.incrementos || []).forEach((parte) => {
      if (!parte?.cuentaId) return;
      const item = asegurar(parte.cuentaId);
      const monto = Number(parte.monto) || 0;
      if (esRendimiento(parte.categoria)) {
        item.rendimiento += monto;
        rendimientoHoy[parte.cuentaId] = (rendimientoHoy[parte.cuentaId] || 0) + monto;
      } else if (parte.categoria === "aumentoCapital") item.aportes += monto;
      else if (parte.categoria === CATEGORIA_RETIRO) item.retiros += monto;
      else item.otros += monto;
    });
    Object.entries(rendimientoHoy).forEach(([cuentaId, monto]) => {
      const item = resumen[cuentaId];
      const porcentaje = item.saldoPrevio === null ? null : porcentajeSobre(monto, item.saldoPrevio);
      if (porcentaje !== null) item.factor *= 1 + porcentaje / 100;
    });
    Object.entries(snapshot.saldos || {}).forEach(([cuentaId, saldo]) => {
      const item = asegurar(cuentaId);
      const valor = Math.abs(Number(saldo) || 0);
      item.saldos.push(valor);
      item.saldoPrevio = valor;
      if (fecha) {
        item.desde ||= fecha;
        item.hasta = fecha;
      }
    });
  });

  return Object.fromEntries(Object.entries(resumen).map(([cuentaId, item]) => {
    const saldoPromedio = item.saldos.length
      ? item.saldos.reduce((suma, saldo) => suma + saldo, 0) / item.saldos.length
      : 0;
    const dias = item.desde && item.hasta ? Math.round((item.hasta - item.desde) / DIA_MS) : 0;
    const porcentaje = (item.factor - 1) * 100;
    const tasaAnual = anualizar(porcentaje, dias);
    return [cuentaId, {
      rendimiento: redondear(item.rendimiento),
      aportes: redondear(item.aportes),
      retiros: redondear(item.retiros),
      otros: redondear(item.otros),
      saldoPromedio: redondear(saldoPromedio),
      dias,
      porcentaje: Math.round(porcentaje * 100) / 100,
      tasaAnual: tasaAnual === null ? null : Math.round(tasaAnual * 10) / 10,
    }];
  }));
};

/**
 * Rendimiento total del año: todas las partes clasificadas como rendimiento,
 * tengan cuenta o no (ver rendimientoDelDia para los días sin desglose).
 */
export const rendimientoTotalAnio = (historial = [], capitalInicial = null) =>
  redondear(serieRendimientoDiario(historial, capitalInicial)
    .reduce((suma, dia) => suma + dia.rendimiento, 0));

/**
 * Tasa del año con los porcentajes diarios encadenados (en %):
 *   { acumulado, anual, ultimoDia }   `anual` es null con menos de 7 días.
 */
export const tasaRendimientoAnio = (historial = [], capitalInicial = null, dias = 0) => {
  const serie = serieRendimientoDiario(historial, capitalInicial);
  const acumulado = serie.at(-1)?.acumulado ?? 0;
  const ultimoDia = serie.findLast((dia) => dia.porcentaje !== null) || null;
  const anual = anualizar(acumulado, dias);
  return { acumulado, anual: anual === null ? null : Math.round(anual * 10) / 10, ultimoDia };
};
