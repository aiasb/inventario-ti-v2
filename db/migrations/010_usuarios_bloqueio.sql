-- Inventário TI — Usina Caçu
-- Migration 010: bloqueio de conta (distinto de ativo/inativo) para a
-- tela de Acessos.

ALTER TABLE usuarios ADD COLUMN bloqueado BOOLEAN NOT NULL DEFAULT FALSE;
