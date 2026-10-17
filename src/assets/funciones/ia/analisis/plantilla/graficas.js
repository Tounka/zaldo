/* global ZV */
/* Dibuja las gráficas declaradas en la especificación con la librería ZV (deck.js). */
const GRAFICAS = (() => {
  const {el, frame, xLabel, css, roundTop, fmt} = ZV;
  const COLORES = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"];
  const formatear = (formato) => formato === "porcentaje" ? (v) => v.toFixed(0) + "%"
    : formato === "numero" ? (v) => Math.round(v).toLocaleString("es-MX")
    : (v) => fmt(v);
  const corto = (formato) => formato === "porcentaje" ? (v) => Math.round(v) + "%"
    : formato === "numero" ? (v) => Math.round(v).toLocaleString("es-MX")
    : (v) => Math.abs(v) >= 1000 ? "$" + (v / 1000).toFixed(Math.abs(v) >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : "$" + Math.round(v);
  // Etiquetas del eje X: se recortan para que no se encimen.
  const recortar = (t, max) => t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
  // Escala "bonita": máximo redondeado y 5 marcas.
  const escala = (max) => {
    const paso0 = max / 5, mag = Math.pow(10, Math.floor(Math.log10(paso0 || 1)));
    const paso = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((p) => p >= paso0) || mag * 10;
    return {max: Math.ceil(max / paso) * paso || paso, paso};
  };

  function leyenda(host, g) {
    const lg = host.parentElement.querySelector(".legend");
    if (!lg) return;
    lg.innerHTML = g.series.length > 1 || g.tipo === "linea"
      ? g.series.map((s, i) => `<span><i class="sw" style="background:var(${COLORES[i % 8]})"></i>${s.nombre}</span>`).join("")
      : "";
  }

  function barras(host, g, apiladas) {
    const n = g.etiquetas.length;
    const totales = g.etiquetas.map((_, i) => apiladas ? g.series.reduce((a, s) => a + Math.max(0, s.valores[i]), 0) : Math.max(...g.series.map((s) => s.valores[i])));
    const {max, paso} = escala(Math.max(...totales, g.referencia?.valor || 0) * 1.12);
    const f = frame(host, max, paso, corto(g.formato), {l:96});
    const slot = f.iw / n, grupos = apiladas ? 1 : g.series.length;
    const bw = Math.min(70, slot * .64);
    const F = formatear(g.formato);
    g.etiquetas.forEach((et, i) => {
      const cx = f.m.l + slot * (i + .5);
      if (apiladas) {
        ZV.stack(f, cx, bw, g.series.map((s, j) => ({v: Math.max(0, s.valores[i]), c: COLORES[j % 8]})));
      } else {
        const w = bw / grupos;
        g.series.forEach((s, j) => {
          const v = Math.max(0, s.valores[i]), x = cx - bw / 2 + j * w;
          el("path", {d: roundTop(x + 1, f.y(v), w - 2, f.y(0) - f.y(v), 5), fill: css(COLORES[j % 8])}, f.svg);
        });
      }
      if (n <= 18) el("text", {x: cx, y: f.y(totales[i]) - 10, "text-anchor": "middle", fill: css("--ink"), "font-size": 16, "font-weight": 650}, f.svg).textContent = corto(g.formato)(Math.round(totales[i]));
      xLabel(f, cx, recortar(et, Math.max(6, Math.floor(slot / 10))), n > 14 ? 15 : 17);
      ZV.hit(f, cx, slot, () => `<b>${et}</b>` + g.series.map((s, j) => `<br><i class="sw" style="background:var(${COLORES[j % 8]})"></i>${s.nombre}: <b>${F(s.valores[i])}</b>`).join(""), f.y(totales[i]));
    });
    if (g.referencia) ZV.refLine(f, g.referencia.valor, g.referencia.etiqueta, "--ink-2", true);
  }

  function linea(host, g) {
    const n = g.etiquetas.length;
    const todos = g.series.flatMap((s) => s.valores);
    const {max, paso} = escala(Math.max(...todos, g.referencia?.valor || 0) * 1.1);
    const f = frame(host, max, paso, corto(g.formato), {l:100, r:40});
    const x = (i) => f.m.l + 20 + i * (f.iw - 40) / Math.max(n - 1, 1);
    const F = formatear(g.formato);
    g.series.forEach((s, j) => {
      const P = s.valores.map((v, i) => [x(i), f.y(v)]);
      if (g.series.length === 1) el("path", {d: `M${P[0][0]},${f.y(0)} ` + P.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${P.at(-1)[0]},${f.y(0)} Z`, fill: css(COLORES[j]), opacity: .14}, f.svg);
      el("path", {d: "M" + P.map((p) => p.join(",")).join(" L"), fill: "none", stroke: css(COLORES[j % 8]), "stroke-width": 4, "stroke-linejoin": "round"}, f.svg);
      el("circle", {cx: P.at(-1)[0], cy: P.at(-1)[1], r: 7, fill: css(COLORES[j % 8]), stroke: css("--surface"), "stroke-width": 3}, f.svg);
      el("text", {x: P.at(-1)[0] - 12, y: P.at(-1)[1] - 16, "text-anchor": "end", fill: css("--ink"), "font-size": 20, "font-weight": 700}, f.svg).textContent = corto(g.formato)(Math.round(s.valores.at(-1)));
    });
    const cada = Math.ceil(n / 8);
    g.etiquetas.forEach((et, i) => { if (i % cada === 0 || i === n - 1) xLabel(f, x(i), et, 17); });
    if (g.referencia) ZV.refLine(f, g.referencia.valor, g.referencia.etiqueta, "--good", true);
    const P0 = g.etiquetas.map((_, i) => [x(i), f.y(g.series[0].valores[i])]);
    ZV.crosshair(f, P0, (i) => `<b>${g.etiquetas[i]}</b>` + g.series.map((s, j) => `<br><i class="sw" style="background:var(${COLORES[j % 8]})"></i>${s.nombre}: <b>${F(s.valores[i])}</b>`).join(""));
  }

  return (host, g) => {
    leyenda(host, g);
    if (g.tipo === "linea") linea(host, g);
    else barras(host, g, g.tipo === "barras-apiladas");
  };
})();
