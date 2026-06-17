SELECT 
  COUNT(*) as total_respostas,
  COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as com_aula_valida,
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) as orfas,
  ROUND(100.0 * COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) / COUNT(*), 1) as percentual_corrigido
FROM respostas_aulas r
LEFT JOIN aulas a ON r.aula_id = a.id;
