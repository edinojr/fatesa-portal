-- DELETE conflitos primeiro (aluno ja tem resposta na aula nova do exercicio)
DELETE FROM respostas_aulas r_old
WHERE r_old.aula_id IN (
  '383653ae-1a79-4d2e-8509-579040bb1d0c'::uuid,
  '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce'::uuid,
  'ddc19cca-72c2-4207-ab1c-21a376f11bc6'::uuid,
  '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3'::uuid,
  'dfead070-ffaa-47c8-8304-9a449290d535'::uuid,
  '8706f108-5423-4ede-8598-f2e112073b22'::uuid,
  '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4'::uuid,
  'df242323-1230-4f78-8d65-f0e75de30e24'::uuid,
  '290b9208-4a8d-437e-b147-4ee11387755a'::uuid,
  '8c8e7bac-182d-4df3-844d-fdb734107eaf'::uuid,
  '6f67ed3b-afda-4a96-8682-c986c247a005'::uuid,
  '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1'::uuid,
  'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9'::uuid,
  '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5'::uuid,
  '7ac481f8-64f1-41f4-8836-33128e19f6fe'::uuid,
  'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a'::uuid,
  '52001439-da37-4844-8d35-69c132a2b1af'::uuid,
  'c19572c2-10f0-45a3-abd4-6053f41fd22f'::uuid,
  'edd1ce4c-4caa-442f-9195-e84d7274adc9'::uuid,
  'c1141d36-657d-4b59-b2ee-bcd7901633e1'::uuid,
  '69b6d4dd-0ddc-45ad-86d9-e169c04f8305'::uuid,
  'd645a78d-aacf-4743-9e7e-313916f31ebb'::uuid,
  'd9246788-96a5-4bb9-8fab-e4a9413ea283'::uuid,
  'abd7ec76-2471-4cb9-876e-e09808f23344'::uuid,
  '0e6f076a-33ad-4cda-bdbd-49e32ed7d006'::uuid,
  '92655b42-54a5-4498-8d1e-468e9d171a30'::uuid,
  '836017e9-87c9-42da-9dd0-756e11772487'::uuid,
  '6fd1a301-0c59-4518-90c1-52ea0d7816e2'::uuid,
  '6f6b3a55-83a7-4312-babf-d477a75f65af'::uuid,
  '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b'::uuid,
  'da9c29c8-9fcb-485b-a6f7-01e0e0f66013'::uuid,
  'dc69dd9d-b525-4a3c-9698-8a61acff4149'::uuid,
  '4e4e8a9d-9815-446f-9cd4-0189e77debf4'::uuid,
  '44e83075-58b7-473d-a95d-de6f94d85df2'::uuid,
  '21b42fe6-3bca-447e-b3e3-f2f26bdc090d'::uuid,
  'e68ce31d-0b5f-4b28-8070-6e80e701f7d7'::uuid,
  '199d5b3e-9697-4620-8b72-fea1aedf106e'::uuid
)
AND r_old.created_at < '2026-06-01'
AND EXISTS (
  SELECT 1 FROM respostas_aulas r_new
  WHERE r_new.aluno_id = r_old.aluno_id
  AND r_new.aula_id = (CASE r_old.aula_id::text
    WHEN '383653ae-1a79-4d2e-8509-579040bb1d0c' THEN '485019a4-f6ef-48a2-9d82-e62449289f5c'::uuid
    WHEN '446ee260-6bf3-4fd9-b52d-37c0a3fbd2ce' THEN '3812dd79-9f1d-4f03-b56f-0e71073f48a1'::uuid
    WHEN 'ddc19cca-72c2-4207-ab1c-21a376f11bc6' THEN 'c9a2627d-94cd-4b67-9f5b-2f4321ee79e6'::uuid
    WHEN '9d7adcf7-e64c-4dfd-9753-127f8d55e7c3' THEN 'b9bd9539-1db3-4936-9fd2-7d5f14d80fe8'::uuid
    WHEN 'dfead070-ffaa-47c8-8304-9a449290d535' THEN '13cffb43-7357-4768-a9ad-af082b47218e'::uuid
    WHEN '8706f108-5423-4ede-8598-f2e112073b22' THEN '89a64e51-6fd3-4343-9a72-263934fd296c'::uuid
    WHEN '57b445f4-2e72-40ac-ad31-e2cafd3dc4f4' THEN '2d81d42f-92e2-4700-8c8f-4a6400b86890'::uuid
    WHEN 'df242323-1230-4f78-8d65-f0e75de30e24' THEN '88f77fe7-5cd6-492a-9873-a623a3a54057'::uuid
    WHEN '290b9208-4a8d-437e-b147-4ee11387755a' THEN '7e9f1f37-f52f-4f6e-835d-1b2c73eea6af'::uuid
    WHEN '8c8e7bac-182d-4df3-844d-fdb734107eaf' THEN '3cb3f89f-e818-4739-b4f5-4457223e69c7'::uuid
    WHEN '6f67ed3b-afda-4a96-8682-c986c247a005' THEN '16d832ce-0fb3-4b86-b5a9-2bb21ef46451'::uuid
    WHEN '75fc97f7-1267-4dc2-85f6-ef4d3a1b2fd1' THEN '0649ca5d-e18a-49cb-b86a-7c69703dab83'::uuid
    WHEN 'aa8b52f0-7d8c-4649-a4a2-b67fde2e2cd9' THEN 'b0b4b7d5-cc74-4e6b-9370-f8c7cbd2665d'::uuid
    WHEN '619a43d8-acf5-4c3b-b9b1-0037a5fbadb5' THEN '124ee5be-e30a-4dbe-aaa2-044b620b44d4'::uuid
    WHEN '7ac481f8-64f1-41f4-8836-33128e19f6fe' THEN 'c735f05d-826a-4198-b054-e81ddccf48f4'::uuid
    WHEN 'bd8c55b6-3a9f-4fe3-abdb-d0fbf969432a' THEN '19a2a430-169b-4efe-83bf-fe2400874100'::uuid
    WHEN '52001439-da37-4844-8d35-69c132a2b1af' THEN '2440220f-2d36-4bb7-a2bb-b7ff68a317d8'::uuid
    WHEN 'c19572c2-10f0-45a3-abd4-6053f41fd22f' THEN '1441dcbc-c0a9-4042-a716-898ae3d2df2a'::uuid
    WHEN 'edd1ce4c-4caa-442f-9195-e84d7274adc9' THEN 'e73b31a4-5911-427a-98d3-00fc123457da'::uuid
    WHEN 'c1141d36-657d-4b59-b2ee-bcd7901633e1' THEN '4340c9e0-5ee0-4037-b2da-2827c5ee89d1'::uuid
    WHEN '69b6d4dd-0ddc-45ad-86d9-e169c04f8305' THEN 'cced48a7-2c5b-497c-84d4-ed6d9ba448e6'::uuid
    WHEN 'd645a78d-aacf-4743-9e7e-313916f31ebb' THEN 'f18506b3-9974-4798-ab14-41b7f6cdad91'::uuid
    WHEN 'd9246788-96a5-4bb9-8fab-e4a9413ea283' THEN '95ce5654-b432-4cea-b57e-2d98e1aa9e01'::uuid
    WHEN 'abd7ec76-2471-4cb9-876e-e09808f23344' THEN '0e079957-8e16-4d5c-9af3-8a52e1a2ee81'::uuid
    WHEN '0e6f076a-33ad-4cda-bdbd-49e32ed7d006' THEN '7a0e0d97-a39a-4193-a92f-2a253f1eda3e'::uuid
    WHEN '92655b42-54a5-4498-8d1e-468e9d171a30' THEN 'c307c4d4-1393-4743-9e45-25713fe2cdd3'::uuid
    WHEN '836017e9-87c9-42da-9dd0-756e11772487' THEN '8fab7676-384e-4d2b-9a07-8d3981feae89'::uuid
    WHEN '6fd1a301-0c59-4518-90c1-52ea0d7816e2' THEN '0bbe08fd-68e0-45ed-b9e2-04020969e6b8'::uuid
    WHEN '6f6b3a55-83a7-4312-babf-d477a75f65af' THEN 'b247f584-78a8-48be-832c-ed11f824260e'::uuid
    WHEN '5e5b10f9-ee50-4b2f-a63f-35fa8dc8949b' THEN 'e6425963-457e-4909-bd72-e2ed7dfbb68d'::uuid
    WHEN 'da9c29c8-9fcb-485b-a6f7-01e0e0f66013' THEN '64c2f671-7492-467f-a8f9-7699598ec0c1'::uuid
    WHEN 'dc69dd9d-b525-4a3c-9698-8a61acff4149' THEN '7c07de26-6ff8-4e21-bfec-75ee3140adb4'::uuid
    WHEN '4e4e8a9d-9815-446f-9cd4-0189e77debf4' THEN 'ba4498b6-f907-49c2-9fd3-98b469cc756b'::uuid
    WHEN '44e83075-58b7-473d-a95d-de6f94d85df2' THEN '3848944f-abe0-4ca0-9be8-ce0e12f2f3e3'::uuid
    WHEN '21b42fe6-3bca-447e-b3e3-f2f26bdc090d' THEN 'ccb7384e-d98a-4d66-b700-9575487e6c3c'::uuid
    WHEN 'e68ce31d-0b5f-4b28-8070-6e80e701f7d7' THEN '2d59b538-a2a9-4add-9465-95c21d53adc0'::uuid
    WHEN '199d5b3e-9697-4620-8b72-fea1aedf106e' THEN 'e7674abf-185a-48ac-bce2-acd86fc676c1'::uuid
  END)
);
