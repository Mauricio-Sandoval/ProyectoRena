/* ============================================================
   CONDUCTORES.JS — Gestión de conductores
   ============================================================ */

// Cargar lista de conductores (usada en admin.html y conductores.html)
async function cargarConductoresAdmin() {
    const cont = document.getElementById('conductores-list');
    if (!cont) return;
    
    try {
        const { data, error } = await db.from('conductores').select('*').order('nombre');
        
        if (error) {
            cont.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            return;
        }
        
        if (!data || !data.length) {
            cont.innerHTML = '<p style="color:var(--gray); padding: 1rem;">No hay conductores registrados.</p>';
            return;
        }

        cont.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th><th>Nombre</th><th>Teléfono</th>
                            <th>Licencia</th><th>Estado</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(c => `
                            <tr>
                                <td>${c.id}</td>
                                <td>${c.nombre}</td>
                                <td>${c.telefono || '-'}</td>
                                <td>${c.licencia || '-'}</td>
                                <td><span class="status ${c.activo ? 'status-disponible' : 'status-cancelado'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
                                <td>
                                    <button class="btn btn-warning btn-sm" onclick="editarConductor(${c.id})">Editar</button>
                                    <button class="btn btn-danger btn-sm" onclick="eliminarConductor(${c.id})">Eliminar</button>
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

// Abrir modal para crear/editar conductor
async function abrirModalConductor(conductor = null) {
    document.getElementById('modal-conductor').classList.add('active');
    document.getElementById('form-conductor').reset();
    document.getElementById('conductor-id').value = '';
    document.getElementById('modal-conductor-title').textContent = conductor ? 'Editar conductor' : 'Nuevo conductor';

    if (conductor) {
        document.getElementById('conductor-id').value = conductor.id;
        document.getElementById('conductor-nombre').value = conductor.nombre;
        document.getElementById('conductor-telefono').value = conductor.telefono || '';
        document.getElementById('conductor-licencia').value = conductor.licencia || '';
        document.getElementById('conductor-activo').checked = conductor.activo;
    }
}

// Editar conductor
async function editarConductor(id) {
    const { data, error } = await db.from('conductores').select('*').eq('id', id).single();
    if (error) { showToast('Error al cargar conductor', 'error'); return; }
    abrirModalConductor(data);
}

// Eliminar conductor
async function eliminarConductor(id) {
    if (!confirm('¿Eliminar este conductor?')) return;
    const { error } = await db.from('conductores').delete().eq('id', id);
    if (error) { showToast('Error al eliminar: ' + error.message, 'error'); return; }
    showToast('Conductor eliminado', 'success');
    cargarConductoresAdmin();
    if (typeof cargarEstadisticas === 'function') cargarEstadisticas();
}

// Listener del formulario
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-conductor');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('conductor-id').value;
        const payload = {
            nombre: document.getElementById('conductor-nombre').value.trim(),
            telefono: document.getElementById('conductor-telefono').value.trim() || null,
            licencia: document.getElementById('conductor-licencia').value.trim() || null,
            activo: document.getElementById('conductor-activo').checked
        };

        let error;
        if (id) {
            ({ error } = await db.from('conductores').update(payload).eq('id', id));
        } else {
            ({ error } = await db.from('conductores').insert(payload));
        }

        if (error) { showToast('Error: ' + error.message, 'error'); return; }

        showToast(id ? 'Conductor actualizado' : 'Conductor creado', 'success');
        document.getElementById('modal-conductor').classList.remove('active');
        cargarConductoresAdmin();
        if (typeof cargarEstadisticas === 'function') cargarEstadisticas();
    });
});