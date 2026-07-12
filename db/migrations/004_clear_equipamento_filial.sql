-- Inventário TI — Usina Caçu
-- Migration 004: Filial deixou de ser exibida/editável no cadastro e na lista
-- de equipamentos (Inventário) — limpa os dados de filial já associados.

UPDATE equipamentos SET filial_id = NULL WHERE filial_id IS NOT NULL;
