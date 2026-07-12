-- Inventário TI — Usina Caçu
-- Migration 007: cadastro de Responsáveis passa a conter
-- Nome, Matrícula, CPF e Setor (remove cargo, e-mail e telefone).

ALTER TABLE responsaveis
  ADD COLUMN matricula VARCHAR(30),
  ADD COLUMN cpf VARCHAR(14);

ALTER TABLE responsaveis
  DROP COLUMN IF EXISTS cargo,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS telefone;

CREATE UNIQUE INDEX idx_responsaveis_cpf ON responsaveis(cpf) WHERE cpf IS NOT NULL AND deleted_at IS NULL;
