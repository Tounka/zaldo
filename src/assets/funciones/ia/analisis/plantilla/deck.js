/* Mini librería de gráficas SVG y navegación del deck (sin dependencias) */
const ZV = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (n, signo) => (signo && n > 0 ? "+" : n < 0 ? "−" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("es-MX");
  const lbl = k => { const [y, m] = k.split("-"); return MES[+m - 1] + "-" + y.slice(2); };
  const kFmt = v => v === 0 ? "0" : "$" + (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString("es-MX") + "k" : v);
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const roundTop = (x, y, w, h, r) => {
    r = Math.max(0, Math.min(r, h, w / 2));
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  };
  const roundBar = (x, y, w, h, r, lado) => {
    r = Math.max(0, Math.min(r, w, h / 2));
    return lado === "r"
      ? `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`
      : `M${x + w},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w}Z`;
  };

  // Marco con eje Y, cuadrícula y tooltip. yMin opcional para valores negativos.
  function frame(host, yMax, step, fmtY, margin = {}, yMin = 0) {
    host.innerHTML = "";
    const W = host.clientWidth, H = host.clientHeight;
    const m = {l:90, r:20, t:20, b:52, ...margin};
    const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, role:"img"}, host);
    const tip = document.createElement("div"); tip.className = "tip"; host.appendChild(tip);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const y = v => m.t + ih - (v - yMin) / (yMax - yMin) * ih;
    for (let v = yMin; v <= yMax + 1e-9; v += step) {
      el("line", {x1:m.l, x2:W - m.r, y1:y(v), y2:y(v), stroke:css("--line"), "stroke-width": v === 0 ? 2 : 1, "stroke-dasharray": v === 0 ? "" : "3 6"}, svg);
      el("text", {x:m.l - 16, y:y(v) + 7, "text-anchor":"end", fill:css("--ink-3"), "font-size":19}, svg).textContent = fmtY(v);
    }
    const showTip = (html, x, yy) => {
      tip.innerHTML = html; tip.style.opacity = 1;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(x - tw / 2, 0), W - tw) + "px";
      tip.style.top = Math.max(yy - th - 18, -10) + "px";
    };
    const hideTip = () => { tip.style.opacity = 0; };
    return {svg, W, H, m, iw, ih, y, showTip, hideTip, host};
  }
  const xLabel = (f, x, text, size = 19) => {
    el("text", {x, y:f.H - f.m.b + 34, "text-anchor":"middle", fill:css("--ink-3"), "font-size":size}, f.svg).textContent = text;
  };
  // Columna apilada desde 0 con separación de 2px y extremo superior redondeado
  function stack(f, cx, bw, parts) {
    const vis = parts.filter(p => p.v > 0);
    let acc = 0;
    vis.forEach((p, j) => {
      const yTop = f.y(acc + p.v), yBot = f.y(acc);
      const gap = acc > 0 ? 2 : 0, h = Math.max(yBot - yTop - gap, 1);
      if (j === vis.length - 1) el("path", {d:roundTop(cx - bw / 2, yTop, bw, h, 6), fill:css(p.c)}, f.svg);
      else el("rect", {x:cx - bw / 2, y:yTop, width:bw, height:h, fill:css(p.c)}, f.svg);
      acc += p.v;
    });
    return acc;
  }
  // Zona de hover más ancha que la barra
  function hit(f, cx, slot, html, yTip) {
    const r = el("rect", {x:cx - slot / 2, y:f.m.t, width:slot, height:f.ih, fill:"transparent"}, f.svg);
    const hl = el("rect", {x:cx - slot / 2 + 3, y:f.m.t, width:slot - 6, height:f.ih, fill:css("--ink"), opacity:0, rx:8, "pointer-events":"none"}, f.svg);
    f.svg.insertBefore(hl, f.svg.firstChild.nextSibling);
    r.addEventListener("mouseenter", () => { hl.setAttribute("opacity", .05); f.showTip(typeof html === "function" ? html() : html, cx, yTip); });
    r.addEventListener("mouseleave", () => { hl.setAttribute("opacity", 0); f.hideTip(); });
  }
  function refLine(f, v, text, color = "--ink-2", right = false) {
    el("line", {x1:f.m.l, x2:f.W - f.m.r, y1:f.y(v), y2:f.y(v), stroke:css(color), "stroke-width":2, "stroke-dasharray":"8 7"}, f.svg);
    el("text", {x: right ? f.W - f.m.r - 6 : f.m.l + 10, y:f.y(v) - 12, "text-anchor": right ? "end" : "start", fill:css(color), "font-size":19, "font-weight":650}, f.svg).textContent = text;
  }
  // Retícula vertical + tooltip para líneas
  function crosshair(f, P, html) {
    const cross = el("line", {y1:f.m.t, y2:f.m.t + f.ih, stroke:css("--ink-3"), "stroke-width":1.5, opacity:0}, f.svg);
    const dot = el("circle", {r:8, fill:css("--ink"), stroke:css("--surface"), "stroke-width":3, opacity:0}, f.svg);
    const area = el("rect", {x:f.m.l, y:f.m.t, width:f.iw, height:f.ih, fill:"transparent"}, f.svg);
    area.addEventListener("mousemove", e => {
      const r = f.svg.getBoundingClientRect(), sx = (e.clientX - r.left) * f.W / r.width;
      let i = 0, best = Infinity;
      P.forEach((p, j) => { const d = Math.abs(p[0] - sx); if (d < best) { best = d; i = j; } });
      cross.setAttribute("x1", P[i][0]); cross.setAttribute("x2", P[i][0]); cross.setAttribute("opacity", 1);
      dot.setAttribute("cx", P[i][0]); dot.setAttribute("cy", P[i][1]); dot.setAttribute("opacity", 1);
      f.showTip(html(i), P[i][0], P[i][1]);
    });
    area.addEventListener("mouseleave", () => { cross.setAttribute("opacity", 0); dot.setAttribute("opacity", 0); f.hideTip(); });
  }

  // Navegación: escala a pantalla completa, teclado, hash, tema, pantalla completa, impresión
  function deck(charts, storeKey) {
    const slides = [...document.querySelectorAll(".slide")];
    const deckEl = document.getElementById("deck");
    slides.forEach((s, i) => { const pg = s.querySelector(".pg"); if (pg) pg.textContent = i + 1; });
    let cur = 0;
    try { cur = Math.min(+(sessionStorage.getItem(storeKey) || 0), slides.length - 1); } catch { /* sin almacenamiento: se ignora */ }
    if (/^#\d+$/.test(location.hash)) cur = Math.min(+location.hash.slice(1) - 1, slides.length - 1);
    const draw = s => s.querySelectorAll(".chart").forEach(c => charts[c.id] && charts[c.id]());
    const fit = () => {
      const W = innerWidth, H = innerHeight, s = Math.min(W / 1920, H / 1080);
      deckEl.style.transform = `translate(${(W - 1920 * s) / 2}px, ${(H - 1080 * s) / 2}px) scale(${s})`;
    };
    const show = i => {
      cur = Math.max(0, Math.min(slides.length - 1, i));
      slides.forEach((s, j) => s.classList.toggle("active", j === cur));
      document.getElementById("counter").textContent = `${cur + 1} / ${slides.length}`;
      document.querySelector("#progress i").style.width = ((cur + 1) / slides.length * 100) + "%";
      try { sessionStorage.setItem(storeKey, cur); } catch { /* sin almacenamiento: se ignora */ }
      // En un iframe aislado (sandbox sin same-origin) cambiar el hash puede fallar: no es grave.
      try { history.replaceState(null, "", "#" + (cur + 1)); } catch { /* se ignora */ }
      draw(slides[cur]);
    };
    const full = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    };
    document.getElementById("prev").onclick = () => show(cur - 1);
    document.getElementById("next").onclick = () => show(cur + 1);
    document.getElementById("full").onclick = full;
    document.getElementById("theme").onclick = () => {
      const root = document.documentElement;
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      draw(slides[cur]);
    };
    addEventListener("keydown", e => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); show(cur + 1); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); show(cur - 1); }
      if (e.key === "Home") show(0);
      if (e.key === "End") show(slides.length - 1);
      if (e.key === "f" || e.key === "F") full();
    });
    // En el teléfono se cambia de diapositiva deslizando a los lados.
    let toque = null;
    addEventListener("touchstart", e => { toque = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, {passive: true});
    addEventListener("touchend", e => {
      if (!toque) return;
      const dx = e.changedTouches[0].clientX - toque[0], dy = e.changedTouches[0].clientY - toque[1];
      toque = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
    }, {passive: true});
    addEventListener("resize", fit);
    // Al imprimir (PDF) todo va en tema claro: las gráficas leen los colores al dibujarse.
    let temaPrevio = null;
    addEventListener("beforeprint", () => {
      temaPrevio = document.documentElement.dataset.theme || "";
      document.documentElement.dataset.theme = "light";
      document.body.classList.add("imprimiendo");
      slides.forEach(s => { s.classList.add("active"); draw(s); });
    });
    addEventListener("afterprint", () => {
      if (temaPrevio) document.documentElement.dataset.theme = temaPrevio;
      else delete document.documentElement.dataset.theme;
      document.body.classList.remove("imprimiendo");
      show(cur);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => draw(slides[cur]));
    fit(); show(cur);
  }

  return {el, frame, xLabel, kFmt, fmt, lbl, css, roundTop, roundBar, stack, hit, refLine, crosshair, deck};
})();
