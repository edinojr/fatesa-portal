SELECT 
  u.nome,
  u.email,
  COUNT(*) as total_orfas
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
JOIN users u ON r.aluno_id = u.id
WHERE a.id IS NULL
GROUP BY u.nome, u.email
ORDER BY total_orfas DESC
LIMIT 20;
