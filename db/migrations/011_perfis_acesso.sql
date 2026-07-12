-- Inventário TI — Usina Caçu
-- Migration 011: perfis de acesso customizáveis. Substitui o campo fixo
-- usuarios.perfil (Administrador/Tecnico/Consulta hard-coded) por um
-- cadastro de perfis com permissões (ver/criar/editar/excluir) por módulo,
-- editável pela tela de Acessos.

CREATE TABLE perfis (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  descricao VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE perfil_permissoes (
  id SERIAL PRIMARY KEY,
  perfil_id INTEGER NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  modulo VARCHAR(40) NOT NULL,
  pode_ver BOOLEAN NOT NULL DEFAULT FALSE,
  pode_criar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_editar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_excluir BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (perfil_id, modulo)
);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: os 3 perfis que já existiam fixos no código, recriados com as
-- mesmas permissões que já estavam hard-coded via requireRole(), para que
-- o comportamento de quem já tem conta não mude com a migração.
INSERT INTO perfis (nome, descricao) VALUES
  ('Administrador', 'Acesso total a todos os módulos do sistema.'),
  ('Tecnico', 'Opera o dia a dia (inventário, manutenções e termos); sem acesso a configurações administrativas.'),
  ('Consulta', 'Apenas visualização, sem permissão para alterar dados.');

INSERT INTO perfil_permissoes (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.modulo, TRUE, TRUE, TRUE, TRUE
FROM perfis p, (VALUES ('dashboard'), ('inventario'), ('manutencoes'), ('termos'),
                        ('responsaveis'), ('acessos'), ('cadastros'), ('configuracoes')) AS m(modulo)
WHERE p.nome = 'Administrador';

INSERT INTO perfil_permissoes (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.modulo, TRUE, m.rw, m.rw, FALSE
FROM perfis p, (VALUES ('dashboard', FALSE), ('inventario', TRUE), ('manutencoes', TRUE), ('termos', TRUE),
                        ('responsaveis', FALSE), ('acessos', FALSE), ('cadastros', FALSE), ('configuracoes', FALSE)) AS m(modulo, rw)
WHERE p.nome = 'Tecnico';

INSERT INTO perfil_permissoes (perfil_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.modulo, TRUE, FALSE, FALSE, FALSE
FROM perfis p, (VALUES ('dashboard'), ('inventario'), ('manutencoes'), ('termos'),
                        ('responsaveis'), ('acessos'), ('cadastros'), ('configuracoes')) AS m(modulo)
WHERE p.nome = 'Consulta';

-- Liga usuarios ao novo cadastro de perfis (substitui a coluna de texto fixa)
ALTER TABLE usuarios ADD COLUMN perfil_id INTEGER REFERENCES perfis(id);
UPDATE usuarios u SET perfil_id = p.id FROM perfis p WHERE p.nome = u.perfil;
ALTER TABLE usuarios ALTER COLUMN perfil_id SET NOT NULL;
ALTER TABLE usuarios DROP CONSTRAINT usuarios_perfil_check;
ALTER TABLE usuarios DROP COLUMN perfil;
