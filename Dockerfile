FROM node:22-alpine

ENV NODE_ENV=production NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app

# Primero solo las dependencias: si no cambia package*.json, Docker reutiliza esta capa en cada build.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .
RUN mkdir -p logs uploads && chown node:node logs uploads

# La app corre sin permisos de root.
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/api/health" > /dev/null || exit 1

CMD ["npm", "start"]
