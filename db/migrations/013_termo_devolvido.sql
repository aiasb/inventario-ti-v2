-- Inventário TI — Usina Caçu
-- Migration 013: status de devolução do termo (encerramento da responsabilidade
-- sobre os equipamentos entregues, sem precisar excluir o termo).

ALTER TABLE termos ADD COLUMN devolvido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE termos ADD COLUMN data_devolucao DATE;
