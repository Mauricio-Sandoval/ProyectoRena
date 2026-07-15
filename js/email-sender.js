async function enviarCorreoConfirmacion(reserva, viaje, perfil, pdfBase64, nombrePDF) {
    if (typeof emailjs === 'undefined') {
        console.error('❌ EmailJS no está cargado');
        return false;
    }

    // 🔍 DIAGNÓSTICO DETALLADO
    console.log('=== DIAGNÓSTICO DE ENVÍO DE CORREO ===');
    console.log('👤 Perfil completo:', perfil);
    console.log('📧 Correo a enviar:', perfil.correo);
    console.log('📝 Tipo de dato:', typeof perfil.correo);
    console.log('🔍 ¿Está vacío?', !perfil.correo);
    console.log('🔍 ¿Es undefined?', perfil.correo === undefined);
    console.log('🔍 ¿Es null?', perfil.correo === null);
    console.log('========================================');

    // Validar que el correo exista
    if (!perfil.correo || typeof perfil.correo !== 'string' || !perfil.correo.includes('@')) {
        console.error('❌ El perfil NO tiene un correo válido');
        console.error('📋 Datos del perfil:', perfil);
        showToast('⚠️ No se pudo enviar el correo: el perfil no tiene correo válido', 'warning');
        return false;
    }

    const templateParams = {
        to_email: perfil.correo,
        to_name: perfil.nombre || 'Cliente',
        origen: viaje.origen,
        destino: viaje.destino,
        fecha: formatDate(viaje.fecha),
        hora: formatTime(viaje.hora),
        cantidad: reserva.cantidad,
        total: formatMoney(reserva.total),
        reserva_id: reserva.id,
        attachment: pdfBase64,
        filename: nombrePDF
    };

    console.log('📨 Parámetros que se enviarán a EmailJS:', templateParams);
    console.log('🔑 Service ID:', EMAILJS_SERVICE_ID);
    console.log('🔑 Template ID:', EMAILJS_TEMPLATE_ID);

    try {
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
        );
        
        console.log('✅ Correo enviado exitosamente');
        console.log('📨 Respuesta completa:', response);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        console.error('📋 Parámetros enviados:', templateParams);
        return false;
    }
}