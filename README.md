# Inventário TI — Usina Caçu

Aplicação web completa de inventário de equipamentos de TI, em pt-BR, com painel
administrativo (React) e API REST própria (Node.js + Express + PostgreSQL), pronta
para servir futuramente também um aplicativo Android.

## Arquitetura

```
inventario-ti-v2/
├── docker-compose.yml       # orquestra db + api + web
├── .env.example             # variáveis de ambiente (copie para .env)
├── db/
│   └── migrations/          # migrations SQL versionadas (+ seed de dados de exemplo)
├── api/                     # API REST (Node.js + Express + PostgreSQL)
│   └── src/
└── web/                     # Painel web (React + Vite), servido por nginx em produção
    └── src/
```

- **db**: PostgreSQL 16 com volume persistente (`db_data`).
- **api**: Node.js + Express, expõe `/api/v1/*` e a documentação OpenAPI em `/api/docs`.
  Roda as migrations e o seed automaticamente ao subir.
- **web**: React + Vite, build servido por nginx, com proxy reverso de `/api` e
  `/uploads` para o serviço `api`.

## Como rodar (Docker)

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Isso vai:
1. Subir o PostgreSQL e aguardar ficar saudável (healthcheck).
2. Rodar as migrations (`db/migrations/001_init.sql`, `002_seed.sql`) automaticamente
   ao iniciar a API — o schema e os dados de exemplo (~25 equipamentos, usuários,
   manutenções, termos etc.) são criados na primeira execução.
3. Subir a API em `http://localhost:3000` (porta configurável via `API_EXPOSED_PORT`).
4. Buildar e subir o painel web em `http://localhost:8080` (porta configurável via
   `WEB_EXPOSED_PORT`), com nginx fazendo proxy de `/api` para a API.

Acesse **http://localhost:8080** e faça login com um dos usuários de exemplo:

| E-mail                                | Senha       | Perfil        |
|----------------------------------------|-------------|---------------|
| rafael.almeida@usinacacu.com.br        | Usina@123   | Administrador |
| bruna.ferreira@usinacacu.com.br        | Usina@123   | Técnico       |
| camila.rezende@usinacacu.com.br        | Usina@123   | Consulta      |

Documentação da API (Swagger/OpenAPI): **http://localhost:3000/api/docs**

## Variáveis de ambiente (`.env`)

Veja `.env.example` para a lista completa. Principais:

| Variável | Descrição |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciais do PostgreSQL |
| `API_EXPOSED_PORT` | Porta da API exposta no host (acesso externo, ex.: app Android) |
| `JWT_SECRET` | Segredo de assinatura dos tokens JWT — troque em produção |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Validade dos tokens |
| `CORS_ORIGINS` | Origens permitidas por CORS, separadas por vírgula |
| `WEB_EXPOSED_PORT` | Porta do painel web exposta no host |

## Desenvolvimento local (sem Docker)

**API:**
```bash
cd api
npm install
cp ../.env.example .env   # ajuste DB_HOST=localhost etc.
npm run migrate           # roda migrations + seed contra um Postgres local
npm run dev
```

**Web:**
```bash
cd web
npm install
npm run dev                # http://localhost:5173, com proxy para a API local
```

## API REST

- Base: `/api/v1` — CRUD completo para `equipamentos`, `manutencoes`, `termos`,
  `usuarios`, `setores`, `filiais`, `tipos-equipamento`, `fornecedores`, `api-tokens`.
- Filtros, ordenação e paginação via query params, ex.:
  `GET /api/v1/equipamentos?status=Ativo&filialId=1&sort=serial&page=1`
- Autenticação JWT (`/api/v1/auth/login`, `/refresh`, `/logout`, `/me`), com
  autorização por perfil (Administrador / Tecnico / Consulta) em cada endpoint.
- Endpoints pensados para o futuro app Android:
  - `GET /api/v1/equipamentos/serial/{serial}` e `/hostname/{hostname}` — consulta
    rápida via leitura de etiqueta/código de barras.
  - `GET /api/v1/equipamentos/sync?updated_since=` — sincronização incremental
    para uso offline-first.
  - `POST /api/v1/equipamentos/{id}/foto` — upload de foto (multipart/form-data).
  - Tokens de API de longa duração, gerenciados em **Configurações → Integrações/API**
    dentro do painel web (criação/revogação), usados como `Authorization: Bearer iti_...`.
- Erros padronizados: `{ "error": { "code", "message", "details" } }`.

## Stack

- **Frontend**: React 18 + Vite, React Router, CSS puro (tema escuro customizado),
  fontes Space Grotesk / IBM Plex Sans / IBM Plex Mono.
- **Backend**: Node.js + Express, `pg` (driver PostgreSQL puro, sem ORM),
  `jsonwebtoken` + `bcryptjs`, `multer` (upload), `swagger-jsdoc` + `swagger-ui-express`.
- **Banco**: PostgreSQL 16, migrations SQL versionadas com runner próprio
  (`api/src/migrate.js`), soft delete (`deleted_at`) e triggers de `updated_at`.
