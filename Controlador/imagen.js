// Funcionalidad adicional (bonus) mas alla del minimo pedido: un editor
// manual con 9 filtros extra (ademas de las 3 transformaciones automaticas
// que ya se generan solas al subir la foto, ver servicios/imageProcessor.js)
// y un boton de "Analizar Rostro" bajo demanda. Todo pasa por la misma
// capa de almacenamiento (servicios/storage.js) para funcionar igual en
// disco local o en S3.

const sharp = require("sharp");

const { User, Publicacion, ImageVariant } = require("../modelo");
const storage = require("../servicios/storage");
const imageProcessor = require("../servicios/imageProcessor");

const FILTROS_VALIDOS = ["grayscale", "sepia", "invert", "blur", "bright", "contrast", "warm", "cool", "hue"];

// Analisis facial manual bajo demanda (ademas del automatico en la subida)
const analizarRostro = async (req, res) => {
    try {
        const { tipo, idTarget } = req.body;

        if (!idTarget) {
            return res.status(400).json({ status: "error", mensaje: "Falta el identificador del recurso a analizar" });
        }

        const folder = tipo === "perfil" ? "usuarios" : "post";
        let claveActual;

        if (tipo === "perfil") {
            const usuario = await User.findByPk(idTarget);
            if (!usuario || !usuario.image) {
                return res.status(404).json({ status: "error", mensaje: "No se encontro la imagen de perfil" });
            }
            claveActual = usuario.image;
        } else {
            const post = await Publicacion.findByPk(idTarget);
            if (!post || !post.imgUrl || post.imgUrl === "Sin imagen") {
                return res.status(404).json({ status: "error", mensaje: "No se encontro la imagen de la publicacion" });
            }
            claveActual = post.imgUrl;
        }

        const buffer = await storage.leer(`${folder}/${claveActual}`);
        const resultado = await imageProcessor.analizarRostrosDesdeBuffer(buffer);

        const detalles = resultado.details.map((d) => ({
            id: d.id,
            generoEstimado: d.generoEstimado,
            generoProbabilidad: `${d.generoProbabilidad}%`,
            edadEstimada: `${d.edadEstimada} anios`
        }));

        return res.status(200).json({
            status: "success",
            totalRostros: resultado.facesCount,
            imagenPrevisualizacion: resultado.previewBase64,
            detalles
        });

    } catch (error) {
        console.error("Error en analisis con face-api:", error);
        return res.status(500).json({ status: "error", mensaje: "Error al realizar el analisis facial" });
    }
};

// Aplica uno de los 9 filtros adicionales sobre la imagen ORIGINAL del
// usuario/publicacion, guarda el resultado como una nueva variante y
// actualiza el puntero "principal" para que se muestre de inmediato.
const transformarImagen = async (req, res) => {
    try {
        const { filtro, tipo, idTarget } = req.body;

        if (!idTarget || (filtro !== "normal" && !FILTROS_VALIDOS.includes(filtro))) {
            return res.status(400).json({ status: "error", mensaje: "Peticion invalida: falta idTarget o el filtro no es soportado" });
        }

        const folder = tipo === "perfil" ? "usuarios" : "post";
        const ownerType = tipo === "perfil" ? "user" : "post";

        let registro;
        let claveActual;
        if (tipo === "perfil") {
            registro = await User.findByPk(idTarget);
            claveActual = registro ? registro.image : null;
        } else {
            registro = await Publicacion.findByPk(idTarget);
            claveActual = registro ? registro.imgUrl : null;
        }

        if (!registro || !claveActual || claveActual === "Sin imagen") {
            return res.status(404).json({ status: "error", mensaje: "No se encontro la imagen origen" });
        }

        const bufferOriginal = await storage.leer(`${folder}/${claveActual}`);

        let pipeline = sharp(bufferOriginal).rotate().ensureAlpha();
        switch (filtro) {
            case "grayscale": pipeline = pipeline.grayscale(); break;
            case "sepia": pipeline = pipeline.tint({ r: 112, g: 66, b: 20 }); break;
            case "invert": pipeline = pipeline.negate({ alpha: false }); break;
            case "blur": pipeline = pipeline.blur(5); break;
            case "bright": pipeline = pipeline.modulate({ brightness: 1.4 }); break;
            case "contrast": pipeline = pipeline.linear(1.5, -20); break;
            case "warm": pipeline = pipeline.tint({ r: 255, g: 200, b: 150 }); break;
            case "cool": pipeline = pipeline.tint({ r: 100, g: 200, b: 255 }); break;
            case "hue": pipeline = pipeline.modulate({ hue: 120 }); break;
            default: break; // "normal": copia sin cambios
        }

        const bufferFiltrado = await pipeline.jpeg({ quality: 90 }).toBuffer();

        const nuevoNombre = `${ownerType}_${idTarget}_custom_${filtro}_${Date.now()}.jpg`;
        const nuevaKey = `${folder}/${nuevoNombre}`;
        await storage.guardar(bufferFiltrado, nuevaKey, { contentType: "image/jpeg" });

        await ImageVariant.create({
            ownerType,
            ownerId: parseInt(idTarget, 10),
            variantType: `custom_${filtro}`,
            storageProvider: storage.DRIVER,
            storageKey: nuevaKey
        });

        if (tipo === "perfil") {
            await registro.update({ image: nuevoNombre });
        } else {
            await registro.update({ imgUrl: nuevoNombre });
        }

        return res.status(200).json({
            status: "success",
            mensaje: "Imagen editada con exito",
            nuevaImagen: nuevoNombre,
            nuevaImagenUrl: storage.urlPublica(nuevaKey)
        });

    } catch (error) {
        console.error("Error al transformar imagen:", error);
        return res.status(500).json({ status: "error", mensaje: "Error interno al procesar la imagen" });
    }
};

module.exports = { transformarImagen, analizarRostro };
