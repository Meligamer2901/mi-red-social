const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../database/conexion");

// Resultado del analisis automatico de rostros (face-api.js) ejecutado al
// subir una fotografia. Solo se guardan metadatos (conteos, edad, genero);
// la imagen anotada se genera al vuelo y nunca se persiste en la BD.
class FaceDetection extends Model {}

FaceDetection.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ownerType: {
            type: DataTypes.STRING(10),
            allowNull: false,
            field: "owner_type"
        },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "owner_id"
        },
        facesCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: "faces_count"
        },
        // Detalle por rostro: edad estimada, genero, probabilidad (JSON)
        details: {
            type: DataTypes.JSONB,
            defaultValue: []
        }
    },
    {
        sequelize,
        modelName: "FaceDetection",
        tableName: "face_detections",
        timestamps: true,
        updatedAt: false,
        createdAt: "created_at"
    }
);

module.exports = FaceDetection;
