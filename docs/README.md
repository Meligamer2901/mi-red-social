# Índice de documentación

Proyecto Final de Desarrollo Web (UMG) — **Mi Red Social**.
Catedrático: MSc. Ing. Carlos Alejandro Arias.

Este índice relaciona cada entregable y manual que pide la asignación con el archivo que
lo cubre.

## Entregables del enunciado

| # | Entregable | Dónde está |
|---|---|---|
| 1 | Documentación del desarrollador (arquitectura y esquema de BD) | [`ARQUITECTURA.md`](ARQUITECTURA.md), [`ESQUEMA_BD.md`](ESQUEMA_BD.md) |
| 2 | Instrucciones de despliegue | [`DESPLIEGUE.md`](DESPLIEGUE.md) |
| 3 | Documentación del usuario | [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) |
| 4 | Credenciales de AWS (IAM limitado con iniciar/detener EC2) | [`ENTREGA_CATEDRATICO.md`](ENTREGA_CATEDRATICO.md) (las claves se entregan por canal privado) |
| 5 | Par de claves SSH | Se entrega por canal privado (ver `ENTREGA_CATEDRATICO.md`) |
| 6 | Otros documentos para entender el código | [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md) |

## Manuales sugeridos por el enunciado

| # | Manual | Archivo |
|---|---|---|
| 1 | Arquitectura de la solución | [`ARQUITECTURA.md`](ARQUITECTURA.md) |
| 2 | Diagrama distribuido de componentes | [`DIAGRAMA_COMPONENTES.md`](DIAGRAMA_COMPONENTES.md) |
| 3 | Sistema de auditoría de transacciones | [`AUDITORIA_TRANSACCIONES.md`](AUDITORIA_TRANSACCIONES.md) |
| 4 | Segmentación de red | [`SEGMENTACION_RED.md`](SEGMENTACION_RED.md) |
| 5 | Aplicación web | [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md) (frontend, endpoints) y [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) |
| 6 | Manual de seguridad de la base de datos | [`SEGURIDAD_BD.md`](SEGURIDAD_BD.md) |
| 7 | Plan de recuperación contra desastres | [`PLAN_RECUPERACION_DESASTRES.md`](PLAN_RECUPERACION_DESASTRES.md) |
| 8 | Disaster Recovery Plan | [`PLAN_RECUPERACION_DESASTRES.md`](PLAN_RECUPERACION_DESASTRES.md) (mismo documento; el título incluye el nombre en inglés) |
| 9 | Diagramas de Cloud Computing | [`DIAGRAMAS_CLOUD.md`](DIAGRAMAS_CLOUD.md) |
| 10 | Manuales técnicos | [`MANUAL_TECNICO.md`](MANUAL_TECNICO.md) |
| 11 | Plan de mantenimiento de la base de datos | [`MANTENIMIENTO_BD.md`](MANTENIMIENTO_BD.md) |
| 12 | Plan de capacitaciones para IT | [`PLAN_CAPACITACION_IT.md`](PLAN_CAPACITACION_IT.md) |

## Datos clave de la entrega

| Dato | Valor |
|---|---|
| Sitio | https://miredsocialweb.duckdns.org |
| Región | us-east-2 (Ohio) |
| Instancia | `i-080caf245240b78e3` (t3.micro), IP elástica `77.113.123.181` |
| Repositorio | GitHub del equipo (ramas por integrante) |
| Estado al entregar | Instancia detenida (Stopped) |

Las desviaciones respecto al enunciado (región, tipo de instancia, DNS) están explicadas en
[`DESPLIEGUE.md`](DESPLIEGUE.md).
