const { Op } = require("sequelize");
const { Follower, User, Publicacion } = require("../modelo");
const { serializarUsuario } = require("./user");
const { adjuntarVariantes } = require("./publicacion");

const pruebaFollows = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde controllers/follow.js"
    });
}

// Seguir a un usuario
const seguir = async (req, res) => {
    try {
        const followedId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        if (userId === followedId) {
            return res.status(400).json({
                status: "error",
                mensaje: "Un usuario no se puede seguir a si mismo."
            });
        }

        const existente = await Follower.findOne({ where: { followerId: userId, followedId } });
        if (existente) {
            return res.status(200).json({
                status: "success",
                mensaje: "Ya sigues a este usuario"
            });
        }

        await Follower.create({ followerId: userId, followedId });

        return res.status(200).json({
            status: "success",
            mensaje: "Ahora sigues a este usuario"
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al seguir al usuario",
            error: error.message
        });
    }
};

// Dejar de seguir a un usuario
const dejarDeSeguir = async (req, res) => {
    try {
        const followedId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const filasBorradas = await Follower.destroy({ where: { followerId: userId, followedId } });

        if (!filasBorradas) {
            return res.status(404).json({
                status: "error",
                mensaje: "No seguias a este usuario"
            });
        }

        return res.status(200).json({
            status: "success",
            mensaje: "Has dejado de seguir a este usuario"
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al dejar de seguir"
        });
    }
};

// Comprobar si sigo a un usuario
const comprobar = async (req, res) => {
    try {
        const followedId = parseInt(req.params.id, 10);
        const userId = req.user.id;

        const existe = await Follower.findOne({ where: { followerId: userId, followedId } });

        return res.status(200).json({
            status: "success",
            siguiendo: !!existe
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al comprobar seguimiento"
        });
    }
};

// Obtener publicaciones de las personas que el usuario sigue
const publicacionesSeguidos = async (req, res) => {
    try {
        const userId = req.user.id;

        const seguidos = await Follower.findAll({ where: { followerId: userId } });
        const idsSeguidos = seguidos.map((f) => f.followedId);

        if (idsSeguidos.length === 0) {
            return res.status(200).json({
                status: "success",
                contador: 0,
                consulta: []
            });
        }

        const publicaciones = await Publicacion.findAll({
            where: { usuario: idsSeguidos },
            order: [["fecha", "DESC"]]
        });

        return res.status(200).json({
            status: "success",
            contador: publicaciones.length,
            consulta: await adjuntarVariantes(publicaciones)
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al obtener publicaciones de seguidos"
        });
    }
};

// Obtener informacion del usuario por Nick (para el modal de seguimiento)
const obtenerUsuarioPorNick = async (req, res) => {
    try {
        const nickParam = req.params.nick;

        const usuario = await User.findOne({
            where: {
                [Op.or]: [
                    { nick: nickParam },
                    { name: nickParam }
                ]
            }
        });

        if (!usuario) {
            return res.status(404).json({
                status: "error",
                mensaje: "Usuario no encontrado"
            });
        }

        return res.status(200).json({
            status: "success",
            user: serializarUsuario(usuario)
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al obtener el usuario"
        });
    }
};

module.exports = {
    pruebaFollows,
    seguir,
    dejarDeSeguir,
    comprobar,
    publicacionesSeguidos,
    obtenerUsuarioPorNick
};
