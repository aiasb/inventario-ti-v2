-- Inventário TI — Usina Caçu
-- Migration 009: upload de modelo de termo em .docx (com variáveis
-- %nome%, %cpf%, %serial% etc.) e vínculo opcional do termo a um
-- Responsável cadastrado (para preencher CPF/matrícula/setor no documento).

ALTER TABLE termo_modelos ADD COLUMN arquivo_path VARCHAR(255);
ALTER TABLE termo_modelos ADD COLUMN arquivo_nome VARCHAR(255);

ALTER TABLE termos ADD COLUMN responsavel_id INTEGER REFERENCES responsaveis(id);
