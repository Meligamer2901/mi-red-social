const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../database/conexion");

class User extends Model {}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        surname: {
            type: DataTypes.STRING,
            defaultValue: "null"
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        nick: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        // Hash bcrypt de la contrasena. bcrypt genera y embebe una sal (salt)
        // unica por usuario en cada hash (bcrypt.hash(pwd, 10)), cumpliendo el
        // requisito de "contrasenas guardadas como hash con sal unica por usuario".
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: "role_user"
        },
        // Nombre/clave del archivo del avatar (imagen ORIGINAL). Las miniaturas y
        // transformaciones automaticas viven en la tabla image_variants.
        image: {
            type: DataTypes.STRING,
            defaultValue: "default.png"
        }
    },
    {
        sequelize,
        modelName: "User",
        tableName: "users"
    }
);

module.exports = User;
