// Importar dependencias
const jwt = require("jwt-simple");
const moment = require("moment");

// Clave secreta para firmar los tokens. Se toma de la variable de entorno
// JWT_SECRET (ver .env.example); si no esta definida se usa un valor de
// desarrollo, pero en produccion SIEMPRE debe configurarse por entorno.
const claveSecreta = process.env.JWT_SECRET || "clave_secreta_de_desarrollo_cambiame";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    console.warn("ADVERTENCIA: JWT_SECRET no esta definido en produccion. Configuralo en el archivo .env");
}

// Crear una funcion para generar token
const createToken = (user) => {
    const payload = {
        id: user.id,
        name: user.name,
        surname: user.surname,
        nick: user.nick,
        email: user.email,
        role: user.role,
        image: user.image,
        iat: moment().unix(),
        exp: moment().add(30, "days").unix()
    };
    // Devolver un JWT token codificado
    return jwt.encode(payload, claveSecreta);
};

module.exports = {
    claveSecreta,
    createToken
};
