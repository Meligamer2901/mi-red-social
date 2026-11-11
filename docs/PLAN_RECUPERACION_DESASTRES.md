# Plan de recuperación contra desastres (Disaster Recovery Plan)

Proyecto Final de Desarrollo Web (UMG) — Red social de fotografías.

Este documento cubre tanto el *plan de recuperación contra desastres* como el
*Disaster Recovery Plan* que menciona el enunciado: es el mismo plan.

> **Estado:** el plan está documentado y el script de respaldo existe
> (`deploy/backup-db.sh`), pero los respaldos automáticos **no vienen activados**
> con el script de despliegue: hay que programarlos en la instancia (sección 4).

## 1. Objetivo y alcance

Restablecer el servicio (sitio, base de datos e imágenes) después de una falla, con la
menor pérdida de datos y el menor tiempo posible. Cubre la instancia EC2, PostgreSQL,
el bucket S3, el DNS en Route 53 y el código en GitHub.

## 2. Inventario de activos y criticidad

| Activo | Dónde vive | Criticidad | Cómo se protege |
|---|---|---|---|
| Código fuente | GitHub (ramas por integrante) | Alta | Repositorio remoto |
| Base de datos (usuarios, posts, seguidores) | PostgreSQL en la EC2 | **Crítica** | `pg_dump` diario a S3 + snapshot EBS |
| Imágenes (originales y transformaciones) | Bucket S3 | **Crítica** | Versionado de S3 |
| Servidor (Node, nginx, PM2) | Instancia EC2 | Alta | AMI + script `deploy/ec2-bootstrap.sh` |
| Secretos (`.env`) | Solo en la instancia | **Crítica** | Copia cifrada fuera del repositorio |
| DNS | Route 53 | Media | Registros documentados |

## 3. Objetivos de recuperación

| Componente | RPO (pérdida de datos aceptable) | RTO (tiempo para volver) |
|---|---|---|
| Código | 0 (está en GitHub) | 30 minutos |
| Base de datos | 24 horas (respaldo diario) | 2 horas |
| Imágenes | Casi 0 (S3 con versionado) | 1 hora |
| Servidor completo | — | 2 a 3 horas (desde AMI o desde cero con el script) |

## 4. Estrategia de respaldo

**4.1 Base de datos: `pg_dump` diario a S3.** Usa `deploy/backup-db.sh`. Pasos de una sola vez:

1. Crear un bucket S3 **privado** solo para respaldos, con una regla de ciclo de vida
   que borre los archivos a los 30 días.
2. Instalar el CLI: `sudo snap install aws-cli --classic`.
3. Dar a la instancia permiso `s3:PutObject` sobre ese bucket (rol IAM).
4. Programar con `crontab -e`:
   ```
   0 2 * * * BUCKET_RESPALDOS=<bucket> /home/ubuntu/mi_red_social/deploy/backup-db.sh >> /home/ubuntu/backup.log 2>&1
   ```
5. Comprobar al día siguiente que aparece el archivo en `s3://<bucket>/postgres/`.

**4.2 Servidor: snapshot y AMI.** Antes de la entrega y antes de cambios grandes, crear una
AMI de la instancia (EC2, Actions, Image and templates, Create image). Opcionalmente
programar snapshots semanales del volumen con *Amazon Data Lifecycle Manager*.

**4.3 Imágenes: versionado de S3.** Activar *Bucket Versioning* en el bucket de imágenes
(S3, Properties, Bucket Versioning). Así un archivo borrado o sobrescrito se puede
recuperar.

**4.4 Código.** Todo cambio va a GitHub; cada integrante trabaja en su rama.

**4.5 Secretos.** Guardar una copia del `.env` en un gestor de contraseñas del equipo o en
AWS Systems Manager Parameter Store. **Nunca** en el repositorio.

## 5. Escenarios y procedimientos

### 5.1 La aplicación se cae
```bash
pm2 status
pm2 logs mi-red-social --lines 100
pm2 restart mi-red-social
```
PM2 reinicia el proceso solo si falla y, con `pm2 startup`, también al reiniciar la instancia.

### 5.2 Falla la instancia o el disco
1. En EC2, lanzar una instancia nueva **desde la última AMI** (o Ubuntu 22.04 limpio).
2. Si es limpio: clonar el repositorio y ejecutar `deploy/ec2-bootstrap.sh`, restaurar el `.env`
   y luego la base de datos (sección 5.3).
3. Asociar la **Elastic IP** a la instancia nueva. Si no se usó Elastic IP, actualizar el
   registro A en Route 53 con la IP nueva.
4. Verificar con la lista de la sección 7.

### 5.3 Base de datos dañada o borrada
```bash
# 1. Traer el respaldo más reciente
aws s3 ls s3://<bucket>/postgres/
aws s3 cp s3://<bucket>/postgres/<archivo>.dump /tmp/

# 2. Detener la app para que nadie escriba durante la restauración
pm2 stop mi-red-social

# 3. Recrear la base (solo si estaba dañada) y restaurar
sudo -u postgres dropdb --if-exists mi_red_social
sudo -u postgres createdb -O <DB_USER> mi_red_social
PGPASSWORD=<DB_PASSWORD> pg_restore -h localhost -U <DB_USER> -d mi_red_social --no-owner /tmp/<archivo>.dump

# 4. Levantar la app
pm2 start mi-red-social
```
Se pierden como máximo las últimas 24 horas de actividad (RPO).

### 5.4 Se borraron imágenes del bucket
Con el versionado activo: S3, activar *Show versions*, abrir el archivo y restaurar la versión
anterior (o borrar el marcador de eliminación). Las filas de `image_variants` no cambian,
porque solo guardan la ruta.

### 5.5 Se filtran credenciales
| Credencial | Acción |
|---|---|
| Llaves IAM de S3 | Desactivarlas en IAM, crear nuevas, actualizar `AWS_*` en `.env`, `pm2 restart` |
| `JWT_SECRET` | Generar una nueva y reiniciar; esto cierra todas las sesiones abiertas |
| `DB_PASSWORD` | `ALTER USER <DB_USER> PASSWORD '...'`, actualizar `.env`, reiniciar |
| `RECAPTCHA_SECRET_KEY` | Regenerar en el panel de reCAPTCHA y actualizar `.env` |
| Usuario IAM del catedrático | Desactivarlo y crear otro |

### 5.6 La región us-east-1 no está disponible
Es poco probable, pero el plan es reconstruir en otra región: crear el bucket de imágenes
nuevo (o activar replicación entre regiones por adelantado), lanzar una instancia con el
script de despliegue y restaurar el último `pg_dump`. El RTO sube a medio día.

## 6. Roles durante un incidente

| Rol | Responsabilidad |
|---|---|
| Responsable de infraestructura | Ejecuta la recuperación (AWS, instancia, DNS) |
| Responsable de base de datos | Restaura y valida los datos |
| Responsable de la aplicación | Verifica que el sitio funcione y revisa los logs |
| Coordinador | Comunica el estado al equipo y al catedrático y registra lo ocurrido |

Cada rol debe tener un titular y un suplente del equipo.

## 7. Verificación después de recuperar

- [ ] `http://<dominio>/` responde "API de red social funcionando"
- [ ] Se puede iniciar sesión con un usuario existente
- [ ] El feed muestra publicaciones y las fotos cargan
- [ ] Subir una foto de prueba genera sus 3 transformaciones
- [ ] `pm2 status` muestra `online` y `pm2 save` está hecho
- [ ] Se anotó el incidente (qué pasó, cuándo, cuánto duró, qué se hizo)

## 8. Pruebas del plan

Un plan que no se prueba no sirve. Cada trimestre, y antes de la entrega:

1. Restaurar el último respaldo en una base de prueba (`createdb mi_red_social_prueba`) y
   comprobar que las tablas y los conteos coinciden.
2. Lanzar una instancia desde la AMI y confirmar que arranca.
3. Anotar el tiempo que tomó y compararlo con el RTO.
