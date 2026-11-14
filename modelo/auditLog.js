// Modelo de auditoria: registra QUIEN hizo QUE, CUANDO y DESDE DONDE.
// Ver docs/AUDITORIA_TRANSACCIONES.md.
//
// user_id NO es una clave foranea a proposito: el registro de auditoria debe
// sobrevivir aunque el usuario se borre.
// Nunca se guardan contrasenas, tokens ni el contenido de archivos.

const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/conexion");

const AuditLog = sequelize.define(
    "AuditLog",
    {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        ocurrioEn: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        userId: { type: DataTypes.INTEGER, allowNull: true }, // NULL si no hay sesion (login fallido)
        accion: { type: DataTypes.STRING(60), allowNull: false }, // p. ej. LOGIN_OK, POST_BORRADO
        metodo: { type: DataTypes.STRING(10), allowNull: false },
        ruta: { type: DataTypes.STRING(255), allowNull: false },
        statusCode: { type: DataTypes.INTEGER, allowNull: false },
        ip: { type: DataTypes.STRING(45) },
        detalle: { type: DataTypes.JSONB, defaultValue: {} }
    },
    {
        tableName: "audit_log",
        timestamps: false,
        indexes: [
            { fields: ["user_id", { name: "ocurrio_en", order: "DESC" }] },
            { fields: ["accion", { name: "ocurrio_en", order: "DESC" }] }
        ]
    }
);

module.exports = AuditLog;
