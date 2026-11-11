// Conexion a la base de datos relacional (PostgreSQL) usando Sequelize como ORM.
//
// Requisito del proyecto: "Cuentas de usuario y ubicacion de las imagenes de cada
// usuario en una base de datos relacional. Las imagenes NO van en la BD."
// Por eso aqui solo se guardan filas (usuarios, publicaciones, rutas/keys de
// imagenes) nunca el binario de las fotos.

const { Sequelize } = require("sequelize");

const {
    DB_HOST = "localhost",
    DB_PORT = "5432",
    DB_NAME = "mi_red_social",
    DB_USER = "postgres",
    DB_PASSWORD = "",
    DB_SSL = "false",
    NODE_ENV = "development"
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    dialect: "postgres",
    logging: NODE_ENV === "development" ? false : false,
    dialectOptions: DB_SSL === "true"
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    define: {
        underscored: true, // columnas snake_case en la BD (created_at, user_id, etc.)
        timestamps: true
    }
});

// Conecta y sincroniza los modelos. En produccion se recomienda usar migraciones
// (ver database/schema.sql) en vez de sync({alter:true}); para un proyecto
// academico, sync() simplifica el despliegue inicial.
const conexion = async () => {
    try {
        await sequelize.authenticate();
        console.log("PostgreSQL conectado correctamente");

        // Cargar modelos y asociaciones antes de sincronizar
        require("../modelo");

        await sequelize.sync({ alter: NODE_ENV !== "production" });
        console.log("Modelos sincronizados con la base de datos");
    } catch (error) {
        console.error("Error de conexion a PostgreSQL:", error.message);
        throw error;
    }
};

module.exports = conexion;
module.exports.sequelize = sequelize;
