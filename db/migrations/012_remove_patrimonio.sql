-- Inventário TI — Usina Caçu
-- Migration 012: remove o número de patrimônio (PAT-XXXXX) do sistema.
-- O Serial passa a ser o identificador principal do equipamento.

ALTER TABLE equipamentos DROP COLUMN patrimonio;
