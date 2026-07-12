-- Inventário TI — Usina Caçu
-- Migration 001: schema inicial

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================
-- Tabelas auxiliares
-- ==========================================================

CREATE TABLE filiais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  cidade VARCHAR(120),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE setores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE tipos_equipamento (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  prefixo_hostname VARCHAR(10),
  possui_hostname BOOLEAN NOT NULL DEFAULT TRUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE fornecedores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  cnpj VARCHAR(20),
  telefone VARCHAR(30),
  email VARCHAR(160),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ==========================================================
-- Usuários do sistema (login web / app Android)
-- ==========================================================

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  cargo VARCHAR(120),
  perfil VARCHAR(20) NOT NULL DEFAULT 'Consulta'
    CHECK (perfil IN ('Administrador', 'Tecnico', 'Consulta')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

-- Refresh tokens (sessões JWT — web e mobile)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);

-- Tokens de API de longa duração para o futuro app Android
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  token_prefix VARCHAR(12) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  ultimo_uso TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================
-- Equipamentos
-- ==========================================================

CREATE TABLE equipamentos (
  id SERIAL PRIMARY KEY,
  patrimonio VARCHAR(40) NOT NULL UNIQUE,
  tipo_id INTEGER NOT NULL REFERENCES tipos_equipamento(id),
  modelo VARCHAR(160) NOT NULL,
  serial VARCHAR(120) NOT NULL UNIQUE,
  hostname VARCHAR(60),
  setor_id INTEGER REFERENCES setores(id),
  filial_id INTEGER REFERENCES filiais(id),
  fornecedor_id INTEGER REFERENCES fornecedores(id),
  usuario_responsavel VARCHAR(160),
  status VARCHAR(20) NOT NULL DEFAULT 'Estoque'
    CHECK (status IN ('Ativo', 'Manutencao', 'Estoque', 'Baixado')),
  data_aquisicao DATE,
  data_garantia DATE,
  foto_url VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_equipamentos_serial ON equipamentos(serial);
CREATE INDEX idx_equipamentos_hostname ON equipamentos(hostname);
CREATE INDEX idx_equipamentos_status ON equipamentos(status);
CREATE INDEX idx_equipamentos_updated_at ON equipamentos(updated_at);
CREATE INDEX idx_equipamentos_patrimonio ON equipamentos(patrimonio);

-- ==========================================================
-- Manutenções (ordens de serviço)
-- ==========================================================

CREATE TABLE manutencoes (
  id SERIAL PRIMARY KEY,
  os VARCHAR(20) NOT NULL UNIQUE,
  equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Corretiva', 'Preventiva')),
  tecnico VARCHAR(160),
  custo NUMERIC(12,2) DEFAULT 0,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Aberta'
    CHECK (status IN ('Aberta', 'Em andamento', 'Concluida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_manutencoes_equipamento ON manutencoes(equipamento_id);
CREATE INDEX idx_manutencoes_status ON manutencoes(status);
CREATE INDEX idx_manutencoes_updated_at ON manutencoes(updated_at);

-- ==========================================================
-- Termos de responsabilidade
-- ==========================================================

CREATE TABLE termos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  colaborador VARCHAR(160) NOT NULL,
  cargo VARCHAR(120),
  filial_id INTEGER REFERENCES filiais(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_termos_updated_at ON termos(updated_at);

CREATE TABLE termo_equipamentos (
  id SERIAL PRIMARY KEY,
  termo_id INTEGER NOT NULL REFERENCES termos(id) ON DELETE CASCADE,
  equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  UNIQUE (termo_id, equipamento_id)
);

CREATE INDEX idx_termo_equipamentos_termo ON termo_equipamentos(termo_id);
CREATE INDEX idx_termo_equipamentos_equipamento ON termo_equipamentos(equipamento_id);

-- ==========================================================
-- Trigger genérica para updated_at
-- ==========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['filiais','setores','tipos_equipamento','fornecedores',
                            'usuarios','equipamentos','manutencoes','termos']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I
                     FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;
