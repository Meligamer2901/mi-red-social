# Diagrama distribuido de componentes

Muestra los componentes de la solución, dónde se ejecuta cada uno y cómo se comunican.

## 1. Vista de componentes

```mermaid
flowchart TB
    subgraph Cliente["Equipo del usuario"]
        BR["Navegador\nReact 18 (SPA)"]
    end

    subgraph Terceros["Servicios de terceros"]
        GOO["Google Identity Services\n(login con Google)"]
        RC["reCAPTCHA v2"]
        DDNS["DuckDNS\n(DNS del dominio)"]
        LE["Let's Encrypt\n(certificado HTTPS)"]
    end

    subgraph AWS["AWS us-east-2 (Ohio)"]
        subgraph EC2["EC2 t3.micro (Ubuntu 24.04)"]
            NG["nginx\n:80 → redirige a :443\n:443 → sirve frontend y proxy /api"]
            subgraph NODE["Node.js 20 + Express 5 (PM2, :4000)"]
                RUT["Rutas REST\n(rutas/rutas.js)"]
                CTL["Controladores\nuser · publicacion · follow · imagen"]
                AUTH["Middleware JWT\n+ bcrypt"]
                IMG["Pipeline de imágenes\nSharp"]
                FACE["Reconocimiento facial\nface-api.js + canvas"]
                STO["Capa de almacenamiento\nservicios/storage.js"]
            end
            PG[("PostgreSQL 16\nusuarios, posts (con likes),\nfollowers, image_variants,\nface_detections")]
        end
        S3[("Amazon S3\nimágenes y transformaciones")]
        IAMR["Rol IAM de la instancia\n(acceso mínimo al bucket)"]
    end

    BR -- "HTTPS" --> NG
    BR -. "token de Google" .-> GOO
    BR -. "captcha" .-> RC
    NG -- "archivos estáticos" --> BR
    NG -- "/api, /imagenes → 127.0.0.1:4000" --> RUT
    RUT --> AUTH --> CTL
    CTL --> IMG
    CTL --> FACE
    IMG --> STO
    CTL -- "Sequelize" --> PG
    STO -- "SDK S3 + credenciales temporales" --> S3
    IAMR -. "autoriza" .-> STO
    CTL -. "verifica token / captcha" .-> GOO
    CTL -. "verifica captcha" .-> RC
    DDNS -. "resuelve el dominio a la IP elástica" .-> NG
    LE -. "certificado (renovación automática)" .-> NG
```

## 2. Responsabilidad de cada componente

| Componente | Dónde corre | Responsabilidad |
|---|---|---|
| React (SPA) | Navegador | Interfaz, formularios, botón de Google, reCAPTCHA, galería y vista ampliada. |
| nginx | EC2 | Termina HTTPS, sirve `frontend/dist`, reenvía `/api` e `/imagenes` a Node. |
| Node.js / Express | EC2 (PM2) | API REST, autenticación, lógica de negocio. |
| Middleware JWT | Node | Valida el token en rutas protegidas. |
| Sharp | Node | Miniatura, blanco y negro, sepia y filtros manuales. |
| face-api.js + canvas | Node | Detección de rostros, edad y género. |
| storage.js | Node | Abstracción `local` / `s3`; el resto del código no conoce el destino. |
| PostgreSQL | EC2 | Cuentas, publicaciones, seguidores y el índice de imágenes (nunca el binario). |
| Amazon S3 | AWS | Archivos de imagen. |
| Rol IAM | AWS | Credenciales temporales de la instancia hacia S3, sin claves en el servidor. |
| DuckDNS / Let's Encrypt | Terceros | Nombre de dominio gratuito y certificado HTTPS. |

## 3. Qué es distribuido y qué no

- **Distribuido:** frontend (navegador), servidor de aplicación (EC2), almacenamiento (S3) y
  servicios externos (Google, reCAPTCHA, DNS).
- **Sin distribuir (decisión de costo):** nginx, Node y PostgreSQL comparten una instancia. En el
  plan de crecimiento de [`SEGMENTACION_RED.md`](SEGMENTACION_RED.md) se propone separarlos
  (base de datos en RDS en subred privada y balanceador de carga).
