-- =============================================================
-- Esquema relacional de referencia - "Mi Red Social"
-- Motor: PostgreSQL 14+
--
-- Este archivo es documentacion / referencia manual del esquema.
-- En tiempo de ejecucion la app crea estas mismas tablas de forma
-- automatica via Sequelize (sequelize.sync(), ver database/conexion.js)
-- a partir de los modelos en modelo/*.js. Si prefieres gestionar la
-- base de datos tu mismo (recomendado en produccion), puedes ejecutar
-- este script directamente y desactivar el sync automatico.
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    surname         VARCHAR(255) DEFAULT 'null',
    bio             TEXT,
    nick            VARCHAR(255) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,      -- hash bcrypt (incluye salt unica por usuario)
    role            VARCHAR(50)  DEFAULT 'role_user',
    image           VARCHAR(255) DEFAULT 'default.png', -- nombre/clave del avatar ORIGINAL
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id              SERIAL PRIMARY KEY,
    usuario         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usuario_nick    VARCHAR(255) NOT NULL,
    contenido       TEXT NOT NULL,
    fecha           TIMESTAMPTZ DEFAULT NOW(),
    img_url         VARCHAR(255) DEFAULT 'Sin imagen', -- nombre/clave de la imagen ORIGINAL
    likes           INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_usuario ON posts(usuario);
CREATE INDEX IF NOT EXISTS idx_posts_fecha ON posts(fecha DESC);

CREATE TABLE IF NOT EXISTS followers (
    id              SERIAL PRIMARY KEY,
    follower_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fecha_follow    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_follow UNIQUE (follower_id, followed_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> followed_id)
);

-- Guarda SOLO la ubicacion (ruta local o key de S3) de cada variante de
-- imagen generada automaticamente (miniatura, blanco y negro, sepia) o
-- manualmente (filtros adicionales). La imagen en si NUNCA se guarda aqui.
CREATE TABLE IF NOT EXISTS image_variants (
    id                SERIAL PRIMARY KEY,
    owner_type        VARCHAR(10) NOT NULL CHECK (owner_type IN ('user', 'post')),
    owner_id          INTEGER NOT NULL, -- referencia logica a users.id o posts.id segun owner_type
    variant_type      VARCHAR(40) NOT NULL, -- original | thumbnail | grayscale | sepia | custom_*
    storage_provider  VARCHAR(10) NOT NULL CHECK (storage_provider IN ('local', 's3')),
    storage_key       VARCHAR(500) NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_image_variants_owner ON image_variants(owner_type, owner_id);

-- Resultado del analisis automatico de rostros (face-api.js) al subir una foto.
CREATE TABLE IF NOT EXISTS face_detections (
    id              SERIAL PRIMARY KEY,
    owner_type      VARCHAR(10) NOT NULL CHECK (owner_type IN ('user', 'post')),
    owner_id        INTEGER NOT NULL,
    faces_count     INTEGER DEFAULT 0,
    details         JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_face_detections_owner ON face_detections(owner_type, owner_id);
