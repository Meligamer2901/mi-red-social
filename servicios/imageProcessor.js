// Pipeline de procesamiento automatico de imagenes.
//
// Requisitos cubiertos aqui:
//  - "Al subir una imagen, la app crea automaticamente 3 transformaciones
//     distintas (reduccion de escala, ampliacion, blanco y negro, sepia, etc.)"
//     -> generarTransformacionesAutomaticas() crea: miniatura (reduccion de
//        escala), blanco y negro y sepia, usando Sharp.
//  - "Subir fotografias: reconocer imagenes con face-api.js"
//     -> analizarRostrosDesdeBuffer() corre automaticamente sobre cada foto
//        subida (ver Controlador/publicacion.js y Controlador/user.js).
//  - Las imagenes NUNCA se guardan en la base de datos: solo se persiste la
//     "storageKey" (ruta local o key de S3) en la tabla image_variants.

const path = require("path");
const sharp = require("sharp");
const canvas = require("canvas");
const faceapi = require("face-api.js");

const storage = require("./storage");
const { ImageVariant, FaceDetection } = require("../modelo");

// --- Configuracion de face-api.js para correr en Node (sin DOM) ---
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelosCargados = false;
async function cargarModelosFaceApi() {
    if (modelosCargados) return;
    const modelsPath = path.resolve(process.cwd(), "models");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.ageGenderNet.loadFromDisk(modelsPath);
    modelosCargados = true;
}

/**
 * Ejecuta deteccion facial sobre un buffer de imagen y devuelve metadatos
 * (nunca la imagen completa se guarda en BD; solo se persiste el conteo y
 * detalle de rostros, y opcionalmente una vista previa en base64 para la UI).
 */
async function analizarRostrosDesdeBuffer(buffer) {
    await cargarModelosFaceApi();

    const img = await canvas.loadImage(buffer);
    const detecciones = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withAgeAndGender();

    const outCanvas = faceapi.createCanvasFromMedia(img);
    faceapi.draw.drawDetections(outCanvas, detecciones);

    const detalles = detecciones.map((det, index) => ({
        id: index + 1,
        generoEstimado: det.gender === "male" ? "Masculino" : "Femenino",
        generoProbabilidad: Math.round(det.genderProbability * 100),
        edadEstimada: Math.round(det.age)
    }));

    return {
        facesCount: detecciones.length,
        details: detalles,
        previewBase64: `data:image/jpeg;base64,${outCanvas.toBuffer("image/jpeg").toString("base64")}`
    };
}

/**
 * Pipeline principal: guarda la imagen original y genera automaticamente
 * 3 transformaciones (miniatura / blanco y negro / sepia), registrando cada
 * una en image_variants. Tambien intenta el analisis facial automatico
 * (no bloquea la subida si face-api.js falla por alguna imagen sin rostros
 * o con formato no soportado).
 *
 * @param {Buffer} buffer       Imagen original tal como la envio el usuario.
 * @param {string} originalName Nombre original del archivo (para la extension).
 * @param {"usuarios"|"post"} folder Subcarpeta logica (compatibilidad con rutas previas).
 * @param {"user"|"post"} ownerType  Tipo de dueño de la imagen.
 * @param {number} ownerId      Id del usuario o de la publicacion dueña.
 */
async function procesarImagenSubida({ buffer, originalName, folder, ownerType, ownerId }) {
    const ext = (path.extname(originalName || "") || ".jpg").toLowerCase();
    const prefijo = `${ownerType}_${ownerId}_${Date.now()}`;

    const originalKey = `${folder}/${prefijo}_original${ext}`;
    const thumbKey = `${folder}/${prefijo}_thumbnail.jpg`;
    const grayscaleKey = `${folder}/${prefijo}_grayscale.jpg`;
    const sepiaKey = `${folder}/${prefijo}_sepia.jpg`;

    // 1. Imagen original, sin modificar
    await storage.guardar(buffer, originalKey, { contentType: contentTypeDeExt(ext) });

    // 2-4. Transformaciones automaticas (Sharp). .rotate() preserva la
    // orientacion EXIF de fotos tomadas con celular.
    const base = () => sharp(buffer).rotate();

    const [thumbBuf, grayBuf, sepiaBuf] = await Promise.all([
        base().resize({ width: 400, withoutEnlargement: false }).jpeg({ quality: 80 }).toBuffer(), // reduccion de escala
        base().grayscale().jpeg({ quality: 85 }).toBuffer(),                                       // blanco y negro
        base().tint({ r: 112, g: 66, b: 20 }).jpeg({ quality: 85 }).toBuffer()                      // sepia
    ]);

    await Promise.all([
        storage.guardar(thumbBuf, thumbKey, { contentType: "image/jpeg" }),
        storage.guardar(grayBuf, grayscaleKey, { contentType: "image/jpeg" }),
        storage.guardar(sepiaBuf, sepiaKey, { contentType: "image/jpeg" })
    ]);

    const variantesCreadas = await ImageVariant.bulkCreate([
        { ownerType, ownerId, variantType: "original", storageProvider: storage.DRIVER, storageKey: originalKey },
        { ownerType, ownerId, variantType: "thumbnail", storageProvider: storage.DRIVER, storageKey: thumbKey },
        { ownerType, ownerId, variantType: "grayscale", storageProvider: storage.DRIVER, storageKey: grayscaleKey },
        { ownerType, ownerId, variantType: "sepia", storageProvider: storage.DRIVER, storageKey: sepiaKey }
    ]);

    // 5. Reconocimiento facial automatico (no bloquea la subida si falla)
    let faceResult = null;
    try {
        faceResult = await analizarRostrosDesdeBuffer(buffer);
        await FaceDetection.create({
            ownerType,
            ownerId,
            facesCount: faceResult.facesCount,
            details: faceResult.details
        });
    } catch (error) {
        console.warn("Analisis facial automatico fallo (continua la subida):", error.message);
    }

    return {
        originalKey,
        variantes: {
            original: originalKey,
            thumbnail: thumbKey,
            grayscale: grayscaleKey,
            sepia: sepiaKey
        },
        urls: {
            original: storage.urlPublica(originalKey),
            thumbnail: storage.urlPublica(thumbKey),
            grayscale: storage.urlPublica(grayscaleKey),
            sepia: storage.urlPublica(sepiaKey)
        },
        faceResult,
        registros: variantesCreadas
    };
}

/** Obtiene todas las variantes registradas de un post/usuario, como { tipo: url }. */
async function obtenerVariantes(ownerType, ownerId) {
    const filas = await ImageVariant.findAll({
        where: { ownerType, ownerId },
        order: [["createdAt", "ASC"]]
    });

    const resultado = {};
    for (const fila of filas) {
        resultado[fila.variantType] = storage.urlPublica(fila.storageKey);
    }
    return resultado;
}

function contentTypeDeExt(ext) {
    const mapa = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };
    return mapa[ext.toLowerCase()] || "image/jpeg";
}

module.exports = {
    cargarModelosFaceApi,
    analizarRostrosDesdeBuffer,
    procesarImagenSubida,
    obtenerVariantes
};
