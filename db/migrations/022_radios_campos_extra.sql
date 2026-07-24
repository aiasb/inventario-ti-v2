-- Inventário TI — Usina Caçu
-- Migration 022: campos extras do cadastro de Rádios (Geotecnologia) —
-- Tipo (Móvel/Portátil), Colaborador Responsável (uso do dia a dia, texto
-- livre — diferente do "Responsável" formal já existente), e um código de
-- identificação próprio do rádio, usado junto com a sigla da área para
-- formar o "ID" exibido na listagem (ex.: sigla "AGR" + código "m3108").

ALTER TABLE areas_geo ADD COLUMN sigla VARCHAR(10);

ALTER TABLE radios ADD COLUMN tipo VARCHAR(20) CHECK (tipo IN ('Movel', 'Portatil'));
ALTER TABLE radios ADD COLUMN colaborador_responsavel VARCHAR(160);
ALTER TABLE radios ADD COLUMN codigo VARCHAR(20);
