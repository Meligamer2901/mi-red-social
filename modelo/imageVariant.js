const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../database/conexion");

// Tabla relacional que registra DONDE vive cada variante de una imagen
// (original, miniatura, blanco y negro, sepia, filtros manuales, etc.).
// IMPORTANTE: aqui solo se guarda la referencia/clave de almacenamiento
// (storageKey), nunca el binario de la imagen -> eso vive en disco o en S3.
class ImageVariant extends Model {}

ImageVariant.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // 'post' o 'user' (el avatar tambien pasa por el mismo pipeline)
        ownerType: {
            type: DataTypes.STRING(10),
            allowNull: false,
            field: "owner_type"
        },
        // id del post o del usuario dueño de la imagen (referencia logica,
        // no FK de BD porque apunta a dos tablas distintas segun ownerType)
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "owner_id"
        },
        // 'original' | 'thumbnail' | 'grayscale' | 'sepia' | 'custom_<filtro>'
        variantType: {
            type: DataTypes.STRING(40),
            allowNull: false,
            field: "variant_type"
        },
        // 'local' o 's3'
        storageProvider: {
            type: DataTypes.STRING(10),
            allowNull: false,
            field: "storage_provider"
        },
        // Ruta relativa (modo local) o Key de S3 (modo s3)
        storageKey: {
            type: DataTypes.STRING(500),
            allowNull: false,
            field: "storage_key"
        }
    },
    {
        sequelize,
        modelName: "ImageVariant",
        tableName: "image_variants",
        timestamps: true,
        updatedAt: false,
        createdAt: "created_at",
        indexes: [
            { fields: ["owner_type", "owner_id"] }
        ]
    }
);

module.exports = ImageVariant;
