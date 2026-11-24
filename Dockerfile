# Etapa 1: instala solo las dependencias de producción.
# Si no cambia package*.json, Docker reutiliza esta capa en cada build.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Etapa 2: imagen final. Lleva node_modules ya instalado y el código, sin la caché ni las herramientas de npm del build.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src ./src
RUN mkdir -p logs uploads && chown node:node logs uploads

# La app corre sin permisos de root.
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/api/health" > /dev/null || exit 1

# node directo (no npm start): recibe las señales del contenedor y se detiene limpio con docker stop.
CMD ["node", "server.js"]
