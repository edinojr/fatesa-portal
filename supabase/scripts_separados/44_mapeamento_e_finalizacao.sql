-- Script 44: Mapeamento de IDs antigos → novos + Finalização de módulos
-- ================================================================
--
-- PARTE 1: Mapear aula_id antigos → novos em respostas_aulas e progresso
-- PARTE 2: Finalizar módulos (progresso + modulos_finalizados_manual) para alunos aprovados
-- PARTE 3: Relação (SELECT) entre IDs antigos e novos
--
-- ATENÇÃO: Execute em ordem, PASSO a PASSO, verificando cada resultado.

-- ================================================================
-- PASSO 0: Diagnóstico - quantos órfãos existem?
-- ================================================================
SELECT 'PASSO 0: ÓRFÃOS EM respostas_aulas' as info;
SELECT COUNT(*) as total
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL;

SELECT 'ÓRFÃOS EM progresso' as info;
SELECT COUNT(*) as total
FROM progresso p
LEFT JOIN aulas a ON p.aula_id = a.id
WHERE a.id IS NULL;

-- ================================================================
-- PASSO 1: Mapear aula_id antigos → novos em respostas_aulas
-- ================================================================
-- (Baseado nos scripts 25 e 37, mas sem filtro de data para pegar todos)
SELECT 'PASSO 1: MAPEANDO respostas_aulas...' as info;

-- === EPÍSTOLA AOS HEBREUS ===
-- Avaliação
UPDATE respostas_aulas SET aula_id = 'e50aa7eb-49dc-4a60-8a44-62833cb634b1' WHERE aula_id = 'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed';
UPDATE respostas_aulas SET aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3' WHERE aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883';
UPDATE respostas_aulas SET aula_id = '82585e3b-12cd-4a30-9d5a-802891d6d751' WHERE aula_id = '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe';
-- Lições L1-L10
UPDATE respostas_aulas SET aula_id = '485019a4-f6ef-48a2-9d82-e62449289f5c' WHERE aula_id = '383653ae-1a79-4d2e-8509-579040bb1d0c';
UPDATE respostas_aulas SET aula_id = '3812dd79-9f1d-4f03-b56f-0e71073f48a1' WHERE aula_id = '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce';
UPDATE respostas_aulas SET aula_id = 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6' WHERE aula_id = 'ddc19cca-72c2-4207-ab1c-21a376f11bc6';
UPDATE respostas_aulas SET aula_id = 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8' WHERE aula_id = '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3';
UPDATE respostas_aulas SET aula_id = '13cffb43-7357-4768-a9ad-af082b47218e' WHERE aula_id = 'dfead070-ffaa-47c8-8304-9a449290d535';
UPDATE respostas_aulas SET aula_id = '89a64e51-6fd3-4343-9a72-263934fd296c' WHERE aula_id = '8706f108-5423-4ede-8598-f2e112073b22';
UPDATE respostas_aulas SET aula_id = '2d81d42f-92e2-4700-8c8f-4a6400b86890' WHERE aula_id = '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4';
UPDATE respostas_aulas SET aula_id = '88f77fe7-5cd6-492a-9873-a623a3a54057' WHERE aula_id = 'df242323-1230-4f78-8d65-f0e75de30e24';
UPDATE respostas_aulas SET aula_id = '7e9f1f37-f52f-4f6e-835d-1b2c73eea6af' WHERE aula_id = '290b9208-4a8d-437e-b147-4ee11387755a';
UPDATE respostas_aulas SET aula_id = '3cb3f89f-e818-4739-b4f5-4457223e69c7' WHERE aula_id = '8c8e7bac-182d-4df3-844d-fdb734107eaf';

-- === DOUTRINA DO ESPÍRITO SANTO ===
-- Avaliação
UPDATE respostas_aulas SET aula_id = '2d523cdd-0750-4000-b23b-eed9f5395597' WHERE aula_id = '30190d06-b324-4b77-8435-b2eb63e4e55f';
UPDATE respostas_aulas SET aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915' WHERE aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1';
UPDATE respostas_aulas SET aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc' WHERE aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3';
-- Lições L1-L10
UPDATE respostas_aulas SET aula_id = '16d832ce-0fb3-4b86-b5a9-2bb21ef46451' WHERE aula_id = '6f67ed3b-afda-4a96-8682-c986c247a005';
UPDATE respostas_aulas SET aula_id = '0649ca5d-e18a-49cb-b86a-7c69703dab83' WHERE aula_id = '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1';
UPDATE respostas_aulas SET aula_id = 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d' WHERE aula_id = 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9';
UPDATE respostas_aulas SET aula_id = '124ee5be-e30a-4dbe-aaa2-044b620b44d4' WHERE aula_id = '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5';
UPDATE respostas_aulas SET aula_id = 'c735f05d-826a-4198-b054-e81ddccf48f4' WHERE aula_id = '7ac481f8-64f1-41f4-8836-33128e19f6fe';
UPDATE respostas_aulas SET aula_id = '19a2a430-169b-4efe-83bf-fe2400874100' WHERE aula_id = 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a';
UPDATE respostas_aulas SET aula_id = '2440220f-2d36-4bb7-a2bb-b7ff68a317d8' WHERE aula_id = '52001439-da37-4844-8d35-69c132a2b1af';
UPDATE respostas_aulas SET aula_id = '1441dcbc-c0a9-4042-a716-898ae3d2df2a' WHERE aula_id = 'c19572c2-10f0-45a3-abd4-6053f41fd22f';
UPDATE respostas_aulas SET aula_id = 'e73b31a4-5911-427a-98d3-00fc123457da' WHERE aula_id = 'edd1ce4c-4caa-442f-9195-e84d7274adc9';
UPDATE respostas_aulas SET aula_id = '4340c9e0-5ee0-4037-b2da-2827c5ee89d1' WHERE aula_id = 'c1141d36-657d-4b59-b2ee-bcd7901633e1';

-- === EPÍSTOLAS PAULINAS I ===
-- Avaliação
UPDATE respostas_aulas SET aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b' WHERE aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c';
UPDATE respostas_aulas SET aula_id = '02eeda0a-006a-411c-9329-09f823f3c8ac' WHERE aula_id = '0bf75491-7ad2-4d4d-b984-dfc815b32047';
UPDATE respostas_aulas SET aula_id = '6e948e2e-e764-4e6e-89a6-4d7eeec487e0' WHERE aula_id = 'acef2116-a948-47bb-8bcd-aa39adcd7f7e';
-- Lições L1-L10
UPDATE respostas_aulas SET aula_id = 'cced48a7-2c5b-497c-84d4-ed6d9ba448e6' WHERE aula_id = '69b6d4dd-0ddc-45ad-86d9-e169c04f8305';
UPDATE respostas_aulas SET aula_id = 'f18506b3-9974-4798-ab14-41b7f6cdad91' WHERE aula_id = 'd645a78d-aacf-4743-9e7e-313916f31ebb';
UPDATE respostas_aulas SET aula_id = '95ce5654-b432-4cea-b57e-2d98e1aa9e01' WHERE aula_id = 'd9246788-96a5-4bb9-8fab-e4a9413ea283';
UPDATE respostas_aulas SET aula_id = '0e079957-8e16-4d5c-9af3-8a52e1a2ee81' WHERE aula_id = 'abd7ec76-2471-4cb9-876e-e09808f23344';
UPDATE respostas_aulas SET aula_id = '7a0e0d97-a39a-4193-a92f-2a253f1eda3e' WHERE aula_id = '0e6f076a-33ad-4cda-bdbd-49e32ed7d006';
UPDATE respostas_aulas SET aula_id = 'c307c4d4-1393-4743-9e45-25713fe2cdd3' WHERE aula_id = '92655b42-54a5-4498-8d1e-468e9d171a30';
UPDATE respostas_aulas SET aula_id = '8fab7676-384e-4d2b-9a07-8d3981feae89' WHERE aula_id = '836017e9-87c9-42da-9dd0-756e11772487';
UPDATE respostas_aulas SET aula_id = '0bbe08fd-68e0-45ed-b9e2-04020969e6b8' WHERE aula_id = '6fd1a301-0c59-4518-90c1-52ea0d7816e2';
UPDATE respostas_aulas SET aula_id = 'b247f584-78a8-48be-832c-ed11f824260e' WHERE aula_id = '6f6b3a55-83a7-4312-babf-d477a75f65af';
UPDATE respostas_aulas SET aula_id = 'e6425963-457e-4909-bd72-e2ed7dfbb68d' WHERE aula_id = '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b';

-- === TEOLOGIA PRÁTICA ===
-- Avaliação
UPDATE respostas_aulas SET aula_id = '6392d5a1-5700-43d5-9b82-86f2a7cad49e' WHERE aula_id = '7b545e0f-8322-4256-9de6-45fedbb6b4f3';
UPDATE respostas_aulas SET aula_id = 'd8e5a096-c925-4d5f-839f-65c160059ad4' WHERE aula_id = 'd678cd76-1908-472e-9492-e2d5f421c133';
UPDATE respostas_aulas SET aula_id = 'df1d4c28-2c2a-410e-adc2-9254d054053e' WHERE aula_id = '87c5880c-22b7-47ef-bd16-7d4f69264377';
-- Lições L1-L7
UPDATE respostas_aulas SET aula_id = '64c2f671-7492-467f-a8f9-7699598ec0c1' WHERE aula_id = 'da9c29c8-9fcb-485b-a6f7-01e0e0f66013';
UPDATE respostas_aulas SET aula_id = '7c07de26-6ff8-4e21-bfec-75ee3140adb4' WHERE aula_id = 'dc69dd9d-b525-4a3c-9698-8a61acff4149';
UPDATE respostas_aulas SET aula_id = 'ba4498b6-f907-49c2-9fd3-98b469cc756b' WHERE aula_id = '4e4e8a9d-9815-446f-9cd4-0189e77debf4';
UPDATE respostas_aulas SET aula_id = '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3' WHERE aula_id = '44e83075-58b7-473d-a95d-de6f94d85df2';
UPDATE respostas_aulas SET aula_id = 'ccb7384e-d98a-4d66-b700-9575487e6c3c' WHERE aula_id = '21b42fe6-3bca-447e-b3e3-f2f26bdc090d';
UPDATE respostas_aulas SET aula_id = '2d59b538-a2a9-4add-9465-95c21d53adc0' WHERE aula_id = 'e68ce31d-0b5f-4b28-8070-6e80e701f7d7';
UPDATE respostas_aulas SET aula_id = 'e7674abf-185a-48ac-bce2-acd86fc676c1' WHERE aula_id = '199d5b3e-9697-4620-8b72-fea1aedf106e';

-- ================================================================
-- PASSO 1b: Mapear aula_id antigos → novos em progresso
-- ================================================================
SELECT 'PASSO 1b: MAPEANDO progresso...' as info;

-- === EPÍSTOLA AOS HEBREUS ===
UPDATE progresso SET aula_id = 'e50aa7eb-49dc-4a60-8a44-62833cb634b1' WHERE aula_id = 'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed';
UPDATE progresso SET aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3' WHERE aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883';
UPDATE progresso SET aula_id = '82585e3b-12cd-4a30-9d5a-802891d6d751' WHERE aula_id = '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe';
UPDATE progresso SET aula_id = '485019a4-f6ef-48a2-9d82-e62449289f5c' WHERE aula_id = '383653ae-1a79-4d2e-8509-579040bb1d0c';
UPDATE progresso SET aula_id = '3812dd79-9f1d-4f03-b56f-0e71073f48a1' WHERE aula_id = '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce';
UPDATE progresso SET aula_id = 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6' WHERE aula_id = 'ddc19cca-72c2-4207-ab1c-21a376f11bc6';
UPDATE progresso SET aula_id = 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8' WHERE aula_id = '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3';
UPDATE progresso SET aula_id = '13cffb43-7357-4768-a9ad-af082b47218e' WHERE aula_id = 'dfead070-ffaa-47c8-8304-9a449290d535';
UPDATE progresso SET aula_id = '89a64e51-6fd3-4343-9a72-263934fd296c' WHERE aula_id = '8706f108-5423-4ede-8598-f2e112073b22';
UPDATE progresso SET aula_id = '2d81d42f-92e2-4700-8c8f-4a6400b86890' WHERE aula_id = '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4';
UPDATE progresso SET aula_id = '88f77fe7-5cd6-492a-9873-a623a3a54057' WHERE aula_id = 'df242323-1230-4f78-8d65-f0e75de30e24';
UPDATE progresso SET aula_id = '7e9f1f37-f52f-4f6e-835d-1b2c73eea6af' WHERE aula_id = '290b9208-4a8d-437e-b147-4ee11387755a';
UPDATE progresso SET aula_id = '3cb3f89f-e818-4739-b4f5-4457223e69c7' WHERE aula_id = '8c8e7bac-182d-4df3-844d-fdb734107eaf';

-- === DOUTRINA DO ESPÍRITO SANTO ===
UPDATE progresso SET aula_id = '2d523cdd-0750-4000-b23b-eed9f5395597' WHERE aula_id = '30190d06-b324-4b77-8435-b2eb63e4e55f';
UPDATE progresso SET aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915' WHERE aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1';
UPDATE progresso SET aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc' WHERE aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3';
UPDATE progresso SET aula_id = '16d832ce-0fb3-4b86-b5a9-2bb21ef46451' WHERE aula_id = '6f67ed3b-afda-4a96-8682-c986c247a005';
UPDATE progresso SET aula_id = '0649ca5d-e18a-49cb-b86a-7c69703dab83' WHERE aula_id = '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1';
UPDATE progresso SET aula_id = 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d' WHERE aula_id = 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9';
UPDATE progresso SET aula_id = '124ee5be-e30a-4dbe-aaa2-044b620b44d4' WHERE aula_id = '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5';
UPDATE progresso SET aula_id = 'c735f05d-826a-4198-b054-e81ddccf48f4' WHERE aula_id = '7ac481f8-64f1-41f4-8836-33128e19f6fe';
UPDATE progresso SET aula_id = '19a2a430-169b-4efe-83bf-fe2400874100' WHERE aula_id = 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a';
UPDATE progresso SET aula_id = '2440220f-2d36-4bb7-a2bb-b7ff68a317d8' WHERE aula_id = '52001439-da37-4844-8d35-69c132a2b1af';
UPDATE progresso SET aula_id = '1441dcbc-c0a9-4042-a716-898ae3d2df2a' WHERE aula_id = 'c19572c2-10f0-45a3-abd4-6053f41fd22f';
UPDATE progresso SET aula_id = 'e73b31a4-5911-427a-98d3-00fc123457da' WHERE aula_id = 'edd1ce4c-4caa-442f-9195-e84d7274adc9';
UPDATE progresso SET aula_id = '4340c9e0-5ee0-4037-b2da-2827c5ee89d1' WHERE aula_id = 'c1141d36-657d-4b59-b2ee-bcd7901633e1';

-- === EPÍSTOLAS PAULINAS I ===
UPDATE progresso SET aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b' WHERE aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c';
UPDATE progresso SET aula_id = '02eeda0a-006a-411c-9329-09f823f3c8ac' WHERE aula_id = '0bf75491-7ad2-4d4d-b984-dfc815b32047';
UPDATE progresso SET aula_id = '6e948e2e-e764-4e6e-89a6-4d7eeec487e0' WHERE aula_id = 'acef2116-a948-47bb-8bcd-aa39adcd7f7e';
UPDATE progresso SET aula_id = 'cced48a7-2c5b-497c-84d4-ed6d9ba448e6' WHERE aula_id = '69b6d4dd-0ddc-45ad-86d9-e169c04f8305';
UPDATE progresso SET aula_id = 'f18506b3-9974-4798-ab14-41b7f6cdad91' WHERE aula_id = 'd645a78d-aacf-4743-9e7e-313916f31ebb';
UPDATE progresso SET aula_id = '95ce5654-b432-4cea-b57e-2d98e1aa9e01' WHERE aula_id = 'd9246788-96a5-4bb9-8fab-e4a9413ea283';
UPDATE progresso SET aula_id = '0e079957-8e16-4d5c-9af3-8a52e1a2ee81' WHERE aula_id = 'abd7ec76-2471-4cb9-876e-e09808f23344';
UPDATE progresso SET aula_id = '7a0e0d97-a39a-4193-a92f-2a253f1eda3e' WHERE aula_id = '0e6f076a-33ad-4cda-bdbd-49e32ed7d006';
UPDATE progresso SET aula_id = 'c307c4d4-1393-4743-9e45-25713fe2cdd3' WHERE aula_id = '92655b42-54a5-4498-8d1e-468e9d171a30';
UPDATE progresso SET aula_id = '8fab7676-384e-4d2b-9a07-8d3981feae89' WHERE aula_id = '836017e9-87c9-42da-9dd0-756e11772487';
UPDATE progresso SET aula_id = '0bbe08fd-68e0-45ed-b9e2-04020969e6b8' WHERE aula_id = '6fd1a301-0c59-4518-90c1-52ea0d7816e2';
UPDATE progresso SET aula_id = 'b247f584-78a8-48be-832c-ed11f824260e' WHERE aula_id = '6f6b3a55-83a7-4312-babf-d477a75f65af';
UPDATE progresso SET aula_id = 'e6425963-457e-4909-bd72-e2ed7dfbb68d' WHERE aula_id = '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b';

-- === TEOLOGIA PRÁTICA ===
UPDATE progresso SET aula_id = '6392d5a1-5700-43d5-9b82-86f2a7cad49e' WHERE aula_id = '7b545e0f-8322-4256-9de6-45fedbb6b4f3';
UPDATE progresso SET aula_id = 'd8e5a096-c925-4d5f-839f-65c160059ad4' WHERE aula_id = 'd678cd76-1908-472e-9492-e2d5f421c133';
UPDATE progresso SET aula_id = 'df1d4c28-2c2a-410e-adc2-9254d054053e' WHERE aula_id = '87c5880c-22b7-47ef-bd16-7d4f69264377';
UPDATE progresso SET aula_id = '64c2f671-7492-467f-a8f9-7699598ec0c1' WHERE aula_id = 'da9c29c8-9fcb-485b-a6f7-01e0e0f66013';
UPDATE progresso SET aula_id = '7c07de26-6ff8-4e21-bfec-75ee3140adb4' WHERE aula_id = 'dc69dd9d-b525-4a3c-9698-8a61acff4149';
UPDATE progresso SET aula_id = 'ba4498b6-f907-49c2-9fd3-98b469cc756b' WHERE aula_id = '4e4e8a9d-9815-446f-9cd4-0189e77debf4';
UPDATE progresso SET aula_id = '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3' WHERE aula_id = '44e83075-58b7-473d-a95d-de6f94d85df2';
UPDATE progresso SET aula_id = 'ccb7384e-d98a-4d66-b700-9575487e6c3c' WHERE aula_id = '21b42fe6-3bca-447e-b3e3-f2f26bdc090d';
UPDATE progresso SET aula_id = '2d59b538-a2a9-4add-9465-95c21d53adc0' WHERE aula_id = 'e68ce31d-0b5f-4b28-8070-6e80e701f7d7';
UPDATE progresso SET aula_id = 'e7674abf-185a-48ac-bce2-acd86fc676c1' WHERE aula_id = '199d5b3e-9697-4620-8b72-fea1aedf106e';

-- ================================================================
-- PASSO 1c: Tentar mapear órfãos restantes por nome do título
-- ================================================================
SELECT 'PASSO 1c: TENTANDO MAPEAR ÓRFÃOS RESTANTES...' as info;

-- Tenta mapear respostas_aulas órfãs encontrando aulas com mesmo título
UPDATE respostas_aulas r
SET aula_id = a.id
FROM aulas a
WHERE r.aula_id != a.id
  AND NOT EXISTS (SELECT 1 FROM aulas aa WHERE aa.id = r.aula_id)
  AND (
    -- Tenta match pelo título da aula (LIKE)
    EXISTS (SELECT 1 FROM aulas a2 WHERE a2.titulo ILIKE '%' || (
      SELECT COALESCE(NULLIF(ra2.aula_id::text, ''), '')
      FROM respostas_aulas ra2
      WHERE ra2.id = r.id
      LIMIT 1
    ) || '%')
  );

-- ================================================================
-- PASSO 1d: Remover órfãos que não puderam ser mapeados
-- ================================================================
SELECT 'PASSO 1d: REMOVENDO ÓRFÃOS RESTANTES...' as info;

SELECT 'respostas_aulas a serem deletadas:' as info;
SELECT r.id, r.aula_id, r.aluno_id, r.nota, r.created_at
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL;

DELETE FROM respostas_aulas
WHERE aula_id IN (
    SELECT r.aula_id
    FROM respostas_aulas r
    LEFT JOIN aulas a ON r.aula_id = a.id
    WHERE a.id IS NULL
);

SELECT 'progresso a serem deletados:' as info;
SELECT p.id, p.aula_id, p.aluno_id, p.concluida
FROM progresso p
LEFT JOIN aulas a ON p.aula_id = a.id
WHERE a.id IS NULL;

DELETE FROM progresso
WHERE aula_id IN (
    SELECT p.aula_id
    FROM progresso p
    LEFT JOIN aulas a ON p.aula_id = a.id
    WHERE a.id IS NULL
);

-- ================================================================
-- PASSO 2: RELAÇÃO - IDs antigos vs novos
-- ================================================================
SELECT 'PASSO 2: RELAÇÃO IDS ANTIGOS x NOVOS' as info;
SELECT
    CASE
        WHEN r.aula_id IN (
            'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed','778a7d2d-d046-475a-8f5d-5ea59700d883','8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe',
            '383653ae-1a79-4d2e-8509-579040bb1d0c','446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce','ddc19cca-72c2-4207-ab1c-21a376f11bc6',
            '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3','dfead070-ffaa-47c8-8304-9a449290d535','8706f108-5423-4ede-8598-f2e112073b22',
            '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4','df242323-1230-4f78-8d65-f0e75de30e24','290b9208-4a8d-437e-b147-4ee11387755a',
            '8c8e7bac-182d-4df3-844d-fdb734107eaf'
        ) THEN 'Epístola aos Hebreus'
        WHEN r.aula_id IN (
            '30190d06-b324-4b77-8435-b2eb63e4e55f','e6f7a766-dca2-46ec-b875-935a02f649b1','8e3cbe49-a4d1-447f-bc29-468eb6e08fb3',
            '6f67ed3b-afda-4a96-8682-c986c247a005','75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1','aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9',
            '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5','7ac481f8-64f1-41f4-8836-33128e19f6fe','bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a',
            '52001439-da37-4844-8d35-69c132a2b1af','c19572c2-10f0-45a3-abd4-6053f41fd22f','edd1ce4c-4caa-442f-9195-e84d7274adc9',
            'c1141d36-657d-4b59-b2ee-bcd7901633e1'
        ) THEN 'Doutrina do Espírito Santo'
        WHEN r.aula_id IN (
            '0bdde13e-8848-4d49-a929-69b78acba92c','0bf75491-7ad2-4d4d-b984-dfc815b32047','acef2116-a948-47bb-8bcd-aa39adcd7f7e',
            '69b6d4dd-0ddc-45ad-86d9-e169c04f8305','d645a78d-aacf-4743-9e7e-313916f31ebb','d9246788-96a5-4bb9-8fab-e4a9413ea283',
            'abd7ec76-2471-4cb9-876e-e09808f23344','0e6f076a-33ad-4cda-bdbd-49e32ed7d006','92655b42-54a5-4498-8d1e-468e9d171a30',
            '836017e9-87c9-42da-9dd0-756e11772487','6fd1a301-0c59-4518-90c1-52ea0d7816e2','6f6b3a55-83a7-4312-babf-d477a75f65af',
            '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b'
        ) THEN 'Epístolas Paulinas I'
        WHEN r.aula_id IN (
            '7b545e0f-8322-4256-9de6-45fedbb6b4f3','d678cd76-1908-472e-9492-e2d5f421c133','87c5880c-22b7-47ef-bd16-7d4f69264377',
            'da9c29c8-9fcb-485b-a6f7-01e0e0f66013','dc69dd9d-b525-4a3c-9698-8a61acff4149','4e4e8a9d-9815-446f-9cd4-0189e77debf4',
            '44e83075-58b7-473d-a95d-de6f94d85df2','21b42fe6-3bca-447e-b3e3-f2f26bdc090d','e68ce31d-0b5f-4b28-8070-6e80e701f7d7',
            '199d5b3e-9697-4620-8b72-fea1aedf106e'
        ) THEN 'Teologia Prática'
        ELSE 'Outro'
    END AS modulo,
    r.aula_id AS id_antigo,
    a.id AS id_novo,
    a.titulo AS titulo_novo,
    a.tipo,
    a.versao,
    COUNT(*) OVER (PARTITION BY r.aula_id) AS total_registros
FROM respostas_aulas r
JOIN aulas a ON r.aula_id = a.id
WHERE r.aula_id IN (
    'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed','778a7d2d-d046-475a-8f5d-5ea59700d883','8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe',
    '30190d06-b324-4b77-8435-b2eb63e4e55f','e6f7a766-dca2-46ec-b875-935a02f649b1','8e3cbe49-a4d1-447f-bc29-468eb6e08fb3',
    '0bdde13e-8848-4d49-a929-69b78acba92c','0bf75491-7ad2-4d4d-b984-dfc815b32047','acef2116-a948-47bb-8bcd-aa39adcd7f7e',
    '7b545e0f-8322-4256-9de6-45fedbb6b4f3','d678cd76-1908-472e-9492-e2d5f421c133','87c5880c-22b7-47ef-bd16-7d4f69264377',
    '383653ae-1a79-4d2e-8509-579040bb1d0c','446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce','ddc19cca-72c2-4207-ab1c-21a376f11bc6',
    '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3','dfead070-ffaa-47c8-8304-9a449290d535','8706f108-5423-4ede-8598-f2e112073b22',
    '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4','df242323-1230-4f78-8d65-f0e75de30e24','290b9208-4a8d-437e-b147-4ee11387755a',
    '8c8e7bac-182d-4df3-844d-fdb734107eaf','6f67ed3b-afda-4a96-8682-c986c247a005','75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1',
    'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9','619a43d8-acf5-4c3b-b9b1-0037a5fbadb5','7ac481f8-64f1-41f4-8836-33128e19f6fe',
    'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a','52001439-da37-4844-8d35-69c132a2b1af','c19572c2-10f0-45a3-abd4-6053f41fd22f',
    'edd1ce4c-4caa-442f-9195-e84d7274adc9','c1141d36-657d-4b59-b2ee-bcd7901633e1','69b6d4dd-0ddc-45ad-86d9-e169c04f8305',
    'd645a78d-aacf-4743-9e7e-313916f31ebb','d9246788-96a5-4bb9-8fab-e4a9413ea283','abd7ec76-2471-4cb9-876e-e09808f23344',
    '0e6f076a-33ad-4cda-bdbd-49e32ed7d006','92655b42-54a5-4498-8d1e-468e9d171a30','836017e9-87c9-42da-9dd0-756e11772487',
    '6fd1a301-0c59-4518-90c1-52ea0d7816e2','6f6b3a55-83a7-4312-babf-d477a75f65af','5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b',
    'da9c29c8-9fcb-485b-a6f7-01e0e0f66013','dc69dd9d-b525-4a3c-9698-8a61acff4149','4e4e8a9d-9815-446f-9cd4-0189e77debf4',
    '44e83075-58b7-473d-a95d-de6f94d85df2','21b42fe6-3bca-447e-b3e3-f2f26bdc090d','e68ce31d-0b5f-4b28-8070-6e80e701f7d7',
    '199d5b3e-9697-4620-8b72-fea1aedf106e'
)
ORDER BY modulo, total_registros DESC;

-- ================================================================
-- PASSO 3: FINALIZAR MÓDULOS PARA ALUNOS APROVADOS
-- ================================================================
-- Marca como concluído TODAS as aulas do módulo + adiciona em modulos_finalizados_manual
-- para alunos que têm nota >= min_grade em pelo menos uma versão da prova.
SELECT 'PASSO 3: FINALIZANDO MÓDULOS PARA ALUNOS APROVADOS...' as info;

-- 3a: Criar tabela temporária com alunos aprovados por módulo
DROP TABLE IF EXISTS _tmp_aprovados;
CREATE TEMP TABLE _tmp_aprovados AS
WITH notas_por_modulo AS (
    SELECT
        ra.aluno_id,
        a.livro_id,
        MAX(ra.nota) AS melhor_nota,
        BOOL_OR(ra.nota >= COALESCE(a.min_grade, 7)) AS aprovado
    FROM respostas_aulas ra
    JOIN aulas a ON a.id = ra.aula_id
    WHERE ra.status = 'corrigida'
      AND ra.nota IS NOT NULL
      AND (a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true)
    GROUP BY ra.aluno_id, a.livro_id
)
SELECT
    nm.aluno_id,
    nm.livro_id,
    nm.melhor_nota,
    l.titulo AS modulo_titulo
FROM notas_por_modulo nm
JOIN livros l ON l.id = nm.livro_id
WHERE nm.aprovado = true
ORDER BY nm.aluno_id, l.titulo;

SELECT 'Alunos aprovados por módulo (para finalizar):' as info;
SELECT * FROM _tmp_aprovados;

-- 3b: Para cada aluno aprovado, marcar TODAS as aulas do módulo como concluídas no progresso
INSERT INTO progresso (aluno_id, aula_id, concluida, updated_at)
SELECT
    t.aluno_id,
    a.id AS aula_id,
    true,
    now()
FROM _tmp_aprovados t
JOIN aulas a ON a.livro_id = t.livro_id
WHERE NOT EXISTS (
    SELECT 1 FROM progresso p
    WHERE p.aluno_id = t.aluno_id
      AND p.aula_id = a.id
)
ON CONFLICT (aluno_id, aula_id) DO UPDATE
SET concluida = true, updated_at = EXCLUDED.updated_at;

-- 3c: Atualizar modulos_finalizados_manual na tabela users
-- Adiciona o livro_id ao array se ainda não estiver lá
UPDATE users SET
    modulos_finalizados_manual = ARRAY(
        SELECT DISTINCT unnest(
            COALESCE(modulos_finalizados_manual, ARRAY[]::UUID[]) || ARRAY(SELECT t.livro_id FROM _tmp_aprovados t WHERE t.aluno_id = users.id)
        )
    )
WHERE id IN (SELECT DISTINCT aluno_id FROM _tmp_aprovados);

-- ================================================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ================================================================
SELECT 'PASSO 4: VERIFICAÇÃO FINAL' as info;

SELECT 'Órfãos restantes em respostas_aulas:' as info;
SELECT COUNT(*) FROM respostas_aulas r LEFT JOIN aulas a ON r.aula_id = a.id WHERE a.id IS NULL;

SELECT 'Órfãos restantes em progresso:' as info;
SELECT COUNT(*) FROM progresso p LEFT JOIN aulas a ON p.aula_id = a.id WHERE a.id IS NULL;

SELECT 'Alunos com módulos finalizados (resumo):' as info;
SELECT
    u.nome,
    u.email,
    array_length(u.modulos_finalizados_manual, 1) AS modulos_finalizados,
    u.modulos_finalizados_manual
FROM users u
WHERE u.modulos_finalizados_manual IS NOT NULL
  AND array_length(u.modulos_finalizados_manual, 1) > 0
ORDER BY u.nome;

SELECT 'Progresso por aluno (total concluídas):' as info;
SELECT
    u.nome,
    COUNT(p.id) FILTER (WHERE p.concluida = true) AS concluidas,
    COUNT(p.id) AS total
FROM users u
JOIN progresso p ON p.aluno_id = u.id
GROUP BY u.id, u.nome
ORDER BY concluidas DESC;

-- ================================================================
-- PASSO 5: BOLETIM - NOTAS FINAIS DOS ALUNOS POR MÓDULO
-- ================================================================
SELECT 'PASSO 5: BOLETIM - NOTAS FINAIS POR ALUNO/MÓDULO' as info;
SELECT
    u.nome AS aluno,
    u.email,
    c.nome AS curso,
    l.titulo AS modulo,
    l.ordem AS modulo_ordem,
    MAX(CASE WHEN a.versao = 1 THEN ra.nota END) AS v1,
    MAX(CASE WHEN a.versao = 2 THEN ra.nota END) AS v2,
    MAX(CASE WHEN a.versao = 3 THEN ra.nota END) AS v3,
    MAX(ra.nota) AS melhor_nota,
    COALESCE(a.min_grade, 7) AS nota_minima,
    CASE WHEN MAX(ra.nota) >= COALESCE(a.min_grade, 7) THEN 'APROVADO' ELSE 'REPROVADO' END AS situacao,
    COUNT(DISTINCT ra.aula_id) AS tentativas
FROM public.respostas_aulas ra
JOIN public.aulas a ON a.id = ra.aula_id
JOIN public.livros l ON l.id = a.livro_id
JOIN public.cursos c ON c.id = l.curso_id
JOIN public.users u ON u.id = ra.aluno_id
WHERE ra.status = 'corrigida'
  AND (a.tipo IN ('prova', 'avaliacao') OR a.is_bloco_final = true)
GROUP BY u.id, u.nome, u.email, c.nome, c.id, l.id, l.titulo, l.ordem, a.min_grade
ORDER BY c.nome, l.ordem, u.nome;
