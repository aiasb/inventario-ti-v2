# Build context: raiz do repositório (necessário para copiar db/migrations)
FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm install --omit=dev

COPY api/src ./src
COPY db /db

ENV NODE_ENV=production
ENV MIGRATIONS_DIR=/db/migrations
EXPOSE 3000

CMD ["node", "src/index.js"]
