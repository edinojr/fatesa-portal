-- CORRECAO: Atualiza aula_id nas respostas orfas de AVALIACOES
-- Execute este script SOMENTE apos verificar o resultado do script 20

-- Hebreus: 3 avaliacoes
UPDATE respostas_aulas SET aula_id = 'e50aa7eb-49dc-4a60-8a44-62833cb634b1' WHERE aula_id = 'cca138c2-f8fb-4e5a-ba5c-4cbda81f8eed';
UPDATE respostas_aulas SET aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3' WHERE aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883';
UPDATE respostas_aulas SET aula_id = '82585e3b-12cd-4a30-9d5a-802891d6d751' WHERE aula_id = '8e3c0dc6-e4cf-4500-9fd0-a9e900be2efe';

-- Espirito Santo: 3 avaliacoes
UPDATE respostas_aulas SET aula_id = '2d523cdd-0750-4000-b23b-eed9f5395597' WHERE aula_id = '30190d06-b324-4b77-8435-b2eb63e4e55f';
UPDATE respostas_aulas SET aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915' WHERE aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1';
UPDATE respostas_aulas SET aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc' WHERE aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3';

-- Epistolas Paulinas I: 3 avaliacoes
UPDATE respostas_aulas SET aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b' WHERE aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c';
UPDATE respostas_aulas SET aula_id = '02eeda0a-006a-411c-9329-09f823f3c8ac' WHERE aula_id = '0bf75491-7ad2-4d4d-b984-dfc815b32047';
UPDATE respostas_aulas SET aula_id = '6e948e2e-e764-4e6e-89a6-4d7eeec487e0' WHERE aula_id = 'acef2116-a948-47bb-8bcd-aa39adcd7f7e';

-- Teologia Pratica: 3 avaliacoes
UPDATE respostas_aulas SET aula_id = '6392d5a1-5700-43d5-9b82-86f2a7cad49e' WHERE aula_id = '7b545e0f-8322-4256-9de6-45fedbb6b4f3';
UPDATE respostas_aulas SET aula_id = 'd8e5a096-c925-4d5f-839f-65c160059ad4' WHERE aula_id = 'd678cd76-1908-472e-9492-e2d5f421c133';
UPDATE respostas_aulas SET aula_id = 'df1d4c28-2c2a-410e-adc2-9254d054053e' WHERE aula_id = '87c5880c-22b7-47ef-bd16-7d4f69264377';

-- Verificar resultado
SELECT 
  a.titulo,
  a.livro_id,
  COUNT(*) as total_respostas,
  ROUND(AVG(r.nota)::numeric, 2) as nota_media,
  COUNT(CASE WHEN r.status = 'corrigida' THEN 1 END) as corrigidas,
  COUNT(CASE WHEN r.status = 'pendente' THEN 1 END) as pendentes
FROM respostas_aulas r
JOIN aulas a ON r.aula_id = a.id
WHERE a.tipo = 'avaliacao'
AND r.created_at < '2026-06-01'
GROUP BY a.titulo, a.livro_id
ORDER BY a.titulo;
