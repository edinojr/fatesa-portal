-- Script 38: Investigar IDs novos - descobrir módulo de cada um
-- Cruza aluno_id com matrículas para identificar o módulo

SELECT 
    r.aula_id as old_id,
    COUNT(DISTINCT r.aluno_id) as total_alunos,
    c.nome as modulo,
    MIN(r.created_at) as primeira_data,
    MAX(r.created_at) as ultima_data
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
LEFT JOIN users u ON r.aluno_id = u.id
LEFT JOIN matriculas m ON r.aluno_id = m.aluno_id AND m.status = 'ativa'
LEFT JOIN cursos c ON m.curso_id = c.id
WHERE a.id IS NULL
GROUP BY r.aula_id, c.nome
ORDER BY total_alunos DESC, c.nome;
