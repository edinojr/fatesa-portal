
SELECT 
    a.aula_id,
    COUNT(*) as total,
    a.created_at
FROM respostas_aulas a
LEFT JOIN aulas b ON a.aula_id = b.id
WHERE b.id IS NULL
GROUP BY a.aula_id, a.created_at
ORDER BY a.created_at DESC;

