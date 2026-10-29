/*
 * Rendimiento por cuenta en Ahorros.
 *
 * Cada snapshot diario guarda, además de los totales, el saldo de cada cuenta
 * (`saldos`, con signo: las responsabilidades restan). Con eso el cambio del
 * día se reparte entre las cuentas que lo originaron.
 *
 * Un movimiento entre cuentas (una baja 1,000 y otra sube 1,000) suma cero y
 * no se cuenta como ganancia. Pero solo se toma como traspaso cuando lo que
 * bajó y lo que subió se parecen; si no, cada cuenta conserva su propio cambio
 * (un gasto con tarjeta no se "come" el rendimiento de las demás):
 *
 *   A -1,000 · B +1,005  →  B +5
 *   A +3     · B +5      →  A +3, B +5
 *   A -1,757 · B +9      →  A -1,757 (retiro), B +9
 *
 * Por defecto una parte positiva se toma como rendimiento y una negativa como
 * retiro: sacar dinero no es perder rendimiento. Una subida muy por encima de
 * lo que esa cuenta suele rendir al día se separa como "Aumento a capital"
 * (meter 420 a una cuenta que rinde 14 al día: 420 aporte + 14 rendimiento).
 * Si una pérdida fue real (p. ej. una inversión que bajó), se cambia a
 * "Rendimientos" en el desglose.
 *
 * Sin dependencias de Firebase: lo usan la página, el asistente y el análisis
 * de IA (que corre también en Node).
 */

export const TOLERANCIA = 0.01;
export const CATEGORIA_POR_DEFECTO = "rendimientos";
export const CATEGORIA_RETIRO = "retiro";
export const CATEGORIA_APORTE = "aumentoCapital";

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

/*
 * Todo el día es un reacomodo si lo que bajó y lo que subió se parecen (90%).
 * Una bajada se empareja con una subida si la menor es al menos la mitad de la
 * mayor: 2,000 de una cuenta a otra que subió 2,434 es un traspaso de 2,000 y
 * 434 de más en la que recibió (aporte o rendimiento).
 */
const PARECIDO_TRASPASO = 0.9;
const PARECIDO_PAREJA = 0.5;
const pareceTraspaso = (a, b, umbral = PARECIDO_TRASPASO) => Math.min(a, b) >= umbral * Math.max(a, b);

/* Reparte `total` en proporción a los cambios; el centavo del redondeo va al más grande. */
const repartirProporcional = (cambios, total) => {
  const suma = cambios.reduce((acumulado, { delta }) => acumulado + delta, 0);
  if (!suma) return [];
  const partes = cambios.map(({ cuentaId, delta }) => ({ cuentaId, monto: redondear((total * delta) / suma) }));
  const sobrante = redondear(total - partes.reduce((acumulado, parte) => acumulado + parte.monto, 0));
  if (sobrante) {
    const mayor = partes.reduce((a, b) => (Math.abs(b.monto) > Math.abs(a.monto) ? b : a));
    mayor.monto = redondear(mayor.monto + sobrante);
  }
  return partes;
};

/**
 * Cambio de cada cuenta en el día, sin los traspasos entre cuentas.
 * Devuelve [{ cuentaId, monto }] con signo.
 *  - Una bajada se cancela contra una subida de tamaño parecido (un traspaso).
 *  - Si lo que queda sigue siendo un reacomodo (p. ej. 1,000 de una cuenta
 *    repartidos en otras dos), solo el neto es real y se reparte entre las
 *    cuentas que se movieron en su dirección.
 *  - Lo demás se queda en su cuenta tal cual.
 */
export const atribuirCambioPorCuenta = (saldosInicio = {}, saldosFin = {}, neto = 0) => {
  const total = redondear(neto);
  const ids = new Set([...Object.keys(saldosInicio || {}), ...Object.keys(saldosFin || {})]);
  const restante = new Map([...ids]
    .map((cuentaId) => [
      cuentaId,
      redondear((Number(saldosFin?.[cuentaId]) || 0) - (Number(saldosInicio?.[cuentaId]) || 0)),
    ])
    .filter(([, delta]) => Math.abs(delta) > TOLERANCIA));

  const cambios = () => [...restante.entries()]
    .map(([cuentaId, delta]) => ({ cuentaId, delta }))
    .filter(({ delta }) => Math.abs(delta) > TOLERANCIA);

  const usadas = new Set();
  cambios().filter(({ delta }) => delta < 0).sort((a, b) => a.delta - b.delta).forEach(({ cuentaId, delta }) => {
    const candidata = cambios()
      .filter((subida) => subida.delta > 0 && !usadas.has(subida.cuentaId) && pareceTraspaso(subida.delta, -delta, PARECIDO_PAREJA))
      .sort((a, b) => Math.abs(a.delta + delta) - Math.abs(b.delta + delta))[0];
    if (!candidata) return;
    usadas.add(candidata.cuentaId);
    const traspaso = Math.min(candidata.delta, -delta);
    restante.set(cuentaId, redondear(delta + traspaso));
    restante.set(candidata.cuentaId, redondear(candidata.delta - traspaso));
  });

  const quedan = cambios();
  const subidas = quedan.filter(({ delta }) => delta > 0);
  const bajadas = quedan.filter(({ delta }) => delta < 0);
  const sumaSubidas = subidas.reduce((acumulado, { delta }) => acumulado + delta, 0);
  const sumaBajadas = -bajadas.reduce((acumulado, { delta }) => acumulado + delta, 0);
  if (sumaSubidas > 0 && sumaBajadas > 0 && pareceTraspaso(sumaSubidas, sumaBajadas)) {
    if (Math.abs(total) <= TOLERANCIA) return [];
    return repartirProporcional(total > 0 ? subidas : bajadas, total)
      .filter((parte) => Math.abs(parte.monto) > TOLERANCIA);
  }

  return quedan.map(({ cuentaId, delta }) => ({ cuentaId, monto: delta }));
};

/*
 * Una subida es dinero nuevo si pasa de 5 veces lo que la cuenta suele rendir
 * al día (y de lo típico + 50). Sin historial no se adivina: queda como rendimiento.
 */
const VECES_APORTE = 5;
const MINIMO_APORTE = 50;
const pareceAporte = (monto, tipico) => tipico > 0 && monto > Math.max(tipico * VECES_APORTE, tipico + MINIMO_APORTE);

/**
 * Lo que cada cuenta suele rendir en un día: la mediana de sus rendimientos en
 * los últimos 14 snapshots antes de `antesDe` (con al menos 3 días que rindió).
 */
export const rendimientoTipicoPorCuenta = (historial = [], antesDe = null) => {
  const valores = {};
  ordenar(historial)
    .filter((snapshot) => !antesDe || String(snapshot.fechaKey) < String(antesDe))
    .slice(-14)
    .forEach((snapshot) => {
      const delDia = {};
      (snapshot.incrementos || []).forEach((parte) => {
        if (!parte?.cuentaId || !esRendimiento(parte.categoria)) return;
        delDia[parte.cuentaId] = (delDia[parte.cuentaId] || 0) + (Number(parte.monto) || 0);
      });
      Object.entries(delDia).forEach(([cuentaId, monto]) => {
        if (monto > TOLERANCIA) (valores[cuentaId] ||= []).push(monto);
      });
    });
  return Object.fromEntries(Object.entries(valores)
    .filter(([, lista]) => lista.length >= 3)
    .map(([cuentaId, lista]) => {
      const orden = [...lista].sort((a, b) => a - b);
      const medio = Math.floor(orden.length / 2);
      const mediana = orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
      return [cuentaId, redondear(mediana)];
    }));
};

/*
 * Rendimiento esperado hoy de cada cuenta según la tasa diaria que dieron las
 * demás (mediana, con al menos 2 cuentas que subieron): con Nu, Didi y Uala
 * rindiendo 0.04% diario, una cuenta de 53,840 debería dar ~21.
 */
const estimarTipicos = (atribucion, saldosInicio = {}) => {
  const tasas = atribucion
    .map(({ cuentaId, monto }) => ({ cuentaId, monto, saldo: Number(saldosInicio?.[cuentaId]) || 0 }))
    .filter(({ monto, saldo }) => monto > 0 && saldo > TOLERANCIA)
    .map((cambio) => ({ ...cambio, tasa: cambio.monto / cambio.saldo }));
  return Object.fromEntries(tasas.map(({ cuentaId, saldo }) => {
    const otras = tasas.filter((otra) => otra.cuentaId !== cuentaId).map((otra) => otra.tasa).sort((a, b) => a - b);
    if (otras.length < 2) return [cuentaId, 0];
    const medio = Math.floor(otras.length / 2);
    const mediana = otras.length % 2 ? otras[medio] : (otras[medio - 1] + otras[medio]) / 2;
    return [cuentaId, redondear(saldo * mediana)];
  }));
};

/* Partes con las que entra el cambio de una cuenta que aún no estaba en el desglose. */
const partesNuevas = (monto, { cuentaId, cuenta, tipico, saldoInicio }) => {
  const base = { nota: "", cuentaId, cuenta };
  // Una cuenta que arranca de cero no rinde: es dinero que entra.
  if (monto > 0 && Math.abs(Number(saldoInicio) || 0) <= TOLERANCIA) {
    return [{ ...base, categoria: CATEGORIA_APORTE, monto }];
  }
  if (pareceAporte(monto, tipico)) {
    return [
      { ...base, categoria: CATEGORIA_APORTE, monto: redondear(monto - tipico) },
      { ...base, categoria: CATEGORIA_POR_DEFECTO, monto: tipico },
    ];
  }
  return [{ ...base, categoria: categoriaPorSigno(monto), monto }];
};

/**
 * Desglose del día por cuenta, conservando lo que la persona ya clasificó:
 *  - Las partes SIN cuenta son manuales y se respetan tal cual (las de 0 se descartan).
 *  - Lo demás se reparte por cuenta. Si una cuenta ya tenía partes (p. ej. la
 *    separaste en capital y rendimiento), se conservan y el ajuste cae en la
 *    última; si el ajuste parece un aporte, entra aparte como aumento a capital.
 *  - Una cuenta nueva en el desglose entra como rendimiento si subió y como
 *    retiro si bajó, salvo que parezca un aporte.
 * `tipicos` = rendimientoTipicoPorCuenta del historial. Una cuenta sin
 * historial se compara con la tasa que dieron hoy las demás (estimarTipicos).
 */
export const desglosePorCuenta = ({ existentes = [], saldosInicio, saldosFin, neto, nombres = {}, tipicos = {} }) => {
  const partes = (Array.isArray(existentes) ? existentes : []).map((parte) => ({
    ...parte,
    categoria: parte?.categoria || CATEGORIA_POR_DEFECTO,
    monto: Number(parte?.monto) || 0,
    nota: parte?.nota || "",
  }));
  const manuales = partes.filter((parte) => !parte.cuentaId && Math.abs(parte.monto) > TOLERANCIA);
  const porRepartir = (Number(neto) || 0) - manuales.reduce((suma, parte) => suma + parte.monto, 0);
  const atribucion = atribuirCambioPorCuenta(saldosInicio, saldosFin, porRepartir);
  const estimados = estimarTipicos(atribucion, saldosInicio);

  const porCuenta = atribucion.flatMap(({ cuentaId, monto }) => {
    const previas = partes.filter((parte) => parte.cuentaId === cuentaId);
    const cuenta = nombres[cuentaId] || previas.at(-1)?.cuenta || "";
    const tipico = Number(tipicos?.[cuentaId]) || estimados[cuentaId] || 0;
    if (previas.length === 0) {
      return partesNuevas(monto, { cuentaId, cuenta, tipico, saldoInicio: saldosInicio?.[cuentaId] });
    }
    const conNombre = previas.map((parte) => ({ ...parte, cuenta }));
    const sobrante = redondear(monto - previas.reduce((suma, parte) => suma + parte.monto, 0));
    // El aporte va primero: los ajustes chicos de después siguen cayendo en el rendimiento.
    if (pareceAporte(sobrante, tipico)) {
      return [{ categoria: CATEGORIA_APORTE, monto: sobrante, nota: "", cuentaId, cuenta }, ...conNombre];
    }
    return cargarSobrante(conNombre, sobrante, { cuentaId, cuenta });
  });

  /*
   * Lo que no cuadra con los saldos (p. ej. un historial importado cuyo total
   * no coincide con las cuentas) queda como una parte sin cuenta: así el
   * desglose siempre suma la diferencia del día.
   */
  const sinAsignar = redondear(porRepartir - porCuenta.reduce((suma, parte) => suma + parte.monto, 0));
  const respaldo = Math.abs(sinAsignar) > TOLERANCIA
    ? [{ categoria: categoriaPorSigno(sinAsignar), monto: sinAsignar, nota: "" }]
    : [];

  return [...porCuenta, ...manuales, ...respaldo];
};

/**
 * Vuelve a calcular el desglose de un día desde los saldos, como si nunca se
 * hubiera clasificado. null si ese día o el anterior no guardaron saldos.
 */
export const recalcularDesgloseDelDia = ({ historial = [], fechaKey, capitalInicial = null, nombres = {} }) => {
  const ordenado = ordenar(historial);
  const idx = ordenado.findIndex((snapshot) => snapshot.fechaKey === fechaKey);
  if (idx < 0 || !ordenado[idx].saldos) return null;
  const anterior = ordenado[idx - 1];
  const capitalAnterior = anterior ? anterior.capitalTotal : capitalInicial;
  if (!anterior?.saldos || capitalAnterior === null || capitalAnterior === undefined) return null;
  return desglosePorCuenta({
    saldosInicio: anterior.saldos,
    saldosFin: ordenado[idx].saldos,
    neto: redondear((Number(ordenado[idx].capitalTotal) || 0) - Number(capitalAnterior)),
    nombres,
    tipicos: rendimientoTipicoPorCuenta(ordenado, fechaKey),
  });
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
