SELECT 
  r.aula_id,
  COUNT(*) as total,
  ROUND(AVG(r.nota)::numeric, 2) as nota_media
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE a.id IS NULL
GROUP BY r.aula_id
ORDER BY total DESC;
