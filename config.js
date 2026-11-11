// Configuracion publica del frontend (no son secretos: el Client ID de
// Google y el "site key" de reCAPTCHA estan disenados para ser publicos).
// Centralizarlos aqui evita tener que tocar app.js al cambiar de entorno
// (desarrollo local -> instancia EC2 con dominio propio).
//
// Al desplegar en AWS, edita unicamente API_URL/BASE_URL para que apunten
// al dominio real (ver docs/DESPLIEGUE.md).
window.APP_CONFIG = {
    API_URL: "http://localhost:4000/api",
    BASE_URL: "http://localhost:4000",
    GOOGLE_CLIENT_ID: "374304061961-3upl3n1luh3go74efggfiqqqn8ohfch7.apps.googleusercontent.com",
    RECAPTCHA_SITE_KEY: "6Le8oxouAAAAAIx2rc1GnK7qJZAjNf0HIldbwVUi"
};
