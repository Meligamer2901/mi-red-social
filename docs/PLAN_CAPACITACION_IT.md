# Plan de capacitaciones para el equipo de IT

Objetivo: que cualquier persona de IT pueda operar, mantener y recuperar **Mi Red Social** sin
depender de quienes la desarrollaron.

## 1. Perfiles y a quién va dirigido

| Perfil | Qué necesita saber |
|---|---|
| Administrador de infraestructura | AWS (EC2, S3, IAM, Security Groups), nginx, certificados, costos. |
| Administrador de base de datos | PostgreSQL, respaldos y restauración, seguridad de datos. |
| Desarrollador de mantenimiento | Código, API, despliegue de cambios, registros. |
| Soporte / mesa de ayuda | Uso de la aplicación, problemas comunes, cuándo escalar. |

## 2. Módulos de capacitación

| # | Módulo | Contenido | Perfil | Duración | Documento de apoyo |
|---|---|---|---|---|---|
| 1 | Visión general | Qué hace la aplicación, componentes y flujo de una foto. | Todos | 1 h | [`ARQUITECTURA.md`](ARQUITECTURA.md), [`DIAGRAMA_COMPONENTES.md`](DIAGRAMA_COMPONENTES.md) |
| 2 | Uso de la aplicación | Registro, login con Google, publicar, filtros, seguir. | Soporte | 1 h | [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) |
| 3 | AWS básico del proyecto | Consola, región Ohio, EC2, Elastic IP, S3, roles IAM. | Infraestructura | 2 h | [`DIAGRAMAS_CLOUD.md`](DIAGRAMAS_CLOUD.md) |
| 4 | Encender, apagar y desplegar | Start/stop de la instancia, `deploy/ec2-bootstrap.sh`, PM2, nginx. | Infraestructura, desarrollo | 2 h | [`DESPLIEGUE.md`](DESPLIEGUE.md), [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md) |
| 5 | Red y seguridad | Security Group, puertos, HTTPS, secretos, roles de mínimo privilegio. | Infraestructura | 1,5 h | [`SEGMENTACION_RED.md`](SEGMENTACION_RED.md), [`SEGURIDAD_BD.md`](SEGURIDAD_BD.md) |
| 6 | Base de datos | Esquema, respaldos, restauración, mantenimiento. | Base de datos | 2 h | [`ESQUEMA_BD.md`](ESQUEMA_BD.md), [`MANTENIMIENTO_BD.md`](MANTENIMIENTO_BD.md) |
| 7 | Recuperación ante desastres | Escenarios y procedimientos, simulacro. | Infraestructura, base de datos | 2 h | [`PLAN_RECUPERACION_DESASTRES.md`](PLAN_RECUPERACION_DESASTRES.md) |
| 8 | Auditoría y monitoreo | Registros de PM2/nginx, qué se audita, consultas de ejemplo. | Desarrollo, infraestructura | 1,5 h | [`AUDITORIA_TRANSACCIONES.md`](AUDITORIA_TRANSACCIONES.md) |
| 9 | Desarrollo y cambios | Estructura del código, API, ramas de Git, compilar el frontend. | Desarrollo | 3 h | [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md) |

## 3. Calendario sugerido

| Semana | Módulos | Modalidad |
|---|---|---|
| 1 | 1, 2 | Presentación y práctica con la aplicación |
| 2 | 3, 4 | Laboratorio guiado en la consola de AWS |
| 3 | 5, 6 | Taller de seguridad y respaldos |
| 4 | 7, 8 | Simulacro de recuperación |
| 5 | 9 | Taller de desarrollo; evaluación final |

## 4. Prácticas de laboratorio

1. Iniciar y detener la instancia con la CLI y con la consola.
2. Reiniciar la aplicación con PM2 y revisar sus registros.
3. Subir una foto y localizar las 4 versiones en S3 y sus filas en la base de datos.
4. Hacer un respaldo con `deploy/backup-db.sh` y restaurarlo en una base de prueba.
5. Simular la caída de la aplicación y recuperarla siguiendo el plan de recuperación.
6. Renovar el certificado HTTPS (`sudo certbot renew --dry-run`).
7. Rotar un secreto (`JWT_SECRET`) y comprobar sus efectos.

## 5. Evaluación

| Evidencia | Criterio de aprobación |
|---|---|
| Prueba práctica de despliegue | Levanta la aplicación en una instancia nueva con el script, sin ayuda. |
| Simulacro de recuperación | Restaura la base y vuelve a servir la aplicación dentro del RTO del plan. |
| Cuestionario de seguridad | Identifica correctamente qué va en el `.env`, en el repositorio y en IAM. |

## 6. Mantenimiento de la capacitación

- Revisar este plan cada trimestre o cuando cambie la arquitectura.
- Incorporar a toda persona nueva de IT durante su primera semana (módulos 1, 3 y 4 como mínimo).
- Registrar las lecciones aprendidas de cada simulacro y actualizar los documentos.
