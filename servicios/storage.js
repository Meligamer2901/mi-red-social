// Capa de abstraccion de almacenamiento de imagenes.
//
// Requisito del proyecto: "Todas las imagenes se almacenan en S3" en produccion,
// pero el equipo necesita poder desarrollar y probar sin tener aun una cuenta
// de AWS. Esta capa resuelve ambos casos con la MISMA interfaz:
//
//   STORAGE_DRIVER=local  -> guarda los archivos en ./imagenes/<key> (disco)
//   STORAGE_DRIVER=s3     -> sube los archivos a un bucket de Amazon S3
//
// Los controladores NUNCA tocan `fs` o `@aws-sdk/*` directamente: siempre
// pasan por guardar()/eliminar()/urlPublica() para que cambiar de proveedor
// sea solo cuestion de variables de entorno (ver .env.example).

const fs = require("fs");
const path = require("path");

const DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();
const BASE_URL = process.env.BASE_URL || "http://localhost:4000";
const LOCAL_ROOT = path.resolve(process.cwd(), "imagenes");

let s3Client = null;
function getS3Client() {
    if (!s3Client) {
        const { S3Client } = require("@aws-sdk/client-s3");
        s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
    }
    return s3Client;
}

/**
 * Guarda un buffer bajo la "key" indicada (ej: "post/post123.jpg").
 * Devuelve { provider, key } para que se persista en la tabla image_variants.
 */
async function guardar(buffer, key, { contentType = "image/jpeg" } = {}) {
    if (DRIVER === "s3") {
        const { PutObjectCommand } = require("@aws-sdk/client-s3");
        await getS3Client().send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType
        }));
        return { provider: "s3", key };
    }

    // Modo local
    const destino = path.join(LOCAL_ROOT, key);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, buffer);
    return { provider: "local", key };
}

/** Elimina un archivo por su key (si existe). No lanza error si ya no existe. */
async function eliminar(key) {
    if (!key) return;

    if (DRIVER === "s3") {
        const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
        try {
            await getS3Client().send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key
            }));
        } catch (error) {
            console.warn(`No se pudo borrar '${key}' de S3:`, error.message);
        }
        return;
    }

    const ruta = path.join(LOCAL_ROOT, key);
    fs.promises.unlink(ruta).catch(() => {}); // ignora si no existe
}

/** Lee un archivo completo a memoria (usado por el pipeline de transformaciones / face-api.js). */
async function leer(key) {
    if (DRIVER === "s3") {
        const { GetObjectCommand } = require("@aws-sdk/client-s3");
        const resp = await getS3Client().send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key
        }));
        const chunks = [];
        for await (const chunk of resp.Body) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    const ruta = path.join(LOCAL_ROOT, key);
    return fs.promises.readFile(ruta);
}

/** Construye la URL publica con la que el frontend puede mostrar la imagen. */
function urlPublica(key) {
    if (!key) return null;
    if (DRIVER === "s3") {
        const bucket = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_REGION || "us-east-1";
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    return `${BASE_URL}/imagenes/${key}`;
}

module.exports = { guardar, eliminar, leer, urlPublica, DRIVER, LOCAL_ROOT };
