/* ============================================================
   CLIENTE.JS — Vista del cliente: ver viajes y reservar
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const profile = await requireRole('cliente');
    if (!profile) return;

    renderNavbar(profile, [
        { href: 'cliente.html', label: '🚌 Viajes' },
        { href: 'mis-reservas.html', label: '🎫 Mis reservas' }
    ]);

    await cargarViajesCliente();

    document.getElementById('btn-buscar').addEventListener('click', () => cargarViajesCliente());
});

async function cargarViajesCliente() {
    const origen = document.getElementById('filtro-origen').value.trim();
    const destino = document.getElementById('filtro-destino').value.trim();
    const fecha = document.getElementById('filtro-fecha').value;

    let query = db
        .from('viajes')
        .select(`
            *,
            conductores:conductor_id (
                id,
                nombre,
                telefono
            )
        `)
        .eq('estado', 'Disponible')
        .gte('disponibles', 1)
        .order('fecha', { ascending: true });

    if (origen) query = query.ilike('origen', `%${origen}%`);
    if (destino) query = query.ilike('destino', `%${destino}%`);
    if (fecha) query = query.eq('fecha', fecha);

    const { data, error } = await query;
    
    console.log('🔍 Viajes obtenidos:', data);
    console.log('❌ Error si existe:', error);
    
    const grid = document.getElementById('viajes-grid');

    if (error) {
        grid.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        return;
    }
    if (!data.length) {
        grid.innerHTML = `<div class="alert alert-info" style="grid-column:1/-1;">No se encontraron viajes con esos criterios.</div>`;
        return;
    }

    grid.innerHTML = data.map(v => {
        console.log(`🚌 Viaje ${v.id}:`, {
            conductor_id: v.conductor_id,
            conductores: v.conductores
        });
        
        return `
            <div class="viaje-card">
                <div class="ruta">
                    <span>${v.origen}</span>
                    <span class="arrow">→</span>
                    <span>${v.destino}</span>
                </div>
                <div class="info">
                    <div>📅 ${formatDate(v.fecha)} · 🕐 ${formatTime(v.hora)}</div>
                    <div>🚗 Conductor: ${v.conductores?.nombre || 'Por asignar'}</div>
                    <div>💺 Disponibles: ${v.disponibles} de ${v.cupos}</div>
                </div>
                <div class="precio">${formatMoney(v.precio)}</div>
                <div class="disponibles">
                    <span class="status status-disponible">Disponible</span>
                    <button class="btn btn-success btn-sm" onclick="handleReservar(${v.id})">Reservar</button>
                </div>
            </div>
        `;
    }).join('');
}