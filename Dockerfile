# Imagen opcional para quien prefiera desplegar con contenedores en vez del
# modo nativo con PM2 (ver docs/DESPLIEGUE.md). No es el camino recomendado
# para la instancia t2.small de la entrega (ver docker-compose.yml), pero
# sirve para ECS/Elastic Beanstalk/otra nube con mas memoria disponible.

FROM node:20-bookworm-slim

# Dependencias nativas requeridas por "canvas" (usada por face-api.js) y por
# "sharp" al compilar binarios en arquitecturas sin binario precompilado.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
