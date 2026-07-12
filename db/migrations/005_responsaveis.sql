-- Inventário TI — Usina Caçu
-- Migration 005: cadastro de Responsáveis (pessoas) + vínculo relacional
-- com equipamentos, substituindo o campo livre "usuario_responsavel".

CREATE TABLE responsaveis (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  cargo VARCHAR(120),
  setor_id INTEGER REFERENCES setores(id),
  email VARCHAR(160),
  telefone VARCHAR(30),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_responsaveis_nome ON responsaveis(nome);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON responsaveis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE equipamentos ADD COLUMN responsavel_id INTEGER REFERENCES responsaveis(id);

-- Migra os nomes já cadastrados como texto livre para o novo cadastro
-- estruturado, herdando o setor do próprio equipamento quando disponível.
INSERT INTO responsaveis (nome, setor_id)
SELECT DISTINCT ON (usuario_responsavel) usuario_responsavel, setor_id
FROM equipamentos
WHERE usuario_responsavel IS NOT NULL AND btrim(usuario_responsavel) <> '';

UPDATE equipamentos e
SET responsavel_id = r.id
FROM responsaveis r
WHERE r.nome = e.usuario_responsavel;

ALTER TABLE equipamentos DROP COLUMN usuario_responsavel;
