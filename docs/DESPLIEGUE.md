# Instrucciones de despliegue (AWS)

Esta guía asume una cuenta de **AWS Educate / AWS gratuita** y que la instancia se
crea en **N. Virginia (us-east-1)**, como exige el enunciado (la AMI de referencia
solo está disponible en esa región).

> Estado actual del proyecto: el código ya está listo para producción
> (`STORAGE_DRIVER=s3`, PostgreSQL, PM2, nginx), pero **estos pasos de AWS
> (crear la cuenta, la instancia, el bucket, Route 53 y las credenciales) los debe
> ejecutar el equipo con su propia cuenta**, ya que requieren acceso real a AWS.

## 0. Requisitos previos

- Cuenta de AWS (AWS Educate o personal) con créditos disponibles.
- Cliente SSH (Windows: PowerShell con OpenSSH, o PuTTY).
- El código de este proyecto subido a un repositorio de GitHub del equipo (para
  poder clonarlo en la instancia y que cada integrante pueda trabajar en su rama).

## 1. Crear el par de claves SSH

1. Consola AWS → **EC2 → Network & Security → Key Pairs → Create key pair**.
2. Tipo `RSA`, formato `.pem` (Linux/Mac/WSL) o `.ppk` (PuTTY).
3. Descarga el archivo y **guárdalo bien** (no se puede volver a descargar).
   En Linux/Mac: `chmod 400 tu-llave.pem`.
4. Este archivo es el "par de claves para SSH" que pide el enunciado como
   entregable — inclúyelo en la entrega (por un canal seguro, NO en el
   repositorio de GitHub).

## 2. Lanzar la instancia EC2

1. Región: **N. Virginia (us-east-1)** (arriba a la derecha de la consola).
2. **EC2 → Launch instance**.
3. AMI: **Ubuntu Server 22.04 LTS** (o la AMI indicada por la cátedra, si es una
   AMI específica, debe seleccionarse aquí — recuerda que solo está disponible en
   esta región).
4. Tipo de instancia: **t2.small**.
5. Par de claves: selecciona el que creaste en el paso 1.
6. Configuración de red → Security Group: crea uno nuevo con estas reglas de
   entrada:
   | Tipo | Puerto | Origen |
   |---|---|---|
   | SSH | 22 | Tu IP (`Mi IP`) |
   | HTTP | 80 | 0.0.0.0/0 |
   | HTTPS | 443 | 0.0.0.0/0 |
7. Almacenamiento: 20-30 GB (gp3) es suficiente.
8. **Launch instance**.
9. (Recomendado) Asigna una **Elastic IP** a la instancia para que la IP pública
   no cambie si la reinicias — necesario para Route 53.

## 3. Conectarse por SSH y subir el código

```bash
ssh -i tu-llave.pem ubuntu@<IP-publica-de-la-instancia>
```

Dentro de la instancia:

```bash
git clone https://github.com/<tu-usuario>/<tu-repo>.git mi_red_social
cd mi_red_social
```

(O usa `scp -i tu-llave.pem -r mi_red_social ubuntu@<IP>:~/` desde tu máquina si
prefieres no usar git en la instancia.)

## 4. Ejecutar el script de bootstrap

```bash
chmod +x deploy/ec2-bootstrap.sh
./deploy/ec2-bootstrap.sh
```

La primera ejecución instala Node.js, PostgreSQL, nginx, PM2 y las librerías
nativas que necesitan `sharp`/`canvas`, y crea `.env` a partir de
`.env.example`. El script se detiene ahí para que edites `.env`:

```bash
nano .env
```

Completa como mínimo:

- `DB_PASSWORD` (elige una clave fuerte; el script crea el usuario/BD con ese valor)
- `JWT_SECRET` (genera uno con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `GOOGLE_CLIENT_ID` (tu credencial de Google Cloud Console)
- `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` (tu sitio registrado en reCAPTCHA Admin)
- `BASE_URL` (por ahora `http://<IP-publica>`, luego el dominio de Route 53)

Vuelve a ejecutar el script para que continúe (crea la base de datos, corre las
tablas, levanta la app con PM2 y configura nginx):

```bash
./deploy/ec2-bootstrap.sh
```

Verifica que responda: abre `http://<IP-publica>/` en el navegador.

## 5. Crear el bucket S3 (almacenamiento de imágenes en la nube)

1. Consola AWS → **S3 → Create bucket**.
2. Nombre único global, ej. `mi-red-social-imagenes-<tunombre>`.
3. Región: us-east-1 (misma que la instancia, para menor latencia).
4. Desmarca "Block all public access" (las fotos de un feed público deben
   poder verse) y confirma.
5. Aplica la política de bucket de [`deploy/s3-bucket-policy.json`](../deploy/s3-bucket-policy.json)
   (reemplaza `<NOMBRE_DEL_BUCKET>`) en **Permissions → Bucket Policy**.
6. **IAM → Users → Create user** (ej. `mi-red-social-app`), acceso
   "Access key - Programmatic access", y adjunta una política en línea con el
   contenido de [`deploy/iam-app-s3-policy.json`](../deploy/iam-app-s3-policy.json)
   (reemplaza `<NOMBRE_DEL_BUCKET>`). Genera el **Access Key ID** y **Secret
   Access Key**.
7. En la instancia, edita `.env`:
   ```
   STORAGE_DRIVER=s3
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=mi-red-social-imagenes-<tunombre>
   AWS_ACCESS_KEY_ID=<access-key-id>
   AWS_SECRET_ACCESS_KEY=<secret-access-key>
   ```
8. Reinicia la app: `pm2 restart mi-red-social`.
9. Sube una foto de prueba desde la app y confirma en la consola de S3 que
   aparecen los 4 archivos (original + miniatura + blanco y negro + sepia).

## 6. Configurar Route 53 (DNS)

1. Si no tienes un dominio, puedes registrar uno barato en Route 53
   (**Registered domains**) o usar un subdominio de uno que ya tengas.
2. **Route 53 → Hosted zones → Create hosted zone** (si usas un dominio externo,
   apunta los *nameservers* del registrador a los que te da Route 53).
3. Crea un registro **A** apuntando al IP pública/elástica de la instancia EC2
   (o un **Alias** si usas un Load Balancer, no necesario para este proyecto).
4. Actualiza `BASE_URL` en `.env` con el dominio real y `pm2 restart mi-red-social`.
5. (Opcional pero recomendado) Configura HTTPS con Certbot una vez el dominio
   resuelva:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d tu-dominio.com
   ```

## 7. Credenciales de AWS para el catedrático (IAM limitado)

1. **IAM → Users → Create user** (ej. `catedratico-revision`).
2. Acceso: habilita **acceso a la consola de AWS** (contraseña) *y/o*
   **Access key** según cómo vaya a verificar.
3. Adjunta una política en línea con el contenido de
   [`deploy/iam-ec2-start-stop-policy.json`](../deploy/iam-ec2-start-stop-policy.json),
   reemplazando `<ID_DE_CUENTA>` y `<ID_DE_INSTANCIA>` (el ID de tu instancia EC2,
   visible en la consola, ej. `i-0123456789abcdef0`).
4. **Prueba las credenciales tú mismo** antes de entregarlas: inicia sesión (o
   usa `aws ec2 start-instances`/`stop-instances` con el access key) y confirma
   que puede iniciar/detener la instancia pero no hacer nada más (crear
   instancias nuevas, borrar el bucket, etc. debe fallar con "Access Denied").
5. Entrega: usuario/contraseña de consola (o access key/secret), el ID de la
   instancia y la región (us-east-1), por un canal seguro.

## 8. Antes de la entrega: suspender la instancia

Para no acumular cargos mientras el catedrático revisa el repositorio y la
documentación:

```bash
# Desde tu maquina, con AWS CLI configurado:
aws ec2 stop-instances --instance-ids i-0123456789abcdef0 --region us-east-1
```

O desde la consola: **EC2 → Instances → selecciona la instancia → Instance
state → Stop instance**. El catedrático la reactivará con las credenciales del
paso 7 (**Instance state → Start instance**) y, al terminar, puede detenerla de
nuevo con el mismo botón.

> Nota: al detener (Stop, no Terminate) la instancia se conserva el disco (EBS)
> con todo el código y la base de datos, pero la IP pública puede cambiar si no
> usaste una Elastic IP — por eso se recomendó asignarla en el paso 2.

## 9. Verificación rápida post-despliegue (checklist)

- [ ] `http://<dominio-o-IP>/` responde "API de red social funcionando"
- [ ] El frontend (`http://<dominio-o-IP>/index.html` o servido por separado,
      ver nota abajo) carga el login con Google y reCAPTCHA visibles
- [ ] Registrar un usuario nuevo funciona (con reCAPTCHA)
- [ ] Subir una foto genera 3 transformaciones visibles (miniatura/B&N/sepia)
- [ ] El análisis facial automático aparece asociado a la foto (ver logs:
      `pm2 logs mi-red-social`)
- [ ] Las imágenes se ven cargadas desde S3 (si `STORAGE_DRIVER=s3`)
- [ ] La instancia está **detenida (Stopped)** al momento de la entrega final

> **Nota sobre el frontend estático**: en este proyecto el frontend (`*.html`,
> `app.js`, `css/`) se sirve desde la misma carpeta del backend. La forma más
> simple en la instancia es servir esos archivos estáticos también con nginx
> (agregar un `location /` separado) o con `express.static(__dirname)` en
> `index.js`. Para la entrega académica basta con abrir los archivos HTML a
> través de nginx apuntando al directorio del proyecto; ajusta
> `deploy/nginx.conf` si prefieres servir el frontend en un dominio/puerto
> distinto al de la API.

## 10. Solución de problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `pm2 logs` muestra error de conexión a BD | `.env` con credenciales incorrectas o PostgreSQL no inició | `sudo systemctl status postgresql`, revisar `DB_*` en `.env` |
| Subida de imagen falla con 500 | Faltan librerías nativas de `canvas` | Reinstalar: `sudo apt install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && npm rebuild` |
| nginx devuelve 502 | La app de Node no está corriendo | `pm2 status`, `pm2 restart mi-red-social`, revisar `pm2 logs` |
| Las fotos no se ven con `STORAGE_DRIVER=s3` | Bucket sin política pública o credenciales IAM incorrectas | Revisar `deploy/s3-bucket-policy.json` aplicado y las variables `AWS_*` en `.env` |
| El dominio no resuelve | Registro A de Route 53 aún propagando o mal apuntado | Esperar unos minutos y verificar con `dig tu-dominio.com` |
