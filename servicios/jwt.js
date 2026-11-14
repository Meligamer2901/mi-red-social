// Importar dependencias
const jwt = require("jwt-simple");
const moment = require("moment");

// Clave secreta para firmar los tokens. Se toma de la variable de entorno
// JWT_SECRET (ver .env.example). En desarrollo, si no esta definida, se usa un
// valor de prueba; en PRODUCCION la app se niega a arrancar sin JWT_SECRET para
// que nunca se firmen sesiones con una clave conocida.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET no esta definido en produccion. Configuralo en el archivo .env");
}
const claveSecreta = process.env.JWT_SECRET || "clave_secreta_de_desarrollo_cambiame";

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
