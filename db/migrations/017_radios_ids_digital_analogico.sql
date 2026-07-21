-- Inventário TI — Usina Caçu
-- Migration 017: campos de identificação de rádio (ID Digital / ID Analógico),
-- usados no cadastro de rádios de Geotecnologia.

ALTER TABLE radios ADD COLUMN id_digital VARCHAR(40);
ALTER TABLE radios ADD COLUMN id_analogico VARCHAR(40);
