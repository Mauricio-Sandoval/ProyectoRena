/* ============================================================
   PDF-GENERATOR.JS — Generación de boletos en PDF
   ============================================================ */

async function generarBoletoPDF(reserva, viaje, perfil) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Colores corporativos
    const primaryColor = [0, 102, 204]; // Azul
    const darkColor = [44, 62, 80]; // Gris oscuro
    const lightColor = [248, 249, 250]; // Gris claro

    // Encabezado
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('VIAJES CDMX', 20, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Boleto de Reservación', 20, 33);

    // Información del cliente
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Cliente', 20, 55);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${perfil.nombre}`, 20, 65);
    doc.text(`Correo: ${perfil.correo}`, 20, 72);
    doc.text(`ID de Reserva: #${reserva.id}`, 20, 79);

    // Línea divisoria
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 85, 190, 85);

    // Detalles del viaje
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalles del Viaje', 20, 95);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Ruta
    doc.setFillColor(...lightColor);
    doc.rect(20, 100, 170, 35, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RUTA', 25, 108);
    
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text(viaje.origen, 25, 118);
    doc.text('→', 90, 118);
    doc.text(viaje.destino, 100, 118);
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Conductor: ${viaje.conductores?.nombre || 'Por asignar'}`, 25, 128);

    // Fecha y hora
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA Y HORA', 20, 145);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const fechaFormateada = formatDate(viaje.fecha);
    const horaFormateada = formatTime(viaje.hora);
    doc.text(`Fecha: ${fechaFormateada}`, 20, 153);
    doc.text(`Hora: ${horaFormateada}`, 20, 160);

    // Cantidad y total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CANTIDAD Y TOTAL', 110, 145);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Lugares: ${reserva.cantidad}`, 110, 153);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`Total: ${formatMoney(reserva.total)}`, 110, 163);

    // Línea divisoria
    doc.setDrawColor(...primaryColor);
    doc.line(20, 175, 190, 175);

    // Estado de la reserva
    doc.setTextColor(...darkColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE LA RESERVA', 20, 185);
    
    doc.setFontSize(14);
    doc.setTextColor(46, 204, 113); // Verde
    doc.text(reserva.estado.toUpperCase(), 20, 193);

    // Código QR (simulado con texto)
    doc.setFillColor(...lightColor);
    doc.rect(140, 200, 50, 50, 'F');
    doc.setTextColor(...darkColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Código de verificación:', 145, 210);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`RES-${reserva.id}`, 145, 220);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Presenta este código', 145, 230);
    doc.text('al abordar', 145, 235);

    // Footer
    doc.setFillColor(...primaryColor);
    doc.rect(0, 270, 210, 27, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gracias por elegir Viajes CDMX', 20, 280);
    doc.text('Este boleto es tu comprobante de reserva', 20, 286);
    doc.text('www.viajescdmx.com', 150, 283);

    // Generar nombre del archivo
    const nombreArchivo = `boleto-reserva-${reserva.id}-${viaje.origen}-${viaje.destino}.pdf`;
    
    return {
        pdf: doc,
        nombre: nombreArchivo
    };
}

// Descargar el PDF
function descargarPDF(pdfData) {
    pdfData.pdf.save(pdfData.nombre);
}

// Convertir PDF a base64 para enviar por email
function pdfToBase64(pdf) {
    return pdf.output('datauristring').split(',')[1];
}