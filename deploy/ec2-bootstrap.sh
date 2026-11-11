#!/usr/bin/env bash
# =============================================================
# Bootstrap de la instancia EC2 (Ubuntu 22.04/24.04 LTS, t3.micro/t2.small)
# Instala todo lo necesario y deja la app corriendo con PM2 + nginx.
#
# Uso (dentro de la instancia, via SSH):
#   1) Sube el codigo del proyecto a la instancia, por ejemplo:
#        scp -i tu-llave.pem -r mi_red_social ubuntu@<IP-publica>:~/mi_red_social
#      o clona desde tu propio repositorio de GitHub.
#   2) Conectate por SSH y ejecuta:
#        cd ~/mi_red_social
#        chmod +x deploy/ec2-bootstrap.sh
#        ./deploy/ec2-bootstrap.sh
#   3) Edita el archivo .env con tus credenciales reales (paso manual,
#      el script solo crea una copia de .env.example si no existe).
#   4) Vuelve a ejecutar el script, o solo los pasos de PM2/nginx al final,
#      despues de completar el .env.
#
# Ver docs/DESPLIEGUE.md para la guia completa paso a paso (incluye como
# crear la instancia, el Security Group, el bucket S3, Route 53, etc).
# =============================================================
set -e

PROYECTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROYECTO_DIR"

echo "==> Actualizando paquetes del sistema..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Creando swap de 2 GB (si no existe; util en instancias de 1 GB de RAM)..."
if ! swapon --show | grep -q swapfile; then
    sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
    sudo mkswap /swapfile && sudo swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Instalando dependencias nativas (para 'canvas' y 'sharp')..."
sudo apt-get install -y --no-install-recommends \
    build-essential python3 git curl \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

echo "==> Instalando Node.js 20 LTS..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node -v

echo "==> Instalando PostgreSQL..."
if ! command -v psql >/dev/null 2>&1; then
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi

echo "==> Instalando nginx..."
sudo apt-get install -y nginx

echo "==> Instalando PM2 (gestor de procesos de Node)..."
sudo npm install -g pm2

echo "==> Instalando dependencias del proyecto (npm ci)..."
npm ci --omit=dev

echo "==> Compilando el frontend React (frontend/dist)..."
( cd frontend && npm ci && VITE_API_URL=/api npm run build )

if [ ! -f .env ]; then
    echo "==> No existe .env; copiando .env.example -> .env"
    cp .env.example .env
    echo ""
    echo "    *** IMPORTANTE ***"
    echo "    Edita ahora el archivo .env con: nano .env"
    echo "    Completa DB_PASSWORD, JWT_SECRET, GOOGLE_CLIENT_ID,"
    echo "    RECAPTCHA_*, AWS_* (si usas S3) y BASE_URL (dominio real)."
    echo "    Luego vuelve a ejecutar este script para continuar."
    exit 0
fi

echo "==> Creando base de datos y usuario en PostgreSQL (si no existen)..."
DB_NAME=$(grep '^DB_NAME=' .env | cut -d'=' -f2)
DB_USER=$(grep '^DB_USER=' .env | cut -d'=' -f2)
DB_PASSWORD=$(grep '^DB_PASSWORD=' .env | cut -d'=' -f2)

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "==> Inicializando tablas (Sequelize sync)..."
npm run db:init

echo "==> Iniciando la app con PM2..."
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
echo "    Para que PM2 arranque solo al reiniciar la instancia, copia y"
echo "    ejecuta el comando 'sudo env PATH=...' que imprime este comando:"
pm2 startup systemd -u "$USER" --hp "$HOME" || true

echo "==> Configurando nginx como reverse proxy..."
sed "s|__PROYECTO_DIR__|$PROYECTO_DIR|g" deploy/nginx.conf | sudo tee /etc/nginx/sites-available/mi-red-social >/dev/null
sudo chmod o+x "$HOME"
sudo ln -sf /etc/nginx/sites-available/mi-red-social /etc/nginx/sites-enabled/mi-red-social
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "============================================================"
echo " Listo. La app deberia responder en: http://<IP-publica-EC2>/"
echo " Recuerda en el Security Group de la instancia abrir los puertos:"
echo "   22  (SSH)  - solo tu IP"
echo "   80  (HTTP) - 0.0.0.0/0"
echo "   443 (HTTPS)- 0.0.0.0/0 (si configuras certbot)"
echo " Para apuntar un dominio de Route 53 a esta instancia, crea un"
echo " registro A hacia la IP publica/elastica. Ver docs/DESPLIEGUE.md."
echo "============================================================"
