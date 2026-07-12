-- Inventário TI — Usina Caçu
-- Migration 003: tipo "Celular" + campo IMEI (paridade com o app mobile)

ALTER TABLE equipamentos ADD COLUMN imei VARCHAR(20);

INSERT INTO tipos_equipamento (nome, prefixo_hostname, possui_hostname)
VALUES ('Celular', NULL, FALSE)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO equipamentos (patrimonio, tipo_id, modelo, serial, hostname, imei, setor_id, filial_id, fornecedor_id, usuario_responsavel, status, data_aquisicao, data_garantia)
VALUES (
  'PAT-00801',
  (SELECT id FROM tipos_equipamento WHERE nome = 'Celular'),
  'Samsung Galaxy A54',
  'SN-SGA54-0801',
  NULL,
  '352099001761481',
  (SELECT id FROM setores WHERE nome = 'Comercial'),
  (SELECT id FROM filiais WHERE nome = 'Escritório Rio Verde'),
  NULL,
  'Fernanda Costa',
  'Ativo',
  '2024-02-20',
  '2027-02-20'
)
ON CONFLICT (patrimonio) DO NOTHING;
