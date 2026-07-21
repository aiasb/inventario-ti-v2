-- Inventário TI — Usina Caçu
-- Migration 021: Gestão de Ocorrências (Geotecnologia) — envio de rádio(s)
-- para reparo/fornecedor externo. Cadastros de apoio próprios (não
-- reaproveita o cadastro de fornecedores de TI), seguindo o mesmo princípio
-- de independência já adotado para frotas/áreas/responsáveis da Geo.

CREATE TABLE transportadoras (
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

CREATE TABLE fornecedores_geo (
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

-- "Recusado" cobre tanto recusa quanto condenação do item (rótulo composto
-- só na UI, ver web/mobile). O status é único por ocorrência — os itens
-- vinculados não têm status independente, apenas exibem o status herdado.
CREATE TABLE ocorrencias (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  transportadora_id INTEGER REFERENCES transportadoras(id),
  fornecedor_id INTEGER REFERENCES fornecedores_geo(id),
  nota_fiscal VARCHAR(60),
  status VARCHAR(20) NOT NULL DEFAULT 'Em Aberto'
    CHECK (status IN ('Em Aberto', 'Enviado', 'Em Analise', 'Finalizado', 'Recusado')),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ocorrencias_status ON ocorrencias(status);

-- Itens vinculados (um ou mais rádios por ocorrência). Sempre recriados por
-- inteiro a cada edição (delete + reinsert), por isso sem updated_at próprio.
CREATE TABLE ocorrencia_itens (
  id SERIAL PRIMARY KEY,
  ocorrencia_id INTEGER NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  radio_id INTEGER NOT NULL REFERENCES radios(id),
  numero_os VARCHAR(40),
  solicitante VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ocorrencia_itens_ocorrencia ON ocorrencia_itens(ocorrencia_id);
CREATE INDEX idx_ocorrencia_itens_radio ON ocorrencia_itens(radio_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['transportadoras','fornecedores_geo','ocorrencias']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I
                     FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;
