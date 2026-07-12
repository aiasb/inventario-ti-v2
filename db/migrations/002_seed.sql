-- Inventário TI — Usina Caçu
-- Migration 002: dados de exemplo (seed)
-- Senha padrão de todos os usuários de exemplo: Usina@123

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================
-- Filiais
-- ==========================================================
INSERT INTO filiais (nome, cidade) VALUES
  ('Matriz Caçu', 'Caçu/GO'),
  ('Escritório Rio Verde', 'Rio Verde/GO'),
  ('Unidade Industrial', 'Caçu/GO');

-- ==========================================================
-- Setores
-- ==========================================================
INSERT INTO setores (nome) VALUES
  ('TI'), ('Financeiro'), ('Administrativo'), ('Comercial'),
  ('Industrial'), ('RH'), ('Laboratório'), ('Logística'), ('Agrícola');

-- ==========================================================
-- Tipos de equipamento
-- ==========================================================
INSERT INTO tipos_equipamento (nome, prefixo_hostname, possui_hostname) VALUES
  ('Notebook', 'NB', TRUE),
  ('Desktop', 'DT', TRUE),
  ('Monitor', NULL, FALSE),
  ('Impressora', 'IMP', TRUE),
  ('Servidor', 'SRV', TRUE),
  ('Nobreak', NULL, FALSE),
  ('Periférico', NULL, FALSE);

-- ==========================================================
-- Fornecedores
-- ==========================================================
INSERT INTO fornecedores (nome, cnpj, telefone, email) VALUES
  ('Dell Brasil', '72.381.189/0001-10', '(11) 4004-0000', 'vendas@dell.com'),
  ('Lenovo Brasil', '05.821.777/0001-01', '(11) 3956-9700', 'contato@lenovo.com'),
  ('HP Brasil', '61.797.924/0001-58', '(11) 4197-4200', 'suporte@hp.com'),
  ('TI Soluções Goiás', '18.234.556/0001-90', '(64) 3411-2200', 'comercial@tisolucoesgo.com.br'),
  ('APC by Schneider', '02.803.437/0001-90', '(11) 2113-3000', 'vendas@apc.com');

-- ==========================================================
-- Usuários do sistema (senha: Usina@123)
-- ==========================================================
INSERT INTO usuarios (nome, email, senha_hash, cargo, perfil, ativo, ultimo_acesso) VALUES
  ('Rafael Almeida', 'rafael.almeida@usinacacu.com.br', crypt('Usina@123', gen_salt('bf')), 'Coordenador de TI', 'Administrador', TRUE, now() - interval '2 hours'),
  ('Bruna Ferreira', 'bruna.ferreira@usinacacu.com.br', crypt('Usina@123', gen_salt('bf')), 'Analista de TI', 'Tecnico', TRUE, now() - interval '1 day'),
  ('Diego Santana', 'diego.santana@usinacacu.com.br', crypt('Usina@123', gen_salt('bf')), 'Técnico de Suporte', 'Tecnico', TRUE, now() - interval '3 days'),
  ('Camila Rezende', 'camila.rezende@usinacacu.com.br', crypt('Usina@123', gen_salt('bf')), 'Assistente Administrativo', 'Consulta', TRUE, now() - interval '10 days'),
  ('Marcos Vinícius', 'marcos.vinicius@usinacacu.com.br', crypt('Usina@123', gen_salt('bf')), 'Estagiário de TI', 'Consulta', FALSE, now() - interval '40 days');

-- ==========================================================
-- Equipamentos (~25)
-- ==========================================================
INSERT INTO equipamentos (patrimonio, tipo_id, modelo, serial, hostname, setor_id, filial_id, fornecedor_id, usuario_responsavel, status, data_aquisicao, data_garantia) VALUES
  ('PAT-00101', (SELECT id FROM tipos_equipamento WHERE nome='Notebook'), 'Dell Latitude 5440', 'SN-DL5440-0101', 'UCACU-NB-0101', (SELECT id FROM setores WHERE nome='TI'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Rafael Almeida', 'Ativo', '2023-03-14', '2026-03-14'),
  ('PAT-00102', (SELECT id FROM tipos_equipamento WHERE nome='Notebook'), 'Lenovo ThinkPad T14', 'SN-TP14-0102', 'UCACU-NB-0102', (SELECT id FROM setores WHERE nome='TI'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Lenovo Brasil'), 'Bruna Ferreira', 'Ativo', '2023-06-02', '2026-06-02'),
  ('PAT-00103', (SELECT id FROM tipos_equipamento WHERE nome='Notebook'), 'Dell Latitude 3420', 'SN-DL3420-0103', 'UCACU-NB-0103', (SELECT id FROM setores WHERE nome='Financeiro'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Camila Rezende', 'Ativo', '2022-11-20', '2025-11-20'),
  ('PAT-00104', (SELECT id FROM tipos_equipamento WHERE nome='Notebook'), 'Lenovo ThinkPad E14', 'SN-TPE14-0104', 'UCACU-NB-0104', (SELECT id FROM setores WHERE nome='Comercial'), (SELECT id FROM filiais WHERE nome='Escritório Rio Verde'), (SELECT id FROM fornecedores WHERE nome='Lenovo Brasil'), 'Fernanda Costa', 'Ativo', '2024-01-18', '2027-01-18'),
  ('PAT-00105', (SELECT id FROM tipos_equipamento WHERE nome='Notebook'), 'Dell Vostro 3420', 'SN-DV3420-0105', 'UCACU-NB-0105', (SELECT id FROM setores WHERE nome='RH'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Patrícia Nunes', 'Manutencao', '2021-08-09', '2024-08-09'),
  ('PAT-00106', (SELECT id FROM tipos_equipamento WHERE nome='Notebook'), 'Lenovo IdeaPad 3', 'SN-IP3-0106', 'UCACU-NB-0106', NULL, (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Lenovo Brasil'), NULL, 'Estoque', '2024-05-30', '2027-05-30'),
  ('PAT-00201', (SELECT id FROM tipos_equipamento WHERE nome='Desktop'), 'Dell OptiPlex 7010', 'SN-OP7010-0201', 'UCACU-DT-0201', (SELECT id FROM setores WHERE nome='Financeiro'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Juliana Prado', 'Ativo', '2022-02-11', '2025-02-11'),
  ('PAT-00202', (SELECT id FROM tipos_equipamento WHERE nome='Desktop'), 'Dell OptiPlex 3080', 'SN-OP3080-0202', 'UCACU-DT-0202', (SELECT id FROM setores WHERE nome='Administrativo'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Eduardo Lima', 'Ativo', '2023-09-04', '2026-09-04'),
  ('PAT-00203', (SELECT id FROM tipos_equipamento WHERE nome='Desktop'), 'Lenovo ThinkCentre M70', 'SN-TCM70-0203', 'UCACU-DT-0203', (SELECT id FROM setores WHERE nome='Laboratório'), (SELECT id FROM filiais WHERE nome='Unidade Industrial'), (SELECT id FROM fornecedores WHERE nome='Lenovo Brasil'), 'André Barbosa', 'Ativo', '2023-01-25', '2026-01-25'),
  ('PAT-00204', (SELECT id FROM tipos_equipamento WHERE nome='Desktop'), 'Positivo Master D550', 'SN-PMD550-0204', 'UCACU-DT-0204', (SELECT id FROM setores WHERE nome='Logística'), (SELECT id FROM filiais WHERE nome='Unidade Industrial'), NULL, 'Wesley Moura', 'Manutencao', '2020-07-13', '2023-07-13'),
  ('PAT-00205', (SELECT id FROM tipos_equipamento WHERE nome='Desktop'), 'Dell OptiPlex 5090', 'SN-OP5090-0205', 'UCACU-DT-0205', (SELECT id FROM setores WHERE nome='Agrícola'), (SELECT id FROM filiais WHERE nome='Unidade Industrial'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Kelly Duarte', 'Ativo', '2024-03-21', '2027-03-21'),
  ('PAT-00206', (SELECT id FROM tipos_equipamento WHERE nome='Desktop'), 'Dell OptiPlex 3080', 'SN-OP3080-0206', 'UCACU-DT-0206', NULL, (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), NULL, 'Baixado', '2018-04-02', '2021-04-02'),
  ('PAT-00301', (SELECT id FROM tipos_equipamento WHERE nome='Monitor'), 'Dell P2422H 24"', 'SN-P2422H-0301', NULL, (SELECT id FROM setores WHERE nome='TI'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Rafael Almeida', 'Ativo', '2023-03-14', '2026-03-14'),
  ('PAT-00302', (SELECT id FROM tipos_equipamento WHERE nome='Monitor'), 'LG 22MK400H 22"', 'SN-LG22MK-0302', NULL, (SELECT id FROM setores WHERE nome='Financeiro'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), NULL, 'Camila Rezende', 'Ativo', '2022-11-20', '2025-11-20'),
  ('PAT-00303', (SELECT id FROM tipos_equipamento WHERE nome='Monitor'), 'Samsung S24R350 24"', 'SN-SS24R-0303', NULL, (SELECT id FROM setores WHERE nome='Comercial'), (SELECT id FROM filiais WHERE nome='Escritório Rio Verde'), NULL, 'Fernanda Costa', 'Ativo', '2024-01-18', '2027-01-18'),
  ('PAT-00304', (SELECT id FROM tipos_equipamento WHERE nome='Monitor'), 'Dell E2016H 20"', 'SN-E2016H-0304', NULL, NULL, (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), NULL, 'Estoque', '2019-10-11', '2022-10-11'),
  ('PAT-00401', (SELECT id FROM tipos_equipamento WHERE nome='Impressora'), 'HP LaserJet Pro M404dn', 'SN-M404DN-0401', 'UCACU-IMP-0401', (SELECT id FROM setores WHERE nome='Administrativo'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='HP Brasil'), NULL, 'Ativo', '2022-05-08', '2025-05-08'),
  ('PAT-00402', (SELECT id FROM tipos_equipamento WHERE nome='Impressora'), 'HP LaserJet M130fw', 'SN-M130FW-0402', 'UCACU-IMP-0402', (SELECT id FROM setores WHERE nome='RH'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='HP Brasil'), NULL, 'Ativo', '2023-08-30', '2026-08-30'),
  ('PAT-00403', (SELECT id FROM tipos_equipamento WHERE nome='Impressora'), 'Epson L3250', 'SN-L3250-0403', 'UCACU-IMP-0403', (SELECT id FROM setores WHERE nome='Comercial'), (SELECT id FROM filiais WHERE nome='Escritório Rio Verde'), NULL, NULL, 'Manutencao', '2021-12-01', '2024-12-01'),
  ('PAT-00501', (SELECT id FROM tipos_equipamento WHERE nome='Servidor'), 'Dell PowerEdge R440', 'SN-R440-0501', 'UCACU-SRV-0501', (SELECT id FROM setores WHERE nome='TI'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), 'Rafael Almeida', 'Ativo', '2022-09-19', '2027-09-19'),
  ('PAT-00502', (SELECT id FROM tipos_equipamento WHERE nome='Servidor'), 'Dell PowerEdge T340', 'SN-T340-0502', 'UCACU-SRV-0502', (SELECT id FROM setores WHERE nome='Industrial'), (SELECT id FROM filiais WHERE nome='Unidade Industrial'), (SELECT id FROM fornecedores WHERE nome='Dell Brasil'), NULL, 'Ativo', '2023-04-27', '2028-04-27'),
  ('PAT-00601', (SELECT id FROM tipos_equipamento WHERE nome='Nobreak'), 'APC Smart-UPS 1500VA', 'SN-SUPS1500-0601', NULL, (SELECT id FROM setores WHERE nome='TI'), (SELECT id FROM filiais WHERE nome='Matriz Caçu'), (SELECT id FROM fornecedores WHERE nome='APC by Schneider'), NULL, 'Ativo', '2023-03-14', '2025-03-14'),
  ('PAT-00602', (SELECT id FROM tipos_equipamento WHERE nome='Nobreak'), 'APC Back-UPS 1200VA', 'SN-BUPS1200-0602', NULL, (SELECT id FROM setores WHERE nome='Industrial'), (SELECT id FROM filiais WHERE nome='Unidade Industrial'), (SELECT id FROM fornecedores WHERE nome='APC by Schneider'), NULL, 'Ativo', '2022-06-16', '2024-06-16'),
  ('PAT-00701', (SELECT id FROM tipos_equipamento WHERE nome='Periférico'), 'Leitor de código de barras Honeywell', 'SN-HW1900-0701', NULL, (SELECT id FROM setores WHERE nome='Logística'), (SELECT id FROM filiais WHERE nome='Unidade Industrial'), NULL, 'Wesley Moura', 'Ativo', '2023-10-05', '2025-10-05'),
  ('PAT-00702', (SELECT id FROM tipos_equipamento WHERE nome='Periférico'), 'Headset Logitech H390', 'SN-LGH390-0702', NULL, (SELECT id FROM setores WHERE nome='Comercial'), (SELECT id FROM filiais WHERE nome='Escritório Rio Verde'), NULL, 'Fernanda Costa', 'Ativo', '2024-02-14', '2026-02-14');

-- ==========================================================
-- Manutenções
-- ==========================================================
INSERT INTO manutencoes (os, equipamento_id, titulo, tipo, tecnico, custo, descricao, data, status) VALUES
  ('OS-0001', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00105'), 'Troca de teclado e bateria', 'Corretiva', 'Diego Santana', 380.00, 'Notebook com teclado travando e bateria não segurando carga.', CURRENT_DATE - 2, 'Em andamento'),
  ('OS-0002', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00204'), 'Fonte não liga', 'Corretiva', 'Diego Santana', 220.00, 'Desktop não liga, suspeita de fonte queimada.', CURRENT_DATE - 5, 'Aberta'),
  ('OS-0003', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00403'), 'Manutenção preventiva semestral', 'Preventiva', 'Bruna Ferreira', 90.00, 'Limpeza de cabeças de impressão e calibração.', CURRENT_DATE - 1, 'Aberta'),
  ('OS-0004', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00101'), 'Atualização de SSD', 'Preventiva', 'Rafael Almeida', 450.00, 'Upgrade de HD para SSD NVMe.', CURRENT_DATE - 20, 'Concluida'),
  ('OS-0005', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00501'), 'Manutenção preventiva de servidor', 'Preventiva', 'Rafael Almeida', 0.00, 'Verificação de RAID e limpeza física.', CURRENT_DATE - 15, 'Concluida'),
  ('OS-0006', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00203'), 'Troca de memória RAM', 'Corretiva', 'Diego Santana', 310.00, 'Upgrade de 8GB para 16GB solicitado pelo setor.', CURRENT_DATE - 8, 'Concluida'),
  ('OS-0007', (SELECT id FROM equipamentos WHERE patrimonio='PAT-00602'), 'Troca de bateria do nobreak', 'Corretiva', 'Diego Santana', 480.00, 'Bateria não segura carga acima de 5 minutos.', CURRENT_DATE - 3, 'Em andamento');

-- ==========================================================
-- Termos de responsabilidade
-- ==========================================================
INSERT INTO termos (numero, colaborador, cargo, filial_id, data, observacoes) VALUES
  ('TERMO-0001', 'Rafael Almeida', 'Coordenador de TI', (SELECT id FROM filiais WHERE nome='Matriz Caçu'), '2023-03-14', 'Entrega de notebook, monitor e nobreak para uso na função.'),
  ('TERMO-0002', 'Camila Rezende', 'Assistente Administrativo', (SELECT id FROM filiais WHERE nome='Matriz Caçu'), '2022-11-20', 'Entrega de notebook e monitor.'),
  ('TERMO-0003', 'Fernanda Costa', 'Analista Comercial', (SELECT id FROM filiais WHERE nome='Escritório Rio Verde'), '2024-01-18', 'Entrega de notebook, monitor e headset.');

INSERT INTO termo_equipamentos (termo_id, equipamento_id) VALUES
  ((SELECT id FROM termos WHERE numero='TERMO-0001'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00101')),
  ((SELECT id FROM termos WHERE numero='TERMO-0001'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00301')),
  ((SELECT id FROM termos WHERE numero='TERMO-0001'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00601')),
  ((SELECT id FROM termos WHERE numero='TERMO-0002'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00103')),
  ((SELECT id FROM termos WHERE numero='TERMO-0002'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00302')),
  ((SELECT id FROM termos WHERE numero='TERMO-0003'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00104')),
  ((SELECT id FROM termos WHERE numero='TERMO-0003'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00303')),
  ((SELECT id FROM termos WHERE numero='TERMO-0003'), (SELECT id FROM equipamentos WHERE patrimonio='PAT-00702'));
