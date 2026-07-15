/* ============================================================
   AUTH.JS — Funciones compartidas de autenticación y roles
   ============================================================ */

// Obtener el usuario actual
async function getCurrentUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
}

// Obtener el perfil del usuario actual
async function getCurrentProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error obteniendo perfil:', error);
        return null;
    }
    return data;
}

// Verificar sesión; si no hay, redirige al login
async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// Verificar rol; si no coincide, redirige
async function requireRole(rolPermitido) {
    const profile = await getCurrentProfile();
    if (!profile) {
        window.location.href = 'login.html';
        return null;
    }
    if (profile.rol !== rolPermitido) {
        alert('No tienes permiso para acceder a esta sección.');
        window.location.href = profile.rol === 'admin' ? 'admin.html' : 'cliente.html';
        return null;
    }
    return profile;
}

// Renderizar navbar con info del usuario
function renderNavbar(profile, links) {
    const navLinks = links.map(l => `<a href="${l.href}">${l.label}</a>`).join('');
    const navbarHTML = `
        <header class="navbar">
            <div class="logo">🚐 Viajes <span>CDMX</span></div>
            <nav>${navLinks}</nav>
            <div class="user-info">
                <span class="badge">${profile.rol.toUpperCase()}</span>
                <span>Hola, ${profile.nombre.split(' ')[0]}</span>
                <button id="btn-logout" class="btn btn-secondary btn-sm">Salir</button>
            </div>
        </header>
    `;
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await db.auth.signOut();
        window.location.href = '../index.html';
    });
}

// Mostrar mensaje/toast
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// Formatear fecha
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
}

// Formatear hora
function formatTime(timeStr) {
    return timeStr.substring(0, 5);
}

// Formatear moneda
function formatMoney(n) {
    return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });
}