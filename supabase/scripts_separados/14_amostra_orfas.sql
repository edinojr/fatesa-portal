SELECT 
  r.aula_id,
  r.nota,
  r.status,
  r.tentativas,
  r.created_at,
  u.nome as aluno
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
JOIN users u ON r.aluno_id = u.id
WHERE a.id IS NULL
ORDER BY u.nome, r.created_at
LIMIT 30;
