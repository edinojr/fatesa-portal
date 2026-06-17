-- Script 39g: Listar todas as aulas existentes para comparação
-- Mostra aulas dos 4 módulos para identificar padrões

SELECT 
    c.nome as modulo,
    a.id as aula_id,
    a.tipo,
    a.titulo,
    a.ordem
FROM aulas a
JOIN cursos c ON a.curso_id = c.id
ORDER BY c.nome, a.ordem;
