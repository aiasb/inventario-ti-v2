-- Inventário TI — Usina Caçu
-- Migration 008: status de assinatura do termo + cadastro de modelos de termo.

ALTER TABLE termos ADD COLUMN assinado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE termos ADD COLUMN data_assinatura DATE;

CREATE TABLE termo_modelos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  texto TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_termo_modelos_nome ON termo_modelos(nome);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON termo_modelos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE termos ADD COLUMN modelo_id INTEGER REFERENCES termo_modelos(id);

INSERT INTO termo_modelos (nome, texto) VALUES
  ('Termo Padrão de Responsabilidade',
   'Declaro para os devidos fins que recebi da Usina Caçu, em perfeito estado de funcionamento, o(s) equipamento(s) abaixo relacionado(s), comprometendo-me a zelar pela sua guarda, conservação e uso adequado, respondendo civil e criminalmente por eventuais danos, extravio ou mau uso, bem como a devolvê-lo(s) ao término do vínculo ou quando solicitado pela empresa.'),
  ('Termo de Equipamento Móvel (Notebook/Celular)',
   'Declaro para os devidos fins que recebi da Usina Caçu o(s) equipamento(s) móvel(is) abaixo relacionado(s), comprometendo-me a utilizá-lo(s) exclusivamente para atividades profissionais, zelar por sua guarda e integridade dentro e fora das dependências da empresa, e comunicar imediatamente qualquer perda, furto ou dano.'),
  ('Termo de Baixa/Devolução',
   'Declaro para os devidos fins que devolvi à Usina Caçu, nesta data, o(s) equipamento(s) abaixo relacionado(s), encerrando minha responsabilidade sobre o(s) mesmo(s) a partir deste ato.');

-- Marca como assinados os termos de exemplo já existentes no seed, para a
-- demonstração das abas de filtro (Todos / Assinado / Pendente) fazer sentido.
UPDATE termos SET assinado = TRUE, data_assinatura = data WHERE numero IN ('TERMO-0001', 'TERMO-0002');
