-- Inventário TI — Usina Caçu
-- Migration 015: módulo de Geotecnologia (inventário de rádios).
-- Cadastros próprios (areas_geo, responsaveis_geo, frotas), independentes de
-- setores/responsaveis de TI, e OS de manutenção em tabela dedicada
-- (manutencoes_radios) para não acoplar ao módulo de manutenções de TI.

CREATE TABLE areas_geo (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE responsaveis_geo (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  matricula VARCHAR(40),
  cpf VARCHAR(20),
  area_id INTEGER REFERENCES areas_geo(id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_responsaveis_geo_cpf ON responsaveis_geo(cpf) WHERE deleted_at IS NULL AND cpf IS NOT NULL;

CREATE TABLE frotas (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(40) NOT NULL UNIQUE,
  nome VARCHAR(160) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE radios (
  id SERIAL PRIMARY KEY,
  numero_serie VARCHAR(120) NOT NULL UNIQUE,
  modelo VARCHAR(160),
  frota_id INTEGER REFERENCES frotas(id),
  responsavel_id INTEGER REFERENCES responsaveis_geo(id),
  area_id INTEGER REFERENCES areas_geo(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo', 'Manutencao', 'Estoque', 'Baixado')),
  data_aquisicao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_radios_numero_serie ON radios(numero_serie);
CREATE INDEX idx_radios_status ON radios(status);
CREATE INDEX idx_radios_updated_at ON radios(updated_at);

-- OS de manutenção de rádios (prefixo OSR-xxxx, distinto do OS-xxxx de TI)
CREATE TABLE manutencoes_radios (
  id SERIAL PRIMARY KEY,
  os VARCHAR(20) NOT NULL UNIQUE,
  radio_id INTEGER NOT NULL REFERENCES radios(id) ON DELETE CASCADE,
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

CREATE INDEX idx_manutencoes_radios_radio ON manutencoes_radios(radio_id);
CREATE INDEX idx_manutencoes_radios_status ON manutencoes_radios(status);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['areas_geo','responsaveis_geo','frotas','radios','manutencoes_radios']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I
                     FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;
