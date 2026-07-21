-- Inventário TI — Usina Caçu
-- Migration 018: cadastro de Status compartilhado entre TI e Geotecnologia.
-- Os status de equipamentos/rádios eram um enum fixo (CHECK constraint);
-- agora viram um cadastro editável (igual a setores/frotas), então as duas
-- empresas podem criar/renomear status sem alterar código. As colunas
-- continuam VARCHAR (não viram FK) para não quebrar nada que já compara
-- pelo nome do status (badges, regra de "Ativo exige responsável" etc.).

CREATE TABLE status_ativo (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(40) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

INSERT INTO status_ativo (nome) VALUES ('Ativo'), ('Manutencao'), ('Estoque'), ('Baixado');

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON status_ativo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE equipamentos DROP CONSTRAINT equipamentos_status_check;
ALTER TABLE radios DROP CONSTRAINT radios_status_check;
