# Sistema de auditoría de transacciones

Proyecto Final de Desarrollo Web (UMG) — Red social de fotografías.

Una **auditoría** responde a: *¿quién hizo qué, cuándo y desde dónde?* Este documento
describe qué evidencia deja la aplicación, incluida la tabla `audit_log`, que **ya está
implementada** (modelo `modelo/auditLog.js` y middleware `middlewares/auditoria.js`).

## 1. Transacciones de la aplicación

| Transacción | Endpoint | Tablas que cambian |
|---|---|---|
| Registro de usuario | `POST /api/registrar/user` | `users` |
| Inicio de sesión | `POST /api/login/user`, `POST /api/login/google` | (ninguna; crea un token) |
| Actualizar perfil / contraseña | `PUT /api/actualizar/user` | `users` |
| Cambiar foto de perfil | `PUT /api/upload/user` | `users` (y el archivo de imagen) |
| Crear publicación | `POST /api/crear/publicacion` | `posts` |
| Subir imagen | `POST /api/subir-imagen/:id` | `posts`, `image_variants`, `face_detections` |
| Editar / borrar publicación | `PUT` / `DELETE` sobre `publicacion` | `posts` |
| Me gusta | `PUT /api/likes/publicacion` | `posts` |
| Seguir / dejar de seguir | `POST` / `DELETE /api/follow/...` | `followers` |
| Aplicar filtro a una foto | `POST /api/imagen/transformar` | `image_variants`, `posts` o `users` |

## 2. Evidencia que existe

| Fuente | Qué registra | Dónde |
|---|---|---|
| Tabla `audit_log` | Quién (usuario o correo intentado), qué acción, cuándo, desde qué IP y con qué código de respuesta | PostgreSQL (se crea sola al arrancar la app) |
| Columnas de fecha | Cuándo se creó cada registro | `users.created_at`, `posts.fecha`, `followers.fecha_follow`, `image_variants.created_at`, `face_detections.created_at` |
| Logs de PM2 | Salida y errores de la app, con fecha y hora | `logs/out.log`, `logs/error.log` (`time: true` en `ecosystem.config.js`) |
| Logs de acceso de nginx | IP, método, ruta, código de respuesta y hora de cada petición | `/var/log/nginx/access.log` |
| AWS CloudTrail | Acciones sobre la cuenta de AWS (crear/detener instancias, cambios de IAM, S3) | Consola de AWS |
| Restricciones de la BD | Bloquean duplicados y auto-seguimiento a nivel de base de datos | `UNIQUE`, `CHECK` en `database/schema.sql` |

### Limitaciones actuales

- Los cambios de perfil registran **qué acción ocurrió**, pero no guardan el valor anterior
  (por diseño: jamás se guardan contraseñas ni correos anteriores).
- Los logs de PM2 mezclan mensajes técnicos con eventos de negocio; para los eventos de
  negocio se consulta `audit_log`.
- Los accesos denegados por token inválido o vencido los rechaza `middlewares/auth.js` y
  quedan en el log de acceso de nginx (códigos 401/403/404), no en `audit_log`.

## 3. Qué debe registrarse

| Evento | Importancia | Detalle a guardar |
|---|---|---|
| Inicio de sesión correcto y fallido | Alta | Usuario o correo intentado, IP, método (clásico o Google) |
| Registro de usuario | Alta | Usuario creado, IP |
| Cambio de contraseña o correo | Alta | Usuario, qué campo cambió (**nunca el valor**) |
| Crear / editar / borrar publicación | Media | Usuario, id del post |
| Subir imagen o aplicar filtro | Media | Usuario, id del post, filtro |
| Seguir / dejar de seguir | Baja | Usuario origen y destino |
| Acceso denegado (token inválido o vencido) | Alta | IP, ruta (queda en el log de acceso de nginx) |

**Nunca** guardar contraseñas, tokens JWT ni el contenido de los archivos en el registro.

## 4. Tabla `audit_log` (implementada)

La tabla se define en `database/schema.sql` y como modelo Sequelize en
`modelo/auditLog.js` (se crea sola con `sequelize.sync()` al arrancar):

```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGSERIAL PRIMARY KEY,
    ocurrio_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id       INTEGER,                 -- NULL si no hay sesión (login fallido)
    accion        VARCHAR(60) NOT NULL,    -- p. ej. 'LOGIN_OK', 'POST_BORRADO'
    metodo        VARCHAR(10) NOT NULL,    -- GET, POST, PUT, DELETE
    ruta          VARCHAR(255) NOT NULL,
    status_code   INTEGER NOT NULL,
    ip            VARCHAR(45),
    detalle       JSONB DEFAULT '{}'
);
```

`user_id` no es una clave foránea a propósito: el registro debe sobrevivir aunque el
usuario se borre.

### Cómo funciona

`middlewares/auditoria.js` exporta `auditar(accion)`, que se coloca en cada ruta
(`rutas/rutas.js`). El registro se escribe cuando la respuesta termina (`finish`), así un
fallo de auditoría **nunca rompe la petición** del usuario. En `detalle` se guardan los
parámetros de la ruta y, en login/registro, el **correo intentado**. Las contraseñas, los
tokens y los textos largos se descartan antes de guardar.

Acciones que se registran:

| Acción | Cuándo |
|---|---|
| `REGISTRO_USUARIO` / `REGISTRO_FALLIDO` | Alta de cuenta correcta / rechazada |
| `LOGIN_OK` / `LOGIN_FALLIDO` | Inicio de sesión con correo y contraseña |
| `LOGIN_GOOGLE_OK` / `LOGIN_GOOGLE_FALLIDO` | Inicio de sesión con Google |
| `PERFIL_ACTUALIZADO`, `FOTO_PERFIL_CAMBIADA` | Cambios en la cuenta |
| `POST_CREADO`, `POST_EDITADO`, `POST_BORRADO` | Publicaciones |
| `IMAGEN_SUBIDA`, `IMAGEN_FILTRO` | Subida de foto y filtros manuales |
| `POST_LIKE`, `FOLLOW_SEGUIR`, `FOLLOW_DEJAR` | Interacciones sociales |

Detrás de nginx, `index.js` activa `app.set("trust proxy", 1)`; sin eso `req.ip`
mostraría siempre `127.0.0.1`. nginx ya envía `X-Forwarded-For`.

## 5. Protección del registro de auditoría

- El usuario de la aplicación solo debe poder **insertar y leer**, nunca modificar o borrar:
  ```sql
  REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM app_user;
  ```
- Retención: 12 meses en la base; luego exportar a S3 y borrar de la base.
- Revisar semanalmente los inicios de sesión fallidos y los accesos denegados.

## 6. Consultas de ejemplo

```sql
-- Últimas acciones de un usuario
SELECT ocurrio_en, accion, ruta, status_code FROM audit_log
WHERE user_id = 5 ORDER BY ocurrio_en DESC LIMIT 50;

-- IPs con más inicios de sesión fallidos en las últimas 24 h
SELECT ip, COUNT(*) AS intentos FROM audit_log
WHERE accion = 'LOGIN_FALLIDO' AND ocurrio_en > NOW() - INTERVAL '24 hours'
GROUP BY ip ORDER BY intentos DESC;

-- Publicaciones borradas esta semana
SELECT ocurrio_en, user_id, detalle FROM audit_log
WHERE accion = 'POST_BORRADO' AND ocurrio_en > NOW() - INTERVAL '7 days';
```

## 7. Alternativa: auditoría dentro de PostgreSQL

La extensión **pgaudit** registra las sentencias SQL a nivel de motor, sin tocar el código de
la app. Es más completa, pero está disponible en Amazon RDS y requiere instalación extra en
una instancia propia; para este proyecto se recomienda la tabla `audit_log`.
