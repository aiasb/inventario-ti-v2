# Build context: raiz do repositório (necessário para copiar db/migrations)
FROM node:20-alpine

WORKDIR /app

# LibreOffice headless é usado para converter o modelo .docx do termo (já
# preenchido com os dados) em PDF mantendo a formatação original do Word.
RUN apk add --no-cache libreoffice ttf-freefont

COPY api/package*.json ./
RUN npm install --omit=dev

COPY api/src ./src
COPY db /db

ENV NODE_ENV=production
ENV MIGRATIONS_DIR=/db/migrations
ENV HOME=/tmp
EXPOSE 3000

CMD ["node", "src/index.js"]
