-- SCRIPT DE CORRECAO: Mapeia IDs antigos para IDs atuais
-- Executar passo a passo no Supabase SQL Editor

-- PASSO 1: Criar tabela temporaria de mapeamento
CREATE TEMP TABLE IF NOT EXISTS mapeamento_ids (
  id_antigo UUID PRIMARY KEY,
  id_novo UUID NOT NULL,
  modulo TEXT,
  descricao TEXT
);

-- PASSO 2: Inserir mapeamento para AVALIACOES
-- Hebreus - Avaliacoes
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed', 'e50aa7eb-49dc-4a60-8a44-62833cb634b1', 'Hebreus', 'Avaliacao V1 (148 alunos)'),
('778a7d2d-d046-475a-8f5d-5ea59700d883', '9a94f0ee-62ac-4969-b803-a93645775de3', 'Hebreus', '2a Recuperacao (110 alunos)'),
('8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe', '82585e3b-12cd-4a30-9d5a-802891d6d751', 'Hebreus', 'Recuperacao (56 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- Espirito Santo - Avaliacoes
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('30190d06-b324-4b77-8435-b2eb63e4e55f', '2d523cdd-0750-4000-b23b-eed9f5395597', 'Espirito Santo', 'Avaliacao V1 (45 alunos)'),
('e6f7a766-dca2-46ec-b875-935a02f649b1', 'e0f043d7-6cb5-446e-90a5-1515037ac915', 'Espirito Santo', '2a Recuperacao (43 alunos)'),
('8e3cbe49-a4d1-447f-bc29-468eb6e08fb3', '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc', 'Espirito Santo', 'Recuperacao (40 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- Epistolas Paulinas I - Avaliacoes
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('0bdde13e-8848-4d49-a929-69b78acba92c', 'd4a586e6-77c0-4b65-b98a-249a348b663b', 'Paulinas I', 'Avaliacao V1 (39 alunos)'),
('0bf75491-7ad2-4d4d-b984-dfc815b32047', '02eeda0a-006a-411c-9329-09f823f3c8ac', 'Paulinas I', '2a Recuperacao (36 alunos)'),
('acef2116-a948-47bb-8bcd-aa39adcd7f7e', '6e948e2e-e764-4e6e-89a6-4d7eeec487e0', 'Paulinas I', 'Recuperacao (35 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- Teologia Pratica - Avaliacoes
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('7b545e0f-8322-4256-9de6-45fedbb6b4f3', '6392d5a1-5700-43d5-9b82-86f2a7cad49e', 'Teologia Pratica', 'Avaliacao V1 (34 alunos)'),
('d678cd76-1908-472e-9492-e2d5f421c133', 'd8e5a096-c925-4d5f-839f-65c160059ad4', 'Teologia Pratica', '2a Recuperacao (32 alunos)'),
('87c5880c-22b7-47ef-bd16-7d4f69264377', 'df1d4c28-2c2a-410e-adc2-9254d054053e', 'Teologia Pratica', 'Recuperacao (32 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- PASSO 3: Inserir mapeamento para EXERCICIOS (top 20 por alunos)
-- Hebreus - Exercicios
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('383653ae-1a79-4d2e-8509-579040bb1d0c', '485019a4-f6ef-48a2-9d82-e62449289f5c', 'Hebreus', 'Exercicio L1 (48 alunos)'),
('446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce', '3812dd79-9f1d-4f03-b56f-0e71073f48a1', 'Hebreus', 'Exercicio L2 (45 alunos)'),
('ddc19cca-72c2-4207-ab1c-21a376f11bc6', 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6', 'Hebreus', 'Exercicio L3 (36 alunos)'),
('9d7adcf7-e64c-4dfd-9753-127f8d55e7c3', 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8', 'Hebreus', 'Exercicio L4 (30 alunos)'),
('dfead070-ffaa-47c8-8304-9a449290d535', '13cffb43-7357-4768-a9ad-af082b47218e', 'Hebreus', 'Exercicio L5 (25 alunos)'),
('8706f108-5423-4ede-8598-f2e112073b22', '89a64e51-6fd3-4343-9a72-263934fd296c', 'Hebreus', 'Exercicio L6 (21 alunos)'),
('57b445f4-2e72-40ac-ad31-e2cafd3dc4f4', '2d81d42f-92e2-4700-8c8f-4a6400b86890', 'Hebreus', 'Exercicio L7 (20 alunos)'),
('df242323-1230-4f78-8d65-f0e75de30e24', '88f77fe7-5cd6-492a-9873-a623a3a54057', 'Hebreus', 'Exercicio L8 (20 alunos)'),
('290b9208-4a8d-437e-b147-4ee11387755a', '7e9f1f37-f52f-4f6e-835d-1b2c73eea6af', 'Hebreus', 'Exercicio L9 (20 alunos)'),
('8c8e7bac-182d-4df3-844d-fdb734107eaf', '3cb3f89f-e818-4739-b4f5-4457223e69c7', 'Hebreus', 'Exercicio L10 (20 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- Espirito Santo - Exercicios
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('6f67ed3b-afda-4a96-8682-c986c247a005', '16d832ce-0fb3-4b86-b5a9-2bb21ef46451', 'Espirito Santo', 'Exercicio L1 (28 alunos)'),
('75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1', '0649ca5d-e18a-49cb-b86a-7c69703dab83', 'Espirito Santo', 'Exercicio L2 (21 alunos)'),
('aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9', 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d', 'Espirito Santo', 'Exercicio L3 (16 alunos)'),
('619a43d8-acf5-4c3b-b9b1-0037a5fbadb5', '124ee5be-e30a-4dbe-aaa2-044b620b44d4', 'Espirito Santo', 'Exercicio L4 (16 alunos)'),
('7ac481f8-64f1-41f4-8836-33128e19f6fe', 'c735f05d-826a-4198-b054-e81ddccf48f4', 'Espirito Santo', 'Exercicio L5 (14 alunos)'),
('bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a', '19a2a430-169b-4efe-83bf-fe2400874100', 'Espirito Santo', 'Exercicio L6 (13 alunos)'),
('52001439-da37-4844-8d35-69c132a2b1af', '2440220f-2d36-4bb7-a2bb-b7ff68a317d8', 'Espirito Santo', 'Exercicio L7 (13 alunos)'),
('c19572c2-10f0-45a3-abd4-6053f41fd22f', '1441dcbc-c0a9-4042-a716-898ae3d2df2a', 'Espirito Santo', 'Exercicio L8 (11 alunos)'),
('edd1ce4c-4caa-442f-9195-e84d7274adc9', 'e73b31a4-5911-427a-98d3-00fc123457da', 'Espirito Santo', 'Exercicio L9 (10 alunos)'),
('c1141d36-657d-4b59-b2ee-bcd7901633e1', '4340c9e0-5ee0-4037-b2da-2827c5ee89d1', 'Espirito Santo', 'Exercicio L10 (10 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- Paulinas I - Exercicios
INSERT INTO mapeamento_ids (id_antigo, id_novo, modulo, descricao) VALUES
('69b6d4dd-0ddc-45ad-86d9-e169c04f8305', 'cced48a7-2c5b-497c-84d4-ed6d9ba448e6', 'Paulinas I', 'Exercicio L1 (15 alunos)')

ON CONFLICT (id_antigo) DO UPDATE SET id_novo = EXCLUDED.id_novo;

-- PASSO 4: Verificar quantos IDs ainda ficaram sem mapeamento
SELECT 
  COUNT(CASE WHEN m.id_novo IS NULL THEN 1 END) as sem_mapeamento,
  COUNT(CASE WHEN m.id_novo IS NOT NULL THEN 1 END) as com_mapeamento
FROM (
  SELECT DISTINCT r.aula_id
  FROM respostas_aulas r
  LEFT JOIN aulas a ON r.aula_id = a.id
  WHERE a.id IS NULL
  AND r.created_at < '2026-06-01'
) r
LEFT JOIN mapeamento_ids m ON r.aula_id = m.id_antigo;

-- PASSO 5: Listar IDs ainda sem mapeamento
SELECT 
  r.aula_id as id_antigo,
  COUNT(*) as total,
  MIN(r.created_at) as primeira
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
LEFT JOIN mapeamento_ids m ON r.aula_id = m.id_antigo
WHERE a.id IS NULL
AND m.id_novo IS NULL
AND r.created_at < '2026-06-01'
GROUP BY r.aula_id
ORDER BY total DESC;
