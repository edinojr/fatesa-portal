SELECT 
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) as orfas_restantes,
  COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as corrigidas
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id
WHERE r.created_at < '2026-06-01';
