/* ============================================================
   VIAJES.JS — Gestión de viajes
   ============================================================ */

// Cargar lista de viajes (usada en admin.html y viajes.html)
async function cargarViajesAdmin() {
    const cont = document.getElementById('viajes-list');
    if (!cont) return;
    
    try {
        const { data, error } = await db
            .from('viajes')
            .select('*, conductores(nombre)')
            .order('fecha', { ascending: false });
        
        if (error) {
            cont.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            return;
        }
        
        if (!data || !data.length) {
            cont.innerHTML = '<p style="color:var(--gray); padding: 1rem;">No hay viajes registrados.</p>';
            return;
        }

        cont.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th><th>Ruta</th><th>Conductor</th>
                            <th>Precio</th><th>Disponibles</th><th>Estado</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(v => `
                            <tr>
                                <td>${formatDate(v.fecha)} ${formatTime(v.hora)}</td>
                                <td>${v.origen} → ${v.destino}</td>
                                <td>${v.conductores?.nombre || '-'}</td>
                                <td>${formatMoney(v.precio)}</td>
                                <td>${v.disponibles}/${v.cupos}</td>
                                <td><span class="status status-${v.estado.toLowerCase()}">${v.estado}</span></td>
                                <td>
                                    <button class="btn btn-warning btn-sm" onclick="editarViaje(${v.id})">Editar</button>
                                    <button class="btn btn-danger btn-sm" onclick="eliminarViaje(${v.id})">Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        cont.innerHTML = `<div class="alert alert-danger">Error inesperado: ${err.message}</div>`;
    }
}

// Abrir modal para crear/editar viaje
async function abrirModalViaje(viaje = null) {
    // Cargar conductores en el select
    const { data: conductores } = await db.from('conductores').select('id, nombre').eq('activo', true).order('nombre');
    const selectConductor = document.getElementById('viaje-conductor');
    selectConductor.innerHTML = '<option value="">-- Selecciona conductor --</option>' +
        (conductores || []).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

    // Generar opciones de hora (6:00 a 23:00, cada 30 min)
    const selectHora = document.getElementById('viaje-hora');
    if (selectHora.tagName === 'INPUT') {
        // Reemplazar input por select
        const nuevoSelect = document.createElement('select');
        nuevoSelect.id = 'viaje-hora';
        nuevoSelect.className = 'form-control';
        nuevoSelect.required = true;
        selectHora.replaceWith(nuevoSelect);
    }
    
    const selectHoraFinal = document.getElementById('viaje-hora');
    selectHoraFinal.innerHTML = '<option value="">-- Selecciona hora --</option>';
    
    for (let h = 6; h <= 22; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hora = String(h).padStart(2, '0');
            const min = String(m).padStart(2, '0');
            const valor = `${hora}:${min}`;
            const etiqueta = `${hora}:${min} ${h < 12 ? 'am' : 'pm'}`;
            selectHoraFinal.innerHTML += `<option value="${valor}">${etiqueta}</option>`;
        }
    }
    // Agregar 23:00 (11:00 pm)
    selectHoraFinal.innerHTML += `<option value="23:00">23:00 pm</option>`;

    // Configurar fecha mínima (hoy + 7 días)
    const inputFecha = document.getElementById('viaje-fecha');
    const fechaMinima = new Date();
    fechaMinima.setDate(fechaMinima.getDate() + 7);
    const fechaMinimaStr = fechaMinima.toISOString().split('T')[0];
    inputFecha.min = fechaMinimaStr;
    
    // Configurar fecha máxima (3 meses adelante, opcional)
    const fechaMaxima = new Date();
    fechaMaxima.setMonth(fechaMaxima.getMonth() + 3);
    inputFecha.max = fechaMaxima.toISOString().split('T')[0];

    document.getElementById('modal-viaje').classList.add('active');
    document.getElementById('form-viaje').reset();
    document.getElementById('viaje-id').value = '';
    document.getElementById('modal-viaje-title').textContent = viaje ? 'Editar viaje' : 'Nuevo viaje';

    // Mostrar mensaje informativo
    let infoBox = document.getElementById('viaje-info');
    if (!infoBox) {
        infoBox = document.createElement('div');
        infoBox.id = 'viaje-info';
        infoBox.className = 'alert alert-info';
        infoBox.style.marginBottom = '1rem';
        infoBox.style.fontSize = '0.85rem';
        const form = document.getElementById('form-viaje');
        form.insertBefore(infoBox, form.firstChild);
    }
    infoBox.innerHTML = '📅 Los viajes solo pueden programarse con mínimo <strong>7 días de anticipación</strong>.<br>🕐 Horarios disponibles: <strong>6:00 am a 11:00 pm</strong>, intervalos de 30 minutos.';

    if (viaje) {
        document.getElementById('viaje-id').value = viaje.id;
        document.getElementById('viaje-origen').value = viaje.origen;
        document.getElementById('viaje-destino').value = viaje.destino;
        document.getElementById('viaje-fecha').value = viaje.fecha;
        document.getElementById('viaje-hora').value = viaje.hora.substring(0,5);
        document.getElementById('viaje-conductor').value = viaje.conductor_id;
        document.getElementById('viaje-precio').value = viaje.precio;
        document.getElementById('viaje-cupos').value = viaje.cupos;
    }
}

// Editar viaje
async function editarViaje(id) {
    const { data, error } = await db.from('viajes').select('*').eq('id', id).single();
    if (error) { showToast('Error al cargar viaje', 'error'); return; }
    abrirModalViaje(data);
}

// Eliminar viaje
async function eliminarViaje(id) {
    if (!confirm('¿Eliminar este viaje?')) return;
    const { error } = await db.from('viajes').delete().eq('id', id);
    if (error) { showToast('Error al eliminar: ' + error.message, 'error'); return; }
    showToast('Viaje eliminado', 'success');
    cargarViajesAdmin();
    if (typeof cargarEstadisticas === 'function') cargarEstadisticas();
}

// Listener del formulario
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-viaje');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('viaje-id').value;
        const cupos = parseInt(document.getElementById('viaje-cupos').value);

        const payload = {
            origen: document.getElementById('viaje-origen').value.trim(),
            destino: document.getElementById('viaje-destino').value.trim(),
            fecha: document.getElementById('viaje-fecha').value,
            hora: document.getElementById('viaje-hora').value,
            conductor_id: parseInt(document.getElementById('viaje-conductor').value) || null,
            precio: parseFloat(document.getElementById('viaje-precio').value),
            cupos: cupos,
            disponibles: cupos,
            estado: 'Disponible'
        };

        let error;
        if (id) {
            const { data: actual } = await db.from('viajes').select('cupos, disponibles').eq('id', id).single();
            const reservados = actual.cupos - actual.disponibles;
            payload.disponibles = Math.max(0, cupos - reservados);
            ({ error } = await db.from('viajes').update(payload).eq('id', id));
        } else {
            ({ error } = await db.from('viajes').insert(payload));
        }

        if (error) { showToast('Error: ' + error.message, 'error'); return; }

        showToast(id ? 'Viaje actualizado' : 'Viaje creado', 'success');
        document.getElementById('modal-viaje').classList.remove('active');
        cargarViajesAdmin();
        if (typeof cargarEstadisticas === 'function') cargarEstadisticas();
    });
});