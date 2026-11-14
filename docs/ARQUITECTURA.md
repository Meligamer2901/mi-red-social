# Documentación del desarrollador — Arquitectura

Proyecto Final de Desarrollo Web (UMG) — Red social de fotografías tipo Instagram.

## 1. Visión general

La aplicación es un backend **Node.js / Express** con un frontend en **ReactJS**
(Vite + React Router, carpeta `frontend/`), una base de datos
**relacional PostgreSQL** y almacenamiento de imágenes desacoplado (**disco local en
desarrollo / Amazon S3 en producción**) a través de una capa de abstracción propia.

```mermaid
flowchart LR
    subgraph Cliente["Navegador"]
        FE["Frontend React\n(Vite, build estatico)"]
    end

    subgraph EC2["Instancia AWS EC2 (t3.micro)"]
        NGINX["nginx\n(reverse proxy :80/:443)"]
        API["Node.js / Express\n(PM2)"]
        PG[("PostgreSQL\nusuarios, posts, followers,\nimage_variants, face_detections")]
    end

    S3[("Amazon S3\nimagenes originales +\ntransformaciones")]
    GOOGLE["Google OAuth\n+ reCAPTCHA"]
    R53["DuckDNS\n(DNS gratuito)"]
    FACEAPI["face-api.js\n(reconocimiento facial\nen el propio proceso Node)"]

    R53 --> NGINX
    FE -- HTTPS/API REST --> NGINX
    NGINX --> API
    API --> PG
    API -- STORAGE_DRIVER=s3 --> S3
    API <--> FACEAPI
    FE -. login/recaptcha .-> GOOGLE
    API -. verifica token/captcha .-> GOOGLE
```

## 2. Capas del backend

```
index.js                 -> arranque de Express, conexion a BD, servido estatico
rutas/rutas.js            -> define todos los endpoints REST
Controlador/*.js           -> logica de negocio por recurso (user, publicacion, follow, imagen)
modelo/*.js                -> modelos Sequelize (PostgreSQL) + asociaciones (modelo/index.js)
servicios/
  jwt.js                   -> firma/verifica tokens de sesion
  storage.js                -> abstraccion de almacenamiento (local disco <-> S3)
  imageProcessor.js          -> pipeline de transformaciones automaticas + reconocimiento facial
middlewares/
  auth.js                    -> valida el JWT en rutas protegidas
  auditoria.js               -> registra cada transaccion en la tabla audit_log
  limites.js                 -> limite de intentos de login/registro (rate limiting)
database/
  conexion.js               -> conexion Sequelize + sync de modelos
  schema.sql                 -> esquema SQL de referencia (documentacion/manual)
```

## 3. Flujo de subida de una fotografía (lo más importante del proyecto)

```mermaid
sequenceDiagram
    participant U as Usuario (navegador)
    participant API as Express (Controlador/publicacion.js)
    participant IMG as imageProcessor.js
    participant ST as storage.js (local|S3)
    participant DB as PostgreSQL
    participant FACE as face-api.js

    U->>API: POST /api/subir-imagen/:id (multipart, buffer en memoria)
    API->>IMG: procesarImagenSubida(buffer, ...)
    IMG->>ST: guardar(original)
    IMG->>IMG: Sharp: generar miniatura (resize)
    IMG->>IMG: Sharp: generar blanco y negro (grayscale)
    IMG->>IMG: Sharp: generar sepia (tint)
    IMG->>ST: guardar(miniatura, grayscale, sepia)
    IMG->>DB: INSERT image_variants (4 filas: original + 3 transformaciones)
    IMG->>FACE: detectAllFaces(original)
    FACE-->>IMG: rostros, edad, genero
    IMG->>DB: INSERT face_detections (metadatos, nunca la imagen)
    IMG-->>API: { originalKey, urls, faceResult }
    API->>DB: UPDATE posts.img_url = original
    API-->>U: JSON con imageUrl / thumbnailUrl / grayscaleUrl / sepiaUrl
```

Puntos clave que exige el enunciado y cómo se cumplen:

- **3 transformaciones automáticas al subir la imagen**: miniatura (reducción de
  escala), blanco y negro y sepia — generadas con **Sharp** sin intervención del
  usuario, en `servicios/imageProcessor.js`.
- **Reconocimiento facial al subir**: `face-api.js` corre automáticamente sobre la
  foto original (edad, género, cantidad de rostros) en el mismo flujo.
- **Las imágenes nunca se guardan en la base de datos**: solo se guarda la
  referencia (`storage_key`, tabla `image_variants`) y PostgreSQL resuelve la URL
  pública bajo demanda (`servicios/storage.js#urlPublica`).
- **Algoritmo de miniaturas**: todo el feed/listado usa `thumbnailUrl` (imagen
  reducida), mientras que la vista de detalle usa `imageUrl` (resolución completa)
  junto a las 3 transformaciones.
- Además de las 3 transformaciones obligatorias, se conserva (como función extra)
  un editor manual con **9 filtros adicionales** (invertir, desenfoque, brillo,
  contraste, cálido, frío, psicodélico...) que el usuario aplica bajo demanda sobre
  su propia foto/avatar (`Controlador/imagen.js`), y un botón de "Analizar rostro"
  para repetir el análisis facial manualmente.

## 4. Almacenamiento de imágenes (local vs S3)

`servicios/storage.js` expone una interfaz única (`guardar`, `leer`, `eliminar`,
`urlPublica`) que internamente decide, según la variable de entorno
`STORAGE_DRIVER`:

| STORAGE_DRIVER | Dónde vive el archivo | Para qué se usa |
|---|---|---|
| `local` (por defecto) | `./imagenes/<usuarios\|post>/...` en disco | Desarrollo sin cuenta de AWS |
| `s3` | Bucket de Amazon S3 (`AWS_S3_BUCKET`) | Despliegue en producción (requisito del proyecto) |

Ningún controlador llama a `fs` o al SDK de AWS directamente: todos pasan por esta
capa, así que cambiar de un entorno a otro es solo cuestión de variables de entorno
(`.env`), sin tocar código.

## 5. Decisiones de diseño y alcance

- **Base de datos relacional (PostgreSQL + Sequelize)**: el proyecto original usaba
  MongoDB; se migró completamente a PostgreSQL para cumplir el requisito explícito
  de "base de datos relacional" para cuentas de usuario y ubicación de imágenes
  (ver `docs/ESQUEMA_BD.md`).
- **Frontend en ReactJS**: el enunciado pide integrar Google Login y reCAPTCHA con
  ReactJS. El frontend (`frontend/`) está hecho con React 18, Vite y React Router;
  Google Login y reCAPTCHA v2 son componentes React (`GoogleButton.jsx`,
  `Recaptcha.jsx`). Para producción se compila con `npm run build` y nginx sirve la
  carpeta `frontend/dist` como sitio estático. La versión anterior del frontend
  (HTML + JavaScript) se eliminó del proyecto.
- **Amazon Rekognition**: no implementado (es el punto "opcional avanzado" del
  enunciado). El reconocimiento facial se resuelve con `face-api.js`, que sí es un
  requisito obligatorio.
- **Seguridad de la API**: `helmet` (cabeceras HTTP), límite de intentos en login y
  registro (`express-rate-limit`), validación de entradas con `validator`, CORS limitado al
  dominio en producción y arranque obligatorio con `JWT_SECRET`. Cada transacción queda
  en la tabla `audit_log` (ver `docs/AUDITORIA_TRANSACCIONES.md`).
- **Autenticación**: JWT propio (`servicios/jwt.js`) + bcrypt con sal única por
  usuario (`bcrypt.hash(password, 10)` genera y embebe una sal distinta en cada
  llamada) + Google OAuth2 + reCAPTCHA v2 (en login y registro).
