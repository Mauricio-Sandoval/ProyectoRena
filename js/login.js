/* ============================================================
   LOGIN.JS — Manejo del formulario de login y registro
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const messageBox = document.getElementById('login-message');

    // Función para mostrar pestaña de login
    function mostrarLogin() {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
        messageBox.textContent = '';
        window.location.hash = '';
    }

    // Función para mostrar pestaña de registro
    function mostrarRegistro() {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
        messageBox.textContent = '';
        window.location.hash = 'registro';
    }

    // Event listeners de las pestañas
    tabLogin.addEventListener('click', mostrarLogin);
    tabRegister.addEventListener('click', mostrarRegistro);

    // Verificar hash al cargar la página
    function verificarHash() {
        if (window.location.hash === '#registro') {
            mostrarRegistro();
        } else {
            mostrarLogin();
        }
    }

    // Verificar al cargar
    verificarHash();

    // Escuchar cambios en el hash (por si el usuario usa los botones atrás/adelante)
    window.addEventListener('hashchange', verificarHash);

    // ============================================================
    // LOGIN
    // ============================================================
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageBox.innerHTML = '<div class="alert alert-info">Iniciando sesión...</div>';

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        console.log('🔐 Intentando login con:', email);

        const { data, error } = await db.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('❌ Error login:', error);
            messageBox.innerHTML = `<div class="alert alert-danger">❌ ${error.message}</div>`;
            return;
        }

        console.log('✅ Login exitoso:', data.user.id);

        const { data: profile, error: pErr } = await db
            .from('profiles')
            .select('rol')
            .eq('id', data.user.id)
            .single();

        if (pErr) {
            console.error('❌ Error obteniendo perfil:', pErr);
            messageBox.innerHTML = `<div class="alert alert-danger">❌ Error al obtener perfil: ${pErr.message}</div>`;
            return;
        }

        console.log('👤 Rol:', profile?.rol);

        if (profile?.rol === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'cliente.html';
        }
    });

    // ============================================================
    // REGISTRO (con trigger automático)
    // ============================================================
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageBox.innerHTML = '<div class="alert alert-info">Creando cuenta...</div>';

        const nombre = document.getElementById('reg-nombre').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        console.log('📝 Registrando:', { nombre, email });

        // 1. Crear usuario en auth (el trigger crea el perfil automáticamente)
        const { data: authData, error: authError } = await db.auth.signUp({
            email,
            password,
            options: {
                data: { nombre: nombre }
            }
        });

        if (authError) {
            console.error('❌ Error auth:', authError);
            messageBox.innerHTML = `<div class="alert alert-danger">❌ ${authError.message}</div>`;
            return;
        }

        console.log('✅ Usuario creado en auth:', authData.user?.id);

        // Verificar si el usuario necesita confirmar email
        if (authData.user && authData.user.identities?.length === 0) {
            messageBox.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ Revisa tu correo <strong>${email}</strong> para confirmar tu cuenta.
                    <br><small>(Si no llega, contacta al administrador)</small>
                </div>
            `;
            return;
        }

        // El trigger crea el perfil automáticamente, no necesitamos insertarlo manualmente

        messageBox.innerHTML = `<div class="alert alert-success">✅ ¡Cuenta creada! Redirigiendo...</div>`;
        setTimeout(() => {
            window.location.href = 'cliente.html';
        }, 1200);
    });
});