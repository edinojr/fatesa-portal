-- Delete e update individual para cada ID restante
-- Hebreus
DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3') AND aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883';
UPDATE respostas_aulas SET aula_id = '9a94f0ee-62ac-4969-b803-a93645775de3' WHERE aula_id = '778a7d2d-d046-475a-8f5d-5ea59700d883';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6') AND aula_id = 'ddc19cca-72c2-4207-ab1c-21a376f11bc6';
UPDATE respostas_aulas SET aula_id = 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6' WHERE aula_id = 'ddc19cca-72c2-4207-ab1c-21a376f11bc6';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8') AND aula_id = '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3';
UPDATE respostas_aulas SET aula_id = 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8' WHERE aula_id = '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '13cffb43-7357-4768-a9ad-af082b47218e') AND aula_id = 'dfead070-ffaa-47c8-8304-9a449290d535';
UPDATE respostas_aulas SET aula_id = '13cffb43-7357-4768-a9ad-af082b47218e' WHERE aula_id = 'dfead070-ffaa-47c8-8304-9a449290d535';

-- Espirito Santo
DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '16d832ce-0fb3-4b86-b5a9-2bb21ef46451') AND aula_id = '6f67ed3b-afda-4a96-8682-c986c247a005';
UPDATE respostas_aulas SET aula_id = '16d832ce-0fb3-4b86-b5a9-2bb21ef46451' WHERE aula_id = '6f67ed3b-afda-4a96-8682-c986c247a005';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '0649ca5d-e18a-49cb-b86a-7c69703dab83') AND aula_id = '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1';
UPDATE respostas_aulas SET aula_id = '0649ca5d-e18a-49cb-b86a-7c69703dab83' WHERE aula_id = '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d') AND aula_id = 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9';
UPDATE respostas_aulas SET aula_id = 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d' WHERE aula_id = 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '124ee5be-e30a-4dbe-aaa2-044b620b44d4') AND aula_id = '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5';
UPDATE respostas_aulas SET aula_id = '124ee5be-e30a-4dbe-aaa2-044b620b44d4' WHERE aula_id = '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'c735f05d-826a-4198-b054-e81ddccf48f4') AND aula_id = '7ac481f8-64f1-41f4-8836-33128e19f6fe';
UPDATE respostas_aulas SET aula_id = 'c735f05d-826a-4198-b054-e81ddccf48f4' WHERE aula_id = '7ac481f8-64f1-41f4-8836-33128e19f6fe';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '19a2a430-169b-4efe-83bf-fe2400874100') AND aula_id = 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a';
UPDATE respostas_aulas SET aula_id = '19a2a430-169b-4efe-83bf-fe2400874100' WHERE aula_id = 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '2440220f-2d36-4bb7-a2bb-b7ff68a317d8') AND aula_id = '52001439-da37-4844-8d35-69c132a2b1af';
UPDATE respostas_aulas SET aula_id = '2440220f-2d36-4bb7-a2bb-b7ff68a317d8' WHERE aula_id = '52001439-da37-4844-8d35-69c132a2b1af';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '1441dcbc-c0a9-4042-a716-898ae3d2df2a') AND aula_id = 'c19572c2-10f0-45a3-abd4-6053f41fd22f';
UPDATE respostas_aulas SET aula_id = '1441dcbc-c0a9-4042-a716-898ae3d2df2a' WHERE aula_id = 'c19572c2-10f0-45a3-abd4-6053f41fd22f';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'e73b31a4-5911-427a-98d3-00fc123457da') AND aula_id = 'edd1ce4c-4caa-442f-9195-e84d7274adc9';
UPDATE respostas_aulas SET aula_id = 'e73b31a4-5911-427a-98d3-00fc123457da' WHERE aula_id = 'edd1ce4c-4caa-442f-9195-e84d7274adc9';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '4340c9e0-5ee0-4037-b2da-2827c5ee89d1') AND aula_id = 'c1141d36-657d-4b59-b2ee-bcd7901633e1';
UPDATE respostas_aulas SET aula_id = '4340c9e0-5ee0-4037-b2da-2827c5ee89d1' WHERE aula_id = 'c1141d36-657d-4b59-b2ee-bcd7901633e1';

DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'f18506b3-9974-4798-ab14-41b7f6cdad91') AND aula_id = 'd645a78d-aacf-4743-9e7e-313916f31ebb';
UPDATE respostas_aulas SET aula_id = 'f18506b3-9974-4798-ab14-41b7f6cdad91' WHERE aula_id = 'd645a78d-aacf-4743-9e7e-313916f31ebb';

-- Paulinas I
DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b') AND aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c';
UPDATE respostas_aulas SET aula_id = 'd4a586e6-77c0-4b65-b98a-249a348b663b' WHERE aula_id = '0bdde13e-8848-4d49-a929-69b78acba92c';

-- Espirito Santo Recuperacao
DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc') AND aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3';
UPDATE respostas_aulas SET aula_id = '4b5c237f-d7ba-47bc-b52f-6cae31d0d6bc' WHERE aula_id = '8e3cbe49-a4d1-447f-bc29-468eb6e08fb3';

-- Espirito Santo 2a Recuperacao
DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915') AND aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1';
UPDATE respostas_aulas SET aula_id = 'e0f043d7-6cb5-446e-90a5-1515037ac915' WHERE aula_id = 'e6f7a766-dca2-46ec-b875-935a02f649b1';

-- Teologia L4
DELETE FROM respostas_aulas WHERE aluno_id IN (SELECT r_new.aluno_id FROM respostas_aulas r_new WHERE r_new.aula_id = '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3') AND aula_id = '44e83075-58b7-473d-a95d-de6f94d85df2';
UPDATE respostas_aulas SET aula_id = '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3' WHERE aula_id = '44e83075-58b7-473d-a95d-de6f94d85df2';
