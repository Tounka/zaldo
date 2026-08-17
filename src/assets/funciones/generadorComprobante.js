/**
 * Generador de Comprobantes de Pago Estéticos y Formales usando HTML5 Canvas.
 * Genera imágenes PNG en alta definición (2x Retina) para descarga o compartir por WhatsApp.
 */

import { fnFormatMoney, formatFechaLegible, formatFechaHora } from "./prestamosCalculos";

/**
 * Dibuja un comprobante estético y formal en un HTML5 Canvas.
 */
export const generarCanvasComprobante = (datos) => {
    const {
        nombreDeudor = "Cliente",
        numeroPago = 1,
        totalPagos = null,
        montoPagado = 0,
        fechaPactada = "",
        fechaPago = new Date(),
        diasAtraso = 0,
        saldoAnterior = 0,
        saldoRestante = 0,
        prestamoNombre = "",
        folio = "REC-" + Date.now().toString().slice(-6),
        cobradoPor = "Administración Zaldo",
    } = datos;

    const width = 750;
    const height = 1060;
    const scale = 2; // Alta resolución

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // ── Fondo General ──
    ctx.fillStyle = "#F6F5FA";
    ctx.fillRect(0, 0, width, height);

    // ── Tarjeta Principal (Ticket) ──
    const cardX = 35;
    const cardY = 35;
    const cardW = width - 70;
    const cardH = height - 70;
    const radius = 24;

    // Sombra de la tarjeta
    ctx.save();
    ctx.shadowColor = "rgba(83, 59, 143, 0.15)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#FFFFFF";

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // Borde de la tarjeta
    ctx.strokeStyle = "rgba(83, 59, 143, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.stroke();

    // ── HEADER CON GRADIENTE ──
    const headerH = 145;
    const gradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
    gradient.addColorStop(0, "#533B8F");
    gradient.addColorStop(1, "#362164");

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, headerH, [radius, radius, 0, 0]);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Logo / Nombre App
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("ZALDO", cardX + 32, cardY + 45);

    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText("SISTEMA DE GESTIÓN Y COBRANZA", cardX + 32, cardY + 65);

    // Título Central Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("COMPROBANTE OFICIAL DE ABONO", cardX + 32, cardY + 105);

    // Folio y Fecha en Header (Derecha)
    ctx.textAlign = "right";
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, monospace";
    ctx.fillStyle = "#FFD54F";
    ctx.fillText(`FOLIO: #${folio}`, cardX + cardW - 32, cardY + 45);

    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText(`Emisión: ${formatFechaLegible(fechaPago)}`, cardX + cardW - 32, cardY + 65);
    ctx.restore();

    ctx.textAlign = "left";

    // ── CAJA DE MONTO ABONADO ──
    const montoY = cardY + headerH + 28;
    ctx.fillStyle = "rgba(83, 59, 143, 0.05)";
    ctx.beginPath();
    ctx.roundRect(cardX + 30, montoY, cardW - 60, 110, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(83, 59, 143, 0.15)";
    ctx.stroke();

    ctx.fillStyle = "#533B8F";
    ctx.font = "600 12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("MONTO ABONADO", cardX + 50, montoY + 35);

    ctx.font = "800 38px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#1A1A2E";
    ctx.fillText(fnFormatMoney(montoPagado), cardX + 50, montoY + 80);

    // Badge de Cuota a la derecha del monto
    const textoCuota = totalPagos ? `Pago ${numeroPago} de ${totalPagos}` : `Pago #${numeroPago}`;
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, sans-serif";
    const cuotaW = ctx.measureText(textoCuota).width + 24;
    const cuotaX = cardX + cardW - 50 - cuotaW;
    const cuotaY = montoY + 45;

    ctx.fillStyle = "#533B8F";
    ctx.beginPath();
    ctx.roundRect(cuotaX, cuotaY, cuotaW, 32, 16);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(textoCuota, cuotaX + 12, cuotaY + 21);

    // ── DATOS DEL DEUDOR ──
    let curY = montoY + 145;
    ctx.fillStyle = "#888899";
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("DEUDOR / CLIENTE", cardX + 32, curY);

    curY += 24;
    ctx.fillStyle = "#1A1A2E";
    ctx.font = "800 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(nombreDeudor, cardX + 32, curY);

    if (prestamoNombre && prestamoNombre !== nombreDeudor) {
        curY += 18;
        ctx.fillStyle = "#666";
        ctx.font = "500 12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText(`Ref: ${prestamoNombre}`, cardX + 32, curY);
    }

    // ── LÍNEA DIVISORIA ──
    curY += 24;
    ctx.strokeStyle = "rgba(83, 59, 143, 0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cardX + 32, curY);
    ctx.lineTo(cardX + cardW - 32, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── TABLA DE DETALLES DEL PAGO ──
    curY += 30;

    const dibujarFila = (etiqueta, valor, esDestacado = false, colorValor = "#1A1A2E") => {
        ctx.font = esDestacado ? "700 13px -apple-system, BlinkMacSystemFont, sans-serif" : "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = esDestacado ? "#533B8F" : "#777788";
        ctx.fillText(etiqueta, cardX + 32, curY);

        ctx.textAlign = "right";
        ctx.font = esDestacado ? "800 16px -apple-system, BlinkMacSystemFont, sans-serif" : "700 13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colorValor;
        ctx.fillText(valor, cardX + cardW - 32, curY);
        ctx.textAlign = "left";

        curY += 28;
    };

    dibujarFila("Fecha programada de corte:", fechaPactada ? formatFechaLegible(fechaPactada) : "N/A");
    dibujarFila("Fecha y hora de pago:", formatFechaHora(fechaPago));

    // Estado de puntualidad
    if (diasAtraso > 0) {
        dibujarFila("Estatus de pago:", `⚠️ Atraso de ${diasAtraso} día${diasAtraso > 1 ? "s" : ""}`, false, "#E65100");
    } else {
        dibujarFila("Estatus de pago:", "✓ Pagado a tiempo", false, "#28A745");
    }

    if (saldoAnterior > 0) {
        dibujarFila("Deuda antes de este abono:", fnFormatMoney(saldoAnterior));
    }

    dibujarFila("Abono aplicado:", `- ${fnFormatMoney(montoPagado)}`, false, "#28A745");

    // ── CAJA SALDO RESTANTE DESTACADO ──
    curY += 10;
    const saldoBoxY = curY;
    const esLiquidado = Number(saldoRestante) <= 0;

    ctx.fillStyle = esLiquidado ? "rgba(40, 167, 69, 0.08)" : "rgba(83, 59, 143, 0.06)";
    ctx.beginPath();
    ctx.roundRect(cardX + 30, saldoBoxY, cardW - 60, 65, 14);
    ctx.fill();

    ctx.fillStyle = esLiquidado ? "#28A745" : "#533B8F";
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(esLiquidado ? "ESTATUS DE LIQUIDACIÓN:" : "SALDO / DEUDA RESTANTE:", cardX + 48, saldoBoxY + 38);

    ctx.textAlign = "right";
    ctx.font = "800 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = esLiquidado ? "#28A745" : "#1A1A2E";
    ctx.fillText(esLiquidado ? "TOTALMENTE SALDADO ✓" : fnFormatMoney(saldoRestante), cardX + cardW - 48, saldoBoxY + 38);
    ctx.textAlign = "left";

    // ── FOOTER Y SELLO DIGITAL ──
    curY = cardY + cardH - 120;

    // Línea divisoria footer
    ctx.strokeStyle = "rgba(83, 59, 143, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 32, curY);
    ctx.lineTo(cardX + cardW - 32, curY);
    ctx.stroke();

    curY += 28;
    ctx.fillStyle = "#28A745";
    ctx.font = "700 12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("✓ PAGO ACREDITADO Y REGISTRADO", cardX + 32, curY);

    ctx.textAlign = "right";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#888899";
    ctx.fillText(`Registrado por: ${cobradoPor}`, cardX + cardW - 32, curY);
    ctx.textAlign = "left";

    curY += 22;
    ctx.fillStyle = "#9999AA";
    ctx.font = "400 10.5px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Este comprobante avala el pago recibido. Consérvelo para cualquier aclaración.", cardX + 32, curY);

    curY += 18;
    ctx.fillStyle = "#AAAAAA";
    ctx.font = "400 9px monospace";
    ctx.fillText(`VERIF-HASH: ${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`, cardX + 32, curY);

    return canvas;
};

/**
 * Obtiene el DataURL en formato PNG del comprobante
 */
export const obtenerDataUrlComprobante = (datos) => {
    const canvas = generarCanvasComprobante(datos);
    return canvas.toDataURL("image/png");
};

/**
 * Descarga directamente la imagen PNG del comprobante al dispositivo
 */
export const descargarComprobanteImagen = (datos) => {
    const canvas = generarCanvasComprobante(datos);
    const dataUrl = canvas.toDataURL("image/png");

    const nombreArchivo = `Comprobante_Pago_${(datos.nombreDeudor || "Cliente").replace(/\s+/g, "_")}_${datos.numeroPago || "1"}.png`;

    const enlace = document.createElement("a");
    enlace.download = nombreArchivo;
    enlace.href = dataUrl;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
};

const escaparHtml = (valor) => String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Abre una hoja optimizada para impresión y para "Guardar como PDF".
 * No depende de librerías externas: utiliza el diálogo nativo del navegador,
 * que conserva tipografías, colores y el tamaño A4 del comprobante.
 */
const _abrirComprobantePdfLegacy = (datos = {}) => {
    const ventana = window.open("", "_blank", "width=820,height=1050");
    if (!ventana) {
        window.alert("Permite las ventanas emergentes para imprimir el comprobante.");
        return;
    }

    const nombre = escaparHtml(datos.nombreDeudor || "Cliente");
    const pago = datos.totalPagos
        ? `Pago ${escaparHtml(datos.numeroPago || 1)} de ${escaparHtml(datos.totalPagos)}`
        : `Pago #${escaparHtml(datos.numeroPago || 1)}`;
    const liquidado = Number(datos.saldoRestante || 0) <= 0;
    const fechaPago = escaparHtml(formatFechaHora(datos.fechaPago));
    const fechaPactada = datos.fechaPactada ? escaparHtml(formatFechaLegible(datos.fechaPactada)) : "No especificada";
    const notas = datos.notas ? `<div class="notes"><span>Nota del abono</span><p>${escaparHtml(datos.notas)}</p></div>` : "";

    ventana.document.open();
    ventana.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Comprobante ${nombre} · Zaldo</title>
          <style>
            @page { size: A4; margin: 0; }
            :root { color-scheme: light; font-family: "Trebuchet MS", "Segoe UI", sans-serif; color: #1a1a2e; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #eeeaf8; padding: 30px; }
            .sheet { width: 100%; max-width: 760px; min-height: 1000px; margin: 0 auto; background: #fff; border: 1px solid #e4dff0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(50, 33, 100, .18); }
            .top { color: #fff; padding: 34px 42px 38px; background: linear-gradient(125deg, #30205f 0%, #533b8f 55%, #8e6dd4 100%); position: relative; }
            .top:after { content: ""; position: absolute; width: 220px; height: 220px; right: -70px; top: -100px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; box-shadow: 0 0 0 28px rgba(255,255,255,.04), 0 0 0 56px rgba(255,255,255,.03); }
            .brand { font-weight: 900; letter-spacing: .22em; font-size: 24px; }
            .eyebrow { color: #e8ddff; font-size: 11px; letter-spacing: .13em; font-weight: 800; margin-top: 8px; }
            .top-line { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; position: relative; z-index: 1; }
            .folio { text-align: right; font-size: 11px; color: #f5eaa6; line-height: 1.7; }
            .title { position: relative; z-index: 1; margin: 42px 0 0; font-size: 25px; letter-spacing: -.02em; }
            .subtitle { position: relative; z-index: 1; color: rgba(255,255,255,.76); font-size: 12px; margin-top: 6px; }
            .content { padding: 34px 42px 42px; }
            .amount { border: 1px solid #e5e0f2; border-radius: 18px; padding: 20px 24px; background: linear-gradient(135deg, #faf9fe, #f3effb); display: flex; align-items: center; justify-content: space-between; gap: 18px; }
            .label { color: #766b8f; text-transform: uppercase; letter-spacing: .1em; font-size: 10px; font-weight: 900; }
            .amount-value { color: #30205f; font-size: 36px; line-height: 1.1; font-weight: 900; margin-top: 8px; }
            .badge { background: #533b8f; color: #fff; border-radius: 99px; padding: 9px 14px; font-size: 11px; font-weight: 800; white-space: nowrap; }
            .client { margin-top: 30px; padding-bottom: 25px; border-bottom: 1px dashed #d8d1e8; }
            .client-name { font-size: 23px; font-weight: 900; margin-top: 9px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 34px; margin-top: 28px; }
            .detail { border-bottom: 1px solid #eeeaf4; padding-bottom: 12px; }
            .detail strong { display: block; font-size: 14px; margin-top: 6px; }
            .status { margin-top: 30px; border-radius: 16px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; background: ${liquidado ? "#ecf9f0" : "#f4f0fb"}; color: ${liquidado ? "#1f8a46" : "#533b8f"}; }
            .status strong { font-size: 18px; }
            .notes { margin-top: 26px; padding: 15px 18px; border-left: 4px solid #8e6dd4; border-radius: 0 12px 12px 0; background: #faf9fc; }
            .notes span { color: #766b8f; text-transform: uppercase; letter-spacing: .1em; font-size: 10px; font-weight: 900; }
            .notes p { margin: 7px 0 0; font-size: 13px; line-height: 1.5; }
            .footer { margin-top: 58px; border-top: 1px solid #eeeaf4; padding-top: 18px; color: #928ba1; font-size: 10px; display: flex; justify-content: space-between; gap: 20px; }
            .footer strong { color: #28a745; }
            @media print { body { padding: 0; background: #fff; } .sheet { max-width: none; min-height: 100vh; border: 0; border-radius: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="top">
              <div class="top-line">
                <div><div class="brand">ZALDO</div><div class="eyebrow">GESTIÓN Y COBRANZA PERSONAL</div></div>
                <div class="folio">FOLIO<br><strong>#${escaparHtml(datos.folio || "REC-" + Date.now().toString().slice(-6))}</strong><br>${fechaPago}</div>
              </div>
              <h1 class="title">Comprobante oficial de abono</h1>
              <div class="subtitle">Constancia de pago recibida y aplicada a la cuenta del cliente.</div>
            </header>
            <section class="content">
              <div class="amount"><div><div class="label">Monto abonado</div><div class="amount-value">${escaparHtml(fnFormatMoney(datos.montoPagado || 0))}</div></div><div class="badge">${pago}</div></div>
              <div class="client"><div class="label">Deudor / cliente</div><div class="client-name">${nombre}</div></div>
              <div class="details">
                <div class="detail"><div class="label">Fecha del abono</div><strong>${fechaPago}</strong></div>
                <div class="detail"><div class="label">Fecha pactada</div><strong>${fechaPactada}</strong></div>
                <div class="detail"><div class="label">Deuda antes del abono</div><strong>${escaparHtml(fnFormatMoney(datos.saldoAnterior || 0))}</strong></div>
                <div class="detail"><div class="label">Puntualidad</div><strong>${Number(datos.diasAtraso || 0) > 0 ? `Atraso de ${datos.diasAtraso} día(s)` : "Pago puntual"}</strong></div>
              </div>
              <div class="status"><span>${liquidado ? "Estado de la cuenta" : "Saldo pendiente"}</span><strong>${liquidado ? "Cuenta liquidada ✓" : escaparHtml(fnFormatMoney(datos.saldoRestante || 0))}</strong></div>
              ${notas}
              <div class="footer"><span><strong>✓ Pago acreditado y registrado</strong><br>Registrado por: ${escaparHtml(datos.cobradoPor || "Administración Zaldo")}</span><span>Conserve este comprobante para cualquier aclaración.</span></div>
            </section>
          </main>
        </body>
      </html>`);
    ventana.document.close();
    ventana.focus();
    ventana.onafterprint = () => ventana.close();
    ventana.setTimeout(() => ventana.print(), 350);
};

/**
 * Abre un comprobante editorial listo para imprimir o guardar como PDF.
 */
export const abrirComprobantePdf = (datos = {}) => {
    const ventana = window.open("", "_blank", "width=820,height=1050");
    if (!ventana) {
        window.alert("Permite las ventanas emergentes para imprimir el comprobante.");
        return;
    }

    const nombre = escaparHtml(datos.nombreDeudor || "Cliente");
    const iniciales = escaparHtml(String(datos.nombreDeudor || "Cliente")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase());
    const pago = datos.totalPagos
        ? `Pago ${escaparHtml(datos.numeroPago || 1)} de ${escaparHtml(datos.totalPagos)}`
        : `Pago #${escaparHtml(datos.numeroPago || 1)}`;
    const liquidado = Number(datos.saldoRestante || 0) <= 0;
    const atrasado = Number(datos.diasAtraso || 0) > 0;
    const fechaPago = escaparHtml(formatFechaHora(datos.fechaPago));
    const fechaPactada = datos.fechaPactada ? escaparHtml(formatFechaLegible(datos.fechaPactada)) : "No especificada";
    const notas = datos.notas ? `<div class="notes"><span>Nota del abono</span><p>${escaparHtml(datos.notas)}</p></div>` : "";
    const folio = escaparHtml(datos.folio || "REC-" + Date.now().toString().slice(-6));

    ventana.document.open();
    ventana.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Comprobante ${nombre} · Zaldo</title>
          <style>
            @page { size: A4; margin: 12mm; }
            :root { color-scheme: light; font-family: "Avenir Next", "Gill Sans", "Segoe UI", sans-serif; color: #292331; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #e9e5ee; padding: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sheet { width: 100%; max-width: 780px; margin: 0 auto; background: #fbfaf7; border: 1px solid #d9d0df; border-radius: 28px; overflow: hidden; box-shadow: 0 26px 70px rgba(47, 33, 67, .2); }
            .masthead { color: #fff; padding: 38px 44px 64px; background: #292234; position: relative; overflow: hidden; }
            .masthead:before { content: ""; position: absolute; width: 360px; height: 360px; right: -145px; top: -210px; border: 1px solid rgba(231, 213, 165, .34); border-radius: 50%; box-shadow: 0 0 0 24px rgba(231, 213, 165, .08), 0 0 0 49px rgba(231, 213, 165, .05); }
            .masthead:after { content: ""; position: absolute; width: 180px; height: 180px; left: -125px; bottom: -130px; border: 1px solid rgba(159, 130, 205, .45); border-radius: 50%; }
            .top-line { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; position: relative; z-index: 1; }
            .brand-lockup { display: flex; align-items: center; gap: 12px; }
            .logo-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; background: #d9c8ff; color: #292234; font-family: Georgia, serif; font-weight: 900; font-size: 23px; box-shadow: 7px 7px 0 rgba(231, 213, 165, .22); }
            .brand { font-weight: 900; letter-spacing: .2em; font-size: 21px; }
            .eyebrow { color: #d9c8ff; font-size: 9px; letter-spacing: .16em; font-weight: 800; margin-top: 6px; }
            .folio { text-align: right; font-size: 9px; color: #bdb5c9; line-height: 1.7; letter-spacing: .13em; }
            .folio strong { display: inline-block; color: #e7d5a5; font-size: 13px; letter-spacing: .08em; margin-top: 3px; }
            .title { position: relative; z-index: 1; max-width: 520px; margin: 46px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 33px; line-height: 1.05; letter-spacing: -.035em; font-weight: 500; }
            .subtitle { position: relative; z-index: 1; max-width: 430px; color: #bdb5c9; font-size: 12px; line-height: 1.5; margin-top: 12px; }
            .amount-panel { position: relative; z-index: 2; margin: -34px 40px 0; padding: 25px 28px; border: 1px solid #e0d6e5; border-radius: 20px; background: #fffefa; display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; box-shadow: 0 14px 30px rgba(47, 33, 67, .12); }
            .label { color: #827489; text-transform: uppercase; letter-spacing: .14em; font-size: 9px; font-weight: 900; }
            .amount-value { color: #292234; font-family: Georgia, "Times New Roman", serif; font-size: 38px; line-height: 1.08; font-weight: 700; margin-top: 8px; letter-spacing: -.035em; }
            .amount-note { color: #827489; font-size: 11px; margin-top: 8px; }
            .badge { background: #2b8b76; color: #fff; border-radius: 99px; padding: 9px 13px; font-size: 10px; font-weight: 900; letter-spacing: .08em; white-space: nowrap; }
            .content { padding: 30px 40px 40px; }
            .client { display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 14px; padding: 2px 0 26px; border-bottom: 1px dashed #d7ccdb; }
            .avatar { width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid #d9c8ff; border-radius: 16px; background: #f0ebfa; color: #5e458c; font-family: Georgia, serif; font-size: 20px; font-weight: 700; }
            .client-name { color: #292234; font-size: 20px; font-weight: 900; margin-top: 5px; }
            .client-ref { text-align: right; color: #827489; font-size: 10px; line-height: 1.6; }
            .client-ref strong { display: block; color: #5e458c; font-size: 11px; }
            .section-heading { display: flex; align-items: center; gap: 10px; margin: 28px 0 14px; color: #5e458c; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-weight: 900; }
            .section-heading:after { content: ""; height: 1px; flex: 1; background: #e5dde8; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 0 34px; }
            .detail { min-height: 66px; padding: 15px 0 12px; border-bottom: 1px solid #ebe4ed; }
            .detail strong { display: block; color: #292234; font-size: 13px; line-height: 1.35; margin-top: 7px; }
            .status { margin-top: 28px; border: 1px solid ${liquidado ? "#b8e1d3" : "#ddd0ed"}; border-radius: 18px; padding: 18px 20px; display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 13px; background: ${liquidado ? "#edf8f4" : "#f5f0fa"}; color: ${liquidado ? "#267b69" : "#5e458c"}; }
            .status-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: ${liquidado ? "#2b8b76" : "#7654a7"}; color: #fff; font-size: 17px; font-weight: 900; }
            .status-title { color: #827489; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; font-weight: 900; }
            .status-copy { color: #292234; font-size: 12px; font-weight: 800; margin-top: 5px; }
            .status strong { font-family: Georgia, "Times New Roman", serif; font-size: 17px; text-align: right; }
            .notes { margin-top: 23px; padding: 15px 18px; border-left: 3px solid #d0b86c; border-radius: 0 13px 13px 0; background: #fffaf0; }
            .notes span { color: #9a7b30; text-transform: uppercase; letter-spacing: .12em; font-size: 9px; font-weight: 900; }
            .notes p { color: #534a57; margin: 7px 0 0; font-size: 12px; line-height: 1.55; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 22px; margin-top: 44px; padding-top: 19px; border-top: 1px solid #e5dde8; color: #827489; font-size: 10px; line-height: 1.55; }
            .footer strong { color: #2b8b76; font-size: 10px; letter-spacing: .04em; }
            .seal { width: 64px; height: 64px; flex-shrink: 0; display: grid; place-items: center; border: 1px dashed #b9a9c5; border-radius: 50%; color: #7654a7; font-size: 8px; letter-spacing: .08em; text-align: center; text-transform: uppercase; transform: rotate(-8deg); }
            .seal b { display: block; font-size: 16px; line-height: 1; margin-bottom: 3px; }
            @media (max-width: 620px) { body { padding: 12px; } .masthead { padding: 30px 24px 56px; } .content { padding: 24px; } .amount-panel { margin-left: 20px; margin-right: 20px; padding: 20px; } .amount-value { font-size: 31px; } .client { grid-template-columns: 44px 1fr; } .avatar { width: 44px; height: 44px; } .client-ref { grid-column: 2; text-align: left; } }
            @media print { body { padding: 0; background: #fff; } .sheet { max-width: none; border: 0; border-radius: 0; box-shadow: none; } .masthead { border-radius: 0; } .amount-panel { box-shadow: none; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="masthead">
              <div class="top-line">
                <div class="brand-lockup"><div class="logo-mark">Z</div><div><div class="brand">ZALDO</div><div class="eyebrow">GESTIÓN Y COBRANZA PERSONAL</div></div></div>
                <div class="folio">FOLIO<br><strong>#${folio}</strong><br>${fechaPago}</div>
              </div>
              <h1 class="title">Comprobante oficial<br />de abono</h1>
              <div class="subtitle">Constancia de pago recibida y aplicada a la cuenta del cliente.</div>
            </header>
            <section class="amount-panel">
              <div><div class="label">Monto recibido</div><div class="amount-value">${escaparHtml(fnFormatMoney(datos.montoPagado || 0))}</div><div class="amount-note">Abono aplicado a la cuenta del cliente</div></div>
              <div class="badge">PAGO RECIBIDO</div>
            </section>
            <section class="content">
              <div class="client">
                <div class="avatar">${iniciales}</div>
                <div><div class="label">Deudor / cliente</div><div class="client-name">${nombre}</div></div>
                <div class="client-ref">REFERENCIA DE PAGO<strong>${pago}</strong></div>
              </div>
              <div class="section-heading">Detalle de la operación</div>
              <div class="details">
                <div class="detail"><div class="label">Fecha del abono</div><strong>${fechaPago}</strong></div>
                <div class="detail"><div class="label">Fecha pactada</div><strong>${fechaPactada}</strong></div>
                <div class="detail"><div class="label">Deuda antes del abono</div><strong>${escaparHtml(fnFormatMoney(datos.saldoAnterior || 0))}</strong></div>
                <div class="detail"><div class="label">Puntualidad</div><strong>${atrasado ? `Atraso de ${datos.diasAtraso} día(s)` : "Pago puntual"}</strong></div>
              </div>
              <div class="status">
                <div class="status-icon">${liquidado ? "✓" : "↗"}</div>
                <div><div class="status-title">${liquidado ? "Estado de la cuenta" : "Saldo pendiente"}</div><div class="status-copy">${liquidado ? "La cuenta ha quedado totalmente liquidada" : "El saldo queda en seguimiento"}</div></div>
                <strong>${liquidado ? "LIQUIDADA" : escaparHtml(fnFormatMoney(datos.saldoRestante || 0))}</strong>
              </div>
              ${notas}
              <div class="footer"><span><strong>✓ PAGO ACREDITADO Y REGISTRADO</strong><br />Registrado por: ${escaparHtml(datos.cobradoPor || "Administración Zaldo")}<br />Conserve este comprobante para cualquier aclaración.</span><span class="seal"><span><b>✓</b>Verificado<br />Zaldo</span></span></div>
            </section>
          </main>
        </body>
      </html>`);
    ventana.document.close();
    ventana.focus();
    ventana.onafterprint = () => ventana.close();
    ventana.setTimeout(() => ventana.print(), 350);
};

/**
 * Comparte el comprobante por WhatsApp o Web Share API
 */
export const compartirComprobante = async (datos) => {
    const textoMensaje = `🧾 *COMPROBANTE DE PAGO ZALDO*
👤 *Deudor:* ${datos.nombreDeudor}
🔢 *Pago:* #${datos.numeroPago}${datos.totalPagos ? ` de ${datos.totalPagos}` : ""}
💵 *Monto Abonado:* ${fnFormatMoney(datos.montoPagado)}
📅 *Fecha de Pago:* ${formatFechaLegible(datos.fechaPago)}
${datos.diasAtraso > 0 ? `⚠️ *Atraso:* ${datos.diasAtraso} días` : "✓ *Pago puntual*"}
💰 *Saldo Restante:* ${Number(datos.saldoRestante) <= 0 ? "TOTALMENTE SALDADO ✓" : fnFormatMoney(datos.saldoRestante)}

_Gracias por su pago puntual._`;

    const canvas = generarCanvasComprobante(datos);

    // Intentar Web Share API con archivo si el navegador lo soporta (móviles)
    if (navigator.share && navigator.canShare) {
        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], `Comprobante_${datos.nombreDeudor}.png`, { type: "image/png" });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `Comprobante de Pago - ${datos.nombreDeudor}`,
                        text: textoMensaje,
                        files: [file],
                    });
                    return;
                }
                // Fallback a texto
                await navigator.share({
                    title: `Comprobante de Pago - ${datos.nombreDeudor}`,
                    text: textoMensaje,
                });
            }, "image/png");
            return;
        } catch (e) {
            console.log("Fallback a WhatsApp Web:", e);
        }
    }

    // Fallback estándar a WhatsApp URL
    const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoMensaje)}`;
    window.open(urlWhatsApp, "_blank");
};
