const SUPABASE_URL = "https://hrmaecemtyyuromyrvxk.supabase.co";

const SUPABASE_KEY = "sb_publishable_7Mkta5qA1itYdyZEKMMvnQ_t5F5hsRw";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Configuración de EmailJS
const EMAILJS_PUBLIC_KEY = "D_al685gak5f3JPGY";
const EMAILJS_SERVICE_ID = "service_8ibj8c4";
const EMAILJS_TEMPLATE_ID = "template_sdyuqx6";

// Inicializar EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}