// Middleware de auditoria de transacciones.
//
// Uso en rutas:
//   router.delete("/borrar/publicacion/:id", auth.auth, auditar("POST_BORRADO"), ...)
//   router.post("/login/user", auditar(({ status }) => status === 200 ? "LOGIN_OK" : "LOGIN_FALLIDO"), ...)
//
// "accion" puede ser un texto fijo o una funcion que recibe { status, req, res }
// y devuelve el texto (util para distinguir login correcto de fallido).
//
// El registro se escribe cuando la respuesta termina ("finish"), asi un fallo de
// auditoria nunca rompe la peticion del usuario.

const AuditLog = require("../modelo/auditLog");

// Campos que jamas se copian al registro de auditoria.
const CAMPOS_PROHIBIDOS = ["password", "token", "captchaToken", "credential", "authorization"];

function limpiar(obj) {
    const salida = {};
    for (const [k, v] of Object.entries(obj || {})) {
        if (CAMPOS_PROHIBIDOS.includes(k)) continue;
        if (typeof v === "string" && v.length > 200) continue; // evita guardar contenido grande
        salida[k] = v;
    }
    return salida;
}

module.exports = (accion) => (req, res, next) => {
    res.on("finish", () => {
        const nombre = typeof accion === "function"
            ? accion({ status: res.statusCode, req, res })
            : accion;

        // Para login fallido se guarda el correo intentado (nunca la contrasena).
        const detalle = { params: limpiar(req.params) };
        if (req.body && req.body.email) detalle.email = String(req.body.email).slice(0, 120);

        AuditLog.create({
            userId: req.user ? req.user.id : null,
            accion: nombre,
            metodo: req.method,
            ruta: String(req.originalUrl).slice(0, 255),
            statusCode: res.statusCode,
            ip: req.ip,
            detalle
        }).catch((e) => console.error("No se pudo escribir la auditoria:", e.message));
    });
    next();
};
