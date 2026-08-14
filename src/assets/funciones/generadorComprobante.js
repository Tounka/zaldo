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
