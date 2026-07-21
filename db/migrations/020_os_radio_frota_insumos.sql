-- Inventário TI — Usina Caçu
-- Migration 020: a OS de manutenção de rádios pode ser aberta vinculada a um
-- rádio específico OU diretamente a uma frota (quando ainda não se sabe qual
-- rádio exatamente apresenta o defeito), e passa a suportar múltiplos
-- insumos no fechamento (tabela de junção em vez de uma FK única).

ALTER TABLE manutencoes_radios ALTER COLUMN radio_id DROP NOT NULL;
ALTER TABLE manutencoes_radios ADD COLUMN frota_id INTEGER REFERENCES frotas(id);
ALTER TABLE manutencoes_radios ADD CONSTRAINT chk_manutencoes_radios_radio_ou_frota
  CHECK (radio_id IS NOT NULL OR frota_id IS NOT NULL);

CREATE INDEX idx_manutencoes_radios_frota ON manutencoes_radios(frota_id);

CREATE TABLE manutencoes_radios_insumos (
  manutencao_radio_id INTEGER NOT NULL REFERENCES manutencoes_radios(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id),
  PRIMARY KEY (manutencao_radio_id, insumo_id)
);

INSERT INTO manutencoes_radios_insumos (manutencao_radio_id, insumo_id)
SELECT id, insumo_id FROM manutencoes_radios WHERE insumo_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE manutencoes_radios DROP COLUMN insumo_id;
