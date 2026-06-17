SELECT 
  r.aula_id as id_antigo,
  COUNT(*) as total_alunos,
  MIN(r.created_at) as primeira_data,
  ROUND(AVG(r.nota)::numeric, 2) as nota_media
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
AND r.created_at < '2026-06-01'
GROUP BY r.aula_id
ORDER BY total_alunos DESC;
