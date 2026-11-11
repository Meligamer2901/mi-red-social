// Importar dependencias
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

// Importar modelos (Sequelize / PostgreSQL)
const { User, Publicacion } = require("../modelo");

// Importar servicios
const jwt = require("../servicios/jwt");
const storage = require("../servicios/storage");

const { OAuth2Client } = require("google-auth-library");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Convierte una instancia de Sequelize en el objeto que espera el frontend:
// nunca expone el hash de la contrasena y agrega "_id"/"imageUrl" (URL lista
// para usar en un <img src>, ya sea local o de S3) para no obligar al
// frontend a reconstruir rutas manualmente.
function serializarUsuario(usuario) {
    const data = typeof usuario.toJSON === "function" ? usuario.toJSON() : { ...usuario };
    delete data.password;
    return {
        ...data,
        _id: data.id,
        imageUrl: data.image ? storage.urlPublica(`usuarios/${data.image}`) : null
    };
}

// Acciones de prueba
const pruebaUser = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde controller/user.js",
        usuario: req.user
    });
};

// Registro de usuarios
const register = async (req, res) => {
    try {
        let params = req.body;

        if (!params.name || !params.email || !params.password || !params.nick) {
            return res.status(400).json({
                status: "error",
                message: "Faltan datos por enviar"
            });
        }

        // reCAPTCHA tambien en el registro (ademas del login)
        if (!params.captchaToken) {
            return res.status(400).json({
                status: "error",
                message: "Debes completar la verificacion 'No soy un robot'."
            });
        }
        const captchaValido = await verificarCaptcha(params.captchaToken);
        if (!captchaValido) {
            return res.status(400).json({
                status: "error",
                message: "Verificacion de reCAPTCHA fallida o expirada. Intentalo de nuevo."
            });
        }

        // Control usuarios duplicados
        const existente = await User.findOne({
            where: {
                [Op.or]: [
                    { email: params.email.toLowerCase() },
                    { nick: params.nick.toLowerCase() }
                ]
            }
        });

        if (existente) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
        }

        // Cifrar la contrasena. bcrypt genera una sal (salt) unica en cada
        // llamada a hash(), incorporada dentro del propio hash resultante.
        const pwd = await bcrypt.hash(params.password, 10);

        const usuarioGuardado = await User.create({
            name: params.name,
            surname: params.surname,
            bio: params.bio,
            nick: params.nick,
            email: params.email.toLowerCase(),
            password: pwd
        });

        return res.status(200).json({
            status: "success",
            message: "Usuario registrado correctamente",
            user: serializarUsuario(usuarioGuardado)
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Error en la consulta de usuarios",
            error: error.message
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password, captchaToken } = req.body;

        // Validar presencia del token de captcha
        if (!captchaToken) {
            return res.status(400).json({
                status: "error",
                mensaje: "Debes completar la verificacion 'No soy un robot'."
            });
        }

        // Comprobar autenticidad del captcha con Google
        const esValido = await verificarCaptcha(captchaToken);
        if (!esValido) {
            return res.status(400).json({
                status: "error",
                mensaje: "Verificacion de reCAPTCHA fallida o expirada. Intentalo de nuevo."
            });
        }

        if (!email || !password) {
            return res.status(400).send({
                status: "error",
                message: "Faltan datos por enviar"
            });
        }

        // Buscar en la BD si existe el email
        const usuario = await User.findOne({ where: { email: email.toLowerCase() } });

        if (!usuario) {
            return res.status(404).send({
                status: "error",
                message: "No existe el usuario"
            });
        }

        // Comprobar la contrasena
        const coincide = await bcrypt.compare(password, usuario.password);
        if (!coincide) {
            return res.status(400).send({
                status: "error",
                message: "Contrasena incorrecta"
            });
        }

        const token = jwt.createToken(usuario);

        return res.status(200).send({
            status: "success",
            message: "Login exitoso",
            user: serializarUsuario(usuario),
            token
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Error en el proceso de login",
            error: error.message
        });
    }
};

const list = async (req, res) => {
    try {
        const page = req.params.page ? parseInt(req.params.page, 10) : 1;
        const itemsPerPage = 5;
        const offset = (page - 1) * itemsPerPage;

        const { rows, count } = await User.findAndCountAll({
            limit: itemsPerPage,
            offset,
            order: [["id", "ASC"]]
        });

        if (!rows || rows.length === 0) {
            return res.status(404).send({
                status: "error",
                message: "No hay usuarios disponibles"
            });
        }

        const totalPages = Math.ceil(count / itemsPerPage);

        return res.status(200).send({
            status: "success",
            users: rows.map(serializarUsuario),
            totalDocs: count,
            totalPages,
            currentPage: page,
            itemsPerPage,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error en la consulta de usuarios",
            error: error.message
        });
    }
};


const update = async (req, res) => {
    try {
        const userIdentity = req.user;
        const userToUpdate = { ...req.body };

        // Eliminar campos que no deben actualizarse por esta via
        delete userToUpdate.iat;
        delete userToUpdate.exp;
        delete userToUpdate.role;
        delete userToUpdate.image;
        delete userToUpdate.id;
        delete userToUpdate._id;

        const emailToCheck = userToUpdate.email ? userToUpdate.email.toLowerCase() : null;
        const nickToCheck = userToUpdate.nick ? userToUpdate.nick.toLowerCase() : null;

        if (emailToCheck || nickToCheck) {
            const condicionesOr = [];
            if (emailToCheck) condicionesOr.push({ email: emailToCheck });
            if (nickToCheck) condicionesOr.push({ nick: nickToCheck });

            const conflictos = await User.findAll({
                where: {
                    [Op.and]: [
                        { id: { [Op.ne]: userIdentity.id } },
                        { [Op.or]: condicionesOr }
                    ]
                }
            });

            if (conflictos.length > 0) {
                return res.status(200).send({
                    status: "success",
                    message: "El usuario ya existe"
                });
            }
        }

        if (userToUpdate.password) {
            userToUpdate.password = await bcrypt.hash(userToUpdate.password, 10);
        }
        if (emailToCheck) userToUpdate.email = emailToCheck;

        const usuario = await User.findByPk(userIdentity.id);
        if (!usuario) {
            return res.status(404).send({
                status: "error",
                message: "Usuario no encontrado"
            });
        }

        await usuario.update(userToUpdate);

        if (userToUpdate.nick) {
            await Publicacion.update(
                { usuarioNick: userToUpdate.nick },
                { where: { usuario: userIdentity.id } }
            );
        }

        return res.status(200).send({
            status: "success",
            message: "Usuario actualizado correctamente",
            user: serializarUsuario(usuario)
        });

    } catch (err) {
        return res.status(500).json({
            status: "error",
            message: "Error en la conexion",
            error: err.message
        });
    }
}

// Subir / reemplazar foto de perfil. Se guarda via la capa de almacenamiento
// (servicios/storage.js), que decide si el archivo va a disco local o a S3
// segun STORAGE_DRIVER. No se aplican las 3 transformaciones automaticas
// aqui: ese requisito corresponde a las FOTOGRAFIAS publicadas (ver
// Controlador/publicacion.js); el avatar es una imagen de perfil simple.
const upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(404).send({
                status: "error",
                message: "Peticion no incluye imagen"
            });
        }

        const extension = (req.file.originalname.split(".").pop() || "").toLowerCase();

        if (!["png", "jpg", "jpeg", "gif"].includes(extension)) {
            return res.status(400).send({
                status: "error",
                message: "Extension del fichero invalida"
            });
        }

        const usuario = await User.findByPk(req.user.id);
        if (!usuario) {
            return res.status(500).send({
                status: "error",
                message: "Error en la subida del avatar"
            });
        }

        const filename = `avatar_${usuario.id}_${Date.now()}.${extension}`;
        await storage.guardar(req.file.buffer, `usuarios/${filename}`, { contentType: req.file.mimetype });

        const avatarAnterior = usuario.image;
        await usuario.update({ image: filename });

        if (avatarAnterior && avatarAnterior !== "default.png") {
            storage.eliminar(`usuarios/${avatarAnterior}`).catch(() => {});
        }

        return res.status(200).send({
            status: "success",
            user: serializarUsuario(usuario),
            file: { filename }
        });

    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error en el servidor",
            error: error.message
        });
    }
}

const profile = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const usuario = await User.findByPk(id, {
            attributes: { exclude: ["role", "email", "password"] }
        });

        if (!usuario) {
            return res.status(404).send({
                status: "error",
                message: "El usuario no existe"
            });
        }

        return res.status(200).send({
            status: "success",
            user: serializarUsuario(usuario)
        });

    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error al obtener el perfil",
            error: error.message
        });
    }
};

// Verificar reCAPTCHA con los servidores de Google
const verificarCaptcha = async (captchaToken) => {
    if (!captchaToken) return false;

    try {
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(captchaToken)}`
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("Error al validar reCAPTCHA en servidores de Google:", error);
        return false;
    }
};

// Login / Registro mediante Google
const loginGoogle = async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        let usuario = await User.findOne({ where: { email: email.toLowerCase() } });

        if (!usuario) {
            // Generar una contrasena aleatoria e inviable de adivinar, ya que
            // el login es solo por Google, pero el modelo exige password.
            const randomPassword = Math.random().toString(36).slice(-10) + Date.now();
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            usuario = await User.create({
                name: name || email.split("@")[0],
                nick: `${email.split("@")[0]}_${Math.floor(Math.random() * 1000)}`,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: "role_user"
            });
        }

        const jwtToken = jwt.createToken(usuario);

        return res.status(200).json({
            status: "success",
            mensaje: "Autenticacion exitosa con Google",
            user: serializarUsuario(usuario),
            token: jwtToken
        });

    } catch (error) {
        console.error("Error en login Google backend:", error);
        return res.status(400).json({
            status: "error",
            mensaje: "El token de Google es invalido",
            error: error.message
        });
    }
};

module.exports = {
    pruebaUser,
    register,
    login,
    list,
    update,
    profile,
    upload,
    loginGoogle,
    serializarUsuario
};
