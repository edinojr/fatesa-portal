-- PASSO 1: DELETE conflitos para IDs ja mapeados (sem filtro de data)
DELETE FROM respostas_aulas r_old
WHERE r_old.aula_id IN (
  'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9'::uuid,
  '778a7d2d-d046-475a-8f5d-5ea59700d883'::uuid,
  'edd1ce4c-4caa-442f-9195-e84d7274adc9'::uuid,
  'd645a78d-aacf-4743-9e7e-313916f31ebb'::uuid,
  '52001439-da37-4844-8d35-69c132a2b1af'::uuid,
  '6f67ed3b-afda-4a96-8682-c986c247a005'::uuid,
  'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a'::uuid,
  'c1141d36-657d-4b59-b2ee-bcd7901633e1'::uuid,
  '0bdde13e-8848-4d49-a929-69b78acba92c'::uuid,
  '7ac481f8-64f1-41f4-8836-33128e19f6fe'::uuid,
  '44e83075-58b7-473d-a95d-de6f94d85df2'::uuid,
  '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5'::uuid,
  '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1'::uuid,
  '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3'::uuid,
  '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3'::uuid,
  'c19572c2-10f0-45a3-abd4-6053f41fd22f'::uuid,
  'ddc19cca-72c2-4207-ab1c-21a376f11bc6'::uuid,
  'dfead070-ffaa-47c8-8304-9a449290d535'::uuid,
  'e6f7a766-dca2-46ec-b875-935a02f649b1'::uuid
)
AND EXISTS (
  SELECT 1 FROM respostas_aulas r_new
  WHERE r_new.aluno_id = r_old.aluno_id
  AND r_new.aula_id = (CASE r_old.aula_id::text
    WHEN 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9' THEN 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d'::uuid
    WHEN '778a7d2d-d046-475a-8f5d-5ea59700d883' THEN '9a94f0ee-62ac-4969-b803-a93645775de3'::uuid
    WHEN 'edd1ce4c-4caa-442f-9195-e84d7274adc9' THEN 'e73b31a4-5911-427a-98d3-00fc123457da'::uuid
    WHEN 'd645a78d-aacf-4743-9e7e-313916f31ebb' THEN 'f18506b3-9974-4798-ab14-41b7f6cdad91'::uuid
    WHEN '52001439-da37-4844-8d35-69c132a2b1af' THEN '2440220f-2d36-4bb7-a2bb-b7ff68a317d8'::uuid
    WHEN '6f67ed3b-afda-4a96-8682-c986c247a005' THEN '16d832ce-0fb3-4b86-b5a9-2bb21ef46451'::uuid
    WHEN 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a' THEN '19a2a430-169b-4efe-83bf-fe2400874100'::uuid
    WHEN 'c1141d36-657d-4b59-b2ee-bcd7901633e1' THEN '4340c9e0-5ee0-4037-b2da-2827c5ee89d1'::uuid
    WHEN '0bdde13e-8848-4d49-a929-69b78acba92c' THEN 'd4a586e6-77c0-4b65-b98a-249a348b663b'::uuid
    WHEN '7ac481f8-64f1-41f4-8836-33128e19f6fe' THEN 'c735f05d-826a-4198-b054-e81ddccf48f4'::uuid
    WHEN '44e83075-58b7-473d-a95d-de6f94d85df2' THEN '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3'::uuid
    WHEN '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5' THEN '124ee5be-e30a-4dbe-aaa2-044b620b44d4'::uuid
    WHEN '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1' THEN '0649ca5d-e18a-49cb-b86a-7c69703dab83'::uuid
    WHEN '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3' THEN '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc'::uuid
    WHEN '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3' THEN 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8'::uuid
    WHEN 'c19572c2-10f0-45a3-abd4-6053f41fd22f' THEN '1441dcbc-c0a9-4042-a716-898ae3d2df2a'::uuid
    WHEN 'ddc19cca-72c2-4207-ab1c-21a376f11bc6' THEN 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6'::uuid
    WHEN 'dfead070-ffaa-47c8-8304-9a449290d535' THEN '13cffb43-7357-4768-a9ad-af082b47218e'::uuid
    WHEN 'e6f7a766-dca2-46ec-b875-935a02f649b1' THEN 'e0f043d7-6cb5-446e-90a5-1515037ac915'::uuid
  END)
);

-- PASSO 2: UPDATE restantes (sem filtro de data)
UPDATE respostas_aulas SET aula_id = 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d' WHERE aula_id = 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9';
UPDATE respostas_aulas SET aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3' WHERE aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883';
UPDATE respostas_aulas SET aula_id = 'e73b31a4-5911-427a-98d3-00fc123457da' WHERE aula_id = 'edd1ce4c-4caa-442f-9195-e84d7274adc9';
UPDATE respostas_aulas SET aula_id = 'f18506b3-9974-4798-ab14-41b7f6cdad91' WHERE aula_id = 'd645a78d-aacf-4743-9e7e-313916f31ebb';
UPDATE respostas_aulas SET aula_id = '2440220f-2d36-4bb7-a2bb-b7ff68a317d8' WHERE aula_id = '52001439-da37-4844-8d35-69c132a2b1af';
UPDATE respostas_aulas SET aula_id = '16d832ce-0fb3-4b86-b5a9-2bb21ef46451' WHERE aula_id = '6f67ed3b-afda-4a96-8682-c986c247a005';
UPDATE respostas_aulas SET aula_id = '19a2a430-169b-4efe-83bf-fe2400874100' WHERE aula_id = 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a';
UPDATE respostas_aulas SET aula_id = '4340c9e0-5ee0-4037-b2da-2827c5ee89d1' WHERE aula_id = 'c1141d36-657d-4b59-b2ee-bcd7901633e1';
UPDATE respostas_aulas SET aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b' WHERE aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c';
UPDATE respostas_aulas SET aula_id = 'c735f05d-826a-4198-b054-e81ddccf48f4' WHERE aula_id = '7ac481f8-64f1-41f4-8836-33128e19f6fe';
UPDATE respostas_aulas SET aula_id = '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3' WHERE aula_id = '44e83075-58b7-473d-a95d-de6f94d85df2';
UPDATE respostas_aulas SET aula_id = '124ee5be-e30a-4dbe-aaa2-044b620b44d4' WHERE aula_id = '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5';
UPDATE respostas_aulas SET aula_id = '0649ca5d-e18a-49cb-b86a-7c69703dab83' WHERE aula_id = '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1';
UPDATE respostas_aulas SET aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc' WHERE aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3';
UPDATE respostas_aulas SET aula_id = 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8' WHERE aula_id = '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3';
UPDATE respostas_aulas SET aula_id = '1441dcbc-c0a9-4042-a716-898ae3d2df2a' WHERE aula_id = 'c19572c2-10f0-45a3-abd4-6053f41fd22f';
UPDATE respostas_aulas SET aula_id = 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6' WHERE aula_id = 'ddc19cca-72c2-4207-ab1c-21a376f11bc6';
UPDATE respostas_aulas SET aula_id = '13cffb43-7357-4768-a9ad-af082b47218e' WHERE aula_id = 'dfead070-ffaa-47c8-8304-9a449290d535';
UPDATE respostas_aulas SET aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915' WHERE aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1';
