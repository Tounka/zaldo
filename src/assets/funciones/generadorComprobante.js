/**
 * Generador de Comprobantes de Pago Estéticos y Formales usando HTML5 Canvas.
 * Genera imágenes PNG en alta definición (2x Retina) para descarga o compartir por WhatsApp.
 */

import { fnFormatMoney, formatFechaLegible, formatFechaHora } from "./prestamosCalculos";

/**
 * Dibuja un comprobante estético y formal en un HTML5 Canvas.
 */
export const generarCanvasComprobanteLegacy = (datos) => {
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
 * Comprobante horizontal para compartir y descargar como imagen.
 * El archivo final siempre mide exactamente 1000 x 800 px.
 */
export const generarCanvasComprobante = (datos = {}) => {
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

    const width = 1000;
    const height = 800;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const truncar = (texto, maximo) => String(texto ?? "").length > maximo ? `${String(texto).slice(0, maximo - 1)}…` : String(texto ?? "");
    const monto = fnFormatMoney(montoPagado);
    const saldo = Number(saldoRestante || 0);
    const liquidado = saldo <= 0;
    const textoCuota = totalPagos ? `Pago ${numeroPago} de ${totalPagos}` : `Pago #${numeroPago}`;

    ctx.fillStyle = "#f4f1f8";
    ctx.fillRect(0, 0, width, height);

    const cardX = 28;
    const cardY = 26;
    const cardW = width - 56;
    const cardH = height - 52;
    const radius = 22;

    ctx.save();
    ctx.shadowColor = "rgba(83, 59, 143, .16)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(83, 59, 143, .13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.stroke();

    const headerH = 142;
    const gradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
    gradient.addColorStop(0, "#533b8f");
    gradient.addColorStop(1, "#30244a");
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, headerH, [radius, radius, 0, 0]);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "800 25px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("ZALDO", cardX + 30, cardY + 43);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("GESTIÓN Y COBRANZA PERSONAL", cardX + 30, cardY + 64);
    ctx.fillStyle = "#fff";
    ctx.font = "800 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("COMPROBANTE DE ABONO", cardX + 30, cardY + 108);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("Constancia de pago recibida y aplicada a la cuenta", cardX + 30, cardY + 126);

    ctx.textAlign = "right";
    ctx.fillStyle = "#f6d879";
    ctx.font = "800 12px monospace";
    ctx.fillText(`FOLIO #${truncar(folio, 22)}`, cardX + cardW - 30, cardY + 43);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(formatFechaLegible(fechaPago), cardX + cardW - 30, cardY + 64);
    ctx.textAlign = "left";

    const montoX = cardX + 30;
    const montoY = cardY + headerH + 24;
    const montoW = 430;
    const montoH = 128;
    ctx.fillStyle = "#f7f3fc";
    ctx.beginPath();
    ctx.roundRect(montoX, montoY, montoW, montoH, 15);
    ctx.fill();
    ctx.strokeStyle = "#e3d9f0";
    ctx.stroke();
    ctx.fillStyle = "#75668d";
    ctx.font = "800 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("MONTO ABONADO", montoX + 20, montoY + 30);
    ctx.fillStyle = "#30244a";
    ctx.font = "900 37px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(monto, montoX + 20, montoY + 78);
    ctx.fillStyle = "#8d8298";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(textoCuota, montoX + 20, montoY + 103);

    const clientX = montoX + montoW + 28;
    ctx.fillStyle = "#8a8091";
    ctx.font = "800 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("DEUDOR / CLIENTE", clientX, montoY + 25);
    ctx.fillStyle = "#292331";
    ctx.font = "900 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(truncar(nombreDeudor, 28), clientX, montoY + 57);
    ctx.fillStyle = "#72687b";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(prestamoNombre && prestamoNombre !== nombreDeudor ? `Referencia: ${truncar(prestamoNombre, 31)}` : "Pago registrado en Zaldo", clientX, montoY + 81);
    ctx.fillStyle = liquidado ? "#eaf8f1" : "#f4effa";
    ctx.beginPath();
    ctx.roundRect(clientX, montoY + 95, cardW - montoW - 88, 32, 9);
    ctx.fill();
    ctx.fillStyle = liquidado ? "#237a5b" : "#654999";
    ctx.font = "800 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(liquidado ? "CUENTA LIQUIDADA" : `SALDO: ${fnFormatMoney(saldo)}`, clientX + 12, montoY + 116);

    const detailY = 385;
    ctx.strokeStyle = "#e9e3ee";
    ctx.beginPath();
    ctx.moveTo(cardX + 30, detailY - 22);
    ctx.lineTo(cardX + cardW - 30, detailY - 22);
    ctx.stroke();
    ctx.fillStyle = "#5e4a7e";
    ctx.font = "900 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("DETALLE DE LA OPERACIÓN", cardX + 30, detailY);

    const fila = (etiqueta, valor, x, y, color = "#292331") => {
        ctx.fillStyle = "#8a8091";
        ctx.font = "600 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText(etiqueta, x, y);
        ctx.fillStyle = color;
        ctx.font = "800 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.fillText(truncar(valor, 42), x, y + 19);
    };
    const col2 = cardX + cardW / 2 + 5;
    fila("Fecha del abono", formatFechaHora(fechaPago), cardX + 30, detailY + 28);
    fila("Fecha pactada", fechaPactada ? formatFechaLegible(fechaPactada) : "No especificada", col2, detailY + 28);
    fila("Deuda antes del abono", fnFormatMoney(saldoAnterior || 0), cardX + 30, detailY + 72);
    fila("Puntualidad", diasAtraso > 0 ? `Atraso de ${diasAtraso} día(s)` : "Pago puntual", col2, detailY + 72, diasAtraso > 0 ? "#b4671d" : "#27835d");

    const statusY = 500;
    ctx.fillStyle = liquidado ? "#edf9f3" : "#f7f3fc";
    ctx.beginPath();
    ctx.roundRect(cardX + 30, statusY, cardW - 60, 58, 11);
    ctx.fill();
    ctx.fillStyle = liquidado ? "#27835d" : "#654999";
    ctx.font = "800 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(liquidado ? "ESTADO DE LA CUENTA" : "SALDO PENDIENTE", cardX + 48, statusY + 23);
    ctx.font = "900 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(liquidado ? "Pago aplicado · cuenta totalmente liquidada" : fnFormatMoney(saldo), cardX + 48, statusY + 43);

    ctx.strokeStyle = "#e9e3ee";
    ctx.beginPath();
    ctx.moveTo(cardX + 30, 590);
    ctx.lineTo(cardX + cardW - 30, 590);
    ctx.stroke();
    ctx.fillStyle = "#27835d";
    ctx.font = "800 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("✓ PAGO ACREDITADO Y REGISTRADO", cardX + 30, 618);
    ctx.textAlign = "right";
    ctx.fillStyle = "#8a8091";
    ctx.font = "500 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(`Registrado por: ${truncar(cobradoPor, 42)}`, cardX + cardW - 30, 618);
    ctx.textAlign = "left";
    ctx.fillStyle = "#9a919f";
    ctx.font = "500 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("Este comprobante avala el pago recibido. Consérvelo para cualquier aclaración.", cardX + 30, 642);
    ctx.fillStyle = "#b1a9b4";
    ctx.font = "500 8px monospace";
    ctx.fillText(`VERIF-HASH: ${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`, cardX + 30, 662);

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
            @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap");
            :root { color-scheme: light; font-family: "Roboto", sans-serif; color: #1a1a2e; }
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
    ventana.setTimeout(() => {
        const imprimir = () => ventana.print();
        const fuentes = ventana.document.fonts?.ready;
        if (fuentes) fuentes.then(imprimir).catch(imprimir);
        else imprimir();
    }, 350);
};

/**
 * Abre un comprobante editorial listo para imprimir o guardar como PDF.
 */
const _abrirComprobantePdfAnterior = (datos = {}) => {
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
            @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap");
            :root { color-scheme: light; font-family: "Roboto", sans-serif; color: #292331; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #e9e5ee; padding: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sheet { width: 100%; max-width: 780px; margin: 0 auto; background: #fbfaf7; border: 1px solid #d9d0df; border-radius: 28px; overflow: hidden; box-shadow: 0 26px 70px rgba(47, 33, 67, .2); }
            .masthead { color: #fff; padding: 38px 44px 64px; background: #292234; position: relative; overflow: hidden; }
            .masthead:before { content: ""; position: absolute; width: 360px; height: 360px; right: -145px; top: -210px; border: 1px solid rgba(231, 213, 165, .34); border-radius: 50%; box-shadow: 0 0 0 24px rgba(231, 213, 165, .08), 0 0 0 49px rgba(231, 213, 165, .05); }
            .masthead:after { content: ""; position: absolute; width: 180px; height: 180px; left: -125px; bottom: -130px; border: 1px solid rgba(159, 130, 205, .45); border-radius: 50%; }
            .top-line { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; position: relative; z-index: 1; }
            .brand-lockup { display: flex; align-items: center; gap: 12px; }
            .logo-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; background: #d9c8ff; color: #292234; font-family: "Roboto", sans-serif; font-weight: 900; font-size: 23px; box-shadow: 7px 7px 0 rgba(231, 213, 165, .22); }
            .brand { font-weight: 900; letter-spacing: .2em; font-size: 21px; }
            .eyebrow { color: #d9c8ff; font-size: 9px; letter-spacing: .16em; font-weight: 800; margin-top: 6px; }
            .folio { text-align: right; font-size: 9px; color: #bdb5c9; line-height: 1.7; letter-spacing: .13em; }
            .folio strong { display: inline-block; color: #e7d5a5; font-size: 13px; letter-spacing: .08em; margin-top: 3px; }
            .title { position: relative; z-index: 1; max-width: 520px; margin: 46px 0 0; font-family: "Roboto", sans-serif; font-size: 33px; line-height: 1.05; letter-spacing: -.035em; font-weight: 700; }
            .subtitle { position: relative; z-index: 1; max-width: 430px; color: #bdb5c9; font-size: 12px; line-height: 1.5; margin-top: 12px; }
            .amount-panel { position: relative; z-index: 2; margin: -34px 40px 0; padding: 25px 28px; border: 1px solid #e0d6e5; border-radius: 20px; background: #fffefa; display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; box-shadow: 0 14px 30px rgba(47, 33, 67, .12); }
            .label { color: #827489; text-transform: uppercase; letter-spacing: .14em; font-size: 9px; font-weight: 900; }
            .amount-value { color: #292234; font-family: "Roboto", sans-serif; font-size: 38px; line-height: 1.08; font-weight: 900; margin-top: 8px; letter-spacing: -.035em; }
            .amount-note { color: #827489; font-size: 11px; margin-top: 8px; }
            .badge { background: #2b8b76; color: #fff; border-radius: 99px; padding: 9px 13px; font-size: 10px; font-weight: 900; letter-spacing: .08em; white-space: nowrap; }
            .content { padding: 30px 40px 40px; }
            .client { display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 14px; padding: 2px 0 26px; border-bottom: 1px dashed #d7ccdb; }
            .avatar { width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid #d9c8ff; border-radius: 16px; background: #f0ebfa; color: #5e458c; font-family: "Roboto", sans-serif; font-size: 20px; font-weight: 700; }
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
            .status strong { font-family: "Roboto", sans-serif; font-size: 17px; text-align: right; }
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
    ventana.setTimeout(() => {
        const imprimir = () => ventana.print();
        const fuentes = ventana.document.fonts?.ready;
        if (fuentes) fuentes.then(imprimir).catch(imprimir);
        else imprimir();
    }, 350);
};

/**
 * Comparte el comprobante por WhatsApp o Web Share API
 */
/**
 * Abre una constancia formal, breve y lista para imprimir o guardar como PDF.
 */
export const abrirComprobantePdfA4 = (datos = {}) => {
    const ventana = window.open("", "_blank", "width=820,height=1050");
    if (!ventana) {
        window.alert("Permite las ventanas emergentes para imprimir el comprobante.");
        return;
    }

    const nombre = escaparHtml(datos.nombreDeudor || "Cliente");
    const folio = escaparHtml(datos.folio || "REC-" + Date.now().toString().slice(-6));
    const fechaPago = escaparHtml(formatFechaHora(datos.fechaPago));
    const fechaPactada = datos.fechaPactada ? escaparHtml(formatFechaLegible(datos.fechaPactada)) : "No especificada";
    const numeroPago = escaparHtml(datos.numeroPago || 1);
    const totalPagos = datos.totalPagos ? ` de ${escaparHtml(datos.totalPagos)}` : "";
    const monto = escaparHtml(fnFormatMoney(datos.montoPagado || 0));
    const saldo = Number(datos.saldoRestante || 0);
    const liquidado = saldo <= 0;
    const saldoTexto = liquidado ? "Cuenta liquidada" : escaparHtml(fnFormatMoney(saldo));
    const cobradoPor = escaparHtml(datos.cobradoPor || "Administración Zaldo");
    const nota = datos.notas ? `<div class="note"><span>Observación</span><p>${escaparHtml(datos.notas)}</p></div>` : "";

    ventana.document.open();
    ventana.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Constancia de abono · Zaldo</title>
          <style>
            @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap");
            @page { size: A4; margin: 16mm; }
            :root { color-scheme: light; font-family: "Roboto", Arial, sans-serif; color: #24212a; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #eceaf0; padding: 30px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sheet { width: 100%; max-width: 760px; min-height: 920px; margin: 0 auto; padding: 44px 48px 38px; background: #fff; border: 1px solid #d9d5de; box-shadow: 0 18px 45px rgba(38, 30, 52, .13); }
            .masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #30244a; }
            .brand { color: #30244a; font-size: 22px; font-weight: 900; letter-spacing: .18em; }
            .brand-sub { margin-top: 5px; color: #7a7482; font-size: 9px; font-weight: 700; letter-spacing: .1em; }
            .document { text-align: right; }
            .document h1 { margin: 0; color: #30244a; font-size: 16px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
            .document p { margin: 7px 0 0; color: #7a7482; font-size: 10px; }
            .folio { margin-top: 4px; color: #30244a; font-size: 11px; font-weight: 700; }
            .intro { margin-top: 34px; }
            .eyebrow { color: #7a7482; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
            .client-name { margin-top: 7px; color: #24212a; font-size: 24px; font-weight: 700; }
            .amount-line { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-top: 30px; padding: 22px 0 20px; border-top: 1px solid #e5e1e8; border-bottom: 1px solid #e5e1e8; }
            .amount-label { color: #7a7482; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
            .amount { margin-top: 6px; color: #30244a; font-size: 38px; font-weight: 900; letter-spacing: -.04em; line-height: 1; }
            .payment-ref { color: #4f485a; font-size: 12px; font-weight: 700; text-align: right; }
            .payment-ref span { display: block; margin-bottom: 5px; color: #7a7482; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
            .details-heading { margin: 28px 0 8px; color: #30244a; font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
            .details-table { width: 100%; border-collapse: collapse; }
            .details-table td { padding: 11px 0; border-bottom: 1px solid #eeeaf1; font-size: 12px; }
            .details-table td:first-child { width: 52%; color: #7a7482; }
            .details-table td:last-child { color: #24212a; font-weight: 700; text-align: right; }
            .status { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-top: 26px; padding: 15px 16px; border: 1px solid ${liquidado ? "#b9dccd" : "#d9d0e7"}; background: ${liquidado ? "#f1faf6" : "#f8f5fb"}; }
            .status span { color: #7a7482; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
            .status strong { color: ${liquidado ? "#21785f" : "#30244a"}; font-size: 15px; }
            .note { margin-top: 22px; padding: 12px 14px; border-left: 3px solid #c7b36d; background: #fffdf5; }
            .note span { color: #8b7130; font-size: 9px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
            .note p { margin: 5px 0 0; color: #504957; font-size: 11px; line-height: 1.45; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; margin-top: 72px; }
            .signature { padding-top: 9px; border-top: 1px solid #aaa4af; color: #7a7482; font-size: 10px; text-align: center; }
            .footer { margin-top: 34px; padding-top: 16px; border-top: 1px solid #e5e1e8; color: #918b96; font-size: 9px; line-height: 1.5; }
            .footer strong { color: #30244a; }
            @media (max-width: 620px) { body { padding: 12px; } .sheet { padding: 30px 24px; } .masthead, .amount-line { flex-direction: column; align-items: flex-start; } .document, .payment-ref { text-align: left; } .amount { font-size: 32px; } .signatures { gap: 20px; margin-top: 48px; } }
            @media print { body { padding: 0; background: #fff; } .sheet { max-width: none; min-height: auto; border: 0; box-shadow: none; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="masthead">
              <div><div class="brand">ZALDO</div><div class="brand-sub">GESTIÓN Y COBRANZA</div></div>
              <div class="document"><h1>Constancia de abono</h1><p>Documento de recepción de pago</p><div class="folio">Folio ${folio}</div></div>
            </header>
            <section class="intro">
              <div class="eyebrow">Recibimos de</div>
              <div class="client-name">${nombre}</div>
              <div class="amount-line">
                <div><div class="amount-label">Monto recibido</div><div class="amount">${monto}</div></div>
                <div class="payment-ref"><span>Referencia</span>Abono ${numeroPago}${totalPagos}</div>
              </div>
            </section>
            <section>
              <div class="details-heading">Detalle de la operación</div>
              <table class="details-table">
                <tbody>
                  <tr><td>Fecha del abono</td><td>${fechaPago}</td></tr>
                  <tr><td>Fecha pactada</td><td>${fechaPactada}</td></tr>
                  <tr><td>Saldo posterior</td><td>${saldoTexto}</td></tr>
                  <tr><td>Registrado por</td><td>${cobradoPor}</td></tr>
                </tbody>
              </table>
              <div class="status"><span>Estado de la cuenta</span><strong>${liquidado ? "LIQUIDADA" : `Saldo pendiente: ${saldoTexto}`}</strong></div>
              ${nota}
            </section>
            <section class="signatures"><div class="signature">Firma de quien recibe</div><div class="signature">Firma del cliente</div></section>
            <footer class="footer"><strong>ZALDO</strong> · Constancia emitida para fines de control y seguimiento de pagos.<br />Conserve este documento para cualquier aclaración.</footer>
          </main>
        </body>
      </html>`);
    ventana.document.close();
    ventana.focus();
    ventana.setTimeout(() => {
        const imprimir = () => ventana.print();
        const fuentes = ventana.document.fonts?.ready;
        if (fuentes) fuentes.then(imprimir).catch(imprimir);
        else imprimir();
    }, 350);
    ventana.onafterprint = () => ventana.close();
};

/**
 * Abre la constancia como imagen horizontal de 1000 x 800 px.
 * Conserva el nombre exportado para no romper los consumidores existentes.
 */
export const abrirComprobantePdf = (datos = {}) => {
    const ventana = window.open("", "_blank", "width=1040,height=860");
    if (!ventana) {
        window.alert("Permite las ventanas emergentes para abrir el comprobante.");
        return;
    }

    const dataUrl = generarCanvasComprobante(datos).toDataURL("image/png");
    const nombre = escaparHtml(datos.nombreDeudor || "Cliente");
    ventana.document.open();
    ventana.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Comprobante ${nombre} · Zaldo</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #ede9f1; font-family: sans-serif; }
            main { width: min(1000px, calc(100vw - 32px)); }
            img { display: block; width: 100%; height: auto; box-shadow: 0 20px 50px rgba(48,36,74,.18); }
            p { margin: 10px 0 0; color: #756d80; font-size: 12px; text-align: center; }
            @media print { body { background: #fff; } main { width: 1000px; } p { display: none; } img { box-shadow: none; } }
          </style>
        </head>
        <body><main><img src="${dataUrl}" alt="Comprobante de pago de ${nombre}" /><p>Imagen PNG · 1000 × 800 px</p></main></body>
      </html>`);
    ventana.document.close();
    ventana.focus();
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
