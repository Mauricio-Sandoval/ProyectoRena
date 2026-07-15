/* ============================================================
   RESERVAS.JS — Gestión completa de reservas (Admin y Cliente)
   ============================================================ */

// ============================================================
// FUNCIONES PARA EL CLIENTE
// ============================================================

async function reservarViaje(viajeId, cantidad = 1) {
    const user = await getCurrentUser();
    if (!user) { showToast('Debes iniciar sesión para reservar', 'error'); return false; }

    const perfil = await getCurrentProfile();
    if (!perfil) { showToast('Error al obtener tu perfil', 'error'); return false; }

    const { data: viaje, error: vErr } = await db
        .from('viajes')
        .select(`id, origen, destino, fecha, hora, precio, conductor_id, conductores(nombre)`)
        .eq('id', viajeId)
        .single();
    
    if (vErr || !viaje) { showToast('Viaje no encontrado', 'error'); return false; }

    const { data, error } = await db.rpc('reservar_viaje', {
        p_viaje_id: viajeId,
        p_usuario: user.id,
        p_cantidad: cantidad
    });

    if (error) {
        console.error('Error en RPC:', error);
        showToast('Error al reservar: ' + error.message, 'error');
        return false;
    }

    if (data.error) {
        showToast(data.error, 'error');
        return false;
    }

    const { data: reserva } = await db.from('reservas').select('*').eq('id', data.reserva_id).single();

    try {
        const pdfData = await generarBoletoPDF(reserva, viaje, perfil);
        descargarPDF(pdfData);
        showToast('📄 Boleto descargado', 'success');

        const pdfBase64 = pdfToBase64(pdfData.pdf);
        const emailEnviado = await enviarCorreoConfirmacion(reserva, viaje, perfil, pdfBase64, pdfData.nombre);
        
        if (emailEnviado) {
            showToast('📧 Correo de confirmación enviado', 'success');
        } else {
            showToast('⚠️ Reserva confirmada, pero no se pudo enviar el correo', 'warning');
        }
    } catch (error) {
        console.error('Error generando/enviando PDF:', error);
        showToast('⚠️ Reserva confirmada, pero hubo un error con el PDF', 'warning');
    }

    showToast('✅ ¡Reserva confirmada exitosamente!', 'success');
    return true;
}

async function cargarMisReservas() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data: reservas, error } = await db
        .from('reservas')
        .select('*, viajes(id, origen, destino, fecha, hora, precio, conductor_id)')
        .eq('usuario', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error cargando reservas:', error);
        showToast('Error al cargar tus reservas', 'error');
        return [];
    }

    if (!reservas || !reservas.length) return [];

    const conductorIds = [...new Set(reservas.map(r => r.viajes?.conductor_id).filter(id => id))];
    let conductoresMap = {};
    
    if (conductorIds.length > 0) {
        const { data: conductores } = await db.from('conductores').select('id, nombre').in('id', conductorIds);
        (conductores || []).forEach(c => { conductoresMap[c.id] = c.nombre; });
    }

    return reservas.map(r => ({
        ...r,
        conductor_nombre: conductoresMap[r.viajes?.conductor_id] || 'Sin asignar'
    }));
}

async function cancelarReserva(reservaId) {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva? Los lugares serán liberados.')) {
        return false;
    }

    try {
        const { data: reserva, error: rErr } = await db
            .from('reservas')
            .select('*, viajes(id, disponibles)')
            .eq('id', reservaId)
            .single();

        if (rErr || !reserva) {
            showToast('Error al obtener los datos de la reserva', 'error');
            return false;
        }

        if (reserva.estado === 'Cancelado') {
            showToast('Esta reserva ya está cancelada', 'warning');
            return false;
        }

        await db.from('reservas').update({ estado: 'Cancelado' }).eq('id', reservaId);

        const nuevosDisponibles = (reserva.viajes?.disponibles || 0) + reserva.cantidad;
        const nuevoEstadoViaje = nuevosDisponibles > 0 ? 'Disponible' : 'Agotado';

        await db.from('viajes').update({ disponibles: nuevosDisponibles, estado: nuevoEstadoViaje }).eq('id', reserva.viajes.id);

        showToast('✅ Reserva cancelada y lugares liberados', 'success');
        return true;
    } catch (err) {
        console.error('Error inesperado cancelando reserva:', err);
        showToast('Error inesperado al cancelar', 'error');
        return false;
    }
}

// ============================================================
// FUNCIONES PARA EL ADMINISTRADOR
// ============================================================

async function cargarReservasAdmin() {
    console.log('⚙️ Ejecutando cargarReservasAdmin...');
    const cont = document.getElementById('reservas-list');
    if (!cont) {
        console.error('No se encontró el elemento reservas-list');
        return;
    }
    
    try {
        const { data: reservas, error: rErr } = await db
            .from('reservas')
            .select('*, viajes(id, origen, destino, fecha, hora, conductor_id)')
            .order('created_at', { ascending: false });
        
        if (rErr) {
            console.error('Error de Supabase en reservas:', rErr);
            cont.innerHTML = `<div class="alert alert-danger">Error: ${rErr.message}</div>`;
            return;
        }
        
        if (!reservas || !reservas.length) {
            cont.innerHTML = '<p style="color:var(--gray); padding: 1rem;">No hay reservas registradas en el sistema.</p>';
            return;
        }

        const userIds = [...new Set(reservas.map(r => r.usuario))];
        const { data: perfiles } = await db.from('profiles').select('id, nombre, correo').in('id', userIds);
        
        const perfilesMap = {};
        (perfiles || []).forEach(p => { perfilesMap[p.id] = p; });

        const conductorIds = [...new Set(reservas.map(r => r.viajes?.conductor_id).filter(id => id))];
        let conductoresMap = {};
        
        if (conductorIds.length > 0) {
            const { data: conductores } = await db.from('conductores').select('id, nombre').in('id', conductorIds);
            (conductores || []).forEach(c => { conductoresMap[c.id] = c.nombre; });
        }

        cont.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th><th>Cliente</th><th>Viaje</th><th>Conductor</th>
                            <th>Cantidad</th><th>Total</th><th>Estado</th><th>Fecha reserva</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reservas.map(r => {
                            const perfil = perfilesMap[r.usuario] || { nombre: 'N/A', correo: 'Sin correo' };
                            const conductor = conductoresMap[r.viajes?.conductor_id] || 'Sin asignar';
                            return `
                                <tr>
                                    <td><strong>#${r.id}</strong></td>
                                    <td>${perfil.nombre}<br><small style="color:var(--gray)">${perfil.correo}</small></td>
                                    <td>${r.viajes?.origen} → ${r.viajes?.destino}<br><small>${formatDate(r.viajes?.fecha)} ${formatTime(r.viajes?.hora)}</small></td>
                                    <td>${conductor}</td>
                                    <td>${r.cantidad}</td>
                                    <td><strong>${formatMoney(r.total)}</strong></td>
                                    <td><span class="status status-${r.estado.toLowerCase()}">${r.estado}</span></td>
                                    <td><small>${new Date(r.created_at).toLocaleString('es-MX')}</small></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        console.log('✅ Reservas cargadas exitosamente:', reservas.length);
    } catch (err) {
        console.error('Error inesperado en cargarReservasAdmin:', err);
        cont.innerHTML = `<div class="alert alert-danger">Error inesperado: ${err.message}</div>`;
    }
}