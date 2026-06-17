-- Script 39: Verificar curso_id dos alunos nos registros órfãos

SELECT 
    u.id as aluno_id,
    u.nome,
    u.email,
    u.curso_id,
    u.curso_opcao,
    u.tipo
FROM users u
WHERE u.id IN (
    SELECT DISTINCT r.aluno_id
    FROM respostas_aulas r
    LEFT JOIN aulas a ON r.aula_id = a.id
    WHERE a.id IS NULL
)
ORDER BY u.nome;
