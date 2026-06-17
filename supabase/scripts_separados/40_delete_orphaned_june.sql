-- Script 40: Deletar registros órfãos de respostas_aulas
-- São 82 registros com aula_id que não existe na tabela aulas

DELETE FROM respostas_aulas 
WHERE aula_id IN (
    SELECT r.aula_id 
    FROM respostas_aulas r
    LEFT JOIN aulas a ON r.aula_id = a.id
    WHERE a.id IS NULL
);
