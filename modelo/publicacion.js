const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../database/conexion");

class Publicacion extends Model {}

Publicacion.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // FK hacia users.id. Se mantiene el nombre "usuario" para no romper
        // el contrato del frontend existente (app.js lee post.usuario).
        usuario: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" }
        },
        usuarioNick: {
            type: DataTypes.STRING,
            allowNull: false
        },
        contenido: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        fecha: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        // Nombre/clave del archivo ORIGINAL subido. Nunca el binario.
        imgUrl: {
            type: DataTypes.STRING,
            defaultValue: "Sin imagen"
        },
        likes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    },
    {
        sequelize,
        modelName: "Publicacion",
        tableName: "posts",
        timestamps: false // se usa el campo "fecha" explicito en vez de createdAt/updatedAt
    }
);

module.exports = Publicacion;
