-- Script 38c: Resumo por módulo - quantos IDs por módulo

SELECT 
    c.nome as modulo,
    r.aula_id as old_id,
    COUNT(DISTINCT r.aluno_id) as total_alunos,
    ROUND(AVG(r.nota)::numeric, 2) as nota_media
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
LEFT JOIN users u ON r.aluno_id = u.id
LEFT JOIN cursos c ON u.curso_id = c.id
WHERE a.id IS NULL
AND r.aula_id IN (
    'f2ea2e57-5f71-4588-85f2-12d227a27917',
    'b1bf315d-b19e-4467-bed2-8576a7db8540',
    '56730d95-45cb-472d-b207-243231de87d0',
    '8a27c9a4-3137-476e-89ba-a760cdcb6cc8',
    '28e64491-00a6-4db7-be39-a20e137dbcfb',
    '6dcd7751-5fe0-424c-948d-c2053488b6c8',
    '33ca7fa8-8cac-4961-873a-b0150943183e',
    'de1668ce-9942-41ef-8368-fd3005640317',
    'c13017ec-f813-4b5c-bdf1-dcc775aa3fab',
    '4d7b8f29-77a3-4be6-ae7b-ec5d01ad8207',
    'a3d9f000-4ca8-46f9-bddb-e2fac4829728',
    '0df91050-97ea-4f4c-8cf6-a513fcc4d612',
    '7d0ec45d-7e3b-4433-8b65-331a896b498a',
    '0c3de3cb-633b-4872-a077-422533278381',
    '245a24e2-62be-4285-ba3a-d1a2ad6abc23',
    '41e1facf-08d5-45d2-9768-7375aeaadc21',
    '4dedc00e-5d2a-4898-bc9d-303819071408',
    '6b66b758-4ac8-43ab-bcc5-d4e2ea21a2fd',
    '084f38cc-30ae-4983-baf2-3d35675d8461',
    'cbcbc38c-23ce-44ce-b683-c9102b6c11c6',
    'f6b42ebc-71c0-48b6-97da-af080ec5758b',
    '820c2f6d-fb28-5c44-b124-d38eb4108128',
    '5d8a65a2-23d5-4b32-b5a4-4301c08e39c3',
    '8a3feccb-72b5-5999-944f-4587a77735ae',
    '993b06ab-04b6-4859-b110-80a3abe8f08b',
    '49532bff-3e54-4d83-acba-7b9273f11837',
    'a71e4500-bbb1-53ba-8497-bbbf8a4b9244',
    'aa43c974-6c73-4410-af14-dca6bc372a9f',
    '45521f42-bacd-5314-888e-98c164f91266',
    'b1fa7aa2-7ea2-45ac-b4a4-6bf64e3e305f',
    '3fdecd25-2d8e-50ab-a700-8ee68c36d381',
    'c1c3872f-c700-4b87-b26d-70b0e4990104',
    'f886614e-4116-487c-9b51-4daff93da071',
    'd39020c8-0150-54a8-bdbb-50e3e343a226',
    'd6741e36-1e16-4a77-9a67-ce7ad8cc4288',
    '3ec0e3bf-8c75-493a-9e9a-c3f737537e43',
    'e5b38a4a-4c43-5fc6-b3f1-a32309c117d9',
    'e624b28b-f2ff-40e6-ae97-16fc198850c8',
    '10e42753-be40-51b9-8c4c-3b1f4c5484ff',
    '716fa21d-4d8a-4613-ab48-51a445810e55',
    '753d5c64-c553-4a18-9148-405da59828b5'
)
GROUP BY c.nome, r.aula_id
ORDER BY c.nome, total_alunos DESC;
