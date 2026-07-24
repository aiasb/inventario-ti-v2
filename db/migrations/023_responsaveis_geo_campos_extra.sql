-- Inventário TI — Usina Caçu
-- Migration 023: campos extras do cadastro de Responsáveis (Geotecnologia) —
-- Função, Departamento, Setor e Legenda (sigla/apelido curto exibido na
-- listagem). "Setor" e "Departamento" são campos independentes, ambos texto
-- livre. "Rádios alocados" (contagem) não vira coluna — é calculado a partir
-- de radios.responsavel_id, que já existe.

ALTER TABLE responsaveis_geo ADD COLUMN funcao VARCHAR(120);
ALTER TABLE responsaveis_geo ADD COLUMN departamento VARCHAR(120);
ALTER TABLE responsaveis_geo ADD COLUMN setor VARCHAR(120);
ALTER TABLE responsaveis_geo ADD COLUMN legenda VARCHAR(20);
