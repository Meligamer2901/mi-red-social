require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connection = require("./database/conexion");
const Routes = require("./rutas/rutas");

const puerto = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "*";

const app = express();

app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin.split(",") }));
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
