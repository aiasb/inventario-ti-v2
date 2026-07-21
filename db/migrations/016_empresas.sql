-- Inventário TI — Usina Caçu
-- Migration 016: empresas (TI / Geotecnologia) e vínculo usuário-empresa.
-- Isso é ortogonal ao sistema de perfis/permissoes por módulo — "empresa"
-- controla QUAIS módulos aparecem/são acessíveis para o usuário (TI x
-- Geotecnologia), enquanto perfil_permissoes continua controlando o que ele
-- pode fazer dentro de cada módulo.

CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(40) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO empresas (nome, slug) VALUES ('TI', 'ti'), ('Geotecnologia', 'geotecnologia');

CREATE TABLE usuario_empresas (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, empresa_id)
);

-- Preserva o comportamento atual: todo usuário existente continua com
-- acesso à TI (única empresa que existia até aqui). Acesso à Geotecnologia
-- precisa ser concedido explicitamente na tela de Acessos.
INSERT INTO usuario_empresas (usuario_id, empresa_id)
SELECT u.id, e.id FROM usuarios u, empresas e WHERE e.slug = 'ti';

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
