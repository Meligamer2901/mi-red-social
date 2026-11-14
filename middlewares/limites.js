// Limite de intentos (rate limiting) contra fuerza bruta en login y registro.
// El reCAPTCHA ayuda, pero no sustituye a un limite por IP.
//
// Detras de nginx hay que activar app.set("trust proxy", 1) en index.js para
// que req.ip sea la IP real del visitante y no 127.0.0.1.

const rateLimit = require("express-rate-limit");

const mensaje = {
    status: "error",
    message: "Demasiados intentos. Espera unos minutos e intentalo de nuevo."
};

// 10 intentos de inicio de sesion cada 15 minutos por IP.
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: mensaje
});

// 10 registros por hora por IP.
const limiteRegistro = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: mensaje
});

module.exports = { limiteLogin, limiteRegistro };
