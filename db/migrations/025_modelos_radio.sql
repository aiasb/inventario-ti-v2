-- Inventário TI — Usina Caçu
-- Migration 025: cadastro de Modelos (Geotecnologia) — catálogo de modelos de
-- rádio (Código do CHB, Nome, Serial do modelo, Tipo, Valor unitário).
-- Independente do campo "modelo" (texto livre) já existente em radios — não
-- há vínculo entre as duas tabelas; "Quantidade de rádios" é calculada
-- comparando o nome do modelo cadastrado aqui com o texto do campo
-- radios.modelo (correspondência aproximada, não FK).

CREATE TABLE modelos_radio (
  id SERIAL PRIMARY KEY,
  codigo_chb VARCHAR(40),
  nome VARCHAR(160) NOT NULL,
  serial VARCHAR(40),
  tipo VARCHAR(20) CHECK (tipo IN ('Movel', 'Portatil')),
  valor NUMERIC(12,2),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON modelos_radio
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
