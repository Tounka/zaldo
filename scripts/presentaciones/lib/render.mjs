/*
 * Convierte una especificación validada (lib/esquema.mjs) en un HTML 16:9
 * autocontenido, con un diseño fijo definido en plantilla/.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLANTILLA = resolve(dirname(fileURLToPath(import.meta.url)), "..", "plantilla");
const leer = (archivo) => readFileSync(resolve(PLANTILLA, archivo), "utf8");

const escapar = (t = "") => String(t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Solo **negritas**: el resto se escapa.
const enriquecer = (t = "") => escapar(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

const CLASE_TONO = { bueno: "good", alerta: "warn", malo: "bad", info: "accent" };

const encabezado = (d) => `
  ${d.kicker ? `<div class="kicker">${escapar(d.kicker)}</div>` : ""}
  <h2>${enriquecer(d.titulo)}</h2>
  ${d.lead ? `<p class="lead">${enriquecer(d.lead)}</p>` : ""}`;

const pie = (texto) => `<div class="foot"><span>${enriquecer(texto)}</span><span class="pg"></span></div>`;

const tarjetas = (lista = []) => lista.map((t) =>
    `<div class="card ${CLASE_TONO[t.tono] || ""}"><h3>${enriquecer(t.titulo)}</h3><p>${enriquecer(t.texto)}</p></div>`).join("");

const puntos = (lista = [], numerada = true) => `<${numerada ? "ol" : "ul"} class="big">${lista.map((p) =>
    `<li>${p.titulo ? `<b>${enriquecer(p.titulo)}</b> ` : ""}${enriquecer(p.texto)}</li>`).join("")}</${numerada ? "ol" : "ul"}>`;

const RENDER = {
    portada: (d) => `
<section class="slide cover">
  <div class="cover-band"></div>
  <div>
    ${d.kicker ? `<div class="kicker">${escapar(d.kicker)}</div>` : ""}
    <h1>${enriquecer(d.titulo)}</h1>
    ${d.subtitulo ? `<p class="lead" style="margin-top:32px;font-size:36px">${enriquecer(d.subtitulo)}</p>` : ""}
  </div>
  <div class="cover-foot">
    ${d.kpiPortada ? `<div class="cover-kpi"><span class="num">${escapar(d.kpiPortada.valor)}</span><small>${enriquecer(d.kpiPortada.etiqueta)}</small></div>` : "<div></div>"}
    <div class="meta">${(d.meta || []).map((m, i) => `<div>${i ? enriquecer(m) : `<b>${enriquecer(m)}</b>`}</div>`).join("")}</div>
  </div>
</section>`,

    kpis: (d, _i, piePagina) => `
<section class="slide">${encabezado(d)}
  <div class="kpis">${(d.kpis || []).map((k) =>
        `<div class="kpi${k.tono === "info" ? " accent" : ""}"${k.tono === "malo" ? ' style="background:var(--bad-bg)"' : ""}><div class="v num">${escapar(k.valor)}</div><div class="l">${enriquecer(k.etiqueta)}</div></div>`).join("")}</div>
  ${d.puntos?.length ? `<div style="margin-top:42px">${puntos(d.puntos)}</div>` : ""}
  ${pie(piePagina)}
</section>`,

    grafica: (d, i, piePagina) => `
<section class="slide">${encabezado(d)}
  <div class="split">
    <div class="chart-wrap" style="flex:${d.tarjetas?.length ? 1.6 : 1}">
      <div class="legend"></div>
      <div class="chart" id="ch-${i}"></div>
    </div>
    ${d.tarjetas?.length ? `<div class="side">${tarjetas(d.tarjetas)}${d.nota ? `<p class="note">${enriquecer(d.nota)}</p>` : ""}</div>` : ""}
  </div>
  ${pie(!d.tarjetas?.length && d.nota ? d.nota : piePagina)}
</section>`,

    tabla: (d, _i, piePagina) => `
<section class="slide">${encabezado(d)}
  <table style="margin-top:28px">
    <thead><tr>${(d.columnas || []).map((c, j) => `<th${j ? ' class="r"' : ""}>${escapar(c)}</th>`).join("")}</tr></thead>
    <tbody>${(d.filas || []).map((f) => `<tr>${f.map((c, j) => `<td${j ? ' class="r num"' : ""}>${j ? enriquecer(c) : `<b>${enriquecer(c)}</b>`}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  ${d.nota ? `<p class="note" style="margin-top:18px">${enriquecer(d.nota)}</p>` : ""}
  ${pie(piePagina)}
</section>`,

    lista: (d, _i, piePagina) => {
        const mitad = Math.ceil((d.puntos || []).length / 2);
        const dos = (d.puntos || []).length > 4;
        return `
<section class="slide">${encabezado(d)}
  ${dos
        ? `<div class="two-col">${puntos(d.puntos.slice(0, mitad))}${puntos(d.puntos.slice(mitad)).replace('<ol class="big">', `<ol class="big" start="${mitad + 1}" style="counter-reset:n ${mitad}">`)}</div>`
        : `<div style="margin-top:36px">${puntos(d.puntos)}</div>`}
  ${pie(piePagina)}
</section>`;
    },

    tarjetas: (d, _i, piePagina) => `
<section class="slide">${encabezado(d)}
  <div class="grid3" style="margin-top:36px;grid-template-columns:repeat(${(d.tarjetas || []).length === 4 ? 2 : Math.min(3, (d.tarjetas || []).length)},1fr)">${tarjetas(d.tarjetas)}</div>
  ${d.nota ? `<p class="note" style="margin-top:22px">${enriquecer(d.nota)}</p>` : ""}
  ${pie(piePagina)}
</section>`,
};

export const renderizarPresentacion = (spec) => {
    const piePagina = spec.pie || spec.titulo;
    const graficas = {};
    const diapositivas = spec.diapositivas.map((d, i) => {
        if (d.tipo === "grafica") graficas[`ch-${i}`] = d.grafica;
        return RENDER[d.tipo](d, i, piePagina);
    }).join("\n");

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(spec.titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${leer("deck.css")}
</style>
</head>
<body>
<div id="progress"><i></i></div>
<div id="viewport"><div id="deck">
${diapositivas}
</div></div>
<div id="nav">
  <span id="counter" class="num"></span>
  <button id="prev" aria-label="Anterior">←</button>
  <button id="next" aria-label="Siguiente">→</button>
  <button id="theme" aria-label="Cambiar tema">◐</button>
  <button id="full" aria-label="Pantalla completa">⛶</button>
</div>
<script>
const GRAFICAS_SPEC = ${JSON.stringify(graficas).replace(/</g, "\\u003c")};
${leer("deck.js")}
${leer("graficas.js")}
ZV.deck(Object.fromEntries(Object.entries(GRAFICAS_SPEC).map(([id, g]) => [id, () => GRAFICAS(document.getElementById(id), g)])), ${JSON.stringify("zaldo-" + spec.titulo)});
</script>
</body>
</html>
`;
};
