-- Script 39b: Listar aulas existentes por módulo (para mapear os órfãos)

SELECT 
    c.nome as modulo,
    a.id as aula_id,
    a.tipo,
    a.titulo,
    a.ordem
FROM aulas a
JOIN cursos c ON a.curso_id = c.id
WHERE c.nome IN (
    'Epístola aos Hebreus',
    'Doutrina do Espírito Santo', 
    'Epistolas Paulinas I',
    'Teologia Prática'
)
ORDER BY c.nome, a.ordem;
