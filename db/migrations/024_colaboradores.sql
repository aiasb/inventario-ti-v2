-- Inventário TI — Usina Caçu
-- Migration 024: cadastro de Colaboradores (Geotecnologia) — registro básico
-- de funcionários (Matrícula, Nome, Função, Departamento). Independente do
-- cadastro de Responsáveis (que carrega vínculo com Área e é usado para
-- alocação de rádios) — um Colaborador não é necessariamente um Responsável.

CREATE TABLE colaboradores (
  id SERIAL PRIMARY KEY,
  matricula VARCHAR(40),
  nome VARCHAR(160) NOT NULL,
  funcao VARCHAR(120),
  departamento VARCHAR(120),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
