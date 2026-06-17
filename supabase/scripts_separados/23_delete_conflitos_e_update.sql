-- ESTRATEGIA: 
-- 1. DELETE respostas antigas onde o aluno JA TEM resposta na aula nova (manter a nova)
-- 2. UPDATE respostas antigas restantes para o ID novo

-- PASSO 1: Deletar respostas antigas CONFLITANTES (aluno ja tem nota na aula nova)
DELETE FROM respostas_aulas r_old
WHERE r_old.aula_id IN (
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
  '87c5880c-22b7-47ef-bd16-7d4f69264377'
)
AND r_old.created_at < '2026-06-01'
AND EXISTS (
  SELECT 1 FROM respostas_aulas r_new
  WHERE r_new.aluno_id = r_old.aluno_id
  AND r_new.aula_id = CASE r_old.aula_id
    WHEN 'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed' THEN 'e50aa7eb-49dc-4a60-8a44-62833cb634b1'
    WHEN '778a7d2d-d046-475a-8f5d-5ea59700d883' THEN '9a94f0ee-62ac-4969-b803-a93645775de3'
    WHEN '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe' THEN '82585e3b-12cd-4a30-9d5a-802891d6d751'
    WHEN '30190d06-b324-4b77-8435-b2eb63e4e55f' THEN '2d523cdd-0750-4000-b23b-eed9f5395597'
    WHEN 'e6f7a766-dca2-46ec-b875-935a02f649b1' THEN 'e0f043d7-6cb5-446e-90a5-1515037ac915'
    WHEN '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3' THEN '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc'
    WHEN '0bdde13e-8848-4d49-a929-69b78acba92c' THEN 'd4a586e6-77c0-4b65-b98a-249a348b663b'
    WHEN '0bf75491-7ad2-4d4d-b984-dfc815b32047' THEN '02eeda0a-006a-411c-9329-09f823f3c8ac'
    WHEN 'acef2116-a948-47bb-8bcd-aa39adcd7f7e' THEN '6e948e2e-e764-4e6e-89a6-4d7eeec487e0'
    WHEN '7b545e0f-8322-4256-9de6-45fedbb6b4f3' THEN '6392d5a1-5700-43d5-9b82-86f2a7cad49e'
    WHEN 'd678cd76-1908-472e-9492-e2d5f421c133' THEN 'd8e5a096-c925-4d5f-839f-65c160059ad4'
    WHEN '87c5880c-22b7-47ef-bd16-7d4f69264377' THEN 'df1d4c28-2c2a-410e-adc2-9254d054053e'
  END
);

-- PASSO 2: Atualizar respostas restantes (sem conflito)
UPDATE respostas_aulas SET aula_id = 'e50aa7eb-49dc-4a60-8a44-62833cb634b1' WHERE aula_id = 'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3' WHERE aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '82585e3b-12cd-4a30-9d5a-802891d6d751' WHERE aula_id = '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '2d523cdd-0750-4000-b23b-eed9f5395597' WHERE aula_id = '30190d06-b324-4b77-8435-b2eb63e4e55f' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915' WHERE aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc' WHERE aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b' WHERE aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '02eeda0a-006a-411c-9329-09f823f3c8ac' WHERE aula_id = '0bf75491-7ad2-4d4d-b984-dfc815b32047' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '6e948e2e-e764-4e6e-89a6-4d7eeec487e0' WHERE aula_id = 'acef2116-a948-47bb-8bcd-aa39adcd7f7e' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = '6392d5a1-5700-43d5-9b82-86f2a7cad49e' WHERE aula_id = '7b545e0f-8322-4256-9de6-45fedbb6b4f3' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = 'd8e5a096-c925-4d5f-839f-65c160059ad4' WHERE aula_id = 'd678cd76-1908-472e-9492-e2d5f421c133' AND created_at < '2026-06-01';
UPDATE respostas_aulas SET aula_id = 'df1d4c28-2c2a-410e-adc2-9254d054053e' WHERE aula_id = '87c5880c-22b7-47ef-bd16-7d4f69264377' AND created_at < '2026-06-01';
