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
 * Por defecto cada parte se toma como rendimiento; si en realidad fue dinero
 * nuevo, se cambia a "Aumento a capital" en el desglose del día y deja de
 * contar como rendimiento de la cuenta.
 *
 * Sin dependencias de Firebase: lo usan la página, el asistente y el análisis
 * de IA (que corre también en Node).
 */

export const TOLERANCIA = 0.01;
export const CATEGORIA_POR_DEFECTO = "rendimientos";

/* Lo que cuenta como rendimiento de una cuenta. */
const CATEGORIAS_RENDIMIENTO = new Set(["rendimientos", "interesesGenerales"]);
export const esRendimiento = (categoria) => CATEGORIAS_RENDIMIENTO.has(categoria || CATEGORIA_POR_DEFECTO);

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
 *  - Una cuenta nueva en el desglose entra como rendimiento.
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
      return [{ categoria: CATEGORIA_POR_DEFECTO, monto, nota: "", cuentaId, cuenta }];
    }
    const sumaPrevias = previas.reduce((suma, parte) => suma + parte.monto, 0);
    const sobrante = redondear(monto - sumaPrevias);
    return previas.map((parte, indice) => ({
      ...parte,
      cuenta,
      monto: indice === previas.length - 1 ? redondear(parte.monto + sobrante) : parte.monto,
    }));
  });

  /*
   * Si ninguna cuenta se movió en la dirección del cambio (p. ej. un historial
   * importado cuyo total no cuadra con los saldos), el día queda como una
   * parte sin cuenta: así el desglose siempre suma la diferencia del día.
   */
  const sinAsignar = redondear(porRepartir - atribucion.reduce((suma, parte) => suma + parte.monto, 0));
  const respaldo = Math.abs(sinAsignar) > TOLERANCIA
    ? [{ categoria: CATEGORIA_POR_DEFECTO, monto: sinAsignar, nota: "" }]
    : [];

  return [...porCuenta, ...manuales, ...respaldo];
};

const fechaDeKey = (fechaKey) => {
  const [y, m, d] = String(fechaKey || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Resumen del año por cuenta a partir del historial:
 *   { [cuentaId]: { rendimiento, aportes, otros, saldoPromedio, dias, tasaAnual } }
 * `tasaAnual` (en %) es aproximada: rendimiento / saldo promedio, anualizado.
 * Solo se calcula con al menos una semana de datos.
 */
export const resumenRendimientoPorCuenta = (historial = []) => {
  const resumen = {};
  const asegurar = (cuentaId) => {
    resumen[cuentaId] ||= { rendimiento: 0, aportes: 0, otros: 0, saldos: [], desde: null, hasta: null };
    return resumen[cuentaId];
  };

  [...(historial || [])]
    .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)))
    .forEach((snapshot) => {
      const fecha = fechaDeKey(snapshot.fechaKey);
      Object.entries(snapshot.saldos || {}).forEach(([cuentaId, saldo]) => {
        const item = asegurar(cuentaId);
        item.saldos.push(Math.abs(Number(saldo) || 0));
        if (fecha) {
          item.desde ||= fecha;
          item.hasta = fecha;
        }
      });
      (snapshot.incrementos || []).forEach((parte) => {
        if (!parte?.cuentaId) return;
        const item = asegurar(parte.cuentaId);
        const monto = Number(parte.monto) || 0;
        if (esRendimiento(parte.categoria)) item.rendimiento += monto;
        else if (parte.categoria === "aumentoCapital") item.aportes += monto;
        else item.otros += monto;
      });
    });

  return Object.fromEntries(Object.entries(resumen).map(([cuentaId, item]) => {
    const saldoPromedio = item.saldos.length
      ? item.saldos.reduce((suma, saldo) => suma + saldo, 0) / item.saldos.length
      : 0;
    const dias = item.desde && item.hasta ? Math.round((item.hasta - item.desde) / DIA_MS) : 0;
    const tasaAnual = dias >= 7 && saldoPromedio > 0
      ? (item.rendimiento / saldoPromedio) * (365 / dias) * 100
      : null;
    return [cuentaId, {
      rendimiento: redondear(item.rendimiento),
      aportes: redondear(item.aportes),
      otros: redondear(item.otros),
      saldoPromedio: redondear(saldoPromedio),
      dias,
      tasaAnual: tasaAnual === null ? null : Math.round(tasaAnual * 10) / 10,
    }];
  }));
};

/**
 * Rendimiento total del año: todas las partes clasificadas como rendimiento,
 * tengan cuenta o no. Un día sin desglose (los viejos, o los importados) se
 * toma completo como rendimiento, igual que en las gráficas.
 */
export const rendimientoTotalAnio = (historial = [], capitalInicial = null) => {
  let anterior = capitalInicial === null || capitalInicial === undefined ? null : Number(capitalInicial);
  let total = 0;
  [...(historial || [])]
    .sort((a, b) => String(a.fechaKey).localeCompare(String(b.fechaKey)))
    .forEach((snapshot) => {
      const capital = Number(snapshot.capitalTotal) || 0;
      const partes = snapshot.incrementos || [];
      if (partes.length > 0) {
        total += partes
          .filter((parte) => esRendimiento(parte?.categoria))
          .reduce((suma, parte) => suma + (Number(parte.monto) || 0), 0);
      } else if (anterior !== null) {
        total += capital - anterior;
      }
      anterior = capital;
    });
  return redondear(total);
};
