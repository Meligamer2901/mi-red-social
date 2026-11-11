const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../database/conexion");

class Follower extends Model {}

Follower.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Usuario que realiza la accion de seguir (FK -> users.id)
        followerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "follower_id",
            references: { model: "users", key: "id" }
        },
        // Usuario que es seguido (FK -> users.id)
        followedId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "followed_id",
            references: { model: "users", key: "id" }
        }
    },
    {
        sequelize,
        modelName: "Follower",
        tableName: "followers",
        timestamps: true,
        createdAt: "fecha_follow",
        updatedAt: false,
        indexes: [
            { unique: true, fields: ["follower_id", "followed_id"] }
        ],
        validate: {
            noAutoSeguimiento() {
                if (this.followerId != null && this.followedId != null && this.followerId === this.followedId) {
                    throw new Error("Un usuario no se puede seguir a si mismo.");
                }
            }
        }
    }
);

module.exports = Follower;
