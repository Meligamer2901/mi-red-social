const express = require("express");
const router = express.Router();

const UserController = require("../Controlador/user");
const PublicacionController = require("../Controlador/publicacion");
const FollowController = require("../Controlador/follow");
const ImagenController = require("../Controlador/imagen");
const multer = require("multer");
const auth = require("../middlewares/auth");

// Se usa almacenamiento en MEMORIA (no en disco) para que el archivo llegue
// como Buffer (req.file.buffer) a los controladores. Asi, el mismo codigo
// funciona sin cambios tanto si el backend termina guardando la imagen en
// disco local como en un bucket de Amazon S3 (ver servicios/storage.js).
const subidaEnMemoria = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB por archivo
});

//usuarios
router.get("/prueba/user", UserController.pruebaUser);
router.post("/registrar/user", UserController.register);
router.post("/login/user", UserController.login);
router.get("/profile/user/:id", auth.auth, UserController.profile);
router.get("/listar/user/:page", auth.auth, UserController.list);
router.put("/actualizar/user", auth.auth, UserController.update);
router.put("/upload/user", [auth.auth, subidaEnMemoria.single("file0")], UserController.upload);
router.post("/login/google", UserController.loginGoogle);

//publicaciones
router.post("/crear/publicacion", auth.auth, PublicacionController.crear);
// Requiere sesion iniciada: el feed es para "usuarios autenticados" (requisito del proyecto)
router.get("/listar/publicacion", auth.auth, PublicacionController.listar);
router.get("/publicacion/:id", auth.auth, PublicacionController.uno);
router.delete("/borrar/publicacion/:id", auth.auth, PublicacionController.borrar);
router.put("/actualizar/publicacion/:id", auth.auth, PublicacionController.editar);
router.post("/subir-imagen/:id", [auth.auth, subidaEnMemoria.single("file0")], PublicacionController.subir);
router.put("/likes/publicacion", auth.auth, PublicacionController.likes);

//followers
router.get("/prueba-follow", FollowController.pruebaFollows);
router.post("/follow/seguir/:id", auth.auth, FollowController.seguir);
router.delete("/follow/dejar/:id", auth.auth, FollowController.dejarDeSeguir);
router.get("/follow/comprobar/:id", auth.auth, FollowController.comprobar);
router.get("/listar/siguiendo", auth.auth, FollowController.publicacionesSeguidos);
router.get("/follow/usuario-nick/:nick", auth.auth, FollowController.obtenerUsuarioPorNick);

//imagen (transformaciones manuales adicionales + analisis facial bajo demanda)
router.post("/imagen/transformar", auth.auth, ImagenController.transformarImagen);
router.post("/analizar-rostro", auth.auth, ImagenController.analizarRostro);

module.exports = router;
