const { Publicacion, ImageVariant, FaceDetection } = require("../modelo");
const storage = require("../servicios/storage");
const imageProcessor = require("../servicios/imageProcessor");

const pruebaPublication = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde controller/publication.js"
    });
}

// Convierte una publicacion en el objeto que consume el frontend: agrega
// "_id", y URLs absolutas listas para usar en <img src> (imageUrl = foto
// principal; thumbnailUrl/grayscaleUrl/sepiaUrl = las 3 transformaciones
// automaticas generadas al subir la imagen). La ubicacion real del archivo
// (disco local o S3) nunca se expone directamente, solo la URL publica.
function serializarPublicacionBase(post, variantesUrls = {}) {
    const data = typeof post.toJSON === "function" ? post.toJSON() : { ...post };
    const tieneImagen = data.imgUrl && data.imgUrl !== "Sin imagen";
    const imageUrl = tieneImagen ? storage.urlPublica(`post/${data.imgUrl}`) : null;

    return {
        ...data,
        _id: data.id,
        imageUrl,
        thumbnailUrl: variantesUrls.thumbnail || imageUrl,
        grayscaleUrl: variantesUrls.grayscale || null,
        sepiaUrl: variantesUrls.sepia || null
    };
}

// Adjunta las variantes (miniatura/B&N/sepia) a una lista de publicaciones
// en una sola consulta (evita N+1 queries al listar el feed).
async function adjuntarVariantes(posts) {
    const lista = Array.isArray(posts) ? posts : [posts];
    const ids = lista.map((p) => p.id);

    const variantes = ids.length
        ? await ImageVariant.findAll({
            where: {
                ownerType: "post",
                ownerId: ids,
                variantType: ["thumbnail", "grayscale", "sepia"]
            }
        })
        : [];

    const mapaPorPost = {};
    for (const v of variantes) {
        mapaPorPost[v.ownerId] = mapaPorPost[v.ownerId] || {};
        mapaPorPost[v.ownerId][v.variantType] = storage.urlPublica(v.storageKey);
    }

    return lista.map((post) => serializarPublicacionBase(post, mapaPorPost[post.id] || {}));
}

async function serializarUno(post) {
    const [resultado] = await adjuntarVariantes([post]);
    return resultado;
}

// Guardar la publicacion en la base de datos
const crear = async (req, res) => {
    try {
        const { usuario, usuarioNick, contenido } = req.body;

        if (!usuario || !contenido) {
            return res.status(400).json({
                status: "error",
                mensaje: "Faltan datos para crear la publicacion"
            });
        }

        const articulo = await Publicacion.create({
            usuario,
            usuarioNick,
            contenido,
            imgUrl: "Sin imagen"
        });

        return res.status(201).json({
            status: "success",
            articulo: await serializarUno(articulo),
            mensaje: "Publicacion creada con exito"
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "No se ha guardado la publicacion",
            error: error.message
        });
    }
}

// Sumar o restar Like
const likes = async (req, res) => {
    const id = req.params.id || req.body.id;
    const cantidad = (req.body && req.body.decrement) ? -1 : 1;

    try {
        const post = await Publicacion.findByPk(id);

        if (!post) {
            return res.status(500).json({
                status: "error",
                mensaje: "Error al dar like a la publicacion"
            });
        }

        post.likes = Math.max(0, (post.likes || 0) + cantidad);
        await post.save();

        return res.status(200).json({
            status: "success",
            publicacion: await serializarUno(post)
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al dar like a la publicacion",
            error: error.message
        });
    }
}

// Listar publicaciones (feed). Requiere sesion iniciada (ver rutas/rutas.js),
// segun el requisito de "pagina de inicio para usuarios autenticados".
const listar = async (req, res) => {
    try {
        const ultimos = req.params.ultimos ? parseInt(req.params.ultimos, 10) : null;

        const posts = await Publicacion.findAll({
            order: [["fecha", "DESC"]],
            limit: ultimos || undefined
        });

        if (!posts || posts.length === 0) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se han encontrado publicaciones",
            });
        }

        return res.status(200).send({
            status: "success",
            parametro: req.params.ultimos,
            contador: posts.length,
            consulta: await adjuntarVariantes(posts),
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Ha ocurrido un error al listar",
        });
    }
};

// Obtener una publicacion
const uno = async (req, res) => {
    try {
        const id = req.params.id;
        const articulo = await Publicacion.findByPk(id);

        if (!articulo) {
            return res.status(404).json({
                status: "Error",
                mensaje: "No se ha encontrado la publicacion",
            });
        }

        return res.status(200).json({
            status: "Success",
            articulo: await serializarUno(articulo),
        });
    } catch (error) {
        return res.status(500).json({
            status: "Error",
            mensaje: "Ha ocurrido un error al buscar la publicacion",
        });
    }
};

// Borrar publicacion (incluye sus variantes de imagen y analisis facial)
const borrar = async (req, res) => {
    try {
        const articuloId = req.params.id;
        const articulo = await Publicacion.findByPk(articuloId);

        if (!articulo) {
            return res.status(500).json({
                status: "error",
                mensaje: "Error al borrar la publicacion"
            });
        }

        const variantes = await ImageVariant.findAll({
            where: { ownerType: "post", ownerId: articulo.id }
        });
        await Promise.all(variantes.map((v) => storage.eliminar(v.storageKey)));
        await ImageVariant.destroy({ where: { ownerType: "post", ownerId: articulo.id } });
        await FaceDetection.destroy({ where: { ownerType: "post", ownerId: articulo.id } });

        const copia = serializarPublicacionBase(articulo, {});
        await articulo.destroy();

        return res.status(200).json({
            status: "Success",
            articulo: copia,
            mensaje: "Publicacion eliminada"
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al borrar la publicacion"
        });
    }
}

// Editar contenido de una publicacion
const editar = async (req, res) => {
    try {
        const articuloId = req.params.id;
        const { contenido } = req.body;

        const articulo = await Publicacion.findByPk(articuloId);
        if (!articulo) {
            return res.status(500).json({
                status: "Error",
                mensaje: "Error al actualizar"
            });
        }

        if (contenido !== undefined) {
            articulo.contenido = contenido;
            await articulo.save();
        }

        return res.status(200).json({
            status: "success",
            articulo: await serializarUno(articulo)
        });

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Faltan datos para enviar"
        });
    }
};

// Subir la foto de una publicacion. Aqui ocurre lo mas importante del
// requisito del proyecto: al llegar una imagen nueva se generan
// AUTOMATICAMENTE 3 transformaciones (miniatura, blanco y negro, sepia) y se
// corre el reconocimiento facial (face-api.js), todo mediante
// servicios/imageProcessor.js. Las imagenes se guardan en disco o S3 segun
// STORAGE_DRIVER; en la base de datos solo queda la referencia (storageKey).
const subir = async (req, res) => {
    try {
        const articuloId = req.params.id;

        if (!req.file) {
            return res.status(404).json({
                status: "error",
                mensaje: "Peticion invalida"
            });
        }

        const extension = (req.file.originalname.split(".").pop() || "").toLowerCase();
        if (!["png", "jpg", "jpeg", "gif"].includes(extension)) {
            return res.status(400).json({
                status: "error",
                mensaje: "Imagen invalida"
            });
        }

        const articulo = await Publicacion.findByPk(articuloId);
        if (!articulo) {
            return res.status(404).json({ status: "error", mensaje: "Publicacion no encontrada" });
        }

        const resultado = await imageProcessor.procesarImagenSubida({
            buffer: req.file.buffer,
            originalName: req.file.originalname,
            folder: "post",
            ownerType: "post",
            ownerId: articulo.id
        });

        // Se guarda solo el nombre de archivo (sin el prefijo "post/"), igual
        // que en la version anterior del proyecto, para no romper nada que
        // dependa del formato previo de "imgUrl".
        const nombreOriginal = resultado.originalKey.split("/").pop();
        await articulo.update({ imgUrl: nombreOriginal });

        return res.status(200).json({
            status: "success",
            articulo: await serializarUno(articulo),
            transformacionesAutomaticas: resultado.urls,
            analisisFacial: resultado.faceResult
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
};

module.exports = {
    pruebaPublication,
    crear,
    listar,
    uno,
    borrar,
    editar,
    subir,
    likes,
    serializarUno,
    adjuntarVariantes
}
