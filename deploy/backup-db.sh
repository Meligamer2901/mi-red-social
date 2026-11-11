#!/usr/bin/env bash
# =============================================================
# Respaldo diario de la base de datos PostgreSQL hacia Amazon S3.
#
# Requisitos en la instancia EC2:
#   - AWS CLI:  sudo snap install aws-cli --classic
#   - Un bucket S3 PRIVADO solo para respaldos (distinto al de imagenes)
#   - Credenciales con permiso s3:PutObject sobre ese bucket (idealmente un
#     rol IAM asociado a la instancia)
#
# Uso:
#   chmod +x deploy/backup-db.sh
#   BUCKET_RESPALDOS=mi-red-social-respaldos ./deploy/backup-db.sh
#
# Programar todos los dias a las 02:00 (crontab -e):
#   0 2 * * * BUCKET_RESPALDOS=mi-red-social-respaldos /home/ubuntu/mi_red_social/deploy/backup-db.sh >> /home/ubuntu/backup.log 2>&1
#
# Restauracion: ver docs/PLAN_RECUPERACION_DESASTRES.md
# =============================================================
set -euo pipefail

PROYECTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUCKET="${BUCKET_RESPALDOS:?Define BUCKET_RESPALDOS (nombre del bucket de respaldos)}"

DB_NAME=$(grep '^DB_NAME=' "$PROYECTO_DIR/.env" | cut -d'=' -f2)
DB_USER=$(grep '^DB_USER=' "$PROYECTO_DIR/.env" | cut -d'=' -f2)
DB_PASSWORD=$(grep '^DB_PASSWORD=' "$PROYECTO_DIR/.env" | cut -d'=' -f2)

FECHA=$(date +%Y-%m-%d_%H%M)
ARCHIVO="/tmp/${DB_NAME}_${FECHA}.dump"

echo "[$(date -Is)] Creando respaldo de ${DB_NAME}..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" -Fc "$DB_NAME" > "$ARCHIVO"

echo "[$(date -Is)] Subiendo a s3://${BUCKET}/postgres/ ..."
aws s3 cp "$ARCHIVO" "s3://${BUCKET}/postgres/$(basename "$ARCHIVO")" --sse AES256

rm -f "$ARCHIVO"
echo "[$(date -Is)] Respaldo terminado."
