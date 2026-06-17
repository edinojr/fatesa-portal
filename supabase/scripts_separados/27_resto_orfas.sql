SELECT 'Avaliacoes orfas restantes:' as info;

SELECT COUNT(*) as total
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
AND r.created_at < '2026-06-01'
AND r.aula_id IN (
  SELECT DISTINCT r2.aula_id FROM respostas_aulas r2
  LEFT JOIN aulas a2 ON r2.aula_id = a2.id
  WHERE a2.id IS NULL AND r2.created_at < '2026-06-01'
  GROUP BY r2.aula_id
  HAVING COUNT(*) > 10
);

SELECT 'Exercicios orfas restantes:' as info;

SELECT 
  r.aula_id,
  COUNT(*) as total_alunos,
  ROUND(AVG(r.nota)::numeric, 2) as nota_media
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
AND r.created_at < '2026-06-01'
GROUP BY r.aula_id
ORDER BY total_alunos DESC
LIMIT 20;
