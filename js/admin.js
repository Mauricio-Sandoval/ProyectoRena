/* ============================================================
   ADMIN.JS — Controlador principal del panel de admin
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que sea admin
    const profile = await requireRole('admin');
    if (!profile) return;

    renderNavbar(profile, [
        { href: 'admin.html', label: '🏠 Panel' },
        { href: 'conductores.html', label: '🚗 Conductores' },
        { href: 'viajes.html', label: '🚌 Viajes' },
        { href: 'reservas.html', label: '🎫 Reservas' }
    ]);

    await cargarEstadisticas();
    await cargarConductoresAdmin();
    await cargarViajesAdmin();
    await cargarReservasAdmin();

    // Abrir modales
    document.getElementById('btn-nuevo-conductor').addEventListener('click', () => {
        abrirModalConductor();
    });
    document.getElementById('btn-nuevo-viaje').addEventListener('click', () => {
        abrirModalViaje();
    });

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.close).classList.remove('active');
        });
    });
});

async function cargarEstadisticas() {
    try {
        const [cond, viajes, reservas] = await Promise.all([
            db.from('conductores').select('id', { count: 'exact', head: true }),
            db.from('viajes').select('id', { count: 'exact', head: true }),
            db.from('reservas').select('id, total', { count: 'exact' })
        ]);

        const totalIngresos = (reservas.data || []).reduce((acc, r) => acc + Number(r.total || 0), 0);

        document.getElementById('stats-container').innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Conductores</div>
                <div class="stat-value">${cond.count || 0}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">Viajes</div>
                <div class="stat-value">${viajes.count || 0}</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">Reservas</div>
                <div class="stat-value">${reservas.count || 0}</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-label">Ingresos</div>
                <div class="stat-value">${formatMoney(totalIngresos)}</div>
            </div>
        `;
    } catch (err) {
        console.error('Error cargando estadísticas:', err);
    }
}

// ---------- CONDUCTORES (admin) ----------
async function cargarConductoresAdmin() {
    const cont = document.getElementById('conductores-list');
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

// ---------- VIAJES (admin) ----------
async function cargarViajesAdmin() {
    const cont = document.getElementById('viajes-list');
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

// ---------- RESERVAS (admin) ----------
async function cargarReservasAdmin() {
    const cont = document.getElementById('reservas-list');
    try {
        // Obtener reservas con datos del viaje
        const { data: reservas, error: rErr } = await db
            .from('reservas')
            .select('*, viajes(origen, destino, fecha, hora)')
            .order('created_at', { ascending: false });
        
        if (rErr) {
            cont.innerHTML = `<div class="alert alert-danger">Error: ${rErr.message}</div>`;
            return;
        }
        
        if (!reservas || !reservas.length) {
            cont.innerHTML = '<p style="color:var(--gray); padding: 1rem;">No hay reservas registradas.</p>';
            return;
        }

        // Obtener todos los perfiles de usuarios que tienen reservas
        const userIds = [...new Set(reservas.map(r => r.usuario))];
        const { data: perfiles } = await db
            .from('profiles')
            .select('id, nombre, correo')
            .in('id', userIds);
        
        const perfilesMap = {};
        (perfiles || []).forEach(p => {
            perfilesMap[p.id] = p;
        });

        cont.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th><th>Cliente</th><th>Viaje</th>
                            <th>Cantidad</th><th>Total</th><th>Estado</th><th>Fecha reserva</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reservas.map(r => {
                            const perfil = perfilesMap[r.usuario] || { nombre: 'N/A', correo: '' };
                            return `
                                <tr>
                                    <td>${r.id}</td>
                                    <td>${perfil.nombre}<br><small style="color:var(--gray)">${perfil.correo}</small></td>
                                    <td>${r.viajes?.origen} → ${r.viajes?.destino}<br><small>${formatDate(r.viajes?.fecha)} ${formatTime(r.viajes?.hora)}</small></td>
                                    <td>${r.cantidad}</td>
                                    <td>${formatMoney(r.total)}</td>
                                    <td><span class="status status-${r.estado.toLowerCase()}">${r.estado}</span></td>
                                    <td>${new Date(r.created_at).toLocaleString('es-MX')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        cont.innerHTML = `<div class="alert alert-danger">Error inesperado: ${err.message}</div>`;
    }
}