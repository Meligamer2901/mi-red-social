// Utilidad de linea de comandos: crea/actualiza las tablas en PostgreSQL
// segun los modelos de Sequelize, sin levantar el servidor Express.
// Uso: npm run db:init

require("dotenv").config();
const conexion = require("./conexion");

(async () => {
    try {
        await conexion();
        console.log("Esquema de base de datos listo.");
        process.exit(0);
    } catch (error) {
        console.error("No se pudo inicializar el esquema:", error);
        process.exit(1);
    }
})();
