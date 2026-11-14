require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const connection = require("./database/conexion");
const Routes = require("./rutas/rutas");

const puerto = process.env.PORT || 4000;
const esProduccion = process.env.NODE_ENV === "production";

// CORS: en produccion se limita al dominio real (CORS_ORIGIN o, si falta, BASE_URL).
// "*" solo se permite en desarrollo.
let corsOrigin = process.env.CORS_ORIGIN || (esProduccion ? process.env.BASE_URL : "*") || "*";
if (esProduccion && corsOrigin === "*") {
    console.warn("ADVERTENCIA: CORS_ORIGIN=* en produccion. Configura el dominio real en .env");
}

const app = express();

// Detras de nginx: req.ip debe ser la IP real del visitante (auditoria y limites).
app.set("trust proxy", 1);

// Cabeceras de seguridad HTTP. crossOriginResourcePolicy se relaja para que las
// imagenes (S3 o /imagenes) puedan mostrarse desde el frontend.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((o) => o.trim()) }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sirve las imagenes guardadas en modo local (STORAGE_DRIVER=local).
// Si STORAGE_DRIVER=s3, las imagenes se sirven directamente desde el bucket
// de S3 y esta ruta deja de usarse, pero se mantiene activa sin costo.
app.use("/imagenes", express.static(path.join(__dirname, "imagenes")));

app.use("/api", Routes);

app.get("/", (req, res) => {
    res.send("API de red social funcionando");
});

async function iniciar() {
    try {
        await connection();
        app.listen(puerto, () => {
            console.log(`Servidor ejecutandose en ${process.env.BASE_URL || `http://localhost:${puerto}`}`);
        });
    } catch (error) {
        console.error("No se pudo iniciar el servidor por un error de base de datos:", error.message);
        process.exit(1);
    }
}

iniciar();
