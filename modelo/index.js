// Punto central de registro de modelos y asociaciones Sequelize.
// database/conexion.js lo requiere justo antes de sincronizar (sync()).

const User = require("./user");
const Publicacion = require("./publicacion");
const Follower = require("./follower");
const ImageVariant = require("./imageVariant");
const FaceDetection = require("./faceDetection");

// --- Usuario <-> Publicaciones (1:N) ---
User.hasMany(Publicacion, { foreignKey: "usuario", as: "publicaciones" });
Publicacion.belongsTo(User, { foreignKey: "usuario", as: "autor" });

// --- Seguidores (N:M a traves de la tabla followers) ---
User.belongsToMany(User, {
    through: Follower,
    as: "seguidores", // quienes me siguen a mi
    foreignKey: "followedId",
    otherKey: "followerId"
});
User.belongsToMany(User, {
    through: Follower,
    as: "siguiendo", // a quienes sigo yo
    foreignKey: "followerId",
    otherKey: "followedId"
});

module.exports = {
    User,
    Publicacion,
    Follower,
    ImageVariant,
    FaceDetection
};
