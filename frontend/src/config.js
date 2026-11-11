// Configuracion publica del frontend. Los valores salen de variables de
// entorno de Vite (.env) y, si no existen, usan los de desarrollo local.
// El Client ID de Google y la "site key" de reCAPTCHA estan disenados para ser publicos.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "140926779046-su24vd9cvvdcjic6iikb31h0cfjh9pv0.apps.googleusercontent.com";
export const RECAPTCHA_SITE_KEY =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Le8oxouAAAAAIx2rc1GnK7qJZAjNf0HIldbwVUi";
