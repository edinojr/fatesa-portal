-- Script 36: Diagnóstico - Verificar quais IDs antigos ainda existem
-- Executar este primeiro para entender o que falta

-- 1. IDs antigos mapeados que ainda existem (deviam ter sido corrigidos)
SELECT 
    'IDs antigos mapeados ainda existem' as status,
    COUNT(*) as total
FROM respostas_aulas r
WHERE r.aula_id IN (
    -- Hebreus Avaliacao
    'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed',
    '778a7d2d-d046-475a-8f5d-5ea59700d883',
    '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe',
    -- Espirito Santo Avaliacao
    '30190d06-b324-4b77-8435-b2eb63e4e55f',
    'e6f7a766-dca2-46ec-b875-935a02f649b1',
    '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3',
    -- Epistolas Paulinas I Avaliacao
    '0bdde13e-8848-4d49-a929-69b78acba92c',
    '0bf75491-7ad2-4d4d-b984-dfc815b32047',
    'acef2116-a948-47bb-8bcd-aa39adcd7f7e',
    -- Teologia Pratica Avaliacao
    '7b545e0f-8322-4256-9de6-45fedbb6b4f3',
    'd678cd76-1908-472e-9492-e2d5f421c133',
    '87c5880c-22b7-47ef-bd16-7d4f69264377',
    -- Hebreus L1-L10
    '383653ae-1a79-4d2e-8509-579040bb1d0c',
    '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce',
    'ddc19cca-72c2-4207-ab1c-21a376f11bc6',
    '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3',
    'dfead070-ffaa-47c8-8304-9a449290d535',
    '8706f108-5423-4ede-8598-f2e112073b22',
    '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4',
    'df242323-1230-4f78-8d65-f0e75de30e24',
    '290b9208-4a8d-437e-b147-4ee11387755a',
    '8c8e7bac-182d-4df3-844d-fdb734107eaf',
    -- Espirito Santo L1-L10
    '6f67ed3b-afda-4a96-8682-c986c247a005',
    '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1',
    'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9',
    '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5',
    '7ac481f8-64f1-41f4-8836-33128e19f6fe',
    'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a',
    '52001439-da37-4844-8d35-69c132a2b1af',
    'c19572c2-10f0-45a3-abd4-6053f41fd22f',
    'edd1ce4c-4caa-442f-9195-e84d7274adc9',
    'c1141d36-657d-4b59-b2ee-bcd7901633e1',
    -- Epistolas Paulinas I L1-L10
    '69b6d4dd-0ddc-45ad-86d9-e169c04f8305',
    'd645a78d-aacf-4743-9e7e-313916f31ebb',
    'd9246788-96a5-4bb9-8fab-e4a9413ea283',
    'abd7ec76-2471-4cb9-876e-e09808f23344',
    '0e6f076a-33ad-4cda-bdbd-49e32ed7d006',
    '92655b42-54a5-4498-8d1e-468e9d171a30',
    '836017e9-87c9-42da-9dd0-756e11772487',
    '6fd1a301-0c59-4518-90c1-52ea0d7816e2',
    '6f6b3a55-83a7-4312-babf-d477a75f65af',
    '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b',
    -- Teologia Pratica L1-L7
    'da9c29c8-9fcb-485b-a6f7-01e0e0f66013',
    'dc69dd9d-b525-4a3c-9698-8a61acff4149',
    '4e4e8a9d-9815-446f-9cd4-0189e77debf4',
    '44e83075-58b7-473d-a95d-de6f94d85df2',
    '21b42fe6-3bca-447e-b3e3-f2f26bdc090d',
    'e68ce31d-0b5f-4b28-8070-6e80e701f7d7',
    '199d5b3e-9697-4620-8b72-fea1aedf106e'
);

-- 2. Detalhes dos IDs antigos que ainda existem
SELECT 
    r.aula_id as old_id,
    COUNT(*) as total_registros,
    MIN(r.created_at) as primeira_data,
    MAX(r.created_at) as ultima_data
FROM respostas_aulas r
WHERE r.aula_id IN (
    'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed',
    '778a7d2d-d046-475a-8f5d-5ea59700d883',
    '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe',
    '30190d06-b324-4b77-8435-b2eb63e4e55f',
    'e6f7a766-dca2-46ec-b875-935a02f649b1',
    '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3',
    '0bdde13e-8848-4d49-a929-69b78acba92c',
    '0bf75491-7ad2-4d4d-b984-dfc815b32047',
    'acef2116-a948-47bb-8bcd-aa39adcd7f7e',
    '7b545e0f-8322-4256-9de6-45fedbb6b4f3',
    'd678cd76-1908-472e-9492-e2d5f421c133',
    '87c5880c-22b7-47ef-bd16-7d4f69264377',
    '383653ae-1a79-4d2e-8509-579040bb1d0c',
    '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce',
    'ddc19cca-72c2-4207-ab1c-21a376f11bc6',
    '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3',
    'dfead070-ffaa-47c8-8304-9a449290d535',
    '8706f108-5423-4ede-8598-f2e112073b22',
    '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4',
    'df242323-1230-4f78-8d65-f0e75de30e24',
    '290b9208-4a8d-437e-b147-4ee11387755a',
    '8c8e7bac-182d-4df3-844d-fdb734107eaf',
    '6f67ed3b-afda-4a96-8682-c986c247a005',
    '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1',
    'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9',
    '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5',
    '7ac481f8-64f1-41f4-8836-33128e19f6fe',
    'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a',
    '52001439-da37-4844-8d35-69c132a2b1af',
    'c19572c2-10f0-45a3-abd4-6053f41fd22f',
    'edd1ce4c-4caa-442f-9195-e84d7274adc9',
    'c1141d36-657d-4b59-b2ee-bcd7901633e1',
    '69b6d4dd-0ddc-45ad-86d9-e169c04f8305',
    'd645a78d-aacf-4743-9e7e-313916f31ebb',
    'd9246788-96a5-4bb9-8fab-e4a9413ea283',
    'abd7ec76-2471-4cb9-876e-e09808f23344',
    '0e6f076a-33ad-4cda-bdbd-49e32ed7d006',
    '92655b42-54a5-4498-8d1e-468e9d171a30',
    '836017e9-87c9-42da-9dd0-756e11772487',
    '6fd1a301-0c59-4518-90c1-52ea0d7816e2',
    '6f6b3a55-83a7-4312-babf-d477a75f65af',
    '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b',
    'da9c29c8-9fcb-485b-a6f7-01e0e0f66013',
    'dc69dd9d-b525-4a3c-9698-8a61acff4149',
    '4e4e8a9d-9815-446f-9cd4-0189e77debf4',
    '44e83075-58b7-473d-a95d-de6f94d85df2',
    '21b42fe6-3bca-447e-b3e3-f2f26bdc090d',
    'e68ce31d-0b5f-4b28-8070-6e80e701f7d7',
    '199d5b3e-9697-4620-8b72-fea1aedf106e'
)
GROUP BY r.aula_id
ORDER BY total_registros DESC;

-- 3. IDs NOVOS que nunca foram mapeados (não estão na lista acima)
SELECT 
    r.aula_id as new_id,
    COUNT(*) as total_registros,
    MIN(r.created_at) as primeira_data,
    MAX(r.created_at) as ultima_data,
    ROUND(AVG(r.nota)::numeric, 2) as nota_media
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
AND r.aula_id NOT IN (
    'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed',
    '778a7d2d-d046-475a-8f5d-5ea59700d883',
    '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe',
    '30190d06-b324-4b77-8435-b2eb63e4e55f',
    'e6f7a766-dca2-46ec-b875-935a02f649b1',
    '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3',
    '0bdde13e-8848-4d49-a929-69b78acba92c',
    '0bf75491-7ad2-4d4d-b984-dfc815b32047',
    'acef2116-a948-47bb-8bcd-aa39adcd7f7e',
    '7b545e0f-8322-4256-9de6-45fedbb6b4f3',
    'd678cd76-1908-472e-9492-e2d5f421c133',
    '87c5880c-22b7-47ef-bd16-7d4f69264377',
    '383653ae-1a79-4d2e-8509-579040bb1d0c',
    '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce',
    'ddc19cca-72c2-4207-ab1c-21a376f11bc6',
    '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3',
    'dfead070-ffaa-47c8-8304-9a449290d535',
    '8706f108-5423-4ede-8598-f2e112073b22',
    '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4',
    'df242323-1230-4f78-8d65-f0e75de30e24',
    '290b9208-4a8d-437e-b147-4ee11387755a',
    '8c8e7bac-182d-4df3-844d-fdb734107eaf',
    '6f67ed3b-afda-4a96-8682-c986c247a005',
    '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1',
    'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9',
    '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5',
    '7ac481f8-64f1-41f4-8836-33128e19f6fe',
    'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a',
    '52001439-da37-4844-8d35-69c132a2b1af',
    'c19572c2-10f0-45a3-abd4-6053f41fd22f',
    'edd1ce4c-4caa-442f-9195-e84d7274adc9',
    'c1141d36-657d-4b59-b2ee-bcd7901633e1',
    '69b6d4dd-0ddc-45ad-86d9-e169c04f8305',
    'd645a78d-aacf-4743-9e7e-313916f31ebb',
    'd9246788-96a5-4bb9-8fab-e4a9413ea283',
    'abd7ec76-2471-4cb9-876e-e09808f23344',
    '0e6f076a-33ad-4cda-bdbd-49e32ed7d006',
    '92655b42-54a5-4498-8d1e-468e9d171a30',
    '836017e9-87c9-42da-9dd0-756e11772487',
    '6fd1a301-0c59-4518-90c1-52ea0d7816e2',
    '6f6b3a55-83a7-4312-babf-d477a75f65af',
    '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b',
    'da9c29c8-9fcb-485b-a6f7-01e0e0f66013',
    'dc69dd9d-b525-4a3c-9698-8a61acff4149',
    '4e4e8a9d-9815-446f-9cd4-0189e77debf4',
    '44e83075-58b7-473d-a95d-de6f94d85df2',
    '21b42fe6-3bca-447e-b3e3-f2f26bdc090d',
    'e68ce31d-0b5f-4b28-8070-6e80e701f7d7',
    '199d5b3e-9697-4620-8b72-fea1aedf106e'
)
GROUP BY r.aula_id
ORDER BY total_registros DESC;
