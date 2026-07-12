-- Inventário TI — Usina Caçu
-- Migration 006: remove completamente o conceito de Filial do sistema.

ALTER TABLE equipamentos DROP COLUMN IF EXISTS filial_id;
ALTER TABLE termos DROP COLUMN IF EXISTS filial_id;
DROP TABLE IF EXISTS filiais;
