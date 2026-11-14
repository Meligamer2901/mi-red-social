const express = require("express");
const router = express.Router();

const UserController = require("../Controlador/user");
const PublicacionController = require("../Controlador/publicacion");
const FollowController = require("../Controlador/follow");
const ImagenController = require("../Controlador/imagen");
const multer = require("multer");
const auth = require("../middlewares/auth");
const auditar = require("../middlewares/auditoria");
const { limiteLogin, limiteRegistro } = require("../middlewares/limites");

// Nombre de la accion de login segun el resultado de la peticion.
const resultadoLogin = (ok, mal) => ({ status }) => (status === 200 ? ok : mal);

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
router.post("/registrar/user", limiteRegistro, auditar(({ status }) => (status === 200 ? "REGISTRO_USUARIO" : "REGISTRO_FALLIDO")), UserController.register);
router.post("/login/user", limiteLogin, auditar(resultadoLogin("LOGIN_OK", "LOGIN_FALLIDO")), UserController.login);
router.get("/profile/user/:id", auth.auth, UserController.profile);
router.get("/listar/user/:page", auth.auth, UserController.list);
router.put("/actualizar/user", auth.auth, auditar("PERFIL_ACTUALIZADO"), UserController.update);
router.put("/upload/user", [auth.auth, auditar("FOTO_PERFIL_CAMBIADA"), subidaEnMemoria.single("file0")], UserController.upload);
router.post("/login/google", limiteLogin, auditar(resultadoLogin("LOGIN_GOOGLE_OK", "LOGIN_GOOGLE_FALLIDO")), UserController.loginGoogle);

//publicaciones
router.post("/crear/publicacion", auth.auth, auditar("POST_CREADO"), PublicacionController.crear);
// Requiere sesion iniciada: el feed es para "usuarios autenticados" (requisito del proyecto)
router.get("/listar/publicacion", auth.auth, PublicacionController.listar);
router.get("/publicacion/:id", auth.auth, PublicacionController.uno);
router.delete("/borrar/publicacion/:id", auth.auth, auditar("POST_BORRADO"), PublicacionController.borrar);
router.put("/actualizar/publicacion/:id", auth.auth, auditar("POST_EDITADO"), PublicacionController.editar);
router.post("/subir-imagen/:id", [auth.auth, auditar("IMAGEN_SUBIDA"), subidaEnMemoria.single("file0")], PublicacionController.subir);
router.put("/likes/publicacion", auth.auth, auditar("POST_LIKE"), PublicacionController.likes);

//followers
router.get("/prueba-follow", FollowController.pruebaFollows);
router.post("/follow/seguir/:id", auth.auth, auditar("FOLLOW_SEGUIR"), FollowController.seguir);
router.delete("/follow/dejar/:id", auth.auth, auditar("FOLLOW_DEJAR"), FollowController.dejarDeSeguir);
router.get("/follow/comprobar/:id", auth.auth, FollowController.comprobar);
router.get("/listar/siguiendo", auth.auth, FollowController.publicacionesSeguidos);
router.get("/follow/usuario-nick/:nick", auth.auth, FollowController.obtenerUsuarioPorNick);

//imagen (transformaciones manuales adicionales + analisis facial bajo demanda)
router.post("/imagen/transformar", auth.auth, auditar("IMAGEN_FILTRO"), ImagenController.transformarImagen);
router.post("/analizar-rostro", auth.auth, ImagenController.analizarRostro);

module.exports = router;
