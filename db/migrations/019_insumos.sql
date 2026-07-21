-- Inventário TI — Usina Caçu
-- Migration 019: cadastro de Insumos (itens usados na manutenção de rádios,
-- Geotecnologia) — a OS de manutenção passa a referenciar um insumo
-- cadastrado em vez de aceitar um título livre.

CREATE TABLE insumos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- "titulo" continua existindo (cópia do nome do insumo no momento da OS,
-- preserva o histórico mesmo se o insumo for renomeado/desativado depois),
-- mas quem edita passa a ser sempre a seleção do insumo, não texto livre.
ALTER TABLE manutencoes_radios ADD COLUMN insumo_id INTEGER REFERENCES insumos(id);
